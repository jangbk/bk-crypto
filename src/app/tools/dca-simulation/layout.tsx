import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "BK CRYPTO" },
  description: "DCA 시뮬레이션 - 적립식 투자 수익률 분석",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
