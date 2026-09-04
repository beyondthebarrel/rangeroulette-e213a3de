-- Tags a logged session as dry fire (no live ammunition, no zone/complete
-- miss tracking) so History can label it distinctly and Analytics can
-- exclude it from accuracy/PR stats that only make sense for live fire.
ALTER TABLE public.training_sessions
  ADD COLUMN dry_fire BOOLEAN NOT NULL DEFAULT false;
