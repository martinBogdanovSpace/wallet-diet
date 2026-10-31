import { expect, test } from "@playwright/test";
import { admin, errorText, t, testUsers } from "./support";

const stamp = Date.now();

test.afterAll(async () => {
  // Remove the accounts and household this test made.
  const db = admin();
  const { data } = await db.auth.admin.listUsers();
  for (const user of data.users.filter((u) => u.email?.includes(`+${stamp}@`))) {
    const { data: membership } = await db.from("members").select("household_id").eq("user_id", user.id).maybeSingle();
    if (membership && membership.household_id !== testUsers().householdId) {
      await db.from("households").delete().eq("id", membership.household_id);
    }
    await db.auth.admin.deleteUser(user.id);
  }
});

test("sign up checks the repeated password, then sets up a household", async ({ page }) => {
  const password = `Pw-${stamp}-ok`;
  await page.goto("/login");
  await page.getByRole("button", { name: t.login.createAccount }).first().click();
  await page.getByLabel(t.login.yourName).fill("Нов");
  await page.getByLabel(t.login.email).fill(`new+${stamp}@wallet-diet.test`);
  await page.getByLabel(t.login.password, { exact: true }).fill(password);
  await page.getByLabel(t.login.confirmPassword).fill(`${password}x`);
  await page.locator("form").getByRole("button", { name: t.login.createAccount }).click();
  await expect(errorText(page)).toHaveText(t.errors.passwordMismatch);

  await page.getByLabel(t.login.confirmPassword).fill(password);
  await page.locator("form").getByRole("button", { name: t.login.createAccount }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByPlaceholder(t.onboarding.namePlaceholder).fill("Ново домакинство");
  await page.getByRole("button", { name: t.onboarding.create }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(t.dashboard.emptyTitle)).toBeVisible();
});

test("an invite link lets a new person join the household", async ({ page }) => {
  const { inviteCode } = testUsers();
  await page.goto(`/join/${inviteCode}`);
  // Not signed in: the login page opens on "create account", then comes back to the invite.
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel(t.login.yourName).fill("Гост");
  await page.getByLabel(t.login.email).fill(`guest+${stamp}@wallet-diet.test`);
  await page.getByLabel(t.login.password, { exact: true }).fill(`Pw-${stamp}-ok`);
  await page.getByLabel(t.login.confirmPassword).fill(`Pw-${stamp}-ok`);
  await page.locator("form").getByRole("button", { name: t.login.createAccount }).click();
  await expect(page).toHaveURL(new RegExp(`/join/${inviteCode}`));
  await page.getByRole("button", { name: t.onboarding.join }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings");
  await expect(page.getByText("Гост")).toBeVisible();
  await expect(page.getByText(testUsers().a.name).first()).toBeVisible();
});
