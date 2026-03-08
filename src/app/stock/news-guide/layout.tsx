import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News Guide",
  description: "뉴스 기반 주식 매매 가이드 - 실시간 감성분석",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
