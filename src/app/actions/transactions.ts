"use server";

import { refresh } from "next/cache";
import { getCashBalance, getContext } from "@/lib/data";
import { getActionI18n } from "@/i18n/server";
import type { Dict } from "@/i18n/dictionaries";
import type { Method, TxType } from "@/lib/types";

export type TxInput = {
  id?: string;
  type: Exclude<TxType, "adjustment">;
  amount_cents: number;
  category_id: string | null;
  method: Method;
  occurred_on: string;
  note: string;
};

const TYPES = ["income", "expense", "withdrawal"];
const METHODS = ["cash", "card", "transfer"];

function validate(input: TxInput, t: Dict): string | null {
  if (!TYPES.includes(input.type) || !METHODS.includes(input.method)) return t.errors.invalidInput;
  if (!Number.isInteger(input.amount_cents) || input.amount_cents <= 0) return t.errors.amountPositive;
  if (input.amount_cents > 100_000_000) return t.errors.amountTooLarge;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurred_on)) return t.errors.invalidDate;
  if (input.type !== "withdrawal" && !input.category_id) return t.errors.pickCategory;
  return null;
}

export async function saveTransaction(input: TxInput): Promise<{ error?: string }> {
  const { t } = await getActionI18n();
  const error = validate(input, t);
  if (error) return { error };

  const { supabase, household } = await getContext();
  const row = {
    type: input.type,
    amount_cents: input.amount_cents,
    category_id: input.type === "withdrawal" ? null : input.category_id,
    // An ATM withdrawal always ends up as cash in the wallet.
    method: input.type === "withdrawal" ? "cash" : input.method,
    occurred_on: input.occurred_on,
    note: input.note.trim() || null,
  };

  const result = input.id
    ? await supabase.from("transactions").update(row).eq("id", input.id)
    : await supabase.from("transactions").insert({ ...row, household_id: household.id });

  if (result.error) return { error: result.error.message };
  refresh();
  return {};
}

export async function deleteTransaction(id: string): Promise<{ error?: string }> {
  const { supabase } = await getContext();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Records an adjustment so the cash wallet matches what is actually on hand. */
export async function setCashOnHand(actualCents: number, today: string): Promise<{ error?: string }> {
  const { t } = await getActionI18n();
  if (!Number.isInteger(actualCents) || actualCents < 0) return { error: t.errors.invalidAmount };
  const { supabase, household } = await getContext();
  const diff = actualCents - (await getCashBalance());
  if (diff === 0) return {};
  const { error } = await supabase.from("transactions").insert({
    household_id: household.id,
    type: "adjustment",
    amount_cents: diff,
    method: "cash",
    occurred_on: today,
  });
  if (error) return { error: error.message };
  refresh();
  return {};
}
