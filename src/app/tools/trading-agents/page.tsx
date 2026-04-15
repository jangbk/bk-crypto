"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AGENTS, STEPS, SCORE_KEYS, REGIMES, REGIME_WEIGHTS, fmtUSD, fmtKRW, fmtB, fmtPct, chgClr } from "@/components/trading-agents/constants";
import { parseSignal, parseRiskSignal, computeWeightedScore, scoreToAction, detectRegime, callClaude, fetchMarketData } from "@/components/trading-agents/signalHelpers";
import { Spinner, ScoreGauge, RegimePanel, PipelineStep, ReportCard, DecisionCard } from "@/components/trading-agents/AgentUIComponents";
import { LandingContent } from "@/components/trading-agents/LandingContent";

export default function TradingAgentsPage() {
  const { data: marketQuery } = useQuery({
    queryKey: ["trading-agents-market"],
    queryFn: fetchMarketData,
  });

  const [market, setMarket] = useState<{ usd: { price: number; change: number; mcap: number; vol: number }; krw: { price: number; change: number }; live: boolean } | null>(null);
  const [regime, setRegime] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reports, setReports] = useState<Record<string, any>>({});
  const [signals, setSignals] = useState<Record<string, number | null>>({});
  const [weightedScore, setWeightedScore] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [finalDecision, setFinalDecision] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"ko" | "en">("ko");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (marketQuery) { setMarket(marketQuery); setRegime(detectRegime(marketQuery.usd?.change)); }
  }, [marketQuery]);

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
        .ta-page { --ta-bg:#070B14; --ta-card:rgba(255,255,255,0.03); --ta-border:#1E293B; --ta-text:#E2E8F0; --ta-muted:#94A3B8; --ta-dim:#64748B; --ta-dark:#0F172A; }
        html.light .ta-page { --ta-bg:#FFFFFF; --ta-card:rgba(0,0,0,0.04); --ta-border:#94A3B8; --ta-text:#020617; --ta-muted:#1E293B; --ta-dim:#334155; --ta-dark:#E2E8F0; }
        @media(prefers-color-scheme:light) { html:not(.dark) .ta-page { --ta-bg:#FFFFFF; --ta-card:rgba(0,0,0,0.04); --ta-border:#94A3B8; --ta-text:#020617; --ta-muted:#1E293B; --ta-dim:#334155; --ta-dark:#E2E8F0; } }
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
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                  <span style={{ fontSize:8, color:live?"#4ADE80":"#F59E0B", letterSpacing:2 }}>{live?"● LIVE":"○ MOCK"}</span>
                  <span style={{ fontSize:11, color:"var(--ta-muted)" }}>MCap {usd ? fmtB(usd.mcap) : "—"} · Vol {usd ? fmtB(usd.vol) : "—"}</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:0, borderRadius:6, overflow:"hidden", border:"1px solid var(--ta-border)", alignSelf:"flex-start" }}>
                {(["ko","en"] as const).map(l => (
                  <button key={l} onClick={() => setLanguage(l)} disabled={isRunning} style={{ padding:"8px 14px", fontSize:11, fontFamily:"monospace", letterSpacing:2, cursor:isRunning?"not-allowed":"pointer", background: language===l ? "rgba(56,189,248,0.15)" : "transparent", color: language===l ? "#38BDF8" : "var(--ta-muted)", border:"none", fontWeight: language===l ? 700 : 400, transition:"all 0.2s" }}>
                    {l==="ko" ? "한국어" : "English"}
                  </button>
                ))}
              </div>
              <button onClick={runAnalysis} disabled={isRunning} style={{ alignSelf:"flex-start", background:isRunning?"rgba(99,102,241,0.08)":"linear-gradient(135deg,#0EA5E9,#6366F1,#8B5CF6)", color:"#FFFFFF", border:isRunning?"1px solid rgba(99,102,241,0.25)":"2px solid rgba(99,102,241,0.5)", borderRadius:12, padding:"16px 36px", fontSize:15, fontFamily:"monospace", letterSpacing:3, cursor:isRunning?"not-allowed":"pointer", opacity:isRunning?0.55:1, boxShadow:isRunning?"none":"0 0 32px rgba(99,102,241,0.5), 0 4px 16px rgba(0,0,0,0.3)", display:"flex", alignItems:"center", gap:10, fontWeight:700, transition:"all 0.2s ease" }}>
                {isRunning ? <><Spinner color="#6366F1" /> 분석 진행 중…</> : "🚀 AI 분석 시작"}
              </button>
            </div>
          </div>

          {!isRunning && doneCount===0 && (
            <div style={{ background:"linear-gradient(135deg,rgba(14,165,233,0.08),rgba(99,102,241,0.08))", border:"1px solid rgba(56,189,248,0.25)", borderRadius:10, padding:"14px 20px", marginBottom:18, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              <div style={{ fontSize:22 }}>💡</div>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:13, color:"#38BDF8", fontWeight:700, letterSpacing:1, marginBottom:4 }}>사용 방법</div>
                <div style={{ fontSize:12, color:"var(--ta-text)", lineHeight:1.8 }}>
                  우측 상단의 <strong style={{ color:"#A78BFA" }}>🚀 AI 분석 시작</strong> 버튼을 클릭하세요. 10개의 AI 에이전트가 비트코인 시장을 순차 분석하여 BUY/SELL/HOLD 결정을 내립니다. (약 60~90초 소요)
                </div>
              </div>
            </div>
          )}

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
              {!isRunning && doneCount===0 && <LandingContent regime={regime} />}

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
                {finalDecision && <DecisionCard decision={finalDecision} regime={regime || "RANGE"} score={weightedScore} lang={language} />}
              </div>
              <div ref={bottomRef} style={{ height:1 }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
