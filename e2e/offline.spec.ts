import { expect, test } from "@playwright/test";
import { fmt } from "../src/i18n/config";
import { cleanup, MARK, openAddDrawer, stateFile, t, typeAmount } from "./support";

test.use({ storageState: stateFile("a") });
test.afterAll(cleanup);

test("an entry made offline waits on the phone and syncs once when back online", async ({ page, context }) => {
  const note = `${MARK}офлайн ${Date.now()}`;
  await page.goto("/");

  await context.setOffline(true);
  const drawer = await openAddDrawer(page);
  await typeAmount(drawer, "3");
  await drawer.getByRole("button", { name: /Хранителни стоки/ }).click();
  await drawer.getByLabel(t.tx.note).fill(note);
  await drawer.getByRole("button", { name: t.common.save, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(t.offline.queued);
  await expect(page.getByText(fmt(t.offline.pending, { count: 1 }))).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText(fmt(t.offline.synced, { count: 1 }))).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(fmt(t.offline.pending, { count: 1 }))).toBeHidden();

  await page.reload();
  await expect(page.getByText(note)).toHaveCount(1);
});
