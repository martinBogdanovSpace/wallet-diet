"use client";

import { createContext, useContext, type ReactNode } from "react";
import { fmt, LOCALE_COOKIE, type Locale } from "./config";
import { DICTIONARIES } from "./dictionaries";
import { formatEUR } from "@/lib/money";

const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: DICTIONARIES[locale],
    f: fmt,
    money: (cents: number) => formatEUR(cents, locale),
  };
}

/** Saves the choice for a year and reloads so every page renders in the new language. */
export function switchLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
