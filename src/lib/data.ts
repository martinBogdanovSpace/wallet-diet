import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categoryNames, localizedCategoryName, type CategoryNames } from "@/i18n/dictionaries";
import { getI18n } from "@/i18n/server";
import type { Budget, Category, Goal, Household, Profile, Recurring, Transaction, YearSummary } from "@/lib/types";

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
      // "*" rather than a column list, so pages still load before the names column exists.
      .select("*")
      .eq("household_id", household.id)
      .order("kind")
      .order("sort")
      .order("name"),
    "categories",
  );
  return (data as (Omit<Category, "names"> & { names?: CategoryNames })[]).map(
    (c): Category => ({
      id: c.id,
      icon: c.icon,
      kind: c.kind,
      sort: c.sort,
      archived: c.archived,
      name: localizedCategoryName(c, locale),
      names: categoryNames(c),
    }),
  );
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

export const SEARCH_LIMIT = 500;

/**
 * Entries from any month whose note contains the text, or whose category is one of `categoryIds`
 * (the categories whose name matches, worked out by the caller). Newest first, at most SEARCH_LIMIT.
 */
export async function searchTransactions(text: string, categoryIds: string[]) {
  const { supabase, household } = await getContext();
  // Quoted, so commas and brackets in the text don't break the filter; "*" is the wildcard.
  const quoted = text.replace(/\*/g, "").replace(/[\\"]/g, (c) => `\\${c}`);
  const filters = [`note.ilike."*${quoted}*"`];
  if (categoryIds.length) filters.push(`category_id.in.(${categoryIds.join(",")})`);
  const data = must(
    await supabase
      .from("transactions")
      .select(TX_COLUMNS)
      .eq("household_id", household.id)
      .or(filters.join(","))
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(SEARCH_LIMIT),
    "search results",
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

/** Money the household had before its first entry; 0 until the database has the column. */
export async function getStartingBalance() {
  const { supabase, household } = await getContext();
  const data = must(await supabase.from("households").select("*").eq("id", household.id).single(), "household");
  return Number((data as { starting_balance_cents?: number } | null)?.starting_balance_cents ?? 0);
}

/** Income and expenses per month, and expenses per category, for one year. */
export async function getYearSummary(year: number) {
  const { supabase } = await getContext();
  const data = must(await supabase.rpc("year_summary", { p_year: year }), "year overview");
  return data as YearSummary;
}

/** Savings goals; empty while the database doesn't have them yet. */
export async function getGoals() {
  const { supabase, household } = await getContext();
  const { data, error } = await supabase
    .from("goals")
    .select("id, name, icon, target_cents, saved_cents")
    .eq("household_id", household.id)
    .order("created_at");
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    throw new Error(`Could not load goals: ${error.message}`);
  }
  return data as Goal[];
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
