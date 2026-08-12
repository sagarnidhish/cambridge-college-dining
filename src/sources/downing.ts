import { collegeById } from "../domain/catalog";
import { unknownDiningDay } from "../domain/fallback-day";
import { weekdayForIso } from "../domain/dates";
import type { DiningDay, IsoDate, MealRecord, MenuContent, PriceQuote } from "../domain/types";
import type { DowningMenu, DowningRecipe, DowningSnapshot } from "./fetch";

const DOWNING = collegeById("downing");
const KAFOODLE = "https://wba.kafoodle.com/17260";
const DAY_KEY = {
  Monday: "is_mon",
  Tuesday: "is_tue",
  Wednesday: "is_wed",
  Thursday: "is_thu",
  Friday: "is_fri",
  Saturday: "is_sat",
  Sunday: "is_sun"
} as const;

function selectedMenu(menus: DowningMenu[], date: IsoDate): DowningMenu | null {
  const key = DAY_KEY[weekdayForIso(date) as keyof typeof DAY_KEY];
  if (key === undefined) return null;
  return menus.find((menu) => menu.weekdays[key] === true) ?? null;
}

function recipeRestrictions(recipes: DowningRecipe[]): string[] {
  const restrictions = new Set<string>();
  for (const recipe of recipes) {
    for (const allergen of recipe.inherited_allergens) restrictions.add(`Contains: ${allergen.name}`);
    for (const tag of recipe.tags) restrictions.add(tag.name);
  }
  return [...restrictions];
}

function priceRange(recipes: DowningRecipe[], fetchedAt: string): PriceQuote[] {
  const values = recipes.flatMap(({ prices }) => prices.map(({ price }) => price)).filter(Number.isFinite).sort((a, b) => a - b);
  const first = values[0];
  const last = values.at(-1);
  if (first === undefined || last === undefined) return [];
  return [{
    label: "Published menu item range",
    amount: first === last ? `£${first.toFixed(2)}` : `£${first.toFixed(2)}–£${last.toFixed(2)}`,
    precision: "exact",
    audience: "Published student food prices",
    asOf: fetchedAt.slice(0, 10),
    source: { label: "Official Downing Kafoodle menu", url: KAFOODLE, evidence: "official-college" }
  }];
}

function menuMeal(type: "lunch" | "dinner", menu: DowningMenu): MealRecord<MenuContent[]> {
  const items = menu.recipes.map((recipe) => {
    const price = recipe.prices[0]?.price_text;
    return `${recipe.name}${price === undefined ? "" : ` — ${price}`}`;
  });
  return {
    type,
    availability: "available",
    time: "Time not published",
    menu: [{ kind: "items", items }],
    notes: [`Kafoodle publishes this as ${menu.name}; it does not separate lunch from dinner in the public response.`],
    restrictions: recipeRestrictions(menu.recipes),
    sourceLinks: [...DOWNING.sources, { label: "Official Downing Kafoodle menu", url: KAFOODLE, evidence: "official-college" }]
  };
}

export function parseDowningDay(snapshot: DowningSnapshot, date: IsoDate, fetchedAt: string): DiningDay<MenuContent[]> {
  if (snapshot.menu.menus.length === 0 || snapshot.menu.menus.every((menu) => menu.recipes.length === 0)) {
    throw new Error("Downing menu response contains no recognizable recipes");
  }
  const profile = {
    ...DOWNING,
    access: {
      ...DOWNING.access,
      payment: "The official catering information permits bank-card payment; verify current arrangements at the source."
    }
  };
  const day = unknownDiningDay(profile, date, fetchedAt, "live");
  const menu = selectedMenu(snapshot.menu.menus, date);
  if (menu === null || menu.recipes.length === 0) {
    return {
      ...day,
      coverage: "schedule",
      notices: ["No matching dated Kafoodle menu was returned for the selected weekday."]
    };
  }
  const prices = priceRange(menu.recipes, fetchedAt);
  return {
    ...day,
    meals: { ...day.meals, lunch: menuMeal("lunch", menu), dinner: menuMeal("dinner", menu) },
    prices,
    coverage: "menu",
    notices: ["The public Kafoodle response groups items by weekday and does not identify which items belong to lunch or dinner; the same published list is shown for both services."],
    sourceLinks: [...day.sourceLinks, { label: "Official Downing Kafoodle menu", url: KAFOODLE, evidence: "official-college" }]
  };
}
