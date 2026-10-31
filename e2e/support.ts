import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { formatEUR } from "../src/lib/money";
import { bg } from "../src/i18n/bg";

export const t = bg;
export const AUTH_DIR = path.join(__dirname, ".auth");
export const USERS_FILE = path.join(AUTH_DIR, "users.json");
export const stateFile = (who: "a" | "b") => path.join(AUTH_DIR, `${who}.json`);

export type TestUsers = {
  a: { email: string; name: string };
  b: { email: string; name: string };
  password: string;
  inviteCode: string;
  householdId: string;
};

export function testUsers(): TestUsers {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

/** Full access to the local test database, for setting up and cleaning up. */
export function admin() {
  return createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

/** An amount as the Bulgarian app shows it, matching any kind of space. */
export function money(cents: number) {
  const text = formatEUR(cents, "bg").replace(/[\s\u00a0\u202f]/g, " ");
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[\\s\\u00a0\\u202f]"));
}

/** Prefix for anything a test creates, so cleanup can find it. */
export const MARK = "e2e·";

export async function cleanup() {
  const db = admin();
  await db.from("transactions").delete().like("note", `${MARK}%`);
  await db.from("recurring").delete().like("note", `${MARK}%`);
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(t.login.email).fill(email);
  await page.getByLabel(t.login.password, { exact: true }).fill(password);
  await page.locator("form").getByRole("button", { name: t.login.signIn }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Opens the add drawer from the floating + button. */
export async function openAddDrawer(page: Page) {
  // Until the drawer is live, + falls back to the add page.
  await expect(page.locator("html[data-quick-add=ready]")).toBeAttached();
  await page.locator("nav").getByRole("button", { name: t.nav.add }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  return drawer;
}

/** The app's own error messages (Next.js has a hidden route announcer with the same role). */
export function errorText(scope: Page | ReturnType<Page["getByRole"]>) {
  return scope.locator("p[role=alert]");
}

/** Types an amount on the drawer's keypad, e.g. "42,5". */
export async function typeAmount(drawer: ReturnType<Page["getByRole"]>, amount: string) {
  for (const key of amount) {
    await drawer.getByRole("button", { name: key, exact: true }).click();
  }
}
