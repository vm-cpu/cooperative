import { defineConfig } from "@playwright/test";
import process from "node:process";

// Browser tests run against the real Worker (wrangler dev), so they also see
// security headers, CSP and the environment label, exactly like staging.
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:8787",
    launchOptions: { args: ["--no-sandbox"] },
  },
  webServer: {
    command: "npx wrangler dev --ip 127.0.0.1 --port 8787",
    url: "http://127.0.0.1:8787/api/health",
    env: { WRANGLER_SEND_METRICS: "false" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  workers: 1,
});
