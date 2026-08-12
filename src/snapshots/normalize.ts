import { unknownDiningDay } from "../domain/fallback-day";
import { weekdayForIso } from "../domain/dates";
import { serviceWindowApplicability } from "../domain/service-window";
import type { CollegeProfile, DiningDay, IsoDate, MealRecord, MealType, MenuContent } from "../domain/types";
import type { ScheduledSnapshot, SnapshotMeal } from "./schema";

function withinValidity(date: IsoDate, validFrom: IsoDate | null, validThrough: IsoDate | null): boolean {
  return (validFrom === null || date >= validFrom) && (validThrough === null || date <= validThrough);
}

function normalizedMeal(type: MealType, meal: SnapshotMeal, profile: CollegeProfile): MealRecord<MenuContent[]> {
  const serviceWindow = meal.serviceWindow ?? profile.serviceWindows?.[type];
  return {
    type,
    availability: meal.availability,
    time: meal.time,
    menu: Array.isArray(meal.menu) ? meal.menu : [meal.menu],
    notes: meal.notes,
    restrictions: meal.restrictions ?? [],
    sourceLinks: meal.sourceLinks.length > 0 ? meal.sourceLinks : profile.sources,
    ...(serviceWindow === undefined ? {} : { serviceWindow })
  };
}

function authoredMeal(profile: CollegeProfile, service: NonNullable<CollegeProfile["recurringServices"]>[number]): MealRecord<MenuContent[]> {
  const source = service.serviceWindow.source;
  if (source === undefined) throw new Error(`${profile.name} recurring service is missing a source`);
  return {
    type: service.type,
    availability: "available",
    time: service.time,
    menu: [{ kind: "link", label: `Check ${profile.name}'s current dining information`, url: source.url }],
    notes: ["Published recurring hours; verify the official source for closures or changes before travelling."],
    restrictions: ["Ask catering staff about current allergens and dietary requirements."],
    sourceLinks: [source],
    serviceWindow: service.serviceWindow
  };
}

export function scheduledDayFor(snapshot: ScheduledSnapshot, profile: CollegeProfile, date: IsoDate): DiningDay<MenuContent[]> {
  if (profile.retrieval !== "scheduled") {
    throw new Error(`${profile.name} is not a scheduled source`);
  }
  const source = snapshot.colleges[profile.id as keyof typeof snapshot.colleges];
  if (source === undefined) {
    throw new Error(`Scheduled snapshot is missing ${profile.id}`);
  }
  const day = unknownDiningDay(profile, date, source.collectedAt, "scheduled", source.warning);
  let authoredScheduleApplied = false;
  if (withinValidity(date, source.validFrom, source.validThrough)) {
    const weekday = weekdayForIso(date);
    for (const service of profile.recurringServices ?? []) {
      if (service.weekdays.some((candidate) => candidate === weekday) && serviceWindowApplicability(service.serviceWindow, date) === "applicable") {
        day.meals[service.type] = authoredMeal(profile, service);
        authoredScheduleApplied = true;
      }
    }
    for (const [type, meal] of Object.entries(source.recurringMeals)) {
      if (meal !== undefined) day.meals[type as MealType] = normalizedMeal(type as MealType, meal, profile);
    }
    for (const [type, meal] of Object.entries(source.mealsByDate[date] ?? {})) {
      if (meal !== undefined) day.meals[type as MealType] = normalizedMeal(type as MealType, meal, profile);
    }
  }
  return {
    ...day,
    coverage: authoredScheduleApplied && source.coverage === "link-only" ? "schedule" : source.coverage,
    notices: source.notices,
    sourceModifiedAt: source.sourceModifiedAt
  };
}
