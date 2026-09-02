-- "Clear Analytics" — non-destructive, matching how Clear History works: no
-- training_sessions row is ever deleted here. Analytics simply ignores any
-- session logged before this timestamp once it's set, so a reset is always
-- reversible in spirit (the underlying data never actually goes away).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS analytics_cleared_at TIMESTAMP WITH TIME ZONE;
