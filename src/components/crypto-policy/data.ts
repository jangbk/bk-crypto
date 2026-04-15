import type { USPolicyItem, CountryRegulation, ImpactCard } from "./types";

// ---------------------------------------------------------------------------
// US Policy Data
// ---------------------------------------------------------------------------

export const usPolicyItems: USPolicyItem[] = [
  {
    id: "btc-reserve",
    title: "비트코인 전략적 비축 행정명령",
    date: "2025.03",
    status: "완료",
    description:
      "트럼프 대통령이 비트코인 전략적 비축(Strategic Bitcoin Reserve) 행정명령에 서명. 미국 정부가 보유한 약 20만 BTC를 매각하지 않고 장기 보유하며, 예산 중립적 방식으로 추가 매수 가능성도 열어둠.",
    marketImpact: {
      direction: "positive",
      summary:
        "비트코인의 '디지털 금' 내러티브 강화. 다른 국가들의 비축 경쟁 촉발 가능성.",
    },
  },
  {
    id: "sab121",
    title: "SAB 121 폐지 (은행 크립토 수탁 허용)",
    date: "2025.01",
    status: "완료",
    description:
      "SEC의 SAB 121 회계 지침이 공식 폐지되어 은행들이 고객 디지털 자산을 수탁할 때 부채로 인식할 필요 없어짐. 기관 수탁 서비스 진입 장벽 대폭 완화.",
    marketImpact: {
      direction: "positive",
      summary:
        "JPMorgan, BNY Mellon 등 대형 은행의 크립토 수탁 서비스 진출 가속화.",
    },
  },
  {
    id: "sec-taskforce",
    title: "SEC 크립토 태스크포스 출범",
    date: "2025.01",
    status: "진행 중",
    description:
      "SEC 내 크립토 태스크포스가 출범하여 디지털 자산 규제 명확화 작업 진행 중. 토큰 분류 기준, 증권 해당 여부 가이드라인 등을 마련 중.",
    marketImpact: {
      direction: "positive",
      summary:
        "규제 명확성 제고로 프로젝트들의 미국 내 활동 재개. 알트코인 시장에 긍정적.",
    },
  },
  {
    id: "genius-act",
    title: "스테이블코인 법안 (GENIUS Act)",
    date: "2025.05",
    status: "진행 중",
    description:
      "상원에서 통과된 GENIUS Act(Guiding and Establishing National Innovation for US Stablecoins)가 하원 심의 중. 결제용 스테이블코인의 준비금 요건, 발행사 등록 요건 등을 규정.",
    marketImpact: {
      direction: "positive",
      summary:
        "USDC, USDT 발행사에 명확한 규제 틀 제공. 달러 패권 강화 수단으로 인식.",
    },
  },
  {
    id: "fit21",
    title: "시장구조 법안 (FIT21)",
    date: "2025.06",
    status: "진행 중",
    description:
      "하원을 통과한 FIT21(Financial Innovation and Technology for the 21st Century Act)이 상원 심의 중. SEC와 CFTC의 관할권을 명확히 구분하고 디지털 자산의 증권/상품 분류 기준 제시.",
    marketImpact: {
      direction: "positive",
      summary:
        "증권 vs 상품 논쟁 종식 기대. DeFi 프로토콜과 거래소에 법적 확실성 부여.",
    },
  },
  {
    id: "sec-ripple",
    title: "SEC vs Ripple 소송 종료",
    date: "2025.03",
    status: "완료",
    description:
      "SEC가 Ripple Labs에 대한 항소를 철회하고 합의로 소송 종결. 벌금이 대폭 감축되었으며, XRP의 2차 시장 거래는 증권이 아닌 것으로 최종 확인.",
    marketImpact: {
      direction: "positive",
      summary:
        "XRP 가격 급등 및 알트코인 시장 전반에 긍정적. '증권 아닌 토큰' 선례 확립.",
    },
  },
  {
    id: "eth-staking",
    title: "이더리움 ETF 스테이킹 허용 검토",
    date: "2025.10",
    status: "검토 중",
    description:
      "SEC가 현물 이더리움 ETF 내 스테이킹 허용 여부를 공식 검토 중. 승인 시 ETF 수익률 향상으로 기관 자금 유입 확대 기대.",
    marketImpact: {
      direction: "positive",
      summary:
        "ETH ETF 매력도 상승. 스테이킹 수익률(3-4%) 추가로 전통 채권과 비교 우위.",
    },
  },
  {
    id: "sec-chair",
    title: "SEC 위원장 Paul Atkins 취임",
    date: "2025.04",
    status: "완료",
    description:
      "크립토 친화적으로 알려진 Paul Atkins가 SEC 위원장으로 취임. 집행 중심에서 규제 명확화로 방향 전환 시사. Gary Gensler 시대의 강경 노선 종료.",
    marketImpact: {
      direction: "positive",
      summary:
        "SEC의 크립토 정책 기조 180도 전환. 산업 전반에 우호적 규제 환경 조성.",
    },
  },
];

// ---------------------------------------------------------------------------
// Global Regulations Data
// ---------------------------------------------------------------------------

export const globalRegulations: CountryRegulation[] = [
  {
    country: "유럽연합",
    flag: "\u{1F1EA}\u{1F1FA}",
    regulationName: "MiCA (Markets in Crypto-Assets)",
    stance: "중립",
    keyUpdate: "MiCA 전면 시행 완료, 스테이블코인 규제 적용 중",
    date: "2025.06",
    details: [
      "크립토 자산 서비스 제공자(CASP) 라이선스 의무화",
      "스테이블코인 발행사 준비금 100% 보유 의무",
      "여행 규칙(Travel Rule) 전면 적용",
      "환경 공시 요건 도입 (PoW 에너지 사용량)",
    ],
  },
  {
    country: "일본",
    flag: "\u{1F1EF}\u{1F1F5}",
    regulationName: "자금결제법 / 금융상품거래법 개정",
    stance: "친화적",
    keyUpdate: "스테이블코인 발행 허용, Web3 세제 개편 추진",
    date: "2025.04",
    details: [
      "은행/신탁회사의 스테이블코인 발행 허용",
      "법인 보유 크립토 미실현 이익 과세 폐지",
      "DAO 법인격 부여 논의 진행",
      "거래소 등록 절차 간소화",
    ],
  },
  {
    country: "한국",
    flag: "\u{1F1F0}\u{1F1F7}",
    regulationName: "가상자산이용자보호법",
    stance: "중립",
    keyUpdate: "이용자 보호법 시행, 과세 2027년으로 재유예",
    date: "2025.07",
    details: [
      "가상자산이용자보호법 시행 (2024.07~)",
      "이상거래 감시 시스템 의무화",
      "가상자산 소득 과세 2027년으로 유예 확정",
      "가상자산 거래소 2곳 이상 상장 의무화 논의",
      "스테이블코인 별도 규제 프레임워크 검토 착수",
    ],
  },
  {
    country: "홍콩",
    flag: "\u{1F1ED}\u{1F1F0}",
    regulationName: "VASP 라이선스 제도",
    stance: "친화적",
    keyUpdate: "소매 투자자 거래 허용, Web3 허브 전략 가속",
    date: "2025.05",
    details: [
      "가상자산 거래소 라이선스 발급 진행 (HashKey, OSL 등)",
      "소매 투자자 주요 코인 거래 허용",
      "스테이블코인 발행사 샌드박스 운영",
      "Web3 스타트업 지원 펀드 운영",
    ],
  },
  {
    country: "싱가포르",
    flag: "\u{1F1F8}\u{1F1EC}",
    regulationName: "MAS 디지털 자산 프레임워크",
    stance: "중립",
    keyUpdate: "스테이블코인 규제 프레임워크 확정, DPT 라이선스 강화",
    date: "2025.08",
    details: [
      "MAS 승인 스테이블코인(MAS-regulated stablecoin) 제도",
      "디지털 결제 토큰(DPT) 서비스 라이선스 요건 강화",
      "소매 투자자 보호 가이드라인 발행",
      "토큰화 증권(Security Token) 별도 프레임워크",
    ],
  },
  {
    country: "UAE / 두바이",
    flag: "\u{1F1E6}\u{1F1EA}",
    regulationName: "VARA (Virtual Assets Regulatory Authority)",
    stance: "친화적",
    keyUpdate: "VARA 라이선스 확대, 글로벌 크립토 기업 유치 가속",
    date: "2025.03",
    details: [
      "VARA 라이선스 카테고리별 세분화 (거래소, 수탁, 자문 등)",
      "Binance, OKX 등 글로벌 거래소 라이선스 취득",
      "비과세 정책 유지로 크립토 인재 유입",
      "DIFC(두바이국제금융센터) 별도 디지털자산 규제",
    ],
  },
  {
    country: "영국",
    flag: "\u{1F1EC}\u{1F1E7}",
    regulationName: "FCA 크립토 규제",
    stance: "중립",
    keyUpdate: "크립토 자산 규제 법안 의회 심의 중",
    date: "2025.09",
    details: [
      "FCA 크립토자산 마케팅 규제 시행 중",
      "스테이블코인 결제 수단 인정 법안 추진",
      "크립토 자산 포괄 규제 프레임워크 의회 제출",
      "거래소 등록 요건 강화 (AML/KYC)",
    ],
  },
];

// ---------------------------------------------------------------------------
// Impact Cards Data
// ---------------------------------------------------------------------------

export const impactCards: ImpactCard[] = [
  {
    title: "전체 규제 심리",
    sentiment: "긍정적",
    score: 75,
    items: [
      "미국 친크립토 정책 기조가 글로벌 트렌드 주도",
      "주요국 대부분 규제 명확화 방향으로 수렴",
      "기관 투자 인프라 법적 기반 마련 가속화",
      "스테이블코인 규제가 가장 빠르게 진행 중",
    ],
  },
  {
    title: "주요 리스크",
    sentiment: "부정적",
    score: 35,
    items: [
      "미국 정치 환경 변화 시 정책 역전 가능성",
      "EU MiCA의 과도한 규제가 혁신 저해 우려",
      "글로벌 여행 규칙 적용으로 DeFi 규제 압력",
      "스테이블코인 규제가 달러 이외 통화에 불리",
      "AML/CFT 강화로 프라이버시 코인 상장 폐지 확대",
    ],
  },
  {
    title: "주요 기회",
    sentiment: "긍정적",
    score: 80,
    items: [
      "제도권 편입 가속으로 기관 자금 유입 확대",
      "은행 크립토 수탁 허용으로 전통금융 통합",
      "비트코인 국가 비축으로 '디지털 금' 지위 강화",
      "규제 명확화로 미국 내 크립토 스타트업 부활",
      "토큰화 실물자산(RWA) 시장 급성장 기대",
    ],
  },
];

// ---------------------------------------------------------------------------
// Investment Implications Data
// ---------------------------------------------------------------------------

export const investmentImplications = [
  {
    title: "규제와 가격의 상관관계",
    content:
      "역사적으로 규제 명확화는 크립토 가격에 긍정적으로 작용했습니다. 2024년 비트코인 ETF 승인 후 BTC는 6개월 내 100% 상승했으며, 2025년 친크립토 정책 기조 전환 이후에도 유사한 패턴이 관찰됩니다. 반면 규제 불확실성(예: 2022년 Terra/Luna 사태 후 규제 강화 우려)은 시장 하락을 가속화시켰습니다.",
  },
  {
    title: "미국 정책의 글로벌 촉매 역할",
    content:
      "미국의 비트코인 전략적 비축 행정명령은 다른 국가들의 유사 정책 검토를 촉발했습니다. 체코, 브라질, 일본 등이 비트코인 비축 논의를 시작했으며, 이는 비트코인의 글로벌 수요 증가로 이어질 수 있습니다. 미국의 스테이블코인 법안은 달러 패권 유지 수단으로 기능하며, 글로벌 스테이블코인 시장 성장을 견인합니다.",
  },
  {
    title: "기관 투자 가속화",
    content:
      "SAB 121 폐지와 SEC의 기조 변화로 은행, 자산운용사, 연기금 등 전통 금융기관의 크립토 시장 진입이 가속화되고 있습니다. 이는 시장 유동성 증가, 변동성 감소, 파생상품 시장 발전으로 이어지며, 장기적으로 크립토 자산의 '성숙한 자산군'으로의 전환을 의미합니다. ETF 자금 유입이 채굴량을 초과하는 공급 부족 현상도 구조적으로 고착화되고 있습니다.",
  },
];
