import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "트레이딩 에이전트",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
