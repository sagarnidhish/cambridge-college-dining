import type { WordPressPage, WordPressPost } from "./wordpress";
import { parseScheduledSnapshot, type ScheduledSnapshot } from "../snapshots/schema";

export const CHURCHILL_API = "https://www.chu.cam.ac.uk/wp-json/wp/v2/pages/1305?_fields=id,modified,link,title,content";
export const ST_EDMUNDS_POSTS_API = "https://my.st-edmunds.cam.ac.uk/wp-json/wp/v2/posts?categories=69&per_page=10&_fields=id,date,modified,link,title,content";
export const ST_EDMUNDS_CATERING_API = "https://my-cr.st-edmunds.cam.ac.uk/wp-json/wp/v2/pages/18?_fields=id,modified,link,title,content";
export const DARWIN_MENUS_API = "https://www.darwin.cam.ac.uk/wp-json/wp/v2/menus?per_page=20&_fields=id,modified,link,title";
export const DOWNING_BASE_API = "https://kitchen.kafoodle.com/api/wba/v1/data/17260";
export const downingSearchApi = (groupId: number): string => `${DOWNING_BASE_API}/search/${groupId}`;
export const SCHEDULED_SNAPSHOT_URL = "./data/college-dining.json";

export interface ChurchillSnapshot {
  page: WordPressPage;
}

export interface StEdmundsSnapshot {
  posts: WordPressPost[];
  cateringPage: WordPressPage;
}

export interface DarwinMenuRecord {
  id: number;
  modified: string;
  link: string;
  title: { rendered: string };
}

export interface DarwinSnapshot { menus: DarwinMenuRecord[] }

export interface DowningRecipe {
  id: number;
  name: string;
  inherited_allergens: Array<{ id: string; name: string }>;
  tags: Array<{ id: number; name: string; group: string | null }>;
  prices: Array<{ price: number; price_text: string }>;
}

export interface DowningMenu {
  id: number;
  name: string;
  weekdays: Record<"is_sun" | "is_mon" | "is_tue" | "is_wed" | "is_thu" | "is_fri" | "is_sat", boolean>;
  recipes: DowningRecipe[];
}

export interface DowningSnapshot {
  base: { menu_groups: Array<{ id: number; name: string; is_active: boolean }> };
  menu: { menus: DowningMenu[] };
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

async function postJson(fetchImpl: typeof fetch, url: string): Promise<unknown> {
  const response = await fetchImpl(url, {
    ...requestInit,
    method: "POST",
    headers: { ...requestInit.headers, "Content-Type": "text/plain;charset=UTF-8" },
    body: "{}"
  });
  if (!response.ok) throw new Error(`Official source request failed (${response.status})`);
  return response.json();
}

function pageFromResponse(value: unknown, source: string): WordPressPage {
  if (!isWordPressPage(value)) {
    throw new Error(`${source} returned an invalid page response`);
  }
  return value;
}

export async function fetchChurchillSnapshot(fetchImpl: typeof fetch): Promise<ChurchillSnapshot> {
  return { page: pageFromResponse(await fetchJson(fetchImpl, CHURCHILL_API), "Churchill") };
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
    cateringPage: pageFromResponse(cateringResponse, "St Edmund's catering")
  };
}

function darwinMenu(value: unknown): value is DarwinMenuRecord {
  return isRecord(value) && typeof value.id === "number" && typeof value.modified === "string" && typeof value.link === "string"
    && isRecord(value.title) && typeof value.title.rendered === "string";
}

export async function fetchDarwinSnapshot(fetchImpl: typeof fetch): Promise<DarwinSnapshot> {
  const response = await fetchJson(fetchImpl, DARWIN_MENUS_API);
  if (!Array.isArray(response) || response.length === 0 || !response.every(darwinMenu)) {
    throw new Error("Darwin returned an invalid menu collection");
  }
  return { menus: response };
}

function downingBase(value: unknown): value is DowningSnapshot["base"] {
  return isRecord(value) && Array.isArray(value.menu_groups) && value.menu_groups.every((group) =>
    isRecord(group) && typeof group.id === "number" && typeof group.name === "string" && typeof group.is_active === "boolean"
  );
}

function downingRecipe(value: unknown): value is DowningRecipe {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string"
    && Array.isArray(value.inherited_allergens) && value.inherited_allergens.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.name === "string")
    && Array.isArray(value.tags) && value.tags.every((item) => isRecord(item) && typeof item.id === "number" && typeof item.name === "string")
    && Array.isArray(value.prices) && value.prices.every((item) => isRecord(item) && typeof item.price === "number" && typeof item.price_text === "string");
}

function downingMenu(value: unknown): value is DowningMenu {
  if (!isRecord(value) || typeof value.id !== "number" || typeof value.name !== "string" || !isRecord(value.weekdays) || !Array.isArray(value.recipes)) return false;
  const weekdays = value.weekdays;
  return ["is_sun", "is_mon", "is_tue", "is_wed", "is_thu", "is_fri", "is_sat"].every((key) => typeof weekdays[key] === "boolean")
    && value.recipes.every(downingRecipe);
}

function downingSearch(value: unknown): value is DowningSnapshot["menu"] {
  return isRecord(value) && Array.isArray(value.menus) && value.menus.every(downingMenu);
}

export async function fetchDowningSnapshot(fetchImpl: typeof fetch): Promise<DowningSnapshot> {
  const base = await fetchJson(fetchImpl, DOWNING_BASE_API);
  if (!downingBase(base)) throw new Error("Downing returned an invalid outlet response");
  const group = base.menu_groups.filter(({ is_active }) => is_active).sort((left, right) => right.id - left.id)[0];
  if (group === undefined) throw new Error("Downing has no active menu group");
  const menu = await postJson(fetchImpl, downingSearchApi(group.id));
  if (!downingSearch(menu)) throw new Error("Downing returned an invalid menu response");
  return { base, menu };
}

export async function fetchScheduledSnapshot(fetchImpl: typeof fetch): Promise<ScheduledSnapshot> {
  return parseScheduledSnapshot(await fetchJson(fetchImpl, SCHEDULED_SNAPSHOT_URL));
}
