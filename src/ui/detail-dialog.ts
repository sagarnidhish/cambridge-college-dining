import { formatCambridgeTimestamp, weekdayForIso } from "../domain/dates";
import { MEAL_TYPES, type CollegeViewState, type DiningDay, type EvidenceKind, type IsoDate, type MealRecord, type MealType, type MenuContent, type SourceLink } from "../domain/types";

const MEAL_LABEL: Record<MealType, string> = { breakfast: "Breakfast", brunch: "Brunch", lunch: "Lunch", dinner: "Dinner" };
const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  "official-college": "Official college",
  "official-university": "Official University",
  "official-student-body": "Official student body",
  supplementary: "Supplementary, not official"
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function safeHttps(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function link(label: string, url: string, className?: string): HTMLAnchorElement | null {
  const safe = safeHttps(url);
  if (safe === null) return null;
  const anchor = element("a", label);
  anchor.href = safe;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  if (className !== undefined) anchor.className = className;
  return anchor;
}

function field(parent: HTMLElement, label: string, value: string): void {
  const row = element("div");
  row.className = "detail-field";
  row.append(element("dt", `${label}:`), document.createTextNode(" "), element("dd", value));
  parent.append(row);
}

function formattedDate(date: IsoDate): string {
  const display = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00.000Z`));
  return `${weekdayForIso(date)}, ${display}`;
}

function appendSourceLinks(parent: HTMLElement, sources: SourceLink[], prefix = "Open verification source"): void {
  const list = element("ul");
  const seen = new Set<string>();
  for (const source of sources) {
    if (seen.has(source.url)) continue;
    const anchor = link(`${prefix}: ${source.label}`, source.url, "evidence-link");
    if (anchor === null) continue;
    seen.add(source.url);
    const item = element("li");
    item.append(anchor, document.createTextNode(` — ${EVIDENCE_LABEL[source.evidence ?? "official-college"]}${source.asOf === undefined ? "" : `, as of ${source.asOf}`}`));
    list.append(item);
  }
  if (list.children.length === 0) list.append(element("li", "Verification source unavailable"));
  parent.append(list);
}

function menuEntries(value: MenuContent | MenuContent[]): MenuContent[] {
  return Array.isArray(value) ? value : [value];
}

function appendMenu(parent: HTMLElement, menu: MenuContent | MenuContent[]): void {
  const section = element("div");
  section.className = "detail-menu";
  section.append(element("h4", "Menu"));
  for (const entry of menuEntries(menu)) {
    if (entry.kind === "items") {
      const list = element("ul");
      for (const item of entry.items.slice(0, 4)) list.append(element("li", item));
      section.append(list);
      if (entry.items.length > 4) {
        const details = element("details");
        details.append(element("summary", `Show ${entry.items.length - 4} more items`));
        const rest = element("ul");
        for (const item of entry.items.slice(4)) rest.append(element("li", item));
        details.append(rest);
        section.append(details);
      }
    } else if (entry.kind === "message") {
      section.append(element("p", entry.message));
    } else if (entry.kind === "image") {
      const anchor = link(entry.label, entry.url);
      const safe = safeHttps(entry.url);
      if (anchor !== null && safe !== null) {
        const image = element("img");
        image.src = safe;
        image.alt = entry.alt;
        image.loading = "lazy";
        anchor.replaceChildren(image);
        section.append(anchor);
      }
    } else {
      const anchor = link(entry.label, entry.url);
      if (anchor !== null) section.append(anchor);
    }
  }
  parent.append(section);
}

function appendMeal(parent: HTMLElement, meal: MealRecord<MenuContent | MenuContent[]>): void {
  const section = element("section");
  section.className = "detail-meal";
  section.dataset.meal = meal.type;
  section.append(element("h3", MEAL_LABEL[meal.type]));
  const fields = element("dl");
  field(fields, "Availability", "Available");
  field(fields, "Time", meal.time);
  section.append(fields);
  appendMenu(section, meal.menu);
  section.append(element("h4", "Notes"), element("p", meal.notes.length > 0 ? meal.notes.join(" ") : "No special notes published"));
  section.append(element("h4", "Restrictions and dietary information"), element("p", (meal.restrictions ?? []).length > 0 ? meal.restrictions!.join("; ") : "No special restrictions published"));
  const sources = element("div");
  sources.append(element("h4", "Meal sources"));
  appendSourceLinks(sources, meal.sourceLinks);
  section.append(sources);
  parent.append(section);
}

function listSummary(types: MealType[]): string {
  return types.map((type, index) => index === 0 ? MEAL_LABEL[type] : MEAL_LABEL[type].toLocaleLowerCase("en-GB")).join(", ");
}

function accessLabel(classification: NonNullable<DiningDay["access"]>["classification"]): string {
  if (classification === "unhosted-cambridge") return "Confirmed without a host";
  if (classification === "guest-required") return "Host or guest arrangement";
  if (classification === "members-only") return "Members only";
  return "Access unknown";
}

function appendReady(parent: HTMLElement, day: DiningDay): void {
  const mapQuery = encodeURIComponent(day.location?.mapQuery ?? `${day.collegeName}, Cambridge, UK`);
  const title = element("h2");
  title.id = `${day.college}-detail-title`;
  const mapLink = link(day.collegeName, `https://www.google.com/maps/search/?api=1&query=${mapQuery}`);
  title.append(mapLink ?? document.createTextNode(day.collegeName));
  parent.append(title, element("p", formattedDate(day.date)));
  parent.setAttribute("aria-labelledby", title.id);

  const overview = element("dl");
  field(overview, "Dining area", day.location?.diningArea ?? "Dining area not published");
  field(overview, "Access", accessLabel(day.access?.classification ?? "unknown"));
  field(overview, "Access explanation", day.access?.summary ?? "Access information not publicly confirmed");
  field(overview, "Guest rules", day.access?.guestRules ?? "Guest rules not publicly confirmed");
  field(overview, "Payment", day.access?.payment ?? "Payment method not publicly confirmed");
  field(overview, "Term rule", day.termLabel ?? "Term dates not confirmed");
  field(overview, "Freshness", day.freshness === "live" ? "Live" : day.freshness === "scheduled" ? "Scheduled snapshot" : "Cached fallback");
  field(overview, "Last checked", formatCambridgeTimestamp(day.fetchedAt));
  field(overview, "Source modified", day.sourceModifiedAt === null ? "Not published" : formatCambridgeTimestamp(day.sourceModifiedAt));
  parent.append(overview);
  if (day.collectionWarning !== undefined) parent.append(element("p", `Warning: ${day.collectionWarning}`));

  const prices = element("section");
  prices.append(element("h3", "Indicative prices"));
  if ((day.prices ?? []).length === 0) prices.append(element("p", "Price not publicly confirmed"));
  else {
    const list = element("ul");
    for (const price of day.prices ?? []) list.append(element("li", `${price.label}: ${price.amount} (${price.precision}; ${price.audience}; as of ${price.asOf})`));
    prices.append(list);
  }
  parent.append(prices);

  const available = MEAL_TYPES.filter((type) => day.meals[type].availability === "available");
  const closed = MEAL_TYPES.filter((type) => day.meals[type].availability === "closed");
  const unknown = MEAL_TYPES.filter((type) => day.meals[type].availability === "unknown");
  if (closed.length > 0) parent.append(element("p", `Closed today: ${listSummary(closed)}`));
  if (unknown.length > 0) parent.append(element("p", `Not confirmed: ${listSummary(unknown)}`));
  for (const type of available) appendMeal(parent, day.meals[type]);

  const notices = element("section");
  notices.append(element("h3", "Notes and restrictions"));
  if (day.notices.length === 0) notices.append(element("p", "No college-wide or selected-date notices published"));
  else {
    const list = element("ul");
    for (const notice of day.notices) list.append(element("li", notice));
    notices.append(list);
  }
  parent.append(notices);

  const map = element("iframe");
  map.src = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  map.title = `${day.collegeName} dining location map`;
  map.loading = "lazy";
  map.referrerPolicy = "no-referrer-when-downgrade";
  parent.append(map);

  const sources = element("section");
  sources.append(element("h3", "Sources"));
  appendSourceLinks(sources, [...day.sourceLinks, ...(day.access?.sourceLinks ?? [])]);
  parent.append(sources);
}

function focusable(dialog: HTMLDialogElement): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])')];
}

export function appendDetailDialog(
  parent: HTMLElement,
  state: CollegeViewState,
  date: IsoDate,
  onClose: () => void
): HTMLDialogElement {
  const dialog = element("dialog");
  dialog.className = "college-detail-dialog";
  dialog.setAttribute("aria-modal", "true");
  dialog.open = true;
  const close = element("button", "Close details");
  close.type = "button";
  close.name = "close-details";
  close.className = "dialog-close";
  close.addEventListener("click", onClose);
  dialog.append(close);
  if (state.status === "ready") appendReady(dialog, state.day);
  else {
    const title = element("h2", state.collegeName);
    title.id = `${state.college}-detail-title`;
    dialog.setAttribute("aria-labelledby", title.id);
    dialog.append(title, element("p", formattedDate(date)));
    dialog.append(element("p", state.status === "loading" ? "Dining details are loading." : state.message));
    if (state.status === "error") appendSourceLinks(dialog, state.sourceLinks);
  }
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = focusable(dialog);
    const first = controls[0];
    const last = controls.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  parent.append(dialog);
  queueMicrotask(() => {
    if (!dialog.isConnected || typeof dialog.showModal !== "function") return;
    try {
      dialog.open = false;
      dialog.showModal();
    } catch {
      dialog.open = true;
    }
  });
  return dialog;
}
