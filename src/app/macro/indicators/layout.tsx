import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "경제 지표",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
