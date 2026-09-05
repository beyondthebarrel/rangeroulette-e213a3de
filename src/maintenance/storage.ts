import { supabase } from "../integrations/supabase/client";

export type MaintenanceEntryType = "cleaning" | "malfunction" | "part_replaced" | "note";

export interface MaintenanceLogEntry {
  id: string;
  entryType: MaintenanceEntryType;
  description: string;
  pistolId?: string;
  loggedAt: string;
}

function fromRow(row: {
  id: string;
  entry_type: string;
  description: string;
  pistol_id: string | null;
  logged_at: string;
}): MaintenanceLogEntry {
  return {
    id: row.id,
    entryType: row.entry_type as MaintenanceEntryType,
    description: row.description,
    pistolId: row.pistol_id ?? undefined,
    loggedAt: row.logged_at,
  };
}

export async function listMaintenanceLog(userId: string): Promise<MaintenanceLogEntry[]> {
  const { data, error } = await supabase
    .from("maintenance_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to load maintenance log", error);
    return [];
  }
  return data.map(fromRow);
}

export async function addMaintenanceLogEntry(
  userId: string,
  entry: { entryType: MaintenanceEntryType; description: string; pistolId?: string; loggedAt: string },
): Promise<MaintenanceLogEntry | null> {
  const { data, error } = await supabase
    .from("maintenance_logs")
    .insert({
      user_id: userId,
      entry_type: entry.entryType,
      description: entry.description.trim(),
      pistol_id: entry.pistolId ?? null,
      logged_at: entry.loggedAt,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Failed to add maintenance log entry", error);
    return null;
  }
  return fromRow(data);
}

export async function deleteMaintenanceLogEntry(id: string): Promise<boolean> {
  const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete maintenance log entry", error);
    return false;
  }
  return true;
}
