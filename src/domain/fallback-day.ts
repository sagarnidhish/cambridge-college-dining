import { termStatusFor, weekdayForIso } from "./dates";
import { MEAL_TYPES, type CollegeProfile, type DiningDay, type Freshness, type IsoDate, type MealRecord, type MealType, type MenuContent } from "./types";

export function unknownDiningDay(
  profile: CollegeProfile,
  date: IsoDate,
  fetchedAt: string,
  freshness: Freshness,
  warning?: string
): DiningDay<MenuContent[]> {
  const meals = {} as Record<MealType, MealRecord<MenuContent[]>>;
  for (const type of MEAL_TYPES) {
    meals[type] = {
      type,
      availability: "unknown",
      time: "Time not published",
      menu: [{ kind: "message", message: "Menu not publicly confirmed" }],
      notes: [],
      restrictions: [],
      sourceLinks: profile.sources
    };
  }

  return {
    college: profile.id,
    collegeName: profile.name,
    date,
    weekday: weekdayForIso(date),
    timeZone: "Europe/London",
    meals,
    location: { diningArea: profile.diningArea, mapQuery: profile.mapQuery },
    access: profile.access,
    prices: profile.prices,
    termLabel: termStatusFor(date),
    notices: [],
    sourceLinks: profile.sources,
    sourceModifiedAt: null,
    fetchedAt,
    freshness,
    coverage: "link-only",
    ...(warning === undefined ? {} : { collectionWarning: warning })
  };
}
