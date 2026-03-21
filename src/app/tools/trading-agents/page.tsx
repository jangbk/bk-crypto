"use client";

import { useState, useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════
   AGENT REGISTRY
══════════════════════════════════════════════════ */
const AGENTS: Record<string, { name: string; nameKo: string; icon: string; color: string }> = {
  technical:    { name: "Technical Analyst",    nameKo: "기술 분석가",     icon: "📊", color: "#38BDF8" },
  sentiment:    { name: "Sentiment Analyst",    nameKo: "심리 분석가",     icon: "💬", color: "#C084FC" },
  news:         { name: "News Analyst",         nameKo: "뉴스 분석가",     icon: "📰", color: "#FB923C" },
  fundamentals: { name: "Fundamentals Analyst", nameKo: "펀더멘털 분석가", icon: "⛓️", color: "#34D399" },
  bullish:      { name: "Bullish Researcher",   nameKo: "강세 연구원",     icon: "🐂", color: "#4ADE80" },
  bearish:      { name: "Bearish Researcher",   nameKo: "약세 연구원",     icon: "🐻", color: "#F87171" },
  debate:       { name: "Bull vs Bear Debate",  nameKo: "강세 vs 약세 토론", icon: "⚔️", color: "#FCD34D" },
  trader:       { name: "Trader Agent",         nameKo: "트레이더",        icon: "⚡", color: "#FBBF24" },
  riskTeam:     { name: "Risk Management",      nameKo: "리스크 관리팀",   icon: "🛡️", color: "#A78BFA" },
  manager:      { name: "Portfolio Manager",    nameKo: "포트폴리오 매니저", icon: "👔", color: "#F472B6" },
};

// 언어별 UI 라벨
const UI_LABELS = {
  ko: {
    bullRebuttal: "🐂 강세 측 반론", bearCounter: "🐻 약세 측 반론",
    aggressive: "공격적", neutral: "중립적", conservative: "보수적",
    analystTeam: "분석팀", researcherTeam: "연구팀", executionTeam: "실행팀",
    finalDecision: "포트폴리오 매니저 — 최종 결정",
    confidence: "확신도", riskLevel: "위험 수준", positionSize: "포지션 크기",
    entry: "진입가 (USD)", stopLoss: "손절가", takeProfit: "익절가",
    timeframe: "투자기간", reasoning: "판단 근거", scoreMatch: "스코어 일치",
    scoreMismatch: "스코어와 상이", weightedScore: "가중 점수", codeSignal: "코드 시그널",
    contribution: "에이전트별 기여도", processing: "분석 중", signalNote: "신호 파싱 후 가중 점수에 반영됩니다",
    currentKRW: "현재가 (KRW)",
  },
  en: {
    bullRebuttal: "🐂 BULL REBUTTAL", bearCounter: "🐻 BEAR COUNTER",
    aggressive: "AGGRESSIVE", neutral: "NEUTRAL", conservative: "CONSERVATIVE",
    analystTeam: "ANALYST TEAM", researcherTeam: "RESEARCHER TEAM", executionTeam: "EXECUTION TEAM",
    finalDecision: "PORTFOLIO MANAGER — FINAL DECISION",
    confidence: "CONFIDENCE", riskLevel: "RISK LEVEL", positionSize: "POSITION SIZE",
    entry: "ENTRY (USD)", stopLoss: "STOP LOSS", takeProfit: "TAKE PROFIT",
    timeframe: "TIMEFRAME", reasoning: "REASONING", scoreMatch: "✓ Score Match",
    scoreMismatch: "⚠ Score Mismatch", weightedScore: "WEIGHTED SCORE", codeSignal: "CODE SIGNAL",
    contribution: "Agent Contribution", processing: "PROCESSING", signalNote: "Signal parsed and reflected in weighted score",
    currentKRW: "Current (KRW)",
  },
};
const STEPS = ["technical","sentiment","news","fundamentals","bullish","bearish","debate","trader","riskTeam","manager"];

/* ══════════════════════════════════════════════════
   MARKET REGIME
══════════════════════════════════════════════════ */
const REGIMES: Record<string, { label: string; color: string; bg: string; icon: string; desc: string }> = {
  CRASH: { label:"급락장 CRASH",   color:"#EF4444", bg:"rgba(239,68,68,0.08)",   icon:"🔴", desc:"위기 대응 모드" },
  BEAR:  { label:"하락 추세 BEAR", color:"#F87171", bg:"rgba(248,113,113,0.08)", icon:"🐻", desc:"리스크 관리 강화" },
  RANGE: { label:"횡보장 RANGE",   color:"#F59E0B", bg:"rgba(245,158,11,0.08)",  icon:"⚖️", desc:"펀더멘털 중심 분석" },
  BULL:  { label:"상승 추세 BULL", color:"#4ADE80", bg:"rgba(74,222,128,0.08)",  icon:"🐂", desc:"모멘텀 추종 모드" },
  SURGE: { label:"급등장 SURGE",   color:"#A78BFA", bg:"rgba(167,139,250,0.08)", icon:"🚀", desc:"과열 경계 모드" },
};

function detectRegime(ch: number | null) {
  if (ch == null) return "RANGE";
  if (ch < -10)  return "CRASH";
  if (ch <  -3)  return "BEAR";
  if (ch <  +3)  return "RANGE";
  if (ch < +10)  return "BULL";
  return "SURGE";
}

const REGIME_WEIGHTS: Record<string, Record<string, number>> = {
  CRASH: { technical:5,  sentiment:5,  news:15, fundamentals:15, bullish:5,  bearish:5,  riskTeam:50 },
  BEAR:  { technical:10, sentiment:10, news:15, fundamentals:20, bullish:10, bearish:10, riskTeam:25 },
  RANGE: { technical:10, sentiment:15, news:10, fundamentals:25, bullish:12, bearish:13, riskTeam:15 },
  BULL:  { technical:20, sentiment:15, news:5,  fundamentals:20, bullish:15, bearish:15, riskTeam:10 },
  SURGE: { technical:20, sentiment:20, news:5,  fundamentals:15, bullish:12, bearish:13, riskTeam:15 },
};
const SCORE_KEYS = ["technical","sentiment","news","fundamentals","bullish","bearish","riskTeam"];

/* ══════════════════════════════════════════════════
   SIGNAL PARSING
══════════════════════════════════════════════════ */
function parseSignal(text: string): number | null {
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

function parseRiskSignal(riskObj: { aggressive?: string; neutral?: string; conservative?: string }) {
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

function computeWeightedScore(sigs: Record<string, number | null>, weights: Record<string, number>) {
  let num = 0, den = 0;
  for (const key of SCORE_KEYS) {
    const sig = sigs[key];
    const w   = weights[key] || 0;
    if (sig != null) { num += sig * w; den += w; }
  }
  return den > 0 ? num / den : 0;
}

function scoreToAction(score: number) {
  if (score >=  0.25) return "BUY";
  if (score <= -0.25) return "SELL";
  return "HOLD";
}

/* ══════════════════════════════════════════════════
   API
══════════════════════════════════════════════════ */
async function callClaude(system: string, user: string) {
  const res = await fetch("/api/trading-agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API Error");
  return data.text || "";
}

async function fetchMarketData() {
  let usd: { price: number; change: number; mcap: number; vol: number } | null = null;
  let krw: { price: number; change: number } | null = null;
  const ts = Date.now(); // 캐시 방지
  // USD: CoinGecko
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&_t=${ts}`,{cache:"no-store"});
    const d = await r.json();
    usd = { price:d.bitcoin.usd, change:d.bitcoin.usd_24h_change, mcap:d.bitcoin.usd_market_cap, vol:d.bitcoin.usd_24h_vol };
  } catch{}
  // KRW: 항상 Upbit 실시간
  try {
    const r = await fetch(`https://api.upbit.com/v1/ticker?markets=KRW-BTC&_t=${ts}`,{cache:"no-store"});
    const [d] = await r.json();
    krw = { price:d.trade_price, change:d.signed_change_rate*100 };
  } catch{}
  return {
    usd: usd||{price:83500,change:-0.8,mcap:1.65e12,vol:38e9},
    krw: krw||{price:121800000,change:-0.9},
    live: !!usd && !!krw,
  };
}

const fmtUSD = (n: number) => n ? `${Number(n).toLocaleString("en-US")}` : "—";
const fmtKRW = (n: number) => n ? `₩${Number(n).toLocaleString("ko-KR")}` : "—";
const fmtB   = (n: number) => n ? `${(n/1e9).toFixed(1)}B` : "—";
const fmtPct = (n: number | null) => n!=null ? `${n>=0?"+":""}${Number(n).toFixed(2)}%` : "—";
const chgClr = (v: number | null) => v==null?"var(--ta-muted)":v>=0?"#4ADE80":"#F87171";

/* ══════════════════════════════════════════════════
   UI COMPONENTS
══════════════════════════════════════════════════ */
function Spinner({ color }: { color: string }) {
  return <div style={{ width:13, height:13, flexShrink:0, border:`2px solid ${color}33`, borderTop:`2px solid ${color}`, borderRadius:"50%", animation:"spin 0.75s linear infinite" }} />;
}

function ScoreGauge({ signals, weights, score, regime }: { signals: Record<string, number | null>; weights: Record<string, number>; score: number; regime: string }) {
  const action = scoreToAction(score);
  const pct    = ((score + 1) / 2) * 100;
  const col    = action==="BUY" ? "#22C55E" : action==="SELL" ? "#EF4444" : "#F59E0B";
  const r      = REGIMES[regime];
  return (
    <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${col}22`, borderRadius:10, padding:16, marginBottom:18 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <div style={{ fontSize:11, color:"var(--ta-muted)", letterSpacing:3, fontWeight:700 }}>⚖️ WEIGHTED SCORE ENGINE</div>
        {r && <div style={{ fontSize:8, color:r.color, letterSpacing:2, marginLeft:"auto" }}>{r.icon} {regime}</div>}
      </div>
      <div style={{ position:"relative", marginBottom:8 }}>
        <div style={{ height:8, background:"var(--ta-dark)", borderRadius:4, overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#EF4444,#F59E0B 50%,#22C55E)", opacity:0.15 }} />
          <div style={{ position:"absolute", top:0, height:"100%", left:`${Math.max(0,Math.min(100,pct))}%`, transform:"translateX(-50%)", width:3, background:col, boxShadow:`0 0 8px ${col}`, borderRadius:2, transition:"left 1s ease" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          <span style={{ fontSize:10, color:"#EF4444", letterSpacing:2 }}>BEARISH -1.0</span>
          <span style={{ fontSize:10, color:"#F59E0B", letterSpacing:2 }}>NEUTRAL 0</span>
          <span style={{ fontSize:10, color:"#22C55E", letterSpacing:2 }}>BULLISH +1.0</span>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:14 }}>
        <div>
          <div style={{ fontSize:10, color:"var(--ta-dim)", letterSpacing:3, marginBottom:3 }}>WEIGHTED SCORE</div>
          <div style={{ fontSize:32, fontWeight:700, color:col, lineHeight:1, letterSpacing:2 }}>{score >= 0 ? "+" : ""}{score.toFixed(3)}</div>
        </div>
        <div style={{ width:1, height:36, background:"var(--ta-border)" }} />
        <div>
          <div style={{ fontSize:10, color:"var(--ta-dim)", letterSpacing:3, marginBottom:3 }}>CODE SIGNAL</div>
          <div style={{ fontSize:22, fontWeight:700, color:col, letterSpacing:3 }}>{action}</div>
        </div>
      </div>
      <div style={{ borderTop:"1px solid var(--ta-border)", paddingTop:12 }}>
        <div style={{ fontSize:11, color:"var(--ta-dim)", letterSpacing:3, marginBottom:10, fontWeight:600 }}>에이전트별 기여도</div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {SCORE_KEYS.map(key => {
            const sig = signals[key];
            const w   = (weights||{})[key] || 0;
            const contribution = sig != null ? (sig * w / 100) : null;
            const sigColor = sig === 1 ? "#22C55E" : sig === -1 ? "#EF4444" : "#F59E0B";
            const sigLabel = sig === 1 ? "BULLISH" : sig === -1 ? "BEARISH" : sig === 0 ? "NEUTRAL" : "N/A";
            const a = AGENTS[key];
            return (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:95, fontSize:11, color:a?.color || "var(--ta-dim)", flexShrink:0, fontWeight:500 }}>{a?.nameKo || a?.name.split(" ")[0]}</div>
                <div style={{ width:62, fontSize:10, color:sigColor, background:`${sigColor}12`, border:`1px solid ${sigColor}22`, borderRadius:3, padding:"2px 6px", textAlign:"center", flexShrink:0, fontWeight:600 }}>{sigLabel}</div>
                <div style={{ width:30, fontSize:10, color:"var(--ta-text)", textAlign:"right", flexShrink:0, fontWeight:600 }}>{w}%</div>
                <div style={{ flex:1, height:4, background:"var(--ta-dark)", borderRadius:2, overflow:"hidden", position:"relative" }}>
                  {contribution != null && (
                    <div style={{ position:"absolute", height:"100%", width:`${Math.abs(contribution)*100}%`, left: contribution >= 0 ? "50%" : `${50 - Math.abs(contribution)*100}%`, background: contribution > 0 ? "#22C55E" : contribution < 0 ? "#EF4444" : "#F59E0B", opacity:0.7, borderRadius:2, transition:"all 0.8s ease" }} />
                  )}
                  <div style={{ position:"absolute", left:"50%", top:0, height:"100%", width:1, background:"var(--ta-border)" }} />
                </div>
                <div style={{ width:44, fontSize:10, color: contribution && contribution > 0 ? "#22C55E" : contribution && contribution < 0 ? "#EF4444" : "var(--ta-muted)", textAlign:"right", flexShrink:0, fontWeight:600 }}>
                  {contribution != null ? `${contribution >= 0?"+":""}${contribution.toFixed(3)}` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RegimePanel({ regime, weights }: { regime: string; weights: Record<string, number> }) {
  const r = REGIMES[regime];
  if (!r) return null;
  const LABELS: Record<string, string> = { technical:"기술분석", sentiment:"심리분석", news:"뉴스", fundamentals:"펀더멘털", bullish:"강세", bearish:"약세", riskTeam:"리스크" };
  return (
    <div style={{ background:r.bg, border:`1px solid ${r.color}35`, borderRadius:10, padding:14, marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <span style={{ fontSize:18 }}>{r.icon}</span>
        <div>
          <div style={{ fontSize:14, color:r.color, fontWeight:700, letterSpacing:2 }}>{r.label}</div>
          <div style={{ fontSize:11, color:"var(--ta-muted)" }}>{r.desc}</div>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {Object.entries(LABELS).map(([key,lbl]) => {
          const w = weights?.[key] || 0;
          return (
            <div key={key} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:11, color:"var(--ta-text)", width:65, flexShrink:0, fontWeight:500 }}>{lbl}</div>
              <div style={{ flex:1, height:4, background:"var(--ta-dark)", borderRadius:2, overflow:"hidden", minWidth:30 }}>
                <div style={{ height:"100%", width:`${w}%`, background:r.color, borderRadius:2, transition:"width 0.8s ease" }} />
              </div>
              <div style={{ fontSize:11, color:"var(--ta-text)", width:32, textAlign:"right", flexShrink:0, fontWeight:700 }}>{w}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineStep({ stepKey, status, signals, lang="ko" }: { stepKey: string; status: string; signals: Record<string, number | null>; lang?: string }) {
  const a = AGENTS[stepKey];
  const displayName = lang === "ko" ? a.nameKo : a.name;
  const isActive = status==="active", isDone = status==="done";
  const sig = signals?.[stepKey];
  const sigCol = sig===1?"#22C55E":sig===-1?"#EF4444":"#F59E0B";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 10px", borderRadius:6, background:isActive?`${a.color}10`:"transparent", border:`1px solid ${isActive?a.color+"28":"transparent"}`, transition:"all 0.3s" }}>
      <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background:isDone||isActive?a.color:"var(--ta-border)", border:`1px solid ${isDone||isActive?a.color:"var(--ta-dim)"}`, boxShadow:isActive?`0 0 7px ${a.color}`:"none" }} />
      <span style={{ fontSize:12, color:isDone?a.color:isActive?a.color:"var(--ta-muted)", flex:1 }}>{isDone?"✓ ":"  "}{displayName}</span>
      {isDone && sig!=null && SCORE_KEYS.includes(stepKey) && (
        <div style={{ fontSize:7, color:sigCol, background:`${sigCol}15`, border:`1px solid ${sigCol}25`, borderRadius:3, padding:"1px 5px", letterSpacing:1 }}>{sig===1?"▲":sig===-1?"▼":"—"}</div>
      )}
      {isActive && <Spinner color={a.color} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReportCard({ stepKey, content, weights, signals, lang="ko" }: { stepKey: string; content: any; weights: Record<string, number>; signals: Record<string, number | null>; lang?: string }) {
  const a = AGENTS[stepKey];
  if (!content || stepKey==="manager") return null;

  if (stepKey==="debate") {
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
          <span style={{ fontSize:13 }}>{a.icon}</span>
          <span style={{ fontSize:10, color:a.color, letterSpacing:3, fontWeight:700 }}>{lang==="ko"?a.nameKo:a.name}</span>
          <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${a.color}40,transparent)` }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[["bull", lang==="ko"?"🐂 강세 측 반론":"🐂 BULL REBUTTAL","#4ADE80",content.bull],["bear",lang==="ko"?"🐻 약세 측 반론":"🐻 BEAR COUNTER","#F87171",content.bear]].map(([k,lbl,col,txt])=>(
            <div key={k as string} style={{ background:`${col}07`, border:`1px solid ${col}22`, borderRadius:8, padding:14 }}>
              <div style={{ fontSize:11, color:col as string, letterSpacing:2, marginBottom:8, fontWeight:700 }}>{lbl}</div>
              <pre style={{ fontSize:13, color:"var(--ta-text)", whiteSpace:"pre-wrap", margin:0, lineHeight:1.9 }}>{txt}</pre>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stepKey==="riskTeam") {
    const sig = signals?.riskTeam;
    const w = weights?.riskTeam;
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
          <span style={{ fontSize:13 }}>{a.icon}</span>
          <span style={{ fontSize:11, color:a.color, letterSpacing:3, fontWeight:700 }}>{lang==="ko"?a.nameKo:a.name}</span>
          {w != null && <div style={{ fontSize:12, padding:"3px 10px", borderRadius:4, background:"var(--ta-card)", border:"1px solid var(--ta-border)", color:"var(--ta-text)", fontWeight:600 }}>{w}%</div>}
          {sig != null && <div style={{ fontSize:12, padding:"3px 10px", borderRadius:4, background: sig===1?"#22C55E12":sig===-1?"#EF444412":"#F59E0B12", border:`1px solid ${sig===1?"#22C55E30":sig===-1?"#EF444430":"#F59E0B30"}`, color: sig===1?"#22C55E":sig===-1?"#EF4444":"#F59E0B" }}>{sig===1?"▲ 강세":sig===-1?"▼ 약세":"— 중립"}</div>}
          <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${a.color}40,transparent)` }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[["aggressive",lang==="ko"?"공격적":"AGGRESSIVE","#EF4444","🔴"],["neutral",lang==="ko"?"중립적":"NEUTRAL","#64748B","⚪"],["conservative",lang==="ko"?"보수적":"CONSERVATIVE","#60A5FA","🔵"]].map(([k,lbl,col,ic])=>(
            <div key={k as string} style={{ background:`${col}07`, border:`1px solid ${col}22`, borderRadius:8, padding:14 }}>
              <div style={{ fontSize:11, color:col as string, letterSpacing:2, marginBottom:8, fontWeight:700 }}>{ic} {lbl}</div>
              <pre style={{ fontSize:13, color:"var(--ta-text)", whiteSpace:"pre-wrap", margin:0, lineHeight:1.9 }}>{content[k as string]}</pre>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sig = signals?.[stepKey];
  const w = weights?.[stepKey];
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
        <span style={{ fontSize:16 }}>{a.icon}</span>
        <span style={{ fontSize:14, color:a.color, letterSpacing:3, fontWeight:700 }}>{lang==="ko"?a.nameKo:a.name}</span>
        {w != null && <div style={{ fontSize:12, padding:"3px 10px", borderRadius:4, background:"var(--ta-card)", border:"1px solid var(--ta-border)", color:"var(--ta-text)", fontWeight:600 }}>{w}%</div>}
        {sig != null && <div style={{ fontSize:12, padding:"3px 10px", borderRadius:4, background: sig===1?"#22C55E12":sig===-1?"#EF444412":"#F59E0B12", border:`1px solid ${sig===1?"#22C55E30":sig===-1?"#EF444430":"#F59E0B30"}`, color: sig===1?"#22C55E":sig===-1?"#EF4444":"#F59E0B" }}>{sig===1?"▲ 강세":sig===-1?"▼ 약세":"— 중립"}</div>}
        <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${a.color}40,transparent)` }} />
      </div>
      <div style={{ background:`${a.color}07`, border:`1px solid ${a.color}20`, borderRadius:8, padding:16 }}>
        <pre style={{ fontSize:13, color:"var(--ta-text)", whiteSpace:"pre-wrap", margin:0, lineHeight:1.9 }}>{content}</pre>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DecisionCard({ decision, krwPrice, regime, score, lang="ko" }: { decision: any; krwPrice: number; regime: string; score: number | null; lang?: string }) {
  const col  = { BUY:"#22C55E", SELL:"#EF4444", HOLD:"#F59E0B" }[decision.action as string] || "var(--ta-muted)";
  const r    = regime ? REGIMES[regime] : null;
  const codeAction = score != null ? scoreToAction(score) : null;
  const matches = codeAction === decision.action;
  return (
    <div style={{ background:"linear-gradient(135deg,rgba(236,72,153,0.06),rgba(139,92,246,0.06))", border:"1px solid rgba(236,72,153,0.22)", borderRadius:12, padding:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <span style={{ fontSize:13 }}>👔</span>
        <span style={{ fontSize:14, color:"#F472B6", letterSpacing:3, fontWeight:700 }}>{lang==="ko"?"포트폴리오 매니저 — 최종 결정":"PORTFOLIO MANAGER — FINAL DECISION"}</span>
        {codeAction && (
          <div style={{ marginLeft:"auto", fontSize:8, padding:"2px 10px", borderRadius:4, background: matches?"rgba(74,222,128,0.1)":"rgba(245,158,11,0.1)", border:`1px solid ${matches?"#4ADE8040":"#F59E0B40"}`, color: matches?"#4ADE80":"#F59E0B" }}>
            {matches ? (lang==="ko"?"✓ 스코어 일치":"✓ Score Match") : (lang==="ko"?"⚠ 스코어와 상이":"⚠ Score Mismatch")}
          </div>
        )}
      </div>
      {r && (
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:r.bg, border:`2px solid ${r.color}50`, borderRadius:24, padding:"8px 18px", marginBottom:16, fontSize:15, color:r.color, letterSpacing:2, fontWeight:700 }}>
          <span style={{ fontSize:20 }}>{r.icon}</span> {r.label} 기준 · 가중점수 {score!=null?(score>=0?"+":"")+score.toFixed(3):"—"}
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:28, marginBottom:18, flexWrap:"wrap" }}>
        <div style={{ fontSize:56, fontWeight:900, lineHeight:1, color:col, letterSpacing:5, textShadow:`0 0 40px ${col}55` }}>{decision.action}</div>
        <div>
          <div style={{ fontSize:10, color:"var(--ta-dim)", letterSpacing:2, marginBottom:4 }}>{lang==="ko"?"확신도":"CONFIDENCE"}</div>
          <div style={{ fontSize:24, color:col, fontWeight:700 }}>{decision.confidence}%</div>
          <div style={{ width:110, height:4, background:"var(--ta-dark)", borderRadius:2, marginTop:5 }}>
            <div style={{ width:`${decision.confidence}%`, height:"100%", background:col, borderRadius:2 }} />
          </div>
        </div>
        <div style={{ marginLeft:"auto", background:`${col}10`, border:`1px solid ${col}28`, borderRadius:8, padding:"10px 16px", textAlign:"center" }}>
          <div style={{ fontSize:10, color:"var(--ta-dim)", letterSpacing:2, marginBottom:4 }}>{lang==="ko"?"위험 수준":"RISK LEVEL"}</div>
          <div style={{ fontSize:15, color:col, fontWeight:700, letterSpacing:2 }}>{decision.riskLevel}</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:8, marginBottom:16 }}>
        {([[lang==="ko"?"포지션 크기":"POSITION SIZE",decision.positionSize],[lang==="ko"?"진입가 (USD)":"ENTRY (USD)",decision.entry||decision.entryPrice],[lang==="ko"?"손절가":"STOP LOSS",decision.stopLoss],[lang==="ko"?"익절가":"TAKE PROFIT",decision.takeProfit],[lang==="ko"?"투자기간":"TIMEFRAME",decision.timeframe],krwPrice?[lang==="ko"?"현재가 (KRW)":"Current (KRW)",fmtKRW(krwPrice)]:null] as (string[] | null)[]).filter((x): x is string[] => x !== null).map((item) => item[1] ? (
          <div key={item[0]} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:6, padding:"9px 12px" }}>
            <div style={{ fontSize:10, color:"var(--ta-dim)", letterSpacing:2, marginBottom:4 }}>{item[0]}</div>
            <div style={{ fontSize:13, color:"var(--ta-text)", fontWeight:600 }}>{item[1]}</div>
          </div>
        ) : null)}
      </div>
      <div style={{ borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:14 }}>
        <div style={{ fontSize:10, color:"var(--ta-dim)", letterSpacing:2, marginBottom:6, fontWeight:700 }}>{lang==="ko"?"판단 근거":"REASONING"}</div>
        <div style={{ fontSize:14, color:"var(--ta-text)", lineHeight:2 }}>{decision.reasoning}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════ */
export default function TradingAgentsPage() {
  const [market, setMarket]               = useState<{ usd: { price: number; change: number; mcap: number; vol: number }; krw: { price: number; change: number }; live: boolean } | null>(null);
  const [regime, setRegime]               = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reports, setReports]             = useState<Record<string, any>>({});
  const [signals, setSignals]             = useState<Record<string, number | null>>({});
  const [weightedScore, setWeightedScore] = useState<number | null>(null);
  const [activeStep, setActiveStep]       = useState<string | null>(null);
  const [isRunning, setIsRunning]         = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [finalDecision, setFinalDecision] = useState<any>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [language, setLanguage]           = useState<"ko" | "en">("ko");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMarketData().then(d => { setMarket(d); setRegime(detectRegime(d.usd?.change)); });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth", block:"nearest" }); }, [reports, finalDecision, activeStep, weightedScore]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addReport = (key: string, data: any) => setReports(p => ({ ...p, [key]: data }));
  const addSignal = (key: string, val: number | null) => setSignals(p => ({ ...p, [key]: val }));

  const runAnalysis = async () => {
    setIsRunning(true); setReports({}); setSignals({}); setWeightedScore(null); setFinalDecision(null); setError(null);
    const allSignals: Record<string, number | null> = {};

    try {
      const mkt = await fetchMarketData();
      setMarket(mkt);
      const curRegime = detectRegime(mkt.usd?.change);
      setRegime(curRegime);
      const { usd, krw } = mkt;
      const weights = REGIME_WEIGHTS[curRegime];
      const ri = REGIMES[curRegime];

      const ctx = `Bitcoin Market Snapshot — ${new Date().toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})} KST
USD : ${fmtUSD(usd.price)} (24h ${fmtPct(usd.change)})
KRW : ${fmtKRW(krw.price)} (24h ${fmtPct(krw.change)})
Market Cap: ${fmtB(usd.mcap)}  |  24h Volume: ${fmtB(usd.vol)}
시장 국면: ${ri.label}`;

      const langInst = language === "ko" ? "반드시 한국어로 답변하라." : "Respond in English.";
      const SIGNAL_SUFFIX = `\n\n${langInst}\n마지막 줄은 반드시: SIGNAL: BULLISH 또는 SIGNAL: NEUTRAL 또는 SIGNAL: BEARISH`;

      setActiveStep("technical");
      const tech = await callClaude(`You are a Bitcoin technical analyst. 국면: ${ri.label}.\n**TREND:** **SUPPORT:** **RESISTANCE:** **INDICATORS:** RSI,MACD,MAs\n**SIGNAL:** BULLISH/BEARISH/NEUTRAL${SIGNAL_SUFFIX}`, `Analyze BTC technicals:\n${ctx}`);
      addReport("technical", tech);
      const techSig = parseSignal(tech); allSignals.technical = techSig; addSignal("technical", techSig);

      setActiveStep("sentiment");
      const sent = await callClaude(`You are a crypto sentiment analyst. 국면: ${ri.label}.\n**MARKET MOOD:** **SOCIAL SIGNALS:** **VERDICT:** BULLISH/BEARISH/NEUTRAL${SIGNAL_SUFFIX}`, `Assess BTC sentiment:\n${ctx}`);
      addReport("sentiment", sent);
      const sentSig = parseSignal(sent); allSignals.sentiment = sentSig; addSignal("sentiment", sentSig);

      setActiveStep("news");
      const news = await callClaude(`You are a macro & news analyst. 국면: ${ri.label}.\n**MACRO:** **REGULATORY:** **CATALYSTS:** **RISKS:** **IMPACT:** BULLISH/BEARISH/NEUTRAL${SIGNAL_SUFFIX}`, `Analyze macro for BTC:\n${ctx}`);
      addReport("news", news);
      const newsSig = parseSignal(news); allSignals.news = newsSig; addSignal("news", newsSig);

      setActiveStep("fundamentals");
      const fund = await callClaude(`You are a Bitcoin on-chain fundamentals analyst. ★ HIGH PRIORITY (${weights.fundamentals}% weight). 국면: ${ri.label}.\n**NETWORK HEALTH:** **HALVING CYCLE:** **ADOPTION:** **ON-CHAIN:** MVRV,SOPR\n**ASSESSMENT:** BULLISH/BEARISH/NEUTRAL${SIGNAL_SUFFIX}`, `Analyze BTC fundamentals:\n${ctx}`);
      addReport("fundamentals", fund);
      const fundSig = parseSignal(fund); allSignals.fundamentals = fundSig; addSignal("fundamentals", fundSig);

      const pack = `TECHNICAL(${weights.technical}%):\n${tech}\n\nSENTIMENT(${weights.sentiment}%):\n${sent}\n\nNEWS(${weights.news}%):\n${news}\n\nFUNDAMENTALS(★${weights.fundamentals}%):\n${fund}`;

      setActiveStep("bullish");
      const bull = await callClaude(`You are the Bullish BTC Researcher. ★ HIGH PRIORITY (${weights.bullish}% weight). 국면: ${ri.label}.\n**BULL THESIS:** **TOP CATALYSTS:** 3 items\n**PRICE TARGET (30d):** **CONFIDENCE:** X%${SIGNAL_SUFFIX}`, `Build bull case:\n${pack}\n\nBTC: ${fmtUSD(usd.price)} | ${fmtKRW(krw.price)}`);
      addReport("bullish", bull);
      allSignals.bullish = +1; addSignal("bullish", +1);

      setActiveStep("bearish");
      const bear = await callClaude(`You are the Bearish BTC Researcher. ★ HIGH PRIORITY (${weights.bearish}% weight). 국면: ${ri.label}.\n**BEAR THESIS:** **TOP RISKS:** 3 items\n**DOWNSIDE TARGET:** **CONFIDENCE:** X%${SIGNAL_SUFFIX}`, `Build bear case:\n${pack}\n\nBull:\n${bull}\n\nBTC: ${fmtUSD(usd.price)} | ${fmtKRW(krw.price)}`);
      addReport("bearish", bear);
      allSignals.bearish = -1; addSignal("bearish", -1);

      setActiveStep("debate");
      const [bullR, bearR] = await Promise.all([
        callClaude(`You are Bullish Researcher. ${langInst} 3 sharp bullet counter to bear.`, `Bear:\n${bear}\nRebuttal:`),
        callClaude(`You are Bearish Researcher. ${langInst} 3 precise bullet counter to bull.`, `Bull:\n${bull}\nCounter:`),
      ]);
      addReport("debate", { bull:bullR, bear:bearR });

      setActiveStep("trader");
      const trade = await callClaude(`You are the BTC Trader. ${langInst} 국면: ${ri.label}.\n**ACTION:** BUY/SELL/HOLD\n**ENTRY:** **STOP LOSS:** **TAKE PROFIT:** **POSITION SIZE:** **TIMEFRAME:** **RATIONALE:** **CONFIDENCE:** X%`, `Decide:\nBULL:\n${bull}\nBEAR:\n${bear}\nDEBATE:\nBull:${bullR}\nBear:${bearR}\nBTC: ${fmtUSD(usd.price)} (${fmtKRW(krw.price)})\n국면: ${ri.label}`);
      addReport("trader", trade);

      setActiveStep("riskTeam");
      const rCtx = `Trade:\n${trade}\nBTC: ${fmtUSD(usd.price)} (${fmtPct(usd.change)})\n국면: ${ri.label}`;
      const [agg, neu, con] = await Promise.all([
        callClaude(`AGGRESSIVE Risk Manager. ${langInst} ★ HIGH PRIORITY (${weights.riskTeam}% weight). 3 sentences. Last line: ✅ APPROVE or ⚠️ APPROVE WITH CONDITIONS.`, rCtx),
        callClaude(`NEUTRAL Risk Manager. ${langInst} ★ HIGH PRIORITY (${weights.riskTeam}% weight). 3 sentences. Last line: ✅ APPROVE, ⚠️ MODIFY, or ❌ REJECT.`, rCtx),
        callClaude(`CONSERVATIVE Risk Manager. ${langInst} ★ HIGH PRIORITY (${weights.riskTeam}% weight). 3 sentences. Last line: ✅ APPROVE, ⚠️ REDUCE SIZE, or ❌ REJECT.`, rCtx),
      ]);
      addReport("riskTeam", { aggressive:agg, neutral:neu, conservative:con });
      const riskSig = parseRiskSignal({ aggressive:agg, neutral:neu, conservative:con });
      allSignals.riskTeam = riskSig; addSignal("riskTeam", riskSig);

      const score = computeWeightedScore(allSignals, weights);
      setWeightedScore(score);
      const codeAction = scoreToAction(score);

      setActiveStep("manager");
      const breakdown = SCORE_KEYS.map(k => {
        const s = allSignals[k];
        const w = weights[k]||0;
        const c = s!=null ? (s*w/100).toFixed(3) : "N/A";
        return `  ${k.padEnd(12)} signal=${s!=null?s:"-"} × weight=${w}% → contribution=${c}`;
      }).join("\n");

      const reasoningLang = language === "ko" ? "reasoning은 반드시 한국어로 작성하라." : "Write reasoning in English.";
      const finalRaw = await callClaude(
        `You are the Portfolio Manager. ${langInst} 코드 레벨 가중 점수를 최우선으로 참고하여 최종 결정하라.
Respond ONLY with valid JSON (no markdown, no backticks):
{"action":"BUY|SELL|HOLD","confidence":0-100,"positionSize":"X%","entry":"$XX,XXX","stopLoss":"$XX,XXX","takeProfit":"$XX,XXX","timeframe":"string","reasoning":"2-3 sentences ${reasoningLang}","riskLevel":"HIGH|MEDIUM|LOW"}`,
        `═══ 코드 레벨 가중 점수 ═══\n시장 국면: ${ri.label}\n가중 점수: ${score.toFixed(4)}\n코드 신호: ${codeAction}\n\n에이전트별:\n${breakdown}\n\n임계값: ≥+0.25→BUY | ≤-0.25→SELL | 사이→HOLD\n\nTrader: ${trade}\nRisk: Agg:${agg} / Neu:${neu} / Con:${con}\n\nBTC: ${fmtUSD(usd.price)}`
      );

      let parsed;
      try { parsed = JSON.parse(finalRaw.replace(/```(?:json)?|```/g,"").trim()); }
      catch { parsed = { action:codeAction, confidence:50, positionSize:"5%", reasoning:`Weighted score ${score.toFixed(3)} → ${codeAction}`, riskLevel:"MEDIUM" }; }
      addReport("manager", finalRaw);
      setFinalDecision(parsed);
    } catch(err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setIsRunning(false); setActiveStep(null); }
  };

  const stepStatus = (k: string) => k===activeStep?"active":reports[k]?"done":"pending";
  const doneCount  = Object.keys(reports).length;
  const progress   = Math.round((doneCount/STEPS.length)*100);
  const weights    = regime ? REGIME_WEIGHTS[regime] : {};
  const { usd, krw, live } = market||{ usd:null, krw:null, live:false };

  return (
    <>
      <style>{`
        @keyframes slideIn        { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes decisionReveal { from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)} }
        @keyframes spin           { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        /* Dark mode (default) */
        .ta-page { --ta-bg:#070B14; --ta-card:rgba(255,255,255,0.03); --ta-border:#1E293B; --ta-text:#E2E8F0; --ta-muted:#94A3B8; --ta-dim:#64748B; --ta-dark:#0F172A; }
        /* Light mode — html.light (next-themes) */
        html.light .ta-page {
          --ta-bg:#FFFFFF; --ta-card:rgba(0,0,0,0.04); --ta-border:#94A3B8; --ta-text:#020617; --ta-muted:#1E293B; --ta-dim:#334155; --ta-dark:#E2E8F0;
        }
        /* Light mode — prefers-color-scheme fallback */
        @media(prefers-color-scheme:light) {
          html:not(.dark) .ta-page {
            --ta-bg:#FFFFFF; --ta-card:rgba(0,0,0,0.04); --ta-border:#94A3B8; --ta-text:#020617; --ta-muted:#1E293B; --ta-dim:#334155; --ta-dark:#E2E8F0;
          }
        }
      `}</style>

      <div className="ta-page" style={{ background:"var(--ta-bg)", minHeight:"100vh", padding:20, fontFamily:"monospace", color:"var(--ta-text)" }}>
        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto" }}>

          {/* HEADER */}
          <div style={{ borderBottom:"1px solid var(--ta-border)", paddingBottom:20, marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ fontSize:10, color:"var(--ta-muted)", letterSpacing:4 }}>◈ TRADINGAGENTS v4 · WEIGHTED SCORE ENGINE</span>
              <span style={{ fontSize:11, padding:"3px 10px", borderRadius:4, background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)", color:"#FBBF24", fontWeight:700, letterSpacing:2 }}>₿ BITCOIN</span>
            </div>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
              <div>
                <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:8 }}>
                  <div style={{ fontSize:38, fontWeight:700, color:"var(--ta-text)", lineHeight:1 }}>{usd ? fmtUSD(usd.price) : "LOADING…"}</div>
                  <span style={{ fontSize:14, color:chgClr(usd?.change ?? null), fontWeight:600 }}>{fmtPct(usd?.change ?? null)}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ fontSize:8, color:"#F59E0B", letterSpacing:3, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:4, padding:"2px 7px" }}>UPBIT</div>
                  <div style={{ fontSize:20, color:"var(--ta-text)", fontWeight:600 }}>{krw ? fmtKRW(krw.price) : "—"}</div>
                  <span style={{ fontSize:12, color:chgClr(krw?.change ?? null), fontWeight:600 }}>{fmtPct(krw?.change ?? null)}</span>
                  <span style={{ fontSize:8, color:live?"#4ADE80":"#F59E0B", letterSpacing:2 }}>{live?"● LIVE":"○ MOCK"}</span>
                </div>
              </div>
              {/* 언어 선택 */}
              <div style={{ display:"flex", gap:0, borderRadius:6, overflow:"hidden", border:"1px solid var(--ta-border)", alignSelf:"flex-start" }}>
                {(["ko","en"] as const).map(l => (
                  <button key={l} onClick={() => setLanguage(l)} disabled={isRunning} style={{ padding:"8px 14px", fontSize:11, fontFamily:"monospace", letterSpacing:2, cursor:isRunning?"not-allowed":"pointer", background: language===l ? "rgba(56,189,248,0.15)" : "transparent", color: language===l ? "#38BDF8" : "var(--ta-muted)", border:"none", fontWeight: language===l ? 700 : 400, transition:"all 0.2s" }}>
                    {l==="ko" ? "한국어" : "English"}
                  </button>
                ))}
              </div>

              <button onClick={runAnalysis} disabled={isRunning} style={{ alignSelf:"flex-start", background:isRunning?"rgba(99,102,241,0.08)":"linear-gradient(135deg,#0EA5E9,#6366F1,#8B5CF6)", color:"var(--ta-text)", border:isRunning?"1px solid rgba(99,102,241,0.25)":"none", borderRadius:8, padding:"12px 24px", fontSize:11, fontFamily:"monospace", letterSpacing:3, cursor:isRunning?"not-allowed":"pointer", opacity:isRunning?0.55:1, boxShadow:isRunning?"none":"0 0 28px rgba(99,102,241,0.45)", display:"flex", alignItems:"center", gap:8 }}>
                {isRunning ? <><Spinner color="#6366F1" /> ANALYZING…</> : "▶  RUN ANALYSIS"}
              </button>
            </div>
          </div>

          {error && <div style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.28)", borderRadius:8, padding:12, marginBottom:16, color:"#FCA5A5", fontSize:11 }}>⚠ ERROR: {error}</div>}

          {/* BODY */}
          <div style={{ display:"grid", gridTemplateColumns:"196px 1fr", gap:20 }}>

            {/* Sidebar */}
            <div style={{ position:"sticky", top:20, alignSelf:"start" }}>
              {regime && <RegimePanel regime={regime} weights={weights} />}
              {[
                { label: language==="ko"?"분석팀":"ANALYST TEAM",    keys:["technical","sentiment","news","fundamentals"] },
                { label: language==="ko"?"연구팀":"RESEARCHER TEAM", keys:["bullish","bearish","debate"] },
                { label: language==="ko"?"실행팀":"EXECUTION TEAM",  keys:["trader","riskTeam","manager"] },
              ].map(g=>(
                <div key={g.label} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, color:"var(--ta-dim)", letterSpacing:3, paddingLeft:10, marginBottom:4, fontWeight:600 }}>── {g.label}</div>
                  {g.keys.map(k=><PipelineStep key={k} stepKey={k} status={stepStatus(k)} signals={signals} lang={language} />)}
                </div>
              ))}
              {isRunning && (
                <div style={{ paddingLeft:10, marginTop:14 }}>
                  <div style={{ height:3, background:"var(--ta-dark)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#0EA5E9,#6366F1,#8B5CF6)", borderRadius:2, transition:"width 0.5s ease" }} />
                  </div>
                  <div style={{ fontSize:9, color:"var(--ta-dim)", marginTop:5 }}>{doneCount}/{STEPS.length}</div>
                </div>
              )}
            </div>

            {/* Reports */}
            <div>
              {!isRunning && doneCount===0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  {/* Hero */}
                  <div style={{ textAlign:"center", padding:"32px 20px", border:"1px solid var(--ta-border)", borderRadius:12, background:"linear-gradient(135deg,rgba(14,165,233,0.04),rgba(139,92,246,0.04))" }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>⚖️</div>
                    <div style={{ fontSize:20, color:"var(--ta-text)", fontWeight:700, letterSpacing:3, marginBottom:8 }}>TRADINGAGENTS v4</div>
                    <div style={{ fontSize:14, color:"var(--ta-text)", letterSpacing:2, marginBottom:16 }}>월스트리트 AI 트레이딩팀 · 멀티에이전트 가중 점수 엔진</div>
                    {regime && (
                      <div style={{ display:"inline-flex", alignItems:"center", gap:10, background:REGIMES[regime]?.bg, border:`2px solid ${REGIMES[regime]?.color}60`, borderRadius:12, padding:"10px 24px", marginTop:8 }}>
                        <span style={{ fontSize:28 }}>{REGIMES[regime]?.icon}</span>
                        <div>
                          <div style={{ fontSize:10, color:"var(--ta-muted)", letterSpacing:2 }}>현재 시장 국면</div>
                          <div style={{ fontSize:22, color:REGIMES[regime]?.color, fontWeight:800, letterSpacing:3 }}>{REGIMES[regime]?.label}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 시스템 소개 */}
                  <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--ta-border)", borderRadius:10, padding:20 }}>
                    <div style={{ fontSize:12, color:"#38BDF8", letterSpacing:3, marginBottom:12, fontWeight:700 }}>SYSTEM OVERVIEW</div>
                    <div style={{ fontSize:14, color:"var(--ta-text)", lineHeight:2.2 }}>
                      Columbia University AI 연구에서 영감을 받은 <strong style={{ color:"var(--ta-text)" }}>비트코인 전용</strong> 멀티에이전트 트레이딩 시스템입니다.<br/>
                      10개의 전문 AI 에이전트가 각자의 관점에서 비트코인 시장을 분석하고,<br/>
                      시장 국면(CRASH/BEAR/RANGE/BULL/SURGE)에 따라 동적으로 가중치를 조정하여<br/>
                      최종 투자 결정(BUY/SELL/HOLD)을 도출합니다.
                    </div>
                  </div>

                  {/* 파이프라인 */}
                  <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--ta-border)", borderRadius:10, padding:20 }}>
                    <div style={{ fontSize:12, color:"#C084FC", letterSpacing:3, marginBottom:14, fontWeight:700 }}>ANALYSIS PIPELINE</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr auto 1fr", gap:10, alignItems:"center" }}>
                      {/* Analyst Team */}
                      <div style={{ background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, padding:12 }}>
                        <div style={{ fontSize:11, color:"#38BDF8", letterSpacing:2, marginBottom:8, fontWeight:700 }}>ANALYST TEAM</div>
                        {["📊 Technical Analyst","💬 Sentiment Analyst","📰 News Analyst","⛓️ Fundamentals Analyst"].map(a=>(
                          <div key={a} style={{ fontSize:12, color:"var(--ta-text)", padding:"4px 0" }}>{a}</div>
                        ))}
                      </div>
                      <div style={{ color:"var(--ta-dim)", fontSize:16 }}>→</div>
                      {/* Researcher Team */}
                      <div style={{ background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:8, padding:12 }}>
                        <div style={{ fontSize:11, color:"#4ADE80", letterSpacing:2, marginBottom:8, fontWeight:700 }}>RESEARCHER TEAM</div>
                        {["🐂 Bullish Researcher","🐻 Bearish Researcher","⚔️ Bull vs Bear Debate"].map(a=>(
                          <div key={a} style={{ fontSize:12, color:"var(--ta-text)", padding:"4px 0" }}>{a}</div>
                        ))}
                      </div>
                      <div style={{ color:"var(--ta-dim)", fontSize:16 }}>→</div>
                      {/* Execution Team */}
                      <div style={{ background:"rgba(244,114,182,0.06)", border:"1px solid rgba(244,114,182,0.2)", borderRadius:8, padding:12 }}>
                        <div style={{ fontSize:11, color:"#F472B6", letterSpacing:2, marginBottom:8, fontWeight:700 }}>EXECUTION TEAM</div>
                        {["⚡ Trader Agent","🛡️ Risk Team (3명)","👔 Portfolio Manager"].map(a=>(
                          <div key={a} style={{ fontSize:12, color:"var(--ta-text)", padding:"4px 0" }}>{a}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 핵심 기능 */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--ta-border)", borderRadius:10, padding:16 }}>
                      <div style={{ fontSize:12, color:"#FBBF24", letterSpacing:3, marginBottom:10, fontWeight:700 }}>MARKET REGIME DETECTION</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {Object.entries(REGIMES).map(([key, r]) => (
                          <div key={key} style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:14 }}>{r.icon}</span>
                            <span style={{ fontSize:12, color:r.color, width:100, fontWeight:700 }}>{r.label}</span>
                            <span style={{ fontSize:11, color:"var(--ta-text)" }}>{r.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--ta-border)", borderRadius:10, padding:16 }}>
                      <div style={{ fontSize:12, color:"#22C55E", letterSpacing:3, marginBottom:10, fontWeight:700 }}>WEIGHTED SCORE ENGINE</div>
                      <div style={{ fontSize:13, color:"var(--ta-text)", lineHeight:2.2 }}>
                        각 에이전트의 신호(BULLISH/NEUTRAL/BEARISH)를<br/>
                        +1, 0, -1로 변환 후 국면별 가중치로 합산<br/><br/>
                        <span style={{ color:"#22C55E", fontWeight:700, fontSize:14 }}>Score ≥ +0.25 → BUY</span><br/>
                        <span style={{ color:"#F59E0B", fontWeight:700, fontSize:14 }}>-0.25 &lt; Score &lt; +0.25 → HOLD</span><br/>
                        <span style={{ color:"#EF4444", fontWeight:700, fontSize:14 }}>Score ≤ -0.25 → SELL</span>
                      </div>
                    </div>
                  </div>

                  {/* 활용법 */}
                  <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--ta-border)", borderRadius:10, padding:20 }}>
                    <div style={{ fontSize:12, color:"#FB923C", fontWeight:700, letterSpacing:3, marginBottom:12 }}>HOW TO USE</div>
                    <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:"10px 16px", fontSize:13, color:"var(--ta-text)", lineHeight:2 }}>
                      <span style={{ color:"#38BDF8", fontWeight:700 }}>1.</span>
                      <span><strong style={{ color:"var(--ta-text)" }}>▶ RUN ANALYSIS</strong> 버튼을 클릭하면 10개 에이전트가 순차적으로 분석을 시작합니다 (약 60~90초 소요)</span>
                      <span style={{ color:"#38BDF8", fontWeight:700 }}>2.</span>
                      <span>왼쪽 사이드바에서 각 에이전트의 <strong style={{ color:"var(--ta-text)" }}>진행 상황</strong>과 <strong style={{ color:"var(--ta-text)" }}>신호(▲▼—)</strong>를 실시간으로 확인할 수 있습니다</span>
                      <span style={{ color:"#38BDF8", fontWeight:700 }}>3.</span>
                      <span>모든 분석이 완료되면 <strong style={{ color:"var(--ta-text)" }}>가중 점수 게이지</strong>가 나타나며, 에이전트별 기여도를 시각적으로 보여줍니다</span>
                      <span style={{ color:"#38BDF8", fontWeight:700 }}>4.</span>
                      <span>마지막으로 <strong style={{ color:"var(--ta-text)" }}>Portfolio Manager</strong>가 진입가/손절/익절/포지션 크기까지 포함한 최종 결정을 내립니다</span>
                    </div>
                  </div>

                  {/* 주의사항 */}
                  <div style={{ background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:10, padding:16 }}>
                    <div style={{ fontSize:12, color:"#EF4444", letterSpacing:3, marginBottom:8, fontWeight:700 }}>DISCLAIMER</div>
                    <div style={{ fontSize:12, color:"var(--ta-text)", lineHeight:2 }}>
                      본 도구는 교육 및 참고 목적으로 제공됩니다. AI 에이전트의 분석은 실시간 시장 데이터를 기반으로 하지만,
                      투자 조언이 아닙니다. 실제 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
                      암호화폐 투자는 높은 변동성과 손실 위험이 있습니다.
                    </div>
                  </div>

                  {/* vs ai-hedge-fund */}
                  <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--ta-border)", borderRadius:10, padding:20 }}>
                    <div style={{ fontSize:12, color:"#A78BFA", letterSpacing:3, marginBottom:12, fontWeight:700 }}>VS AI HEDGE FUND</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                      <div>
                        <div style={{ fontSize:11, color:"var(--ta-text)", letterSpacing:2, marginBottom:8, fontWeight:700 }}>AI HEDGE FUND (기존)</div>
                        <div style={{ fontSize:12, color:"var(--ta-text)", lineHeight:2.2 }}>
                          - 주식 종목 분석 (글로벌)<br/>
                          - 5개 분석 에이전트<br/>
                          - 7명 투자 대가 페르소나<br/>
                          - 단순 다수결 의사결정<br/>
                          - 시장 국면 미반영
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:11, color:"#38BDF8", letterSpacing:2, marginBottom:8, fontWeight:700 }}>TRADING AGENTS v4 (신규)</div>
                        <div style={{ fontSize:12, color:"var(--ta-text)", lineHeight:2.2 }}>
                          - <strong style={{ color:"var(--ta-text)" }}>비트코인 전용</strong> 심층 분석<br/>
                          - <strong style={{ color:"var(--ta-text)" }}>10개</strong> 전문 에이전트<br/>
                          - <strong style={{ color:"var(--ta-text)" }}>Bull vs Bear 디베이트</strong><br/>
                          - <strong style={{ color:"var(--ta-text)" }}>레짐 가중 점수</strong> 의사결정<br/>
                          - <strong style={{ color:"var(--ta-text)" }}>3인 리스크 위원회</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isRunning && activeStep && !reports[activeStep] && (
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:`${AGENTS[activeStep].color}0A`, border:`1px solid ${AGENTS[activeStep].color}28`, borderRadius:8, marginBottom:16 }}>
                  <Spinner color={AGENTS[activeStep].color} />
                  <div>
                    <div style={{ fontSize:11, color:AGENTS[activeStep].color, letterSpacing:2 }}>{AGENTS[activeStep].icon}  {AGENTS[activeStep].name.toUpperCase()} — PROCESSING</div>
                    <div style={{ fontSize:9, color:"var(--ta-dim)", marginTop:2 }}>신호 파싱 후 가중 점수에 반영됩니다</div>
                  </div>
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                {STEPS.filter(k => reports[k]).map(k=>(
                  <ReportCard key={k} stepKey={k} content={reports[k]} weights={weights} signals={signals} lang={language} />
                ))}
                {weightedScore != null && <ScoreGauge signals={signals} weights={weights} score={weightedScore} regime={regime || "RANGE"} />}
                {finalDecision && <DecisionCard decision={finalDecision} krwPrice={krw?.price || 0} regime={regime || "RANGE"} score={weightedScore} lang={language} />}
              </div>
              <div ref={bottomRef} style={{ height:1 }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
