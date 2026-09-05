import type { TrainingDrill, TrainingSession } from "./types";

export function drillSummary(drill: TrainingDrill): string {
  const parts = [drill.time, drill.distance, drill.startPosition, drill.target, drill.courseOfFire];
  return parts.map((c) => c.label).join(" · ");
}

interface DrillKeyInput {
  drill: TrainingDrill;
  savedDrillName?: string;
}

/** Groups sessions run against the same drill: same saved-drill name, or (for random draws) the same exact 5-card combo. */
export function drillKey(session: DrillKeyInput): string {
  if (session.savedDrillName) return `name:${session.savedDrillName.trim().toLowerCase()}`;
  const d = session.drill;
  return [
    "cards",
    d.time.cardId,
    d.distance.cardId,
    d.startPosition.cardId,
    d.target.cardId,
    d.courseOfFire.cardId,
  ].join("|");
}

export function drillLabel(session: TrainingSession): string {
  return session.savedDrillName ?? drillSummary(session.drill);
}

/**
 * Lowest finalSeconds among past sessions matching this exact drill (same
 * drillKey) and fire mode, or null if it's never been run before — logging a
 * session against a drill for the first time is never a "PR", there's
 * nothing yet to beat.
 */
export function findPreviousBest(
  sessions: TrainingSession[],
  entry: DrillKeyInput,
  dryFire: boolean,
): number | null {
  const key = drillKey(entry);
  const matches = sessions.filter((s) => !!s.dryFire === dryFire && drillKey(s) === key);
  if (matches.length === 0) return null;
  return Math.min(...matches.map((s) => s.finalSeconds));
}
