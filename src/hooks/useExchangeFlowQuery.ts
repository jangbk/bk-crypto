"use client";

import { useQuery } from "@tanstack/react-query";
import type { WhaleFlowApiResponse } from "@/components/exchange-flow/types";

async function fetchWhaleFlow(): Promise<WhaleFlowApiResponse> {
  const res = await fetch("/api/crypto/whale-flow");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function useExchangeFlowQuery() {
  return useQuery({
    queryKey: ["crypto", "exchange-flow"],
    queryFn: fetchWhaleFlow,
    refetchInterval: 60_000,
  });
}
