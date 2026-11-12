import { isCalendarDate } from "./dates.js";

const currency = new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH" });
const month = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric", timeZone: "UTC" });
const decimal = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const tableAmount = (amount) => decimal.format(amount / 100);
export const money = (amount) => currency.format(amount / 100);
const separator = " – ";
const maxPayment = 100000000;

export const validMonth = (value) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && !value.startsWith("0000");

export function monthPeriod(start, end) {
  return end === start ? start : start + separator + end;
}

export function parsePeriod(text) {
  const parts = /^(\d{2})\.(\d{4})(?:\s*[-–—]\s*(\d{2})\.(\d{4}))?$/.exec(text.trim());
  if (!parts) return null;
  const [, startMonth, startYear, endMonth, endYear] = parts;
  const start = startYear + "-" + startMonth;
  const end = endYear ? endYear + "-" + endMonth : start;
  return validMonth(start) && validMonth(end) && start <= end ? monthPeriod(start, end) : null;
}

export const periodLabel = (period) =>
  period
    .split(separator)
    .map((value) => month.format(new Date(value + "-01T00:00:00Z")))
    .join(separator);

export function parseAmount(text) {
  const parts = /^(\d{1,7})(?:[,.](\d{1,2}))?$/.exec(text.trim());
  if (!parts) return null;
  const amount = Number(parts[1]) * 100 + Number((parts[2] ?? "").padEnd(2, "0"));
  return validAmount(amount) ? amount : null;
}

const validAmount = (amount) => Number.isInteger(amount) && amount >= 1 && amount <= maxPayment;

export const receiptPurposes = { electricity: "Електрика", contributions: "Членські внески" };

const storageKey = (kind, id) => `cooperative.demo.${kind}.v1.${id}`;

function storedEntries(kind, id) {
  const saved = JSON.parse(localStorage.getItem(storageKey(kind, id)) ?? "[]");
  if (!Array.isArray(saved)) throw new Error("Invalid payments");
  return saved.filter((item) => {
    if (!item || !isCalendarDate(item.date) || !validAmount(item.amount)) return false;
    if (typeof item.period !== "string") return false;
    const parts = item.period.split(separator);
    if (parts.length > 2 || !parts.every(validMonth) || parts[0] > parts.at(-1)) return false;
    return (
      kind !== "receipts" ||
      (Object.hasOwn(receiptPurposes, item.purpose) && typeof item.receipt === "string")
    );
  });
}

export function garageEntryHistory(kind, id, examples) {
  try {
    const saved = storedEntries(kind, id);
    return {
      entries: [...saved.reverse(), ...examples].sort((a, b) => b.date.localeCompare(a.date)),
      available: true,
    };
  } catch {
    return {
      entries: examples.slice().sort((a, b) => b.date.localeCompare(a.date)),
      available: false,
    };
  }
}

export function saveGarageEntry(kind, id, entry) {
  const entries = storedEntries(kind, id);
  const record =
    kind === "receipts"
      ? { ...entry, receipt: `ДЕМО-${String(entries.length + 1).padStart(3, "0")}` }
      : entry;
  localStorage.setItem(storageKey(kind, id), JSON.stringify([...entries, record]));
}
