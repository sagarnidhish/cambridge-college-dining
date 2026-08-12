import type { AccessClass, CollegeId, CollegeProfile, EvidenceKind, SourceLink } from "./types";
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
  access: AccessClass = "unknown"
): CollegeProfile {
  const accessSummary = access === "unhosted-cambridge"
    ? "Official information confirms a route for Cambridge students from other colleges without a host."
    : access === "guest-required"
      ? "Published access information describes attendance through a college member or guest arrangement."
      : access === "members-only"
        ? "Published information limits this service to college members."
        : "Public information does not confirm whether an unhosted student from another college may dine here.";
  return {
    id,
    name,
    diningArea,
    mapQuery: `${name} ${diningArea}, Cambridge, UK`,
    retrieval,
    sources,
    access: {
      classification: access,
      summary: accessSummary,
      guestRules: access === "guest-required" ? "Check the source for the current member-host and booking rules." : "Guest rules are not publicly confirmed.",
      payment: "Payment method is not publicly confirmed.",
      sourceLinks: sources
    },
    prices: []
  };
}

export const COLLEGES: readonly CollegeProfile[] = [
  profile("christs", "Christ's College", "Upper Hall", "scheduled", [official("Meals", "https://www.christs.cam.ac.uk/student-life/meals")], "guest-required"),
  profile("churchill", "Churchill College", "Dining Hall", "direct", [official("Lunch and dinner menu", "https://www.chu.cam.ac.uk/about/campus/dining-at-college/lunch-and-dinner-menu/")], "guest-required"),
  profile("clare", "Clare College", "Buttery", "scheduled", [official("Dining and catering", "https://www.clare.cam.ac.uk/admissions-outreach/undergraduate-study/life-clare/dining-and-catering")]),
  profile("clare-hall", "Clare Hall", "Dining Hall", "scheduled", [official("Dining", "https://www.clarehall.cam.ac.uk/dining/")], "guest-required"),
  profile("corpus-christi", "Corpus Christi", "Hall", "scheduled", [
    official("Food and dining", "https://www.corpus.cam.ac.uk/undergraduate-study/living-corpus/food-and-dining"),
    official("Food at Corpus", "https://www.corpus.cam.ac.uk/current-students/food-corpus"),
    official("JCR catering", "https://www.jcr.corpus.cam.ac.uk/catering", "official-student-body")
  ]),
  profile("darwin", "Darwin College", "Dining Hall", "direct", [
    official("Dine", "https://www.darwin.cam.ac.uk/dine/"),
    official("Weekly menu", "https://www.darwin.cam.ac.uk/dine/weekly-menu/")
  ], "guest-required"),
  profile("downing", "Downing College", "Servery and Hall", "direct", [
    official("Catering", "https://www.dow.cam.ac.uk/current-students/catering"),
    official("Student catering information", "https://www.dow.cam.ac.uk/undergraduate-study/undergraduate-accommodation/catering")
  ], "unhosted-cambridge"),
  profile("emmanuel", "Emmanuel College", "Hall", "scheduled", [official("Living at Emmanuel — catering", "https://www.emma.cam.ac.uk/explore/life")]),
  profile("fitzwilliam", "Fitzwilliam College", "Dining Hall", "scheduled", [official("University college profile", "https://www.undergraduate.study.cam.ac.uk/colleges/fitzwilliam-college", "official-university")]),
  profile("girton", "Girton College", "Dining Hall", "scheduled", [official("Dining and socialising", "https://www.girton.cam.ac.uk/dining-and-socialising")]),
  profile("gonville-caius", "Gonville & Caius", "Hall", "scheduled", [official("Accessibility and catering information", "https://www.cai.cam.ac.uk/sites/default/files/accessibility_information.pdf")]),
  profile("homerton", "Homerton College", "Great Hall", "scheduled", [official("Catering opening times", "https://www.homerton.cam.ac.uk/sites/default/files/Catering%20Opening%20Times%20Term%20Time.pdf")]),
  profile("hughes-hall", "Hughes Hall", "Dining Hall", "scheduled", [official("University college profile", "https://www.undergraduate.study.cam.ac.uk/colleges/hughes-hall", "official-university")]),
  profile("jesus", "Jesus College", "Cafeteria", "scheduled", [
    official("Cafeteria", "https://www.jesus.cam.ac.uk/college/life-jesus/food-and-drink/cafeteria"),
    official("Cafeteria lunch menu", "https://www.jesus.cam.ac.uk/college/life-jesus/food-and-drink/cafeteria-lunch-menu")
  ]),
  profile("kings", "King's College", "Servery and Hall", "scheduled", [official("Student finances and dining facilities", "https://www.kings.cam.ac.uk/study/undergraduate-study/finances-and-financial-support")]),
  profile("lucy-cavendish", "Lucy Cavendish College", "Dining Hall", "scheduled", [
    official("College dining overview", "https://www.lucy.cam.ac.uk/sites/default/files/inline-files/Welcome%20to%20Lucy%20Cavendish%20College%20and%20College%20Tour%20-%20Webinar%20Series.pdf"),
    official("Meal portal", "https://services.lucy.cam.ac.uk/meal-epos/")
  ]),
  profile("magdalene", "Magdalene College", "Hall", "scheduled", [
    official("Catering", "https://www.magd.cam.ac.uk/study-magdalene/undergraduate-study/accommodation-and-food/catering"),
    official("JCR catering", "https://www.jcr.magd.cam.ac.uk/catering", "official-student-body")
  ]),
  profile("murray-edwards", "Murray Edwards College", "Dome Dining Hall", "scheduled", [official("College facilities", "https://www.murrayedwards.cam.ac.uk/college-life/college-facilities")]),
  profile("newnham", "Newnham College", "Buttery", "scheduled", [
    official("Weekly and daily menus", "https://newn.cam.ac.uk/weekly-and-daily-menus/"),
    official("Food and drink", "https://newn.cam.ac.uk/student-life/societies-and-facilities/food-drink/")
  ]),
  profile("pembroke", "Pembroke College", "Servery", "scheduled", [official("Servery menu", "https://www.pem.cam.ac.uk/college/catering/information-students/servery-menu")]),
  profile("peterhouse", "Peterhouse", "Hall", "scheduled", [
    official("University college profile", "https://www.undergraduate.study.cam.ac.uk/colleges/peterhouse", "official-university"),
    official("Petmenu", "https://petmenu.co.uk/", "supplementary")
  ]),
  profile("queens", "Queens' College", "Dining Hall", "scheduled", [
    official("Dining Hall", "https://www.queens.cam.ac.uk/life-at-queens/catering/dining-hall/"),
    official("Weekly menu", "https://www.queens.cam.ac.uk/life-at-queens/catering/dining-hall/weekly-menu/")
  ]),
  profile("robinson", "Robinson College", "Garden Restaurant", "scheduled", [
    official("Dated Garden Restaurant menu", "https://www.robinson.cam.ac.uk/college-life/garden-restaurant-menu"),
    official("Food and drink", "https://www.robinson.cam.ac.uk/prospective-students/student-life/food-and-drink")
  ], "guest-required"),
  profile("selwyn", "Selwyn College", "Hall", "scheduled", [official("Hall menu", "https://www.sel.cam.ac.uk/current-members/hall-menu")]),
  profile("sidney-sussex", "Sidney Sussex College", "Hall", "scheduled", [official("Students' Union Hall guide", "https://sscsu.org.uk/hall", "official-student-body")]),
  profile("st-catharines", "St Catharine's College", "Hall", "scheduled", [official("MCR Hall times", "https://mcr.caths.cam.ac.uk/current-students/hall-times", "official-student-body")]),
  profile("st-edmunds", "St Edmund's College", "Dining Hall", "direct", [
    official("Menu archive", "https://my.st-edmunds.cam.ac.uk/category/menus/"),
    official("Catering timetable", "https://my-cr.st-edmunds.cam.ac.uk/facilities/catering/")
  ]),
  profile("st-johns", "St John's College", "Buttery Dining Room", "scheduled", [official("Food and drink", "https://www.joh.cam.ac.uk/live-and-study/food-and-drink")]),
  profile("trinity", "Trinity College", "Hall", "scheduled", [official("Student experience and catering", "https://www.trin.cam.ac.uk/access/outreach-home/student-experiences-at-trinity/")]),
  profile("trinity-hall", "Trinity Hall", "Dining Hall", "scheduled", [official("Food and drink", "https://www.trinhall.cam.ac.uk/study-with-us/life-trinity-hall/food-and-drink/")]),
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
