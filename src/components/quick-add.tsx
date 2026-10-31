"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, Delete, LoaderCircle, PenLine } from "lucide-react";
import { saveTransaction, type TxInput } from "@/app/actions/transactions";
import { parseAmountToCents } from "@/lib/money";
import { formatDay } from "@/lib/dates";
import { useI18n } from "@/i18n/client";
import type { Category, Method } from "@/lib/types";
import { MethodIcon } from "@/components/method-icon";
import { ErrorText, Segmented } from "@/components/ui";
import { Sheet } from "@/components/sheet";

type FormType = TxInput["type"];

const OPEN_EVENT = "quick-add:open";

/** Opens the add drawer from anywhere in the app. */
export function openQuickAdd(type: FormType = "expense") {
  window.dispatchEvent(new CustomEvent<FormType>(OPEN_EVENT, { detail: type }));
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "del"] as const;

/** Typing on the keypad: one decimal comma, two decimals, up to 999 999. */
function press(amount: string, key: string) {
  if (key === "del") return amount.slice(0, -1);
  if (key === ",") return amount.includes(",") ? amount : (amount || "0") + ",";
  const [whole, decimals] = amount.split(",");
  if (decimals !== undefined ? decimals.length >= 2 : whole.length >= 6) return amount;
  return amount === "0" ? key : amount + key;
}

export function QuickAdd({ categories, today }: { categories: Category[]; today: string }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [type, setType] = useState<FormType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("card");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [writingNote, setWritingNote] = useState(false);
  const dateInput = useRef<HTMLInputElement>(null);

  const visible = categories.filter((c) => c.kind === type && !c.archived);

  function changeType(next: FormType) {
    if (next !== type) setCategoryId(null);
    setType(next);
    setMethod(next === "income" ? "transfer" : "card");
    setError(undefined);
  }

  useEffect(() => {
    function onOpen(e: Event) {
      const next = (e as CustomEvent<FormType>).detail;
      setAmount("");
      setCategoryId(null);
      setDate(today);
      setNote("");
      setError(undefined);
      setType(next);
      setMethod(next === "income" ? "transfer" : "card");
      setOpen(true);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [today]);

  function submit() {
    const cents = parseAmountToCents(amount);
    if (!cents || cents <= 0) return setError(t.errors.enterAmount);
    if (type !== "withdrawal" && !categoryId) return setError(t.errors.pickCategory);
    startTransition(async () => {
      const result = await saveTransaction({
        type,
        amount_cents: cents,
        category_id: categoryId,
        method,
        occurred_on: date,
        note,
      });
      if (result.error) return setError(result.error);
      setOpen(false);
    });
  }

  // A hardware keyboard drives the keypad too, except while typing the note.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key === "." ? "," : e.key === "Backspace" ? "del" : e.key;
      if ((KEYS as readonly string[]).includes(key)) {
        e.preventDefault();
        setAmount((a) => press(a, key));
        setError(undefined);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const chip = (selected: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border text-sm transition ${
      selected
        ? "border-pine bg-pine font-semibold text-cream"
        : "border-line bg-surface font-medium text-ink-soft hover:border-line-strong"
    }`;

  return (
    <Sheet open={open} onClose={() => setOpen(false)} label={t.nav.add}>
      <Segmented
        value={type}
        onChange={changeType}
        options={[
          { value: "expense", label: t.tx.expense },
          { value: "income", label: t.tx.income },
          { value: "withdrawal", label: t.tx.atm },
        ]}
      />

      <p
        aria-live="polite"
        className={`mt-4 text-center font-serif text-[52px] font-medium leading-[1.1] tracking-tight tabular-nums ${
          type === "income" ? "text-income" : amount ? "text-ink" : "text-line-strong"
        }`}
      >
        <span className="sr-only">{t.tx.amount}: </span>
        {amount || "0"}
        <span className="text-3xl text-faint"> €</span>
      </p>

      {type === "withdrawal" ? (
        <p className="mt-3 rounded-[16px] bg-cream-200 px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
          {t.tx.atmInfo}
        </p>
      ) : (
        <>
          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
            {visible.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={categoryId === c.id}
                onClick={() => {
                  setCategoryId(c.id);
                  setError(undefined);
                }}
                className={`${chip(categoryId === c.id)} h-10 pl-2.5 pr-3.5`}
              >
                <span className="text-lg leading-none">{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2" role="group" aria-label={type === "income" ? t.tx.receivedWith : t.tx.paidWith}>
            {(["cash", "card", "transfer"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={method === m}
                onClick={() => setMethod(m)}
                className={`${chip(method === m)} h-10 justify-center rounded-[12px]`}
              >
                <MethodIcon method={m} className="h-4 w-4" strokeWidth={1.75} />
                {t.methods[m]}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-2.5 flex gap-2">
        <label className="relative flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[12px] border border-line bg-surface px-3 text-sm font-semibold text-ink-soft">
          <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
          {formatDay(date, today, locale, t.common)}
          <input
            ref={dateInput}
            type="date"
            value={date}
            max={today}
            aria-label={t.tx.date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            onClick={() => dateInput.current?.showPicker?.()}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <span className="relative min-w-0 flex-1">
          <PenLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onFocus={() => setWritingNote(true)}
            onBlur={() => setWritingNote(false)}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), e.preventDefault())}
            placeholder={type === "income" ? t.tx.incomeNotePlaceholder : t.tx.notePlaceholder}
            aria-label={t.tx.note}
            enterKeyHint="done"
            className="h-11 w-full rounded-[12px] border border-line bg-surface pl-9 pr-3 text-ink placeholder:text-faint focus:border-pine focus:outline-none"
          />
        </span>
      </div>

      {/* The phone keyboard replaces the keypad while the note is being typed. */}
      {!writingNote && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={k === "del" ? t.tx.deleteDigit : k}
              onClick={() => {
                setAmount((a) => press(a, k));
                setError(undefined);
              }}
              className="flex h-[52px] items-center justify-center rounded-[14px] bg-surface text-[22px] font-medium text-ink transition active:scale-[0.97] active:bg-cream-300"
            >
              {k === "del" ? <Delete className="h-6 w-6" strokeWidth={1.75} /> : k}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-3 flex h-[54px] w-full items-center justify-center gap-2 rounded-[16px] bg-pine text-base font-semibold text-cream shadow-sm transition hover:bg-pine-dark active:scale-[0.98] disabled:opacity-60"
      >
        {pending && <LoaderCircle className="h-5 w-5 animate-spin" />}
        {pending ? t.common.saving : t.common.save}
      </button>
    </Sheet>
  );
}

/** A button that opens the drawer, for server-rendered pages. */
export function QuickAddButton({
  type = "expense",
  className,
  children,
}: {
  type?: FormType;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={() => openQuickAdd(type)} className={className}>
      {children}
    </button>
  );
}
