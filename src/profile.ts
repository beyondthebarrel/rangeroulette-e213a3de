import { readCache, writeCache } from "./offline/cache";
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
  /** Storage path of the pistol's photo, if one has been uploaded. */
  photoPath?: string;
}

export function pistolLabel(p: { make: string; model: string }): string {
  return [p.make, p.model].filter(Boolean).join(" ") || "Unnamed pistol";
}

/** Falls back to the email's local part when no nickname has been set. */
export async function getMyDisplayName(userId: string, fallbackEmail?: string | null): Promise<string> {
  const cacheKey = `displayName:${userId}`;
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (!error && data?.display_name) {
    writeCache(cacheKey, data.display_name);
    return data.display_name;
  }
  // Offline or a genuine error, rather than "no nickname set yet" — use
  // whatever name was last logged under so offline sessions still group
  // with the account's history instead of drifting to the email fallback.
  if (error) {
    const cached = readCache<string>(cacheKey);
    if (cached) return cached;
  }
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

export async function getMyShootingLevel(userId: string): Promise<ShootingLevel | null> {
  const cacheKey = `shootingLevel:${userId}`;
  const { data, error } = await supabase
    .from("profiles")
    .select("shooting_level")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return readCache<ShootingLevel | null>(cacheKey) ?? null;
  if (!data) return null;
  const level = (data.shooting_level as ShootingLevel | null) ?? null;
  writeCache(cacheKey, level);
  return level;
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

export interface SyncedPistol {
  /** Index into the `pistols` array passed to syncPistols. */
  index: number;
  id: string;
}

/**
 * Reconciles the caller's pistol list with the edited form array: existing
 * rows (carrying an `id`) are updated in place, new rows are inserted, and
 * any existing pistol no longer in the list is deleted. Preserving ids on
 * update (rather than delete-and-reinsert) matters because training_sessions
 * can reference a pistol by id — regenerating ids on every save would
 * silently unlink every session's pistol tag each time the profile is edited.
 *
 * Returns each surviving row's array index paired with its (existing or
 * newly assigned) id, so the caller can attach a pending photo upload to the
 * right row once new rows actually have an id to upload against. Returns
 * null on failure. Inserts run one row at a time (rather than a single
 * batch) specifically so each new row's id can be captured reliably.
 */
export async function syncPistols(
  userId: string,
  pistols: PistolInput[],
): Promise<SyncedPistol[] | null> {
  const valid = pistols
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => p.make.trim() && p.model.trim());
  const keepIds = valid.filter(({ p }) => p.id).map(({ p }) => p.id as string);

  let deleteQuery = supabase.from("pistols").delete().eq("user_id", userId);
  if (keepIds.length > 0) {
    deleteQuery = deleteQuery.not("id", "in", `(${keepIds.join(",")})`);
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    console.error("Failed to remove deleted pistols", deleteError);
    return null;
  }

  const results: SyncedPistol[] = [];

  for (const { p, index } of valid) {
    const fields = {
      make: p.make.trim(),
      model: p.model.trim(),
      caliber: p.caliber.trim() || null,
      optic: p.optic.trim() || null,
      light: p.light.trim() || null,
      holster: p.holster.trim() || null,
      accessories: p.accessories.trim() || null,
    };
    if (p.id) {
      const { error } = await supabase
        .from("pistols")
        .update(fields)
        .eq("id", p.id)
        .eq("user_id", userId);
      if (error) {
        console.error("Failed to update pistol", error);
        return null;
      }
      results.push({ index, id: p.id });
    } else {
      const { data, error } = await supabase
        .from("pistols")
        .insert({ user_id: userId, ...fields })
        .select("id")
        .single();
      if (error || !data) {
        console.error("Failed to save new pistol", error);
        return null;
      }
      results.push({ index, id: data.id });
    }
  }

  return results;
}

export async function setPistolPhotoPath(pistolId: string, photoPath: string | null): Promise<boolean> {
  const { error } = await supabase.from("pistols").update({ photo_path: photoPath }).eq("id", pistolId);
  if (error) {
    console.error("Failed to update pistol photo", error);
    return false;
  }
  return true;
}

export async function listMyPistols(userId: string): Promise<PistolInput[]> {
  const cacheKey = `pistols:${userId}`;
  const { data, error } = await supabase
    .from("pistols")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error || !data) return readCache<PistolInput[]>(cacheKey) ?? [];
  const pistols = data.map((row) => ({
    id: row.id,
    make: row.make,
    model: row.model,
    caliber: row.caliber ?? "",
    optic: row.optic ?? "",
    light: row.light ?? "",
    holster: row.holster ?? "",
    accessories: row.accessories ?? "",
    photoPath: row.photo_path ?? undefined,
  }));
  writeCache(cacheKey, pistols);
  return pistols;
}
