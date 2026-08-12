import { describe, expect, it } from "vitest";
import { parseChurchillDay } from "../../src/sources/churchill";
import { parseStEdmundsDay } from "../../src/sources/st-edmunds";
import type { DashboardState, DiningDay } from "../../src/domain/types";
import { renderDashboard } from "../../src/ui/render";
import { CHURCHILL_PAGE_FIXTURE } from "../fixtures/churchill";
import { ST_EDMUNDS_CATERING_FIXTURE, ST_EDMUNDS_POST_FIXTURES } from "../fixtures/st-edmunds";

const selectedDate = "2026-08-11" as const;

function readyState(overrides: Partial<DashboardState> = {}): DashboardState {
  const churchill = parseChurchillDay(CHURCHILL_PAGE_FIXTURE, selectedDate, "2026-08-11T21:35:14.000Z");
  const stEdmunds = parseStEdmundsDay(
    ST_EDMUNDS_POST_FIXTURES,
    ST_EDMUNDS_CATERING_FIXTURE,
    selectedDate,
    "2026-08-11T21:35:12.000Z"
  );
  churchill.meals.brunch = { ...churchill.meals.brunch, availability: "unknown", time: "Time not published" };

  return {
    selectedDate,
    colleges: {
      churchill: { status: "ready", day: churchill },
      "st-edmunds": { status: "ready", day: stEdmunds }
    },
    ...overrides
  };
}

function render(state = readyState()): HTMLElement {
  const root = document.createElement("main");
  renderDashboard(root, state, {
    previousDate() {},
    nextDate() {},
    selectToday() {},
    selectDate() {},
    refresh() {}
  });
  return root;
}

describe("renderDashboard", () => {
  it("renders every mandatory field, menu format, and official source for each college", () => {
    const root = render();

    for (const collegeName of ["Churchill College", "St Edmund's College"]) {
      const card = [...root.querySelectorAll<HTMLElement>("article")].find((element) => element.textContent?.includes(collegeName));
      expect(card?.textContent).toContain("Tuesday, 11 August 2026");
      expect(card?.textContent).toContain("Live data");
      expect(card?.textContent).toContain("Last checked:");
      expect(card?.textContent).toContain("Breakfast");
      expect(card?.textContent).toContain("Brunch");
      expect(card?.textContent).toContain("Lunch");
      expect(card?.textContent).toContain("Dinner");
      expect(card?.textContent).toContain("Availability:");
      expect(card?.textContent).toContain("Time:");
      expect(card?.textContent).toContain("Menu:");
      expect(card?.textContent).toContain("Notes:");
      expect(card?.textContent).toContain("Notices");
      expect(card?.textContent).toContain("View official source");
    }

    expect(root.textContent).toContain("Today's Special: Churchill Trattoria");
    expect(root.querySelectorAll('object[type="application/pdf"]')).toHaveLength(2);
    const lunchLink = root.querySelector<HTMLAnchorElement>('a[href$="week-3-lunch.pdf"]');
    const dinnerLink = root.querySelector<HTMLAnchorElement>('a[href$="week-3-dinner.pdf"]');
    expect(lunchLink?.textContent).toContain("lunch menu PDF");
    expect(dinnerLink?.textContent).toContain("dinner menu PDF");
    expect(lunchLink?.parentElement?.tagName).not.toBe("OBJECT");
    expect(dinnerLink?.parentElement?.tagName).not.toBe("OBJECT");
    expect(root.textContent).toContain("Availability: Closed");
    expect(root.textContent).toContain("Availability: Unknown");
    expect(root.textContent).toContain("Menu not publicly confirmed");

    const externalLinks = [...root.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')];
    expect(externalLinks.every((link) => link.rel.includes("noopener") && link.rel.includes("noreferrer"))).toBe(true);
    expect(root.textContent).not.toContain("undefined");
  });

  it("renders a college error with its official source while other college content remains visible", () => {
    const state = readyState();
    state.colleges.churchill = {
      status: "error",
      college: "churchill",
      collegeName: "Churchill College",
      message: "Live Churchill College dining data could not be loaded.",
      sourceLinks: [{ label: "Churchill catering", url: "https://www.chu.cam.ac.uk/" }]
    };
    const root = render(state);

    expect(root.textContent).toContain("Live Churchill College dining data could not be loaded.");
    expect(root.textContent).toContain("View official source: Churchill catering");
    expect(root.textContent).toContain("St Edmund's College");
    const errorCard = [...root.querySelectorAll<HTMLElement>("article")].find((card) => card.textContent?.includes("Churchill College"));
    expect(errorCard?.textContent).toContain("Freshness: Live data unavailable");
    expect(errorCard?.textContent).toContain("Last checked: unavailable");
    expect(errorCard?.textContent).toContain("Notices unavailable");
    expect(errorCard?.querySelectorAll('[data-meal]')).toHaveLength(4);
    expect(errorCard?.textContent).toContain("Availability: Unknown");
    expect(errorCard?.textContent).toContain("Time unavailable");
    expect(errorCard?.textContent).toContain("Menu unavailable");
    expect(errorCard?.textContent).toContain("Notes unavailable");
  });

  it("identifies a stale result as cached and preserves its retrieval timestamp", () => {
    const state = readyState();
    const ready = state.colleges.churchill;
    if (ready.status !== "ready") throw new Error("test fixture must be ready");
    const staleDay: DiningDay = { ...ready.day, freshness: "stale", fetchedAt: "2026-08-10T20:00:00.000Z" };
    state.colleges.churchill = { status: "ready", day: staleDay };
    const root = render(state);

    expect(root.textContent).toContain("Cached result");
    expect(root.textContent).toContain("10 Aug 2026");
  });

  it("renders source text as text rather than source HTML", () => {
    const state = readyState();
    const ready = state.colleges.churchill;
    if (ready.status !== "ready") throw new Error("test fixture must be ready");
    state.colleges.churchill = {
      status: "ready",
      day: {
        ...ready.day,
        meals: {
          ...ready.day.meals,
          lunch: { ...ready.day.meals.lunch, menu: { kind: "items", items: ["<img src=x onerror=alert(1)>"] } }
        }
      }
    };

    const root = render(state);
    expect(root.querySelector("img")).toBeNull();
    expect(root.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("provides labelled semantic controls, dates, meals, state text, and descriptive PDF titles", () => {
    const root = render();

    const dateInput = root.querySelector<HTMLInputElement>('input[type="date"]');
    expect(dateInput?.id).toBe("dining-date");
    expect(root.querySelector(`label[for="${dateInput?.id}"]`)?.textContent).toContain("Dining date");
    expect(root.querySelector('button[name="previous"]')?.getAttribute("aria-label")).toBe("Previous dining date");
    expect(root.querySelector('button[name="next"]')?.getAttribute("aria-label")).toBe("Next dining date");
    expect(root.querySelector('button[name="today"]')?.getAttribute("aria-label")).toBe("Select today");
    expect(root.querySelector('button[name="refresh"]')?.getAttribute("aria-label")).toBe("Refresh dining data");
    expect(root.querySelector('time[datetime="2026-08-11"]')?.textContent).toContain("Tuesday, 11 August 2026");

    const mealSections = [...root.querySelectorAll<HTMLElement>('article section[data-meal]')];
    expect(mealSections).toHaveLength(8);
    for (const section of mealSections) {
      const headingId = section.getAttribute("aria-labelledby");
      expect(headingId).toBeTruthy();
      expect(section.querySelector(`h3#${headingId}`)).not.toBeNull();
    }

    expect(root.querySelector('[role="status"]')?.textContent).toContain("Freshness: Live data");
    expect(root.textContent).toContain("Availability: Unknown");
    expect(root.querySelector('object[data$="week-3-lunch.pdf"]')?.getAttribute("title")).toBe("St Edmund's College lunch menu for Week 3");
    expect(root.querySelector('object[data$="week-3-dinner.pdf"]')?.getAttribute("title")).toBe("St Edmund's College dinner menu for Week 3");
  });

  it("announces loading and error states with readable status text", () => {
    const loading: DashboardState = {
      selectedDate,
      colleges: {
        churchill: { status: "loading", college: "churchill", collegeName: "Churchill College" },
        "st-edmunds": {
          status: "error",
          college: "st-edmunds",
          collegeName: "St Edmund's College",
          message: "Live St Edmund's College dining data could not be loaded.",
          sourceLinks: []
        }
      }
    };
    const root = render(loading);

    const stateText = [...root.querySelectorAll('[role="status"]')].map((region) => region.textContent ?? "");
    expect(stateText[0]).toContain("Loading live dining data…");
    expect(stateText[1]).toContain("Live St Edmund's College dining data could not be loaded.");
  });
});
