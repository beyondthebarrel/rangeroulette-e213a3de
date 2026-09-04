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

/** Resolves invoice -> order -> tender -> payment_id/amount, per Square's docs for refunding a paid invoice. */
async function resolvePaymentFromInvoice(
  invoiceId: string,
): Promise<{ paymentId: string; amountMoney: { amount: number; currency: string } } | null> {
  const { data: invoiceData } = await squareFetch<{ invoice?: { order_id?: string } }>(
    `/v2/invoices/${invoiceId}`,
  );
  const orderId = invoiceData.invoice?.order_id;
  if (!orderId) {
    console.error("resolvePaymentFromInvoice: invoice has no order_id", { invoiceId });
    return null;
  }

  const { data: orderData } = await squareFetch<{
    order?: { tenders?: { id: string; payment_id?: string; amount_money?: { amount: number; currency: string } }[] };
  }>(`/v2/orders/${orderId}`);
  const tender = orderData.order?.tenders?.[0];
  const paymentId = tender?.payment_id ?? tender?.id;
  if (!paymentId || !tender?.amount_money) {
    console.error("resolvePaymentFromInvoice: no tender/payment found on order", { orderId });
    return null;
  }
  return { paymentId, amountMoney: tender.amount_money };
}

/**
 * A 'free_year' promo redemption checks out through the normal $39.99 plan
 * (no separate $0 phase — that's the exact checkout-page display bug worked
 * around earlier) and gets auto-refunded here the first time its invoice is
 * paid. Renewals after that are left alone, converting them to a normal
 * paying subscriber.
 */
async function refundFirstPaymentIfFreeYear(
  admin: ReturnType<typeof createClient>,
  userId: string,
  payment: { paymentId: string; amountMoney: { amount: number; currency: string } } | null,
): Promise<void> {
  if (!payment) return;

  const { data: redemption } = await admin
    .from("promo_redemptions")
    .select("id, code, refunded_at, promo_codes!inner(discount_type)")
    .eq("user_id", userId)
    .is("refunded_at", null)
    .eq("promo_codes.discount_type", "free_year")
    .maybeSingle();
  if (!redemption) return;

  const { ok, data: refundData } = await squareFetch<{ errors?: unknown[] }>("/v2/refunds", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      payment_id: payment.paymentId,
      amount_money: payment.amountMoney,
      reason: `Free year promo code (${redemption.code})`,
    }),
  });
  if (!ok) {
    console.error("free_year refund: Square rejected the refund", { paymentId: payment.paymentId, details: refundData });
    return;
  }

  await admin.from("promo_redemptions").update({ refunded_at: new Date().toISOString() }).eq("id", redemption.id);
}

Deno.serve(async (req) => {
  const rawBody = await req.text();

  if (!(await isValidSignature(req, rawBody))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: {
    type?: string;
    data?: {
      object?: {
        subscription?: Record<string, unknown>;
        invoice?: { id?: string; subscription_id?: string };
      };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (event.type === "invoice.payment_made") {
    const invoice = event.data?.object?.invoice;
    const subscriptionId = invoice?.subscription_id;
    if (subscriptionId) {
      const { data: match } = await admin
        .from("subscriptions")
        .select("user_id")
        .eq("square_subscription_id", subscriptionId)
        .maybeSingle();
      if (match) {
        const payment = invoice?.id ? await resolvePaymentFromInvoice(invoice.id) : null;
        // Recorded for every payment (not just free_year) so a later
        // self-service cancel-and-refund request has a payment_id ready
        // to hand straight to Square, without re-deriving it then.
        if (payment) {
          await admin
            .from("subscriptions")
            .update({
              last_payment_id: payment.paymentId,
              last_payment_amount_cents: payment.amountMoney.amount,
            })
            .eq("user_id", match.user_id);
        }
        await refundFirstPaymentIfFreeYear(admin, match.user_id, payment);
      }
    }
    return new Response("ok", { status: 200 });
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

  // There's no $0 trial phase in Square anymore (see square-setup-catalog) —
  // the "7-day free trial" is now a refund-on-request policy the business
  // honors manually, so trial_ends_at exists purely as the refund-eligibility
  // deadline to check against, set once when the subscription first goes active.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("trial_ends_at")
    .eq("user_id", match.data.user_id)
    .maybeSingle();
  const trialEndsAt =
    existing?.trial_ends_at ??
    (status === "active" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null);

  await admin
    .from("subscriptions")
    .update({
      square_customer_id: customerId,
      square_subscription_id: subscriptionId,
      status,
      current_period_end: periodEnd,
      trial_ends_at: trialEndsAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", match.data.user_id);

  return new Response("ok", { status: 200 });
});
