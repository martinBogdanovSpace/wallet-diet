"use server";

import { refresh } from "next/cache";
import { getContext } from "@/lib/data";
import { getActionI18n } from "@/i18n/server";
import { firstEmoji } from "@/lib/emoji";
import type { CategoryKind, Frequency, Method } from "@/lib/types";

type Result = { error?: string };

// --- Categories -------------------------------------------------------------

export async function saveCategory(input: {
  id?: string;
  name: string;
  icon: string;
  kind: CategoryKind;
}): Promise<Result> {
  const { t } = await getActionI18n();
  const name = input.name.trim();
  if (!name) return { error: t.errors.nameEmpty };
  if (!["income", "expense"].includes(input.kind)) return { error: t.errors.invalidInput };

  const { supabase, household } = await getContext();
  const icon = firstEmoji(input.icon) ?? "📦";
  const result = input.id
    ? await supabase.from("categories").update({ name, icon }).eq("id", input.id)
    : await supabase
        .from("categories")
        .insert({ household_id: household.id, name, icon, kind: input.kind, sort: 100 });
  if (result.error) return { error: result.error.message };
  refresh();
  return {};
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<Result> {
  const { supabase } = await getContext();
  const { error } = await supabase.from("categories").update({ archived }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// --- Budgets ----------------------------------------------------------------

/** Sets a monthly limit for a category; null removes it. */
export async function saveBudget(categoryId: string, limitCents: number | null): Promise<Result> {
  const [{ supabase, household }, { t }] = await Promise.all([getContext(), getActionI18n()]);
  const result =
    limitCents === null
      ? await supabase
          .from("budgets")
          .delete()
          .eq("household_id", household.id)
          .eq("category_id", categoryId)
      : !Number.isInteger(limitCents) || limitCents <= 0
        ? { error: { message: t.errors.limitPositive } }
        : await supabase.from("budgets").upsert({
            household_id: household.id,
            category_id: categoryId,
            monthly_limit_cents: limitCents,
          });
  if (result.error) return { error: result.error.message };
  refresh();
  return {};
}

// --- Recurring --------------------------------------------------------------

export type RecurringInput = {
  id?: string;
  type: "income" | "expense";
  amount_cents: number;
  category_id: string | null;
  method: Method;
  note: string;
  frequency: Frequency;
  next_date: string;
};

export async function saveRecurring(input: RecurringInput): Promise<Result> {
  const { t } = await getActionI18n();
  if (
    !["income", "expense"].includes(input.type) ||
    !["weekly", "monthly"].includes(input.frequency) ||
    !["cash", "card", "transfer"].includes(input.method)
  )
    return { error: t.errors.invalidInput };
  if (!Number.isInteger(input.amount_cents) || input.amount_cents <= 0)
    return { error: t.errors.amountPositive };
  if (!input.category_id) return { error: t.errors.pickCategory };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.next_date)) return { error: t.errors.invalidDate };

  const { supabase, household } = await getContext();
  const row = {
    type: input.type,
    amount_cents: input.amount_cents,
    category_id: input.category_id,
    method: input.method,
    note: input.note.trim() || null,
    frequency: input.frequency,
    anchor_day: input.frequency === "monthly" ? Number(input.next_date.slice(8, 10)) : null,
    next_date: input.next_date,
  };
  const result = input.id
    ? await supabase.from("recurring").update(row).eq("id", input.id)
    : await supabase.from("recurring").insert({ ...row, household_id: household.id });
  if (result.error) return { error: result.error.message };
  refresh();
  return {};
}

export async function setRecurringActive(id: string, active: boolean): Promise<Result> {
  const { supabase } = await getContext();
  const { error } = await supabase.from("recurring").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteRecurring(id: string): Promise<Result> {
  const { supabase } = await getContext();
  const { error } = await supabase.from("recurring").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}
