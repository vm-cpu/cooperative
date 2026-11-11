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
strip("west", 1, [85, 160], [355, 1090], sequence(47, 1));
strip("north", 10, [130, 85], [955, 85], sequence(1, 40));
strip(
  "east",
  9,
  [995, 135],
  [995, 1490],
  sequence(0, 69).map((n) => (n >= 32 && n <= 35 ? null : n)),
);
strip("south", 9, [965, 1530], [600, 1530], [null, 71, 72, 73], 80);
strip("entry-east", 9, [550, 1480], [450, 1215], [null, ...sequence(75, 87)], 70);
strip("r8", 8, [775, 220], [810, 365], sequence(1, 7));
strip("r7-left", 7, [660, 230], [750, 620], sequence(31, 16), 40);
strip("r7-right", 7, [700, 220], [790, 610], [...sequence(1, 15), "16А"], 40);
strip("r6-left", 6, [550, 230], [710, 900], unknown(29), 40);
strip("r6-right", 6, [590, 220], [750, 890], [...unknown(26), 60, 61, 62], 40);
strip("r5-left", 5, [440, 230], [650, 1120], unknown(40), 40);
strip("r5-right", 5, [480, 220], [690, 1110], unknown(40), 40);
strip("r3-left", 3, [330, 230], [585, 1320], unknown(48), 40);
strip("r3-right", 3, [370, 220], [605, 1235], unknown(44), 40);
strip("r2-left", 2, [220, 230], [510, 1470], [...unknown(52), 110, 108, 106, 104, 102, 100], 40);
strip("r2-right", 2, [260, 220], [550, 1460], [...unknown(52), 111, 109, 107, 105, 103, 101], 40);
export const planCells = cells;
export const landmarks = [
  { id: "gate", name: "КПП", x: 415, y: 1170, w: 65, h: 70 },
  { id: "office", name: "Правління", x: 605, y: 1270, w: 85, h: 110 },
  ...[0, 1, 2, 3].map((i) => ({
    id: `pit-${i + 1}`,
    name: "Яма",
    x: 380 + i * 6,
    y: 1110 + i * 15,
    w: 52,
    h: 10,
  })),
];
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
