"use client";

import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Shield,
  Zap,
} from "lucide-react";
import type { ExchangeFlow } from "./types";
import { formatUSD } from "./types";

interface FlowInsightsProps {
  flows: ExchangeFlow[];
}

export function FlowInsights({ flows }: FlowInsightsProps) {
  const insights: { icon: React.ReactNode; color: string; bg: string; title: string; desc: string }[] = [];

  const btc = flows.find((f) => f.asset === "BTC");
  const eth = flows.find((f) => f.asset === "ETH");
  const usdt = flows.find((f) => f.asset === "USDT");

  // BTC flow
  if (btc) {
    if (btc.netflow24h < -100_000_000) {
      insights.push({
        icon: <TrendingUp className="h-4 w-4" />, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20",
        title: "BTC 대규모 유출",
        desc: `24시간 BTC 순유출 ${formatUSD(Math.abs(btc.netflow24h))}. 투자자들이 거래소에서 코인을 꺼내 장기 보유 중. 매도 압력 감소로 강세 신호.`,
      });
    } else if (btc.netflow24h > 100_000_000) {
      insights.push({
        icon: <TrendingDown className="h-4 w-4" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20",
        title: "BTC 대규모 유입",
        desc: `24시간 BTC 순유입 ${formatUSD(btc.netflow24h)}. 거래소 입금 증가는 잠재적 매도 압력. 단기 하락 가능성에 주의.`,
      });
    }

    if (btc.netflow30d < -1_000_000_000) {
      insights.push({
        icon: <Shield className="h-4 w-4" />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",
        title: "BTC 30일 축적 추세",
        desc: `지난 30일간 BTC ${formatUSD(Math.abs(btc.netflow30d))} 순유출. 장기적 축적 추세는 공급 충격(Supply Shock) 가능성을 시사.`,
      });
    }
  }

  // ETH flow
  if (eth && eth.netflow30d < -300_000_000) {
    insights.push({
      icon: <Activity className="h-4 w-4" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20",
      title: "ETH 축적 진행 중",
      desc: `30일간 ETH ${formatUSD(Math.abs(eth.netflow30d))} 순유출. 스테이킹 또는 DeFi 활용을 위한 유출일 가능성 높음.`,
    });
  }

  // USDT flow (opposite interpretation)
  if (usdt && usdt.netflow24h > 100_000_000) {
    insights.push({
      icon: <Zap className="h-4 w-4" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20",
      title: "스테이블코인 유입 (매수 대기)",
      desc: `USDT ${formatUSD(usdt.netflow24h)} 거래소 유입. 스테이블코인 유입은 매수 준비 신호로, 상승 동력이 될 수 있습니다.`,
    });
  }

  // Overall market flow
  const totalNet = flows.reduce((s, f) => s + (f.asset !== "USDT" && f.asset !== "USDC" ? f.netflow24h : 0), 0);
  if (Math.abs(totalNet) > 50_000_000 && insights.length < 4) {
    insights.push({
      icon: totalNet < 0 ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />,
      color: totalNet < 0 ? "text-green-400" : "text-red-400",
      bg: totalNet < 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20",
      title: totalNet < 0 ? "전체 시장 유출 우세" : "전체 시장 유입 우세",
      desc: totalNet < 0
        ? `암호화폐 전체 순유출 ${formatUSD(Math.abs(totalNet))}. 시장 전반적으로 축적 모드에 진입한 것으로 보입니다.`
        : `암호화폐 전체 순유입 ${formatUSD(totalNet)}. 매도 압력이 증가하고 있어 단기 조정 가능성에 대비하세요.`,
    });
  }

  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        시사점 분석
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((ins, i) => (
          <div key={i} className={`rounded-lg p-3 border ${ins.bg}`}>
            <div className={`flex items-center gap-1.5 font-medium text-sm mb-1 ${ins.color}`}>
              {ins.icon} {ins.title}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{ins.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
