"use client";

import type { ReactNode } from "react";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";

/**
 * 메인 콘텐츠 wrapper. 데스크톱에선 Sidebar 가 보일 때만 240px 좌 padding.
 * sidebar 가 hidden(=true) 또는 모바일이면 padding 0.
 */
export function SidebarMain({ children }: { children: ReactNode }) {
  const { hidden } = useSidebar();
  return (
    <div
      className={cn(
        "transition-[padding-left] duration-200",
        hidden ? "md:pl-0" : "md:pl-[240px]",
      )}
    >
      {children}
    </div>
  );
}
