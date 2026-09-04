import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getMySubscriptionStatus, startCheckout, type PlanType } from "../subscription";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 30000;

const PLANS: { id: PlanType; price: string; cadence: string; blurb: string }[] = [
  { id: "annual", price: "$39.99", cadence: "/ year", blurb: "Billed once a year." },
  { id: "six_month", price: "$19.99", cadence: "/ 6 months", blurb: "Same rate, smaller charge, shorter commitment." },
];

export function SubscribeScreen({ onSubscribed }: { onSubscribed: () => void }) {
  const { user, signOut } = useAuth();
  const [plan, setPlan] = useState<PlanType>("annual");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmTimedOut, setConfirmTimedOut] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  useEffect(() => stopPolling, []);

  function pollForActivation() {
    if (!user) return;
    setConfirming(true);
    setConfirmTimedOut(false);
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      const status = await getMySubscriptionStatus(user.id);
      if (status === "active") {
        stopPolling();
        onSubscribed();
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling();
        setConfirming(false);
        setConfirmTimedOut(true);
      }
    }, POLL_INTERVAL_MS);
  }

  // Square redirects back here with ?sub=success right after checkout —
  // the webhook that actually flips our status to "active" can lag a few
  // seconds behind that redirect, so poll briefly instead of assuming it's
  // already reflected.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sub") === "success") {
      window.history.replaceState(null, "", window.location.pathname);
      pollForActivation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    // A promo code only ever discounts the annual plan.
    const result = await startCheckout(plan, plan === "annual" ? promoCode : undefined);
    setStarting(false);
    if (result.granted) {
      // A "free" code grants access directly — no Square checkout to redirect to.
      pollForActivation();
      return;
    }
    if (!result.url) {
      setError(result.error ?? "Couldn't start checkout — check your connection and try again.");
      return;
    }
    window.location.href = result.url;
  }

  const selected = PLANS.find((p) => p.id === plan)!;

  return (
    <HeroBackdrop>
      <TitleFrame>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
          Subscribe to Range Roulette
        </h1>

        {confirming ? (
          <p className="text-center text-sm text-zinc-400">
            Confirming your subscription — this usually takes a few seconds…
          </p>
        ) : (
          <>
            <div className="grid w-full grid-cols-2 gap-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`rounded-lg border-2 px-3 py-3 text-center ${
                    plan === p.id
                      ? "border-orange-600 bg-orange-950/40"
                      : "border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900"
                  }`}
                >
                  <div className="font-mono text-xl font-bold text-white">{p.price}</div>
                  <div className="text-xs text-zinc-500">{p.cadence}</div>
                </button>
              ))}
            </div>

            <Panel>
              <p className="text-center text-sm text-zinc-400">{selected.blurb}</p>
            </Panel>

            {confirmTimedOut && (
              <p className="text-center text-sm text-amber-400">
                Still confirming your payment with Square — this can take a minute on a slow
                connection. Try refreshing in a bit.
              </p>
            )}

            {error != null && <p className="text-center text-sm text-amber-400">{error}</p>}

            {plan === "annual" &&
              (showCode ? (
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  autoFocus
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-sm uppercase tracking-widest text-white focus:border-orange-600 focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => setShowCode(true)}
                  className="text-center text-xs uppercase tracking-wide text-zinc-500 hover:text-orange-400"
                >
                  Have a code?
                </button>
              ))}

            <button
              disabled={starting}
              onClick={handleStart}
              className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {starting
                ? "Starting…"
                : plan === "annual" && promoCode.trim()
                  ? "Apply Code & Continue"
                  : `Subscribe — ${selected.price}${selected.cadence}`}
            </button>

            <button
              onClick={() => signOut()}
              className="w-full rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Sign out
            </button>
          </>
        )}
      </TitleFrame>
    </HeroBackdrop>
  );
}
