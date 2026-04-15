// ─── Types ───────────────────────────────────────────────────────
export interface VideoSummary {
  id: string;
  videoUrl: string;
  videoId: string;
  title: string;
  channel: string;
  date: string;
  thumbnailUrl: string;
  summary: string;
  investmentGuide: string;
  keyPoints: string[];
  tags: string[];
  savedToNotion: boolean;
  notionUrl?: string;
}

// ─── Initial Data (Bitcoin: Dubious Speculation) ────────────────
export const INITIAL_SUMMARIES: VideoSummary[] = [
  {
    id: "1",
    videoUrl: "https://youtu.be/eAzoXY1GfIo",
    videoId: "eAzoXY1GfIo",
    title: "Bitcoin: Dubious Speculation",
    channel: "JangBK",
    date: "2026-02-06",
    thumbnailUrl: "https://img.youtube.com/vi/eAzoXY1GfIo/maxresdefault.jpg",
    summary: `비트코인이 고점 대비 약 50% 하락한 현 시점에서, 과거 베어마켓 사이클(2014, 2018, 2019, 2022)과 비교 분석을 진행합니다.

핵심 메시지: "베어마켓은 불과 베어 모두를 바보로 만든다(Bear markets make fools of both bulls and bears)."

비트코인은 2026년 2월 6일 저점을 형성했으며, 이는 2018년에도 정확히 같은 날짜에 저점이 발생한 것과 일치합니다. 과거 사이클 패턴을 보면:
- 2018년: 2월 저점 → 3월 반등(고점) → 4월 재하락 → 여름 최종 저점
- 2022년: 1월 저점 → 반등 → 여름 최종 저점
- 2019년: 52% 하락 후 20% 반등 → 팬데믹까지 횡보
- 2014년: 2월 저점 → 3월 초 낮은 고점(lower high) → 10월 최종 저점

이번 사이클에서도 비트코인이 50% 하락 후 반등하고 있으며, 약 1개월 내 낮은 고점(lower high)이 3월 초에 형성될 가능성이 높습니다. 20% 반등 시 70K~73K 수준에 도달할 수 있습니다.

향후 2~3개월간 높은 변동성이 예상되며, 여름에는 변동성이 크게 감소할 것으로 보입니다. Q4에 변동성이 다시 증가하며 다음 사이클이 시작될 수 있습니다.

또한 과거 매 사이클마다 불장에서 잘못된 사업 결정을 내린 기업들이 베어마켓에서 드러난다고 경고합니다(2022년의 FTX 사례처럼). 현재도 고점에서 레버리지를 과도하게 사용한 비트코인 재무회사(treasury company)들이 잠재적 리스크로 존재합니다.`,
    investmentGuide: `1. 단기 전략 (2~4주)
현재 50% 하락 후 카운터 트렌드 랠리 구간. 과거 패턴에 따르면 며칠~몇 주간 반등 가능하나, 3월 초에 낮은 고점(lower high) 형성 후 재하락 가능성이 높음. 단기 트레이딩은 소규모로, 손실 관리 철저히.

2. 중기 전략 (1~6개월)
- 4~5월 추가 하락 가능성 주시 (2번째 저점)
- 여름(7~8월)에는 변동성 급감 예상 → 관망 또는 분할 매수 구간
- 패닉 셀 금지: 대규모 캐피튤레이션 시 매수 기회로 활용

3. 장기 전략 (6~12개월)
- 최종 바닥: 10월이 가장 유력 (1차 후보), 5월이 2차 후보
- S&P 500이 4월 저점을 하회할 경우 비트코인 추가 하락 유발 가능
- Q4 변동성 증가 시 다음 강세장 시작 신호

4. 리스크 관리
- 올해의 목표: "생존" - 무리한 스윙 트레이딩으로 자산을 잃지 않는 것
- 카운터 트렌드 랠리에 속지 말 것 (2022년 5월의 사례)
- 숨겨진 기업 리스크 주시: 레버리지 과다 사용 비트코인 재무회사들 (원가 100K 이상)
- 포지션 크기를 보수적으로 유지

5. 4년 사이클
- S&P 500도 1958~1982년까지 약 4년 주기 반복
- 사이클은 결국 깨지지만, 확률은 사이클 쪽에 있음
- 사이클이 깨질 때는 아무도 예상하지 못할 때`,
    keyPoints: [
      "베어마켓은 불(bulls)과 베어(bears) 모두를 바보로 만든다",
      "비트코인 50% 하락 후 '결정론적 약세(deterministically bearish)' 관점은 비합리적",
      "2월 저점 → 3월 초 낮은 고점(lower high) 패턴이 2014, 2018, 2022년 반복",
      "20% 반등 시 70K~73K 도달 가능 (2019년 패턴과 유사)",
      "향후 2~3개월 높은 변동성, 여름 저변동성, Q4 변동성 재증가",
      "최종 바닥: 10월(1순위), 5월(2순위)",
      "S&P 500이 하락하면 비트코인 추가 하락 유발 (리스크 커브 상위)",
      "불장에서 잘못된 결정을 내린 미확인 기업들이 올해 베어마켓에서 드러날 것",
      "올해의 투자 목표: '생존' - 자산 보전이 최우선",
      "공포&탐욕 지수 극도 저점 → 과거 패턴상 소규모 반등 후 재하락",
    ],
    tags: [
      "Bitcoin",
      "Bear Market",
      "Cycle Analysis",
      "JangBK",
      "Risk Management",
    ],
    savedToNotion: false,
  },
];

// ─── LocalStorage Key ───────────────────────────────────────────
export const STORAGE_KEY = "video-summaries";

export function loadSummaries(): VideoSummary[] {
  if (typeof window === "undefined") return INITIAL_SUMMARIES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as VideoSummary[];
      if (parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return INITIAL_SUMMARIES;
}
