import { Suspense } from "react";
import { getBudgets, getCategories, getContext, getTransactions } from "@/lib/data";
import { formatMonth, isValidMonth, monthOf, monthRange } from "@/lib/dates";
import { getI18n } from "@/i18n/server";
import { PageHeader, Skeleton } from "@/components/ui";
import { budgetTone } from "@/lib/budget";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetEditor } from "./budget-editor";

export default async function BudgetsPage({ searchParams }: PageProps<"/[lang]/budgets">) {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.budgets.title} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Budgets searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Budgets({ searchParams }: { searchParams: PageProps<"/[lang]/budgets">["searchParams"] }) {
  const { m } = await searchParams;
  const [ctx, { t, f, money, locale }] = await Promise.all([getContext(), getI18n()]);
  const current = monthOf(ctx.today);
  const month = typeof m === "string" && isValidMonth(m) && m <= current ? m : current;
  const [categories, budgets, txs] = await Promise.all([
    getCategories(),
    getBudgets(),
    getTransactions(monthRange(month)),
  ]);

  const spent = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type === "expense" && tx.category_id) {
      spent.set(tx.category_id, (spent.get(tx.category_id) ?? 0) + tx.amount_cents);
    }
  }
  const limits = new Map(budgets.map((b) => [b.category_id, b.monthly_limit_cents]));
  const expenseCats = categories.filter((c) => c.kind === "expense" && (!c.archived || limits.has(c.id)));
  // Budgeted categories first, so the ones being tracked stay together.
  const sorted = [...expenseCats.filter((c) => limits.has(c.id)), ...expenseCats.filter((c) => !limits.has(c.id))];

  const totalLimit = budgets.reduce((s, b) => s + b.monthly_limit_cents, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spent.get(b.category_id) ?? 0), 0);
  const ratio = totalLimit > 0 ? totalSpent / totalLimit : 0;

  return (
    <div className="pb-4">
      <MonthSwitcher month={month} current={current} basePath="/budgets" />
      <section className="mt-3 rounded-[24px] border border-line bg-surface p-6">
        <p className="text-sm text-subtle">{f(t.budgets.summary, { month: formatMonth(month, locale) })}</p>
        <p className="mt-2 font-serif text-[40px] font-medium leading-none tracking-tight tabular-nums">
          {money(totalSpent)}
        </p>
        <p className="mt-1 text-sm text-subtle">{f(t.budgets.of, { amount: money(totalLimit) })}</p>
        {totalLimit > 0 && (
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-cream-300/70">
            <div
              className={`h-full rounded-full ${budgetTone(ratio).bar}`}
              style={{ width: `${Math.min(ratio, 1) * 100}%` }}
            />
          </div>
        )}
        <p className="mt-4 text-[13px] leading-relaxed text-subtle">{t.budgets.explain}</p>
      </section>

      <div className="mt-6 divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">
        {sorted.map((c) => (
          <BudgetEditor key={c.id} category={c} spent={spent.get(c.id) ?? 0} limit={limits.get(c.id) ?? null} />
        ))}
      </div>
    </div>
  );
}
