-- Free-text note a user can add to a logged Train Mode session right after
-- logging it, before moving on to the next drill (e.g. "throwing low left,
-- check grip"). Nullable and purely additive — no existing row is affected.
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS notes TEXT;
