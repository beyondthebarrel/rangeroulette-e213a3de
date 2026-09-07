-- Dry fire now logs pass/fail against the drill's par time instead of a
-- typed-in raw time. raw_seconds/final_seconds stay populated (with the
-- drill's par time as a nominal value) so the shared NOT NULL columns and
-- any code still reading them keep working; `passed` is the real signal.
ALTER TABLE public.training_sessions
  ADD COLUMN passed BOOLEAN;
