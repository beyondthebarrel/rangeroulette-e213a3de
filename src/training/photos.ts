import { supabase } from "../integrations/supabase/client";

const BUCKET = "training-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType ? fromType.toLowerCase() : "jpg";
}

/** Uploads a photo to the caller's own folder in the private bucket. Returns the storage path, or null on failure. */
export async function uploadTrainingPhoto(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) {
    console.error("Failed to upload training photo", error);
    return null;
  }
  return path;
}

/** Resolves a storage path to a time-limited signed URL for display, or null on failure. */
export async function getTrainingPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error("Failed to sign training photo URL", error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteTrainingPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.error("Failed to delete training photo", error);
  }
}
