import { test as setup } from "@playwright/test";
import { signIn, stateFile, testUsers } from "./support";

// Signs both test users in through the login form once, and keeps their sessions for the other tests.
for (const who of ["a", "b"] as const) {
  setup(`sign in as ${who}`, async ({ page }) => {
    const users = testUsers();
    await signIn(page, users[who].email, users.password);
    await page.context().storageState({ path: stateFile(who) });
  });
}
