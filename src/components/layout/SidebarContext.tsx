"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "bkc:sidebar:hidden";

interface SidebarContextValue {
  hidden: boolean;           // 데스크톱 사이드바 완전 숨김 여부 (true = 0px, false = 240px)
  setHidden: (v: boolean) => void;
  toggleHidden: () => void;
  mobileOpen: boolean;       // 모바일 drawer 열림 여부
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [hidden, setHiddenState] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // localStorage 복원 (초기 마운트 1회)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "1") setHiddenState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setHidden = (v: boolean) => {
    setHiddenState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const toggleHidden = () => setHidden(!hidden);

  return (
    <SidebarContext.Provider
      value={{ hidden, setHidden, toggleHidden, mobileOpen, setMobileOpen }}
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
