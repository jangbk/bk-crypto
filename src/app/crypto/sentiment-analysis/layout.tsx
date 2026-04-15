import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 감성분석",
  description: "FinGPT 기반 크립토 뉴스 감성분석 — 실시간 시장 심리 지표",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
