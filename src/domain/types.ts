export const MEAL_TYPES = ["breakfast", "brunch", "lunch", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export const COLLEGE_IDS = [
  "christs",
  "churchill",
  "clare",
  "clare-hall",
  "corpus-christi",
  "darwin",
  "downing",
  "emmanuel",
  "fitzwilliam",
  "girton",
  "gonville-caius",
  "homerton",
  "hughes-hall",
  "jesus",
  "kings",
  "lucy-cavendish",
  "magdalene",
  "murray-edwards",
  "newnham",
  "pembroke",
  "peterhouse",
  "queens",
  "robinson",
  "selwyn",
  "sidney-sussex",
  "st-catharines",
  "st-edmunds",
  "st-johns",
  "trinity",
  "trinity-hall",
  "wolfson"
] as const;
export type CollegeId = (typeof COLLEGE_IDS)[number];
export type LiveCollegeId = "churchill" | "st-edmunds";
export type Availability = "available" | "closed" | "unknown";
export type Freshness = "live" | "scheduled" | "cached" | "stale";
export type EvidenceKind = "official-college" | "official-university" | "official-student-body" | "supplementary";
export type AccessClass = "unhosted-cambridge" | "guest-required" | "members-only" | "unknown";
export type SnapshotCoverage = "menu" | "schedule" | "link-only";
export type IsoDate = `${number}-${number}-${number}`;

export type MenuContent =
  | { kind: "items"; items: string[] }
  | { kind: "pdf"; label: string; url: string }
  | { kind: "image"; label: string; url: string; alt: string }
  | { kind: "link"; label: string; url: string }
  | { kind: "message"; message: string };

export interface SourceLink {
  label: string;
  url: string;
  evidence?: EvidenceKind;
  asOf?: string;
}

export interface AccessGuidance {
  classification: AccessClass;
  summary: string;
  guestRules: string;
  payment: string;
  sourceLinks: SourceLink[];
}

export interface PriceQuote {
  label: string;
  amount: string;
  precision: "exact" | "approximate";
  audience: string;
  asOf: string;
  source: SourceLink;
}

export interface CollegeProfile {
  id: CollegeId;
  name: string;
  diningArea: string;
  mapQuery: string;
  retrieval: "direct" | "scheduled";
  sources: SourceLink[];
  access: AccessGuidance;
  prices: PriceQuote[];
}

export interface MealRecord<TMenu extends MenuContent | MenuContent[] = MenuContent> {
  type: MealType;
  availability: Availability;
  time: string;
  menu: TMenu;
  notes: string[];
  restrictions?: string[];
  sourceLinks: SourceLink[];
}

export interface DiningDay<TMenu extends MenuContent | MenuContent[] = MenuContent | MenuContent[]> {
  college: CollegeId;
  collegeName: string;
  date: IsoDate;
  weekday: string;
  timeZone: "Europe/London";
  meals: Record<MealType, MealRecord<TMenu>>;
  notices: string[];
  sourceLinks: SourceLink[];
  sourceModifiedAt: string | null;
  fetchedAt: string;
  freshness: Freshness;
  location?: { diningArea: string; mapQuery: string };
  access?: AccessGuidance;
  prices?: PriceQuote[];
  termLabel?: string;
  coverage?: SnapshotCoverage;
  collectionWarning?: string;
}

export type CollegeViewState =
  | { status: "loading"; college: CollegeId; collegeName: string }
  | { status: "ready"; day: DiningDay }
  | {
      status: "error";
      college: CollegeId;
      collegeName: string;
      message: string;
      sourceLinks: SourceLink[];
    };

export interface DashboardState {
  selectedDate: IsoDate;
  colleges: Record<LiveCollegeId, CollegeViewState> & Partial<Record<CollegeId, CollegeViewState>>;
}
