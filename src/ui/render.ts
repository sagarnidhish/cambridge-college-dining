import { formatCambridgeTimestamp, weekdayForIso } from "../domain/dates";
import { MEAL_TYPES, type CollegeViewState, type DashboardState, type DiningDay, type MealRecord, type SourceLink } from "../domain/types";

export interface DashboardActions {
  previousDate(): void;
  nextDate(): void;
  selectToday(): void;
  selectDate(value: string): void;
  refresh(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function formattedDate(date: string): string {
  const display = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00.000Z`));
  return `${weekdayForIso(date as DiningDay["date"])}, ${display}`;
}

function appendField(parent: HTMLElement, label: string, value: string): HTMLElement {
  const field = element("p");
  field.append(element("strong", `${label}:`), document.createTextNode(` ${value}`));
  parent.append(field);
  return field;
}

function availabilityLabel(value: MealRecord["availability"]): string {
  return value === "available" ? "Available" : value === "closed" ? "Closed" : "Unknown";
}

function appendExternalLink(parent: HTMLElement, label: string, url: string): HTMLAnchorElement | null {
  const safeUrl = safeHttpsUrl(url);
  if (safeUrl === null) {
    return null;
  }
  const link = element("a", label);
  link.href = safeUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  parent.append(link);
  return link;
}

function appendMenu(parent: HTMLElement, menu: MealRecord["menu"]): void {
  const container = element("div");
  container.append(element("strong", "Menu:"));
  if (menu.kind === "items") {
    const list = element("ul");
    for (const item of menu.items) {
      list.append(element("li", item));
    }
    container.append(list);
  } else if (menu.kind === "pdf") {
    const safeUrl = safeHttpsUrl(menu.url);
    if (safeUrl === null) {
      container.append(document.createTextNode(" Menu unavailable"));
    } else {
      const object = element("object");
      object.type = "application/pdf";
      object.data = safeUrl;
      object.title = menu.label;
      object.append(document.createTextNode("PDF preview unavailable. "));
      appendExternalLink(object, menu.label, safeUrl);
      container.append(object);
    }
  } else {
    container.append(document.createTextNode(` ${menu.message}`));
  }
  parent.append(container);
}

function appendMeal(parent: HTMLElement, meal: MealRecord): void {
  const section = element("section");
  const mealLabel = { breakfast: "Breakfast", brunch: "Brunch", lunch: "Lunch", dinner: "Dinner" }[meal.type];
  section.append(element("h3", mealLabel));
  appendField(section, "Availability", availabilityLabel(meal.availability));
  appendField(section, "Time", meal.time);
  appendMenu(section, meal.menu);
  appendField(section, "Notes", meal.notes.length > 0 ? meal.notes.join(" ") : "No special notes published");
  parent.append(section);
}

function appendOfficialSources(parent: HTMLElement, sources: SourceLink[]): void {
  const section = element("section");
  section.append(element("h3", "Official sources"));
  let rendered = false;
  for (const source of sources) {
    const link = appendExternalLink(section, `View official source: ${source.label}`, source.url);
    if (link !== null) {
      rendered = true;
      section.append(document.createElement("br"));
    }
  }
  if (!rendered) {
    section.append(element("p", "Official source URL unavailable."));
  }
  parent.append(section);
}

function appendNotices(parent: HTMLElement, notices: string[]): void {
  const section = element("section");
  section.append(element("h3", "Notices"));
  if (notices.length === 0) {
    section.append(element("p", "No general notices published."));
  } else {
    const list = element("ul");
    for (const notice of notices) {
      list.append(element("li", notice));
    }
    section.append(list);
  }
  parent.append(section);
}

function appendReadyCard(parent: HTMLElement, day: DiningDay): void {
  const card = element("article");
  card.append(element("h2", day.collegeName));
  card.append(element("p", formattedDate(day.date)));
  card.append(element("p", day.freshness === "live" ? "Live data" : "Cached result"));
  card.append(element("p", `Last checked: ${formatCambridgeTimestamp(day.fetchedAt)}`));
  for (const mealType of MEAL_TYPES) {
    appendMeal(card, day.meals[mealType]);
  }
  appendNotices(card, day.notices);
  appendOfficialSources(card, day.sourceLinks);
  parent.append(card);
}

function appendUnavailableCard(
  parent: HTMLElement,
  state: Exclude<CollegeViewState, { status: "ready" }>,
  selectedDate: string
): void {
  const card = element("article");
  card.append(element("h2", state.collegeName));
  card.append(element("p", formattedDate(selectedDate)));
  const liveRegion = element("p");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.textContent = state.status === "loading" ? "Loading live dining data…" : state.message;
  card.append(liveRegion);
  if (state.status === "error") {
    appendOfficialSources(card, state.sourceLinks);
  }
  parent.append(card);
}

function appendControls(parent: HTMLElement, selectedDate: string, actions: DashboardActions): void {
  const controls = element("section");
  controls.setAttribute("aria-label", "Dining date controls");
  const previous = element("button", "Previous");
  previous.name = "previous";
  previous.type = "button";
  previous.addEventListener("click", actions.previousDate);
  const today = element("button", "Today");
  today.name = "today";
  today.type = "button";
  today.addEventListener("click", actions.selectToday);
  const next = element("button", "Next");
  next.name = "next";
  next.type = "button";
  next.addEventListener("click", actions.nextDate);
  const dateInput = element("input");
  dateInput.type = "date";
  dateInput.value = selectedDate;
  dateInput.setAttribute("aria-label", "Select dining date");
  dateInput.addEventListener("change", () => actions.selectDate(dateInput.value));
  const refresh = element("button", "Refresh");
  refresh.name = "refresh";
  refresh.type = "button";
  refresh.addEventListener("click", actions.refresh);
  controls.append(previous, today, next, dateInput, refresh);
  parent.append(controls);
}

export function renderDashboard(root: HTMLElement, state: DashboardState, actions: DashboardActions): void {
  const dashboard = element("div");
  dashboard.append(element("h1", "Cambridge college dining"));
  appendControls(dashboard, state.selectedDate, actions);
  for (const college of [state.colleges.churchill, state.colleges["st-edmunds"]]) {
    if (college.status === "ready") {
      appendReadyCard(dashboard, college.day);
    } else {
      appendUnavailableCard(dashboard, college, state.selectedDate);
    }
  }
  root.replaceChildren(dashboard);
}
