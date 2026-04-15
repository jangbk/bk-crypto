"use client";

import { AGENTS, REGIMES, SCORE_KEYS } from "./constants";
import { scoreToAction } from "./signalHelpers";

/* ══════════════════════════════════════════════════
   UI COMPONENTS
══════════════════════════════════════════════════ */
export function Spinner({ color }: { color: string }) {
  return <div style={{ width:13, height:13, flexShrink:0, border:`2px solid ${color}33`, borderTop:`2px solid ${color}`, borderRadius:"50%", animation:"spin 0.75s linear infinite" }} />;
}

export function ScoreGauge({ signals, weights, score, regime }: { signals: Record<string, number | null>; weights: Record<string, number>; score: number; regime: string }) {
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

export function RegimePanel({ regime, weights }: { regime: string; weights: Record<string, number> }) {
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

export function PipelineStep({ stepKey, status, signals, lang="ko" }: { stepKey: string; status: string; signals: Record<string, number | null>; lang?: string }) {
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
export function ReportCard({ stepKey, content, weights, signals, lang="ko" }: { stepKey: string; content: any; weights: Record<string, number>; signals: Record<string, number | null>; lang?: string }) {
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
export function DecisionCard({ decision, regime, score, lang="ko" }: { decision: any; regime: string; score: number | null; lang?: string }) {
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
        {([[lang==="ko"?"포지션 크기":"POSITION SIZE",decision.positionSize],[lang==="ko"?"진입가 (USD)":"ENTRY (USD)",decision.entry||decision.entryPrice],[lang==="ko"?"손절가":"STOP LOSS",decision.stopLoss],[lang==="ko"?"익절가":"TAKE PROFIT",decision.takeProfit],[lang==="ko"?"투자기간":"TIMEFRAME",decision.timeframe]] as (string[])[]).map((item) => item[1] ? (
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
