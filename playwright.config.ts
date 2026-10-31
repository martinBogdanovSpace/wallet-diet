import { execSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Reads the local Supabase's address and keys from the CLI, once; worker processes inherit them.
 * The tests only ever run against this local stack, never against the real project.
 */
function localSupabase() {
  if (!process.env.E2E_SUPABASE_URL) {
    let out: string;
    try {
      out = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      throw new Error("Local Supabase isn't running. Start Docker Desktop, then run: npx supabase start");
    }
    const vars = Object.fromEntries(
      out
        .split(/\r?\n/)
        .map((line) => line.match(/^(\w+)="?(.*?)"?$/))
        .filter((m): m is RegExpMatchArray => !!m)
        .map((m) => [m[1], m[2]]),
    );
    process.env.E2E_SUPABASE_URL = vars.API_URL;
    process.env.E2E_PUBLISHABLE_KEY = vars.PUBLISHABLE_KEY || vars.ANON_KEY;
    process.env.E2E_SERVICE_KEY = vars.SECRET_KEY || vars.SERVICE_ROLE_KEY;
    process.env.E2E_BASE_URL = BASE_URL;
  }
  const url = new URL(process.env.E2E_SUPABASE_URL!);
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error(`Refusing to run end-to-end tests against ${url.host}: only a local Supabase is allowed.`);
  }
  return { url: process.env.E2E_SUPABASE_URL!, key: process.env.E2E_PUBLISHABLE_KEY! };
}

const supabase = localSupabase();

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // One shared household, so tests run one after another.
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    // A phone in Bulgarian, the way the app is used day to day.
    ...devices["Pixel 7"],
    channel: "chrome",
    locale: "bg-BG",
    timezoneId: "Europe/Sofia",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "app", dependencies: ["setup"], testIgnore: /auth\.setup\.ts/ },
  ],
  webServer: {
    // A production build of its own, pointed at the local Supabase.
    command: `npx next build && npx next start -p ${PORT}`,
    url: `${BASE_URL}/login`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.key,
      NEXT_PUBLIC_SITE_URL: BASE_URL,
    },
  },
});
