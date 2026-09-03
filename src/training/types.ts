import type { CategoryKey } from "../data/cards";

export interface TrainingDrillCard {
  cardId: string;
  label: string;
  detail?: string;
}

export type TrainingDrill = Record<CategoryKey, TrainingDrillCard> & {
  parSeconds?: number;
};

export interface TrainingSession {
  id: string;
  trainee: string;
  loggedAt: string;
  drill: TrainingDrill;
  rawSeconds: number;
  zoneMisses: number;
  completeMisses: number;
  finalSeconds: number;
  /** Name of the saved drill this was logged against, if any (not the current name — a snapshot from log time). */
  savedDrillName?: string;
  /** Storage path of an attached target photo, if any (`training-photos` bucket). */
  photoPath?: string;
  /** Storage path of an attached target video, if any (`training-videos` bucket). */
  videoPath?: string;
  /** Which pistol (from the profile's pistol list) this was logged with, if tagged. */
  pistolId?: string;
  /** Set when the user "clears" Training History — hides it from History while Analytics still counts it. */
  archivedAt?: string;
  /** True for a session logged while offline that hasn't synced to the server yet — a local, not-yet-real id. */
  pendingSync?: boolean;
  /** Free-text note added after logging, before moving to the next drill. */
  notes?: string;
}
