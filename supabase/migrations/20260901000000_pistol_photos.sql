-- Optional photo per pistol in a user's Pistol Profile, stored in a private
-- bucket scoped to that user's folder (mirrors training-photos/avatars).
ALTER TABLE public.pistols
  ADD COLUMN IF NOT EXISTS photo_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pistol-photos', 'pistol-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can view their own pistol photos" ON storage.objects;
CREATE POLICY "Users can view their own pistol photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pistol-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload their own pistol photos" ON storage.objects;
CREATE POLICY "Users can upload their own pistol photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pistol-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can replace their own pistol photos" ON storage.objects;
CREATE POLICY "Users can replace their own pistol photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pistol-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'pistol-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own pistol photos" ON storage.objects;
CREATE POLICY "Users can delete their own pistol photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pistol-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
