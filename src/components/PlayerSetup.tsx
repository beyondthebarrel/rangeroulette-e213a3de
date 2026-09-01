import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useGame } from "../game/GameContext";
import { getHiddenShooterNames, hideShooterName, hideShooterNames } from "../leaderboard/hiddenShooters";
import { getKnownShooterNames } from "../leaderboard/storage";
import { getMyDisplayName } from "../profile";
import { HeroBackdrop } from "./HeroBackdrop";
import { TitleFrame } from "./TitleFrame";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function PlayerSetup({
  onBackToModes,
}: {
  onBackToModes: () => void;
}) {
  const { user } = useAuth();
  const { dispatch } = useGame();
  const [names, setNames] = useState<string[]>(["", ""]);
  const [primaryName, setPrimaryName] = useState<string | null>(null);
  const [knownShooters, setKnownShooters] = useState<string[]>([]);
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(() => getHiddenShooterNames());
  const [confirmingClearPrior, setConfirmingClearPrior] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getKnownShooterNames().then((loaded) => {
      if (!cancelled) setKnownShooters(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Shooter 1 defaults to the signed-in account holder — still just a text
  // field underneath, so it can be overwritten if someone else is actually
  // playing that slot, but the app always starts with "you" pre-filled.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyDisplayName(user.id, user.email).then((name) => {
      if (cancelled) return;
      setPrimaryName(name);
      setNames((prev) => (prev[0].trim().length === 0 ? [name, ...prev.slice(1)] : prev));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visibleKnownShooters = knownShooters.filter(
    (name) =>
      !hiddenNames.has(normalizeName(name)) &&
      (!primaryName || normalizeName(name) !== normalizeName(primaryName)),
  );

  function dismissKnownShooter(name: string) {
    hideShooterName(name);
    setHiddenNames(getHiddenShooterNames());
  }

  function clearPriorShooters() {
    hideShooterNames(visibleKnownShooters);
    setHiddenNames(getHiddenShooterNames());
    setConfirmingClearPrior(false);
  }

  function updateName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  }

  function addPlayer() {
    setNames((prev) => [...prev, ""]);
  }

  function removePlayer(i: number) {
    setNames((prev) => prev.filter((_, idx) => idx !== i));
  }

  const usedNormalized = new Set(
    names.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );

  function addKnownShooter(name: string) {
    if (usedNormalized.has(name.trim().toLowerCase())) return;
    setNames((prev) => {
      const emptyIndex = prev.findIndex((n) => n.trim().length === 0);
      if (emptyIndex >= 0) {
        return prev.map((n, idx) => (idx === emptyIndex ? name : n));
      }
      return [...prev, name];
    });
  }

  const validNames = names.map((n) => n.trim()).filter(Boolean);
  const canStart = validNames.length >= 2;

  return (
    <HeroBackdrop>
      <TitleFrame>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
          Game Mode
        </h1>

        {visibleKnownShooters.length > 0 && (
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Prior Shooters
              </div>
              {confirmingClearPrior ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-400">Clear all?</span>
                  <button
                    onClick={clearPriorShooters}
                    className="rounded bg-orange-700 px-2 py-1 text-white hover:bg-orange-600"
                  >
                    Yes, Clear
                  </button>
                  <button
                    onClick={() => setConfirmingClearPrior(false)}
                    className="rounded bg-zinc-700 px-2 py-1 text-white hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmingClearPrior(true)}
                  className="text-xs uppercase tracking-wide text-zinc-500 hover:text-orange-400"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {visibleKnownShooters.map((name) => {
                const added = usedNormalized.has(name.trim().toLowerCase());
                return (
                  <span
                    key={name}
                    className={`flex items-center gap-1 rounded-full border pl-3 pr-1.5 py-1 text-xs ${
                      added
                        ? "border-orange-700 bg-orange-950/40 text-orange-400"
                        : "border-zinc-700 text-zinc-300"
                    }`}
                  >
                    <button
                      onClick={() => addKnownShooter(name)}
                      disabled={added}
                      className="cursor-pointer disabled:cursor-default"
                    >
                      {name}
                    </button>
                    <button
                      onClick={() => dismissKnownShooter(name)}
                      aria-label={`Remove ${name} from suggestions`}
                      title="Remove from suggestions"
                      className="text-zinc-500 hover:text-orange-400"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
            <p className="text-[11px] leading-snug text-zinc-500">
              Removing a name only hides it from this list on this device — the shared leaderboard
              is unaffected.
            </p>
          </div>
        )}

        <div className="flex w-full flex-col gap-1.5 sm:gap-2">
          {names.map((n, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  value={n}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={`Shooter ${i + 1}`}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-white focus:border-orange-600 focus:outline-none sm:py-2"
                />
                {i === 0 && primaryName != null && n.trim() === primaryName.trim() && (
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-orange-700 bg-orange-950/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-orange-400">
                    You
                  </span>
                )}
              </div>
              {names.length > 2 && (
                <button
                  onClick={() => removePlayer(i)}
                  className="rounded bg-zinc-800 px-3 text-white hover:bg-zinc-700"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addPlayer}
          className="w-full rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 sm:py-2"
        >
          + Add Shooter
        </button>

        <button
          disabled={!canStart}
          onClick={() => dispatch({ type: "START_MATCH", names: validNames })}
          className="w-full rounded-md bg-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 sm:py-3"
        >
          Start with Bill Drill
        </button>

        <p className="text-center text-[11px] leading-snug text-zinc-500 sm:text-xs">
          Everyone shoots a Bill Drill first (6 rounds, 7 yards, A-zone) —
          fastest goes first. First to 5 points wins.
        </p>

        <button
          onClick={onBackToModes}
          className="w-full rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 sm:py-2"
        >
          ← Modes
        </button>
      </TitleFrame>
    </HeroBackdrop>
  );
}
