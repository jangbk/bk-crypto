"use client";

import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  Shield,
} from "lucide-react";
import type { BotStrategy } from "./types";
import { formatBotValue } from "./formatters";

interface BotStatsCardsProps {
  bot: BotStrategy;
  effectiveCapital: number;
}

export default function BotStatsCards({ bot, effectiveCapital }: BotStatsCardsProps) {
  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-4">핵심 성과 지표</h3>
        <div className="space-y-3">
          {[
            {
              icon: <TrendingUp className="h-4 w-4 text-positive" />,
              label: "총 수익률",
              value: `${bot.totalReturn >= 0 ? "+" : ""}${bot.totalReturn}%`,
              color: bot.totalReturn >= 0 ? "text-positive" : "text-negative",
            },
            {
              icon: <Activity className="h-4 w-4 text-primary" />,
              label: "월평균 수익률",
              value: `${bot.monthlyReturn >= 0 ? "+" : ""}${bot.monthlyReturn}%`,
              color: bot.monthlyReturn >= 0 ? "text-positive" : "text-negative",
            },
            {
              icon: <TrendingDown className="h-4 w-4 text-negative" />,
              label: "최대 낙폭 (MDD)",
              value: `${bot.maxDrawdown}%`,
              color: "text-negative",
            },
            {
              icon: <Zap className="h-4 w-4 text-warning" />,
              label: "샤프 비율",
              value: bot.sharpeRatio.toFixed(2),
              color: "",
            },
            {
              icon: <Target className="h-4 w-4 text-blue-500" />,
              label: "승률",
              value: `${bot.winRate}%`,
              color: "",
            },
            {
              icon: <Shield className="h-4 w-4 text-positive" />,
              label: "Profit Factor",
              value: bot.profitFactor.toFixed(2),
              color: "",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {metric.icon}
                {metric.label}
              </div>
              <span className={`font-bold font-mono ${metric.color}`}>
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Trade Stats */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-4">거래 통계</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">총 거래 수</span>
            <span className="font-bold">{bot.totalTrades}회</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">수익 거래</span>
            <span className="font-bold text-positive">
              {bot.profitTrades}회
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">손실 거래</span>
            <span className="font-bold text-negative">
              {bot.lossTrades}회
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-positive rounded-full"
              style={{
                width: `${bot.totalTrades > 0 ? (bot.profitTrades / bot.totalTrades) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">평균 수익</span>
            <span className="font-bold text-positive">
              +{bot.avgWin}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">평균 손실</span>
            <span className="font-bold text-negative">
              {bot.avgLoss}%
            </span>
          </div>
        </div>
      </section>

      {/* Bot Info */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-4">봇 정보</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">전략</span>
            <span className="font-medium">{bot.description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">거래소</span>
            <span className="font-medium">{bot.exchange}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">자산</span>
            <span className="font-medium">{bot.asset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">운영 시작</span>
            <span className="font-medium">{bot.startDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">투자금</span>
            <span className="font-medium">
              {formatBotValue(bot.id, effectiveCapital)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">현재 평가</span>
            <span
              className={`font-bold ${bot.currentValue >= effectiveCapital ? "text-positive" : "text-negative"}`}
            >
              {formatBotValue(bot.id, bot.currentValue)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
