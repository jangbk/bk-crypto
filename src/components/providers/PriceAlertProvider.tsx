"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { usePriceAlerts, type PriceAlert, type AlertDirection } from "@/hooks/usePriceAlerts";
import { useToast } from "@/components/ui/Toast";
import { PriceAlertDialog } from "@/components/ui/PriceAlertDialog";
import type { CryptoAsset } from "@/lib/types";

interface PriceAlertContextType {
  readonly alerts: readonly PriceAlert[];
  readonly activeCount: number;
  readonly openDialog: () => void;
  readonly setAssets: (assets: readonly CryptoAsset[]) => void;
}

const PriceAlertContext = createContext<PriceAlertContextType>({
  alerts: [],
  activeCount: 0,
  openDialog: () => {},
  setAssets: () => {},
});

export function usePriceAlertContext() {
  return useContext(PriceAlertContext);
}

export function PriceAlertProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<readonly CryptoAsset[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleTrigger = useCallback(
    (alert: PriceAlert, currentPrice: number) => {
      const dir = alert.direction === "above" ? "above" : "below";
      toast(
        "info",
        `${alert.symbol.toUpperCase()} is $${currentPrice.toLocaleString()} (${dir} $${alert.targetPrice.toLocaleString()})`
      );
    },
    [toast]
  );

  const { alerts, activeCount, addAlert, removeAlert, toggleAlert } =
    usePriceAlerts({ assets, onTrigger: handleTrigger });

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  return (
    <PriceAlertContext.Provider
      value={{ alerts, activeCount, openDialog, setAssets }}
    >
      {children}
      <PriceAlertDialog
        open={dialogOpen}
        onClose={closeDialog}
        assets={assets}
        alerts={alerts}
        onAdd={addAlert}
        onRemove={removeAlert}
        onToggle={toggleAlert}
      />
    </PriceAlertContext.Provider>
  );
}
