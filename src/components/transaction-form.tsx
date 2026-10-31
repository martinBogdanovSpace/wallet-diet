"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, PenLine, Trash2 } from "lucide-react";
import { deleteTransaction, saveTransaction, type TxInput } from "@/app/actions/transactions";
import { centsToInput, parseAmountToCents } from "@/lib/money";
import { useI18n } from "@/i18n/client";
import type { Category, Method, Transaction } from "@/lib/types";
import { MAX_NOTE } from "@/lib/limits";
import { addDays } from "@/lib/dates";
import { MethodIcon } from "@/components/method-icon";
import { Button, ErrorText, Label, Segmented, fieldClass } from "@/components/ui";

type FormType = TxInput["type"];

export function TransactionForm({
  categories,
  today,
  initial,
  defaultType = "expense",
}: {
  categories: Category[];
  today: string;
  initial?: Transaction;
  defaultType?: FormType;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [type, setType] = useState<FormType>(
    initial && initial.type !== "adjustment" ? initial.type : defaultType,
  );
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amount_cents) : "");
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category_id ?? null);
  const [method, setMethod] = useState<Method>(initial?.method ?? "card");
  const [date, setDate] = useState(initial?.occurred_on ?? today);
  const [note, setNote] = useState(initial?.note ?? "");

  const yesterday = addDays(today, -1);
  const visible = categories.filter((c) => c.kind === type && (!c.archived || c.id === categoryId));

  function reset() {
    setAmount("");
    setCategoryId(null);
    setDate(today);
    setNote("");
    setError(undefined);
  }

  function changeType(next: FormType) {
    setType(next);
    if (next !== type) setCategoryId(null);
    if (next === "income" && method === "card") setMethod("transfer");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseAmountToCents(amount);
    if (!cents || cents <= 0) return setError(t.errors.enterAmount);
    if (type !== "withdrawal" && !categoryId) return setError(t.errors.pickCategory);

    startTransition(async () => {
      const result = await saveTransaction({
        id: initial?.id,
        type,
        amount_cents: cents,
        category_id: categoryId,
        method,
        occurred_on: date,
        note,
      });
      if (result.error) return setError(result.error);
      // The page stays mounted after navigation, so clear it for the next entry.
      if (!initial) reset();
      router.push(initial ? "/history" : "/");
    });
  }

  function remove() {
    if (!initial) return;
    if (!confirmingDelete) return setConfirmingDelete(true);
    startTransition(async () => {
      const result = await deleteTransaction(initial.id);
      if (result.error) return setError(result.error);
      router.push("/history");
    });
  }

  const accent = type === "income" ? "text-income" : "text-ink";

  return (
    <form onSubmit={submit}>
      <Segmented
        value={type}
        onChange={changeType}
        options={[
          { value: "expense", label: t.tx.expense },
          { value: "income", label: t.tx.income },
          { value: "withdrawal", label: t.tx.atm },
        ]}
      />

      {/* Amount */}
      <label className="mt-6 block text-center">
        <span className="sr-only">{t.tx.amount}</span>
        <span className={`inline-flex items-baseline justify-center gap-1 font-serif ${accent}`}>
          <span className="text-3xl text-faint">€</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            autoFocus={!initial}
            size={Math.max(4, amount.length + 1)}
            className="min-w-0 bg-transparent text-center font-medium tabular-nums tracking-tight outline-none placeholder:text-line-strong"
            style={{ fontSize: "56px", lineHeight: 1.1 }}
          />
        </span>
      </label>

      {type === "withdrawal" ? (
        <p className="mt-6 rounded-[16px] bg-cream-200 p-4 text-sm leading-relaxed text-ink-soft">{t.tx.atmInfo}</p>
      ) : (
        <>
          <div className="mt-6">
            <Label>{t.tx.category}</Label>
            <div className="grid grid-cols-4 gap-2">
              {visible.map((c) => {
                const selected = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCategoryId(c.id)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-[16px] border px-1 pb-2 pt-3 text-center transition ${
                      selected
                        ? "border-pine bg-pine-50 ring-1 ring-pine"
                        : "border-line bg-surface hover:border-line-strong"
                    }`}
                  >
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-pine text-on-pine">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    <span className="text-[26px] leading-none">{c.icon}</span>
                    <span
                      className={`line-clamp-2 text-[11px] leading-tight ${selected ? "font-semibold text-pine" : "text-ink-soft"}`}
                    >
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <Label>{type === "income" ? t.tx.receivedWith : t.tx.paidWith}</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "card", "transfer"] as const).map((m) => {
                const selected = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMethod(m)}
                    className={`flex h-[52px] items-center justify-center gap-2 rounded-[14px] border text-sm transition ${
                      selected
                        ? "border-pine bg-pine-50 font-semibold text-pine ring-1 ring-pine"
                        : "border-line bg-surface font-medium text-ink-soft hover:border-line-strong"
                    }`}
                  >
                    <MethodIcon method={m} className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    {t.methods[m]}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="mt-6">
        <Label>{t.tx.date}</Label>
        <div className="flex gap-2">
          <Segmented
            className="shrink-0"
            value={date === today ? "today" : date === yesterday ? "yesterday" : "other"}
            onChange={(v) => v !== "other" && setDate(v === "today" ? today : yesterday)}
            options={[
              { value: "today", label: <span className="px-2">{t.common.today}</span> },
              { value: "yesterday", label: <span className="px-2">{t.common.yesterday}</span> },
            ]}
          />
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className={`${fieldClass} min-w-0 flex-1`}
          />
        </div>
      </div>

      <label className="mt-6 block">
        <Label>{t.tx.note}</Label>
        <span className="relative block">
          <PenLine className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
          <input
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
            placeholder={type === "income" ? t.tx.incomeNotePlaceholder : t.tx.notePlaceholder}
            className={`${fieldClass} pl-11`}
          />
        </span>
      </label>

      {/* Stays above the tab bar while the form scrolls. */}
      <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] mt-8 bg-gradient-to-t from-cream from-70% to-transparent pb-2 pt-4 md:bottom-0">
        {error && (
          <div className="mb-3">
            <ErrorText>{error}</ErrorText>
          </div>
        )}
        <div className="flex gap-2">
          {initial && (
            <Button
              type="button"
              variant={confirmingDelete ? "confirm" : "danger"}
              onClick={remove}
              disabled={pending}
              aria-label={confirmingDelete ? t.common.confirmDelete : t.common.delete}
            >
              <Trash2 className="h-[18px] w-[18px]" />
              {confirmingDelete && t.common.confirmDelete}
            </Button>
          )}
          <Button className="flex-1" disabled={pending}>
            {pending ? (
              <>
                <LoaderCircle className="h-[18px] w-[18px] animate-spin" />
                {t.common.saving}
              </>
            ) : initial ? (
              t.common.saveChanges
            ) : (
              t.common.save
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
