import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "가중 리스크",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
