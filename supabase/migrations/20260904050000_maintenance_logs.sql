-- Per-pistol maintenance journal: cleanings, malfunctions/issues, and parts
-- replaced. Mirrors the ownership/RLS pattern used by public.pistols.
CREATE TABLE public.maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pistol_id UUID REFERENCES public.pistols(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('cleaning', 'malfunction', 'part_replaced', 'note')),
  description TEXT NOT NULL,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_logs_owner ON public.maintenance_logs(user_id);
CREATE INDEX idx_maintenance_logs_pistol ON public.maintenance_logs(pistol_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_logs TO authenticated;
GRANT ALL ON public.maintenance_logs TO service_role;

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own maintenance log"
  ON public.maintenance_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own maintenance log"
  ON public.maintenance_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maintenance log"
  ON public.maintenance_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maintenance log"
  ON public.maintenance_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
