import { NextResponse } from "next/server";
import crypto from "crypto";

const API_KEY = (process.env.BYBIT_API_KEY ?? "").trim();
const API_SECRET = (process.env.BYBIT_API_SECRET ?? "").trim();
const BASE_URL = "https://api-demo.bybit.com"; // Demo trading

function createSignature(
  timestamp: string,
  apiKey: string,
  recvWindow: string,
  queryString: string
): string {
  const preSign = `${timestamp}${apiKey}${recvWindow}${queryString}`;
  return crypto.createHmac("sha256", API_SECRET).update(preSign).digest("hex");
}

async function bybitGet(
  endpoint: string,
  params?: Record<string, string>
): Promise<unknown> {
  const timestamp = Date.now().toString();
  const recvWindow = "10000";
  const queryString = params ? new URLSearchParams(params).toString() : "";
  const url = queryString
    ? `${BASE_URL}${endpoint}?${queryString}`
    : `${BASE_URL}${endpoint}`;

  const sign = createSignature(timestamp, API_KEY, recvWindow, queryString);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-BAPI-API-KEY": API_KEY,
      "X-BAPI-SIGN": sign,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": recvWindow,
    },
  });

  return res.json();
}

export async function getBybitSMCData() {
  if (!API_KEY || !API_SECRET) {
    return null;
  }

  try {
    const [balanceRes, positionRes, tickerRes] = await Promise.all([
      bybitGet("/v5/account/wallet-balance", { accountType: "UNIFIED" }),
      bybitGet("/v5/position/list", {
        category: "linear",
        symbol: "BTCUSDT",
      }),
      fetch("https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT").then(
        (r) => r.json()
      ),
    ]);

    // Parse balance
    const balData = balanceRes as {
      result?: {
        list?: Array<{
          coin?: Array<{ coin: string; walletBalance: string; unrealisedPnl: string }>;
        }>;
      };
    };
    let walletBalance = 0;
    let unrealisedPnl = 0;
    for (const account of balData.result?.list ?? []) {
      for (const coin of account.coin ?? []) {
        if (coin.coin === "USDT") {
          walletBalance = parseFloat(coin.walletBalance) || 0;
          unrealisedPnl = parseFloat(coin.unrealisedPnl) || 0;
        }
      }
    }

    // Parse position
    const posData = positionRes as {
      result?: {
        list?: Array<{
          side: string;
          size: string;
          avgPrice: string;
          unrealisedPnl: string;
          leverage: string;
        }>;
      };
    };
    let position = null;
    for (const pos of posData.result?.list ?? []) {
      if (parseFloat(pos.size) > 0) {
        position = {
          side: pos.side,
          size: parseFloat(pos.size),
          entryPrice: parseFloat(pos.avgPrice),
          unrealisedPnl: parseFloat(pos.unrealisedPnl),
          leverage: pos.leverage,
        };
        break;
      }
    }

    // Parse ticker
    const tickData = tickerRes as {
      result?: { list?: Array<{ lastPrice: string; price24hPcnt: string }> };
    };
    const ticker = tickData.result?.list?.[0];
    const currentPrice = parseFloat(ticker?.lastPrice ?? "0");
    const change24h = parseFloat(ticker?.price24hPcnt ?? "0") * 100;

    return {
      id: "luxalgo-smc-hybrid",
      name: "LuxAlgo SMC Hybrid v1",
      asset: "BTC/USDT",
      exchange: "Bybit (Demo)",
      status: "stopped",
      walletBalance,
      unrealisedPnl,
      currentPrice,
      change24h,
      position,
      _live: true,
    };
  } catch (e) {
    console.error("Bybit SMC API error:", e);
    return null;
  }
}

export async function GET() {
  try {
    const data = await getBybitSMCData();
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Bybit SMC not configured" },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
