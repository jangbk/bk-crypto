export type PolicyStatus = "완료" | "진행 중" | "검토 중" | "보류" | "부정적";

export type RegulationStance = "친화적" | "중립" | "제한적";

export type SentimentLevel = "긍정적" | "중립" | "부정적";

export interface USPolicyItem {
  id: string;
  title: string;
  date: string;
  status: PolicyStatus;
  description: string;
  marketImpact: {
    direction: "positive" | "neutral" | "negative";
    summary: string;
  };
}

export interface CountryRegulation {
  country: string;
  flag: string;
  regulationName: string;
  stance: RegulationStance;
  keyUpdate: string;
  date: string;
  details: string[];
}

export interface ImpactCard {
  title: string;
  sentiment: SentimentLevel;
  score: number; // 0-100
  items: string[];
}

export interface NewsItem {
  title: string;
  date: string;
  source: string;
  impact: string;
  summary: string;
}

export interface BillItem {
  id: string;
  name: string;
  nameKo: string;
  country: string;
  flag: string;
  chamber: string;
  status: string;
  progress: number;
  introducedDate: string;
  lastActionDate: string;
  lastAction: string;
  sponsor: string;
  summary: string;
  marketImpact: string;
  keyProvisions: string[];
}

export interface LivePolicyData {
  usPolicies?: USPolicyItem[];
  globalRegulations?: CountryRegulation[];
  impactCards?: ImpactCard[];
  recentNews?: NewsItem[];
  bills?: BillItem[];
  lastUpdated?: string;
}
