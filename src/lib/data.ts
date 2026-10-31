import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

/** Stops rendering with a real error instead of carrying on with empty data. */
function must<T>({ data, error }: { data: T | null; error: { message: string } | null }, what: string): T {
  if (error) throw new Error(`Could not load ${what}: ${error.message}`);
  return data as T;
}

/**
 * Everything most pages need: user, household, its members and today's date.
 * Redirects to onboarding when the user has no household yet.
 * The database also posts any recurring entries that have become due.
 */
export const getContext = cache(async () => {
  const { supabase, userId } = await getUserId();
  const context = must(
    await supabase.rpc("app_context"),
    "household",
  ) as { household: Household; members: Profile[]; today: string } | null;
  if (!context) redirect("/onboarding");

  const { household, members, today } = context;
  const me = members.find((m) => m.id === userId) ?? { id: userId, name: "Me" };
  return { supabase, userId, me, household, members, today };
});

/** Categories with default names translated to the page language. Server Components only. */
export const getCategories = cache(async () => {
  const [{ supabase, household }, { locale }] = await Promise.all([getContext(), getI18n()]);
  const data = must(
    await supabase
      .from("categories")
      .select("id, name, icon, kind, sort, archived")
      .eq("household_id", household.id)
      .order("kind")
      .order("sort")
      .order("name"),
    "categories",
  );
  return (data as Category[]).map((c) => ({ ...c, name: categoryName(c.name, locale) }));
});

const TX_COLUMNS =
  "id, user_id, type, amount_cents, category_id, method, occurred_on, note, recurring_id, created_at";

export async function getTransactions(range: { start: string; end: string }) {
  const { supabase, household } = await getContext();
  const data = must(
    await supabase
      .from("transactions")
      .select(TX_COLUMNS)
      .eq("household_id", household.id)
      .gte("occurred_on", range.start)
      .lte("occurred_on", range.end)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    "entries",
  );
  return data as Transaction[];
}

export async function getTransaction(id: string) {
  const { supabase } = await getContext();
  const data = must(await supabase.from("transactions").select(TX_COLUMNS).eq("id", id).maybeSingle(), "entry");
  return data as Transaction | null;
}

/** Cash on hand: cash income + ATM withdrawals + adjustments − cash expenses, summed by the database. */
export async function getCashBalance() {
  const { supabase } = await getContext();
  return Number(must(await supabase.rpc("cash_balance"), "cash balance"));
}

/**
 * Income minus expenses of everything before a date: the money carried into that month.
 * Null while the database function is missing, so the home screen still works without it.
 */
export async function getBalanceBefore(date: string) {
  const { supabase } = await getContext();
  const { data, error } = await supabase.rpc("balance_before", { p_date: date });
  if (error) {
    if (error.code === "PGRST202") return null;
    throw new Error(`Could not load carried-over balance: ${error.message}`);
  }
  return Number(data);
}

export async function getBudgets() {
  const { supabase, household } = await getContext();
  const data = must(
    await supabase.from("budgets").select("category_id, monthly_limit_cents").eq("household_id", household.id),
    "budgets",
  );
  return data as Budget[];
}

export async function getRecurring() {
  const { supabase, household } = await getContext();
  const data = must(
    await supabase
      .from("recurring")
      .select("id, type, amount_cents, category_id, method, note, frequency, anchor_day, next_date, active")
      .eq("household_id", household.id)
      .order("next_date"),
    "recurring entries",
  );
  return data as Recurring[];
}
