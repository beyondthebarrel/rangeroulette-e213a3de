import { useState } from "react";
import { useGame } from "../game/GameContext";
import { Panel } from "./Panel";
import { PlayingCard } from "./PlayingCard";

export function PlayChallengesScreen() {
  const { state, dispatch } = useGame();
  const [playFor, setPlayFor] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const playersWithCards = state.players.filter((p) => p.hand.length > 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Panel>
        <h2 className="text-xl font-bold text-white">Play Challenge Cards</h2>
        <p className="text-sm text-zinc-400">
          Anyone holding a Challenge card may play it now — before the next
          drill is drawn.
        </p>
      </Panel>

      {state.activeChallenges.length > 0 && (
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
            Active Challenge Cards
          </div>
          <ul className="flex flex-col gap-2">
            {state.activeChallenges.map((c, i) => {
              const target = state.players.find((p) => p.id === c.targetPlayerId);
              const targetHasReverse = target?.hand.some(
                (h) => h.def.autoEffect === "reverseChallenge",
              );
              return (
                <li key={c.instance.instanceId} className="text-sm text-zinc-200">
                  <span className="text-white">{target?.name}</span>: {c.instance.def.text}
                  {targetHasReverse && (
                    <button
                      onClick={() =>
                        dispatch({ type: "REVERSE_CHALLENGE", activeIndex: i })
                      }
                      className="ml-2 rounded bg-orange-700 px-2 py-0.5 text-xs text-white hover:bg-orange-600"
                    >
                      Reverse onto {state.players.find((p) => p.id === c.playedBy)?.name}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <Panel>
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Held Cards</div>
        <div className="flex flex-col gap-3">
          {playersWithCards.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              <span className="text-sm text-white">{p.name}</span>
              <div className="flex flex-wrap gap-2">
                {p.hand.map((c) => {
                  const isRevealed = revealedIds.has(c.instanceId);
                  return (
                    <div key={c.instanceId} className="flex w-16 shrink-0 flex-col gap-1">
                      <PlayingCard
                        cardId={c.def.id}
                        className={`rounded-lg transition ${
                          playFor === c.instanceId
                            ? "ring-2 ring-orange-500"
                            : isRevealed
                              ? "hover:ring-2 hover:ring-orange-800"
                              : ""
                        }`}
                        faceDown
                        tappable
                        onRevealChange={(isRevealed) => {
                          setRevealedIds((prev) => {
                            const next = new Set(prev);
                            if (isRevealed) next.add(c.instanceId);
                            else next.delete(c.instanceId);
                            return next;
                          });
                          if (!isRevealed) {
                            setPlayFor((prev) => (prev === c.instanceId ? null : prev));
                          }
                        }}
                      />
                      {isRevealed && (
                        <button
                          onClick={() =>
                            setPlayFor(playFor === c.instanceId ? null : c.instanceId)
                          }
                          title={c.def.text}
                          className="rounded bg-orange-800 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-orange-700"
                        >
                          Play
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {p.hand.map(
                (c) =>
                  playFor === c.instanceId && (
                    <div
                      key={`${c.instanceId}-target`}
                      className="flex flex-wrap items-center gap-2 rounded bg-zinc-900 p-2 text-xs"
                    >
                      <span className="text-zinc-400">{c.def.text} — play on:</span>
                      {state.players.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            dispatch({
                              type: "PLAY_CHALLENGE",
                              playerId: p.id,
                              instanceId: c.instanceId,
                              targetPlayerId: t.id,
                            });
                            setPlayFor(null);
                          }}
                          className="rounded bg-orange-700 px-2 py-0.5 text-white hover:bg-orange-600"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  ),
              )}
            </div>
          ))}
        </div>
      </Panel>

      <button
        onClick={() => dispatch({ type: "CONTINUE_TO_DRILL" })}
        className="rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
      >
        Continue to Drill →
      </button>
    </div>
  );
}
