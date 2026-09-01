import { readCache, writeCache } from "../offline/cache";
import { supabase } from "../integrations/supabase/client";
import type { Database } from "../integrations/supabase/types";
import {
  getPendingSessions,
  PENDING_ID_PREFIX,
  pendingSessionToTrainingSession,
  removePendingSession,
} from "./offlineQueue";
import { deleteTrainingPhoto } from "./photos";
import type { TrainingDrill, TrainingSession } from "./types";

type TrainingSessionInsert = Database["public"]["Tables"]["training_sessions"]["Insert"];

const SESSIONS_CACHE_KEY = "training_sessions";

function mergeWithPending(server: TrainingSession[], trainee?: string): TrainingSession[] {
  const pending = getPendingSessions()
    .map(pendingSessionToTrainingSession)
    .filter((s) => !trainee || normalizeName(s.trainee) === normalizeName(trainee));
  return [...pending, ...server].sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function fromRow(row: {
  id: string;
  trainee: string;
  logged_at: string;
  drill: unknown;
  raw_seconds: number;
  zone_misses: number;
  complete_misses: number;
  final_seconds: number;
  saved_drill_name: string | null;
  photo_path?: string | null;
  pistol_id?: string | null;
  archived_at?: string | null;
}): TrainingSession {
  return {
    id: row.id,
    trainee: row.trainee,
    loggedAt: row.logged_at,
    drill: row.drill as TrainingDrill,
    rawSeconds: row.raw_seconds,
    zoneMisses: row.zone_misses,
    completeMisses: row.complete_misses,
    finalSeconds: row.final_seconds,
    savedDrillName: row.saved_drill_name ?? undefined,
    photoPath: row.photo_path ?? undefined,
    pistolId: row.pistol_id ?? undefined,
    archivedAt: row.archived_at ?? undefined,
  };
}

export async function recordTrainingSession(
  session: Omit<TrainingSession, "id" | "loggedAt">,
  recordedBy: string,
): Promise<TrainingSession | null> {
  const basePayload = {
    recorded_by: recordedBy,
    trainee: session.trainee,
    trainee_normalized: normalizeName(session.trainee),
    drill: session.drill,
    raw_seconds: session.rawSeconds,
    zone_misses: session.zoneMisses,
    complete_misses: session.completeMisses,
    final_seconds: session.finalSeconds,
  };
  let payload: TrainingSessionInsert = { ...basePayload };
  if (session.savedDrillName) payload.saved_drill_name = session.savedDrillName;
  if (session.photoPath) payload.photo_path = session.photoPath;
  if (session.pistolId) payload.pistol_id = session.pistolId;

  let { data, error } = await supabase
    .from("training_sessions")
    .insert(payload)
    .select()
    .single();

  // If saved_drill_name/photo_path/pistol_id are set but their columns
  // haven't been migrated onto the live project yet, PostgREST rejects the
  // whole insert (PGRST204). Retry with each optional column dropped in turn
  // so the result still logs — the dropped fields just won't show until the
  // migration runs.
  while (error?.code === "PGRST204" && Object.keys(payload).length > Object.keys(basePayload).length) {
    if ("pistol_id" in payload) {
      const { pistol_id: _pistolId, ...rest } = payload;
      payload = rest;
    } else if ("photo_path" in payload) {
      const { photo_path: _photoPath, ...rest } = payload;
      payload = rest;
    } else if ("saved_drill_name" in payload) {
      const { saved_drill_name: _savedDrillName, ...rest } = payload;
      payload = rest;
    }
    ({ data, error } = await supabase
      .from("training_sessions")
      .insert(payload)
      .select()
      .single());
  }

  if (error || !data) {
    console.error("Failed to record training session", error);
    return null;
  }
  return fromRow(data);
}

export async function getTrainingSessions(trainee?: string): Promise<TrainingSession[]> {
  let query = supabase
    .from("training_sessions")
    .select("*")
    .order("logged_at", { ascending: false });

  if (trainee) {
    query = query.eq("trainee_normalized", normalizeName(trainee));
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("Failed to load training sessions — falling back to last-known data", error);
    const cached = readCache<TrainingSession[]>(SESSIONS_CACHE_KEY) ?? [];
    const filtered = trainee
      ? cached.filter((s) => normalizeName(s.trainee) === normalizeName(trainee))
      : cached;
    return mergeWithPending(filtered, trainee);
  }
  const rows = data.map(fromRow);
  if (!trainee) writeCache(SESSIONS_CACHE_KEY, rows);
  return mergeWithPending(rows, trainee);
}

/**
 * Sessions not yet "cleared" from Training History. Analytics intentionally
 * uses `getTrainingSessions` instead (ignoring archived_at) so clearing
 * History never changes the lifetime totals/records shown there.
 */
export async function getVisibleTrainingSessions(): Promise<TrainingSession[]> {
  const { data, error } = await supabase
    .from("training_sessions")
    .select("*")
    .is("archived_at", null)
    .order("logged_at", { ascending: false });

  if (error) {
    // archived_at column not migrated onto the live project yet, or the
    // request never reached the network — fall back to showing everything
    // (merged with anything still queued locally) rather than a broken screen.
    return getTrainingSessions();
  }
  return mergeWithPending((data ?? []).map(fromRow));
}

/** Clears Training History by archiving every visible session for this account — data stays intact for Analytics. */
export async function clearTrainingHistory(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("training_sessions")
    .update({ archived_at: new Date().toISOString() })
    .eq("recorded_by", userId)
    .is("archived_at", null);

  if (error) {
    console.error("Failed to clear training history", error);
    return false;
  }
  return true;
}

export async function deleteTrainingSession(id: string): Promise<boolean> {
  // A session logged offline and not yet synced has a local id, not a real
  // row — remove it from the pending queue instead of hitting the network.
  if (id.startsWith(PENDING_ID_PREFIX)) {
    removePendingSession(id.slice(PENDING_ID_PREFIX.length));
    return true;
  }

  // .select() so we get the deleted row(s) back — without it, Postgres/PostgREST
  // reports success with zero rows affected when RLS blocks the delete (e.g. the
  // grant/policy migration hasn't been applied yet), rather than an error, which
  // would otherwise look like a successful delete that silently did nothing.
  const { data, error } = await supabase
    .from("training_sessions")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("Failed to delete training session", error);
    return false;
  }
  if (!data || data.length === 0) {
    console.error("Failed to delete training session: no rows affected");
    return false;
  }
  const photoPath = (data[0] as { photo_path?: string | null }).photo_path;
  if (photoPath) await deleteTrainingPhoto(photoPath);
  return true;
}

let flushing = false;

/**
 * Retries every session queued while offline, in the order they were logged.
 * Stops at the first failure rather than skipping ahead — `recordTrainingSession`
 * returns null for both "still offline" and a genuine server error, and there's
 * no way to tell those apart here, so treating any failure as "still offline,
 * try again later" is the safer assumption than silently dropping a queued result.
 */
export async function flushPendingSessions(userId: string): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (const item of getPendingSessions(userId)) {
      const saved = await recordTrainingSession(item.session, userId);
      if (!saved) break;
      removePendingSession(item.localId);
    }
  } finally {
    flushing = false;
  }
}
