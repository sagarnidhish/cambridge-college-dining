import { unknownDiningDay } from "../domain/fallback-day";
import type { CollegeProfile, DiningDay, IsoDate, MealRecord, MealType, MenuContent } from "../domain/types";
import type { ScheduledSnapshot, SnapshotMeal } from "./schema";

function withinValidity(date: IsoDate, validFrom: IsoDate | null, validThrough: IsoDate | null): boolean {
  return (validFrom === null || date >= validFrom) && (validThrough === null || date <= validThrough);
}

function normalizedMeal(type: MealType, meal: SnapshotMeal, profile: CollegeProfile): MealRecord<MenuContent[]> {
  return {
    type,
    availability: meal.availability,
    time: meal.time,
    menu: Array.isArray(meal.menu) ? meal.menu : [meal.menu],
    notes: meal.notes,
    restrictions: meal.restrictions ?? [],
    sourceLinks: meal.sourceLinks.length > 0 ? meal.sourceLinks : profile.sources
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
  if (withinValidity(date, source.validFrom, source.validThrough)) {
    for (const [type, meal] of Object.entries(source.recurringMeals)) {
      if (meal !== undefined) day.meals[type as MealType] = normalizedMeal(type as MealType, meal, profile);
    }
    for (const [type, meal] of Object.entries(source.mealsByDate[date] ?? {})) {
      if (meal !== undefined) day.meals[type as MealType] = normalizedMeal(type as MealType, meal, profile);
    }
  }
  return {
    ...day,
    coverage: source.coverage,
    notices: source.notices,
    sourceModifiedAt: source.sourceModifiedAt
  };
}
