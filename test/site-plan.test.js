import { describe, it, expect } from "vitest";
import { planCells, findRegistryGarage, landmarks } from "../public/registry/site-plan.js";

describe("site plan references", () => {
  it("has stable unique slots, valid geometry and explicit unknown numbers", () => {
    expect(new Set(planCells.map((c) => c.id)).size).toBe(planCells.length);
    const keys = planCells.filter((c) => c.number !== null).map((c) => `${c.row}-${c.number}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(planCells.some((c) => c.number === null)).toBe(true);
    for (const cell of planCells) expect(cell.points.flat().every(Number.isFinite)).toBe(true);
    expect(landmarks.filter((l) => l.name === "Яма")).toHaveLength(4);
  });
  it("does not attach uncertain or ambiguous numbers to a registry record", () => {
    const cell = { row: "1", number: "1" };
    const data = { garages: [{ id: "demo", row: "1", number: "01" }] };
    expect(findRegistryGarage(data, cell)?.id).toBe("demo");
    expect(findRegistryGarage(data, { row: "1", number: null })).toBeNull();
    data.garages.push({ id: "another", row: "1", number: "1" });
    expect(findRegistryGarage(data, cell)).toBeNull();
  });
});
