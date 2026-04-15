import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "거래소 자금 흐름",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
