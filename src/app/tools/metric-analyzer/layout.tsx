import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "지표 분석기",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
