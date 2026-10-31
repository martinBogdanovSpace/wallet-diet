import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  getBalanceBefore,
  getBudgets,
  getCashBalance,
  getCategories,
  getContext,
  getTransactions,
} from "@/lib/data";
import { isValidMonth, monthOf, monthRange, shiftMonth } from "@/lib/dates";
import { getI18n } from "@/i18n/server";
import { Avatar, AvatarStack, Section, Skeleton, TextLink, Tile } from "@/components/ui";
import { MonthSwitcher } from "@/components/month-switcher";
import { RowList, TransactionRow } from "@/components/transaction-row";
import { BudgetBar } from "@/components/budget-bar";
import type { Transaction } from "@/lib/types";

const CHART_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-6",
];

export default function HomePage({ searchParams }: PageProps<"/[lang]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

function sumBy(txs: Transaction[], type: "income" | "expense") {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount_cents, 0);
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/[lang]">["searchParams"] }) {
  const { m } = await searchParams;
  const [ctx, { t, f, money }] = await Promise.all([getContext(), getI18n()]);
  const current = monthOf(ctx.today);
  const month = typeof m === "string" && isValidMonth(m) && m <= current ? m : current;
  const isCurrent = month === current;
  const monthQuery = isCurrent ? "" : `m=${month}`;

  // This month so far is compared with last month up to the same day, not with all of it.
  const prevRange = monthRange(shiftMonth(month, -1));
  if (isCurrent) {
    const sameDay = `${shiftMonth(month, -1)}-${ctx.today.slice(8, 10)}`;
    if (sameDay < prevRange.end) prevRange.end = sameDay;
  }

  const [txs, prevTxs, categories, budgets, cash, carried] = await Promise.all([
    getTransactions(monthRange(month)),
    getTransactions(prevRange),
    getCategories(),
    getBudgets(),
    getCashBalance(),
    getBalanceBefore(`${month}-01`),
  ]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const memberById = new Map(ctx.members.map((p) => [p.id, p]));

  const income = sumBy(txs, "income");
  const expenses = sumBy(txs, "expense");
  const prevExpenses = sumBy(prevTxs, "expense");
  const balance = income - expenses;
  // Money left over from earlier months is added on top, and shown as its own line.
  const showCarried = carried !== null && carried !== 0;
  const total = showCarried ? carried + balance : balance;
  // Below zero the label says so, and the amount is shown without a minus.
  const short = total < 0;
  const label = showCarried
    ? isCurrent
      ? short ? t.dashboard.shortBy : t.dashboard.available
      : short ? t.dashboard.shortMonthEnd : t.dashboard.monthEnd
    : isCurrent
      ? short ? t.dashboard.overspentThisMonth : t.dashboard.leftThisMonth
      : short ? t.dashboard.overspent : t.dashboard.balance;
  const signed = (cents: number) => `${cents < 0 ? "−" : "+"}${money(Math.abs(cents))}`;
  const expenseDiff = expenses - prevExpenses;

  const byCategory = new Map<string, number>();
  const byMember = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type !== "expense") continue;
    const key = tx.category_id ?? "none";
    byCategory.set(key, (byCategory.get(key) ?? 0) + tx.amount_cents);
    byMember.set(tx.user_id, (byMember.get(tx.user_id) ?? 0) + tx.amount_cents);
  }
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  // The chart shows the six biggest categories; the rest share one grey segment.
  const top = categoryRows.slice(0, CHART_COLORS.length);
  const restTotal = categoryRows.slice(CHART_COLORS.length).reduce((s, [, c]) => s + c, 0);

  const budgetRows = budgets
    .map((b) => ({ ...b, category: catById.get(b.category_id), spent: byCategory.get(b.category_id) ?? 0 }))
    .filter((b) => b.category)
    .sort((a, b) => b.spent / b.monthly_limit_cents - a.spent / a.monthly_limit_cents);

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between gap-3 pt-5 md:pt-10">
        <h1 className="sr-only">{f(t.dashboard.hi, { name: ctx.me.name })}</h1>
        <MonthSwitcher month={month} current={current} basePath="/" variant="pill" />
        <AvatarStack names={ctx.members.map((p) => p.name)} />
      </header>

      {/* Balance */}
      <section className="mt-4 overflow-hidden rounded-[28px] bg-pine p-5 text-on-pine sm:p-6 shadow-lg shadow-pine/15">
        <p className="text-sm text-on-pine/75">
          {label}
        </p>
        <p className="mt-1 font-serif text-[44px] font-medium leading-none tracking-tight tabular-nums">
          {money(Math.abs(total))}
        </p>
        {showCarried && (
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-on-pine/80">
            <span>
              {t.dashboard.thisMonth} <span className="font-semibold tabular-nums">{signed(balance)}</span>
            </span>
            <span>
              {t.dashboard.carried} <span className="font-semibold tabular-nums">{signed(carried)}</span>
            </span>
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 divide-x divide-on-pine/15 rounded-[16px] bg-on-pine/10">
          <TotalLink
            href={`/history?type=income${monthQuery ? `&${monthQuery}` : ""}`}
            Icon={ArrowDownLeft}
            label={t.dashboard.income}
            amount={`+${money(income)}`}
            className="rounded-l-[16px]"
          />
          <TotalLink
            href={`/history?type=expense${monthQuery ? `&${monthQuery}` : ""}`}
            Icon={ArrowUpRight}
            label={t.dashboard.expenses}
            amount={`−${money(expenses)}`}
            className="rounded-r-[16px]"
          />
        </div>
        {prevExpenses > 0 && expenseDiff !== 0 && (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-on-pine/80">
            {expenseDiff > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>
              {f(
                isCurrent
                  ? expenseDiff > 0
                    ? t.dashboard.moreSoFar
                    : t.dashboard.lessSoFar
                  : expenseDiff > 0
                    ? t.dashboard.moreSpent
                    : t.dashboard.lessSpent,
                { amount: money(Math.abs(expenseDiff)) },
              )}
            </span>
          </p>
        )}
      </section>

      {/* Cash wallet */}
      <Link
        href="/cash"
        className="mt-3 flex items-center gap-3.5 rounded-[20px] border border-line bg-surface p-4 transition hover:bg-cream/60"
      >
        <Tile className="text-pine">
          <Wallet className="h-5 w-5" strokeWidth={1.75} />
        </Tile>
        <span className="flex-1">
          <span className="block text-[13px] text-subtle">{t.dashboard.cashOnHand}</span>
          <span className={`block text-lg font-semibold tabular-nums ${cash < 0 ? "text-expense" : ""}`}>
            {money(cash)}
          </span>
        </span>
        <span className="flex h-10 items-center rounded-full border border-line-strong px-4 text-sm font-semibold text-pine">
          {t.dashboard.count}
        </span>
      </Link>

      {budgetRows.length > 0 && (
        <Section title={t.dashboard.budgets} action={<TextLink href="/budgets">{t.common.edit}</TextLink>}>
          <div className="space-y-5 rounded-[20px] border border-line bg-surface p-5">
            {budgetRows.slice(0, 4).map((b) => (
              <BudgetBar
                key={b.category_id}
                icon={b.category!.icon}
                label={b.category!.name}
                spent={b.spent}
                limit={b.monthly_limit_cents}
              />
            ))}
          </div>
        </Section>
      )}

      {categoryRows.length > 0 && (
        <Section title={t.dashboard.byCategory}>
          <div className="rounded-[20px] border border-line bg-surface p-5">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
              {top.map(([id, cents], i) => (
                <span
                  key={id}
                  className={CHART_COLORS[i]}
                  style={{ width: `${(cents / expenses) * 100}%` }}
                />
              ))}
              {restTotal > 0 && <span className="bg-chart-7" style={{ width: `${(restTotal / expenses) * 100}%` }} />}
            </div>
            <ul className="mt-4 space-y-1">
              {categoryRows.map(([id, cents], i) => {
                const c = catById.get(id);
                return (
                  <li key={id}>
                    <Link
                      href={`/history?cat=${id}${monthQuery ? `&${monthQuery}` : ""}`}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-cream"
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${CHART_COLORS[i] ?? "bg-chart-7"}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-[15px]">
                        <span className="mr-1.5">{c?.icon ?? "❔"}</span>
                        {c?.name ?? t.tx.uncategorised}
                      </span>
                      <span className="text-[13px] tabular-nums text-faint">
                        {Math.round((cents / expenses) * 100)}%
                      </span>
                      <span className="w-24 text-right text-[15px] font-semibold tabular-nums">{money(cents)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>
      )}

      {ctx.members.length > 1 && expenses > 0 && (
        <Section title={t.dashboard.whoPaid}>
          <div className="space-y-4 rounded-[20px] border border-line bg-surface p-5">
            {ctx.members.map((p) => {
              const paid = byMember.get(p.id) ?? 0;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-[15px]">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="font-semibold tabular-nums">{money(paid)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-300/70">
                      <div className="h-full rounded-full bg-sage" style={{ width: `${(paid / expenses) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section
        title={t.dashboard.recent}
        action={
          txs.length > 0 && (
            <TextLink href={monthQuery ? `/history?${monthQuery}` : "/history"}>{t.common.seeAll}</TextLink>
          )
        }
      >
        {txs.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-line-strong px-6 py-10 text-center">
            <p className="font-serif text-lg">{t.dashboard.emptyTitle}</p>
            <p className="mt-1 text-sm text-subtle">{t.dashboard.empty}</p>
          </div>
        ) : (
          <RowList>
            {txs.slice(0, 6).map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                category={tx.category_id ? catById.get(tx.category_id) : undefined}
                member={memberById.get(tx.user_id)}
                showWho={ctx.members.length > 1}
              />
            ))}
          </RowList>
        )}
      </Section>
    </div>
  );
}

/** Income or expenses on the balance card: label on top, so the amount gets the full width. */
function TotalLink({
  href,
  Icon,
  label,
  amount,
  className,
}: {
  href: string;
  Icon: LucideIcon;
  label: string;
  amount: string;
  className: string;
}) {
  return (
    <Link href={href} className={`block min-w-0 px-3 py-3.5 transition hover:bg-on-pine/10 ${className}`}>
      <span className="flex items-center gap-1.5 text-xs text-on-pine/75">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-on-pine/50" />
      </span>
      <span className="mt-1 block whitespace-nowrap text-[clamp(14px,4.4vw,17px)] font-semibold tabular-nums">
        {amount}
      </span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 pt-5 md:pt-10">
      <Skeleton className="h-11 w-52 rounded-full" />
      <Skeleton className="h-52 rounded-[28px]" />
      <Skeleton className="h-20" />
      <Skeleton className="h-64" />
    </div>
  );
}
