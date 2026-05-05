import { SCORE_KEYS } from "./constants";

/* ══════════════════════════════════════════════════
   SIGNAL PARSING
══════════════════════════════════════════════════ */
export function parseSignal(text: string): number | null {
  if (!text) return null;
  const t = text.toUpperCase();
  const tail = t.slice(-300);
  if (/BULLISH/.test(tail)) return +1;
  if (/BEARISH/.test(tail)) return -1;
  if (/NEUTRAL/.test(tail)) return  0;
  const bull = (t.match(/BULLISH/g)||[]).length;
  const bear = (t.match(/BEARISH/g)||[]).length;
  if (bull > bear) return +1;
  if (bear > bull) return -1;
  return 0;
}

export function parseRiskSignal(riskObj: { aggressive?: string; neutral?: string; conservative?: string }) {
  if (!riskObj) return null;
  const votes = [riskObj.aggressive, riskObj.neutral, riskObj.conservative]
    .map(t => {
      if (!t) return 0;
      const u = t.toUpperCase();
      if (/REJECT/.test(u)) return -1;
      if (/APPROVE WITH CONDITIONS|MODIFY|REDUCE SIZE/.test(u)) return 0;
      if (/✅ APPROVE/.test(u)) return +1;
      return 0;
    });
  const sum = votes.reduce((a: number, b: number) => a + b, 0);
  return sum > 0 ? +1 : sum < 0 ? -1 : 0;
}

export function computeWeightedScore(sigs: Record<string, number | null>, weights: Record<string, number>) {
  let num = 0, den = 0;
  for (const key of SCORE_KEYS) {
    const sig = sigs[key];
    const w   = weights[key] || 0;
    if (sig != null) { num += sig * w; den += w; }
  }
  return den > 0 ? num / den : 0;
}

export function scoreToAction(score: number) {
  if (score >=  0.25) return "BUY";
  if (score <= -0.25) return "SELL";
  return "HOLD";
}

/* ══════════════════════════════════════════════════
   MARKET REGIME DETECTION
══════════════════════════════════════════════════ */
export function detectRegime(ch: number | null) {
  if (ch == null) return "RANGE";
  if (ch < -10)  return "CRASH";
  if (ch <  -3)  return "BEAR";
  if (ch <  +3)  return "RANGE";
  if (ch < +10)  return "BULL";
  return "SURGE";
}

/* ══════════════════════════════════════════════════
   API — paced caller (Gemini free tier 15 RPM safe)
══════════════════════════════════════════════════ */
// Serialize all calls and enforce a minimum spacing between them.
// Any concurrent Promise.all([...]) is auto-serialized via the chain.
const MIN_INTERVAL_MS = 4000;
let lastCallStart = 0;
let callQueue: Promise<unknown> = Promise.resolve();

export function callClaude(system: string, user: string): Promise<string> {
  const next = callQueue.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastCallStart);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallStart = Date.now();
    const res = await fetch("/api/trading-agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, user }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "API Error");
    return (data.text || "") as string;
  });
  // Don't break the chain if one call rejects — subsequent calls can still be paced.
  callQueue = next.catch(() => undefined);
  return next;
}

export async function fetchMarketData() {
  let usd: { price: number; change: number; mcap: number; vol: number } | null = null;
  let krw: { price: number; change: number } | null = null;
  const ts = Date.now();
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&_t=${ts}`,{cache:"no-store"});
    const d = await r.json();
    usd = { price:d.bitcoin.usd, change:d.bitcoin.usd_24h_change, mcap:d.bitcoin.usd_market_cap, vol:d.bitcoin.usd_24h_vol };
  } catch{/* ignore */}
  try {
    const r = await fetch(`https://api.upbit.com/v1/ticker?markets=KRW-BTC&_t=${ts}`,{cache:"no-store"});
    const [d] = await r.json();
    krw = { price:d.trade_price, change:d.signed_change_rate*100 };
  } catch{/* ignore */}
  return {
    usd: usd||{price:83500,change:-0.8,mcap:1.65e12,vol:38e9},
    krw: krw||{price:121800000,change:-0.9},
    live: !!usd && !!krw,
  };
}
