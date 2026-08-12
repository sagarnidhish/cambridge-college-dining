import { SCHEDULED_SOURCES } from "./collector/catalog.mjs";

const origin = "https://sagarnidhish.github.io";
const ACCEPT_JSON = { Accept: "application/json", Origin: origin };
const endpoints = {
  churchill: "https://www.chu.cam.ac.uk/wp-json/wp/v2/pages/1305?_fields=id,modified,link,title,content",
  darwin: "https://www.darwin.cam.ac.uk/wp-json/wp/v2/menus?per_page=20&_fields=id,modified,link,title",
  downing: "https://kitchen.kafoodle.com/api/wba/v1/data/17260",
  stEdmundsPosts: "https://my.st-edmunds.cam.ac.uk/wp-json/wp/v2/posts?categories=69&per_page=10&_fields=id,date,modified,link,title,content",
  stEdmundsCatering: "https://my-cr.st-edmunds.cam.ac.uk/wp-json/wp/v2/pages/18?_fields=id,modified,link,title,content"
};

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRenderedPage(payload, label) {
  if (!isRecord(payload) || !isRecord(payload.content) || typeof payload.content.rendered !== "string" || !payload.content.rendered.trim()) {
    throw new Error(`${label} did not return non-empty content.rendered`);
  }
}

function containsPdfUrl(value) {
  return isRecord(value) && isRecord(value.content) && typeof value.content.rendered === "string" && /https?:[^"'<>\s]+\.pdf(?:[?#][^"'<>\s]*)?/i.test(value.content.rendered);
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, { ...init, redirect: "follow", cache: "no-store", credentials: "omit", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function jsonFromBrowserSource(label, url, init = {}) {
  const response = await fetchWithTimeout(url, { ...init, headers: { ...ACCEPT_JSON, ...init.headers } });
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) throw new Error(`${label}: expected JSON, received ${contentType || "none"}`);
  const allowedOrigin = response.headers.get("access-control-allow-origin");
  if (allowedOrigin !== "*" && allowedOrigin !== origin) throw new Error(`${label}: browser CORS does not allow ${origin}`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${label}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
}

async function checkChurchill() {
  requireRenderedPage(await jsonFromBrowserSource("Churchill", endpoints.churchill), "Churchill");
}

async function checkDarwin() {
  const payload = await jsonFromBrowserSource("Darwin", endpoints.darwin);
  if (!Array.isArray(payload) || payload.length === 0 || !payload.every((menu) => isRecord(menu) && typeof menu.id === "number" && typeof menu.modified === "string")) {
    throw new Error("Darwin: expected a non-empty structured menu collection");
  }
}

async function checkDowning() {
  const base = await jsonFromBrowserSource("Downing base", endpoints.downing);
  if (!isRecord(base) || !Array.isArray(base.menu_groups)) throw new Error("Downing: missing menu_groups");
  const group = base.menu_groups.filter((entry) => isRecord(entry) && entry.is_active === true && typeof entry.id === "number").sort((left, right) => right.id - left.id)[0];
  if (!isRecord(group) || typeof group.id !== "number") throw new Error("Downing: no active menu group");
  const payload = await jsonFromBrowserSource("Downing menu", `${endpoints.downing}/search/${group.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  if (!isRecord(payload) || !Array.isArray(payload.menus) || !payload.menus.some((menu) => isRecord(menu) && Array.isArray(menu.recipes) && menu.recipes.length > 0)) {
    throw new Error("Downing: expected at least one menu with recipes");
  }
}

async function checkStEdmunds() {
  const posts = await jsonFromBrowserSource("St Edmund's menus", endpoints.stEdmundsPosts);
  if (!Array.isArray(posts) || posts.length === 0 || !posts.some(containsPdfUrl)) throw new Error("St Edmund's menus: expected posts containing a PDF URL");
  requireRenderedPage(await jsonFromBrowserSource("St Edmund's catering", endpoints.stEdmundsCatering), "St Edmund's catering");
}

const directChecks = [
  ["Churchill", checkChurchill],
  ["Darwin", checkDarwin],
  ["Downing", checkDowning],
  ["St Edmund's", checkStEdmunds]
];

for (const [label, check] of directChecks) {
  try {
    await check();
    process.stdout.write(`PASS direct ${label}\n`);
  } catch (error) {
    process.stderr.write(`FAIL direct ${label}: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

const scheduledSample = new Set(["christs", "emmanuel", "newnham", "selwyn", "wolfson"]);
for (const source of SCHEDULED_SOURCES.filter(({ id }) => scheduledSample.has(id))) {
  try {
    const response = await fetchWithTimeout(source.url, { headers: { Accept: "text/html,application/pdf;q=0.9,*/*;q=0.5" } });
    await response.body?.cancel();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    process.stdout.write(`PASS scheduled link ${source.name}\n`);
  } catch (error) {
    process.stdout.write(`REVIEW scheduled link ${source.name}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}
