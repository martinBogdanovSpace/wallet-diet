import path from "node:path";
import { expect, test } from "@playwright/test";
import { stateFile } from "./support";

/** Not assertions: a full-page picture of every screen, for looking over after a change. */
const SCREENS = ["/", "/history", "/budgets", "/goals", "/year", "/cash", "/recurring", "/settings", "/settings/categories"];
const OUT = path.join(__dirname, "..", "e2e-screens");

test.use({ storageState: stateFile("a") });

for (const lang of ["bg", "en"] as const) {
  for (const scheme of ["light", "dark"] as const) {
    test(`screens in ${lang}, ${scheme}`, async ({ page, context }) => {
      await context.addCookies([{ name: "lang", value: lang, url: process.env.E2E_BASE_URL! }]);
      await page.emulateMedia({ colorScheme: scheme });
      for (const route of SCREENS) {
        await page.goto(route);
        await expect(page.locator("main h1, main section").first()).toBeVisible();
        await page.waitForLoadState("networkidle");
        const name = route === "/" ? "home" : route.slice(1).replace(/\//g, "-");
        await page.screenshot({ path: path.join(OUT, `${lang}-${scheme}-${name}.png`), fullPage: true });
      }
    });
  }
}
