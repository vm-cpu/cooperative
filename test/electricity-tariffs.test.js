import { describe, expect, it } from "vitest";
import { electricityCharge } from "../public/registry/electricity-tariffs.js";
import { parsePeriod } from "../public/registry/payment-data.js";

const reading = (date, value) => ({ date, value });
const tariffs = [
  { date: "2026-10-01", rate: 400 },
  { date: "2026-11-15", rate: 500 },
];

describe("electricity charge", () => {
  it("uses the new rate for all of November after a mid-month change", () => {
    expect(
      electricityCharge(reading("2026-11-01", 100), reading("2026-12-01", 112), tariffs),
    ).toEqual({ period: "2026-11", usage: 12, amount: 6000 });
  });
  it("uses the old rate for October even if the next reading is on November 1", () => {
    expect(
      electricityCharge(reading("2026-10-01", 80), reading("2026-11-01", 100), tariffs),
    ).toEqual({ period: "2026-10", usage: 20, amount: 8000 });
  });
  it("calculates a multi-month interval with a single effective rate", () => {
    expect(
      electricityCharge(reading("2026-11-01", 100), reading("2027-01-01", 120), tariffs),
    ).toEqual({ period: "2026-11 – 2026-12", usage: 20, amount: 10000 });
  });
  it("does not estimate consumption across different monthly rates", () => {
    expect(
      electricityCharge(reading("2026-10-01", 80), reading("2026-12-01", 112), tariffs),
    ).toEqual({ period: "2026-10 – 2026-11", usage: 32, reason: "mixed" });
  });
});

describe("payment period", () => {
  it("accepts a single month or a range spanning two years", () => {
    expect(parsePeriod("11.2026")).toBe("2026-11");
    expect(parsePeriod(" 11.2025 - 11.2026 ")).toBe("2025-11 – 2026-11");
  });
  it("rejects a reversed period and invalid months", () => {
    expect(parsePeriod("11.2026 - 11.2025")).toBeNull();
    expect(parsePeriod("13.2026")).toBeNull();
    expect(parsePeriod("11.0000")).toBeNull();
  });
});
