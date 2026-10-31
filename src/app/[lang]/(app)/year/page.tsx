import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getBalanceBefore, getCategories, getContext, getYearSummary } from "@/lib/data";
import { formatMonth, monthOf } from "@/lib/dates";
import { INTL_LOCALE } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { PageHeader, Section, Skeleton } from "@/components/ui";

export default async function YearPage({ searchParams }: PageProps<"/[lang]/year">) {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.year.title} back={{ href: "/", label: t.nav.home }} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Year searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Year({ searchParams }: { searchParams: PageProps<"/[lang]/year">["searchParams"] }) {
  const { y } = await searchParams;
  const [ctx, { t, f, money, locale }] = await Promise.all([getContext(), getI18n()]);
  const thisYear = Number(ctx.today.slice(0, 4));
  const asked = typeof y === "string" && /^\d{4}$/.test(y) ? Number(y) : thisYear;
  const year = Math.min(Math.max(asked, 2000), thisYear);

  const [summary, categories, carried] = await Promise.all([
    getYearSummary(year),
    getCategories(),
    getBalanceBefore(`${year}-01-01`),
  ]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const currentMonth = monthOf(ctx.today);
  const byMonth = new Map(summary.months.map((m) => [m.month, m]));

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const totals = byMonth.get(month);
    const income = Number(totals?.income ?? 0);
    const expenses = Number(totals?.expenses ?? 0);
    return {
      month,
      income,
      expenses,
      left: income - expenses,
      hasEntries: !!totals,
      future: month > currentMonth,
      // The first letters of the full name: a short Bulgarian month on its own comes out as "01".
      label: new Date(Date.UTC(year, i, 1))
        .toLocaleDateString(INTL_LOCALE[locale], { month: "long", timeZone: "UTC" })
        .slice(0, 3),
    };
  });
  const active = months.filter((m) => m.hasEntries);
  const income = months.reduce((s, m) => s + m.income, 0);
  const expenses = months.reduce((s, m) => s + m.expenses, 0);
  const saved = income - expenses;
  const perMonth = active.length ? Math.round(saved / active.length) : 0;
  const best = active.length > 1 ? active.reduce((a, b) => (b.left > a.left ? b : a)) : undefined;
  const worst = active.length > 1 ? active.reduce((a, b) => (b.left < a.left ? b : a)) : undefined;

  // Bars grow up for money left over and down for overspending, scaled to the biggest month.
  const scale = Math.max(1, ...months.map((m) => Math.abs(m.left)));
  const anyNegative = months.some((m) => m.left < 0);
  const upHeight = anyNegative ? 72 : 128;
  const downHeight = anyNegative ? 56 : 0;
  const signed = (cents: number) => `${cents < 0 ? "−" : "+"}${money(Math.abs(cents))}`;

  return (
    <div className="pb-4">
      <nav className="flex items-center justify-between rounded-full border border-line bg-surface p-1">
        <Link href={`/year?y=${year - 1}`} aria-label={t.year.prevYear} className={arrowClass}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="font-serif text-[17px] font-medium tabular-nums">{year}</span>
        {year < thisYear ? (
          <Link
            href={year + 1 === thisYear ? "/year" : `/year?y=${year + 1}`}
            aria-label={t.year.nextYear}
            className={arrowClass}
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${arrowClass} pointer-events-none opacity-25`}>
            <ChevronRight className="h-5 w-5" />
          </span>
        )}
      </nav>

      {active.length === 0 ? (
        <div className="mt-5 rounded-[20px] border border-dashed border-line-strong px-6 py-12 text-center text-subtle">
          {f(t.year.empty, { year })}
        </div>
      ) : (
        <>
          <section className="mt-4 rounded-[28px] bg-pine p-5 text-on-pine shadow-lg shadow-pine/15 sm:p-6">
            <p className="text-sm text-on-pine/75">{f(saved < 0 ? t.year.overspent : t.year.saved, { year })}</p>
            <p className="mt-1 font-serif text-[44px] font-medium leading-none tracking-tight tabular-nums">
              {money(Math.abs(saved))}
            </p>
            <p className="mt-2 text-[13px] text-on-pine/80">{f(t.year.perMonth, { amount: signed(perMonth) })}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-on-pine/80">
              <span>
                {t.dashboard.income} <span className="font-semibold tabular-nums">+{money(income)}</span>
              </span>
              <span>
                {t.dashboard.expenses} <span className="font-semibold tabular-nums">−{money(expenses)}</span>
              </span>
              {carried !== null && carried !== 0 && (
                <span>
                  {t.year.carried} <span className="font-semibold tabular-nums">{signed(carried)}</span>
                </span>
              )}
            </div>
          </section>

          <Section title={t.year.byMonth}>
            <div className="rounded-[20px] border border-line bg-surface px-3 pb-3 pt-5">
              <div className="grid grid-cols-12 gap-1">
                {months.map((m) => {
                  const bar = (Math.abs(m.left) / scale) * (m.left < 0 ? downHeight : upHeight);
                  const column = (
                    <>
                      <span className="flex items-end justify-center" style={{ height: upHeight }}>
                        {m.left > 0 && (
                          <span className="w-full max-w-5 rounded-t-[5px] bg-income" style={{ height: Math.max(bar, 3) }} />
                        )}
                      </span>
                      <span className="block h-px bg-line-strong" />
                      {anyNegative && (
                        <span className="flex items-start justify-center" style={{ height: downHeight }}>
                          {m.left < 0 && (
                            <span
                              className="w-full max-w-5 rounded-b-[5px] bg-terracotta"
                              style={{ height: Math.max(bar, 3) }}
                            />
                          )}
                        </span>
                      )}
                      <span
                        className={`mt-1.5 block text-center text-[10px] leading-none ${
                          m.month === currentMonth ? "font-semibold text-ink" : "text-subtle"
                        }`}
                      >
                        {m.label}
                      </span>
                    </>
                  );
                  return m.future ? (
                    <div key={m.month} className="opacity-40">
                      {column}
                    </div>
                  ) : (
                    <Link
                      key={m.month}
                      href={m.month === currentMonth ? "/" : `/?m=${m.month}`}
                      aria-label={`${formatMonth(m.month, locale)}: ${signed(m.left)}`}
                      className="rounded-[6px] transition hover:bg-cream-200/60"
                    >
                      {column}
                    </Link>
                  );
                })}
              </div>
            </div>
          </Section>

          {best && worst && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { label: t.year.best, m: best },
                { label: t.year.worst, m: worst },
              ].map(({ label, m }) => (
                <Link
                  key={label}
                  href={m.month === currentMonth ? "/" : `/?m=${m.month}`}
                  className="rounded-[20px] border border-line bg-surface p-4 transition hover:bg-cream/60"
                >
                  <span className="block text-[13px] text-subtle">{label}</span>
                  <span className="mt-1 block text-[15px] font-semibold">{formatMonth(m.month, locale)}</span>
                  <span
                    className={`block text-[15px] font-semibold tabular-nums ${m.left < 0 ? "text-expense" : "text-income"}`}
                  >
                    {signed(m.left)}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {summary.categories.length > 0 && (
            <Section title={t.year.byCategory}>
              <ul className="space-y-1 rounded-[20px] border border-line bg-surface p-3">
                {summary.categories.map(({ category_id, expenses: cents }) => {
                  const c = category_id ? catById.get(category_id) : undefined;
                  const share = expenses ? Number(cents) / expenses : 0;
                  return (
                    <li key={category_id ?? "none"} className="px-2 py-2">
                      <div className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate text-[15px]">
                          <span className="mr-1.5">{c?.icon ?? "❔"}</span>
                          {c?.name ?? t.tx.uncategorised}
                        </span>
                        <span className="text-[13px] tabular-nums text-faint">{Math.round(share * 100)}%</span>
                        <span className="w-24 text-right text-[15px] font-semibold tabular-nums">
                          {money(Number(cents))}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-300/70">
                        <div className="h-full rounded-full bg-sage" style={{ width: `${share * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

const arrowClass = "flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-cream-200";
