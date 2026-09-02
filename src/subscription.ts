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
