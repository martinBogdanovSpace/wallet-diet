"use client";

import { useState, useTransition } from "react";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteGoal, moveGoalMoney, saveGoal } from "@/app/actions/goals";
import { centsToInput, parseAmountToCents } from "@/lib/money";
import { MAX_NAME } from "@/lib/limits";
import { isNetworkError } from "@/lib/offline-queue";
import { useI18n } from "@/i18n/client";
import type { Goal } from "@/lib/types";
import { Button, ErrorText, Input, Label, Tile } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { toast } from "@/components/toast";

const GOAL_ICONS = ["🎯", "✈️", "🏖️", "🏠", "🚗", "🎓", "💍", "👶", "🛟", "🎁", "💻", "🩺"];

type Open = { kind: "new" } | { kind: "goal"; id: string; editing: boolean } | null;

export function GoalsManager({ goals, available }: { goals: Goal[]; available: number | null }) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState<Open>(null);
  const inGoals = goals.reduce((s, g) => s + g.saved_cents, 0);
  const free = available === null ? null : available - inGoals;
  // Looked up by id, so the drawer shows fresh numbers after a refresh.
  const goal = open?.kind === "goal" ? goals.find((g) => g.id === open.id) : undefined;

  return (
    <div className="pb-4">
      <p className="-mt-2 text-sm leading-relaxed text-subtle">{t.goals.explain}</p>

      {available !== null && (
        <section className="mt-5 grid grid-cols-3 divide-x divide-line rounded-[20px] border border-line bg-surface py-4 text-center">
          {[
            { label: t.dashboard.available, value: available },
            { label: t.dashboard.inGoals, value: inGoals },
            { label: t.dashboard.free, value: free! },
          ].map(({ label, value }, i) => (
            <div key={label} className="min-w-0 px-2">
              <p className="text-xs text-subtle">{label}</p>
              <p
                className={`mt-1 truncate text-[15px] font-semibold tabular-nums ${
                  i === 2 && value < 0 ? "text-expense" : ""
                }`}
              >
                {money(value)}
              </p>
            </div>
          ))}
        </section>
      )}
      {free !== null && free < 0 && <p className="mt-2 px-1 text-[13px] text-expense">{t.goals.overAllocated}</p>}

      {goals.length === 0 ? (
        <div className="mt-5 rounded-[20px] border border-dashed border-line-strong px-6 py-10 text-center text-subtle">
          {t.goals.empty}
        </div>
      ) : (
        <div className="mt-5 divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">
          {goals.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setOpen({ kind: "goal", id: g.id, editing: false })}
              className="block w-full px-4 py-3.5 text-left transition hover:bg-cream/60"
            >
              <GoalSummary goal={g} />
            </button>
          ))}
        </div>
      )}

      <Button variant="secondary" className="mt-4 w-full" onClick={() => setOpen({ kind: "new" })}>
        <Plus className="h-[18px] w-[18px]" />
        {t.goals.add}
      </Button>

      <Sheet open={open !== null} onClose={() => setOpen(null)} label={goal?.name ?? t.goals.add}>
        {open?.kind === "new" && <GoalForm onDone={() => setOpen(null)} />}
        {open?.kind === "goal" && goal && open.editing && (
          <GoalForm key={goal.id} goal={goal} onDone={() => setOpen(null)} />
        )}
        {open?.kind === "goal" && goal && !open.editing && (
          <GoalMoney
            key={goal.id}
            goal={goal}
            free={free}
            onEdit={() => setOpen({ kind: "goal", id: goal.id, editing: true })}
            onDone={() => setOpen(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function GoalSummary({ goal, large = false }: { goal: Goal; large?: boolean }) {
  const { t, f, money } = useI18n();
  const share = Math.min(goal.saved_cents / goal.target_cents, 1);
  const reached = goal.saved_cents >= goal.target_cents;
  return (
    <>
      <span className="flex items-center gap-3">
        <Tile className={large ? "h-12 w-12 text-2xl" : ""}>{goal.icon}</Tile>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${large ? "font-serif text-[22px]" : "text-[15px]"}`}>
            {goal.name}
          </span>
          <span className="block text-[13px] tabular-nums text-subtle">
            {f(t.goals.of, { saved: money(goal.saved_cents), target: money(goal.target_cents) })}
          </span>
        </span>
        <span className={`text-[13px] font-semibold tabular-nums ${reached ? "text-income" : "text-ink-soft"}`}>
          {reached ? t.goals.reached : `${Math.floor(share * 100)}%`}
        </span>
      </span>
      <span className="mt-2.5 block h-2 overflow-hidden rounded-full bg-cream-300/70">
        <span
          className={`block h-full rounded-full ${reached ? "bg-income" : "bg-pine"}`}
          style={{ width: `${share * 100}%` }}
        />
      </span>
      {!reached && (
        <span className="mt-1.5 block text-[12px] text-subtle">
          {f(t.goals.left, { amount: money(goal.target_cents - goal.saved_cents) })}
        </span>
      )}
    </>
  );
}

/** Put money into a goal or take it out. */
function GoalMoney({
  goal,
  free,
  onEdit,
  onDone,
}: {
  goal: Goal;
  free: number | null;
  onEdit: () => void;
  onDone: () => void;
}) {
  const { t, money } = useI18n();
  // Suggest what's still missing, as long as that much is free.
  const missing = goal.target_cents - goal.saved_cents;
  const suggestion = missing > 0 ? (free !== null && free > 0 ? Math.min(missing, free) : missing) : 0;
  const [value, setValue] = useState(suggestion > 0 ? centsToInput(suggestion) : "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function move(direction: 1 | -1) {
    const cents = parseAmountToCents(value);
    if (!cents || cents <= 0) return setError(t.errors.enterAmount);
    startTransition(async () => {
      try {
        const result = await moveGoalMoney(goal.id, direction * cents);
        if (result.error) return setError(result.error);
        toast(t.common.saved);
        onDone();
      } catch (err) {
        setError(isNetworkError(err) ? t.errors.offline : t.errors.generic);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <GoalSummary goal={goal} large />
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t.goals.edit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-subtle hover:bg-cream-200 hover:text-ink"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
      {free !== null && (
        <p className="text-[13px] text-subtle">
          {t.dashboard.free}: <span className="font-semibold tabular-nums">{money(free)}</span>
        </p>
      )}
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="decimal"
        placeholder="0,00"
        aria-label={t.goals.amount}
        className="h-14 text-center font-serif text-2xl font-medium tabular-nums"
      />
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={pending || goal.saved_cents === 0}
          onClick={() => move(-1)}
        >
          <Minus className="h-[18px] w-[18px]" />
          {t.goals.takeOut}
        </Button>
        <Button type="button" className="flex-1" disabled={pending} onClick={() => move(1)}>
          <Plus className="h-[18px] w-[18px]" />
          {t.goals.putIn}
        </Button>
      </div>
    </div>
  );
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const { t } = useI18n();
  const [icon, setIcon] = useState(goal?.icon ?? "🎯");
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? centsToInput(goal.target_cents) : "");
  const [error, setError] = useState<string>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>, message: string) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) return setError(result.error);
        toast(message);
        onDone();
      } catch (err) {
        setError(isNetworkError(err) ? t.errors.offline : t.errors.generic);
      }
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const cents = parseAmountToCents(target);
        if (!cents || cents <= 0) return setError(t.errors.targetPositive);
        run(() => saveGoal({ id: goal?.id, name, icon, target_cents: cents }), t.common.saved);
      }}
    >
      <h2 className="font-serif text-[22px] font-medium">{goal ? t.goals.edit : t.goals.add}</h2>
      <div>
        <Label>{t.goals.icon}</Label>
        <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
          {GOAL_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-pressed={emoji === icon}
              onClick={() => setIcon(emoji)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[22px] transition ${
                emoji === icon ? "bg-pine-50 ring-2 ring-pine" : "bg-surface hover:bg-cream-200"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <Label>{t.goals.name}</Label>
        <Input
          value={name}
          maxLength={MAX_NAME}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.goals.namePlaceholder}
        />
      </label>
      <label className="block">
        <Label>{t.goals.target}</Label>
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          className="font-semibold tabular-nums"
        />
      </label>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        {goal && (
          <Button
            type="button"
            variant={confirmingDelete ? "confirm" : "danger"}
            disabled={pending}
            aria-label={confirmingDelete ? t.common.confirmDelete : t.common.delete}
            className={confirmingDelete ? "min-w-0 flex-1" : ""}
            onClick={() =>
              confirmingDelete ? run(() => deleteGoal(goal.id), t.common.deleted) : setConfirmingDelete(true)
            }
          >
            <Trash2 className="h-[18px] w-[18px] shrink-0" />
            {confirmingDelete && <span className="truncate">{t.common.confirmDelete}</span>}
          </Button>
        )}
        {confirmingDelete ? (
          <Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={pending}>
            {t.common.cancel}
          </Button>
        ) : (
          <Button className="flex-1" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        )}
      </div>
    </form>
  );
}
