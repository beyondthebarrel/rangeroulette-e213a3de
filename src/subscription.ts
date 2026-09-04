import { supabase } from "./integrations/supabase/client";

export type SubscriptionStatus = "pending" | "active" | "past_due" | "canceled" | null;

/** Only "active" grants access — everything else (including no row at all) shows the paywall. */
export async function getMySubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.status as SubscriptionStatus) ?? null;
}

export interface SubscriptionDetails {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  /** No square_subscription_id means a "free" (lifetime) promo grant — there's nothing to ever renew or bill. */
  hasSquareSubscription: boolean;
  /** Still within this timestamp means a cancel request qualifies for a full refund. */
  trialEndsAt: string | null;
}

/** Fuller membership info for display (e.g. on the profile page) — see getMySubscriptionStatus for the plain gate check. */
export async function getMySubscriptionDetails(userId: string): Promise<SubscriptionDetails | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, square_subscription_id, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    status: (data.status as SubscriptionStatus) ?? null,
    currentPeriodEnd: data.current_period_end,
    hasSquareSubscription: !!data.square_subscription_id,
    trialEndsAt: data.trial_ends_at,
  };
}

export interface CancelResult {
  ok?: boolean;
  refunded?: boolean;
  error?: string;
}

/** Asks the square-cancel-subscription Edge Function to cancel billing and, if still within the refund window, refund the last payment. */
export async function cancelMySubscription(): Promise<CancelResult> {
  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    refunded?: boolean;
    error?: string;
  }>("square-cancel-subscription");

  if (data?.ok) return data;

  // Same non-2xx-body quirk as startCheckout — supabase-js doesn't surface
  // the response body as `data` on failure, so read it off the raw Response.
  let message = data?.error;
  const context = (error as { context?: Response } | null)?.context;
  if (!message && context) {
    try {
      const body = await context.clone().json();
      message = body?.error;
    } catch {
      // Response wasn't JSON — fall through to the generic message below.
    }
  }
  console.error("Failed to cancel subscription", message ?? error);
  return { error: message ?? "Couldn't cancel — check your connection and try again." };
}

export interface CheckoutResult {
  /** Set when a "free" promo code granted access directly — no Square checkout needed. */
  granted?: boolean;
  /** Set when a Square-hosted checkout URL was created — redirect the browser here. */
  url?: string;
  /** Set on failure — a message safe to show the user (e.g. an invalid promo code). */
  error?: string;
}

/** Asks the square-create-checkout Edge Function to start checkout, optionally with a promo code. */
export async function startCheckout(promoCode?: string): Promise<CheckoutResult> {
  const { data, error } = await supabase.functions.invoke<{
    url?: string;
    granted?: boolean;
    error?: string;
  }>("square-create-checkout", {
    body: { redirectOrigin: window.location.origin, promoCode: promoCode || undefined },
  });

  if (data?.url || data?.granted) return data;

  // supabase-js doesn't surface a non-2xx response body as `data` — the
  // actual error message (e.g. "That code isn't valid") lives on the raw
  // Response in error.context, so it has to be read out manually.
  let message = data?.error;
  const context = (error as { context?: Response } | null)?.context;
  if (!message && context) {
    try {
      const body = await context.clone().json();
      message = body?.error;
    } catch {
      // Response wasn't JSON — fall through to the generic message below.
    }
  }
  console.error("Failed to start checkout", message ?? error);
  return { error: message ?? "Couldn't start checkout — check your connection and try again." };
}
