import { expect, test } from "@playwright/test";
import { cleanup, MARK, money, openAddDrawer, stateFile, errorText, t, typeAmount } from "./support";

test.use({ storageState: stateFile("a") });
test.afterAll(cleanup);

test("add, edit and delete an entry in the drawer", async ({ page }) => {
  const note = `${MARK}кафе ${Date.now()}`;
  await page.goto("/");

  // Add
  const drawer = await openAddDrawer(page);
  await typeAmount(drawer, "4,5");
  await expect(drawer.getByText(/4,5\s*€/)).toBeVisible();
  await drawer.getByRole("button", { name: /Заведения/ }).click();
  await drawer.getByRole("button", { name: t.methods.cash }).click();
  await drawer.getByLabel(t.tx.note).fill(note);
  await drawer.getByRole("button", { name: t.common.save, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(t.common.saved);
  await expect(drawer).toBeHidden();
  const row = page.getByRole("link", { name: new RegExp(note) });
  await expect(row).toContainText(money(450));

  // Edit: the drawer opens with the entry filled in
  await row.click();
  await expect(drawer.getByRole("heading", { name: t.tx.editTitle })).toBeVisible();
  await expect(drawer.getByText(/4,50\s*€/)).toBeVisible();
  // 4,50 → 4 → 45
  for (let i = 0; i < 3; i++) await drawer.getByRole("button", { name: t.tx.deleteDigit }).click();
  await typeAmount(drawer, "5");
  await drawer.getByRole("button", { name: t.common.saveChanges }).click();
  await expect(drawer).toBeHidden();
  await expect(row).toContainText(money(4500));

  // Delete takes a second tap, and Cancel backs out
  await row.click();
  await drawer.getByRole("button", { name: t.common.delete, exact: true }).click();
  await expect(drawer.getByRole("button", { name: t.common.saveChanges })).toBeHidden();
  await drawer.getByRole("button", { name: t.common.cancel }).click();
  await expect(drawer.getByRole("button", { name: t.common.saveChanges })).toBeVisible();
  await drawer.getByRole("button", { name: t.common.delete, exact: true }).click();
  await drawer.getByRole("button", { name: t.common.confirmDelete }).click();
  await expect(page.getByRole("status")).toHaveText(t.common.deleted);
  await expect(row).toHaveCount(0);
});

test("the drawer refuses a save without an amount or category", async ({ page }) => {
  await page.goto("/");
  const drawer = await openAddDrawer(page);
  await drawer.getByRole("button", { name: t.common.save, exact: true }).click();
  await expect(errorText(drawer)).toHaveText(t.errors.enterAmount);
  await typeAmount(drawer, "12");
  await drawer.getByRole("button", { name: t.common.save, exact: true }).click();
  await expect(errorText(drawer)).toHaveText(t.errors.pickCategory);
});

test("an ATM withdrawal moves money into the cash wallet", async ({ page }) => {
  await page.goto("/cash");
  const before = await page.locator("section").first().locator("p.font-serif").innerText();
  await page.getByRole("button", { name: new RegExp(t.cash.atm) }).click();
  const drawer = page.getByRole("dialog");
  await typeAmount(drawer, "50");
  await drawer.getByLabel(t.tx.note).fill(`${MARK}банкомат`);
  await drawer.getByRole("button", { name: t.common.save, exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(page.locator("section").first().locator("p.font-serif")).not.toHaveText(before);
  await expect(page.getByText(`${MARK}банкомат`)).toBeVisible();
});
