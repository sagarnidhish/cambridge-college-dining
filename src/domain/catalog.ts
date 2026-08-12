import type { AccessClass, AccessGuidance, CollegeId, CollegeProfile, EvidenceKind, MealType, PriceQuote, RecurringService, ServiceWindow, SourceLink, Weekday } from "./types";
import { COLLEGE_IDS } from "./types";

const official = (label: string, url: string, evidence: EvidenceKind = "official-college", asOf?: string): SourceLink => ({
  label,
  url,
  evidence,
  ...(asOf === undefined ? {} : { asOf })
});

function profile(
  id: CollegeId,
  name: string,
  diningArea: string,
  retrieval: CollegeProfile["retrieval"],
  sources: SourceLink[],
  options: {
    access?: AccessGuidance;
    prices?: PriceQuote[];
    serviceWindows?: Partial<Record<MealType, ServiceWindow>>;
    recurringServices?: RecurringService[];
  } = {}
): CollegeProfile {
  const access = options.access ?? guidance("unknown", sources);
  return {
    id,
    name,
    diningArea,
    mapQuery: `${name} ${diningArea}, Cambridge, UK`,
    retrieval,
    sources,
    access,
    prices: options.prices ?? [],
    ...(options.serviceWindows === undefined ? {} : { serviceWindows: options.serviceWindows }),
    ...(options.recurringServices === undefined ? {} : { recurringServices: options.recurringServices })
  };
}

function guidance(
  classification: AccessClass,
  sourceLinks: SourceLink[],
  summary = "Public information does not confirm whether an unhosted student from another college may dine at this everyday service.",
  guestRules = "Guest rules for this everyday service are not publicly confirmed.",
  payment = "Payment method is not publicly confirmed."
): AccessGuidance {
  return { classification, summary, guestRules, payment, sourceLinks };
}

function windows(kind: "year-round" | "full-term-only", source: SourceLink, meals: MealType[]): Partial<Record<MealType, ServiceWindow>> {
  return Object.fromEntries(meals.map((meal) => [meal, { kind, source }])) as Partial<Record<MealType, ServiceWindow>>;
}

function quote(
  label: string,
  amount: string,
  precision: PriceQuote["precision"],
  audience: string,
  asOf: string,
  source: SourceLink
): PriceQuote {
  return { label, amount, precision, audience, asOf, source };
}

function recurring(
  type: MealType,
  weekdays: Weekday[],
  time: string,
  serviceWindow: ServiceWindow
): RecurringService {
  return { type, weekdays, time, serviceWindow };
}

const CHRISTS_MEALS = official("Meals", "https://www.christs.cam.ac.uk/student-life/meals", "official-college", "2026-08-12");
const CHURCHILL_MENU = official("Lunch and dinner menu", "https://www.chu.cam.ac.uk/about/campus/dining-at-college/lunch-and-dinner-menu/");
const CHURCHILL_DINING = official("Dining at College", "https://www.chu.cam.ac.uk/about/campus/dining-at-college/", "official-college", "2026-06");
const CHURCHILL_GUESTS = official("Guest dining information", "https://www.chu.cam.ac.uk/conferencing-events/your-stay-at-churchill-college/", "official-college", "2026-08-12");
const CLARE_UCS = official("UCS food and services guide", "https://ucs.clare.cam.ac.uk/current-students/life-in-cambridge/", "official-student-body", "2026-08-12");
const CLARE_HALL_DINING = official("Dining", "https://www.clarehall.cam.ac.uk/dining/", "official-college", "2026-08-12");
const CORPUS_JCR = official("JCR catering", "https://www.jcr.corpus.cam.ac.uk/catering", "official-student-body", "2026-08-12");
const DARWIN_WEEKLY = official("Weekly menu", "https://www.darwin.cam.ac.uk/dine/weekly-menu/", "official-college", "2026-08-12");
const DARWIN_DINING = official("Dining in College", "https://www.darwin.cam.ac.uk/members/info/dining-in-college/", "official-college", "2026-08-12");
const DOWNING_CATERING = official("Catering", "https://www.dow.cam.ac.uk/undergraduate-study/undergraduate-accommodation/catering", "official-college", "2026-08-12");
const FITZ_JCR = official("JCR freshers' guide", "https://www.fitz.cam.ac.uk/sites/default/files/2024-09/Freshers%20Guide%202024-min.pdf", "official-student-body", "2024");
const GIRTON_DINING = official("Dining and socialising", "https://www.girton.cam.ac.uk/dining-and-socialising", "official-college", "2026-08-12");
const GIRTON_POSTGRAD = official("Postgraduate dining guide", "https://www.girton.cam.ac.uk/postgraduates/incoming-postgraduates/about-university-and-college", "official-college", "2026-08-12");
const KINGS_FINANCES = official("Student finances and dining facilities", "https://www.kings.cam.ac.uk/study/undergraduate-study/finances-and-financial-support", "official-college", "2026-08-12");
const KINGS_HANDBOOK = official("Undergraduate student handbook", "https://www.kings.cam.ac.uk/sites/default/files/documents/intranet/undergraduate-student-handbook-2024-25-final-copy.pdf", "official-college", "2024-25");
const MAGDALENE_CATERING = official("Catering", "https://www.magd.cam.ac.uk/study-magdalene/undergraduate-study/accommodation-and-food/catering", "official-college", "2026-08-12");
const MAGDALENE_JCR = official("JCR catering", "https://www.jcr.magd.cam.ac.uk/catering", "official-student-body", "2026-08-12");
const PEMBROKE_GUIDE = official("Graduate Parlour welcome guide", "https://gp.pem.cam.ac.uk/wp-content/uploads/2024/10/Welcome-Document-2024.pdf", "official-student-body", "2024");
const QUEENS_DINING = official("Dining Hall", "https://www.queens.cam.ac.uk/life-at-queens/catering/dining-hall/", "official-college", "2026-08-12");
const ROBINSON_MENU = official("Dated Garden Restaurant menu", "https://www.robinson.cam.ac.uk/college-life/garden-restaurant-menu");
const ROBINSON_FOOD = official("Food and drink", "https://www.robinson.cam.ac.uk/prospective-students/student-life/food-and-drink");
const ROBINSON_PRICES = official("Prices and deals", "https://www.robinson.cam.ac.uk/college-life/garden-restaurant-menu/prices-and-deals", "official-college", "2026-08-12");
const ROBINSON_MCR = official("MCR food and drink guide", "https://mcr.robinson.cam.ac.uk/food-and-drink", "official-student-body", "2026-08-12");
const ROBINSON_HOURS = official("Garden Restaurant opening hours", "https://www.robinson.cam.ac.uk/college-life/garden-restaurant-menu/opening-hours", "official-college", "2026-08-12");
const SIDNEY_HALL = official("Students' Union Hall guide", "https://sscsu.org.uk/hall", "official-student-body", "2026-08-12");
const SIDNEY_FINANCE = official("Students' Union finance guide", "https://sscsu.org.uk/finance", "official-student-body", "2026-08-12");
const TRINITY_HALL_FOOD = official("Food and drink", "https://www.trinhall.cam.ac.uk/study-with-us/life-trinity-hall/food-and-drink/", "official-college", "2026-08-12");

export const COLLEGES: readonly CollegeProfile[] = [
  profile("christs", "Christ's College", "Upper Hall", "scheduled", [CHRISTS_MEALS], {
    access: guidance(
      "unknown",
      [CHRISTS_MEALS],
      "Christ's documents member-hosted Formal Hall guests, but does not publicly confirm guest access to the everyday Upper Hall canteen.",
      "Use a Christ's member and the formal booking route for Formal Hall; verify Upper Hall separately.",
      "Upper Hall purchases use a University Card and are charged to the Christ's member's College bill."
    ),
    serviceWindows: windows("full-term-only", CHRISTS_MEALS, ["breakfast", "brunch", "lunch", "dinner"]),
    recurringServices: [
      recurring("breakfast", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "08:15–09:30", { kind: "full-term-only", source: CHRISTS_MEALS }),
      recurring("lunch", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "12:00–13:45", { kind: "full-term-only", source: CHRISTS_MEALS }),
      recurring("brunch", ["Saturday", "Sunday"], "10:30–12:30", { kind: "full-term-only", source: CHRISTS_MEALS }),
      recurring("dinner", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], "17:50–19:00", { kind: "full-term-only", source: CHRISTS_MEALS })
    ]
  }),
  profile("churchill", "Churchill College", "Dining Hall", "direct", [CHURCHILL_MENU, CHURCHILL_DINING, CHURCHILL_GUESTS], {
    access: guidance(
      "unhosted-cambridge",
      [CHURCHILL_GUESTS],
      "Churchill says guests who are not part of an organised conference may purchase lunch and dinner in the Dining Hall.",
      "No member host is stated for guest lunch or dinner; verify access and service changes before travelling.",
      "Guests pay by credit or debit card; Churchill members normally use their University student card."
    ),
    prices: [quote("Typical self-service dinner", "about £7.29", "approximate", "Churchill students", "2026-06", CHURCHILL_DINING)]
  }),
  profile("clare", "Clare College", "Buttery", "scheduled", [official("Dining and catering", "https://www.clare.cam.ac.uk/admissions-outreach/undergraduate-study/life-clare/dining-and-catering"), CLARE_UCS], {
    access: guidance(
      "unknown",
      [CLARE_UCS],
      "Clare publishes member meal and payment information but does not confirm unhosted access to the everyday Buttery.",
      "Formal Hall guest arrangements do not establish everyday Buttery access.",
      "Clare members use their University Card and charges go to their College bill."
    ),
    prices: [quote("Typical Buttery meal", "about £5–£7", "approximate", "Clare members", "2026-08-12", CLARE_UCS)],
    serviceWindows: windows("full-term-only", CLARE_UCS, ["breakfast", "brunch", "lunch", "dinner"]),
    recurringServices: [
      recurring("breakfast", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "08:00–09:00", { kind: "full-term-only", source: CLARE_UCS }),
      recurring("lunch", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "12:30–13:30", { kind: "full-term-only", source: CLARE_UCS }),
      recurring("dinner", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "18:15–19:15", { kind: "full-term-only", source: CLARE_UCS }),
      recurring("brunch", ["Saturday"], "12:30–13:30", { kind: "full-term-only", source: CLARE_UCS })
    ]
  }),
  profile("clare-hall", "Clare Hall", "Dining Hall", "scheduled", [CLARE_HALL_DINING], {
    access: guidance(
      "guest-required",
      [CLARE_HALL_DINING],
      "Clare Hall publishes guest dining through a College member host and specifically welcomes St Cross guests with meal cards.",
      "Guest meals are paid from the host's Upay account; other groups should contact the College before attending.",
      "Members pay through Upay; cash and direct card payments are not accepted in the Dining Hall."
    ),
    serviceWindows: windows("year-round", CLARE_HALL_DINING, ["lunch", "dinner"]),
    recurringServices: [
      recurring("lunch", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "12:00–13:30", { kind: "year-round", source: CLARE_HALL_DINING }),
      recurring("dinner", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "18:00–19:00", { kind: "year-round", source: CLARE_HALL_DINING })
    ]
  }),
  profile("corpus-christi", "Corpus Christi", "Hall", "scheduled", [
    official("Food and dining", "https://www.corpus.cam.ac.uk/undergraduate-study/living-corpus/food-and-dining"),
    official("Food at Corpus", "https://www.corpus.cam.ac.uk/current-students/food-corpus"),
    CORPUS_JCR
  ], {
    access: guidance(
      "guest-required",
      [CORPUS_JCR],
      "Corpus JCR documents guests buying food in Hall with a guest surcharge.",
      "Attend as a guest and verify the current College host and entry arrangement.",
      "Guests may pay by credit or debit card and are charged a 60% surcharge."
    ),
    prices: [quote("Guest surcharge", "+60%", "exact", "Guests", "2026-08-12", CORPUS_JCR)],
    serviceWindows: windows("full-term-only", CORPUS_JCR, ["breakfast", "brunch", "lunch", "dinner"]),
    recurringServices: [
      recurring("breakfast", ["Tuesday", "Thursday"], "08:15–09:15", { kind: "full-term-only", source: CORPUS_JCR }),
      recurring("brunch", ["Saturday", "Sunday"], "11:30–13:00", { kind: "full-term-only", source: CORPUS_JCR }),
      recurring("lunch", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "12:00–13:30", { kind: "full-term-only", source: CORPUS_JCR }),
      recurring("dinner", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"], "17:45–18:45", { kind: "full-term-only", source: CORPUS_JCR })
    ]
  }),
  profile("darwin", "Darwin College", "Dining Hall", "direct", [
    official("Dine", "https://www.darwin.cam.ac.uk/dine/"),
    DARWIN_WEEKLY,
    DARWIN_DINING
  ], {
    access: guidance(
      "guest-required",
      [DARWIN_DINING],
      "Darwin publishes higher guest and visitor rates for everyday meals taken with College members.",
      "A Darwin member should host and pay for everyday guests; Formal Hall requires advance Upay booking.",
      "The member uses their University Card and guest food is invoiced to the member's College account."
    ),
    prices: [
      quote("Published main dishes", "£2.90–£4.75", "exact", "Darwin members", "2026-08-12", DARWIN_WEEKLY),
      quote("Published sides", "£0.95", "exact", "Darwin members", "2026-08-12", DARWIN_WEEKLY)
    ]
  }),
  profile("downing", "Downing College", "Servery and Hall", "direct", [
    official("Catering", "https://www.dow.cam.ac.uk/current-students/catering"),
    DOWNING_CATERING
  ], {
    access: guidance(
      "unknown",
      [DOWNING_CATERING],
      "Downing publishes its catering services but does not publicly confirm that an unhosted student from another college may use the Servery.",
      "Verify access with Downing before travelling.",
      "The live public menu exposes prices; the public page does not establish a cross-college payment entitlement."
    )
  }),
  profile("emmanuel", "Emmanuel College", "Hall", "scheduled", [official("Living at Emmanuel — catering", "https://www.emma.cam.ac.uk/explore/life")]),
  profile("fitzwilliam", "Fitzwilliam College", "Dining Hall", "scheduled", [official("University college profile", "https://www.undergraduate.study.cam.ac.uk/colleges/fitzwilliam-college", "official-university"), FITZ_JCR], {
    prices: [quote("Typical meal", "about £4–£7", "approximate", "Fitzwilliam members", "2024", FITZ_JCR)],
    serviceWindows: windows("full-term-only", FITZ_JCR, ["brunch", "lunch", "dinner"])
  }),
  profile("girton", "Girton College", "Dining Hall", "scheduled", [GIRTON_DINING, GIRTON_POSTGRAD], {
    access: guidance(
      "unknown",
      [GIRTON_DINING],
      "Girton accepts external-rate card payment but does not publicly confirm unhosted entry to the everyday Dining Hall.",
      "Formal Hall and partner-card rules are separate hosted arrangements.",
      "Members use their College or University Card; credit and debit cards are charged at the external rate."
    ),
    prices: [quote("Typical main meal", "about £4–£7", "approximate", "Girton members", "2026-08-12", GIRTON_POSTGRAD)]
  }),
  profile("gonville-caius", "Gonville & Caius", "Hall", "scheduled", [official("Accessibility and catering information", "https://www.cai.cam.ac.uk/sites/default/files/accessibility_information.pdf")]),
  profile("homerton", "Homerton College", "Great Hall", "scheduled", [official("Catering opening times", "https://www.homerton.cam.ac.uk/sites/default/files/Catering%20Opening%20Times%20Term%20Time.pdf")]),
  profile("hughes-hall", "Hughes Hall", "Dining Hall", "scheduled", [official("University college profile", "https://www.undergraduate.study.cam.ac.uk/colleges/hughes-hall", "official-university")]),
  profile("jesus", "Jesus College", "Cafeteria", "scheduled", [
    official("Cafeteria", "https://www.jesus.cam.ac.uk/college/life-jesus/food-and-drink/cafeteria"),
    official("Cafeteria lunch menu", "https://www.jesus.cam.ac.uk/college/life-jesus/food-and-drink/cafeteria-lunch-menu")
  ]),
  profile("kings", "King's College", "Servery and Hall", "scheduled", [KINGS_FINANCES, KINGS_HANDBOOK], {
    access: guidance(
      "guest-required",
      [KINGS_HANDBOOK],
      "King's members may bring up to two guests through the everyday Servery.",
      "Attend with a King's member; groups above two guests must contact Catering in advance.",
      "Food and drink are paid through the King's member's University Card EPOS account."
    ),
    prices: [quote("Typical one-course meal", "about £3–£4", "approximate", "King's students", "2026-08-12", KINGS_FINANCES)],
    serviceWindows: windows("full-term-only", KINGS_HANDBOOK, ["breakfast", "brunch", "lunch", "dinner"])
  }),
  profile("lucy-cavendish", "Lucy Cavendish College", "Dining Hall", "scheduled", [
    official("College dining overview", "https://www.lucy.cam.ac.uk/sites/default/files/inline-files/Welcome%20to%20Lucy%20Cavendish%20College%20and%20College%20Tour%20-%20Webinar%20Series.pdf"),
    official("Meal portal", "https://services.lucy.cam.ac.uk/meal-epos/")
  ]),
  profile("magdalene", "Magdalene College", "Ramsay Hall", "scheduled", [MAGDALENE_CATERING, MAGDALENE_JCR], {
    access: guidance(
      "unknown",
      [MAGDALENE_JCR],
      "Magdalene publishes year-round Ramsay Hall service and prices but does not confirm unhosted cross-college entry.",
      "Formal guest tickets do not establish everyday Ramsay Hall access.",
      "Members use an activated University Card or debit card and show University ID for student prices."
    ),
    prices: [
      quote("Main course", "£3.20", "exact", "Magdalene students", "2026-08-12", MAGDALENE_JCR),
      quote("Typical main with two sides", "about £4.80", "approximate", "Magdalene students", "2026-08-12", MAGDALENE_JCR)
    ],
    serviceWindows: windows("year-round", MAGDALENE_CATERING, ["brunch", "lunch", "dinner"])
  }),
  profile("murray-edwards", "Murray Edwards College", "Dome Dining Hall", "scheduled", [official("College facilities", "https://www.murrayedwards.cam.ac.uk/college-life/college-facilities")]),
  profile("newnham", "Newnham College", "Buttery", "scheduled", [
    official("Weekly and daily menus", "https://newn.cam.ac.uk/weekly-and-daily-menus/"),
    official("Food and drink", "https://newn.cam.ac.uk/student-life/societies-and-facilities/food-drink/")
  ]),
  profile("pembroke", "Pembroke College", "Servery", "scheduled", [official("Servery menu", "https://www.pem.cam.ac.uk/college/catering/information-students/servery-menu"), PEMBROKE_GUIDE], {
    access: guidance(
      "guest-required",
      [PEMBROKE_GUIDE],
      "Pembroke members may pay for one additional guest in the everyday Servery using their CamCard.",
      "Attend with a Pembroke member and verify current guest limits.",
      "The Pembroke member pays using their CamCard or Upay account."
    )
  }),
  profile("peterhouse", "Peterhouse", "Hall", "scheduled", [
    official("University college profile", "https://www.undergraduate.study.cam.ac.uk/colleges/peterhouse", "official-university"),
    official("Petmenu", "https://petmenu.co.uk/", "supplementary")
  ]),
  profile("queens", "Queens' College", "Dining Hall", "scheduled", [
    QUEENS_DINING,
    official("Weekly menu", "https://www.queens.cam.ac.uk/life-at-queens/catering/dining-hall/weekly-menu/")
  ], {
    access: guidance(
      "guest-required",
      [QUEENS_DINING],
      "Queens' members may bring guests into the everyday Cafeteria.",
      "Attend with a Queens' member; guests pay a 30% cover charge.",
      "Payment is by Upay using a University ID card or contactless credit or debit card."
    ),
    prices: [quote("Guest cover charge", "+30%", "exact", "Guests", "2026-08-12", QUEENS_DINING)],
    serviceWindows: windows("full-term-only", QUEENS_DINING, ["breakfast", "brunch", "lunch", "dinner"])
  }),
  profile("robinson", "Robinson College", "Garden Restaurant", "scheduled", [
    ROBINSON_MENU,
    ROBINSON_HOURS,
    ROBINSON_FOOD,
    ROBINSON_PRICES,
    ROBINSON_MCR
  ], {
    access: guidance(
      "guest-required",
      [ROBINSON_PRICES],
      "Robinson welcomes non-members at guest prices and states that a Robinson member must accompany guests to the till.",
      "Attend with a Robinson member and verify opening times before travelling.",
      "Guests may pay cash or by debit card at the non-member rate, or the Robinson member may pay by University Card."
    ),
    prices: [
      quote("Vegetarian or vegan main", "£4.25", "exact", "Non-members", "2026-08-12", ROBINSON_PRICES),
      quote("Meat, fish, or halal main", "£4.60–£4.70", "exact", "Non-members", "2026-08-12", ROBINSON_PRICES),
      quote("Main course range", "£4.25–£4.70", "exact", "Non-members", "2026-08-12", ROBINSON_PRICES),
      quote("Weekend brunch", "£7.15", "exact", "Non-members", "2026-08-12", ROBINSON_PRICES)
    ],
    serviceWindows: windows("full-term-only", ROBINSON_HOURS, ["brunch", "lunch", "dinner"]),
    recurringServices: [
      recurring("lunch", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "12:20–13:40", { kind: "full-term-only", source: ROBINSON_HOURS }),
      recurring("dinner", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "18:00–19:15", { kind: "full-term-only", source: ROBINSON_HOURS }),
      recurring("brunch", ["Saturday", "Sunday"], "12:00–13:30", { kind: "full-term-only", source: ROBINSON_HOURS })
    ]
  }),
  profile("selwyn", "Selwyn College", "Hall", "scheduled", [official("Hall menu", "https://www.sel.cam.ac.uk/current-members/hall-menu")]),
  profile("sidney-sussex", "Sidney Sussex College", "Hall", "scheduled", [SIDNEY_HALL, SIDNEY_FINANCE], {
    prices: [quote("Average Hall meal", "about £4", "approximate", "Sidney Sussex students", "2026-08-12", SIDNEY_FINANCE)]
  }),
  profile("st-catharines", "St Catharine's College", "Hall", "scheduled", [official("MCR Hall times", "https://mcr.caths.cam.ac.uk/current-students/hall-times", "official-student-body")]),
  profile("st-edmunds", "St Edmund's College", "Dining Hall", "direct", [
    official("Menu archive", "https://my.st-edmunds.cam.ac.uk/category/menus/"),
    official("Catering timetable", "https://my-cr.st-edmunds.cam.ac.uk/facilities/catering/")
  ]),
  profile("st-johns", "St John's College", "Buttery Dining Room", "scheduled", [official("Food and drink", "https://www.joh.cam.ac.uk/live-and-study/food-and-drink")]),
  profile("trinity", "Trinity College", "Hall", "scheduled", [official("Student experience and catering", "https://www.trin.cam.ac.uk/access/outreach-home/student-experiences-at-trinity/")]),
  profile("trinity-hall", "Trinity Hall", "Dining Hall", "scheduled", [TRINITY_HALL_FOOD], {
    serviceWindows: windows("full-term-only", TRINITY_HALL_FOOD, ["brunch", "lunch", "dinner"])
  }),
  profile("wolfson", "Wolfson College", "Cafeteria", "scheduled", [
    official("Food and dining", "https://www.wolfson.cam.ac.uk/college-life/food"),
    official("Cafeteria menus", "https://www.wolfson.cam.ac.uk/food/cafeteria-menus")
  ])
] as const;

const byId = new Map(COLLEGES.map((college) => [college.id, college]));
if (byId.size !== COLLEGE_IDS.length || COLLEGE_IDS.some((id) => !byId.has(id))) {
  throw new Error("College catalog must contain every canonical ID exactly once");
}

export function collegeById(id: CollegeId): CollegeProfile {
  const college = byId.get(id);
  if (college === undefined) {
    throw new Error(`Unknown college: ${id}`);
  }
  return college;
}
