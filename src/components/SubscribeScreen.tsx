import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { createCheckoutUrl, getMySubscriptionStatus } from "../subscription";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 30000;

export function SubscribeScreen({ onSubscribed }: { onSubscribed: () => void }) {
  const { user, signOut } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmTimedOut, setConfirmTimedOut] = useState(false);
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
    const url = await createCheckoutUrl();
    setStarting(false);
    if (!url) {
      setError("Couldn't start checkout — check your connection and try again.");
      return;
    }
    window.location.href = url;
  }

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
            <Panel>
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-mono text-3xl font-bold text-white">$39.99</span>
                <span className="text-sm text-zinc-500">/ year</span>
              </div>
              <p className="text-center text-sm text-zinc-400">
                Billed annually. Not sure yet? Cancel within 7 days for a full refund — just reach
                out and we'll take care of it.
              </p>
            </Panel>

            {confirmTimedOut && (
              <p className="text-center text-sm text-amber-400">
                Still confirming your payment with Square — this can take a minute on a slow
                connection. Try refreshing in a bit.
              </p>
            )}

            {error != null && <p className="text-center text-sm text-amber-400">{error}</p>}

            <button
              disabled={starting}
              onClick={handleStart}
              className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {starting ? "Starting…" : "Subscribe — $39.99/year"}
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
