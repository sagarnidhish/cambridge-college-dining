const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAYS_ONLY = WEEKDAYS.slice(0, 5);

function textFromHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&rsquo;|&#8217;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, "-")
    .replace(/&mdash;|&#8212;/gi, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function requirePatterns(source, text, patterns) {
  if (!patterns.every((pattern) => pattern.test(text))) {
    throw new Error(`${source.name} dining structure is not recognized`);
  }
}

function evidence(source, collectedAt) {
  return {
    label: `${source.name} published dining hours`,
    url: source.url,
    evidence: source.evidence ?? "official-college",
    asOf: collectedAt.slice(0, 10)
  };
}

function service(source, collectedAt, type, weekdays, time, windowKind, availability = "available", uncertaintyNote) {
  const link = evidence(source, collectedAt);
  return {
    type,
    weekdays,
    availability,
    time: availability === "available" ? time : `Normally ${time}`,
    menu: { kind: "link", label: `Check ${source.name}'s current dining information`, url: source.url },
    notes: availability === "available"
      ? ["Current official page structure confirms these recurring hours; verify exceptions before travelling."]
      : [uncertaintyNote ?? "Normal hours are published, but current exceptions are not structurally available to this collector."],
    restrictions: ["Ask catering staff about current allergens and dietary requirements."],
    sourceLinks: [link],
    serviceWindow: { kind: windowKind, source: link }
  };
}

function parsed(weeklyServices, warning) {
  return {
    coverage: "schedule",
    sourceModifiedAt: null,
    validFrom: null,
    validThrough: null,
    mealsByDate: {},
    recurringMeals: {},
    weeklyServices,
    notices: [],
    ...(warning === undefined ? {} : { warning })
  };
}

function parseChrists(source, text, at) {
  requirePatterns(source, text, [
    /During term time, Upper Hall/i,
    /meal times in term/i,
    /Breakfast\s+8[.:]15\s*-\s*9[.:]30\s*am/i,
    /Lunch\s+12[.:]00\s*-\s*1[.:]45\s*pm/i,
    /Dinner\s+5[.:]50\s*-\s*7[.:]00\s*pm/i,
    /Brunch[\s\S]*Saturday\s+10[.:]30\s*am\s*-\s*12[.:]30\s*pm[\s\S]*Sunday\s+10[.:]30\s*am\s*-\s*12[.:]30\s*pm/i
  ]);
  const warning = "Normal term-time hours found, but the exact applicable dates are not publicly confirmed.";
  return parsed([
    service(source, at, "breakfast", WEEKDAYS_ONLY, "08:15–09:30", "unknown", "unknown", warning),
    service(source, at, "lunch", WEEKDAYS_ONLY, "12:00–13:45", "unknown", "unknown", warning),
    service(source, at, "brunch", ["Saturday", "Sunday"], "10:30–12:30", "unknown", "unknown", warning),
    service(source, at, "dinner", WEEKDAYS, "17:50–19:00", "unknown", "unknown", warning)
  ], warning);
}

function parseClare(source, text, at) {
  requirePatterns(source, text, [
    /The Buttery/i,
    /Breakfast:\s*Monday\s*-?\s*Friday,?\s*8\s*-\s*9\s*am/i,
    /Lunch:\s*Monday\s*-?\s*Friday,?\s*12[.:]30\s*-\s*1[.:]30\s*pm/i,
    /Dinner:\s*Monday\s*-?\s*Saturday,?\s*6[.:]15\s*-\s*7[.:]15\s*pm/i,
    /Brunch\s*\(Saturday\),?\s*12[.:]30\s*-\s*1[.:]30\s*pm/i
  ]);
  const warning = "Normal hours found, but the exact applicable dates are not publicly confirmed on this page.";
  return parsed([
    service(source, at, "breakfast", WEEKDAYS_ONLY, "08:00–09:00", "unknown", "unknown", warning),
    service(source, at, "lunch", WEEKDAYS_ONLY, "12:30–13:30", "unknown", "unknown", warning),
    service(source, at, "dinner", [...WEEKDAYS_ONLY, "Saturday"], "18:15–19:15", "unknown", "unknown", warning),
    service(source, at, "brunch", ["Saturday"], "12:30–13:30", "unknown", "unknown", warning)
  ], warning);
}

function parseClareHall(source, text, at) {
  requirePatterns(source, text, [
    /Dining at Clare Hall/i,
    /Monday to Friday/i,
    /no normal dining[\s\S]*College events/i,
    /Lunch:\s*12\s*pm\s*to\s*1[.:]30\s*pm/i,
    /Supper:\s*6\s*pm\s*to\s*7\s*pm/i
  ]);
  const warning = "Normal weekday hours found, but event closures are published in a separate current menu and remain Unknown until that source is parsed.";
  return parsed([
    service(source, at, "lunch", WEEKDAYS_ONLY, "12:00–13:30", "year-round", "unknown", warning),
    service(source, at, "dinner", WEEKDAYS_ONLY, "18:00–19:00", "year-round", "unknown", warning)
  ], warning);
}

function parseCorpus(source, text, at) {
  requirePatterns(source, text, [
    /During Full Term, Hall is normally open/i,
    /Brunch\s*\/\s*Breakfast/i,
    /8[.:]15\s*am\s*-\s*9[.:]15\s*am/i,
    /11[.:]30\s*(?:am|pm)\s*-\s*1[.:]00\s*pm/i,
    /Lunch[\s\S]*12[.:]00\s*pm\s*-\s*1[.:]30\s*pm/i,
    /Dinner[\s\S]*5[.:]45\s*pm\s*-\s*6[.:]45\s*pm/i
  ]);
  return parsed([
    service(source, at, "breakfast", ["Tuesday", "Thursday"], "08:15–09:15", "full-term-only"),
    service(source, at, "brunch", ["Saturday", "Sunday"], "11:30–13:00", "full-term-only"),
    service(source, at, "lunch", WEEKDAYS_ONLY, "12:00–13:30", "full-term-only"),
    service(source, at, "dinner", [...WEEKDAYS_ONLY, "Sunday"], "17:45–18:45", "full-term-only")
  ]);
}

function parseRobinson(source, text, at) {
  requirePatterns(source, text, [
    /Full Term time/i,
    /Lunch\s+Monday\s*-?\s*Friday\s+12[.:]20\s*pm\s*-\s*1[.:]40\s*pm/i,
    /Dinner\s+Monday\s*-?\s*Friday\s+6[.:]00\s*pm\s*-\s*7[.:]15\s*pm/i,
    /Weekend BRUNCH[\s\S]*Sat[\s-]*12[.:]00\s*-\s*13[.:]30\s*pm[\s\S]*Sun[\s-]*12[.:]00\s*-\s*13[.:]30\s*pm/i,
    /Out of Full Term time/i
  ]);
  return parsed([
    service(source, at, "lunch", WEEKDAYS_ONLY, "12:20–13:40", "full-term-only"),
    service(source, at, "dinner", WEEKDAYS_ONLY, "18:00–19:15", "full-term-only"),
    service(source, at, "brunch", ["Saturday", "Sunday"], "12:00–13:30", "full-term-only")
  ]);
}

const PARSERS = { christs: parseChrists, clare: parseClare, "clare-hall": parseClareHall, "corpus-christi": parseCorpus, robinson: parseRobinson };

export function parseScheduledSource(source, html, collectedAt) {
  const parser = PARSERS[source.parser];
  if (parser === undefined) throw new Error(`${source.name} has no guarded parser`);
  return parser(source, textFromHtml(html), collectedAt);
}
