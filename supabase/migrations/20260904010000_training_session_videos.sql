-- Optional target video per logged Train Mode session — same private,
-- per-user-folder pattern as training-photos, just a separate bucket since
-- video files are larger and benefit from their own size/type limits.
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS video_path TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('training-videos', 'training-videos', false, 104857600)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can view their own training videos" ON storage.objects;
CREATE POLICY "Users can view their own training videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'training-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload their own training videos" ON storage.objects;
CREATE POLICY "Users can upload their own training videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'training-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own training videos" ON storage.objects;
CREATE POLICY "Users can delete their own training videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'training-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
