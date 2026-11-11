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

// Adjacent walls may touch, but buildings must never cover one another.
function overlaps(a, b) {
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i],
        q = polygon[(i + 1) % polygon.length];
      const axis = [-(q[1] - p[1]), q[0] - p[0]];
      const project = (points) => points.map(([x, y]) => x * axis[0] + y * axis[1]);
      const aa = project(a),
        bb = project(b);
      if (Math.min(...aa) >= Math.max(...bb) - 0.001 || Math.min(...bb) >= Math.max(...aa) - 0.001)
        return false;
    }
  }
  return true;
}
it("keeps every building and pit separate from other buildings", () => {
  const shapes = [
    ...planCells,
    ...landmarks.map((l) => ({
      id: l.id,
      points: [
        [l.x - l.w / 2, l.y - l.h / 2],
        [l.x + l.w / 2, l.y - l.h / 2],
        [l.x + l.w / 2, l.y + l.h / 2],
        [l.x - l.w / 2, l.y + l.h / 2],
      ],
    })),
  ];
  const collisions = [];
  for (let i = 0; i < shapes.length; i++)
    for (let j = i + 1; j < shapes.length; j++) {
      if (overlaps(shapes[i].points, shapes[j].points))
        collisions.push(`${shapes[i].id} / ${shapes[j].id}`);
    }
  expect(collisions).toEqual([]);
});
it("starts with horizontal internal rows and the entrance below them", () => {
  for (const row of [
    "r2-left",
    "r2-right",
    "r3-left",
    "r3-right",
    "r5-left",
    "r5-right",
    "r6-left",
    "r6-right",
    "r7-left",
    "r7-right",
    "r8",
  ]) {
    const cells = planCells.filter((c) => c.id.startsWith(row + "-"));
    expect(Math.max(...cells.map((c) => c.y)) - Math.min(...cells.map((c) => c.y))).toBeLessThan(
      0.001,
    );
  }
  const gate = landmarks.find((l) => l.id === "gate");
  expect(gate.y).toBeGreaterThan(
    Math.max(...planCells.filter((c) => c.id.startsWith("r2-")).map((c) => c.y)),
  );
});
