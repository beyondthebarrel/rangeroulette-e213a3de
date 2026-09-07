import { pistolLabel, type PistolInput } from "../profile";
import { drillKey, drillLabel } from "./drillLabel";
import type { TrainingSession } from "./types";

const TOP_N = 5;

/**
 * A rep "passes" if it explicitly recorded pass/fail (every rep logged since
 * dry fire switched to a yes/no par check). Reps logged before that — which
 * still carry a real typed-in time — fall back to comparing that time
 * against the drill's par, so old history keeps a sensible pass/fail read.
 */
export function didPass(session: TrainingSession): boolean {
  if (session.passed != null) return session.passed;
  const par = session.drill.parSeconds;
  return par == null ? true : session.finalSeconds <= par;
}

export interface DryFireDrillStat {
  key: string;
  label: string;
  reps: number;
  passes: number;
  passRate: number;
  lastSession: TrainingSession;
}

export interface DryFirePistolStat {
  pistolId: string;
  label: string;
  reps: number;
  passes: number;
  passRate: number;
}

export interface DailyVolume {
  date: string;
  reps: number;
}

export interface DryFireAnalytics {
  totalReps: number;
  uniqueDrillCount: number;
  totalPasses: number;
  passRate: number;
  firstLoggedAt: string | null;
  lastLoggedAt: string | null;
  toughestDrills: DryFireDrillStat[];
  mostRepeated: DryFireDrillStat[];
  dailyVolume: DailyVolume[];
  byPistol: DryFirePistolStat[];
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export function computeDryFireAnalytics(
  sessions: TrainingSession[],
  pistols: PistolInput[] = [],
): DryFireAnalytics {
  if (sessions.length === 0) {
    return {
      totalReps: 0,
      uniqueDrillCount: 0,
      totalPasses: 0,
      passRate: 0,
      firstLoggedAt: null,
      lastLoggedAt: null,
      toughestDrills: [],
      mostRepeated: [],
      dailyVolume: [],
      byPistol: [],
    };
  }

  const drillGroups = groupBy(sessions, drillKey);
  const drillStats: DryFireDrillStat[] = [...drillGroups.entries()].map(([key, group]) => {
    const sorted = [...group].sort(
      (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
    );
    const lastSession = sorted[0];
    const passes = group.filter(didPass).length;
    return {
      key,
      label: drillLabel(lastSession),
      reps: group.length,
      passes,
      passRate: Math.round((passes / group.length) * 1000) / 10,
      lastSession,
    };
  });

  // Drills you've missed the most on, run at least twice so one bad rep
  // doesn't dominate — the ones worth drilling again.
  const toughestDrills = drillStats
    .filter((d) => d.reps >= 2)
    .sort((a, b) => a.passRate - b.passRate || b.reps - a.reps)
    .slice(0, TOP_N);

  const mostRepeated = [...drillStats].sort((a, b) => b.reps - a.reps).slice(0, TOP_N);

  const totalPasses = sessions.filter(didPass).length;
  const loggedTimes = sessions.map((s) => new Date(s.loggedAt).getTime());

  const dayGroups = groupBy(sessions, (s) => localDateKey(s.loggedAt));
  const dailyVolume: DailyVolume[] = [...dayGroups.entries()]
    .map(([date, group]) => ({ date, reps: group.length }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pistolLookup = new Map(pistols.filter((p) => p.id).map((p) => [p.id as string, pistolLabel(p)]));
  const taggedSessions = sessions.filter((s) => s.pistolId && pistolLookup.has(s.pistolId));
  const pistolGroups = groupBy(taggedSessions, (s) => s.pistolId as string);
  const byPistol: DryFirePistolStat[] = [...pistolGroups.entries()]
    .map(([pistolId, group]) => {
      const passes = group.filter(didPass).length;
      return {
        pistolId,
        label: pistolLookup.get(pistolId) ?? "Unknown pistol",
        reps: group.length,
        passes,
        passRate: Math.round((passes / group.length) * 1000) / 10,
      };
    })
    .sort((a, b) => b.reps - a.reps);

  return {
    totalReps: sessions.length,
    uniqueDrillCount: drillGroups.size,
    totalPasses,
    passRate: Math.round((totalPasses / sessions.length) * 1000) / 10,
    firstLoggedAt: new Date(Math.min(...loggedTimes)).toISOString(),
    lastLoggedAt: new Date(Math.max(...loggedTimes)).toISOString(),
    toughestDrills,
    mostRepeated,
    dailyVolume,
    byPistol,
  };
}
