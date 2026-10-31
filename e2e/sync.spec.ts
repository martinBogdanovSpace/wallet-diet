import { expect, test } from "@playwright/test";
import { cleanup, MARK, openAddDrawer, stateFile, t, typeAmount } from "./support";

test.afterAll(cleanup);

test("an entry added on one phone appears on the other without reloading", async ({ browser }) => {
  const ana = await browser.newContext({ storageState: stateFile("a") });
  const boris = await browser.newContext({ storageState: stateFile("b") });
  const anaPage = await ana.newPage();
  const borisPage = await boris.newPage();
  const note = `${MARK}синхронизация ${Date.now()}`;

  await borisPage.goto("/history");
  await anaPage.goto("/");
  const drawer = await openAddDrawer(anaPage);
  await typeAmount(drawer, "7");
  await drawer.getByRole("button", { name: /Хранителни стоки/ }).click();
  await drawer.getByLabel(t.tx.note).fill(note);
  await drawer.getByRole("button", { name: t.common.save, exact: true }).click();

  await expect(borisPage.getByText(note)).toBeVisible({ timeout: 15_000 });
  await ana.close();
  await boris.close();
});
