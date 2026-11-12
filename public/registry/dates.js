export const formatCalendarDate = (date) => date.split("-").reverse().join(".");

export function isCalendarDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith("0000"))
    return false;
  const parsed = new Date(date + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function parseCalendarDate(text) {
  const parts = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text.trim());
  if (!parts) return null;
  const [, day, month, year] = parts;
  const date = `${year}-${month}-${day}`;
  return isCalendarDate(date) ? date : null;
}
