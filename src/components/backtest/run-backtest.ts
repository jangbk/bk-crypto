import type { BacktestResult, PriceBar } from "./backtest-types";
import { KR_STOCK_ASSETS, ASSET_TO_COINGECKO } from "./backtest-types";
import { runSeykotaV2, runPTJv4, runMcDaviddV2, runKISRsiMacd } from "./bot-strategies";
import {
  run22BEngine,
  runV6AdaptiveMultiTF,
  runFundingArbSim,
  runVolatilityBreakout,
  runTrendFollowing,
  runMeanReversion,
  runRsiMeanRevCI,
  runMomentumStrategy,
  runDCADynamic,
  runGridTrading,
} from "./strategy-engines";

interface RunBacktestParams {
  selectedStrategy: string;
  asset: string;
  startDate: string;
  endDate: string;
  initialCapital: string;
  paramValues: string[];
  isBotStrategy: boolean;
}

interface RunBacktestResponse {
  result: BacktestResult;
  dataSource: string;
}

async function fetchBybitKlines(
  symbol: string,
  interval: string,
  startMs: number,
  endMs: number,
  dateFormat: "date" | "datetime",
): Promise<PriceBar[]> {
  const dataMap = new Map<number, PriceBar>();
  let cursor = startMs;
  while (cursor < endMs) {
    const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&start=${cursor}&limit=1000`;
    const res = await fetch(url);
    const json = await res.json();
    const rows = json.result?.list || [];
    if (rows.length === 0) break;
    for (const r of rows) {
      const ts = parseInt(r[0]);
      if (ts <= endMs) {
        const date = dateFormat === "date"
          ? new Date(ts).toISOString().split("T")[0]
          : new Date(ts).toISOString().replace("T", " ").slice(0, 16);
        dataMap.set(ts, {
          date,
          open: parseFloat(r[1]),
          high: parseFloat(r[2]),
          low: parseFloat(r[3]),
          close: parseFloat(r[4]),
        });
      }
    }
    rows.sort((a: string[], b: string[]) => parseInt(a[0]) - parseInt(b[0]));
    const lastTs = parseInt(rows[rows.length - 1][0]);
    if (lastTs <= cursor) break;
    cursor = lastTs + 1;
  }
  return Array.from(dataMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export async function executeBacktest(params: RunBacktestParams): Promise<RunBacktestResponse> {
  const { selectedStrategy, asset, startDate, endDate, paramValues, isBotStrategy } = params;
  const capital = parseInt(params.initialCapital) || 10000000;

  // KIS RSI/MACD: fetch from Yahoo Finance
  if (selectedStrategy === "bot-kis-rsi-macd") {
    const krStock = KR_STOCK_ASSETS.find((s) => s.value === asset);
    const symbol = krStock ? krStock.symbol : "005930";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.KS?range=2y&interval=1d`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Yahoo Finance error");
    const json = await res.json();

    const chart = json.chart?.result?.[0];
    if (!chart || !chart.timestamp) throw new Error("No Yahoo data");

    const timestamps = chart.timestamp;
    const quote = chart.indicators?.quote?.[0];
    if (!quote) throw new Error("No quote data");

    const prices: PriceBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] != null && quote.close[i] != null) {
        prices.push({
          date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
        });
      }
    }

    if (prices.length < 50) throw new Error("Insufficient data");

    const macdParts = paramValues[0].split("/").map(Number);
    const backResult = runKISRsiMacd(
      prices,
      macdParts[0] || 12,
      macdParts[1] || 26,
      macdParts[2] || 9,
      parseInt(paramValues[1]) || 20,
      parseFloat(paramValues[2]) || 7,
      0.00015,
      capital,
    );
    backResult.asset = krStock?.label || "삼성전자";
    backResult.dataSource = "Yahoo Finance (실제 데이터)";
    return { result: backResult, dataSource: "Yahoo Finance (실제 데이터)" };
  }

  // Crypto strategies: CryptoCompare
  const coinId = ASSET_TO_COINGECKO[asset] || "bitcoin";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  let warmupBars = 0;
  if (selectedStrategy === "bot-seykota-v2") warmupBars = 200;
  else if (selectedStrategy === "bot-ptj-v4") warmupBars = 200;
  else if (selectedStrategy === "bot-rotation") warmupBars = 100;
  else if (selectedStrategy === "bot-alpha-v5") warmupBars = 250;
  else if (selectedStrategy === "bot-ptj-200ma") warmupBars = (parseInt(paramValues[0]) || 200) + 10;
  else if (selectedStrategy === "bot-seykota-ema") warmupBars = (parseInt(paramValues[0]) || 100) + 10;
  else if (selectedStrategy === "bot-bybit-v6-hybrid" || selectedStrategy === "bot-22b-engine") warmupBars = 250;
  else if (selectedStrategy === "bot-bybit-funding-arb") warmupBars = 110;

  const totalBarsNeeded = daysDiff + warmupBars;
  const toTs = Math.floor(end.getTime() / 1000);
  const fsym = coinId === "bitcoin" ? "BTC" : coinId === "ethereum" ? "ETH" : coinId === "solana" ? "SOL" : "XRP";
  const tsym = isBotStrategy ? "KRW" : "USD";

  const allDataMap = new Map<number, { time: number; open: number; high: number; low: number; close: number }>();
  if (totalBarsNeeded <= 2000) {
    const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=${tsym}&limit=${totalBarsNeeded}&toTs=${toTs}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("CryptoCompare error");
    const json = await res.json();
    if (json.Data?.Data) for (const d of json.Data.Data) if (d.open > 0) allDataMap.set(d.time, d);
  } else {
    const midTs = toTs - Math.floor(totalBarsNeeded / 2) * 86400;
    const urls = [
      `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=${tsym}&limit=2000&toTs=${midTs}`,
      `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=${tsym}&limit=2000&toTs=${toTs}`,
    ];
    const results = await Promise.all(urls.map((u) => fetch(u).then((r) => r.json())));
    for (const json of results) {
      if (json.Data?.Data) for (const d of json.Data.Data) if (d.open > 0) allDataMap.set(d.time, d);
    }
  }

  const pricesSorted = Array.from(allDataMap.values()).sort((a, b) => a.time - b.time);

  if (pricesSorted.length <= 10) throw new Error("No data");

  const prices: PriceBar[] = pricesSorted.map((d) => ({
    date: new Date(d.time * 1000).toISOString().split("T")[0],
    open: d.open, high: d.high, low: d.low, close: d.close,
  }));

  const backResult = await dispatchStrategy(selectedStrategy, prices, paramValues, capital, start, end);
  return { result: backResult, dataSource: "CryptoCompare (실제 데이터)" };
}

async function dispatchStrategy(
  selectedStrategy: string,
  prices: PriceBar[],
  paramValues: string[],
  capital: number,
  start: Date,
  end: Date,
): Promise<BacktestResult> {
  switch (selectedStrategy) {
    case "bot-seykota-v2":
    case "bot-seykota-ema": {
      return runSeykotaV2(prices, parseInt(paramValues[0]) || 15, parseInt(paramValues[1]) || 60, parseInt(paramValues[2]) || 20, 0.001, capital);
    }
    case "bot-ptj-v4":
    case "bot-ptj-200ma": {
      return runPTJv4(prices, parseInt(paramValues[0]) || 100, parseFloat(paramValues[1]) || 0.8, parseFloat(paramValues[2]) || 7, 0.001, capital);
    }
    case "bot-22b-engine": {
      const sym = "BTCUSDT";
      const sMs = start.getTime(), eMs = end.getTime();
      const dailyArr = await fetchBybitKlines(sym, "D", sMs - 250 * 24 * 3600 * 1000, eMs, "date");
      const hourlyArr = await fetchBybitKlines(sym, "60", sMs, eMs, "datetime");
      return run22BEngine(dailyArr, hourlyArr, parseFloat(paramValues[0]) || 3.0, parseFloat(paramValues[1]) || 1.5, parseFloat(paramValues[2]) || 8, capital);
    }
    case "bot-bybit-v6-hybrid": {
      const sym = "BTCUSDT";
      const startMs = start.getTime(), endMs = end.getTime();
      const dailyStartMs = startMs - 250 * 24 * 60 * 60 * 1000;
      const bybitDaily = await fetchBybitKlines(sym, "D", dailyStartMs, endMs, "date");
      const bybitHourly = await fetchBybitKlines(sym, "60", startMs, endMs, "datetime");
      if (bybitDaily.length < 200 || bybitHourly.length < 100) {
        throw new Error(`Bybit 데이터 부족: 일봉 ${bybitDaily.length}개, 60분봉 ${bybitHourly.length}개`);
      }
      return runV6AdaptiveMultiTF(bybitDaily, bybitHourly, parseFloat(paramValues[0]) || 5, parseFloat(paramValues[1]) || 2.0, parseFloat(paramValues[2]) || 4.0, capital);
    }
    case "bot-bybit-funding-arb":
      return runFundingArbSim(prices, capital);
    case "bot-rsi-meanrev":
      return runRsiMeanRevCI(prices, parseInt(paramValues[0]) || 14, parseInt(paramValues[1]) || 20, parseFloat(paramValues[2]) ?? 40, capital);
    case "volatility-breakout":
      return runVolatilityBreakout(prices, parseFloat(paramValues[0]) || 0.5, parseFloat(paramValues[1]) || 80, capital);
    case "bot-mcdavidd-v2":
      return runMcDaviddV2(prices, parseInt(paramValues[0]) || 14, parseFloat(paramValues[1]) || 3.0, parseFloat(paramValues[2]) || 5.0, 0.001, capital);
    case "trend-following":
      return runTrendFollowing(prices, parseInt(paramValues[0]) || 20, parseInt(paramValues[1]) || 50, capital);
    case "mean-reversion":
      return runMeanReversion(prices, parseInt(paramValues[0]) || 20, parseFloat(paramValues[1]) || 2.0, capital);
    case "momentum":
      return runMomentumStrategy(prices, parseInt(paramValues[0]) || 14, parseInt(paramValues[1]) || 30, capital);
    case "dca-dynamic":
      return runDCADynamic(prices, parseInt(paramValues[0]) || 1000000, parseFloat(paramValues[1]) || 1.5, parseInt(paramValues[2]) || 7, capital);
    case "grid-trading":
      return runGridTrading(prices, parseInt(paramValues[0]) || 10, parseFloat(paramValues[1]) || prices[prices.length - 1].close * 1.1, parseFloat(paramValues[2]) || prices[prices.length - 1].close * 0.9, capital);
    default:
      return runVolatilityBreakout(prices, 0.5, 80, capital);
  }
}
