import { INTL_LOCALE, type Locale } from "@/i18n/config";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The YYYY-MM-DD date `days` days after `date` (negative goes back). */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whether a string is a real YYYY-MM-DD calendar date. */
export function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** "2026-10" for a YYYY-MM-DD date. */
export function monthOf(date: string) {
  return date.slice(0, 7);
}

export function isValidMonth(m: string | undefined): m is string {
  return !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

/** First and last day of a "YYYY-MM" month. */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(month: string, locale: Locale) {
  const [y, m] = month.split("-").map(Number);
  return capitalize(
    new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(INTL_LOCALE[locale], {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  );
}

/** "Today", "Yesterday" or "Mon 27 Oct". */
export function formatDay(
  date: string,
  today: string,
  locale: Locale,
  labels: { today: string; yesterday: string },
) {
  if (date === today) return labels.today;
  if (date === addDays(today, -1)) return labels.yesterday;
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : INTL_LOCALE[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
