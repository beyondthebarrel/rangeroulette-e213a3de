-- Optional target photo per logged Train Mode session. Stored in a private
-- bucket, one folder per user (auth.uid()), so RLS on storage.objects can
-- scope access the same way training_sessions rows already are.

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS photo_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('training-photos', 'training-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can view their own training photos" ON storage.objects;
CREATE POLICY "Users can view their own training photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'training-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload their own training photos" ON storage.objects;
CREATE POLICY "Users can upload their own training photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'training-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own training photos" ON storage.objects;
CREATE POLICY "Users can delete their own training photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'training-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
