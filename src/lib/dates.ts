import { INTL_LOCALE, type Locale } from "@/i18n/config";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Today's date (YYYY-MM-DD) in the given IANA timezone. */
export function todayIn(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
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
  const t = new Date(`${today}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - 1);
  if (date === t.toISOString().slice(0, 10)) return labels.yesterday;
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : INTL_LOCALE[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
