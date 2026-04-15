import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "인플루언서 발언",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
