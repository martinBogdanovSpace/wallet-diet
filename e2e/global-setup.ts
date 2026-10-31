import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seedData } from "./seed-data";
import { admin, AUTH_DIR, USERS_FILE, type TestUsers } from "./support";

/**
 * Wipes the local test database, re-applies every migration, then creates two
 * test users sharing one household with a few months of history.
 */
export default async function globalSetup() {
  execSync("npx supabase db reset --local", { stdio: "ignore" });

  const password = crypto.randomBytes(12).toString("base64url");
  const users: TestUsers = {
    a: { email: "ana@wallet-diet.test", name: "Ана" },
    b: { email: "boris@wallet-diet.test", name: "Борис" },
    password,
    inviteCode: "",
    householdId: "",
  };

  const db = admin();
  const ids: Record<"a" | "b", string> = { a: "", b: "" };
  const clients = {} as Record<"a" | "b", SupabaseClient>;
  for (const who of ["a", "b"] as const) {
    const { data, error } = await db.auth.admin.createUser({
      email: users[who].email,
      password,
      email_confirm: true,
      user_metadata: { name: users[who].name },
    });
    if (error) throw error;
    ids[who] = data.user.id;
    clients[who] = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    const signIn = await clients[who].auth.signInWithPassword({ email: users[who].email, password });
    if (signIn.error) throw signIn.error;
  }

  // Ana creates the household; Boris joins with its invite code, as in the app.
  const created = await clients.a.rpc("create_household", { p_name: "Тестово домакинство", p_timezone: "Europe/Sofia" });
  if (created.error) throw created.error;
  const householdId = created.data as string;
  const { data: household } = await db.from("households").select("invite_code").eq("id", householdId).single();
  const joined = await clients.b.rpc("join_household", { p_code: household!.invite_code });
  if (joined.error) throw joined.error;
  users.inviteCode = household!.invite_code;
  users.householdId = householdId;

  const seed = seedData();
  const { data: categories } = await db.from("categories").select("id, name").eq("household_id", householdId);
  const categoryId = (name: string) => categories!.find((c) => c.name === name)!.id;

  const check = ({ error }: { error: unknown }) => {
    if (error) throw error;
  };
  check(await db.from("households").update({ starting_balance_cents: seed.startingBalance }).eq("id", householdId));
  check(
    await db.from("transactions").insert(
      seed.entries.map((e) => ({
        household_id: householdId,
        user_id: ids[e.who],
        type: e.type,
        amount_cents: e.cents,
        category_id: e.category ? categoryId(e.category) : null,
        method: e.method,
        occurred_on: e.date,
        note: e.note,
      })),
    ),
  );
  check(
    await db.from("budgets").insert({
      household_id: householdId,
      category_id: categoryId(seed.budget.category),
      monthly_limit_cents: seed.budget.cents,
    }),
  );
  check(
    await db.from("goals").insert({
      household_id: householdId,
      name: seed.goal.name,
      icon: seed.goal.icon,
      target_cents: seed.goal.target,
      saved_cents: seed.goal.saved,
    }),
  );
  check(
    await db.from("recurring").insert({
      household_id: householdId,
      created_by: ids.a,
      type: "expense",
      amount_cents: seed.recurring.cents,
      category_id: categoryId(seed.recurring.category),
      method: "transfer",
      note: seed.recurring.note,
      frequency: "monthly",
      anchor_day: Number(seed.recurring.next.slice(8, 10)),
      next_date: seed.recurring.next,
    }),
  );

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
