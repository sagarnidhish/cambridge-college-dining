import { effectiveMealForDate, serviceWindowApplicability } from "./service-window";
import { MEAL_TYPES, type CollegeId, type DashboardState, type MealType, type PriceQuote } from "./types";

export interface EatabilityResult {
  college: CollegeId;
  collegeName: string;
  tier: "confirmed" | "host-required";
  diningArea: string;
  mapQuery: string;
  meals: Array<{ type: MealType; time: string }>;
  nextTime: string | null;
  accessSummary: string;
  price: PriceQuote | null;
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function startMinutes(time: string): number | null {
  const match = /(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)/.exec(time);
  return match === null ? null : Number(match[1]) * 60 + Number(match[2]);
}

export function eatabilityResults(state: DashboardState): EatabilityResult[] {
  return Object.values(state.colleges).flatMap((collegeState): EatabilityResult[] => {
    if (collegeState.status !== "ready") return [];
    const { day } = collegeState;
    const access = day.access;
    if (access === undefined || (access.classification !== "unhosted-cambridge" && access.classification !== "guest-required")) return [];
    if (!access.sourceLinks.some(({ url }) => isHttps(url))) return [];
    const diningArea = day.location?.diningArea.trim() ?? "";
    const mapQuery = day.location?.mapQuery.trim() ?? "";
    if (diningArea === "" || mapQuery === "") return [];

    const meals = MEAL_TYPES.flatMap((type) => {
      const published = day.meals[type];
      if (serviceWindowApplicability(published.serviceWindow, state.selectedDate) !== "applicable") return [];
      const effective = effectiveMealForDate(published, state.selectedDate);
      return effective.availability === "available" ? [{ type, time: effective.time }] : [];
    }).sort((left, right) => {
      const leftStart = startMinutes(left.time);
      const rightStart = startMinutes(right.time);
      if (leftStart !== null && rightStart !== null && leftStart !== rightStart) return leftStart - rightStart;
      if (leftStart !== null) return -1;
      if (rightStart !== null) return 1;
      return MEAL_TYPES.indexOf(left.type) - MEAL_TYPES.indexOf(right.type);
    });
    if (meals.length === 0) return [];

    const firstTimed = meals.find(({ time }) => startMinutes(time) !== null);
    return [{
      college: day.college,
      collegeName: day.collegeName,
      tier: access.classification === "unhosted-cambridge" ? "confirmed" : "host-required",
      diningArea,
      mapQuery,
      meals,
      nextTime: firstTimed?.time ?? null,
      accessSummary: access.summary,
      price: day.prices?.[0] ?? null
    }];
  }).sort((left, right) => left.collegeName.localeCompare(right.collegeName, "en-GB"));
}
