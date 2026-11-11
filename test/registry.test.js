import { describe, it, expect } from "vitest";
import source from "../public/registry/demo.json";
import {
  prepareData,
  filterGarages,
  filterOwners,
  ownerGarages,
  rowSummary,
  qualityIssues,
} from "../public/registry/model.js";
const data = prepareData(source);
describe("Fictional registry", () => {
  it("keeps source fields and text numbers intact", () => {
    expect(data.garages[0].number).toBe("01");
    expect(data.garages[0].source).toEqual(source.garages[0].source);
    expect(source.kind).toBe("fictional");
  });
  it("rejects broken IDs and dangling ownership", () => {
    expect(() =>
      prepareData({ ...source, garages: [{ ...source.garages[0], ownerId: "unknown" }] }),
    ).toThrow();
    expect(() =>
      prepareData({ ...source, garages: [source.garages[0], source.garages[0]] }),
    ).toThrow();
  });
  it("links one owner to several garages without merging namesakes", () => {
    expect(ownerGarages(data, "owner-01")).toHaveLength(4);
    const same = filterOwners(data, { q: "Тестовий Олексій" });
    expect(same).toHaveLength(2);
    expect(ownerGarages(data, same[0].id).map((g) => g.id)).not.toEqual(
      ownerGarages(data, same[1].id).map((g) => g.id),
    );
  });
  it("searches case-insensitively by partial name and exact text number", () => {
    expect(filterGarages(data, { q: "  ТЕСТОВА   олена " })).toHaveLength(4);
    expect(filterGarages(data, { q: "1-01" })[0].number).toBe("01");
    expect(filterGarages(data, { q: "12/1" })).toHaveLength(1);
  });
  it("combines filters and returns an honest empty result", () => {
    expect(
      filterGarages(data, { row: "3", missing: true, technical: true }).map((g) => g.number),
    ).toEqual(["3"]);
    expect(filterGarages(data, { row: "1", technical: true })).toEqual([]);
    expect(filterOwners(data, { q: "Тестова", multiple: true })).toHaveLength(1);
  });
  it("sorts numeric rows and box numbers naturally", () => {
    expect(filterGarages(data, { row: "1" }).map((g) => g.number)).toEqual(["01", "2", "10", "11"]);
    expect(rowSummary(data).map((r) => r.row)).toEqual([
      "1",
      "2",
      "3",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
    ]);
  });
  it("accounts for every row and missing row separately", () => {
    expect(
      rowSummary(data).reduce((sum, r) => sum + r.total, 0) +
        data.garages.filter((g) => !g.row).length,
    ).toBe(data.garages.length);
    for (const r of rowSummary(data)) expect(r.owned + r.missing).toBe(r.total);
  });
  it("reports duplicates, omissions, ambiguous numbers and names without deleting records", () => {
    const issues = qualityIssues(data);
    expect([...new Set(issues.map((i) => i.kind))].sort()).toEqual([
      "ambiguous",
      "duplicate",
      "names",
      "number",
      "owner",
      "row",
    ]);
    expect(issues.find((i) => i.kind === "duplicate").garageIds).toHaveLength(2);
    expect(filterGarages(data, { issue: "duplicate" })).toHaveLength(2);
    expect(data.garages).toHaveLength(source.garages.length);
  });
});
