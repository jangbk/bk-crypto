import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "급등 스크리너",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
