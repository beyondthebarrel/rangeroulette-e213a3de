-- Lets a user "clear" their visible Training History without touching the
-- rows Analytics is computed from: clearing sets archived_at on every
-- session instead of deleting it, so History shows a clean slate while
-- Analytics (which ignores archived_at) keeps the full lifetime record.
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_training_sessions_archived
  ON public.training_sessions(recorded_by, archived_at);

-- No UPDATE policy exists yet on this table (only select/insert/delete so
-- far) — needed so a user can archive their own rows.
GRANT UPDATE ON public.training_sessions TO authenticated;

DROP POLICY IF EXISTS "Users can update their own training sessions" ON public.training_sessions;
CREATE POLICY "Users can update their own training sessions"
  ON public.training_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = recorded_by)
  WITH CHECK (auth.uid() = recorded_by);
