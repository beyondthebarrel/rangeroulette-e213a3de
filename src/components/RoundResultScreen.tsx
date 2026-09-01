import { useState } from "react";
import { useGame } from "../game/GameContext";
import { ActiveWhoopsiePanel } from "./ActiveWhoopsiePanel";
import { Panel } from "./Panel";
import { PlayingCard } from "./PlayingCard";

export function RoundResultScreen() {
  const { state, dispatch } = useGame();
  const result = state.lastRoundResult;
  const [challengeRevealed, setChallengeRevealed] = useState(false);

  if (!result) return null;

  const ranked = [...state.players]
    .map((p) => ({ p, t: result.finalTimes[p.id] }))
    .sort((a, b) => {
      if (a.t == null) return 1;
      if (b.t == null) return -1;
      return a.t - b.t;
    });

  const winner = state.players.find((p) => p.id === result.winnerId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <Panel>
        <h2 className="text-xl font-bold text-white">Round {state.round} Results</h2>

        <div className="flex flex-col gap-2">
          {ranked.map(({ p, t }) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                p.id === result.winnerId
                  ? "border-orange-500 bg-orange-950/30"
                  : "border-zinc-700 bg-zinc-900/50"
              }`}
            >
              <span className="text-white">{p.name}</span>
              <span className="font-mono text-white">
                {t != null ? `${t.toFixed(2)}s` : "DNF"}
              </span>
            </div>
          ))}
        </div>

        {result.tie && (
          <div className="rounded-lg border border-amber-500 bg-amber-950/30 p-3 text-amber-300">
            Tie for fastest — no point awarded this round. Next-fastest shooter
            builds the next drill.
          </div>
        )}

        {winner && (
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

        {result.donations.map((d, i) => (
          <div key={i} className="text-sm text-zinc-400">
            {state.players.find((p) => p.id === d.fromId)?.name} donated 1 point to{" "}
            {state.players.find((p) => p.id === d.toId)?.name}.
          </div>
        ))}
      </Panel>

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
    </div>
  );
}
