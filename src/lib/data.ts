import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";
import { categoryName } from "@/i18n/dictionaries";
import { getI18n } from "@/i18n/server";
import type { Budget, Category, Household, Profile, Recurring, Transaction } from "@/lib/types";

/** The signed-in user's id, or a redirect to /login. */
export const getUserId = cache(async () => {
  // Session checks compare token expiry with the clock, so never prerender past this point.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
});

/**
 * Everything most pages need: user, household and its members.
 * Redirects to onboarding when the user has no household yet.
 * Also posts any recurring entries that have become due.
 */
export const getContext = cache(async () => {
  const { supabase, userId } = await getUserId();

  const { data: membership } = await supabase
    .from("members")
    .select("household_id, households(id, name, timezone, invite_code)")
    .eq("user_id", userId)
    .maybeSingle();

  const household = membership?.households as unknown as Household | null;
  if (!household) redirect("/onboarding");

  const today = todayIn(household.timezone);
  await supabase.rpc("process_recurring", { p_today: today });

  const { data: memberRows } = await supabase
    .from("members")
    .select("user_id")
    .eq("household_id", household.id);
  const ids = (memberRows ?? []).map((m) => m.user_id as string);
  const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", ids);

  const members = (profiles ?? []) as Profile[];
  const me = members.find((m) => m.id === userId) ?? { id: userId, name: "Me" };

  return { supabase, userId, me, household, members, today };
});

/** Categories with default names translated to the page language. Server Components only. */
export const getCategories = cache(async () => {
  const [{ supabase, household }, { locale }] = await Promise.all([getContext(), getI18n()]);
  const { data } = await supabase
    .from("categories")
    .select("id, name, icon, kind, sort, archived")
    .eq("household_id", household.id)
    .order("kind")
    .order("sort")
    .order("name");
  return ((data ?? []) as Category[]).map((c) => ({ ...c, name: categoryName(c.name, locale) }));
});

export async function getTransactions(range: { start: string; end: string }) {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("transactions")
    .select("id, user_id, type, amount_cents, category_id, method, occurred_on, note, recurring_id, created_at")
    .eq("household_id", household.id)
    .gte("occurred_on", range.start)
    .lte("occurred_on", range.end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Transaction[];
}

export async function getTransaction(id: string) {
  const { supabase } = await getContext();
  const { data } = await supabase
    .from("transactions")
    .select("id, user_id, type, amount_cents, category_id, method, occurred_on, note, recurring_id, created_at")
    .eq("id", id)
    .maybeSingle();
  return data as Transaction | null;
}

/** Cash on hand: cash income + ATM withdrawals + adjustments − cash expenses. */
export async function getCashBalance() {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("transactions")
    .select("type, amount_cents, method")
    .eq("household_id", household.id)
    .or("method.eq.cash,type.eq.withdrawal");
  let total = 0;
  for (const t of data ?? []) {
    if (t.type === "expense") total -= t.amount_cents;
    else total += t.amount_cents;
  }
  return total;
}

export async function getBudgets() {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("budgets")
    .select("category_id, monthly_limit_cents")
    .eq("household_id", household.id);
  return (data ?? []) as Budget[];
}

export async function getRecurring() {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("recurring")
    .select("id, type, amount_cents, category_id, method, note, frequency, anchor_day, next_date, active")
    .eq("household_id", household.id)
    .order("next_date");
  return (data ?? []) as Recurring[];
}
