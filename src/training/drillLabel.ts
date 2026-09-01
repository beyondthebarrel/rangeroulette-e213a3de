import type { TrainingDrill, TrainingSession } from "./types";

export function drillSummary(drill: TrainingDrill): string {
  const parts = [drill.time, drill.distance, drill.startPosition, drill.target, drill.courseOfFire];
  return parts.map((c) => c.label).join(" · ");
}

/** Groups sessions run against the same drill: same saved-drill name, or (for random draws) the same exact 5-card combo. */
export function drillKey(session: TrainingSession): string {
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
