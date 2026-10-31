import { lang } from "next/root-params";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, fmt, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { DICTIONARIES } from "./dictionaries";
import { formatEUR } from "@/lib/money";

function helpers(locale: Locale) {
  return {
    locale,
    t: DICTIONARIES[locale],
    f: fmt,
    money: (cents: number) => formatEUR(cents, locale),
  };
}

/** For Server Components: the locale comes from the [lang] root segment. */
export async function getI18n() {
  const value = await lang();
  return helpers(isLocale(value) ? value : DEFAULT_LOCALE);
}

/** For Server Actions, which can't read root params: the locale comes from the cookie. */
export async function getActionI18n() {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return helpers(isLocale(value) ? value : DEFAULT_LOCALE);
}
