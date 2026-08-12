import { SCHEDULED_COLLEGE_IDS } from "./catalog.mjs";

const IDS = new Set(SCHEDULED_COLLEGE_IDS);
const MEALS = new Set(["breakfast", "brunch", "lunch", "dinner"]);
const COVERAGE = new Set(["menu", "schedule", "link-only"]);
const AVAILABILITY = new Set(["available", "closed", "unknown"]);
const WEEKDAYS = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);

function object(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestamp(value) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}

function isoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function https(value) {
  try {
    return typeof value === "string" && new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function sourceLinks(value) {
  return Array.isArray(value) && value.every((source) => object(source)
    && typeof source.label === "string"
    && https(source.url)
    && (source.evidence === undefined || ["official-college", "official-university", "official-student-body", "supplementary"].includes(source.evidence))
    && (source.asOf === undefined || typeof source.asOf === "string"));
}

function sourceLink(value) {
  return object(value)
    && typeof value.label === "string"
    && https(value.url)
    && (value.evidence === undefined || ["official-college", "official-university", "official-student-body", "supplementary"].includes(value.evidence))
    && (value.asOf === undefined || typeof value.asOf === "string");
}

function serviceWindow(value) {
  if (value === undefined) return true;
  if (!object(value) || typeof value.kind !== "string") return false;
  if (value.kind === "unknown") return value.source === undefined || sourceLink(value.source);
  if (!sourceLink(value.source)) return false;
  if (value.kind === "year-round" || value.kind === "full-term-only") return true;
  if (value.kind === "date-specific") return isoDate(value.date);
  return value.kind === "date-range" && isoDate(value.validFrom) && isoDate(value.validThrough) && value.validFrom <= value.validThrough;
}

function menuEntry(value) {
  if (!object(value)) return false;
  if (value.kind === "items") return Array.isArray(value.items) && value.items.length > 0 && value.items.every((item) => typeof item === "string");
  if (value.kind === "message") return typeof value.message === "string";
  if (value.kind === "link" || value.kind === "pdf") return typeof value.label === "string" && https(value.url);
  return value.kind === "image" && typeof value.label === "string" && typeof value.alt === "string" && https(value.url);
}

function menu(value) {
  return Array.isArray(value) ? value.length > 0 && value.every(menuEntry) : menuEntry(value);
}

function meal(value) {
  return object(value)
    && AVAILABILITY.has(value.availability)
    && typeof value.time === "string"
    && menu(value.menu)
    && Array.isArray(value.notes) && value.notes.every((note) => typeof note === "string")
    && (value.restrictions === undefined || Array.isArray(value.restrictions) && value.restrictions.every((item) => typeof item === "string"))
    && sourceLinks(value.sourceLinks)
    && serviceWindow(value.serviceWindow);
}

function mealMap(value) {
  return object(value) && Object.entries(value).every(([type, entry]) => MEALS.has(type) && meal(entry));
}

function datedMealMap(value) {
  return object(value) && Object.entries(value).every(([date, entries]) => isoDate(date) && mealMap(entries));
}

function weeklyServices(value) {
  return Array.isArray(value) && value.every((service) => object(service)
    && MEALS.has(service.type)
    && Array.isArray(service.weekdays)
    && service.weekdays.length > 0
    && new Set(service.weekdays).size === service.weekdays.length
    && service.weekdays.every((weekday) => WEEKDAYS.has(weekday))
    && meal(service));
}

function hasPublishedMenu(record) {
  const entries = [
    ...Object.values(record.recurringMeals),
    ...(record.weeklyServices ?? []),
    ...Object.values(record.mealsByDate).flatMap((day) => Object.values(day))
  ];
  return entries.some((entry) => (Array.isArray(entry.menu) ? entry.menu : [entry.menu]).some((item) => item.kind !== "message"));
}

export function validateCollegeAttempt(value) {
  if (!object(value) || !IDS.has(value.college)) throw new Error("Invalid scheduled college ID");
  if (!COVERAGE.has(value.coverage)) throw new Error(`Invalid coverage for ${value.college}`);
  if (!timestamp(value.collectedAt)) throw new Error(`Invalid collection timestamp for ${value.college}`);
  if (value.sourceModifiedAt !== null && !timestamp(value.sourceModifiedAt)) throw new Error(`Invalid source timestamp for ${value.college}`);
  if ((value.validFrom !== null && !isoDate(value.validFrom)) || (value.validThrough !== null && !isoDate(value.validThrough))) throw new Error(`Invalid validity date for ${value.college}`);
  if (value.validFrom !== null && value.validThrough !== null && value.validFrom > value.validThrough) throw new Error(`Invalid validity range for ${value.college}`);
  if (!datedMealMap(value.mealsByDate) || !mealMap(value.recurringMeals) || !weeklyServices(value.weeklyServices ?? [])) throw new Error(`Invalid meal data, weekday schedule, service window, or non-HTTPS evidence for ${value.college}; source URLs must use HTTPS`);
  if (!Array.isArray(value.notices) || !value.notices.every((notice) => typeof notice === "string")) throw new Error(`Invalid notices for ${value.college}`);
  if (value.warning !== undefined && typeof value.warning !== "string") throw new Error(`Invalid warning for ${value.college}`);
  if (value.coverage === "menu" && !hasPublishedMenu(value)) throw new Error(`Invalid menu coverage for ${value.college}: no published menu evidence`);
  return value;
}

export function validateSnapshot(value) {
  if (!object(value) || value.schemaVersion !== 2 || !timestamp(value.collectedAt) || !object(value.colleges)) throw new Error("Invalid scheduled snapshot schema or timestamp");
  const keys = Object.keys(value.colleges);
  if (keys.length !== SCHEDULED_COLLEGE_IDS.length || keys.some((id) => !IDS.has(id))) throw new Error("Scheduled snapshot must contain exactly 27 scheduled colleges");
  for (const id of SCHEDULED_COLLEGE_IDS) {
    const record = validateCollegeAttempt(value.colleges[id]);
    if (record.college !== id) throw new Error(`Snapshot record key mismatch for ${id}`);
  }
  return value;
}
