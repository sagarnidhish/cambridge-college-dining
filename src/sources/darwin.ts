import { collegeById } from "../domain/catalog";
import { unknownDiningDay } from "../domain/fallback-day";
import { weekdayForIso } from "../domain/dates";
import type { DiningDay, IsoDate, MealRecord, MealType, MenuContent } from "../domain/types";
import type { DarwinSnapshot } from "./fetch";

const DARWIN = collegeById("darwin");
const WEEKLY_MENU = "https://www.darwin.cam.ac.uk/dine/weekly-menu/";

function publishedSchedule(type: MealType, time: string): MealRecord<MenuContent[]> {
  return {
    type,
    availability: "unknown",
    time: `Normally ${time}`,
    menu: [{ kind: "link", label: "Open Darwin's current weekly menu", url: WEEKLY_MENU }],
    notes: ["The public REST collection confirms menu publication, but does not expose dish content in a browser-readable field."],
    restrictions: ["Check the official menu for current allergens and service changes."],
    sourceLinks: DARWIN.sources
  };
}

export function parseDarwinDay(snapshot: DarwinSnapshot, date: IsoDate, fetchedAt: string): DiningDay<MenuContent[]> {
  if (snapshot.menus.length === 0 || snapshot.menus.some((menu) => !Number.isFinite(Date.parse(menu.modified)))) {
    throw new Error("Darwin menu collection is incomplete");
  }
  const day = unknownDiningDay(DARWIN, date, fetchedAt, "live");
  const weekday = weekdayForIso(date);
  if (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(weekday)) {
    day.meals.lunch = publishedSchedule("lunch", "12:00–14:00");
    day.meals.dinner = publishedSchedule("dinner", weekday === "Wednesday" || weekday === "Friday" ? "18:00–19:00" : "18:00–20:30");
  } else {
    day.meals.brunch = publishedSchedule("brunch", "10:00–14:00");
  }
  const latestModified = [...snapshot.menus].sort((left, right) => Date.parse(right.modified) - Date.parse(left.modified))[0]?.modified ?? null;
  return {
    ...day,
    coverage: "schedule",
    sourceModifiedAt: latestModified,
    notices: [
      "Menu details are published on Darwin's official weekly-menu page; the live structured endpoint currently exposes publication metadata only.",
      "Published times are normal hours and do not prove that the servery is open on the selected date."
    ]
  };
}
