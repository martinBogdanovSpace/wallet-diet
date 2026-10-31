import { expect, test } from "@playwright/test";
import { seedData } from "./seed-data";
import { money, stateFile, t } from "./support";

test.use({ storageState: stateFile("a") });

test("home card adds this month to what was carried over", async ({ page }) => {
  const seed = seedData();
  await page.goto("/");
  const card = page.locator("section").filter({ hasText: t.dashboard.carried }).first();

  await expect(card.getByText(t.dashboard.available, { exact: true })).toBeVisible();
  await expect(card).toContainText(money(seed.expected.carriedIntoMonth + seed.expected.thisMonth));
  await expect(card.getByText(t.dashboard.thisMonth)).toContainText(money(seed.expected.thisMonth));
  await expect(card.getByText(t.dashboard.carried)).toContainText(money(seed.expected.carriedIntoMonth));
});

test("a past month shows the balance at its end", async ({ page }) => {
  const seed = seedData();
  await page.goto(`/?m=${seed.prev}`);
  const card = page.locator("section").filter({ hasText: t.dashboard.carried }).first();
  await expect(card.getByText(t.dashboard.monthEnd, { exact: true })).toBeVisible();
  await expect(card).toContainText(money(seed.expected.carriedIntoPrev + seed.expected.prevMonth));
});

test("cash wallet counts cash payments and ATM withdrawals", async ({ page }) => {
  const seed = seedData();
  await page.goto("/");
  await expect(page.getByRole("link", { name: new RegExp(t.dashboard.cashOnHand) })).toContainText(
    money(seed.expected.cash),
  );
});

test("goals show what's set aside and what's free", async ({ page }) => {
  const seed = seedData();
  await page.goto("/");
  const goalsLine = page.getByRole("link", { name: new RegExp(t.dashboard.inGoals) });
  await expect(goalsLine).toContainText(money(seed.goal.saved));
  await expect(goalsLine).toContainText(
    money(seed.expected.carriedIntoMonth + seed.expected.thisMonth - seed.goal.saved),
  );
});
