import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Worker", () => {
  it("GET /api/health повертає ok: true", async () => {
    const res = await exports.default.fetch("https://example.com/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("GET / віддає стартову сторінку", async () => {
    const res = await exports.default.fetch("https://example.com/");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Кооператив");
  });
});

describe("Environment isolation", () => {
  it("does not expose business APIs before application authentication", async () => {
    for (const method of ["GET", "POST", "DELETE"]) {
      const response = await exports.default.fetch("https://example.com/api/owners", { method });
      expect(response.status).toBe(401);
    }
  });

  it("does not cache the environment page", async () => {
    const response = await exports.default.fetch("https://example.com/");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });
});

import worker from "../src/index.js";
import config from "../wrangler.jsonc?raw";

describe("Deployment configuration", () => {
  it("uses separate storage and disables unprotected preview URLs", () => {
    const { env, ...local } = JSON.parse(config);
    expect(local.d1_databases).toBeUndefined();
    expect(local.r2_buckets).toBeUndefined();
    expect(local.workers_dev).toBe(false);
    expect(local.preview_urls).toBe(false);
    expect(env.staging.d1_databases[0].database_id).not.toBe(
      env.production.d1_databases[0].database_id,
    );
    expect(env.staging.r2_buckets[0].bucket_name).not.toBe(
      env.production.r2_buckets[0].bucket_name,
    );
  });

  it.each([
    ["staging", "Тестове середовище"],
    ["production", "Робоче середовище"],
  ])("labels %s correctly", async (environment, label) => {
    const env = {
      APP_ENV: environment,
      ASSETS: {
        fetch: () =>
          new Response("<p data-environment></p><p data-description></p>", {
            headers: { "Content-Type": "text/html" },
          }),
      },
    };
    const response = await worker.fetch(new Request("https://example.com/"), env);
    expect(await response.text()).toContain(label);
    const health = await worker.fetch(new Request("https://example.com/api/health"), env);
    expect((await health.json()).environment).toBe(environment);
  });
});
