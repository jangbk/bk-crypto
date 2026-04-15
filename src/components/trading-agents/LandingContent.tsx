"use client";

import { REGIMES } from "./constants";

interface LandingContentProps {
  regime: string | null;
}

export function LandingContent({ regime }: LandingContentProps) {
  return (
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
          <div style={{ background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, padding:12 }}>
            <div style={{ fontSize:11, color:"#38BDF8", letterSpacing:2, marginBottom:8, fontWeight:700 }}>ANALYST TEAM</div>
            {["📊 Technical Analyst","💬 Sentiment Analyst","📰 News Analyst","⛓️ Fundamentals Analyst"].map(a=>(
              <div key={a} style={{ fontSize:12, color:"var(--ta-text)", padding:"4px 0" }}>{a}</div>
            ))}
          </div>
          <div style={{ color:"var(--ta-dim)", fontSize:16 }}>→</div>
          <div style={{ background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:8, padding:12 }}>
            <div style={{ fontSize:11, color:"#4ADE80", letterSpacing:2, marginBottom:8, fontWeight:700 }}>RESEARCHER TEAM</div>
            {["🐂 Bullish Researcher","🐻 Bearish Researcher","⚔️ Bull vs Bear Debate"].map(a=>(
              <div key={a} style={{ fontSize:12, color:"var(--ta-text)", padding:"4px 0" }}>{a}</div>
            ))}
          </div>
          <div style={{ color:"var(--ta-dim)", fontSize:16 }}>→</div>
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
              - 주식 종목 분석 (글로벌)<br/>- 5개 분석 에이전트<br/>- 7명 투자 대가 페르소나<br/>- 단순 다수결 의사결정<br/>- 시장 국면 미반영
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
  );
}
