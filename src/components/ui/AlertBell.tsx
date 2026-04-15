"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBellProps {
  readonly activeCount: number;
  readonly onClick: () => void;
}

export function AlertBell({ activeCount, onClick }: AlertBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-lg p-2 hover:bg-muted transition-colors"
      aria-label={`Price alerts (${activeCount} active)`}
    >
      <Bell className="h-5 w-5 text-foreground" aria-hidden="true" />
      {activeCount > 0 && (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none",
            activeCount > 9 ? "h-4.5 w-4.5 px-1" : "h-4 w-4"
          )}
          aria-hidden="true"
        >
          {activeCount > 99 ? "99+" : activeCount}
        </span>
      )}
    </button>
  );
}
