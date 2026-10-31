"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Pause, Play, Plus, Trash2 } from "lucide-react";
import {
  deleteRecurring,
  saveRecurring,
  setRecurringActive,
  type RecurringInput,
} from "@/app/actions/settings";
import { formatDay } from "@/lib/dates";
import { centsToInput, parseAmountToCents } from "@/lib/money";
import { useI18n } from "@/i18n/client";
import type { Category, Method, Recurring } from "@/lib/types";
import { MethodIcon } from "@/components/method-icon";
import { Button, ErrorText, Input, Label, Segmented, Tile, fieldClass } from "@/components/ui";

export function RecurringManager({
  rules,
  categories,
  today,
}: {
  rules: Recurring[];
  categories: Category[];
  today: string;
}) {
  const { t, f, money, locale } = useI18n();
  const [editing, setEditing] = useState<Recurring | "new" | null>(null);
  const catById = new Map(categories.map((c) => [c.id, c]));

  if (editing) {
    return (
      <RecurringForm
        key={editing === "new" ? "new" : editing.id}
        initial={editing === "new" ? undefined : editing}
        categories={categories}
        today={today}
        onDone={() => setEditing(null)}
      />
    );
  }

  const monthlyNet = rules
    .filter((r) => r.active)
    .reduce((s, r) => {
      const perMonth = r.frequency === "weekly" ? Math.round((r.amount_cents * 52) / 12) : r.amount_cents;
      return s + (r.type === "income" ? perMonth : -perMonth);
    }, 0);

  return (
    <div className="pb-4">
      <p className="-mt-2 text-sm leading-relaxed text-subtle">{t.recurring.explain}</p>

      {rules.length > 0 && (
        <>
          <div className="mt-5 flex items-baseline justify-between rounded-[16px] bg-cream-200 px-4 py-3">
            <span className="text-sm text-ink-soft">{t.recurring.netPerMonth}</span>
            <span className={`font-semibold tabular-nums ${monthlyNet < 0 ? "text-expense" : "text-income"}`}>
              {money(monthlyNet)}
            </span>
          </div>
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">
            {rules.map((r) => {
              const c = r.category_id ? catById.get(r.category_id) : undefined;
              return (
                <button
                  key={r.id}
                  onClick={() => setEditing(r)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cream/60 ${
                    r.active ? "" : "opacity-55"
                  }`}
                >
                  <Tile className={r.type === "income" ? "bg-income-50" : ""}>{c?.icon ?? "❔"}</Tile>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{r.note || c?.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-subtle">
                      {r.active ? null : <Pause className="h-3.5 w-3.5" />}
                      {r.frequency === "monthly" ? t.recurring.monthly : t.recurring.weekly} ·{" "}
                      {r.active
                        ? f(t.recurring.next, { date: formatDay(r.next_date, today, locale, t.common) })
                        : t.recurring.paused}
                    </span>
                  </span>
                  <span
                    className={`text-[15px] font-semibold tabular-nums ${r.type === "income" ? "text-income" : ""}`}
                  >
                    {r.type === "income" ? "+" : "−"}
                    {money(r.amount_cents)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <Button variant="secondary" className="mt-4 w-full" onClick={() => setEditing("new")}>
        <Plus className="h-[18px] w-[18px]" />
        {t.recurring.add}
      </Button>
    </div>
  );
}

function RecurringForm({
  initial,
  categories,
  today,
  onDone,
}: {
  initial?: Recurring;
  categories: Category[];
  today: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<RecurringInput["type"]>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amount_cents) : "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [method, setMethod] = useState<Method>(initial?.method ?? "transfer");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "monthly");
  const [nextDate, setNextDate] = useState(initial?.next_date ?? today);
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const options = categories.filter((c) => c.kind === type && (!c.archived || c.id === categoryId));

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) return setError(result.error);
      onDone();
    });
  }

  return (
    <form
      className="space-y-5 pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        const cents = parseAmountToCents(amount);
        if (!cents || cents <= 0) return setError(t.errors.enterAmount);
        run(() =>
          saveRecurring({
            id: initial?.id,
            type,
            amount_cents: cents,
            category_id: categoryId || null,
            method,
            note,
            frequency,
            next_date: nextDate,
          }),
        );
      }}
    >
      <Segmented
        value={type}
        onChange={(next) => {
          setType(next);
          setCategoryId("");
        }}
        options={[
          { value: "expense", label: t.tx.expense },
          { value: "income", label: t.tx.income },
        ]}
      />
      <label className="block">
        <Label>{t.recurring.name}</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.recurring.namePlaceholder} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <Label>{t.recurring.amount}</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="font-semibold tabular-nums"
          />
        </label>
        <label className="block">
          <Label>{t.tx.category}</Label>
          <span className="relative block">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`${fieldClass} appearance-none pr-10`}
            >
              <option value="">{t.recurring.choose}</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          </span>
        </label>
      </div>
      <div>
        <Label>{t.tx.paidWith}</Label>
        <Segmented
          value={method}
          onChange={setMethod}
          options={(["cash", "card", "transfer"] as const).map((m) => ({
            value: m,
            label: (
              <>
                <MethodIcon method={m} className="h-4 w-4" strokeWidth={1.75} />
                {t.methods[m]}
              </>
            ),
          }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t.recurring.repeats}</Label>
          <Segmented
            value={frequency}
            onChange={setFrequency}
            options={[
              { value: "monthly", label: t.recurring.monthly },
              { value: "weekly", label: t.recurring.weekly },
            ]}
          />
        </div>
        <label className="block">
          <Label>{t.recurring.nextDate}</Label>
          <Input type="date" value={nextDate} onChange={(e) => e.target.value && setNextDate(e.target.value)} />
        </label>
      </div>
      <p className="-mt-2 text-[13px] text-subtle">{t.recurring.pastHint}</p>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t.common.cancel}
        </Button>
        <Button className="flex-1" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
      {initial && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            disabled={pending}
            onClick={() => run(() => setRecurringActive(initial.id, !initial.active))}
          >
            {initial.active ? <Pause className="h-[18px] w-[18px]" /> : <Play className="h-[18px] w-[18px]" />}
            {initial.active ? t.recurring.pause : t.recurring.resume}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1 text-danger hover:bg-expense-50"
            disabled={pending}
            onClick={() => run(() => deleteRecurring(initial.id))}
          >
            <Trash2 className="h-[18px] w-[18px]" />
            {t.common.delete}
          </Button>
        </div>
      )}
    </form>
  );
}
