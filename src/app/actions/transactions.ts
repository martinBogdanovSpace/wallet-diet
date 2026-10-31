"use server";

import { refresh } from "next/cache";
import { getCashBalance, getContext } from "@/lib/data";
import { isValidDate } from "@/lib/dates";
import { MAX_NOTE } from "@/lib/limits";
import { getActionI18n } from "@/i18n/server";
import type { Dict } from "@/i18n/dictionaries";
import type { Method, TxType } from "@/lib/types";

export type TxInput = {
  /** Set when editing an existing entry. */
  id?: string;
  /**
   * Made by the browser for a new entry, so sending the same entry twice
   * (an offline retry) still saves it once.
   */
  client_id?: string;
  type: Exclude<TxType, "adjustment">;
  amount_cents: number;
  category_id: string | null;
  method: Method;
  occurred_on: string;
  note: string;
};

const TYPES = ["income", "expense", "withdrawal"];
const METHODS = ["cash", "card", "transfer"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validate(input: TxInput, t: Dict): string | null {
  if (!TYPES.includes(input.type) || !METHODS.includes(input.method)) return t.errors.invalidInput;
  if ((input.id && !UUID.test(input.id)) || (input.client_id && !UUID.test(input.client_id)))
    return t.errors.invalidInput;
  if (!Number.isInteger(input.amount_cents) || input.amount_cents <= 0) return t.errors.amountPositive;
  if (input.amount_cents > 100_000_000) return t.errors.amountTooLarge;
  if (!isValidDate(input.occurred_on) || input.occurred_on < "2000-01-01") return t.errors.invalidDate;
  if (input.type !== "withdrawal" && !input.category_id) return t.errors.pickCategory;
  if (typeof input.note !== "string" || input.note.length > MAX_NOTE) return t.errors.noteTooLong;
  return null;
}

export async function saveTransaction(input: TxInput): Promise<{ error?: string }> {
  const { t } = await getActionI18n();
  const error = validate(input, t);
  if (error) return { error };

  const { supabase, household, today } = await getContext();
  if (input.occurred_on > today) return { error: t.errors.futureDate };

  if (input.type !== "withdrawal") {
    // The category must be one of ours and of the same kind as the entry.
    const { data: category } = await supabase
      .from("categories")
      .select("kind")
      .eq("id", input.category_id!)
      .eq("household_id", household.id)
      .maybeSingle();
    if (!category || category.kind !== input.type) return { error: t.errors.pickCategory };
  }

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
    ? // Cash corrections are made by counting cash, not edited.
      await supabase.from("transactions").update(row).eq("id", input.id).neq("type", "adjustment")
    : await supabase
        .from("transactions")
        .upsert(
          { ...row, household_id: household.id, ...(input.client_id && { id: input.client_id }) },
          { onConflict: "id", ignoreDuplicates: true },
        );

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
export async function setCashOnHand(actualCents: number): Promise<{ error?: string }> {
  const { t } = await getActionI18n();
  if (!Number.isInteger(actualCents) || actualCents < 0 || actualCents > 100_000_000)
    return { error: t.errors.invalidAmount };
  const { supabase, household, today } = await getContext();
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
