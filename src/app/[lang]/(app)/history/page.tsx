import { Suspense } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getCategories, getContext, getTransactions } from "@/lib/data";
import { formatDay, isValidMonth, monthOf, monthRange } from "@/lib/dates";
import { getI18n } from "@/i18n/server";
import { PageHeader, Skeleton } from "@/components/ui";
import { MonthSwitcher } from "@/components/month-switcher";
import { RowList, TransactionRow } from "@/components/transaction-row";
import { HistoryFilters } from "./filters";
import type { Transaction } from "@/lib/types";

export default async function HistoryPage({ searchParams }: PageProps<"/[lang]/history">) {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.history.title} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <History searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function str(v: string | string[] | undefined) {
  return typeof v === "string" && v ? v : undefined;
}

async function History({ searchParams }: { searchParams: PageProps<"/[lang]/history">["searchParams"] }) {
  const sp = await searchParams;
  const [ctx, { t, f, money, locale }] = await Promise.all([getContext(), getI18n()]);
  const current = monthOf(ctx.today);
  const m = str(sp.m);
  const month = isValidMonth(m) && m <= current ? m : current;
  const type = str(sp.type);
  const filters = {
    type: type === "income" || type === "expense" ? (type as "income" | "expense") : undefined,
    who: str(sp.who),
    method: str(sp.method),
    cat: str(sp.cat),
    q: str(sp.q),
  };

  const [all, categories] = await Promise.all([getTransactions(monthRange(month)), getCategories()]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const memberById = new Map(ctx.members.map((p) => [p.id, p]));

  // Search looks at the note and the category name, ignoring case.
  const needle = filters.q?.toLocaleLowerCase(locale);
  const matches = (tx: Transaction) => {
    if (!needle) return true;
    const category = tx.category_id ? catById.get(tx.category_id)?.name : undefined;
    return [tx.note, category].some((text) => text?.toLocaleLowerCase(locale).includes(needle));
  };

  const txs = all.filter(
    (tx) =>
      (!filters.type || tx.type === filters.type) &&
      (!filters.who || tx.user_id === filters.who) &&
      (!filters.method || tx.method === filters.method) &&
      (!filters.cat || tx.category_id === filters.cat) &&
      matches(tx),
  );

  const days = new Map<string, Transaction[]>();
  for (const tx of txs) days.set(tx.occurred_on, [...(days.get(tx.occurred_on) ?? []), tx]);

  const sum = (list: Transaction[], kind: "income" | "expense") =>
    list.filter((tx) => tx.type === kind).reduce((s, tx) => s + tx.amount_cents, 0);
  const spent = sum(txs, "expense");
  const earned = sum(txs, "income");

  // A type filter or a category narrows the view to one side; then only that side's totals are shown.
  const view: "income" | "expense" | "all" =
    filters.type ?? (filters.cat ? (catById.get(filters.cat)?.kind ?? "all") : "all");
  const showIncome = view !== "expense";
  const showExpense = view !== "income";

  return (
    <div className="pb-4">
      <MonthSwitcher month={month} current={current} basePath="/history" params={{ ...filters }} />
      <HistoryFilters
        members={ctx.members}
        categories={categories.filter((c) => !c.archived || c.id === filters.cat)}
        values={filters}
        count={txs.length}
      />

      <div className={`mt-5 grid gap-2 ${showIncome && showExpense ? "grid-cols-2" : "grid-cols-1"}`}>
        {showIncome && (
          <div className="rounded-[16px] bg-income-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-income">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              {t.dashboard.income}
            </p>
            <p className="text-lg font-semibold tabular-nums text-income">+{money(earned)}</p>
          </div>
        )}
        {showExpense && (
          <div className="rounded-[16px] bg-expense-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-expense">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {t.dashboard.expenses}
            </p>
            <p className="text-lg font-semibold tabular-nums text-expense">−{money(spent)}</p>
          </div>
        )}
      </div>

      {days.size === 0 ? (
        <div className="mt-6 rounded-[20px] border border-dashed border-line-strong px-6 py-12 text-center text-subtle">
          {t.history.empty}
        </div>
      ) : (
        <>
          <p className="mt-6 text-[13px] text-subtle">{f(t.history.entries, { count: txs.length })}</p>
          {[...days.entries()].map(([day, list]) => {
            const dayIn = showIncome ? sum(list, "income") : 0;
            const dayOut = showExpense ? sum(list, "expense") : 0;
            return (
              <section key={day} className="mt-5">
                <h2 className="mb-2 flex items-baseline justify-between gap-3 px-1">
                  <span className="font-serif text-[17px] font-medium">
                    {formatDay(day, ctx.today, locale, t.common)}
                  </span>
                  <span className="flex gap-3 text-[13px] font-medium tabular-nums">
                    {dayIn > 0 && <span className="text-income">+{money(dayIn)}</span>}
                    {dayOut > 0 && <span className="text-expense">−{money(dayOut)}</span>}
                  </span>
                </h2>
                <RowList>
                  {list.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      category={tx.category_id ? catById.get(tx.category_id) : undefined}
                      member={memberById.get(tx.user_id)}
                      showWho={ctx.members.length > 1}
                    />
                  ))}
                </RowList>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
