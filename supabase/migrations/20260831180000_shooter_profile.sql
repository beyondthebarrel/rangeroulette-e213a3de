-- Detailed shooter profile, collected once right after first sign-in, plus a
-- multi-entry "pistol profile" (armory) a user can build out over time.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS shooting_level TEXT
    CHECK (shooting_level IS NULL OR shooting_level IN ('beginner', 'intermediate', 'advanced', 'pro')),
  ADD COLUMN IF NOT EXISTS primary_pistol TEXT,
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.pistols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  caliber TEXT,
  optic TEXT,
  light TEXT,
  holster TEXT,
  accessories TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pistols_owner ON public.pistols(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pistols TO authenticated;
GRANT ALL ON public.pistols TO service_role;

ALTER TABLE public.pistols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pistols" ON public.pistols;
CREATE POLICY "Users can view their own pistols"
  ON public.pistols FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pistols" ON public.pistols;
CREATE POLICY "Users can insert their own pistols"
  ON public.pistols FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pistols" ON public.pistols;
CREATE POLICY "Users can update their own pistols"
  ON public.pistols FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pistols" ON public.pistols;
CREATE POLICY "Users can delete their own pistols"
  ON public.pistols FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Avatar photo, private bucket, one folder per user (mirrors training-photos).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;
CREATE POLICY "Users can view their own avatar"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can replace their own avatar" ON storage.objects;
CREATE POLICY "Users can replace their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
