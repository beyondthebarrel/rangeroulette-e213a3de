import type { ShootingLevel } from "../profile";
import type { TrainingDrill, TrainingDrillCard, TrainingSession } from "../training/types";

export interface BenchmarkDrill {
  id: string;
  level: ShootingLevel;
  name: string;
  drill: TrainingDrill;
  maxZoneMisses: number;
  maxCompleteMisses: number;
}

function card(cardId: string, label: string, detail?: string): TrainingDrillCard {
  return detail ? { cardId, label, detail } : { cardId, label };
}

/**
 * Three fixed drills per shooting level, standing in as that level's target
 * goals — variety within a level (draw speed, transitions, volume of fire)
 * rather than one single test. Each level up shortens the par time, extends
 * distance, shrinks the target and/or adds a harder course of fire, and
 * tightens the allowed misses, so clearing any "pro" drill is strictly
 * harder than clearing any "beginner" one.
 */
export const BENCHMARKS: Record<ShootingLevel, BenchmarkDrill[]> = {
  beginner: [
    {
      id: "beginner-1",
      level: "beginner",
      name: "First Steps",
      drill: {
        time: card("time-6", "6 Seconds"),
        distance: card("distance-5", "5 Yards"),
        startPosition: card("sp-hands-at-sides", "Holstered, Hands at Sides"),
        target: card("tg-1-a-zone", "1 USPSA A-Zone", '6"x11"'),
        courseOfFire: card("cof-1-each-target", "1 Round Each Target"),
        parSeconds: 6,
      },
      maxZoneMisses: 2,
      maxCompleteMisses: 0,
    },
    {
      id: "beginner-2",
      level: "beginner",
      name: "Steady Start",
      drill: {
        time: card("time-6", "6 Seconds"),
        distance: card("distance-2", "2 Yards"),
        startPosition: card("sp-low-ready-empty-gun", "Low Ready, Empty Gun"),
        target: card("tg-1-a-zone", "1 USPSA A-Zone", '6"x11"'),
        courseOfFire: card("cof-1-repeat-3x", "1 Round Each Target, Then Repeat", "3 times"),
        parSeconds: 6,
      },
      maxZoneMisses: 2,
      maxCompleteMisses: 0,
    },
    {
      id: "beginner-3",
      level: "beginner",
      name: "First Draw",
      drill: {
        time: card("time-5", "5 Seconds"),
        distance: card("distance-5", "5 Yards"),
        startPosition: card("sp-hands-at-sides", "Holstered, Hands at Sides"),
        target: card("tg-1-a-zone", "1 USPSA A-Zone", '6"x11"'),
        courseOfFire: card("cof-2-reload-after-first", "2 Shots on Each Target", "Reload after first shot"),
        parSeconds: 5,
      },
      maxZoneMisses: 2,
      maxCompleteMisses: 0,
    },
  ],
  intermediate: [
    {
      id: "intermediate-1",
      level: "intermediate",
      name: "Steady Hands",
      drill: {
        time: card("time-4", "4 Seconds"),
        distance: card("distance-7", "7 Yards"),
        startPosition: card("sp-low-ready", "Low Ready"),
        target: card("tg-1-a-zone", "1 USPSA A-Zone", '6"x11"'),
        courseOfFire: card("cof-2-strong-hand", "2 Rounds Each Target", "Strong hand"),
        parSeconds: 4,
      },
      maxZoneMisses: 1,
      maxCompleteMisses: 0,
    },
    {
      id: "intermediate-2",
      level: "intermediate",
      name: "Quick Transition",
      drill: {
        time: card("time-5", "5 Seconds"),
        distance: card("distance-7", "7 Yards"),
        startPosition: card("sp-hands-at-sides", "Holstered, Hands at Sides"),
        target: card("tg-2-a-zone-5yd", "2 USPSA A-Zone", '6"x11", 5 yard spacing'),
        courseOfFire: card("cof-1-each-target", "1 Round Each Target"),
        parSeconds: 5,
      },
      maxZoneMisses: 1,
      maxCompleteMisses: 0,
    },
    {
      id: "intermediate-3",
      level: "intermediate",
      name: "Under Time",
      drill: {
        time: card("time-4", "4 Seconds"),
        distance: card("distance-5", "5 Yards"),
        startPosition: card("sp-wrists-above-shoulders", "Holstered, Wrists Above Shoulders"),
        target: card("tg-1-a-zone", "1 USPSA A-Zone", '6"x11"'),
        courseOfFire: card("cof-3-each-target", "3 Rounds Each Target"),
        parSeconds: 4,
      },
      maxZoneMisses: 1,
      maxCompleteMisses: 0,
    },
  ],
  advanced: [
    {
      id: "advanced-1",
      level: "advanced",
      name: "Precision Under Pressure",
      drill: {
        time: card("time-3", "3 Seconds"),
        distance: card("distance-10", "10 Yards"),
        startPosition: card("sp-180-turn", "Holstered, 180° Turn"),
        target: card("tg-1-head-box", "1 USPSA Head Box", '2"x4"'),
        courseOfFire: card("cof-1-each-target", "1 Round Each Target"),
        parSeconds: 3,
      },
      maxZoneMisses: 0,
      maxCompleteMisses: 0,
    },
    {
      id: "advanced-2",
      level: "advanced",
      name: "Split Second",
      drill: {
        time: card("time-2", "2 Seconds"),
        distance: card("distance-7", "7 Yards"),
        startPosition: card("sp-low-ready", "Low Ready"),
        target: card("tg-1-head-box", "1 USPSA Head Box", '2"x4"'),
        courseOfFire: card("cof-1-each-target", "1 Round Each Target"),
        parSeconds: 2,
      },
      maxZoneMisses: 0,
      maxCompleteMisses: 0,
    },
    {
      id: "advanced-3",
      level: "advanced",
      name: "Multiple Threats",
      drill: {
        time: card("time-3", "3 Seconds"),
        distance: card("distance-7", "7 Yards"),
        startPosition: card("sp-hands-at-sides", "Holstered, Hands at Sides"),
        target: card("tg-2-a-zone-5yd", "2 USPSA A-Zone", '6"x11", 5 yard spacing'),
        courseOfFire: card("cof-2-strong-hand", "2 Rounds Each Target", "Strong hand"),
        parSeconds: 3,
      },
      maxZoneMisses: 0,
      maxCompleteMisses: 0,
    },
  ],
  pro: [
    {
      id: "pro-1",
      level: "pro",
      name: "The Standard",
      drill: {
        time: card("time-2", "2 Seconds"),
        distance: card("distance-12", "12 Yards"),
        startPosition: card(
          "sp-kneeling-wrists-above-shoulders",
          "Holstered, Kneeling, Wrists Above Shoulders",
        ),
        target: card("tg-2-head-box-7yd", "2 USPSA Head Box", '2"x4", spaced 7 yards'),
        courseOfFire: card("cof-failure-drill", "Failure Drill on Each Target", "2 body, 1 head"),
        parSeconds: 2,
      },
      maxZoneMisses: 0,
      maxCompleteMisses: 0,
    },
    {
      id: "pro-2",
      level: "pro",
      name: "No Room for Error",
      drill: {
        time: card("time-2", "2 Seconds"),
        distance: card("distance-10", "10 Yards"),
        startPosition: card("sp-180-turn", "Holstered, 180° Turn"),
        target: card("tg-1-head-box", "1 USPSA Head Box", '2"x4"'),
        courseOfFire: card("cof-1-each-target", "1 Round Each Target"),
        parSeconds: 2,
      },
      maxZoneMisses: 0,
      maxCompleteMisses: 0,
    },
    {
      id: "pro-3",
      level: "pro",
      name: "Full Send",
      drill: {
        time: card("time-3", "3 Seconds"),
        distance: card("distance-12", "12 Yards"),
        startPosition: card("sp-wrists-above-shoulders", "Holstered, Wrists Above Shoulders"),
        target: card("tg-2-a-zone-15yd", "2 USPSA A-Zone", '6"x11", 15 yard spacing'),
        courseOfFire: card("cof-failure-drill", "Failure Drill on Each Target", "2 body, 1 head"),
        parSeconds: 3,
      },
      maxZoneMisses: 0,
      maxCompleteMisses: 0,
    },
  ],
};

function sameFiveCards(a: TrainingDrill, b: TrainingDrill): boolean {
  return (
    a.time.cardId === b.time.cardId &&
    a.distance.cardId === b.distance.cardId &&
    a.startPosition.cardId === b.startPosition.cardId &&
    a.target.cardId === b.target.cardId &&
    a.courseOfFire.cardId === b.courseOfFire.cardId
  );
}

/** A pass means: the exact benchmark drill, run under par, within the allowed misses. */
export function passesBenchmark(session: TrainingSession, benchmark: BenchmarkDrill): boolean {
  const par = benchmark.drill.parSeconds ?? Infinity;
  return (
    sameFiveCards(session.drill, benchmark.drill) &&
    session.rawSeconds <= par &&
    session.zoneMisses <= benchmark.maxZoneMisses &&
    session.completeMisses <= benchmark.maxCompleteMisses
  );
}

/** The fastest qualifying attempt on record for this benchmark, if any. */
export function findBestBenchmarkPass(
  sessions: TrainingSession[],
  benchmark: BenchmarkDrill,
): TrainingSession | null {
  const passing = sessions.filter((s) => passesBenchmark(s, benchmark));
  if (passing.length === 0) return null;
  return passing.reduce((a, b) => (a.rawSeconds <= b.rawSeconds ? a : b));
}
