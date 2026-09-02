-- Adds a third promo code type: 'free_year' charges the card normally
-- (through the same $39.99 plan everyone else uses — no separate $0 phase,
-- which is what broke Square's checkout page display earlier), then the
-- webhook auto-refunds that first payment once it's confirmed. Renewals
-- after year one are left alone, so it converts to a normal paying
-- subscriber automatically.
ALTER TABLE public.promo_codes DROP CONSTRAINT promo_codes_discount_type_check;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_discount_type_check
  CHECK (discount_type IN ('free', 'half_off', 'free_year'));

ALTER TABLE public.promo_redemptions
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

UPDATE public.promo_codes SET discount_type = 'free_year' WHERE code = 'SNAPCAP26';
