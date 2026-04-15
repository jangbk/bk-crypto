import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "유동성 리스크",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
