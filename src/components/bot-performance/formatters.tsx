import { type ReactNode } from "react";

/** Format amount in Korean style (억/만원 units) */
export function formatKRW(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000);
    const remainder = abs % 100_000_000;
    const man = Math.floor(remainder / 10_000);
    const won = Math.round(remainder % 10_000);
    if (man > 0 && won > 0) return `${sign}${eok}억 ${man.toLocaleString()}만 ${won.toLocaleString()}원`;
    if (man > 0) return `${sign}${eok}억 ${man.toLocaleString()}만원`;
    if (won > 0) return `${sign}${eok}억 ${won.toLocaleString()}원`;
    return `${sign}${eok}억원`;
  }
  if (abs >= 10_000) {
    const man = Math.floor(abs / 10_000);
    const won = Math.round(abs % 10_000);
    return won > 0
      ? `${sign}${man.toLocaleString()}만 ${won.toLocaleString()}원`
      : `${sign}${man.toLocaleString()}만원`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}원`;
}

export function formatUSD(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

const USD_BOT_IDS = new Set(["bybit-alpha-v4", "bybit-rotation", "mcdavidd-v2"]);

export function isUSDBot(id: string): boolean {
  return USD_BOT_IDS.has(id);
}

export function formatBotValue(id: string, value: number): string {
  return isUSDBot(id) ? formatUSD(value) : formatKRW(value);
}

export function getStatusBadge(status: string): ReactNode {
  if (status === "active")
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  if (status === "paused")
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Paused
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Stopped
    </span>
  );
}
