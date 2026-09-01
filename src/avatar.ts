import { supabase } from "./integrations/supabase/client";

const BUCKET = "avatars";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType ? fromType.toLowerCase() : "jpg";
}

/** Uploads/replaces the caller's one avatar file. Returns the storage path, or null on failure. */
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/avatar.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: true,
  });
  if (error) {
    console.error("Failed to upload avatar", error);
    return null;
  }
  return path;
}

export async function getAvatarUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error("Failed to sign avatar URL", error);
    return null;
  }
  return data.signedUrl;
}
