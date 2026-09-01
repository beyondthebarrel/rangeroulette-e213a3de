import { supabase } from "../integrations/supabase/client";
import type { TrainingDrill } from "./types";

interface SavedDrillRow {
  id: string;
  user_id: string;
  name: string;
  name_normalized: string;
  drill: unknown;
  par_seconds: number | null;
  created_at: string;
}

/** `saved_drills` is not present in the generated Database types, so query it untyped. */
function savedDrillsTable() {
  return (supabase as unknown as {
    from: (t: string) => ReturnType<typeof supabase.from>;
  }).from("saved_drills") as unknown as {
    select: (q: string) => any;
    upsert: (v: Record<string, unknown>, o?: Record<string, unknown>) => any;
    delete: () => any;
  };
}

export interface SavedDrill {
  id: string;
  name: string;
  drill: TrainingDrill;
  parSeconds?: number;
  createdAt: string;
}

function fromRow(row: SavedDrillRow): SavedDrill {
  return {
    id: row.id,
    name: row.name,
    drill: row.drill as TrainingDrill,
    parSeconds: row.par_seconds ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listSavedDrills(userId: string): Promise<SavedDrill[]> {
  const { data, error } = await savedDrillsTable()
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to load saved drills", error);
    return [];
  }
  return (data as SavedDrillRow[]).map(fromRow);
}

export async function saveDrill(
  userId: string,
  name: string,
  drill: TrainingDrill,
): Promise<SavedDrill | null> {
  const { data, error } = await savedDrillsTable()
    .upsert(
      {
        user_id: userId,
        name: name.trim(),
        name_normalized: name.trim().toLowerCase(),
        drill,
        par_seconds: drill.parSeconds ?? null,
      },
      { onConflict: "user_id,name_normalized" },
    )
    .select()
    .single();

  if (error || !data) {
    console.error("Failed to save drill", error);
    return null;
  }
  return fromRow(data as SavedDrillRow);
}

export async function deleteSavedDrill(id: string): Promise<boolean> {
  const { error } = await savedDrillsTable().delete().eq("id", id);
  if (error) {
    console.error("Failed to delete saved drill", error);
    return false;
  }
  return true;
}

/**
 * Deletes every saved drill template for this account. Only affects the
 * `saved_drills` table — logged sessions in Analytics/History keep their own
 * snapshot of the drill and saved name at log time, so this can't touch them.
 */
export async function deleteAllSavedDrills(userId: string): Promise<boolean> {
  const { error } = await savedDrillsTable().delete().eq("user_id", userId);
  if (error) {
    console.error("Failed to clear saved drills", error);
    return false;
  }
  return true;
}
