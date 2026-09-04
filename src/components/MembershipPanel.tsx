import { useState } from "react";
import { cancelMySubscription, type SubscriptionDetails } from "../subscription";
import { Panel } from "./Panel";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  past_due: "Payment Issue",
  canceled: "Canceled",
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function MembershipPanel({
  details,
  onCanceled,
}: {
  details: SubscriptionDetails;
  /** Called after a successful cancel so the parent can drop the app's subscribed gate. */
  onCanceled?: () => void;
}) {
  const { status, currentPeriodEnd, hasSquareSubscription, trialEndsAt } = details;

  const [confirming, setConfirming] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [result, setResult] = useState<{ refunded: boolean } | null>(null);

  const withinRefundWindow = !!trialEndsAt && new Date(trialEndsAt) > new Date();
  const canCancel = hasSquareSubscription && status !== "canceled" && !result;

  async function handleCancel() {
    setCanceling(true);
    setCancelError(null);
    const res = await cancelMySubscription();
    setCanceling(false);
    setConfirming(false);
    if (!res.ok) {
      setCancelError(res.error ?? "Couldn't cancel — check your connection and try again.");
      return;
    }
    setResult({ refunded: !!res.refunded });
    onCanceled?.();
  }

  return (
    <Panel>
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Membership</div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-white">Range Roulette Annual</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
            status === "active"
              ? "border-emerald-700 bg-emerald-950/40 text-emerald-400"
              : status === "past_due"
                ? "border-amber-700 bg-amber-950/40 text-amber-400"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
          }`}
        >
          {(status && STATUS_LABELS[status]) ?? "Unknown"}
        </span>
      </div>

      {!hasSquareSubscription ? (
        <p className="text-xs text-zinc-500">Lifetime access — no billing, ever.</p>
      ) : status === "past_due" ? (
        <p className="text-xs text-amber-400">
          There's a problem with your last payment — check your card on file with Square.
        </p>
      ) : status === "pending" ? (
        <p className="text-xs text-zinc-500">Setting up your subscription…</p>
      ) : status === "canceled" ? (
        <p className="text-xs text-zinc-500">This subscription has been canceled.</p>
      ) : currentPeriodEnd ? (
        <p className="text-xs text-zinc-500">
          Renews in {daysUntil(currentPeriodEnd)} day{daysUntil(currentPeriodEnd) === 1 ? "" : "s"} — on{" "}
          {formatDate(currentPeriodEnd)}.
        </p>
      ) : (
        <p className="text-xs text-zinc-500">Renewal date pending confirmation from Square.</p>
      )}

      {result && (
        <p className="text-xs font-semibold text-emerald-400">
          ✓ Canceled{result.refunded ? " and refunded in full." : "."}
        </p>
      )}

      {canCancel && (
        <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-3">
          {confirming ? (
            <>
              <p className="text-xs leading-snug text-zinc-400">
                {withinRefundWindow
                  ? "You're within your 7-day window — this cancels billing and refunds your last payment in full."
                  : "Your 7-day refund window has passed, so this stops future billing but doesn't refund past payments."}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="rounded bg-orange-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:opacity-60"
                >
                  {canceling ? "…" : withinRefundWindow ? "Yes, Cancel & Refund" : "Yes, Cancel"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={canceling}
                  className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-zinc-600"
                >
                  Never Mind
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-left text-xs uppercase tracking-wide text-zinc-500 hover:text-orange-400"
            >
              Cancel Subscription
            </button>
          )}
          {cancelError != null && <p className="text-xs text-amber-400">{cancelError}</p>}
        </div>
      )}
    </Panel>
  );
}
