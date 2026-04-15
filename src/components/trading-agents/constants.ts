/* ══════════════════════════════════════════════════
   AGENT REGISTRY
══════════════════════════════════════════════════ */
export const AGENTS: Record<string, { name: string; nameKo: string; icon: string; color: string }> = {
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

export const STEPS = ["technical","sentiment","news","fundamentals","bullish","bearish","debate","trader","riskTeam","manager"];
export const SCORE_KEYS = ["technical","sentiment","news","fundamentals","bullish","bearish","riskTeam"];

/* ══════════════════════════════════════════════════
   MARKET REGIME
══════════════════════════════════════════════════ */
export const REGIMES: Record<string, { label: string; color: string; bg: string; icon: string; desc: string }> = {
  CRASH: { label:"급락장 CRASH",   color:"#EF4444", bg:"rgba(239,68,68,0.08)",   icon:"🔴", desc:"위기 대응 모드" },
  BEAR:  { label:"하락 추세 BEAR", color:"#F87171", bg:"rgba(248,113,113,0.08)", icon:"🐻", desc:"리스크 관리 강화" },
  RANGE: { label:"횡보장 RANGE",   color:"#F59E0B", bg:"rgba(245,158,11,0.08)",  icon:"⚖️", desc:"펀더멘털 중심 분석" },
  BULL:  { label:"상승 추세 BULL", color:"#4ADE80", bg:"rgba(74,222,128,0.08)",  icon:"🐂", desc:"모멘텀 추종 모드" },
  SURGE: { label:"급등장 SURGE",   color:"#A78BFA", bg:"rgba(167,139,250,0.08)", icon:"🚀", desc:"과열 경계 모드" },
};

export const REGIME_WEIGHTS: Record<string, Record<string, number>> = {
  CRASH: { technical:5,  sentiment:5,  news:15, fundamentals:15, bullish:5,  bearish:5,  riskTeam:50 },
  BEAR:  { technical:10, sentiment:10, news:15, fundamentals:20, bullish:10, bearish:10, riskTeam:25 },
  RANGE: { technical:10, sentiment:15, news:10, fundamentals:25, bullish:12, bearish:13, riskTeam:15 },
  BULL:  { technical:20, sentiment:15, news:5,  fundamentals:20, bullish:15, bearish:15, riskTeam:10 },
  SURGE: { technical:20, sentiment:20, news:5,  fundamentals:15, bullish:12, bearish:13, riskTeam:15 },
};

/* ══════════════════════════════════════════════════
   FORMATTING HELPERS
══════════════════════════════════════════════════ */
export const fmtUSD = (n: number) => n ? `${Number(n).toLocaleString("en-US")}` : "—";
export const fmtKRW = (n: number) => n ? `₩${Number(n).toLocaleString("ko-KR")}` : "—";
export const fmtB   = (n: number) => n ? `${(n/1e9).toFixed(1)}B` : "—";
export const fmtPct = (n: number | null) => n!=null ? `${n>=0?"+":""}${Number(n).toFixed(2)}%` : "—";
export const chgClr = (v: number | null) => v==null?"var(--ta-muted)":v>=0?"#4ADE80":"#F87171";
