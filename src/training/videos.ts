import { supabase } from "../integrations/supabase/client";

const BUCKET = "training-videos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function extensionFor(file: File | Blob, fallbackName?: string): string {
  const fromName = fallbackName?.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType ? fromType.toLowerCase() : "webm";
}

/** Uploads a video to the caller's own folder in the private bucket. Returns the storage path, or null on failure. */
export async function uploadTrainingVideo(userId: string, file: File | Blob, name?: string): Promise<string | null> {
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file, name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) {
    console.error("Failed to upload training video", error);
    return null;
  }
  return path;
}

/** Resolves a storage path to a time-limited signed URL for playback, or null on failure. */
export async function getTrainingVideoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error("Failed to sign training video URL", error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteTrainingVideo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.error("Failed to delete training video", error);
  }
}
