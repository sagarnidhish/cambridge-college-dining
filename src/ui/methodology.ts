import { COLLEGES } from "../domain/catalog";
import { formatCambridgeTimestamp } from "../domain/dates";
import type { EvidenceKind } from "../domain/types";

export interface MethodologyMetadata {
  collectedAt?: string;
}

const EVIDENCE: ReadonlyArray<{ kind: EvidenceKind; label: string; explanation: string }> = [
  { kind: "official-college", label: "Official college", explanation: "A page, document, or feed published by the college." },
  { kind: "official-university", label: "Official University", explanation: "A University of Cambridge page used where a college page was not publicly available." },
  { kind: "official-student-body", label: "Official student body", explanation: "A JCR, MCR, or students' union page; useful, but maintained separately from the college." },
  { kind: "supplementary", label: "Supplementary, not official", explanation: "A secondary reference that is clearly labelled and never treated as definitive." }
];

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function safeSource(label: string, value: string): HTMLAnchorElement | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const anchor = element("a", label);
    anchor.href = url.href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    return anchor;
  } catch {
    return null;
  }
}

export function appendMethodology(parent: HTMLElement, metadata: MethodologyMetadata = {}): HTMLElement {
  const article = element("article");
  article.className = "methodology";
  article.append(element("h1", "Sources and Methodology"));
  article.append(element("p", "This directory separates confirmed dining information from unknowns. It does not infer that a meal is open, accessible, or available merely because a page exists."));

  const freshness = element("section");
  freshness.append(element("h2", "Freshness and date handling"));
  freshness.append(element("p", "Live means the official source was requested for this page load. Scheduled snapshot means a checked-in daily collection is being shown. Cached fallback means an earlier exact-date result is shown after a current request failed."));
  freshness.append(element("p", "Meal details are shown only when dated material or a clearly applicable recurring schedule supports the selected date. Full Term labels are derived from published University term dates; they are context, not proof that a servery is open."));
  if (metadata.collectedAt !== undefined) freshness.append(element("p", `Scheduled sources last collected: ${formatCambridgeTimestamp(metadata.collectedAt)}.`));
  article.append(freshness);

  const cautions = element("section");
  cautions.append(element("h2", "Important limitations"));
  const cautionList = element("ul");
  for (const item of [
    "Access and prices can change, may differ by audience, and must be checked on the linked source before travelling.",
    "Unknown means the public evidence was insufficient; it does not mean closed.",
    "Menus and special restrictions may change at short notice. Ask catering staff about allergens and dietary requirements.",
    "Supplementary evidence is labelled and is not treated as an official college statement."
  ]) cautionList.append(element("li", item));
  cautions.append(cautionList);
  article.append(cautions);

  const definitions = element("section");
  definitions.append(element("h2", "Evidence labels"));
  const terms = element("dl");
  for (const item of EVIDENCE) {
    const row = element("div");
    row.dataset.evidence = item.kind;
    row.append(element("dt", item.label), element("dd", item.explanation));
    terms.append(row);
  }
  definitions.append(terms);
  article.append(definitions);

  const sources = element("section");
  sources.append(element("h2", "College source directory"));
  sources.append(element("p", "Open the source beside any college to verify the current information yourself."));
  const list = element("div");
  list.className = "source-directory";
  for (const college of COLLEGES) {
    const group = element("section");
    group.dataset.sourceCollege = college.id;
    group.append(element("h3", college.name));
    const sourceList = element("ul");
    for (const source of college.sources) {
      const anchor = safeSource(source.label, source.url);
      if (anchor === null) continue;
      const item = element("li");
      item.append(anchor, document.createTextNode(` — ${EVIDENCE.find(({ kind }) => kind === (source.evidence ?? "official-college"))?.label ?? "Official college"}${source.asOf === undefined ? "" : `; as of ${source.asOf}`}`));
      sourceList.append(item);
    }
    if (sourceList.children.length === 0) sourceList.append(element("li", "No safe public HTTPS source is currently listed."));
    group.append(sourceList);
    list.append(group);
  }
  sources.append(list);
  article.append(sources);
  parent.append(article);
  return article;
}
