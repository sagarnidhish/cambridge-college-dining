import type { WordPressPage, WordPressPost } from "./wordpress";

export const CHURCHILL_API = "https://www.chu.cam.ac.uk/wp-json/wp/v2/pages/1305?_fields=id,modified,link,title,content";
export const ST_EDMUNDS_POSTS_API = "https://my.st-edmunds.cam.ac.uk/wp-json/wp/v2/posts?categories=69&per_page=10&_fields=id,date,modified,link,title,content";
export const ST_EDMUNDS_CATERING_API = "https://my-cr.st-edmunds.cam.ac.uk/wp-json/wp/v2/pages/18?_fields=id,modified,link,title,content";

export interface ChurchillSnapshot {
  page: WordPressPage;
}

export interface StEdmundsSnapshot {
  posts: WordPressPost[];
  cateringPage: WordPressPage;
}

const requestInit: RequestInit = {
  cache: "no-store",
  headers: { Accept: "application/json" }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWordPressPage(value: unknown): value is WordPressPage {
  if (!isRecord(value) || typeof value.id !== "number" || typeof value.modified !== "string" || typeof value.link !== "string") {
    return false;
  }
  if (!isRecord(value.content) || typeof value.content.rendered !== "string" || typeof value.content.protected !== "boolean") {
    return false;
  }
  return value.title === undefined || (isRecord(value.title) && typeof value.title.rendered === "string");
}

function isWordPressPost(value: unknown): value is WordPressPost {
  return isRecord(value) && isWordPressPage(value) && typeof value["date"] === "string";
}

async function fetchJson(fetchImpl: typeof fetch, url: string): Promise<unknown> {
  const response = await fetchImpl(url, requestInit);
  if (!response.ok) {
    throw new Error(`Official source request failed (${response.status})`);
  }
  return response.json();
}

function pageFromList(value: unknown, source: string): WordPressPage {
  if (!Array.isArray(value) || !isWordPressPage(value[0])) {
    throw new Error(`${source} returned an invalid page response`);
  }
  return value[0];
}

export async function fetchChurchillSnapshot(fetchImpl: typeof fetch): Promise<ChurchillSnapshot> {
  return { page: pageFromList(await fetchJson(fetchImpl, CHURCHILL_API), "Churchill") };
}

export async function fetchStEdmundsSnapshot(fetchImpl: typeof fetch): Promise<StEdmundsSnapshot> {
  const [postsResponse, cateringResponse] = await Promise.all([
    fetchJson(fetchImpl, ST_EDMUNDS_POSTS_API),
    fetchJson(fetchImpl, ST_EDMUNDS_CATERING_API)
  ]);
  if (!Array.isArray(postsResponse) || !postsResponse.every(isWordPressPost)) {
    throw new Error("St Edmund's posts returned an invalid response");
  }

  return {
    posts: postsResponse,
    cateringPage: pageFromList(cateringResponse, "St Edmund's catering")
  };
}
