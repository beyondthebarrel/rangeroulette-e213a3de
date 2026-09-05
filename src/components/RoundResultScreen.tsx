import { useState } from "react";
import { useGame } from "../game/GameContext";
import { ActiveWhoopsiePanel } from "./ActiveWhoopsiePanel";
import { Panel } from "./Panel";
import { PlayingCard } from "./PlayingCard";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
function ordinal(n: number): string {
  return ORDINALS[n - 1] ?? `${n}th`;
}

export function RoundResultScreen() {
  const { state, dispatch } = useGame();
  const result = state.lastRoundResult;
  // The tap-to-reveal countdown only earns its keep with a group — in 1v1 it's
  // obvious who won the instant both times are in, so just show the result.
  const suspenseMode = state.players.length >= 3;
  const [challengeRevealed, setChallengeRevealed] = useState(false);
  const [revealedCount, setRevealedCount] = useState(() => (suspenseMode ? 0 : state.players.length));

  if (!result) return null;

  const ranked = [...state.players]
    .map((p) => ({ p, t: result.finalTimes[p.id] }))
    .sort((a, b) => {
      if (a.t == null) return 1;
      if (b.t == null) return -1;
      return a.t - b.t;
    });

  // Reveal worst-to-best so the winner lands last, same tap-to-reveal beat as
  // the Challenge card below. Not used in 1v1 — displayOrder stays fastest-first.
  const displayOrder = suspenseMode ? [...ranked].reverse() : ranked;
  const allRevealed = revealedCount >= displayOrder.length;

  const winner = state.players.find((p) => p.id === result.winnerId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <Panel>
        <h2 className="text-xl font-bold text-white">Round {state.round} Results</h2>

        <div className="flex flex-col gap-2">
          {displayOrder.map(({ p, t }, i) => {
            const rank = displayOrder.length - i;
            const isRevealed = i < revealedCount;
            const isNext = i === revealedCount;
            const isWinnerRow = isRevealed && p.id === result.winnerId;

            return (
              <button
                key={p.id}
                disabled={!isNext}
                onClick={() => isNext && setRevealedCount((c) => c + 1)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  isWinnerRow
                    ? "border-orange-500 bg-orange-950/30"
                    : isRevealed
                      ? "border-zinc-700 bg-zinc-900/50"
                      : isNext
                        ? "border-dashed border-orange-700 bg-zinc-900/30 hover:bg-zinc-900/60"
                        : "cursor-default border-dashed border-zinc-800 bg-zinc-950/40 opacity-60"
                }`}
              >
                {isRevealed ? (
                  <>
                    <span className="text-white">
                      {suspenseMode && isWinnerRow ? "🏆 " : ""}
                      {p.name}
                    </span>
                    <span className="font-mono text-white">
                      {t != null ? `${t.toFixed(2)}s` : "DNF"}
                    </span>
                  </>
                ) : isNext ? (
                  <span className="w-full text-center text-sm font-semibold uppercase tracking-wide text-orange-400">
                    Tap to reveal {ordinal(rank)} place
                  </span>
                ) : (
                  <span className="w-full text-center text-sm text-zinc-600">???</span>
                )}
              </button>
            );
          })}
        </div>

        {suspenseMode && !allRevealed && displayOrder.length > 1 && (
          <button
            onClick={() => setRevealedCount(displayOrder.length)}
            className="self-center text-xs text-zinc-500 underline hover:text-zinc-300"
          >
            Reveal all
          </button>
        )}

        {allRevealed && result.tie && (
          <div className="rounded-lg border border-amber-500 bg-amber-950/30 p-3 text-amber-300">
            Tie for fastest — no point awarded this round. Next-fastest shooter
            builds the next drill.
          </div>
        )}

        {allRevealed && winner && (
          <div className="rounded-lg border border-orange-600 bg-orange-950/30 p-3">
            <div className="mb-2 text-orange-300">
              {winner.name} wins the round (+1 point) and draws a Challenge card:
            </div>
            {result.awardedChallenge && (
              <div className="flex items-center gap-3">
                <PlayingCard
                  cardId={result.awardedChallenge.def.id}
                  className="w-20"
                  faceDown
                  tappable
                  onRevealChange={setChallengeRevealed}
                  backImage="/card-back-challenge.jpg"
                />
                <span className="font-semibold text-white">
                  {challengeRevealed
                    ? result.awardedChallenge.def.text
                    : `Pass the phone to ${winner.name} — tap the card to reveal it.`}
                </span>
              </div>
            )}
          </div>
        )}

        {allRevealed &&
          result.donations.map((d, i) => (
            <div key={i} className="text-sm text-zinc-400">
              {state.players.find((p) => p.id === d.fromId)?.name} donated 1 point to{" "}
              {state.players.find((p) => p.id === d.toId)?.name}.
            </div>
          ))}
      </Panel>

      {allRevealed && (
        <>
          <Panel>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Standings</div>
            <div className="flex flex-wrap gap-3">
              {[...state.players]
                .sort((a, b) => b.points - a.points)
                .map((p) => (
                  <div key={p.id} className="text-sm text-white">
                    {p.name}: <span className="text-orange-400">{p.points}</span>
                  </div>
                ))}
            </div>
          </Panel>

          <Panel>
            <div className="text-xs font-semibold uppercase tracking-wider text-pink-300">
              Had a mishap? (gear drop, timer glitch, setup error)
            </div>
            <div className="flex flex-wrap gap-2">
              {state.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => dispatch({ type: "CALL_WHOOPSIE", playerId: p.id })}
                  className="rounded bg-pink-700 px-2 py-1 text-xs text-white hover:bg-pink-600"
                >
                  {p.name} calls Whoopsie
                </button>
              ))}
            </div>
          </Panel>

          <ActiveWhoopsiePanel />

          <button
            onClick={() => dispatch({ type: "NEXT_ROUND" })}
            className="rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
          >
            {state.winnerId ? "See Match Winner →" : "Next Round →"}
          </button>
        </>
      )}
    </div>
  );
}
