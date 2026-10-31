export type DecimalSeparator = "," | ".";

/** The decimal separator people expect when typing amounts in a language. */
export function separatorFor(locale: string): DecimalSeparator {
  return locale === "en" ? "." : ",";
}

/** Typing on the amount keypad: one decimal separator, two decimals, up to 999 999. */
export function press(amount: string, key: string, sep: DecimalSeparator) {
  if (key === "del") return amount.slice(0, -1);
  if (key === "," || key === ".") return amount.includes(sep) ? amount : (amount || "0") + sep;
  if (!/^\d$/.test(key)) return amount;
  const [whole, decimals] = amount.split(sep);
  if (decimals !== undefined ? decimals.length >= 2 : whole.length >= 6) return amount;
  return amount === "0" ? key : amount + key;
}

/** 1250 → "12,50", 1200 → "12": an amount as it would have been typed. */
export function centsToKeypad(cents: number, sep: DecimalSeparator) {
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(whole) : `${whole}${sep}${String(rest).padStart(2, "0")}`;
}
