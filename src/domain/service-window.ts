import { fullTermApplicability } from "./dates";
import type { IsoDate, MealRecord, MenuContent, ServiceWindow, SourceLink } from "./types";

export type WindowApplicability = "applicable" | "outside" | "unknown";

export function serviceWindowApplicability(
  window: ServiceWindow | undefined,
  date: IsoDate
): WindowApplicability {
  if (window === undefined || window.kind === "unknown") return "unknown";
  if (window.kind === "year-round") return "applicable";
  if (window.kind === "date-specific") return window.date === date ? "applicable" : "outside";
  if (window.kind === "date-range") {
    return date >= window.validFrom && date <= window.validThrough ? "applicable" : "outside";
  }
  const term = fullTermApplicability(date);
  return term === "inside" ? "applicable" : term === "outside" ? "outside" : "unknown";
}

function appendSourceOnce(sources: SourceLink[], source: SourceLink | undefined): SourceLink[] {
  if (source === undefined || sources.some(({ url }) => url === source.url)) return [...sources];
  return [...sources, source];
}

export function effectiveMealForDate<TMenu extends MenuContent | MenuContent[]>(
  meal: MealRecord<TMenu>,
  date: IsoDate
): MealRecord<TMenu> {
  const effective: MealRecord<TMenu> = {
    ...meal,
    notes: [...meal.notes],
    ...(meal.restrictions === undefined ? {} : { restrictions: [...meal.restrictions] }),
    sourceLinks: [...meal.sourceLinks]
  };
  const applicability = serviceWindowApplicability(meal.serviceWindow, date);
  if (applicability === "applicable" || meal.availability !== "available") return effective;

  if (applicability === "outside") {
    effective.availability = "closed";
    effective.notes = [...effective.notes, meal.serviceWindow?.kind === "full-term-only"
      ? "Published for Full Term only"
      : "Outside the published service dates"];
    effective.sourceLinks = appendSourceOnce(effective.sourceLinks, meal.serviceWindow?.source);
    return effective;
  }

  if (meal.serviceWindow?.kind === "full-term-only") {
    effective.availability = "unknown";
    effective.notes = [...effective.notes, "Term applicability not confirmed"];
    effective.sourceLinks = appendSourceOnce(effective.sourceLinks, meal.serviceWindow.source);
  }
  return effective;
}
