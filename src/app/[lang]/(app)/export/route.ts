import { getContext } from "@/lib/data";
import { csvAmount, csvLine } from "@/lib/csv";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { categoryName, DICTIONARIES } from "@/i18n/dictionaries";
import type { Transaction } from "@/lib/types";

const PAGE = 1000;

/** Every entry of the household as a CSV file, newest first. */
export async function GET(_: Request, ctx: RouteContext<"/[lang]/export">) {
  const { lang } = await ctx.params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = DICTIONARIES[locale];
  const { supabase, household, members, today } = await getContext();

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("household_id", household.id);
  if (catError) return new Response(catError.message, { status: 500 });
  const catName = new Map(categories.map((c) => [c.id as string, categoryName(c.name, locale)]));
  const memberName = new Map(members.map((m) => [m.id, m.name]));

  // The API returns at most 1000 rows per request, so read it page by page.
  const rows: Transaction[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, user_id, type, amount_cents, category_id, method, occurred_on, note, recurring_id, created_at")
      .eq("household_id", household.id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return new Response(error.message, { status: 500 });
    rows.push(...(data as Transaction[]));
    if (data.length < PAGE) break;
  }

  // Bulgarian Excel expects a decimal comma, and so a semicolon between fields.
  const decimal = locale === "en" ? "." : ",";
  const delimiter = locale === "en" ? "," : ";";
  const typeName = {
    expense: t.tx.expense,
    income: t.tx.income,
    withdrawal: t.tx.atmWithdrawal,
    adjustment: t.csv.adjustment,
  };
  const lines = [
    csvLine([t.csv.date, t.csv.type, t.csv.amount, t.csv.category, t.csv.method, t.csv.who, t.csv.note], delimiter),
    ...rows.map((tx) =>
      csvLine(
        [
          tx.occurred_on,
          typeName[tx.type],
          csvAmount(tx.type === "expense" ? -tx.amount_cents : tx.amount_cents, decimal),
          tx.category_id ? catName.get(tx.category_id) : "",
          t.methods[tx.method],
          memberName.get(tx.user_id) ?? "",
          tx.note,
        ],
        delimiter,
      ),
    ),
  ];

  // The byte order mark makes Excel read the file as UTF-8, so Cyrillic shows correctly.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t.csv.file}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
