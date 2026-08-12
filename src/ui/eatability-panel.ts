import { eatabilityResults, type EatabilityResult } from "../domain/eatability";
import type { CollegeId, DashboardState, MealType } from "../domain/types";

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  brunch: "Brunch",
  lunch: "Lunch",
  dinner: "Dinner"
};

export interface EatabilityPanelActions {
  focusCollege(college: CollegeId): void;
  openCollege(college: CollegeId): void;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function resultSummary(result: EatabilityResult): string {
  return result.meals.map(({ type, time }) => `${MEAL_LABEL[type]} · ${time}`).join("; ");
}

function appendTier(
  parent: HTMLElement,
  heading: string,
  results: EatabilityResult[],
  selected: CollegeId | null,
  loading: boolean,
  actions: EatabilityPanelActions
): void {
  const section = element("section");
  section.className = "eatability-tier";
  section.append(element("h3", `${heading} (${results.length})`));
  if (results.length === 0) {
    section.append(element("p", loading ? "Checking current evidence…" : "No source-confirmed options in this tier."));
    parent.append(section);
    return;
  }

  const list = element("ul");
  for (const result of results) {
    const item = element("li");
    const focus = element("button");
    focus.type = "button";
    focus.className = "eatability-result";
    focus.dataset.mapCollege = result.college;
    focus.dataset.focusKey = `map-${result.college}`;
    focus.setAttribute("aria-pressed", String(result.college === selected));
    focus.append(
      element("strong", result.collegeName),
      element("span", result.diningArea),
      element("span", resultSummary(result)),
      element("span", result.accessSummary)
    );
    if (result.price !== null) focus.append(element("span", `${result.price.label}: ${result.price.amount}`));
    focus.addEventListener("click", () => actions.focusCollege(result.college));
    const details = element("button", "Open details");
    details.type = "button";
    details.className = "eatability-details";
    details.dataset.mapDetails = result.college;
    details.dataset.focusKey = `map-details-${result.college}`;
    details.addEventListener("click", () => actions.openCollege(result.college));
    item.append(focus, details);
    list.append(item);
  }
  section.append(list);
  parent.append(section);
}

export function appendEatabilityPanel(
  parent: HTMLElement,
  dashboard: DashboardState,
  focusedCollege: CollegeId | null,
  actions: EatabilityPanelActions
): HTMLElement {
  const panel = element("section");
  panel.className = "eatability-panel";
  panel.setAttribute("aria-labelledby", "eatability-heading");
  const heading = element("h2", "Where can I eat?");
  heading.id = "eatability-heading";
  panel.append(heading);

  const results = eatabilityResults(dashboard);
  const confirmed = results.filter(({ tier }) => tier === "confirmed");
  const hosted = results.filter(({ tier }) => tier === "host-required");
  const loading = Object.values(dashboard.colleges).some(({ status }) => status === "loading");
  const selected = results.find(({ college }) => college === focusedCollege) ?? confirmed[0] ?? hosted[0] ?? null;
  const status = element("p", loading
    ? "Loading current public dining evidence…"
    : results.length === 0
    ? "No option confirmed from current public evidence"
    : `${confirmed.length} confirmed without a host; ${hosted.length} need a host or booking.`);
  status.className = "eatability-count";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  panel.append(status);

  const layout = element("div");
  layout.className = "eatability-layout";
  const tiers = element("div");
  tiers.className = "eatability-lists";
  appendTier(tiers, "Confirmed without a host", confirmed, selected?.college ?? null, loading, actions);
  appendTier(tiers, "Host or booking needed", hosted, selected?.college ?? null, loading, actions);
  layout.append(tiers);

  const mapArea = element("div");
  mapArea.className = "eatability-map";
  if (selected === null) {
    mapArea.append(element("p", "A map will appear when current public evidence supports a date-applicable option."));
  } else {
    const encoded = encodeURIComponent(selected.mapQuery);
    const map = element("iframe");
    map.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    map.title = `${selected.collegeName} dining location map`;
    map.setAttribute("loading", "lazy");
    map.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    const mapLink = element("a", `Open ${selected.collegeName} in Google Maps`);
    mapLink.className = "eatability-map-link";
    mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    mapLink.target = "_blank";
    mapLink.rel = "noopener noreferrer";
    mapArea.append(map, mapLink);
  }
  layout.append(mapArea);
  panel.append(layout);
  parent.append(panel);
  return panel;
}
