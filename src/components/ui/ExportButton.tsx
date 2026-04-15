"use client";

import { useState, useCallback } from "react";
import { Download, Check } from "lucide-react";
import { exportChartAsImage } from "@/lib/chart-export";

interface ExportButtonProps {
  /** Ref to the container element that holds the chart canvas */
  getContainer: () => HTMLElement | null;
  /** Title rendered in the exported image header */
  title: string;
  /** Optional extra CSS classes on the outer button */
  className?: string;
  /** Button size variant */
  size?: "sm" | "md";
}

export function ExportButton({
  getContainer,
  title,
  className,
  size = "md",
}: ExportButtonProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");

  const handleExport = useCallback(async () => {
    const container = getContainer();
    if (!container || status === "saving") return;

    setStatus("saving");
    try {
      await exportChartAsImage(container, title);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("idle");
    }
  }, [getContainer, title, status]);

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      onClick={handleExport}
      disabled={status === "saving"}
      className={
        className ??
        "rounded-md border border-border p-2 hover:bg-muted transition-colors disabled:opacity-50"
      }
      title={status === "done" ? "저장됨" : "차트 이미지 다운로드"}
    >
      {status === "done" ? (
        <Check className={`${iconSize} text-emerald-500`} />
      ) : (
        <Download className={iconSize} />
      )}
    </button>
  );
}
