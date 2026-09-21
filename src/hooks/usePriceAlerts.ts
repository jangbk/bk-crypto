"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CryptoAsset } from "@/lib/types";
import {
  requestNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications";

export type AlertDirection = "above" | "below";

export interface PriceAlert {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly targetPrice: number;
  readonly direction: AlertDirection;
  readonly active: boolean;
  readonly createdAt: string;
}

const STORAGE_KEY = "bk-crypto-price-alerts";

function loadAlerts(): readonly PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PriceAlert[];
  } catch {
    return [];
  }
}

function persistAlerts(alerts: readonly PriceAlert[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // Storage full or unavailable — silently skip
  }
}

interface UsePriceAlertsOptions {
  readonly assets: readonly CryptoAsset[];
  readonly onTrigger?: (alert: PriceAlert, currentPrice: number) => void;
}

export function usePriceAlerts({ assets, onTrigger }: UsePriceAlertsOptions) {
  // SSR 은 항상 [] 로 렌더한다. useState 초기값으로 localStorage 를 읽으면
  // 클라이언트 첫 렌더가 SSR 과 달라지고, Header 의 AlertBell 배지가
  // (activeCount > 0 일 때만 그려지므로) DOM 불일치를 만들어 저장된 알림이
  // 하나라도 있는 사용자는 모든 경로에서 React #418 을 맞는다.
  // 복원은 마운트 이후로 미룬다 — I18nProvider 가 쓰는 방식과 같다.
  const [alerts, setAlerts] = useState<readonly PriceAlert[]>([]);
  const [restored, setRestored] = useState(false);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    setAlerts(loadAlerts());
    setRestored(true);
  }, []);

  // Persist whenever alerts change.
  // 복원 전에는 쓰지 않는다 — 초기 [] 가 저장분을 덮어써 알림이 사라진다.
  useEffect(() => {
    if (!restored) return;
    persistAlerts(alerts);
  }, [alerts, restored]);

  // Check alerts against current prices
  useEffect(() => {
    if (assets.length === 0) return;

    const triggeredIds: string[] = [];

    for (const alert of alerts) {
      if (!alert.active) continue;

      const asset = assets.find(
        (a) => a.symbol.toLowerCase() === alert.symbol.toLowerCase()
      );
      if (!asset) continue;

      const price = asset.current_price;
      const triggered =
        (alert.direction === "above" && price >= alert.targetPrice) ||
        (alert.direction === "below" && price <= alert.targetPrice);

      if (triggered) {
        triggeredIds.push(alert.id);
        const dirLabel = alert.direction === "above" ? "above" : "below";
        const title = `Price Alert: ${alert.symbol.toUpperCase()}`;
        const body = `${alert.name} is now $${price.toLocaleString()} (${dirLabel} $${alert.targetPrice.toLocaleString()})`;

        showBrowserNotification(title, body);
        onTriggerRef.current?.(alert, price);
      }
    }

    if (triggeredIds.length > 0) {
      setAlerts((prev) =>
        prev.map((a) =>
          triggeredIds.includes(a.id) ? { ...a, active: false } : a
        )
      );
    }
  }, [assets, alerts]);

  const addAlert = useCallback(
    (params: {
      readonly symbol: string;
      readonly name: string;
      readonly targetPrice: number;
      readonly direction: AlertDirection;
    }) => {
      requestNotificationPermission();

      const newAlert: PriceAlert = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        symbol: params.symbol,
        name: params.name,
        targetPrice: params.targetPrice,
        direction: params.direction,
        active: true,
        createdAt: new Date().toISOString(),
      };

      setAlerts((prev) => [newAlert, ...prev]);
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  }, []);

  const activeCount = alerts.filter((a) => a.active).length;

  return {
    alerts,
    activeCount,
    addAlert,
    removeAlert,
    toggleAlert,
  } as const;
}
