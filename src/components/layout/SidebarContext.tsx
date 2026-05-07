"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "bkc:sidebar:collapsed";

interface SidebarContextValue {
  collapsed: boolean;        // 데스크톱 collapse 상태 (60px ↔ 240px)
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  mobileOpen: boolean;       // 모바일 drawer 열림 여부
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // localStorage 복원 (초기 마운트 1회)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "1") setCollapsedState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <SidebarContext.Provider
      value={{ collapsed, setCollapsed, toggleCollapsed, mobileOpen, setMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}
