"use client";

import { useTranslation } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
      className="rounded-lg px-2 py-1.5 text-xs font-bold hover:bg-muted transition-colors text-foreground"
      aria-label={locale === "ko" ? "Switch to English" : "한국어로 전환"}
    >
      {locale === "ko" ? "EN" : "한"}
    </button>
  );
}
