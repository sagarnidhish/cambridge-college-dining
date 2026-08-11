import type { IsoDate } from "./types";

const CAMBRIDGE_TIME_ZONE = "Europe/London";
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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
