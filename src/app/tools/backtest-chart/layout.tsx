import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "백테스트 차트",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
