import { isIsoDate } from "../domain/dates";
import { MEAL_TYPES, type CollegeId, type DiningDay, type IsoDate, type MealRecord, type MealType, type SourceLink } from "../domain/types";

interface CacheEnvelope {
  version: 1;
  college: CollegeId;
  date: IsoDate;
  day: DiningDay;
}

function cacheKey(college: CollegeId, date: IsoDate): string {
  return `college-dining:v1:${college}:${date}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCollegeId(value: unknown): value is CollegeId {
  return value === "churchill" || value === "st-edmunds";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSourceLinks(value: unknown): value is SourceLink[] {
  return Array.isArray(value) && value.every((link) => isRecord(link) && typeof link.label === "string" && typeof link.url === "string");
}

function isMenu(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }
  if (value.kind === "items") {
    return isStringArray(value.items);
  }
  if (value.kind === "pdf") {
    return typeof value.label === "string" && typeof value.url === "string";
  }
  return value.kind === "message" && typeof value.message === "string";
}

function isMealRecord(value: unknown, type: MealType): value is MealRecord {
  return isRecord(value)
    && value.type === type
    && (value.availability === "available" || value.availability === "closed" || value.availability === "unknown")
    && typeof value.time === "string"
    && isMenu(value.menu)
    && isStringArray(value.notes)
    && isSourceLinks(value.sourceLinks);
}

function isDiningDay(value: unknown, college: CollegeId, date: IsoDate): value is DiningDay {
  if (!isRecord(value)
    || value.college !== college
    || typeof value.collegeName !== "string"
    || value.date !== date
    || typeof value.weekday !== "string"
    || value.timeZone !== "Europe/London"
    || !isRecord(value.meals)
    || !isStringArray(value.notices)
    || !isSourceLinks(value.sourceLinks)
    || (value.sourceModifiedAt !== null && typeof value.sourceModifiedAt !== "string")
    || typeof value.fetchedAt !== "string"
    || (value.freshness !== "live" && value.freshness !== "stale")) {
    return false;
  }
  const meals = value.meals;
  return MEAL_TYPES.every((type) => isMealRecord(meals[type], type));
}

function isCacheEnvelope(value: unknown, college: CollegeId, date: IsoDate): value is CacheEnvelope {
  return isRecord(value)
    && value.version === 1
    && value.college === college
    && value.date === date
    && isDiningDay(value.day, college, date);
}

export function saveCachedDay(storage: Storage, day: DiningDay): void {
  try {
    const envelope: CacheEnvelope = { version: 1, college: day.college, date: day.date, day };
    storage.setItem(cacheKey(day.college, day.date), JSON.stringify(envelope));
  } catch {
    // Cache writes are an optional resilience feature.
  }
}

export function loadCachedDay(storage: Storage, college: CollegeId, date: IsoDate): DiningDay | null {
  try {
    const raw = storage.getItem(cacheKey(college, date));
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isCacheEnvelope(parsed, college, date) || !isIsoDate(parsed.date)) {
      return null;
    }
    return { ...parsed.day, freshness: "stale" };
  } catch {
    return null;
  }
}
