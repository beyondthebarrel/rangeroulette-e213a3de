-- Link a logged Train Mode session to which pistol (from the profile's
-- pistol list) it was shot with, so Analytics can break performance down
-- per pistol. Nullable — tagging a pistol is optional, and a pistol removed
-- later just untags its past sessions rather than blocking the delete.
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS pistol_id UUID REFERENCES public.pistols(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_training_sessions_pistol ON public.training_sessions(pistol_id);
