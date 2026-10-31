/** One CSV line; quotes fields that contain the delimiter, quotes or line breaks. */
export function csvLine(fields: (string | number | null | undefined)[], delimiter: string) {
  return fields
    .map((field) => {
      const text = field == null ? "" : String(field);
      return text.includes(delimiter) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(delimiter);
}

/** Cents as a plain number Excel can sum: "-12.50" or, for Bulgarian Excel, "-12,50". */
export function csvAmount(cents: number, decimal: "." | ",") {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}${decimal}${String(abs % 100).padStart(2, "0")}`;
}
