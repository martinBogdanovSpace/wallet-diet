"use client";

import { useState, useTransition } from "react";
import { Calculator } from "lucide-react";
import { setCashOnHand } from "@/app/actions/transactions";
import { centsToInput, parseAmountToCents } from "@/lib/money";
import { isNetworkError } from "@/lib/offline-queue";
import { useI18n } from "@/i18n/client";
import { Button, ErrorText, Input } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { toast } from "@/components/toast";

/** "I counted my cash": records a correction so the wallet matches reality. */
export function CashCount({ balance }: { balance: number }) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        onClick={() => {
          setValue(centsToInput(Math.max(balance, 0)));
          setError(undefined);
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

      <Sheet open={open} onClose={() => setOpen(false)} label={t.cash.count}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const cents = parseAmountToCents(value);
            if (cents === null || cents < 0) return setError(t.errors.invalidAmount);
            startTransition(async () => {
              try {
                const result = await setCashOnHand(cents);
                if (result.error) return setError(result.error);
                setOpen(false);
                toast(t.common.saved);
              } catch (err) {
                setError(isNetworkError(err) ? t.errors.offline : t.errors.generic);
              }
            });
          }}
        >
          <h2 className="font-serif text-[22px] font-medium">{t.cash.count}</h2>
          <p className="text-[15px] text-ink-soft">{t.cash.countQuestion}</p>
          <p className="text-[13px] text-subtle">
            {t.cash.onHand}: <span className="font-semibold tabular-nums">{money(balance)}</span>
          </p>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            aria-label={t.cash.countQuestion}
            className="h-14 text-center font-serif text-2xl font-medium tabular-nums"
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
      </Sheet>
    </>
  );
}
