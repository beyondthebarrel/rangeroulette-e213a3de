import type { SubscriptionDetails } from "../subscription";
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

export function MembershipPanel({ details }: { details: SubscriptionDetails }) {
  const { status, currentPeriodEnd, hasSquareSubscription } = details;

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
    </Panel>
  );
}
