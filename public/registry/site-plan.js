// Schematic tracing of the three supplied paper-plan photographs.
// Geometry is approximate, not a survey. Null numbers require owner confirmation.
const cells = [];
function strip(id, row, start, end, numbers, width = 52) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  const nx = ((-dy / length) * width) / 2;
  const ny = ((dx / length) * width) / 2;
  numbers.forEach((number, i) => {
    const a = i / numbers.length;
    const b = (i + 1) / numbers.length;
    const x = start[0] + dx * a;
    const y = start[1] + dy * a;
    const xx = start[0] + dx * b;
    const yy = start[1] + dy * b;
    cells.push({
      id: `${id}-${String(i + 1).padStart(3, "0")}`,
      row: String(row),
      strip: id,
      number: number === null ? null : String(number),
      points: [
        [x + nx, y + ny],
        [xx + nx, yy + ny],
        [xx - nx, yy - ny],
        [x - nx, y - ny],
      ],
      x: (x + xx) / 2,
      y: (y + yy) / 2,
    });
  });
}
const sequence = (first, last) =>
  Array.from({ length: Math.abs(last - first) + 1 }, (_, i) => first + Math.sign(last - first) * i);
const unknown = (count) => Array(count).fill(null);
// One horizontal coordinate system, matching the user's entrance-side reference.
// Historical slot IDs and uncertain numbering stay unchanged while geometry is corrected.
strip("west", 1, [150, 1080], [1350, 1080], sequence(47, 1), 40);
strip("north", 10, [100, 1080], [300, 100], sequence(1, 40), 40);
strip(
  "east",
  9,
  [350, 80],
  [2100, 420],
  sequence(0, 69).map((n) => (n >= 32 && n <= 35 ? null : n)),
  40,
);
strip("south", 9, [2100, 465], [2000, 850], [null, 71, 72, 73], 70);
strip("entry-east", 9, [2130, 1080], [1680, 1080], [null, ...sequence(75, 87)], 40);
strip("r8", 8, [370, 220], [560, 220], sequence(1, 7), 40);
strip("r7-left", 7, [350, 360], [860, 360], sequence(31, 16), 40);
strip("r7-right", 7, [350, 320], [860, 320], [...sequence(1, 15), "16А"], 40);
strip("r6-left", 6, [330, 480], [1300, 480], unknown(29), 40);
strip("r6-right", 6, [330, 440], [1300, 440], [...unknown(26), 60, 61, 62], 40);
strip("r5-left", 5, [310, 600], [1560, 600], unknown(40), 40);
strip("r5-right", 5, [310, 560], [1560, 560], unknown(40), 40);
// Provisional double-sided row approved for the demo. Keep its status visible.
strip("r4-right", 4, [300, 680], [1571, 680], sequence(1, 41), 40);
strip("r4-left", 4, [300, 720], [1664, 720], sequence(42, 85), 40);
strip("r3-left", 3, [290, 840], [1750, 840], unknown(48), 40);
strip("r3-right", 3, [290, 800], [1580, 800], unknown(44), 40);
strip("r2-left", 2, [270, 960], [1900, 960], [...unknown(52), 110, 108, 106, 104, 102, 100], 40);
strip("r2-right", 2, [270, 920], [1900, 920], [...unknown(52), 111, 109, 107, 105, 103, 101], 40);
export const planCells = cells;
export const landmarks = [
  { id: "gate", name: "КПП", x: 1618, y: 1115, w: 72, h: 54 },
  { id: "office", name: "Правління", x: 1668, y: 795, w: 160, h: 46 },
  ...[0, 1, 2, 3].map((i) => ({
    id: `pit-${i + 1}`,
    name: "Яма",
    x: 1376 + i * 48,
    y: 1080,
    w: 40,
    h: 40,
  })),
];
export const rowLabels = [
  { name: "Ряд 1", x: 500, y: 1155 },
  { name: "Ряд 2", x: 222, y: 944 },
  { name: "Ряд 3", x: 244, y: 824 },
  { name: "Ряд 4", x: 254, y: 704 },
  { name: "Ряд 5", x: 264, y: 584 },
  { name: "Ряд 6", x: 288, y: 464 },
  { name: "Ряд 7", x: 310, y: 344 },
  { name: "Ряд 8", x: 420, y: 168 },
  { name: "Ряд 9", x: 1330, y: 210 },
  { name: "Ряд 10", x: 90, y: 645 },
];
export const entrance = { x: 1618, y: 1200 };
// Bounds include label space, not just polygons; fitting uses the actual screen aspect ratio.
export const planFrame = { x: 20, y: 20, width: 2150, height: 1240 };
export function planLabel(cell) {
  return cell.number === null ? `? · ${cell.id}` : `${cell.row}-${cell.number}`;
}
export function findRegistryGarage(data, cell) {
  if (cell.number === null) return null;
  const normalizeNumber = (n) => String(n).replace(/^0+(?=\d)/, "");
  const matches = data.garages.filter(
    (g) => g.row === cell.row && normalizeNumber(g.number) === normalizeNumber(cell.number),
  );
  return matches.length === 1 ? matches[0] : null;
}

export function rowParts(row) {
  const cells = planCells.filter((cell) => cell.row === row);
  if (row === "1") cells.reverse();
  const strips = [...new Set(cells.map((cell) => cell.strip))];
  const doubleSided = strips.some((strip) => strip.endsWith("-right"));
  const groups = doubleSided
    ? [[strips.find((s) => s.endsWith("-right")), strips.find((s) => s.endsWith("-left"))]]
    : strips.map((strip) => [strip]);
  const pages = [];
  for (const group of groups) {
    const lanes = group.map((strip) => cells.filter((cell) => cell.strip === strip));
    const count = doubleSided ? 3 : 6;
    for (let i = 0; i < Math.max(...lanes.map((lane) => lane.length)); i += count) {
      pages.push(lanes.map((lane) => lane.slice(i, i + count)));
    }
  }
  return pages;
}

export function withPlanGarages(source) {
  // Reuse every existing ID, including ambiguous records and leading-zero numbers.
  const key = (row, number) => JSON.stringify([row, String(number).replace(/^0+(?=\d)/, "")]);
  const existing = new Set(source.garages.map((g) => key(g.source.row, g.source.number)));
  const emptyGarages = planCells
    .filter((c) => c.number !== null && !existing.has(key(c.row, c.number)))
    .map((c) => ({
      id: "plan-" + c.id,
      source: { row: c.row, number: c.number },
      ownerId: null,
      type: "garage",
      provisional: c.row === "4",
    }));
  return { ...source, garages: [...source.garages, ...emptyGarages] };
}
