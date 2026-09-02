// Square calls this directly (not through the app) whenever a subscription
// changes — checkout completed, renewed, canceled, payment failed. Verifies
// the request really came from Square, then updates our `subscriptions` row
// so the app's paywall gate reflects reality without the client polling Square.
import { createClient } from "npm:@supabase/supabase-js@2";
import { squareFetch } from "../_shared/square.ts";

async function isValidSignature(req: Request, rawBody: string): Promise<boolean> {
  const signatureKey = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
  const notificationUrl = Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL");
  const provided = req.headers.get("x-square-hmacsha256-signature");
  if (!signatureKey || !notificationUrl || !provided) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signatureKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(notificationUrl + rawBody),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // Lengths differ trivially often enough (base64 signatures are fixed-length
  // here) that a length check first doesn't leak timing info worth worrying
  // about; the byte-by-byte compare below is what needs to stay constant-time.
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

// Square's subscription `status` (PENDING/ACTIVE/CANCELED/DEACTIVATED/PAUSED)
// maps onto our simpler gate: ACTIVE covers both the free trial and the paid
// phase (Square doesn't distinguish them in this field), so it's the one
// status that should unlock the app.
function mapStatus(squareStatus: string | undefined): string {
  switch (squareStatus) {
    case "ACTIVE":
      return "active";
    case "PAUSED":
      return "past_due";
    case "CANCELED":
    case "DEACTIVATED":
      return "canceled";
    default:
      return "pending";
  }
}

Deno.serve(async (req) => {
  const rawBody = await req.text();

  if (!(await isValidSignature(req, rawBody))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { type?: string; data?: { object?: { subscription?: Record<string, unknown> } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const subscription = event.data?.object?.subscription;
  if (
    (event.type !== "subscription.created" && event.type !== "subscription.updated") ||
    !subscription
  ) {
    // Not a subscription lifecycle event we act on — acknowledge so Square
    // doesn't retry, but there's nothing to update.
    return new Response("ok", { status: 200 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const customerId = subscription.customer_id as string | undefined;
  const subscriptionId = subscription.id as string | undefined;
  const status = mapStatus(subscription.status as string | undefined);
  const periodEnd =
    (subscription.charged_through_date as string | undefined) ??
    (subscription.canceled_date as string | undefined) ??
    null;

  if (!customerId) return new Response("ok", { status: 200 });

  // Primary match: the customer's reference_id, set to our user_id when we
  // created it in square-create-checkout.
  const { data: customerData } = await squareFetch<{
    customer?: { reference_id?: string; email_address?: string };
  }>(`/v2/customers/${customerId}`);
  const referenceId = customerData.customer?.reference_id;
  const customerEmail = customerData.customer?.email_address;

  let match = referenceId
    ? await admin.from("subscriptions").select("user_id").eq("user_id", referenceId).maybeSingle()
    : { data: null };

  // Fallback if reference_id is missing or stale: match by the email on file.
  if (!match.data && customerEmail) {
    match = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("email", customerEmail)
      .maybeSingle();
  }

  if (!match.data) {
    console.error("Square webhook: no local account matched", { customerId, referenceId, customerEmail });
    return new Response("ok", { status: 200 });
  }

  await admin
    .from("subscriptions")
    .update({
      square_customer_id: customerId,
      square_subscription_id: subscriptionId,
      status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", match.data.user_id);

  return new Response("ok", { status: 200 });
});
