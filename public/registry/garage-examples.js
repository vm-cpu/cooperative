// Fictional examples scoped to five existing garage IDs. Amounts are in kopiykas.
export const garageExamples = new Map([
  [
    "garage-01",
    {
      phone: "+380 00 000 01 01",
      address: "вул. Умовна, 12",
      tenant: {
        name: "Зразковий Андрій Ігорович",
        phone: "+380 00 000 02 01",
        since: "2026-09-01",
      },
      paidThrough: "2027-03",
      debt: 0,
      entry: { date: "2023-05-12", amount: 150000 },
      contributions: [
        { date: "2026-10-20", amount: 60000, period: "2026-10 – 2027-03", receipt: "Ч-001" },
        { date: "2026-07-04", amount: 30000, period: "2026-07 – 2026-09", receipt: "Ч-002" },
      ],
      readings: [
        { date: "2026-11-01", value: 1254 },
        { date: "2026-10-01", value: 1236 },
      ],
      electricity: [{ date: "2026-11-05", amount: 8100, period: "2026-10", receipt: "Е-001" }],
    },
  ],
  [
    "garage-02",
    {
      phone: "+380 00 000 01 01",
      address: "вул. Умовна, 12",
      paidThrough: "2026-08",
      debt: 30000,
      entry: { date: "2024-01-17", amount: 150000 },
      contributions: [{ date: "2026-08-03", amount: 10000, period: "2026-08", receipt: "Ч-003" }],
      readings: [
        { date: "2026-11-01", value: 587 },
        { date: "2026-10-01", value: 580 },
      ],
      electricity: [{ date: "2026-11-05", amount: 3150, period: "2026-10", receipt: "Е-002" }],
    },
  ],
  [
    "garage-03",
    {
      phone: "+380 00 000 01 02",
      address: "пров. Прикладний, 7",
      tenant: { name: "Зразкова Ірина Олегівна", phone: "+380 00 000 02 03", since: "2026-08-15" },
      paidThrough: "2026-11",
      debt: 0,
      entry: { date: "2021-06-18", amount: 100000 },
      contributions: [{ date: "2026-11-02", amount: 10000, period: "2026-11", receipt: "Ч-004" }],
      readings: [
        { date: "2026-11-02", value: 2301 },
        { date: "2026-10-02", value: 2280 },
      ],
      electricity: [{ date: "2026-11-06", amount: 9450, period: "2026-10", receipt: "Е-003" }],
    },
  ],
  [
    "garage-17",
    {
      phone: "+380 00 000 01 07",
      address: "вул. Демонстраційна, 4",
      paidThrough: "2026-09",
      debt: 20000,
      entry: { date: "2020-03-21", amount: 100000 },
      contributions: [{ date: "2026-09-12", amount: 10000, period: "2026-09", receipt: "Ч-005" }],
      readings: [{ date: "2026-10-31", value: 412 }],
      electricity: [{ date: "2026-11-07", amount: 4500, period: "2026-10", receipt: "Е-004" }],
    },
  ],
  [
    "garage-18",
    {
      phone: "+380 00 000 01 08",
      address: "вул. Зразкова, 3",
      paidThrough: "2026-12",
      debt: 0,
      entry: { date: "2025-09-15", amount: 150000 },
      contributions: [
        { date: "2026-10-02", amount: 30000, period: "2026-10 – 2026-12", receipt: "Ч-006" },
      ],
      readings: [{ date: "2026-11-01", value: 120 }],
      electricity: [{ date: "2026-11-08", amount: 2700, period: "2026-10", receipt: "Е-005" }],
    },
  ],
]);
