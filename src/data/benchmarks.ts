import type { ShootingLevel } from "../profile";
import type { TrainingDrill, TrainingDrillCard, TrainingSession } from "../training/types";

export interface BenchmarkDrill {
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
 * One fixed drill per shooting level, standing in as that level's target
 * goal. Each step up shortens the par time, extends distance, shrinks the
 * target and/or adds a harder course of fire, and tightens the allowed
 * misses — so clearing "pro" is strictly harder than clearing "beginner" on
 * every axis, not just one.
 */
export const BENCHMARKS: Record<ShootingLevel, BenchmarkDrill> = {
  beginner: {
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
  intermediate: {
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
  advanced: {
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
  pro: {
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
