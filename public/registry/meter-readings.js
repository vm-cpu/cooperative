import { isCalendarDate } from "./dates.js";
import { garageExamples } from "./garage-examples.js";

const storageKey = "cooperative.demo.meter-readings.v1";

export function readSavedReadings() {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  if (
    !Array.isArray(saved) ||
    !saved.every(
      (item) =>
        item &&
        typeof item.garageId === "string" &&
        isCalendarDate(item.date) &&
        Number.isSafeInteger(item.value) &&
        item.value >= 0,
    )
  ) {
    throw new Error("Invalid meter readings");
  }
  return saved;
}

export function meterHistory(garageId, saved) {
  return [
    ...(garageExamples.get(garageId)?.readings ?? []),
    ...saved.filter((item) => item.garageId === garageId),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export function garageMeterHistory(garageId) {
  try {
    return { entries: meterHistory(garageId, readSavedReadings()), available: true };
  } catch {
    return { entries: meterHistory(garageId, []), available: false };
  }
}

export function writeReadingBatch(saved, batch) {
  // One write keeps a row's new readings together if storage fails.
  localStorage.setItem(storageKey, JSON.stringify([...saved, ...batch]));
}
