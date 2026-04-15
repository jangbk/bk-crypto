import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개별 주식",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
