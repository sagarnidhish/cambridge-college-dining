const origin = "https://example.github.io";
const request = { headers: { Accept: "application/json", Origin: "https://example.github.io" }, cache: "no-store" };

const endpoints = [
  {
    label: "Churchill",
    url: "https://www.chu.cam.ac.uk/wp-json/wp/v2/pages/1305?_fields=id,modified,link,title,content",
    validate(payload) {
      requireRenderedPage(payload, "Churchill");
    }
  },
  {
    label: "St Edmund's menus",
    url: "https://my.st-edmunds.cam.ac.uk/wp-json/wp/v2/posts?categories=69&per_page=10&_fields=id,date,modified,link,title,content",
    validate(payload) {
      if (!Array.isArray(payload) || payload.length === 0 || !payload.some(containsPdfUrl)) {
        throw new Error("expected a non-empty post array containing a .pdf URL");
      }
    }
  },
  {
    label: "St Edmund's catering",
    url: "https://my-cr.st-edmunds.cam.ac.uk/wp-json/wp/v2/pages/18?_fields=id,modified,link,title,content",
    validate(payload) {
      requireRenderedPage(payload, "St Edmund's catering");
    }
  }
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRenderedPage(payload, label) {
  if (!isRecord(payload) || !isRecord(payload.content) || typeof payload.content.rendered !== "string" || !payload.content.rendered.trim()) {
    throw new Error(`${label} did not return non-empty content.rendered`);
  }
}

function containsPdfUrl(value) {
  return isRecord(value) && isRecord(value.content) && typeof value.content.rendered === "string" && /https?:[^\"'<>\s]+\.pdf(?:[?#][^\"'<>\s]*)?/i.test(value.content.rendered);
}

async function checkEndpoint({ label, url, validate }) {
  const response = await fetch(url, request);
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${label}: expected JSON content type, received ${contentType || "none"}`);
  }

  const allowedOrigin = response.headers.get("access-control-allow-origin");
  if (allowedOrigin !== "*" && allowedOrigin !== origin) {
    throw new Error(`${label}: expected ACAO ${origin} or *, received ${allowedOrigin ?? "none"}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`${label}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
  validate(payload);
  console.log(`PASS ${label}`);
}

for (const endpoint of endpoints) {
  try {
    await checkEndpoint(endpoint);
  } catch (error) {
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
