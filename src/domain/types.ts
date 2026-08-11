export const MEAL_TYPES = ["breakfast", "brunch", "lunch", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export type CollegeId = "churchill" | "st-edmunds";
export type Availability = "available" | "closed" | "unknown";
export type Freshness = "live" | "stale";
export type IsoDate = `${number}-${number}-${number}`;

export type MenuContent =
  | { kind: "items"; items: string[] }
  | { kind: "pdf"; label: string; url: string }
  | { kind: "message"; message: string };

export interface SourceLink {
  label: string;
  url: string;
}

export interface MealRecord {
  type: MealType;
  availability: Availability;
  time: string;
  menu: MenuContent;
  notes: string[];
  sourceLinks: SourceLink[];
}

export interface DiningDay {
  college: CollegeId;
  collegeName: string;
  date: IsoDate;
  weekday: string;
  timeZone: "Europe/London";
  meals: Record<MealType, MealRecord>;
  notices: string[];
  sourceLinks: SourceLink[];
  sourceModifiedAt: string | null;
  fetchedAt: string;
  freshness: Freshness;
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
  colleges: Record<CollegeId, CollegeViewState>;
}
