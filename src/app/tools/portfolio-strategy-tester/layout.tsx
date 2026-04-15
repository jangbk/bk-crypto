import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "전략 백테스트",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
