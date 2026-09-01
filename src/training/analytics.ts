import { pistolLabel, type PistolInput } from "../profile";
import { drillKey, drillLabel } from "./drillLabel";
import type { TrainingSession } from "./types";

const TOP_N = 5;

export interface DrillGroupStat {
  key: string;
  label: string;
  reps: number;
  bestSession: TrainingSession;
  firstSession: TrainingSession;
  improvementSeconds: number;
  improvementPercent: number;
  /** % of reps on this drill with zero zone/complete misses. */
  cleanRate: number;
  avgZoneMisses: number;
  avgCompleteMisses: number;
}

export interface DailyVolume {
  date: string;
  reps: number;
}

export interface PistolStat {
  pistolId: string;
  label: string;
  reps: number;
  bestSeconds: number;
  averageSeconds: number;
  cleanRate: number;
}

export interface AccountAnalytics {
  totalReps: number;
  uniqueDrillCount: number;
  overallBestSession: TrainingSession | null;
  firstLoggedAt: string | null;
  lastLoggedAt: string | null;
  bestDrills: DrillGroupStat[];
  mostImproved: DrillGroupStat[];
  mostRepeated: DrillGroupStat[];
  leastAccurate: DrillGroupStat[];
  dailyVolume: DailyVolume[];
  byPistol: PistolStat[];
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

export function computeAccountAnalytics(
  sessions: TrainingSession[],
  pistols: PistolInput[] = [],
): AccountAnalytics {
  if (sessions.length === 0) {
    return {
      totalReps: 0,
      uniqueDrillCount: 0,
      overallBestSession: null,
      firstLoggedAt: null,
      lastLoggedAt: null,
      bestDrills: [],
      mostImproved: [],
      mostRepeated: [],
      leastAccurate: [],
      dailyVolume: [],
      byPistol: [],
    };
  }

  const drillGroups = groupBy(sessions, drillKey);
  const drillStats: DrillGroupStat[] = [...drillGroups.entries()].map(([key, group]) => {
    const sorted = [...group].sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
    );
    const firstSession = sorted[0];
    const bestSession = group.reduce((a, b) => (a.finalSeconds <= b.finalSeconds ? a : b));
    const improvementSeconds =
      Math.round(Math.max(0, firstSession.finalSeconds - bestSession.finalSeconds) * 100) / 100;
    const improvementPercent =
      firstSession.finalSeconds > 0
        ? Math.round((improvementSeconds / firstSession.finalSeconds) * 1000) / 10
        : 0;
    const cleanReps = group.filter((s) => s.zoneMisses === 0 && s.completeMisses === 0).length;
    const cleanRate = Math.round((cleanReps / group.length) * 1000) / 10;
    const avgZoneMisses =
      Math.round((group.reduce((sum, s) => sum + s.zoneMisses, 0) / group.length) * 100) / 100;
    const avgCompleteMisses =
      Math.round((group.reduce((sum, s) => sum + s.completeMisses, 0) / group.length) * 100) / 100;
    return {
      key,
      label: drillLabel(firstSession),
      reps: group.length,
      bestSession,
      firstSession,
      improvementSeconds,
      improvementPercent,
      cleanRate,
      avgZoneMisses,
      avgCompleteMisses,
    };
  });

  const bestDrills = [...drillStats]
    .sort((a, b) => a.bestSession.finalSeconds - b.bestSession.finalSeconds)
    .slice(0, TOP_N);

  const mostImproved = drillStats
    .filter((d) => d.reps >= 2 && d.improvementSeconds > 0)
    .sort((a, b) => b.improvementSeconds - a.improvementSeconds)
    .slice(0, TOP_N);

  const mostRepeated = [...drillStats].sort((a, b) => b.reps - a.reps).slice(0, TOP_N);

  const leastAccurate = [...drillStats]
    .sort((a, b) => a.cleanRate - b.cleanRate || b.reps - a.reps)
    .slice(0, TOP_N);

  const overallBestSession = sessions.reduce((a, b) => (a.finalSeconds <= b.finalSeconds ? a : b));
  const loggedTimes = sessions.map((s) => new Date(s.loggedAt).getTime());

  const dayGroups = groupBy(sessions, (s) => localDateKey(s.loggedAt));
  const dailyVolume: DailyVolume[] = [...dayGroups.entries()]
    .map(([date, group]) => ({ date, reps: group.length }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pistolLookup = new Map(pistols.filter((p) => p.id).map((p) => [p.id as string, pistolLabel(p)]));
  const taggedSessions = sessions.filter((s) => s.pistolId && pistolLookup.has(s.pistolId));
  const pistolGroups = groupBy(taggedSessions, (s) => s.pistolId as string);
  const byPistol: PistolStat[] = [...pistolGroups.entries()]
    .map(([pistolId, group]) => {
      const cleanReps = group.filter((s) => s.zoneMisses === 0 && s.completeMisses === 0).length;
      return {
        pistolId,
        label: pistolLookup.get(pistolId) ?? "Unknown pistol",
        reps: group.length,
        bestSeconds: Math.min(...group.map((s) => s.finalSeconds)),
        averageSeconds:
          Math.round((group.reduce((sum, s) => sum + s.finalSeconds, 0) / group.length) * 100) / 100,
        cleanRate: Math.round((cleanReps / group.length) * 1000) / 10,
      };
    })
    .sort((a, b) => b.reps - a.reps);

  return {
    totalReps: sessions.length,
    uniqueDrillCount: drillGroups.size,
    overallBestSession,
    firstLoggedAt: new Date(Math.min(...loggedTimes)).toISOString(),
    lastLoggedAt: new Date(Math.max(...loggedTimes)).toISOString(),
    bestDrills,
    mostImproved,
    mostRepeated,
    leastAccurate,
    dailyVolume,
    byPistol,
  };
}
