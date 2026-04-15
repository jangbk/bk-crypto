import type {
  CompanyHolding,
  CountryHolding,
  ETFHolding,
  SupplyBreakdown,
  Tab,
} from "./types";

// ---------------------------------------------------------------------------
// BTC Data
// ---------------------------------------------------------------------------
export const BTC_MAX_SUPPLY = 21_000_000;
export const BTC_MINED = 19_816_000; // 2025 Q4 추정
export const BTC_REMAINING = BTC_MAX_SUPPLY - BTC_MINED;

export const BTC_SUPPLY_BREAKDOWN: SupplyBreakdown[] = [
  { label: "사토시 나카모토 추정 보유", amount: 1_100_000, description: "2009-2010년 초기 채굴분. 한 번도 이동된 적 없음. Patoshi 패턴 분석 기반 추정치.", color: "#F7931A", icon: "coins" },
  { label: "분실/접근불가 추정", amount: 3_700_000, description: "분실된 개인키, 사망한 보유자, 초기 채굴 후 방치된 코인 등. Chainalysis 추정.", color: "#6B7280", icon: "lock" },
  { label: "국가 보유 합계", amount: 515_689, description: "각국 정부가 압수/구매/보유 중인 BTC 합산", color: "#10B981", icon: "globe" },
  { label: "기업/기관 보유 합계", amount: 986_627, description: "상장기업, 비상장기업, 채굴업체 보유 합산 (상위 13개사 기준, 2026.02)", color: "#3B82F6", icon: "building" },
  { label: "ETF 보유 합계", amount: 1_113_000, description: "미국 승인 현물 BTC ETF 총 보유량", color: "#8B5CF6", icon: "building" },
  { label: "미채굴 잔여량", amount: BTC_REMAINING, description: `2140년까지 채굴될 나머지. 현재 블록 보상: 3.125 BTC. 다음 반감기: 2028년 4월 예상.`, color: "#EAB308", icon: "pickaxe" },
];

export const BTC_COUNTRIES: CountryHolding[] = [
  { rank: 1, country: "미국", flag: "🇺🇸", held: 207_189, method: "압수", notes: "Silk Road, Bitfinex 해킹 등에서 압수. 전략적 비트코인 비축 행정명령 서명 (2025.3)" },
  { rank: 2, country: "중국", flag: "🇨🇳", held: 194_000, method: "압수", notes: "PlusToken 폰지 사기 등에서 압수. 일부 매각 완료 추정" },
  { rank: 3, country: "영국", flag: "🇬🇧", held: 61_000, method: "압수", notes: "2021년 사상 최대 규모 암호화폐 압수 (CPS)" },
  { rank: 4, country: "우크라이나", flag: "🇺🇦", held: 46_351, method: "기부/압수", notes: "전쟁 기부 + 공무원 신고분" },
  { rank: 5, country: "부탄", flag: "🇧🇹", held: 13_011, method: "채굴", notes: "수력발전 기반 국가 채굴 프로그램 운영" },
  { rank: 6, country: "엘살바도르", flag: "🇸🇻", held: 6_138, method: "구매", notes: "2021년 법정화폐 채택. 매일 1 BTC 구매 정책" },
  { rank: 7, country: "핀란드", flag: "🇫🇮", held: 1_981, method: "압수", notes: "관세청 마약 거래 압수분. 일부 경매 매각" },
  { rank: 8, country: "독일", flag: "🇩🇪", held: 0, method: "압수→매각", notes: "2024년 7월 약 50,000 BTC 전량 매각 완료" },
];

export const BTC_COMPANIES: CompanyHolding[] = [
  { rank: 1, company: "Strategy (MicroStrategy)", ticker: "MSTR", held: 717_722, value: 0, pctSupply: 3.418, type: "Public", country: "US" },
  { rank: 2, company: "Marathon Digital", ticker: "MARA", held: 53_822, value: 0, pctSupply: 0.256, type: "Mining", country: "US" },
  { rank: 3, company: "Twenty One Capital", ticker: "XXI", held: 43_514, value: 0, pctSupply: 0.207, type: "Public", country: "US" },
  { rank: 4, company: "Metaplanet", ticker: "3350", held: 35_102, value: 0, pctSupply: 0.167, type: "Public", country: "JP" },
  { rank: 5, company: "BSTR Holdings", ticker: "BSTR", held: 30_021, value: 0, pctSupply: 0.143, type: "Public", country: "US" },
  { rank: 6, company: "Riot Platforms", ticker: "RIOT", held: 19_287, value: 0, pctSupply: 0.092, type: "Mining", country: "US" },
  { rank: 7, company: "Galaxy Digital", ticker: "GLXY", held: 17_102, value: 0, pctSupply: 0.081, type: "Public", country: "CA" },
  { rank: 8, company: "Coinbase", ticker: "COIN", held: 14_548, value: 0, pctSupply: 0.069, type: "Exchange", country: "US" },
  { rank: 9, company: "CleanSpark", ticker: "CLSK", held: 13_099, value: 0, pctSupply: 0.062, type: "Mining", country: "US" },
  { rank: 10, company: "Trump Media", ticker: "DJT", held: 11_542, value: 0, pctSupply: 0.055, type: "Public", country: "US" },
  { rank: 11, company: "Tesla", ticker: "TSLA", held: 11_509, value: 0, pctSupply: 0.055, type: "Public", country: "US" },
  { rank: 12, company: "Hut 8 Corp", ticker: "HUT", held: 10_667, value: 0, pctSupply: 0.051, type: "Mining", country: "CA" },
  { rank: 13, company: "Block Inc", ticker: "XYZ", held: 8_692, value: 0, pctSupply: 0.041, type: "Public", country: "US" },
];

export const BTC_ETFS_DEFAULT: ETFHolding[] = [
  { name: "iShares Bitcoin Trust", ticker: "IBIT", held: 575_000, aum: 56.6e9, flows7d: 580e6, flows30d: 2.4e9 },
  { name: "Grayscale Bitcoin Trust", ticker: "GBTC", held: 204_000, aum: 20.1e9, flows7d: -80e6, flows30d: -320e6 },
  { name: "Fidelity Wise Origin", ticker: "FBTC", held: 200_000, aum: 19.7e9, flows7d: 200e6, flows30d: 840e6 },
  { name: "ARK 21Shares", ticker: "ARKB", held: 48_000, aum: 4.73e9, flows7d: 50e6, flows30d: 210e6 },
  { name: "Bitwise Bitcoin ETF", ticker: "BITB", held: 42_000, aum: 4.14e9, flows7d: 42e6, flows30d: 180e6 },
  { name: "Grayscale BTC Mini", ticker: "BTC", held: 30_000, aum: 2.95e9, flows7d: 22e6, flows30d: 95e6 },
  { name: "VanEck Bitcoin ETF", ticker: "HODL", held: 14_000, aum: 1.38e9, flows7d: 10e6, flows30d: 45e6 },
];

// ---------------------------------------------------------------------------
// ETH Data
// ---------------------------------------------------------------------------
export const ETH_COMPANIES: CompanyHolding[] = [
  { rank: 1, company: "Ethereum Foundation", ticker: "-", held: 271_394, value: 0, pctSupply: 0.226, type: "Foundation", country: "CH" },
  { rank: 2, company: "Consensys", ticker: "-", held: 45_000, value: 0, pctSupply: 0.037, type: "Private", country: "US" },
  { rank: 3, company: "Galaxy Digital", ticker: "GLXY", held: 32_000, value: 0, pctSupply: 0.027, type: "Public", country: "CA" },
  { rank: 4, company: "Meitu", ticker: "1357.HK", held: 940, value: 0, pctSupply: 0.001, type: "Public", country: "CN" },
];

export const ETH_ETFS: ETFHolding[] = [
  { name: "iShares Ethereum Trust", ticker: "ETHA", held: 842_000, aum: 2.77e9, flows7d: 45e6, flows30d: 180e6 },
  { name: "Grayscale Ethereum Trust", ticker: "ETHE", held: 1_520_000, aum: 4.99e9, flows7d: -20e6, flows30d: -85e6 },
  { name: "Fidelity Ethereum Fund", ticker: "FETH", held: 285_000, aum: 936e6, flows7d: 15e6, flows30d: 62e6 },
  { name: "Bitwise Ethereum ETF", ticker: "ETHW", held: 95_000, aum: 312e6, flows7d: 8e6, flows30d: 28e6 },
];

// ---------------------------------------------------------------------------
// SOL Data
// ---------------------------------------------------------------------------
export const SOL_HOLDINGS: CompanyHolding[] = [
  { rank: 1, company: "Solana Foundation", ticker: "-", held: 53_000_000, value: 0, pctSupply: 9.0, type: "Foundation", country: "CH" },
  { rank: 2, company: "Solana Labs", ticker: "-", held: 12_500_000, value: 0, pctSupply: 2.1, type: "Private", country: "US" },
  { rank: 3, company: "Alameda Research (locked)", ticker: "-", held: 7_500_000, value: 0, pctSupply: 1.3, type: "Locked", country: "-" },
  { rank: 4, company: "Jump Crypto", ticker: "-", held: 4_200_000, value: 0, pctSupply: 0.71, type: "VC", country: "US" },
];

// ---------------------------------------------------------------------------
// XRP Data
// ---------------------------------------------------------------------------
export const XRP_HOLDINGS: CompanyHolding[] = [
  { rank: 1, company: "Ripple Labs (Escrow)", ticker: "-", held: 38_400_000_000, value: 0, pctSupply: 38.4, type: "Escrow", country: "US" },
  { rank: 2, company: "Ripple Labs (운영)", ticker: "-", held: 4_800_000_000, value: 0, pctSupply: 4.8, type: "Private", country: "US" },
  { rank: 3, company: "Chris Larsen (공동창업자)", ticker: "-", held: 5_190_000_000, value: 0, pctSupply: 5.19, type: "Individual", country: "US" },
  { rank: 4, company: "Jed McCaleb (판매완료)", ticker: "-", held: 0, value: 0, pctSupply: 0, type: "Individual", country: "US" },
  { rank: 5, company: "Binance (거래소)", ticker: "BNB", held: 3_200_000_000, value: 0, pctSupply: 3.2, type: "Exchange", country: "MT" },
  { rank: 6, company: "Uphold", ticker: "-", held: 1_500_000_000, value: 0, pctSupply: 1.5, type: "Exchange", country: "US" },
];

export const XRP_SUPPLY_INFO = {
  maxSupply: 100_000_000_000,
  circulating: 57_500_000_000,
  escrow: 38_400_000_000,
  burned: 4_100_000_000,
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export const DEFAULT_PRICES: Record<Tab, number> = { bitcoin: 98420, ethereum: 3285, solana: 198, xrp: 2.35 };
export const SUPPLIES: Record<Tab, number> = { bitcoin: BTC_MINED, ethereum: 120_200_000, solana: 589_000_000, xrp: XRP_SUPPLY_INFO.circulating };
export const SYMBOLS: Record<Tab, string> = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL", xrp: "XRP" };
