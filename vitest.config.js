import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";

export default defineConfig({
  test: { include: ["test/**/*.test.js"] },
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
});
