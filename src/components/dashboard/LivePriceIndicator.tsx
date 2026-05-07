import type { ConnectionStatus } from "@/hooks/useRealtimePrices";

interface LivePriceIndicatorProps {
  status: ConnectionStatus;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; dotClass: string; pulseClass: string }
> = {
  connected: {
    label: "LIVE",
    dotClass: "bg-positive",
    pulseClass: "animate-pulse bg-positive/40",
  },
  reconnecting: {
    label: "RECONNECTING",
    dotClass: "bg-warning",
    pulseClass: "animate-pulse bg-warning/40",
  },
  disconnected: {
    label: "OFFLINE",
    dotClass: "bg-zinc-400",
    pulseClass: "",
  },
};

export function LivePriceIndicator({ status }: LivePriceIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur-sm"
      aria-live="polite"
      aria-label={`Price feed: ${config.label}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulseClass && (
          <span
            className={`absolute inset-0 rounded-full ${config.pulseClass}`}
          />
        )}
        <span
          className={`relative inline-block h-2 w-2 rounded-full ${config.dotClass}`}
        />
      </span>
      {config.label}
    </span>
  );
}
