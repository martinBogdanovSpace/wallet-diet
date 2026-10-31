"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatMonth, shiftMonth } from "@/lib/dates";

/** ‹ October 2026 › links that keep the other search params. */
export function MonthSwitcher({
  month,
  current,
  basePath,
  params = {},
  variant = "bar",
}: {
  month: string;
  current: string;
  basePath: string;
  params?: Record<string, string | undefined>;
  /** "bar" spans the width; "pill" is the compact oatmeal pill for headers. */
  variant?: "bar" | "pill";
}) {
  const { locale } = useI18n();
  const href = (m: string) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "m") search.set(k, v);
    if (m !== current) search.set("m", m);
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const pill = variant === "pill";
  const arrow = `flex items-center justify-center rounded-full text-ink-soft transition ${
    pill ? "h-9 w-9 hover:bg-cream-300" : "h-10 w-10 hover:bg-cream-200"
  }`;

  return (
    <div
      className={`flex items-center gap-1 rounded-full p-1 ${
        pill ? "bg-cream-200" : "justify-between border border-line bg-surface"
      }`}
    >
      <Link href={href(shiftMonth(month, -1))} className={arrow} aria-label="‹">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <span className={pill ? "px-1 text-sm font-semibold" : "font-serif text-[17px] font-medium"}>
        {formatMonth(month, locale)}
      </span>
      {month < current ? (
        <Link href={href(shiftMonth(month, 1))} className={arrow} aria-label="›">
          <ChevronRight className="h-5 w-5" />
        </Link>
      ) : (
        <span className={`${arrow} pointer-events-none opacity-25`}>
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}
