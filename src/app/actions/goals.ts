"use server";

import { refresh } from "next/cache";
import { getContext } from "@/lib/data";
import { firstEmoji } from "@/lib/emoji";
import { MAX_NAME } from "@/lib/limits";
import { getActionI18n } from "@/i18n/server";

type Result = { error?: string };

const MAX_CENTS = 100_000_000_00;

export async function saveGoal(input: { id?: string; name: string; icon: string; target_cents: number }): Promise<Result> {
  const { t } = await getActionI18n();
  const name = String(input.name ?? "").trim();
  if (!name) return { error: t.errors.nameEmpty };
  if (name.length > MAX_NAME) return { error: t.errors.nameTooLong };
  if (!Number.isInteger(input.target_cents) || input.target_cents <= 0 || input.target_cents > MAX_CENTS)
    return { error: t.errors.targetPositive };

  const { supabase, household } = await getContext();
  const row = { name, icon: firstEmoji(input.icon) ?? "🎯", target_cents: input.target_cents };
  const result = input.id
    ? await supabase.from("goals").update(row).eq("id", input.id)
    : await supabase.from("goals").insert({ ...row, household_id: household.id });
  if (result.error) return { error: result.error.message };
  refresh();
  return {};
}

/** Sets money aside for a goal (positive) or takes it back out (negative). */
export async function moveGoalMoney(id: string, cents: number): Promise<Result> {
  const { t } = await getActionI18n();
  if (!Number.isInteger(cents) || cents === 0 || Math.abs(cents) > MAX_CENTS) return { error: t.errors.amountPositive };

  const { supabase } = await getContext();
  if (cents < 0) {
    const { data: goal } = await supabase.from("goals").select("saved_cents").eq("id", id).maybeSingle();
    if (!goal) return { error: t.errors.invalidInput };
    if (-cents > goal.saved_cents) return { error: t.errors.takeOutTooMuch };
  }
  const { error } = await supabase.rpc("goal_move", { p_goal: id, p_amount: cents });
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteGoal(id: string): Promise<Result> {
  const { supabase } = await getContext();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}
