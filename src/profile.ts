import { supabase } from "./integrations/supabase/client";

export type ShootingLevel = "beginner" | "intermediate" | "advanced" | "pro";

export const SHOOTING_LEVELS: ShootingLevel[] = ["beginner", "intermediate", "advanced", "pro"];

export interface ShooterProfile {
  displayName: string;
  age: number | null;
  shootingLevel: ShootingLevel | null;
  primaryPistol: string;
  avatarPath: string | null;
}

export interface PistolInput {
  /** Present for a pistol that already exists in the database; absent for a new row still being added. */
  id?: string;
  make: string;
  model: string;
  caliber: string;
  optic: string;
  light: string;
  holster: string;
  accessories: string;
}

export function pistolLabel(p: { make: string; model: string }): string {
  return [p.make, p.model].filter(Boolean).join(" ") || "Unnamed pistol";
}

/** Falls back to the email's local part when no nickname has been set. */
export async function getMyDisplayName(userId: string, fallbackEmail?: string | null): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (!error && data?.display_name) return data.display_name;
  return fallbackEmail?.split("@")[0] ?? "Me";
}

export async function updateMyDisplayName(userId: string, displayName: string): Promise<boolean> {
  const trimmed = displayName.trim();
  if (!trimmed) return false;
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, display_name: trimmed }, { onConflict: "user_id" });
  if (error) {
    console.error("Failed to update display name", error);
    return false;
  }
  return true;
}

/**
 * Whether the account holder has completed the post-sign-in profile setup.
 * Fails OPEN (returns true, i.e. "don't block") on any error — including the
 * `onboarded` column not existing yet because the migration hasn't been run —
 * so a schema hiccup never locks someone out of the app entirely.
 */
export async function getOnboardedStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return true;
  return data?.onboarded ?? true;
}

export async function getMyProfile(userId: string): Promise<ShooterProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, age, shooting_level, primary_pistol, avatar_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    displayName: data.display_name ?? "",
    age: data.age,
    shootingLevel: (data.shooting_level as ShootingLevel | null) ?? null,
    primaryPistol: data.primary_pistol ?? "",
    avatarPath: data.avatar_path,
  };
}

export async function saveShooterProfile(
  userId: string,
  profile: ShooterProfile,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        display_name: profile.displayName.trim(),
        age: profile.age,
        shooting_level: profile.shootingLevel,
        primary_pistol: profile.primaryPistol.trim() || null,
        avatar_path: profile.avatarPath,
        onboarded: true,
      },
      { onConflict: "user_id" },
    );
  if (error) {
    console.error("Failed to save shooter profile", error);
    return false;
  }
  return true;
}

/**
 * Reconciles the caller's pistol list with the edited form array: existing
 * rows (carrying an `id`) are updated in place, new rows are inserted, and
 * any existing pistol no longer in the list is deleted. Preserving ids on
 * update (rather than delete-and-reinsert) matters because training_sessions
 * can reference a pistol by id — regenerating ids on every save would
 * silently unlink every session's pistol tag each time the profile is edited.
 */
export async function syncPistols(userId: string, pistols: PistolInput[]): Promise<boolean> {
  const valid = pistols.filter((p) => p.make.trim() && p.model.trim());
  const keepIds = valid.filter((p) => p.id).map((p) => p.id as string);

  let deleteQuery = supabase.from("pistols").delete().eq("user_id", userId);
  if (keepIds.length > 0) {
    deleteQuery = deleteQuery.not("id", "in", `(${keepIds.join(",")})`);
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    console.error("Failed to remove deleted pistols", deleteError);
    return false;
  }

  for (const p of valid.filter((p) => p.id)) {
    const { error } = await supabase
      .from("pistols")
      .update({
        make: p.make.trim(),
        model: p.model.trim(),
        caliber: p.caliber.trim() || null,
        optic: p.optic.trim() || null,
        light: p.light.trim() || null,
        holster: p.holster.trim() || null,
        accessories: p.accessories.trim() || null,
      })
      .eq("id", p.id as string)
      .eq("user_id", userId);
    if (error) {
      console.error("Failed to update pistol", error);
      return false;
    }
  }

  const toInsert = valid
    .filter((p) => !p.id)
    .map((p) => ({
      user_id: userId,
      make: p.make.trim(),
      model: p.model.trim(),
      caliber: p.caliber.trim() || null,
      optic: p.optic.trim() || null,
      light: p.light.trim() || null,
      holster: p.holster.trim() || null,
      accessories: p.accessories.trim() || null,
    }));
  if (toInsert.length > 0) {
    const { error } = await supabase.from("pistols").insert(toInsert);
    if (error) {
      console.error("Failed to save new pistols", error);
      return false;
    }
  }

  return true;
}

export async function listMyPistols(userId: string): Promise<PistolInput[]> {
  const { data, error } = await supabase
    .from("pistols")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    make: row.make,
    model: row.model,
    caliber: row.caliber ?? "",
    optic: row.optic ?? "",
    light: row.light ?? "",
    holster: row.holster ?? "",
    accessories: row.accessories ?? "",
  }));
}
