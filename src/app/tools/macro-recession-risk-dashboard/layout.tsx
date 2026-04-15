import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "경기침체 리스크",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
