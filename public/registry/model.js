// Source fields remain untouched. Normalized fields are derived for display/search.
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("uk");
const compare = new Intl.Collator("uk", { numeric: true, sensitivity: "base" }).compare;
export const garageLabel = (g) => `${g.row || "?"}-${g.number || "?"}`;
export function prepareData(source) {
  if (
    source.kind !== "fictional" ||
    !Array.isArray(source.owners) ||
    !Array.isArray(source.garages)
  )
    throw new Error("Invalid dataset");
  const ids = new Set();
  for (const item of [...source.owners, ...source.garages]) {
    if (!item.id || ids.has(item.id)) throw new Error("Invalid ID");
    ids.add(item.id);
  }
  const owners = source.owners.map((o) => ({ ...o, name: String(o.source.name ?? "").trim() }));
  const ownerById = new Map(owners.map((o) => [o.id, o]));
  const garages = source.garages.map((g) => ({
    ...g,
    row: String(g.source.row ?? "").trim(),
    number: String(g.source.number ?? "").trim(),
  }));
  for (const g of garages)
    if (g.ownerId && !ownerById.has(g.ownerId)) throw new Error("Unknown owner");
  return { owners, garages, ownerById };
}
export function filterGarages(data, filters = {}) {
  const query = normalize(filters.q);
  return data.garages
    .filter((g) => {
      const owner = data.ownerById.get(g.ownerId);
      return (
        (!query || normalize(`${garageLabel(g)} ${owner?.name ?? ""}`).includes(query)) &&
        (!filters.row || g.row === filters.row) &&
        (!filters.missing || !g.ownerId) &&
        (!filters.technical || g.type === "technical") &&
        (!filters.issue ||
          qualityIssues(data).some((i) => i.kind === filters.issue && i.garageIds.includes(g.id)))
      );
    })
    .sort(
      (a, b) =>
        compare(a.row || "\uffff", b.row || "\uffff") ||
        compare(a.number || "\uffff", b.number || "\uffff") ||
        compare(a.id, b.id),
    );
}
export function ownerGarages(data, id) {
  return filterGarages(data).filter((g) => g.ownerId === id);
}
export function filterOwners(data, filters = {}) {
  return data.owners
    .filter(
      (o) =>
        normalize(o.name).includes(normalize(filters.q)) &&
        (!filters.multiple || ownerGarages(data, o.id).length > 1),
    )
    .sort((a, b) => compare(a.name, b.name) || compare(a.id, b.id));
}
export function rowSummary(data) {
  const rows = [...new Set(data.garages.map((g) => g.row).filter(Boolean))].sort(compare);
  return rows.map((row) => {
    const garages = data.garages.filter((g) => g.row === row);
    return {
      row,
      total: garages.length,
      owned: garages.filter((g) => g.ownerId).length,
      missing: garages.filter((g) => !g.ownerId).length,
      technical: garages.filter((g) => g.type === "technical").length,
    };
  });
}
export const issueLabels = {
  duplicate: "Повтор номера в одному ряду",
  row: "Не вказано ряд",
  number: "Не вказано номер",
  owner: "Не вказано власника",
  names: "Однакові імена різних власників",
  ambiguous: "Потрібно уточнити номер",
};
export function qualityIssues(data) {
  const issues = [];
  const keys = new Map();
  const names = new Map();
  const add = (kind, garageIds, ownerIds = []) => issues.push({ kind, garageIds, ownerIds });
  for (const g of data.garages) {
    if (!g.row) add("row", [g.id]);
    if (!g.number) add("number", [g.id]);
    if (!g.ownerId) add("owner", [g.id]);
    if (g.needsNumberReview) add("ambiguous", [g.id]);
    if (g.row && g.number) {
      const key = JSON.stringify([normalize(g.row), normalize(g.number)]);
      keys.set(key, [...(keys.get(key) || []), g.id]);
    }
  }
  for (const group of keys.values()) if (group.length > 1) add("duplicate", group);
  for (const o of data.owners) {
    const name = normalize(o.name);
    if (name) names.set(name, [...(names.get(name) || []), o.id]);
  }
  for (const ownerIds of names.values())
    if (ownerIds.length > 1)
      add(
        "names",
        data.garages.filter((g) => ownerIds.includes(g.ownerId)).map((g) => g.id),
        ownerIds,
      );
  return issues;
}
