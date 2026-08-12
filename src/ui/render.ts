import { weekdayForIso } from "../domain/dates";
import type { CollegeId, DashboardState, DiningDay } from "../domain/types";
import { tableRows, type TableOptions, type TableSort } from "./table-model";
import { appendDetailDialog } from "./detail-dialog";
import { appendMethodology } from "./methodology";
import { appendPageCounter } from "./counter";
import type { AppView } from "./query-state";
import { appendEatabilityPanel } from "./eatability-panel";

export type DashboardFilter = "serving" | "unhosted" | "menuPublished" | "accessUnknown";

export interface DashboardViewState {
  dashboard: DashboardState;
  options: TableOptions;
  focusedEatabilityCollege: CollegeId | null;
  selectedCollege: CollegeId | null;
  view: AppView;
}

function appendNavigation(parent: HTMLElement, current: AppView): void {
  const navigation = element("nav");
  navigation.className = "site-navigation";
  navigation.setAttribute("aria-label", "Main navigation");
  const directory = element("a", "College directory");
  directory.setAttribute("href", "?view=directory");
  const sources = element("a", "Sources and Methodology");
  sources.setAttribute("href", "?view=sources");
  (current === "directory" ? directory : sources).setAttribute("aria-current", "page");
  navigation.append(directory, sources);
  parent.append(navigation);
}

function latestScheduledTimestamp(dashboard: DashboardState): string | undefined {
  return Object.values(dashboard.colleges)
    .flatMap((state) => state.status === "ready" && state.day.freshness === "scheduled" ? [state.day.fetchedAt] : [])
    .sort()
    .at(-1);
}

export interface DashboardActions {
  previousDate(): void;
  nextDate(): void;
  selectToday(): void;
  selectDate(value: string): void;
  refresh(): void;
  setQuery(value: string): void;
  setFilter(filter: DashboardFilter, checked: boolean): void;
  sortBy(column: TableSort): void;
  clearFilters(): void;
  focusEatabilityCollege(college: CollegeId): void;
  openCollege(college: CollegeId): void;
  closeCollege(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function formattedDate(date: string): string {
  const display = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00.000Z`));
  return `${weekdayForIso(date as DiningDay["date"])}, ${display}`;
}

function appendDateControls(parent: HTMLElement, date: string, actions: DashboardActions): void {
  const section = element("section");
  section.className = "date-controls";
  section.setAttribute("aria-label", "Dining date controls");
  const button = (name: string, label: string, action: () => void): HTMLButtonElement => {
    const control = element("button", label);
    control.type = "button";
    control.name = name;
    control.dataset.focusKey = name;
    control.addEventListener("click", action);
    return control;
  };
  const previous = button("previous", "Previous day", actions.previousDate);
  const today = button("today", "Today", actions.selectToday);
  const next = button("next", "Next day", actions.nextDate);
  const label = element("label", "Dining date");
  const dateInput = element("input");
  dateInput.id = "dining-date";
  dateInput.type = "date";
  dateInput.value = date;
  dateInput.dataset.focusKey = "date";
  dateInput.addEventListener("change", () => actions.selectDate(dateInput.value));
  label.htmlFor = dateInput.id;
  label.append(dateInput);
  const refresh = button("refresh", "Refresh data", actions.refresh);
  section.append(previous, today, next, label, refresh);
  parent.append(section);
}

const FILTERS: ReadonlyArray<{ key: DashboardFilter; label: string }> = [
  { key: "serving", label: "Serving today" },
  { key: "unhosted", label: "Confirmed without a host" },
  { key: "menuPublished", label: "Menu published" },
  { key: "accessUnknown", label: "Access unknown" }
];

function appendDirectoryControls(parent: HTMLElement, options: TableOptions, actions: DashboardActions): void {
  const disclosure = element("details");
  disclosure.className = "directory-filter-disclosure";
  disclosure.open = true;
  disclosure.append(element("summary", "Filter all 31 colleges"));
  const section = element("section");
  section.className = "directory-controls";
  section.setAttribute("aria-label", "Filter colleges");
  const searchLabel = element("label", "Search colleges or dining areas");
  const search = element("input");
  search.type = "search";
  search.name = "college-search";
  search.value = options.query;
  search.dataset.focusKey = "search";
  search.addEventListener("input", () => actions.setQuery(search.value));
  searchLabel.append(search);
  const fieldset = element("fieldset");
  fieldset.append(element("legend", "Evidence filters"));
  for (const { key, label } of FILTERS) {
    const filterLabel = element("label");
    const checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.name = key;
    checkbox.checked = options[key];
    checkbox.dataset.focusKey = `filter-${key}`;
    checkbox.addEventListener("change", () => actions.setFilter(key, checkbox.checked));
    filterLabel.append(checkbox, document.createTextNode(` ${label}`));
    fieldset.append(filterLabel);
  }
  section.append(searchLabel, fieldset);
  disclosure.append(section);
  parent.append(disclosure);
}

const COLUMNS: ReadonlyArray<{ key: TableSort; label: string; className?: string }> = [
  { key: "college", label: "College" },
  { key: "services", label: "Services today" },
  { key: "next", label: "Next meal/time", className: "optional-column" },
  { key: "access", label: "Access" },
  { key: "price", label: "Indicative price", className: "optional-column" },
  { key: "freshness", label: "Freshness", className: "optional-column" }
];

function appendDirectoryTable(parent: HTMLElement, view: DashboardViewState, actions: DashboardActions): void {
  const rows = tableRows(view.dashboard, view.options);
  const count = element("p", `Showing ${rows.length} of 31 colleges`);
  count.className = "result-count";
  count.setAttribute("role", "status");
  count.setAttribute("aria-live", "polite");
  parent.append(count);

  const wrapper = element("div");
  wrapper.className = "table-scroll";
  const table = element("table");
  table.className = "college-table";
  const caption = element("caption", `College dining for ${formattedDate(view.dashboard.selectedDate)}`);
  const head = element("thead");
  const headerRow = element("tr");
  for (const column of COLUMNS) {
    const heading = element("th");
    heading.scope = "col";
    heading.dataset.column = column.key;
    if (column.className !== undefined) heading.className = column.className;
    if (view.options.sort === column.key) heading.setAttribute("aria-sort", view.options.direction === "asc" ? "ascending" : "descending");
    const sort = element("button", column.label);
    sort.type = "button";
    sort.dataset.sort = column.key;
    sort.dataset.focusKey = `sort-${column.key}`;
    sort.addEventListener("click", () => actions.sortBy(column.key));
    heading.append(sort);
    headerRow.append(heading);
  }
  head.append(headerRow);
  const body = element("tbody");
  if (rows.length === 0) {
    const row = element("tr");
    const cell = element("td");
    cell.colSpan = COLUMNS.length;
    cell.append(element("p", "No colleges match the active search and filters."));
    const clear = element("button", "Clear filters");
    clear.type = "button";
    clear.name = "clear-filters";
    clear.addEventListener("click", actions.clearFilters);
    cell.append(clear);
    row.append(cell);
    body.append(row);
  } else {
    for (const rowModel of rows) {
      const row = element("tr");
      row.dataset.collegeRow = rowModel.id;
      row.dataset.status = rowModel.status;
      const collegeCell = element("th");
      collegeCell.scope = "row";
      const rowActions = element("div");
      rowActions.className = "college-row-actions";
      const map = element("a", rowModel.name);
      map.className = "college-map-link";
      map.dataset.mapLink = rowModel.id;
      map.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rowModel.mapQuery)}`;
      map.target = "_blank";
      map.rel = "noopener noreferrer";
      const open = element("button", "Details");
      open.type = "button";
      open.className = "college-row-button";
      open.dataset.college = rowModel.id;
      open.dataset.focusKey = `college-${rowModel.id}`;
      open.setAttribute("aria-label", `Open ${rowModel.name} dining details for ${formattedDate(view.dashboard.selectedDate)}`);
      open.addEventListener("click", () => actions.openCollege(rowModel.id));
      rowActions.append(map, open);
      collegeCell.append(rowActions);
      const services = element("td", rowModel.services);
      const sourceState = view.dashboard.colleges[rowModel.id];
      if (sourceState?.status === "error") {
        const detail = element("span", ` ${sourceState.message}`);
        detail.className = "visually-hidden";
        services.append(detail);
      }
      const next = element("td", rowModel.next);
      next.className = "optional-column";
      const access = element("td", rowModel.access);
      const price = element("td", rowModel.price);
      price.className = "optional-column";
      const freshness = element("td", rowModel.freshness);
      freshness.className = "optional-column";
      row.append(collegeCell, services, next, access, price, freshness);
      body.append(row);
    }
  }
  table.append(caption, head, body);
  wrapper.append(table);
  parent.append(wrapper);
}

export function renderDashboard(root: HTMLElement, view: DashboardViewState, actions: DashboardActions): void {
  const focused = document.activeElement;
  const focusKey = focused instanceof HTMLElement && root.contains(focused) ? focused.dataset.focusKey : undefined;
  const dashboard = element("div");
  dashboard.className = "dashboard";
  const directory = element("div");
  directory.className = "directory-content";
  appendNavigation(directory, view.view);
  if (view.view === "directory") {
    directory.append(element("h1", "Cambridge college dining"));
    directory.append(element("p", "Compare published dining information across all 31 Cambridge colleges."));
    appendDateControls(directory, view.dashboard.selectedDate, actions);
    appendEatabilityPanel(directory, view.dashboard, view.focusedEatabilityCollege, {
      focusCollege: actions.focusEatabilityCollege,
      openCollege: actions.openCollege
    });
    appendDirectoryControls(directory, view.options, actions);
    appendDirectoryTable(directory, view, actions);
  } else {
    const collectedAt = latestScheduledTimestamp(view.dashboard);
    appendMethodology(directory, collectedAt === undefined ? {} : { collectedAt });
  }
  const footer = element("footer");
  footer.append(element("p", "Always verify timings, access, prices, and restrictions on the linked source before travelling."));
  appendPageCounter(footer);
  directory.append(footer);
  dashboard.append(directory);
  if (view.view === "directory" && view.selectedCollege !== null) {
    directory.inert = true;
    appendDetailDialog(dashboard, view.dashboard.colleges[view.selectedCollege], view.dashboard.selectedDate, actions.closeCollege);
  }
  root.replaceChildren(dashboard);
  if (focusKey !== undefined) {
    const replacement = root.querySelector<HTMLElement>(`[data-focus-key="${focusKey}"]`);
    replacement?.focus();
    if (replacement instanceof HTMLInputElement && replacement.type === "search") replacement.setSelectionRange(replacement.value.length, replacement.value.length);
  }
}
