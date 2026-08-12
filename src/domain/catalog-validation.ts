import type { CollegeProfile, ServiceWindow, SourceLink } from "./types";

function isHttps(source: SourceLink): boolean {
  try {
    return new URL(source.url).protocol === "https:";
  } catch {
    return false;
  }
}

function serviceSource(window: ServiceWindow): SourceLink | undefined {
  return window.kind === "unknown" ? window.source : window.source;
}

export function validateCollegeProfiles(profiles: readonly CollegeProfile[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const profile of profiles) {
    const prefix = profile.id;
    if (ids.has(profile.id)) errors.push(`${prefix}: duplicate college id`);
    ids.add(profile.id);
    if (profile.name.trim() === "") errors.push(`${prefix}: missing name`);
    if (profile.diningArea.trim() === "") errors.push(`${prefix}: missing dining area`);
    if (profile.mapQuery.trim() === "" || !profile.mapQuery.includes(profile.diningArea)) errors.push(`${prefix}: invalid dining-area map query`);
    if (profile.sources.length === 0) errors.push(`${prefix}: missing source`);
    for (const source of profile.sources) {
      if (!isHttps(source)) errors.push(`${prefix}: non-HTTPS source ${source.url}`);
      if (source.evidence === undefined) errors.push(`${prefix}: source has no evidence class`);
    }
    const access = profile.access;
    if (access.summary.trim() === "" || access.guestRules.trim() === "" || access.payment.trim() === "") errors.push(`${prefix}: incomplete access guidance`);
    if (access.classification !== "unknown" && !access.sourceLinks.some(isHttps)) errors.push(`${prefix}: classified access has no HTTPS evidence`);
    for (const source of access.sourceLinks) if (!isHttps(source)) errors.push(`${prefix}: invalid access source`);

    const priceKeys = new Set<string>();
    for (const price of profile.prices) {
      if (price.label.trim() === "" || price.amount.trim() === "" || price.audience.trim() === "" || price.asOf.trim() === "") errors.push(`${prefix}: incomplete price quote`);
      if (!isHttps(price.source)) errors.push(`${prefix}: invalid price source`);
      const key = `${price.label}|${price.amount}|${price.audience}|${price.source.url}`;
      if (priceKeys.has(key)) errors.push(`${prefix}: duplicate price quote`);
      priceKeys.add(key);
    }

    for (const [meal, window] of Object.entries(profile.serviceWindows ?? {})) {
      if (window === undefined) continue;
      const source = serviceSource(window);
      if (source === undefined || !isHttps(source)) errors.push(`${prefix}: ${meal} service window has no HTTPS source`);
      if (window.kind === "date-range" && window.validFrom > window.validThrough) errors.push(`${prefix}: ${meal} service range is reversed`);
    }
  }
  return errors;
}
