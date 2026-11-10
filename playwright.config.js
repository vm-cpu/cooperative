import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:8787",
    launchOptions: { args: ["--no-sandbox"] },
  },
  webServer: {
    command: "python3 -m http.server 8787 --bind 127.0.0.1 --directory public",
    url: "http://localhost:8787",
    reuseExistingServer: true,
  },
  workers: 1,
});
