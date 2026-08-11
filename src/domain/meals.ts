import { weekdayForIso } from "./dates";
import { MEAL_TYPES, type CollegeId, type DiningDay, type IsoDate, type MealRecord, type MealType, type SourceLink } from "./types";

const MISSING_TIME = "Time not published";
const MISSING_MENU = "Menu not published";
const MISSING_NOTES = "No special notes published";

export function unknownMeal(type: MealType): MealRecord {
  return {
    type,
    availability: "unknown",
    time: MISSING_TIME,
    menu: { kind: "message", message: MISSING_MENU },
    notes: [MISSING_NOTES],
    sourceLinks: []
  };
}

export function closedMeal(type: MealType): MealRecord {
  return {
    type,
    availability: "closed",
    time: "Closed",
    menu: { kind: "message", message: "Service closed" },
    notes: [MISSING_NOTES],
    sourceLinks: []
  };
}

export interface UnknownDiningDayInput {
  college: CollegeId;
  collegeName: string;
  date: IsoDate;
  sourceLinks: SourceLink[];
  fetchedAt: string;
}

export function createUnknownDiningDay(input: UnknownDiningDayInput): DiningDay {
  const meals = {} as Record<MealType, MealRecord>;
  for (const type of MEAL_TYPES) {
    meals[type] = unknownMeal(type);
  }

  return {
    college: input.college,
    collegeName: input.collegeName,
    date: input.date,
    weekday: weekdayForIso(input.date),
    timeZone: "Europe/London",
    meals,
    notices: [],
    sourceLinks: input.sourceLinks,
    sourceModifiedAt: null,
    fetchedAt: input.fetchedAt,
    freshness: "live"
  };
}
