"use client";

import { useState, useTransition } from "react";
import { Calculator } from "lucide-react";
import { setCashOnHand } from "@/app/actions/transactions";
import { centsToInput, parseAmountToCents } from "@/lib/money";
import { useI18n } from "@/i18n/client";
import { Button, ErrorText, Input } from "@/components/ui";

/** "I counted my cash": records a correction so the wallet matches reality. */
export function CashCount({ balance, today }: { balance: number; today: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => {
          setValue(centsToInput(Math.max(balance, 0)));
          setOpen(true);
        }}
        className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4 text-left transition hover:bg-cream/60"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-cream-200 text-ink-soft">
          <Calculator className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span>
          <span className="block text-[15px] font-semibold">{t.cash.count}</span>
          <span className="block text-[13px] text-subtle">{t.cash.countSub}</span>
        </span>
      </button>
    );
  }

  return (
    <form
      className="col-span-2 space-y-3 rounded-[20px] border border-pine bg-surface p-4 ring-1 ring-pine"
      onSubmit={(e) => {
        e.preventDefault();
        const cents = parseAmountToCents(value);
        if (cents === null || cents < 0) return setError(t.errors.invalidAmount);
        startTransition(async () => {
          const result = await setCashOnHand(cents, today);
          if (result.error) return setError(result.error);
          setOpen(false);
          setError(undefined);
        });
      }}
    >
      <p className="text-[15px] font-medium">{t.cash.countQuestion}</p>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="decimal"
        autoFocus
        className="font-semibold tabular-nums"
      />
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          {t.common.cancel}
        </Button>
        <Button className="flex-1" disabled={pending}>
          {pending ? t.common.saving : t.cash.setBalance}
        </Button>
      </div>
    </form>
  );
}
