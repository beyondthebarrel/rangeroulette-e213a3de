import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { HeroBackdrop } from "./HeroBackdrop";
import { TitleFrame } from "./TitleFrame";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const result =
      mode === "signIn" ? await signIn(email, password) : await signUp(email, password, nickname);
    setSubmitting(false);
    if (result) {
      setError(result);
      return;
    }
    if (mode === "signUp") {
      setInfo("Account created. Check your email to confirm, then sign in.");
      setMode("signIn");
    }
  }

  return (
    <HeroBackdrop>
      <TitleFrame>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500 sm:text-3xl">
          Range Roulette
        </h1>
        <p className="text-center text-xs text-zinc-400 sm:text-sm">
          {mode === "signIn" ? "Sign in to continue" : "Create an account"}
        </p>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
          {mode === "signUp" && (
            <input
              type="text"
              autoComplete="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname (optional)"
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-orange-600 focus:outline-none"
            />
          )}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-orange-600 focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-orange-600 focus:outline-none"
          />

          {error && <p className="text-sm text-orange-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {submitting ? "Please wait…" : mode === "signIn" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signIn" ? "signUp" : "signIn");
            setError(null);
            setInfo(null);
          }}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          {mode === "signIn"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </TitleFrame>
    </HeroBackdrop>
  );
}
