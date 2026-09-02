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

/** Asks the square-create-checkout Edge Function for a Square-hosted checkout URL, or null on failure. */
export async function createCheckoutUrl(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    "square-create-checkout",
    { body: { redirectOrigin: window.location.origin } },
  );
  if (error || !data?.url) {
    console.error("Failed to create checkout link", error ?? data?.error);
    return null;
  }
  return data.url;
}
