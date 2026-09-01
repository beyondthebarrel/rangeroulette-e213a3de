import { supabase } from "../integrations/supabase/client";
import type { Database } from "../integrations/supabase/types";
import { deleteTrainingPhoto } from "./photos";
import type { TrainingDrill, TrainingSession } from "./types";

type TrainingSessionInsert = Database["public"]["Tables"]["training_sessions"]["Insert"];

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
    console.error("Failed to load training sessions", error);
    return [];
  }
  return data.map(fromRow);
}

export async function deleteTrainingSession(id: string): Promise<boolean> {
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
