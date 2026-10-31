"use client";

import Link from "next/link";
import { Repeat } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { Dict } from "@/i18n/dictionaries";
import type { Category, Profile, Transaction } from "@/lib/types";
import { MethodIcon } from "@/components/method-icon";
import { Tile } from "@/components/ui";

export function describe(tx: Transaction, t: Dict, category?: Category) {
  if (tx.type === "withdrawal") return { icon: "🏧", title: t.tx.atmWithdrawal };
  if (tx.type === "adjustment") return { icon: "🧮", title: t.tx.cashCorrection };
  return { icon: category?.icon ?? "❔", title: category?.name ?? t.tx.uncategorised };
}

export function TransactionRow({
  tx,
  category,
  member,
  showWho = true,
}: {
  tx: Transaction;
  category?: Category;
  member?: Profile;
  showWho?: boolean;
}) {
  const { t, money } = useI18n();
  const { icon, title } = describe(tx, t, category);
  const editable = tx.type !== "adjustment";

  const amount =
    tx.type === "expense"
      ? { text: `−${money(tx.amount_cents)}`, className: "text-expense" }
      : tx.type === "income"
        ? { text: `+${money(tx.amount_cents)}`, className: "text-income" }
        : // Withdrawals and corrections only move money between pockets.
          {
            text: `${tx.amount_cents < 0 ? "−" : ""}${money(Math.abs(tx.amount_cents))}`,
            className: "text-subtle",
          };

  const content = (
    <>
      <Tile className={tx.type === "income" ? "bg-income-50" : ""}>{icon}</Tile>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-ink">{tx.note || title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-subtle">
          {tx.note && <span className="truncate">{title}</span>}
          {tx.note && <span aria-hidden="true">·</span>}
          <MethodIcon method={tx.method} className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span className="shrink-0">{t.methods[tx.method]}</span>
          {showWho && member && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{member.name}</span>
            </>
          )}
          {tx.recurring_id && <Repeat className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />}
        </span>
      </span>
      <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${amount.className}`}>{amount.text}</span>
    </>
  );

  const className = "flex items-center gap-3 px-4 py-3";
  return editable ? (
    <Link href={`/tx/${tx.id}`} className={`${className} transition hover:bg-cream/60 active:bg-cream-200/60`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

/** A surface card holding rows separated by hairlines. */
export function RowList({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">
      {children}
    </div>
  );
}
