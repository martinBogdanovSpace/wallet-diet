"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { saveStartingBalance } from "@/app/actions/household";
import { centsToInput, parseAmountToCents } from "@/lib/money";
import { isNetworkError } from "@/lib/offline-queue";
import { useI18n } from "@/i18n/client";
import { Button, ErrorText, Input, Label } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { toast } from "@/components/toast";

export function StartingBalance({ cents }: { cents: number }) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <Label>{t.settings.startingBalance}</Label>
      <button
        type="button"
        onClick={() => {
          setValue(cents ? centsToInput(cents) : "");
          setError(undefined);
          setOpen(true);
        }}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[17px] font-semibold tabular-nums">{money(cents)}</span>
        <Pencil className="h-4 w-4 text-subtle" />
      </button>
      <p className="mt-1 text-[13px] leading-relaxed text-subtle">{t.settings.startingHint}</p>

      <Sheet open={open} onClose={() => setOpen(false)} label={t.settings.startingBalance}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            // An empty field means no starting balance.
            const parsed = value.trim() ? parseAmountToCents(value) : 0;
            if (parsed === null) return setError(t.errors.invalidAmount);
            startTransition(async () => {
              try {
                const result = await saveStartingBalance(parsed);
                if (result.error) return setError(result.error);
                setOpen(false);
                toast(t.common.saved);
              } catch (err) {
                setError(isNetworkError(err) ? t.errors.offline : t.errors.generic);
              }
            });
          }}
        >
          <h2 className="font-serif text-[22px] font-medium">{t.settings.startingBalance}</h2>
          <p className="text-[13px] leading-relaxed text-subtle">{t.settings.startingHint}</p>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            aria-label={t.settings.startingBalance}
            className="h-14 text-center font-serif text-2xl font-medium tabular-nums"
          />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button className="flex-1" disabled={pending}>
              {pending ? t.common.saving : t.common.save}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
