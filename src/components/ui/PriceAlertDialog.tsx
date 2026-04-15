"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { X, Trash2, Bell, BellOff, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CryptoAsset } from "@/lib/types";
import type { PriceAlert, AlertDirection } from "@/hooks/usePriceAlerts";

interface PriceAlertDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly assets: readonly CryptoAsset[];
  readonly alerts: readonly PriceAlert[];
  readonly onAdd: (params: {
    readonly symbol: string;
    readonly name: string;
    readonly targetPrice: number;
    readonly direction: AlertDirection;
  }) => void;
  readonly onRemove: (id: string) => void;
  readonly onToggle: (id: string) => void;
}

export function PriceAlertDialog({
  open,
  onClose,
  assets,
  alerts,
  onAdd,
  onRemove,
  onToggle,
}: PriceAlertDialogProps) {
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<AlertDirection>("above");
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus close button on open
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const selectedAsset = assets.find(
    (a) => a.symbol.toLowerCase() === selectedSymbol.toLowerCase()
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAsset || !targetPrice) return;

    const price = parseFloat(targetPrice);
    if (Number.isNaN(price) || price <= 0) return;

    onAdd({
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      targetPrice: price,
      direction,
    });

    setTargetPrice("");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Price Alert"
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-foreground">Price Alerts</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Create form */}
        <form onSubmit={handleSubmit} className="border-b border-border px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Asset selector */}
            <div className="col-span-2">
              <label htmlFor="alert-asset" className="block text-xs font-medium text-muted-foreground mb-1">
                Asset
              </label>
              <select
                id="alert-asset"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select asset...</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.symbol}>
                    {a.name} ({a.symbol.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Current price reference */}
            {selectedAsset && (
              <div className="col-span-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Current price:{" "}
                <span className="font-semibold text-foreground">
                  ${selectedAsset.current_price.toLocaleString()}
                </span>
              </div>
            )}

            {/* Target price */}
            <div>
              <label htmlFor="alert-price" className="block text-xs font-medium text-muted-foreground mb-1">
                Target Price
              </label>
              <input
                id="alert-price"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Direction */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Condition
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setDirection("above")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    direction === "above"
                      ? "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <TrendingUp className="h-3 w-3" />
                  Above
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("below")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    direction === "below"
                      ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <TrendingDown className="h-3 w-3" />
                  Below
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedAsset || !targetPrice}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Alert
          </button>
        </form>

        {/* Alert list */}
        <div className="max-h-64 overflow-y-auto px-5 py-3">
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No alerts yet. Create one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    alert.active
                      ? "border-border bg-background"
                      : "border-border/50 bg-muted/30 opacity-60"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground">
                        {alert.symbol.toUpperCase()}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                          alert.direction === "above"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}
                      >
                        {alert.direction === "above" ? (
                          <TrendingUp className="h-2.5 w-2.5" />
                        ) : (
                          <TrendingDown className="h-2.5 w-2.5" />
                        )}
                        {alert.direction}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      ${alert.targetPrice.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggle(alert.id)}
                    className="rounded-md p-1.5 hover:bg-muted transition-colors"
                    aria-label={alert.active ? "Pause alert" : "Resume alert"}
                  >
                    {alert.active ? (
                      <Bell className="h-3.5 w-3.5 text-foreground" />
                    ) : (
                      <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(alert.id)}
                    className="rounded-md p-1.5 hover:bg-red-500/10 transition-colors"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
