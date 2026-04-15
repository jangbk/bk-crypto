import type { Metadata } from "next";
import ChartsLayoutClient from "./ChartsLayoutClient";

export const metadata: Metadata = {
  title: "차트",
  description: "크립토, 매크로, 전통 금융 차트 분석",
};

export default function ChartsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChartsLayoutClient>{children}</ChartsLayoutClient>;
}
