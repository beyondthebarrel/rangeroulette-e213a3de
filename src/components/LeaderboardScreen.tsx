import { useEffect, useState } from "react";
import {
  getLeaderboardStats,
  MIN_MATCHES_FOR_WIN_PCT,
  type LeaderboardBoards,
} from "../leaderboard/storage";
import { HeroBackdrop } from "./HeroBackdrop";
import { TitleFrame } from "./TitleFrame";

const EMPTY_BOARDS: LeaderboardBoards = { mostWins: [], bestWinPct: [], notYetQualified: [] };

export function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const [boards, setBoards] = useState<LeaderboardBoards | null>(null);
  const { mostWins, bestWinPct, notYetQualified } = boards ?? EMPTY_BOARDS;

  useEffect(() => {
    let cancelled = false;
    getLeaderboardStats().then((stats) => {
      if (!cancelled) setBoards(stats);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <HeroBackdrop>
      <TitleFrame>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500 sm:text-3xl">
          Leaderboard
        </h1>

        {boards === null ? (
          <p className="text-center text-sm text-zinc-400">Loading…</p>
        ) : mostWins.length === 0 ? (
          <p className="text-center text-sm text-zinc-400">
            No matches recorded yet. Play a match to start the leaderboard.
          </p>
        ) : (
          <div className="flex w-full flex-col gap-4">
            <section className="flex w-full flex-col gap-1.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Most Wins
              </h2>
              <ol className="flex flex-col gap-1.5">
                {mostWins.map((p, i) => (
                  <li
                    key={p.name}
                    className="flex items-center justify-between rounded-lg border border-orange-900/50 bg-zinc-900/60 px-3 py-2"
                  >
                    <span className="text-white">
                      <span className="mr-2 text-zinc-500">{i + 1}.</span>
                      {p.name}
                    </span>
                    <span className="text-orange-400">
                      {p.wins}-{p.losses}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="flex w-full flex-col gap-1.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Best Win %
              </h2>
              {bestWinPct.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No one has {MIN_MATCHES_FOR_WIN_PCT}+ matches yet.
                </p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {bestWinPct.map((p, i) => (
                    <li
                      key={p.name}
                      className="flex items-center justify-between rounded-lg border border-orange-900/50 bg-zinc-900/60 px-3 py-2"
                    >
                      <span className="text-white">
                        <span className="mr-2 text-zinc-500">{i + 1}.</span>
                        {p.name}
                      </span>
                      <span className="text-orange-400">
                        {Math.round(p.winPct * 100)}%
                        <span className="ml-1.5 text-xs text-zinc-500">
                          ({p.wins}-{p.losses})
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {notYetQualified.length > 0 && (
                <p className="text-[11px] leading-snug text-zinc-500">
                  Needs {MIN_MATCHES_FOR_WIN_PCT}+ matches to qualify:{" "}
                  {notYetQualified.map((p) => p.name).join(", ")}
                </p>
              )}
            </section>
          </div>
        )}

        <button
          onClick={onBack}
          className="w-full rounded-md bg-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
        >
          Back
        </button>
      </TitleFrame>
    </HeroBackdrop>
  );
}
