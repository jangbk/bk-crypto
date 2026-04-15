import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "귀금속",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
