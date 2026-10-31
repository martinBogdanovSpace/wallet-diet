"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Delete, LoaderCircle, PenLine, Trash2 } from "lucide-react";
import { deleteTransaction, saveTransaction, type TxInput } from "@/app/actions/transactions";
import { parseAmountToCents } from "@/lib/money";
import { formatDay } from "@/lib/dates";
import { centsToKeypad, press, separatorFor } from "@/lib/keypad";
import { MAX_NOTE } from "@/lib/limits";
import { enqueue, isNetworkError, newId } from "@/lib/offline-queue";
import { useI18n } from "@/i18n/client";
import type { Category, Method, Profile, Transaction } from "@/lib/types";
import { MethodIcon } from "@/components/method-icon";
import { Avatar, ErrorText, Segmented } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { toast } from "@/components/toast";

type FormType = TxInput["type"];
type OpenDetail = { type: FormType } | { tx: Transaction };

const OPEN_EVENT = "quick-add:open";
// Set once the drawer is on the page; until then the buttons fall back to the add page.
let listening = false;

function open(detail: OpenDetail) {
  if (!listening) return false;
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail }));
  return true;
}

/** Opens the add drawer from anywhere in the app. False when it isn't ready yet. */
export function openQuickAdd(type: FormType = "expense") {
  return open({ type });
}

/** Opens the drawer to edit an entry. False when it isn't ready yet. */
export function openEditor(tx: Transaction) {
  return open({ tx });
}

/** The add page, for when the drawer can't open. */
export function addPageHref(type: FormType = "expense") {
  return type === "expense" ? "/add" : `/add?type=${type}`;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "sep", "0", "del"] as const;

export function QuickAdd({
  categories,
  members,
  today,
}: {
  categories: Category[];
  members: Profile[];
  today: string;
}) {
  const { t, locale } = useI18n();
  const sep = separatorFor(locale);
  const [isOpen, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [type, setType] = useState<FormType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("card");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [writingNote, setWritingNote] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const clientId = useRef("");
  const dateInput = useRef<HTMLInputElement>(null);

  const visible = categories.filter((c) => c.kind === type && (!c.archived || c.id === categoryId));
  const author = editing && members.length > 1 ? members.find((m) => m.id === editing.user_id) : undefined;

  function changeType(next: FormType) {
    if (next !== type) setCategoryId(null);
    setType(next);
    setMethod(next === "income" ? "transfer" : "card");
    setError(undefined);
  }

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<OpenDetail>).detail;
      const tx = "tx" in detail ? detail.tx : null;
      const nextType = tx ? (tx.type as FormType) : (detail as { type: FormType }).type;
      setEditing(tx);
      setType(nextType);
      setAmount(tx ? centsToKeypad(tx.amount_cents, sep) : "");
      setCategoryId(tx?.category_id ?? null);
      setMethod(tx?.method ?? (nextType === "income" ? "transfer" : "card"));
      setDate(tx?.occurred_on ?? today);
      setNote(tx?.note ?? "");
      setError(undefined);
      setConfirmingDelete(false);
      clientId.current = newId();
      setOpen(true);
    }
    listening = true;
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      listening = false;
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [today, sep]);

  // The delete button asks for a second tap, but only for a few seconds.
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  function close(message?: string) {
    setOpen(false);
    if (message) toast(message);
  }

  function submit() {
    const cents = parseAmountToCents(amount);
    if (!cents || cents <= 0) return setError(t.errors.enterAmount);
    if (type !== "withdrawal" && !categoryId) return setError(t.errors.pickCategory);
    const input: TxInput = {
      id: editing?.id,
      client_id: editing ? undefined : clientId.current,
      type,
      amount_cents: cents,
      category_id: categoryId,
      method,
      occurred_on: date,
      note,
    };
    // No connection: keep a new entry on the phone and send it later.
    if (!editing && !navigator.onLine) {
      enqueue(input);
      return close(t.offline.queued);
    }
    startTransition(async () => {
      try {
        const result = await saveTransaction(input);
        if (result.error) return setError(result.error);
        close(t.common.saved);
      } catch (err) {
        if (!isNetworkError(err)) return setError(t.errors.generic);
        if (editing) return setError(t.errors.offline);
        enqueue(input);
        close(t.offline.queued);
      }
    });
  }

  function remove() {
    if (!editing) return;
    if (!confirmingDelete) return setConfirmingDelete(true);
    startTransition(async () => {
      try {
        const result = await deleteTransaction(editing.id);
        if (result.error) return setError(result.error);
        close(t.common.deleted);
      } catch (err) {
        setError(isNetworkError(err) ? t.errors.offline : t.errors.generic);
      }
    });
  }

  function tapKey(key: string) {
    setAmount((a) => press(a, key === "sep" ? sep : key, sep));
    setError(undefined);
  }

  // A hardware keyboard drives the keypad too, except while typing the note.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key === "Backspace" ? "del" : e.key === "," || e.key === "." ? "sep" : e.key;
      if ((KEYS as readonly string[]).includes(key)) {
        e.preventDefault();
        setAmount((a) => press(a, key === "sep" ? sep : key, sep));
        setError(undefined);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, sep]);

  const chip = (selected: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border text-sm transition ${
      selected
        ? "border-pine bg-pine font-semibold text-on-pine"
        : "border-line bg-surface font-medium text-ink-soft hover:border-line-strong"
    }`;

  return (
    <Sheet open={isOpen} onClose={() => setOpen(false)} label={editing ? t.tx.editTitle : t.nav.add}>
      {editing && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-[22px] font-medium">{t.tx.editTitle}</h2>
          {author && (
            <p className="flex items-center gap-2 text-[13px] text-subtle">
              <Avatar name={author.name} className="h-6 w-6 text-xs" />
              {author.name}
            </p>
          )}
        </div>
      )}
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
          <div
            className="mt-2.5 grid grid-cols-3 gap-2"
            role="group"
            aria-label={type === "income" ? t.tx.receivedWith : t.tx.paidWith}
          >
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
            maxLength={MAX_NOTE}
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
              aria-label={k === "del" ? t.tx.deleteDigit : k === "sep" ? sep : k}
              onClick={() => tapKey(k)}
              className="flex h-[52px] items-center justify-center rounded-[14px] bg-surface text-[22px] font-medium text-ink transition active:scale-[0.97] active:bg-cream-300"
            >
              {k === "del" ? <Delete className="h-6 w-6" strokeWidth={1.75} /> : k === "sep" ? sep : k}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {editing && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={confirmingDelete ? t.common.confirmDelete : t.common.delete}
            // Stays where the first tap was, so the second tap lands on it.
            className={`flex h-[54px] min-w-0 items-center justify-center gap-2 rounded-[16px] border text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
              confirmingDelete
                ? "flex-1 border-danger bg-danger px-3 text-white"
                : "w-[54px] shrink-0 border-expense/25 bg-surface text-danger"
            }`}
          >
            <Trash2 className="h-5 w-5 shrink-0" />
            {confirmingDelete && <span className="truncate">{t.common.confirmDelete}</span>}
          </button>
        )}
        {/* While a delete waits for its second tap, the other button backs out instead of saving. */}
        {confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            disabled={pending}
            className="flex h-[54px] shrink-0 items-center justify-center rounded-[16px] border border-line-strong bg-surface px-5 text-[15px] font-semibold text-ink transition hover:bg-cream-200 active:scale-[0.98] disabled:opacity-60"
          >
            {t.common.cancel}
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex h-[54px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[16px] bg-pine text-base font-semibold text-on-pine shadow-sm transition hover:bg-pine-dark active:scale-[0.98] disabled:opacity-60"
          >
            {pending && <LoaderCircle className="h-5 w-5 animate-spin" />}
            {pending ? t.common.saving : editing ? t.common.saveChanges : t.common.save}
          </button>
        )}
      </div>
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
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => openQuickAdd(type) || router.push(addPageHref(type))}
      className={className}
    >
      {children}
    </button>
  );
}
