import { TrendingDown } from "lucide-react";

export function CycleComparisonTable() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown className="h-5 w-5 text-purple-500" />
        <h4 className="font-semibold text-lg">과거 사이클 비교</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-semibold">사이클</th>
              <th className="text-right p-3 font-semibold">고점→저점 하락폭</th>
              <th className="text-right p-3 font-semibold">하락 기간</th>
              <th className="text-right p-3 font-semibold">2월 저점</th>
              <th className="text-right p-3 font-semibold">3월 고점</th>
              <th className="text-right p-3 font-semibold">최종 저점</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50 hover:bg-muted/50">
              <td className="p-3 font-medium">2014</td>
              <td className="p-3 text-right text-negative">-50%+</td>
              <td className="p-3 text-right">~1년</td>
              <td className="p-3 text-right">2월 10일</td>
              <td className="p-3 text-right">3월 3일</td>
              <td className="p-3 text-right">10월</td>
            </tr>
            <tr className="border-b border-border/50 hover:bg-muted/50">
              <td className="p-3 font-medium">2018</td>
              <td className="p-3 text-right text-negative">-70%</td>
              <td className="p-3 text-right">51주</td>
              <td className="p-3 text-right">2월 6일</td>
              <td className="p-3 text-right">3월 5일</td>
              <td className="p-3 text-right">12월</td>
            </tr>
            <tr className="border-b border-border/50 hover:bg-muted/50">
              <td className="p-3 font-medium">2019</td>
              <td className="p-3 text-right text-negative">-52%</td>
              <td className="p-3 text-right">수개월</td>
              <td className="p-3 text-right">-</td>
              <td className="p-3 text-right">-</td>
              <td className="p-3 text-right">3월</td>
            </tr>
            <tr className="border-b border-border/50 hover:bg-muted/50">
              <td className="p-3 font-medium">2022</td>
              <td className="p-3 text-right text-negative">-63%</td>
              <td className="p-3 text-right">183일</td>
              <td className="p-3 text-right">1월 (유사)</td>
              <td className="p-3 text-right">3월 2일</td>
              <td className="p-3 text-right">11월</td>
            </tr>
            <tr className="bg-primary/5 font-semibold">
              <td className="p-3">2026 (현재)</td>
              <td className="p-3 text-right text-negative">-50%</td>
              <td className="p-3 text-right">123일</td>
              <td className="p-3 text-right text-primary">2월 6일</td>
              <td className="p-3 text-right text-warning">3월 초 (예상)</td>
              <td className="p-3 text-right text-orange-500">10월? 5월?</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
