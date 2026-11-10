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
