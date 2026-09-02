-- Tracks each account's Square subscription status, gating access to the
-- whole app. Rows are written only by the square-create-checkout and
-- square-webhook Edge Functions (via the service role key, bypassing RLS) —
-- a client could otherwise just mark itself "active" to skip paying, so no
-- INSERT/UPDATE/DELETE grant exists for authenticated users, only SELECT of
-- their own row.
CREATE TABLE public.subscriptions (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  square_customer_id TEXT,
  square_subscription_id TEXT,
  -- 'pending' (checkout link created, not yet paid), 'trialing', 'active',
  -- 'past_due', 'canceled'. Null/no-row means "never started checkout".
  status TEXT NOT NULL DEFAULT 'pending',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_square_customer ON public.subscriptions(square_customer_id);
CREATE INDEX idx_subscriptions_square_subscription ON public.subscriptions(square_subscription_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
