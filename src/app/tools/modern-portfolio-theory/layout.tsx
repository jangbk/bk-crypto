import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "포트폴리오 이론",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
