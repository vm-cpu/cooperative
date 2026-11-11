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
strip("r8", 8, [370, 340], [560, 340], sequence(1, 7), 40);
strip("r7-left", 7, [350, 480], [860, 480], sequence(31, 16), 40);
strip("r7-right", 7, [350, 440], [860, 440], [...sequence(1, 15), "16А"], 40);
strip("r6-left", 6, [330, 600], [1300, 600], unknown(29), 40);
strip("r6-right", 6, [330, 560], [1300, 560], [...unknown(26), 60, 61, 62], 40);
strip("r5-left", 5, [310, 720], [1560, 720], unknown(40), 40);
strip("r5-right", 5, [310, 680], [1560, 680], unknown(40), 40);
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
  { name: "Ряд 1", x: 195, y: 1035 },
  { name: "Ряд 2", x: 215, y: 945 },
  { name: "Ряд 3", x: 235, y: 825 },
  { name: "Ряд 5", x: 255, y: 705 },
  { name: "Ряд 6", x: 275, y: 585 },
  { name: "Ряд 7", x: 295, y: 465 },
  { name: "Ряд 8", x: 315, y: 345 },
  { name: "Ряд 9", x: 1190, y: 210 },
  { name: "Ряд 10", x: 90, y: 590 },
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
