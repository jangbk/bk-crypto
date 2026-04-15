"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import ko from "@/messages/ko.json";
import en from "@/messages/en.json";

export type Locale = "ko" | "en";

const STORAGE_KEY = "bk-locale";
const DEFAULT_LOCALE: Locale = "ko";

type Messages = typeof ko;

const messagesMap: Record<Locale, Messages> = { ko, en };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "ko" || stored === "en") return stored;
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string): string => {
      const messages = messagesMap[locale];
      return getNestedValue(messages as unknown as Record<string, unknown>, key);
    },
    [locale],
  );

  // Avoid hydration mismatch by rendering with default locale until mounted
  const value: I18nContextValue = {
    locale: mounted ? locale : DEFAULT_LOCALE,
    setLocale,
    t: mounted
      ? t
      : (key: string) =>
          getNestedValue(
            messagesMap[DEFAULT_LOCALE] as unknown as Record<string, unknown>,
            key,
          ),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return ctx;
}
