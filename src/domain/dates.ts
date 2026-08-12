import type { IsoDate } from "./types";

const CAMBRIDGE_TIME_ZONE = "Europe/London";
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SUPPORTED_ACADEMIC_PERIODS: readonly [IsoDate, IsoDate][] = [
  ["2025-10-01", "2026-09-30"],
  ["2026-10-01", "2027-09-30"],
  ["2027-10-01", "2028-09-30"],
  ["2028-10-01", "2029-09-30"]
];
const FULL_TERMS: readonly [IsoDate, IsoDate][] = [
  ["2025-10-07", "2025-12-05"],
  ["2026-01-20", "2026-03-20"],
  ["2026-04-28", "2026-06-19"],
  ["2026-10-06", "2026-12-04"],
  ["2027-01-19", "2027-03-19"],
  ["2027-04-27", "2027-06-18"],
  ["2027-10-05", "2027-12-03"],
  ["2028-01-18", "2028-03-17"],
  ["2028-04-25", "2028-06-16"],
  ["2028-10-03", "2028-12-01"],
  ["2029-01-16", "2029-03-16"],
  ["2029-04-24", "2029-06-15"]
];

function toIsoDate(date: Date): IsoDate {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}` as IsoDate;
}

function dateAtUtcNoon(date: IsoDate): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

export function todayInCambridge(now: Date): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMBRIDGE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const partValues = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${partValues.year}-${partValues.month}-${partValues.day}` as IsoDate;
}

export function weekdayForIso(date: IsoDate): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long"
  }).format(dateAtUtcNoon(date));
}

export function addIsoDays(date: IsoDate, delta: number): IsoDate {
  const result = dateAtUtcNoon(date);
  result.setUTCDate(result.getUTCDate() + delta);
  return toIsoDate(result);
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") {
    return false;
  }

  const match = ISO_DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day)
  );
}

export function formatCambridgeTimestamp(value: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMBRIDGE_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function termStatusFor(date: IsoDate): "Full Term" | "Outside Full Term" | "Term dates not confirmed" {
  if (!SUPPORTED_ACADEMIC_PERIODS.some(([start, end]) => date >= start && date <= end)) {
    return "Term dates not confirmed";
  }
  return FULL_TERMS.some(([start, end]) => date >= start && date <= end) ? "Full Term" : "Outside Full Term";
}
