"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Landmark,
  Globe,
  Scale,
  Info,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import type {
  LivePolicyData,
  PolicyStatus,
  ImpactCard as ImpactCardType,
  CountryRegulation,
  USPolicyItem,
} from "@/components/crypto-policy/types";
import {
  usPolicyItems,
  globalRegulations,
  impactCards,
} from "@/components/crypto-policy/data";
import { USPolicyCard } from "@/components/crypto-policy/USPolicyCard";
import { CountryCard } from "@/components/crypto-policy/CountryCard";
import { ImpactAssessmentCard } from "@/components/crypto-policy/ImpactAssessmentCard";
import { BillsTracker } from "@/components/crypto-policy/BillsTracker";
import { RecentNews } from "@/components/crypto-policy/RecentNews";
import { InvestmentImplications } from "@/components/crypto-policy/InvestmentImplications";

// ---------------------------------------------------------------------------
// Status Filter Options
// ---------------------------------------------------------------------------

const STATUS_FILTERS = ["전체", "완료", "진행 중", "검토 중", "보류"] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CryptoPolicyPage() {
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | "전체">(
    "전체",
  );

  const {
    data: liveData = null,
    isLoading,
    refetch,
  } = useQuery<LivePolicyData | null>({
    queryKey: ["crypto-policy"],
    queryFn: async () => {
      const res = await fetch("/api/content/crypto-policy", {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && !data.error) return data as LivePolicyData;
      return null;
    },
  });

  const lastRefresh = liveData?.lastUpdated || null;

  // Use live data when available, fall back to hardcoded defaults
  const activePolicies = liveData?.usPolicies || usPolicyItems;
  const activeRegulations = liveData?.globalRegulations || globalRegulations;
  const activeImpactCards = liveData?.impactCards || impactCards;
  const recentNews = liveData?.recentNews || [];
  const bills = liveData?.bills || [];

  const filteredPolicies =
    statusFilter === "전체"
      ? activePolicies
      : activePolicies.filter((p) => p.status === statusFilter);

  const completedCount = activePolicies.filter(
    (p) => p.status === "완료",
  ).length;
  const inProgressCount = activePolicies.filter(
    (p) => p.status === "진행 중",
  ).length;
  const reviewCount = activePolicies.filter(
    (p) => p.status === "검토 중",
  ).length;

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              크립토 규제 & 정책 동향
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="max-w-2xl text-sm text-muted-foreground">
              주요국 암호화폐 규제 현황과 정책 변화를 추적합니다. 미국 정책을
              중심으로 글로벌 규제 트렌드와 시장 영향을 분석합니다.
            </p>
            {isLoading && (
              <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                최신 정책 로딩 중...
              </span>
            )}
            {lastRefresh && !isLoading && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                최신 업데이트: {lastRefresh}
              </span>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {completedCount}
            </p>
            <p className="text-xs text-muted-foreground">완료</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {inProgressCount}
            </p>
            <p className="text-xs text-muted-foreground">진행 중</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {reviewCount}
            </p>
            <p className="text-xs text-muted-foreground">검토 중</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {globalRegulations.length}
            </p>
            <p className="text-xs text-muted-foreground">추적 국가</p>
          </div>
        </div>

        {/* US Policy Section */}
        <section className="mb-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                미국 정책 현황
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredPolicies.map((item) => (
              <USPolicyCard key={item.id} item={item} />
            ))}
          </div>

          {filteredPolicies.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
              <Info className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                해당 상태의 정책이 없습니다.
              </p>
            </div>
          )}
        </section>

        {/* Global Regulation Dashboard */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              글로벌 규제 대시보드
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeRegulations.map((reg) => (
              <CountryCard key={reg.country} reg={reg} />
            ))}
          </div>
        </section>

        {/* Impact Assessment */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">영향 평가</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeImpactCards.map((card) => (
              <ImpactAssessmentCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        {/* Investment Implications */}
        <InvestmentImplications />

        {/* Bills Tracker */}
        <BillsTracker bills={bills} />

        {/* Recent News */}
        <RecentNews news={recentNews} />

        {/* Disclaimer */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              본 페이지의 정보는 교육 및 참고 목적으로 제공되며, 투자 조언이
              아닙니다. 규제 환경은 빠르게 변화할 수 있으므로 최신 정보는 각국
              규제기관의 공식 발표를 확인하시기 바랍니다.
              {lastRefresh && <> 마지막 업데이트: {lastRefresh}</>}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
