import { INTL_LOCALE, type Locale } from "@/i18n/config";

const formatters = new Map<Locale, Intl.NumberFormat>();

/** "€12.50" in English, "12,50 €" in Bulgarian. */
export function formatEUR(cents: number, locale: Locale = "en") {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency: "EUR" });
    formatters.set(locale, formatter);
  }
  return formatter.format(cents / 100);
}

/** Parses user input like "12", "12.5", "12,50" or "1 234,56" into cents. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(/€/g, "");
  if (!cleaned) return null;
  // Treat the last "," or "." as the decimal separator, drop the others.
  const lastSep = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  const normalized =
    lastSep === -1
      ? cleaned
      : cleaned.slice(0, lastSep).replace(/[.,]/g, "") + "." + cleaned.slice(lastSep + 1);
  if (!/^-?\d+(\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}
