import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { AuthScreen } from "../components/AuthScreen";
import { HeroBackdrop } from "../components/HeroBackdrop";
import { TitleFrame } from "../components/TitleFrame";
import { supabase } from "../integrations/supabase/client";

interface AuthorizationDetails {
  client?: { name?: string };
  redirect_url?: string;
  redirect_to?: string;
}

type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

/** `auth.oauth` is beta and missing from the published types. */
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export function OAuthConsent() {
  const { session, loading } = useAuth();
  const authorizationId = new URLSearchParams(window.location.search).get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (loading || !session) return;
    if (!authorizationId) {
      setError("Missing authorization_id");
      return;
    }
    (async () => {
      const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, loading, session]);

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  const clientName = details?.client?.name ?? "an app";

  return (
    <HeroBackdrop>
      <TitleFrame>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-red-500">
          Connect App
        </h1>
        {error ? (
          <p className="text-center text-sm text-amber-400">{error}</p>
        ) : !details ? (
          <p className="text-sm text-zinc-400">Loading authorization request…</p>
        ) : (
          <>
            <p className="text-center text-sm text-zinc-300">
              Allow <span className="font-semibold text-white">{clientName}</span> to use Range
              Roulette as you — drawing drills, saving drills, and logging results on your account.
            </p>
            <div className="flex w-full gap-2">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 rounded-md bg-red-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white enabled:hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                Approve
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 rounded-md border border-zinc-700 px-4 py-2.5 text-sm uppercase tracking-wide text-zinc-300 enabled:hover:bg-zinc-900 disabled:text-zinc-600"
              >
                Deny
              </button>
            </div>
          </>
        )}
      </TitleFrame>
    </HeroBackdrop>
  );
}
