export type CategoryKey =
  | "time"
  | "distance"
  | "startPosition"
  | "target"
  | "courseOfFire";

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  time: "Time",
  distance: "Distance",
  startPosition: "Start Position",
  target: "Target",
  courseOfFire: "Course of Fire",
};

export const CATEGORY_ORDER: CategoryKey[] = [
  "time",
  "distance",
  "startPosition",
  "target",
  "courseOfFire",
];

export interface CategoryCardDef {
  id: string;
  category: CategoryKey;
  label: string;
  detail?: string;
  /** Printed par time in seconds — only present on Time cards. */
  parSeconds?: number;
  qty: number;
  dealersChoice?: boolean;
}

function timeCard(seconds: number): CategoryCardDef {
  return {
    id: `time-${seconds}`,
    category: "time",
    label: `${seconds} Seconds`,
    parSeconds: seconds,
    qty: 4,
  };
}

function distanceCard(yards: number): CategoryCardDef {
  return {
    id: `distance-${yards}`,
    category: "distance",
    label: `${yards} Yards`,
    qty: 4,
  };
}

export const TIME_CARDS: CategoryCardDef[] = [2, 3, 4, 5, 6].map(timeCard);

export const DISTANCE_CARDS: CategoryCardDef[] = [2, 5, 7, 10, 12].map(
  distanceCard,
);

export const START_POSITION_CARDS: CategoryCardDef[] = [
  { id: "sp-hands-at-sides", label: "Holstered, Hands at Sides" },
  { id: "sp-low-ready", label: "Low Ready" },
  { id: "sp-180-turn", label: "Holstered, 180° Turn" },
  { id: "sp-wrists-above-shoulders", label: "Holstered, Wrists Above Shoulders" },
  { id: "sp-kneeling-wrists-above-shoulders", label: "Holstered, Kneeling, Wrists Above Shoulders" },
  { id: "sp-low-ready-empty-gun", label: "Low Ready, Empty Gun" },
].map((c) => ({ ...c, category: "startPosition" as const, qty: 4 }));

export const TARGET_CARDS: CategoryCardDef[] = [
  { id: "tg-1-a-zone", label: "1 USPSA A-Zone", detail: '6"x11"' },
  { id: "tg-3-a-zone-3yd", label: "3 USPSA A-Zone", detail: '6"x11", 3 yard spacing' },
  { id: "tg-1-head-box", label: "1 USPSA Head Box", detail: '2"x4"' },
  { id: "tg-2-a-zone-5yd", label: "2 USPSA A-Zone", detail: '6"x11", 5 yard spacing' },
  { id: "tg-2-a-zone-15yd", label: "2 USPSA A-Zone", detail: '6"x11", 15 yard spacing' },
  { id: "tg-2-head-box-7yd", label: "2 USPSA Head Box", detail: '2"x4", spaced 7 yards' },
  // Expansion Pack
  { id: "exp-tg-1-c-zone", label: "1 USPSA C-Zone", detail: '12"x24"' },
  { id: "exp-tg-2-targets-4yd", label: "2 USPSA Targets", detail: 'Whole target 18"x30", spaced 4 yards' },
  { id: "exp-tg-3-a-zone-shoulder", label: "3 USPSA A-Zone", detail: '6"x11", shoulder to shoulder' },
  { id: "exp-tg-1-a-zone-penalty", label: "1 USPSA A-Zone", detail: "Hits outside A-zone add 2 seconds, no makeup shots" },
  { id: "exp-tg-3-head-box-2yd", label: "3 USPSA Head Box", detail: '6"x6", spaced 2 yards' },
].map((c) => ({ ...c, category: "target" as const, qty: 4 }));

export const COURSE_OF_FIRE_CARDS: CategoryCardDef[] = [
  { id: "cof-2-reload-after-first", label: "2 Shots on Each Target", detail: "Reload after first shot" },
  { id: "cof-3-each-target", label: "3 Rounds Each Target" },
  { id: "cof-failure-drill", label: "Failure Drill on Each Target", detail: "2 body, 1 head" },
  { id: "cof-1-repeat-3x", label: "1 Round Each Target, Then Repeat", detail: "3 times" },
  { id: "cof-2-strong-hand", label: "2 Rounds Each Target", detail: "Strong hand" },
  { id: "cof-1-each-target", label: "1 Round Each Target" },
  // Expansion Pack
  { id: "exp-cof-3-reload-3", label: "3 Rounds, Reload, 3 Rounds Each Target" },
  { id: "exp-cof-4-moving-rearward", label: "4 Rounds Each Target", detail: "While moving rearward" },
  { id: "exp-cof-3-moving-left-right", label: "3 Rounds Each Target", detail: "While moving left to right" },
  { id: "exp-cof-2-reload-2", label: "2 Shots, Reload, 2 Shots Each Target" },
  { id: "exp-cof-6-each-target", label: "6 Rounds Each Target" },
].map((c) => ({ ...c, category: "courseOfFire" as const, qty: 4 }));

export const CATEGORY_DECKS: Record<CategoryKey, CategoryCardDef[]> = {
  time: TIME_CARDS,
  distance: DISTANCE_CARDS,
  startPosition: START_POSITION_CARDS,
  target: TARGET_CARDS,
  courseOfFire: COURSE_OF_FIRE_CARDS,
};

/** Dealer's Choice cards: one per category, qty 2 each. Shuffled into that category's deck. */
export function dealersChoiceCard(category: CategoryKey): CategoryCardDef {
  return {
    id: `dealers-choice-${category}`,
    category,
    label: "Dealer's Choice",
    qty: 2,
    dealersChoice: true,
  };
}

export function buildCategoryDeck(category: CategoryKey): CategoryCardDef[] {
  return [...CATEGORY_DECKS[category], dealersChoiceCard(category)];
}

export type ChallengeAutoEffect =
  | "plusHalfSecond"
  | "donateLastPlace"
  | "reverseChallenge"
  | "minusHalfSecond"
  | "minusOneSecond"
  | "lastPlaceBonus";

export interface ChallengeCardDef {
  id: string;
  text: string;
  qty: number;
  autoEffect?: ChallengeAutoEffect;
}

export const CHALLENGE_CARDS: ChallengeCardDef[] = [
  // x1
  { id: "ch-leave-mags-on-ground", text: "Leave all magazines on the ground", qty: 1 },
  { id: "ch-stand-on-one-foot", text: "Stand on one foot for every shot", qty: 1 },
  { id: "ch-switch-hand-2h-grip", text: "Switch hand position on 2-handed grip", qty: 1 },
  { id: "ch-donate-point", text: "Donate 1 point to last place", qty: 1, autoEffect: "donateLastPlace" },
  { id: "ch-shoot-moving-away", text: "Shoot while moving away from target", qty: 1 },
  { id: "ch-add-2-shots", text: "Add 2 shots to the end of the drill", qty: 1 },
  { id: "ch-mystery-load", text: "Mystery load first magazine", qty: 1 },
  // x2
  { id: "ch-strong-hand-only", text: "Strong hand only", qty: 2 },
  { id: "ch-no-makeup-shots", text: "No makeup shots", qty: 2 },
  { id: "ch-forced-reload", text: "Add a forced reload", qty: 2 },
  { id: "ch-plus-half-second", text: "Plus 0.5 seconds", qty: 2, autoEffect: "plusHalfSecond" },
  // x3
  { id: "ch-reverse", text: "Reverse a challenge card being played on you", qty: 3, autoEffect: "reverseChallenge" },
  { id: "ch-weak-hand", text: "Draw using weak hand", qty: 3 },
  // Expansion Pack
  { id: "exp-ch-minus-half-second", text: "Subtract 0.5 seconds off next turn", qty: 4, autoEffect: "minusHalfSecond" },
  { id: "exp-ch-low-ready-next-turn", text: "Start your next turn loaded, low ready", qty: 2 },
  { id: "exp-ch-circular-pattern", text: "Move in a circular pattern for the whole drill", qty: 2 },
  { id: "exp-ch-instant-head-box", text: "Instant Play: Holstered, hands at side. Draw and shoot a 2x4 head box from the 20 in 2 seconds or less to earn an instant win. Holes touching the line don't count. No makeup shots.", qty: 4 },
  { id: "exp-ch-weak-hand-after-draw", text: "Weak hand only (after the draw)", qty: 4 },
  { id: "exp-ch-minus-1-second", text: "Subtract 1 second from next turn", qty: 2, autoEffect: "minusOneSecond" },
  { id: "exp-ch-instant-last-place", text: "Instant Play: Current last place adds one point and draws a Challenge card", qty: 2, autoEffect: "lastPlaceBonus" },
];

export interface WhoopsieCardDef {
  id: string;
  text: string;
  qty: number;
  rounds: number;
  drawsChallengeForAll?: boolean;
}

export const WHOOPSIE_CARDS: WhoopsieCardDef[] = [
  { id: "wh-prone", text: "Next drill is shot from the prone position", qty: 1, rounds: 1 },
  {
    id: "wh-draw-challenge-all",
    text: 'Holder of the "Whoopsie" card draws a Challenge card which will affect all shooters on the next drill',
    qty: 1,
    rounds: 1,
    drawsChallengeForAll: true,
  },
  { id: "wh-deep-squat", text: "Hold a deep squat start position for the next 2 drills", qty: 1, rounds: 2 },
  { id: "wh-swap-guns", text: "Everyone swap guns to finish on the next 2 drills", qty: 1, rounds: 2 },
  { id: "wh-high-knees", text: "Perform high knees to finish on the next drill", qty: 1, rounds: 1 },
  { id: "wh-gun-on-ground", text: "Start next drill with your gun belt on the ground (off body)", qty: 1, rounds: 1 },
];

export const SCORING = {
  zoneMissPenalty: 0.5,
  completeMissPenalty: 1.0,
  overParPenalty: 1.0,
  pointsToWin: 5,
};

export const BILL_DRILL = {
  label: "Bill Drill",
  detail: "6 rounds, 7 yards, A-zone",
  parSeconds: undefined as number | undefined,
};
