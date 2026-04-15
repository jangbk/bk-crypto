import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공포 & 탐욕 지수",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
