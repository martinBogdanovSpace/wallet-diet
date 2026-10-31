import { Suspense } from "react";
import { QuickAddButton } from "@/components/quick-add";
import { Landmark, Wallet } from "lucide-react";
import { getCashBalance, getCategories, getContext, getTransactions } from "@/lib/data";
import { monthOf, monthRange } from "@/lib/dates";
import { getI18n } from "@/i18n/server";
import { PageHeader, Section, Skeleton } from "@/components/ui";
import { RowList, TransactionRow } from "@/components/transaction-row";
import { CashCount } from "./cash-count";

export default async function CashPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.cash.title} back={{ href: "/", label: t.nav.home }} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Cash />
      </Suspense>
    </>
  );
}

async function Cash() {
  const [ctx, { t, money }] = await Promise.all([getContext(), getI18n()]);
  const [balance, txs, categories] = await Promise.all([
    getCashBalance(),
    getTransactions(monthRange(monthOf(ctx.today))),
    getCategories(),
  ]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const memberById = new Map(ctx.members.map((p) => [p.id, p]));
  const cashTxs = txs.filter((tx) => tx.method === "cash" || tx.type === "withdrawal");

  return (
    <div className="pb-4">
      <section className="rounded-[24px] border border-line bg-surface p-6">
        <div className="flex items-center gap-2 text-sm text-subtle">
          <Wallet className="h-4 w-4" strokeWidth={1.75} />
          {t.cash.onHand}
        </div>
        <p
          className={`mt-2 font-serif text-[44px] font-medium leading-none tracking-tight tabular-nums ${
            balance < 0 ? "text-expense" : ""
          }`}
        >
          {money(balance)}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-subtle">{t.cash.explain}</p>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <QuickAddButton
          type="withdrawal"
          className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4 text-left transition hover:bg-cream/60"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-pine-50 text-pine">
            <Landmark className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-[15px] font-semibold">{t.cash.atm}</span>
            <span className="block text-[13px] text-subtle">{t.cash.atmSub}</span>
          </span>
        </QuickAddButton>
        <CashCount balance={balance} />
      </div>

      <Section title={t.cash.movements}>
        {cashTxs.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-line-strong px-6 py-10 text-center text-subtle">
            {t.cash.empty}
          </div>
        ) : (
          <RowList>
            {cashTxs.map((tx) => (
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
