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

function appendField(parent: HTMLElement, label: string, value: string): void {
  const field = element("dl");
  field.className = "field";
  field.append(element("dt", `${label}:`), document.createTextNode(" "), element("dd", value));
  parent.append(field);
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

function pdfTitle(collegeName: string, mealLabel: string, label: string, url: string): string {
  const weekFromLabel = label.match(/\bweek\s+\d+\b/i)?.[0];
  const weekFromUrl = url.match(/\bweek[-_ ]?(\d+)\b/i)?.[1];
  const week = weekFromLabel ?? (weekFromUrl === undefined ? "published week" : `Week ${weekFromUrl}`);
  return `${collegeName} ${mealLabel.toLowerCase()} menu for ${week}`;
}

function appendMenu(parent: HTMLElement, menu: MealRecord["menu"], collegeName: string, mealLabel: string): void {
  const container = element("div");
  container.className = "menu";
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
      appendExternalLink(container, menu.label, safeUrl);
      const object = element("object");
      object.type = "application/pdf";
      object.data = safeUrl;
      object.title = pdfTitle(collegeName, mealLabel, menu.label, safeUrl);
      object.append(document.createTextNode("PDF preview unavailable. "));
      appendExternalLink(object, menu.label, safeUrl);
      container.append(object);
    }
  } else {
    container.append(document.createTextNode(` ${menu.message}`));
  }
  parent.append(container);
}

function appendMeal(parent: HTMLElement, meal: MealRecord, collegeName: string, collegeId: string): void {
  const section = element("section");
  const mealLabel = { breakfast: "Breakfast", brunch: "Brunch", lunch: "Lunch", dinner: "Dinner" }[meal.type];
  const headingId = `${collegeId}-${meal.type}-heading`;
  section.className = "meal-card";
  section.dataset.meal = meal.type;
  section.dataset.state = meal.availability;
  section.setAttribute("aria-labelledby", headingId);
  const heading = element("h3", mealLabel);
  heading.id = headingId;
  section.append(heading);
  appendField(section, "Availability", availabilityLabel(meal.availability));
  appendField(section, "Time", meal.time);
  appendMenu(section, meal.menu, collegeName, mealLabel);
  appendField(section, "Notes", meal.notes.length > 0 ? meal.notes.join(" ") : "No special notes published");
  parent.append(section);
}

function appendOfficialSources(parent: HTMLElement, sources: SourceLink[]): void {
  const section = element("section");
  section.className = "official-sources";
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

function appendNotices(parent: HTMLElement, notices: string[], collegeId: string): void {
  const section = element("aside");
  section.className = "notices";
  const headingId = `${collegeId}-notices-heading`;
  section.setAttribute("aria-labelledby", headingId);
  const heading = element("h3", "Notices");
  heading.id = headingId;
  section.append(heading);
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

function appendState(parent: HTMLElement, state: "live" | "stale" | "loading" | "error", text: string): void {
  const region = element("p");
  region.className = "state";
  region.dataset.state = state;
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  const iconText = { live: "●", stale: "⚠", loading: "…", error: "!" }[state];
  const icon = element("span", iconText);
  icon.className = "state-icon";
  icon.setAttribute("aria-hidden", "true");
  region.append(icon, document.createTextNode(` ${text}`));
  parent.append(region);
}

function appendReadyCard(parent: HTMLElement, day: DiningDay): void {
  const card = element("article");
  card.className = "college-card";
  card.append(element("h2", day.collegeName));
  const date = element("time", formattedDate(day.date));
  date.dateTime = day.date;
  card.append(date);
  appendState(
    card,
    day.freshness,
    day.freshness === "live" ? "Freshness: Live data" : "Freshness: Cached result (stale data)"
  );
  card.append(element("p", `Last checked: ${formatCambridgeTimestamp(day.fetchedAt)}`));
  for (const mealType of MEAL_TYPES) {
    appendMeal(card, day.meals[mealType], day.collegeName, day.college);
  }
  appendNotices(card, day.notices, day.college);
  appendOfficialSources(card, day.sourceLinks);
  parent.append(card);
}

function appendUnavailableCard(
  parent: HTMLElement,
  state: Exclude<CollegeViewState, { status: "ready" }>,
  selectedDate: string
): void {
  const card = element("article");
  card.className = "college-card";
  card.append(element("h2", state.collegeName));
  const date = element("time", formattedDate(selectedDate));
  date.dateTime = selectedDate;
  card.append(date);
  appendState(card, state.status, state.status === "loading" ? "Loading live dining data…" : state.message);
  if (state.status === "error") {
    appendState(card, "error", "Freshness: Live data unavailable");
    card.append(element("p", "Last checked: unavailable"));
    for (const type of MEAL_TYPES) {
      appendMeal(card, {
        type,
        availability: "unknown",
        time: "Time unavailable",
        menu: { kind: "message", message: "Menu unavailable" },
        notes: ["Notes unavailable"],
        sourceLinks: state.sourceLinks
      }, state.collegeName, state.college);
    }
    appendNotices(card, ["Notices unavailable"], state.college);
    appendOfficialSources(card, state.sourceLinks);
  }
  parent.append(card);
}

function appendControls(parent: HTMLElement, selectedDate: string, actions: DashboardActions): void {
  const controls = element("section");
  controls.className = "date-controls";
  controls.setAttribute("aria-label", "Dining date controls");
  const previous = element("button", "Previous");
  previous.name = "previous";
  previous.type = "button";
  previous.dataset.focusKey = "previous";
  previous.setAttribute("aria-label", "Previous dining date");
  previous.addEventListener("click", actions.previousDate);
  const today = element("button", "Today");
  today.name = "today";
  today.type = "button";
  today.dataset.focusKey = "today";
  today.setAttribute("aria-label", "Select today");
  today.addEventListener("click", actions.selectToday);
  const next = element("button", "Next");
  next.name = "next";
  next.type = "button";
  next.dataset.focusKey = "next";
  next.setAttribute("aria-label", "Next dining date");
  next.addEventListener("click", actions.nextDate);
  const dateInput = element("input");
  dateInput.id = "dining-date";
  dateInput.type = "date";
  dateInput.value = selectedDate;
  dateInput.dataset.focusKey = "date";
  dateInput.addEventListener("change", () => actions.selectDate(dateInput.value));
  const refresh = element("button", "Refresh");
  refresh.name = "refresh";
  refresh.type = "button";
  refresh.dataset.focusKey = "refresh";
  refresh.setAttribute("aria-label", "Refresh dining data");
  refresh.addEventListener("click", actions.refresh);
  const dateLabel = element("label", "Dining date");
  dateLabel.htmlFor = dateInput.id;
  controls.append(previous, today, next, dateLabel, dateInput, refresh);
  parent.append(controls);
}

export function renderDashboard(root: HTMLElement, state: DashboardState, actions: DashboardActions): void {
  const focusedElement = document.activeElement;
  const focusKey =
    focusedElement instanceof HTMLElement && root.contains(focusedElement) ? focusedElement.dataset.focusKey : undefined;
  const dashboard = element("div");
  dashboard.className = "dashboard";
  dashboard.append(element("h1", "Cambridge college dining"));
  appendControls(dashboard, state.selectedDate, actions);
  const collegeGrid = element("div");
  collegeGrid.className = "college-grid";
  for (const college of [state.colleges.churchill, state.colleges["st-edmunds"]]) {
    if (college.status === "ready") {
      appendReadyCard(collegeGrid, college.day);
    } else {
      appendUnavailableCard(collegeGrid, college, state.selectedDate);
    }
  }
  dashboard.append(collegeGrid);
  root.replaceChildren(dashboard);
  if (focusKey !== undefined) {
    root.querySelector<HTMLElement>(`[data-focus-key="${focusKey}"]`)?.focus();
  }
}
