// Self-service "Cancel Subscription" for the signed-in user's own account.
// Verifies the caller's Supabase session, tells Square to stop billing, and
// sets our own `subscriptions.status` to 'canceled' immediately regardless
// of Square's own cancellation timing, since that column (not Square's live
// subscription state) is what actually gates access in the app. No refund
// is issued — see the two lower-priced plans instead of a refund policy.
import { createClient } from "npm:@supabase/supabase-js@2";
import { squareFetch } from "../_shared/square.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sub, error: subError } = await admin
      .from("subscriptions")
      .select("status, square_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError || !sub) {
      return new Response(JSON.stringify({ error: "No subscription found on this account." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sub.square_subscription_id) {
      // A "free" promo grant has no Square subscription — nothing to cancel,
      // and lifetime access is exactly what that code granted.
      return new Response(
        JSON.stringify({ error: "This is a free lifetime grant — there's no billing to cancel." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (sub.status === "canceled") {
      return new Response(JSON.stringify({ ok: true, alreadyCanceled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ok: cancelOk, data: cancelData } = await squareFetch<{ errors?: unknown[] }>(
      `/v2/subscriptions/${sub.square_subscription_id}/cancel`,
      { method: "POST" },
    );
    if (!cancelOk) {
      console.error("square-cancel-subscription: Square rejected the cancel", cancelData);
      return new Response(
        JSON.stringify({ error: "Couldn't reach Square to cancel — try again in a moment." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await admin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
