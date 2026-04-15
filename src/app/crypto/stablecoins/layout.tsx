import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스테이블코인",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
