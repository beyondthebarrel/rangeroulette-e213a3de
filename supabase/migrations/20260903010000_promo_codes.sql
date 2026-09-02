-- Discount codes for the subscription paywall. Redemption is handled
-- entirely by the square-create-checkout Edge Function (via the service
-- role key) so a client can never grant itself free/discounted access —
-- authenticated users can only SELECT to check a code's own validity
-- client-side before submitting it.
CREATE TABLE public.promo_codes (
  code TEXT NOT NULL PRIMARY KEY,
  -- 'free' grants active status immediately, no Square checkout at all.
  -- 'half_off' routes checkout through the discounted catalog plan.
  discount_type TEXT NOT NULL CHECK (discount_type IN ('free', 'half_off')),
  max_redemptions INTEGER NOT NULL,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One row per successful redemption; the unique constraint stops the same
-- account from redeeming the same code twice.
CREATE TABLE public.promo_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL REFERENCES public.promo_codes(code),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (code, user_id)
);

GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
GRANT ALL ON public.promo_redemptions TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can look up a promo code"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.promo_codes (code, discount_type, max_redemptions) VALUES
  ('FRIENDSFREE', 'free', 10),
  ('BETA50', 'half_off', 25)
ON CONFLICT (code) DO NOTHING;
