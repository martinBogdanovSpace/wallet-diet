"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { saveBudget } from "@/app/actions/settings";
import { centsToInput, parseAmountToCents } from "@/lib/money";
import { useI18n } from "@/i18n/client";
import type { Category } from "@/lib/types";
import { BudgetBar } from "@/components/budget-bar";
import { Button, ErrorText, Input, Tile } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { toast } from "@/components/toast";
import { isNetworkError } from "@/lib/offline-queue";

export function BudgetEditor({
  category,
  spent,
  limit,
}: {
  category: Category;
  spent: number;
  limit: number | null;
}) {
  const { t, money } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save(cents: number | null) {
    startTransition(async () => {
      try {
        const result = await saveBudget(category.id, cents);
        if (result.error) return setError(result.error);
        setEditing(false);
        toast(t.common.saved);
      } catch (err) {
        setError(isNetworkError(err) ? t.errors.offline : t.errors.generic);
      }
    });
  }

  return (
    <>
      <button
        className="block w-full p-4 text-left transition hover:bg-cream/60"
        onClick={() => {
          setValue(limit ? centsToInput(limit) : "");
          setError(undefined);
          setEditing(true);
        }}
      >
        {limit !== null ? (
          <BudgetBar icon={category.icon} label={category.name} spent={spent} limit={limit} />
        ) : (
          <span className="flex items-center gap-3">
            <Tile className="h-10 w-10 text-xl">{category.icon}</Tile>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{category.name}</span>
              {spent > 0 && <span className="block text-[13px] tabular-nums text-subtle">{money(spent)}</span>}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold text-pine">
              <Plus className="h-4 w-4" />
              {t.budgets.setLimit}
            </span>
          </span>
        )}
      </button>

      <Sheet open={editing} onClose={() => setEditing(false)} label={category.name}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const cents = parseAmountToCents(value);
            if (!cents || cents <= 0) return setError(t.errors.limitPositive);
            save(cents);
          }}
        >
          <h2 className="flex items-center gap-2.5 font-serif text-[22px] font-medium">
            <span className="text-2xl">{category.icon}</span>
            {category.name}
          </h2>
          {spent > 0 && (
            <p className="text-[13px] text-subtle">
              {t.dashboard.expenses}: <span className="font-semibold tabular-nums">{money(spent)}</span>
            </p>
          )}
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder={t.budgets.limitPlaceholder}
            aria-label={t.budgets.limitPlaceholder}
            className="h-14 text-center font-serif text-2xl font-medium tabular-nums"
          />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            {limit !== null && (
              <Button type="button" variant="danger" onClick={() => save(null)} disabled={pending}>
                {t.common.remove}
              </Button>
            )}
            <Button className="flex-1" disabled={pending}>
              {pending ? t.common.saving : t.common.save}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
