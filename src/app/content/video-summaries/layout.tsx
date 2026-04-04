import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "BK CRYPTO" },
  description: "영상 요약 - YouTube 투자 영상 AI 요약",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
