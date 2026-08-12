import { isIsoDate, weekdayForIso } from "../domain/dates";
import { COLLEGE_IDS, MEAL_TYPES, type CollegeId, type DiningDay, type IsoDate, type MealType } from "../domain/types";

interface CacheEnvelope {
  version: 2;
  college: CollegeId;
  date: IsoDate;
  day: DiningDay;
}

function cacheKey(college: CollegeId, date: IsoDate): string {
  return `college-dining:v2:${college}:${date}`;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}

function httpsUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function links(value: unknown): boolean {
  return Array.isArray(value) && value.every((link) => record(link) && typeof link.label === "string" && httpsUrl(link.url));
}

function menuEntry(value: unknown): boolean {
  if (!record(value) || typeof value.kind !== "string") return false;
  if (value.kind === "items") return strings(value.items);
  if (value.kind === "message") return typeof value.message === "string";
  if (value.kind === "pdf" || value.kind === "link") return typeof value.label === "string" && httpsUrl(value.url);
  return value.kind === "image" && typeof value.label === "string" && typeof value.alt === "string" && httpsUrl(value.url);
}

function menu(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 && value.every(menuEntry) : menuEntry(value);
}

function meal(value: unknown, type: MealType): boolean {
  return record(value)
    && value.type === type
    && ["available", "closed", "unknown"].includes(String(value.availability))
    && typeof value.time === "string"
    && menu(value.menu)
    && strings(value.notes)
    && (value.restrictions === undefined || strings(value.restrictions))
    && links(value.sourceLinks);
}

function diningDay(value: unknown, college: CollegeId, date: IsoDate): value is DiningDay {
  if (!record(value)
    || value.college !== college
    || typeof value.collegeName !== "string"
    || value.date !== date
    || value.weekday !== weekdayForIso(date)
    || value.timeZone !== "Europe/London"
    || !record(value.meals)
    || !strings(value.notices)
    || !links(value.sourceLinks)
    || (value.sourceModifiedAt !== null && !timestamp(value.sourceModifiedAt))
    || !timestamp(value.fetchedAt)
    || !["live", "scheduled", "cached", "stale"].includes(String(value.freshness))) return false;
  const meals = value.meals;
  return MEAL_TYPES.every((type) => meal(meals[type], type));
}

function envelope(value: unknown, college: CollegeId, date: IsoDate): value is CacheEnvelope {
  return record(value)
    && value.version === 2
    && value.college === college
    && value.date === date
    && isIsoDate(value.date)
    && diningDay(value.day, college, date);
}

export function saveCachedDay(storage: Storage, day: DiningDay): void {
  try {
    const value: CacheEnvelope = { version: 2, college: day.college, date: day.date, day };
    storage.setItem(cacheKey(day.college, day.date), JSON.stringify(value));
  } catch {
    // Browser storage is optional resilience only.
  }
}

export function loadCachedDay(storage: Storage, college: CollegeId, date: IsoDate): DiningDay | null {
  if (!COLLEGE_IDS.includes(college)) return null;
  try {
    const raw = storage.getItem(cacheKey(college, date));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return envelope(parsed, college, date) ? { ...parsed.day, freshness: "cached" } : null;
  } catch {
    return null;
  }
}
