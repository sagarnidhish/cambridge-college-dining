import { COLLEGES } from "../domain/catalog";
import { COLLEGE_IDS, MEAL_TYPES, type CollegeId, type IsoDate, type MealRecord, type MealType, type SnapshotCoverage } from "../domain/types";
import { isIsoDate } from "../domain/dates";

export type ScheduledCollegeId = Exclude<CollegeId, "churchill" | "darwin" | "downing" | "st-edmunds">;
export type SnapshotMeal = Omit<MealRecord, "type">;

export interface ScheduledCollegeRecord {
  college: ScheduledCollegeId;
  coverage: SnapshotCoverage;
  collectedAt: string;
  sourceModifiedAt: string | null;
  validFrom: IsoDate | null;
  validThrough: IsoDate | null;
  mealsByDate: Partial<Record<IsoDate, Partial<Record<MealType, SnapshotMeal>>>>;
  recurringMeals: Partial<Record<MealType, SnapshotMeal>>;
  notices: string[];
  warning?: string;
}

export interface ScheduledSnapshot {
  schemaVersion: 2;
  collectedAt: string;
  colleges: Record<ScheduledCollegeId, ScheduledCollegeRecord>;
}

export const SCHEDULED_COLLEGE_IDS = COLLEGES
  .filter(({ retrieval }) => retrieval === "scheduled")
  .map(({ id }) => id as ScheduledCollegeId);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}

function httpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function sourceLinks(value: unknown): boolean {
  return Array.isArray(value) && value.every((link) =>
    record(link) && typeof link.label === "string" && httpsUrl(link.url)
    && (link.evidence === undefined || ["official-college", "official-university", "official-student-body", "supplementary"].includes(String(link.evidence)))
    && (link.asOf === undefined || typeof link.asOf === "string")
  );
}

function menuEntry(value: unknown): boolean {
  if (!record(value) || typeof value.kind !== "string") return false;
  if (value.kind === "items") return stringArray(value.items) && value.items.length > 0;
  if (value.kind === "message") return typeof value.message === "string";
  if (value.kind === "pdf" || value.kind === "link") return typeof value.label === "string" && httpsUrl(value.url);
  return value.kind === "image" && typeof value.label === "string" && typeof value.alt === "string" && httpsUrl(value.url);
}

function menu(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 && value.every(menuEntry) : menuEntry(value);
}

function snapshotMeal(value: unknown): value is SnapshotMeal {
  return record(value)
    && ["available", "closed", "unknown"].includes(String(value.availability))
    && typeof value.time === "string"
    && menu(value.menu)
    && stringArray(value.notes)
    && (value.restrictions === undefined || stringArray(value.restrictions))
    && sourceLinks(value.sourceLinks);
}

function mealMap(value: unknown): boolean {
  return record(value) && Object.entries(value).every(([meal, details]) =>
    MEAL_TYPES.includes(meal as MealType) && snapshotMeal(details)
  );
}

function datedMealMap(value: unknown): boolean {
  return record(value) && Object.entries(value).every(([date, meals]) => isIsoDate(date) && mealMap(meals));
}

function hasPublishedMenu(meal: SnapshotMeal): boolean {
  const entries = Array.isArray(meal.menu) ? meal.menu : [meal.menu];
  return entries.some((entry) => entry.kind !== "message");
}

function recordHasPublishedMenu(value: ScheduledCollegeRecord): boolean {
  const recurring = Object.values(value.recurringMeals).filter((meal): meal is SnapshotMeal => meal !== undefined);
  const dated = Object.values(value.mealsByDate).flatMap((meals) =>
    meals === undefined ? [] : Object.values(meals).filter((meal): meal is SnapshotMeal => meal !== undefined)
  );
  return [...recurring, ...dated].some(hasPublishedMenu);
}

function parseCollegeRecord(value: unknown, id: ScheduledCollegeId): ScheduledCollegeRecord {
  if (!record(value)
    || value.college !== id
    || !["menu", "schedule", "link-only"].includes(String(value.coverage))
    || !timestamp(value.collectedAt)
    || (value.sourceModifiedAt !== null && !timestamp(value.sourceModifiedAt))
    || (value.validFrom !== null && !isIsoDate(value.validFrom))
    || (value.validThrough !== null && !isIsoDate(value.validThrough))
    || !datedMealMap(value.mealsByDate)
    || !mealMap(value.recurringMeals)
    || !stringArray(value.notices)
    || (value.warning !== undefined && typeof value.warning !== "string")) {
    throw new Error(`Invalid scheduled snapshot record for ${id}; menu and source URLs must use HTTPS`);
  }
  if (value.validFrom !== null && value.validThrough !== null && value.validFrom > value.validThrough) {
    throw new Error(`Invalid validity range for ${id}`);
  }
  const parsed = value as unknown as ScheduledCollegeRecord;
  if (parsed.coverage === "menu" && !recordHasPublishedMenu(parsed)) {
    throw new Error(`Invalid menu coverage for ${id}`);
  }
  return parsed;
}

export function parseScheduledSnapshot(value: unknown): ScheduledSnapshot {
  if (!record(value) || value.schemaVersion !== 2 || !timestamp(value.collectedAt) || !record(value.colleges)) {
    throw new Error("Invalid scheduled snapshot schema or timestamp");
  }
  const keys = Object.keys(value.colleges);
  if (keys.length !== 27 || keys.some((id) => !SCHEDULED_COLLEGE_IDS.includes(id as ScheduledCollegeId))) {
    throw new Error("Scheduled snapshot must contain exactly 27 scheduled colleges");
  }
  const colleges = {} as Record<ScheduledCollegeId, ScheduledCollegeRecord>;
  for (const id of SCHEDULED_COLLEGE_IDS) {
    colleges[id] = parseCollegeRecord(value.colleges[id], id);
  }
  return { schemaVersion: 2, collectedAt: value.collectedAt, colleges };
}

export function isCanonicalCollegeId(value: unknown): value is CollegeId {
  return typeof value === "string" && COLLEGE_IDS.includes(value as CollegeId);
}
