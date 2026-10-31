"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getContext, getUserId } from "@/lib/data";
import { getActionI18n } from "@/i18n/server";
import { friendlyError } from "@/i18n/errors";
import { MAX_NAME } from "@/lib/limits";

export type FormState = { error?: string };

export async function createHousehold(_: FormState, formData: FormData): Promise<FormState> {
  const [{ supabase }, { t }] = await Promise.all([getUserId(), getActionI18n()]);
  const { error } = await supabase.rpc("create_household", {
    p_name: String(formData.get("name") ?? "").trim().slice(0, MAX_NAME),
    p_timezone: String(formData.get("timezone") ?? "UTC"),
  });
  if (error) return { error: friendlyError(error.message, t) };
  redirect("/");
}

export async function joinHousehold(_: FormState, formData: FormData): Promise<FormState> {
  const [{ supabase }, { t }] = await Promise.all([getUserId(), getActionI18n()]);
  const { error } = await supabase.rpc("join_household", {
    p_code: String(formData.get("code") ?? ""),
  });
  if (error) return { error: friendlyError(error.message, t) };
  redirect("/");
}

export async function updateHouseholdName(name: string) {
  const [{ supabase, household }, { t }] = await Promise.all([getContext(), getActionI18n()]);
  const trimmed = name.trim();
  if (!trimmed) return { error: t.errors.nameEmpty };
  if (trimmed.length > MAX_NAME) return { error: t.errors.nameTooLong };
  const { error } = await supabase.from("households").update({ name: trimmed }).eq("id", household.id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function updateMyName(name: string) {
  const [{ supabase, userId }, { t }] = await Promise.all([getContext(), getActionI18n()]);
  const trimmed = name.trim();
  if (!trimmed) return { error: t.errors.nameEmpty };
  if (trimmed.length > MAX_NAME) return { error: t.errors.nameTooLong };
  const { error } = await supabase.from("profiles").update({ name: trimmed }).eq("id", userId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function regenerateInvite() {
  const { supabase } = await getContext();
  const { error } = await supabase.rpc("regenerate_invite_code");
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Money the household had before its first entry; can be negative (a debt). */
export async function saveStartingBalance(cents: number) {
  const [{ supabase, household }, { t }] = await Promise.all([getContext(), getActionI18n()]);
  if (!Number.isInteger(cents) || Math.abs(cents) > 100_000_000_00) return { error: t.errors.invalidAmount };
  const { error } = await supabase
    .from("households")
    .update({ starting_balance_cents: cents })
    .eq("id", household.id);
  if (error) return { error: error.message };
  refresh();
  return {};
}
