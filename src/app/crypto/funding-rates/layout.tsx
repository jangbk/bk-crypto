import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "펀딩레이트",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
