export interface WordPressPage {
  id: number;
  modified: string;
  link: string;
  title?: { rendered: string };
  content: { rendered: string; protected: boolean };
}

export interface WordPressPost extends WordPressPage {
  date: string;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function htmlLines(element: Element): string[] {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return (clone.textContent ?? "").split(/\n+/).map(normalizeWhitespace).filter(Boolean);
}
