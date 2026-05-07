"use client";

import type { ReactNode } from "react";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";

/**
 * 메인 콘텐츠 wrapper. 데스크톱에선 Sidebar 폭(60 또는 240px) 만큼 좌측 padding 자동.
 * 모바일에선 sidebar 가 overlay drawer 라 padding 0.
 */
export function SidebarMain({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        "transition-[padding-left] duration-200",
        collapsed ? "md:pl-[60px]" : "md:pl-[240px]",
      )}
    >
      {children}
    </div>
  );
}
