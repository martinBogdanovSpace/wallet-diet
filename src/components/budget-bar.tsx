"use client";

import { useI18n } from "@/i18n/client";
import { budgetTone } from "@/lib/budget";

export function BudgetBar({
  icon,
  label,
  spent,
  limit,
}: {
  icon?: string;
  label: string;
  spent: number;
  limit: number;
}) {
  const { t, f, money } = useI18n();
  const ratio = spent / limit;
  const tone = budgetTone(ratio);
  const left = limit - spent;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[15px] font-medium text-ink">
          {icon && <span className="mr-1.5">{icon}</span>}
          {label}
        </span>
        <span className="shrink-0 text-sm tabular-nums text-ink">
          {money(spent)} <span className="text-faint">/ {money(limit)}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-300/70">
        <div
          className={`h-full rounded-full transition-[width] ${tone.bar}`}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
      <p className={`mt-1.5 text-[13px] ${tone.text}`}>
        {left >= 0 ? f(t.budgets.left, { amount: money(left) }) : f(t.budgets.over, { amount: money(-left) })}
      </p>
    </div>
  );
}
