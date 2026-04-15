"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Symbol mapping: Binance symbol → CoinGecko ID ─────────────
const BINANCE_TO_COINGECKO: ReadonlyMap<string, string> = new Map([
  ["btcusdt", "bitcoin"],
  ["ethusdt", "ethereum"],
  ["solusdt", "solana"],
  ["bnbusdt", "binancecoin"],
  ["xrpusdt", "ripple"],
  ["adausdt", "cardano"],
  ["dogeusdt", "dogecoin"],
  ["linkusdt", "chainlink"],
  ["trxusdt", "tron"],
  ["dotusdt", "polkadot"],
]);

const STREAMS = Array.from(BINANCE_TO_COINGECKO.keys())
  .map((s) => `${s}@ticker`)
  .join("/");

const WS_URL = `wss://stream.binance.com:9443/stream?streams=${STREAMS}`;

// ─── Types ──────────────────────────────────────────────────────
export interface RealtimePrice {
  readonly price: number;
  readonly change24h: number;
  readonly updatedAt: number;
}

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface BinanceTickerData {
  readonly c: string; // current price
  readonly P: string; // 24h change percent
}

interface BinanceCombinedMessage {
  readonly stream: string;
  readonly data: BinanceTickerData;
}

interface UseRealtimePricesReturn {
  readonly prices: ReadonlyMap<string, RealtimePrice>;
  readonly status: ConnectionStatus;
}

// ─── Constants ──────────────────────────────────────────────────
const INITIAL_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 30_000;
const RECONNECT_BACKOFF_FACTOR = 2;

// ─── Hook ───────────────────────────────────────────────────────
export function useRealtimePrices(): UseRealtimePricesReturn {
  const [prices, setPrices] = useState<ReadonlyMap<string, RealtimePrice>>(
    () => new Map(),
  );
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus("reconnecting");

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus("connected");
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;

        try {
          const msg: BinanceCombinedMessage = JSON.parse(
            event.data as string,
          );
          const streamName = msg.stream; // e.g. "btcusdt@ticker"
          const symbol = streamName.replace("@ticker", "");
          const coinId = BINANCE_TO_COINGECKO.get(symbol);

          if (!coinId) return;

          const nextPrice: RealtimePrice = {
            price: parseFloat(msg.data.c),
            change24h: parseFloat(msg.data.P),
            updatedAt: Date.now(),
          };

          setPrices((prev) => {
            const next = new Map(prev);
            next.set(coinId, nextPrice);
            return next;
          });
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setStatus("reconnecting");
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose will fire after onerror, which triggers reconnect
      };
    } catch {
      if (mountedRef.current) {
        setStatus("disconnected");
        scheduleReconnect();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer();

    if (!mountedRef.current) return;

    const delay = reconnectDelayRef.current;
    reconnectDelayRef.current = Math.min(
      delay * RECONNECT_BACKOFF_FACTOR,
      MAX_RECONNECT_DELAY,
    );

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [clearReconnectTimer, connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();

      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearReconnectTimer]);

  return { prices, status };
}
