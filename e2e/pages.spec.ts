import { expect, test } from "@playwright/test";
import { fmt } from "../src/i18n/config";
import { seedData } from "./seed-data";
import { admin, cleanup, errorText, MARK, money, stateFile, t, testUsers } from "./support";

test.use({ storageState: stateFile("a") });
test.afterAll(cleanup);

test("search finds entries from any month", async ({ page }) => {
  await page.goto("/history");
  await page.getByLabel(t.history.search).fill("марешки");
  await expect(page.getByText(t.history.searchAll)).toBeVisible();
  await expect(page.getByRole("link", { name: /Аптека Марешки/ })).toContainText(money(2350));
  // A category name in the other language finds entries too.
  await page.getByLabel(t.history.search).fill("groceries");
  await expect(page.getByRole("link", { name: /Lidl голямо пазаруване/ })).toBeVisible();
});

test("filters narrow the list and show how many entries match", async ({ page }) => {
  await page.goto("/history");
  await page.getByRole("button", { name: t.history.filters }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: t.dashboard.income, exact: true }).click();
  await expect(drawer.getByRole("button", { name: fmt(t.history.show, { count: 1 }) })).toBeVisible();
  await drawer.getByRole("button", { name: fmt(t.history.show, { count: 1 }) }).click();
  await expect(page.getByRole("link", { name: /Заплата/ })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Пазар/ })).toHaveCount(0);
});

test("year overview totals the year", async ({ page }) => {
  const seed = seedData();
  const year = seed.today.slice(0, 4);
  const saved = seed.expected.net(seed.entries.filter((e) => e.date.startsWith(year)));
  await page.goto("/year");
  await expect(page.getByText(fmt(saved < 0 ? t.year.overspent : t.year.saved, { year }))).toBeVisible();
  await expect(page.locator("section").first()).toContainText(money(Math.abs(saved)));
  await expect(page.getByRole("heading", { name: t.year.byMonth })).toBeVisible();
});

test("budgets show spending against the limit", async ({ page }) => {
  const seed = seedData();
  await page.goto("/budgets");
  const row = page.getByRole("button", { name: /Хранителни стоки/ });
  await expect(row).toContainText(money(12345));
  await expect(row).toContainText(money(seed.budget.cents));
});

test("money can be put into a goal and not over-withdrawn", async ({ page }) => {
  const seed = seedData();
  await page.goto("/goals");
  await page.getByRole("button", { name: new RegExp(seed.goal.name) }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel(t.goals.amount).fill("100");
  await drawer.getByRole("button", { name: t.goals.putIn }).click();
  await expect(page.getByRole("status")).toHaveText(t.common.saved);
  const goal = page.getByRole("button", { name: new RegExp(seed.goal.name) });
  await expect(goal).toContainText(money(seed.goal.saved + 10000));

  await goal.click();
  await drawer.getByLabel(t.goals.amount).fill("99999");
  await drawer.getByRole("button", { name: t.goals.takeOut }).click();
  await expect(errorText(drawer)).toHaveText(t.errors.takeOutTooMuch);

  // Put the goal back as it was for the other tests.
  await admin().from("goals").update({ saved_cents: seed.goal.saved }).eq("name", seed.goal.name);
});

test("a recurring rule dated today is posted straight away", async ({ page }) => {
  const note = `${MARK}Нетфликс`;
  await page.goto("/recurring");
  await page.getByRole("button", { name: t.recurring.add }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel(t.recurring.name).fill(note);
  await drawer.getByLabel(t.recurring.amount).fill("15,99");
  await drawer.getByLabel(t.tx.category).selectOption({ label: "📱 Абонаменти" });
  await drawer.getByRole("button", { name: t.common.save, exact: true }).click();
  await expect(drawer).toBeHidden();
  await page.goto("/history");
  await expect(page.getByRole("link", { name: new RegExp(note) })).toContainText(money(1599));
});

test("categories keep a name per language", async ({ page, context }) => {
  await page.goto("/settings/categories");
  await page.getByRole("button", { name: t.categories.add }).click();
  const form = page.locator("form");
  await form.getByRole("textbox").nth(0).fill("Детска градина");
  await form.getByRole("textbox").nth(1).fill("Kindergarten");
  await form.getByRole("button", { name: t.common.save }).click();
  await expect(page.getByText("Детска градина", { exact: true })).toBeVisible();

  await context.addCookies([{ name: "lang", value: "en", url: process.env.E2E_BASE_URL! }]);
  await page.reload();
  await expect(page.getByText("Kindergarten", { exact: true })).toBeVisible();
  await context.addCookies([{ name: "lang", value: "bg", url: process.env.E2E_BASE_URL! }]);
  await admin().from("categories").delete().eq("name", "Kindergarten");
});

test("CSV export has every entry, for Bulgarian Excel", async ({ page }) => {
  const response = await page.request.get("/export");
  expect(response.headers()["content-type"]).toContain("text/csv");
  const csv = await response.text();
  expect(csv.startsWith("﻿Дата;Вид;Сума (EUR);Категория;Начин;Кой;Бележка")).toBe(true);
  expect(csv).toContain("Аптека Марешки");
  expect(csv).toContain(";-23,50;");
  expect(csv).toContain(testUsers().b.name);
});
