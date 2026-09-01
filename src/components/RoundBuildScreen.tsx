import { useEffect } from "react";
import {
  CATEGORY_DECKS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CategoryCardDef,
} from "../data/cards";
import { useGame } from "../game/GameContext";
import { ActiveWhoopsiePanel } from "./ActiveWhoopsiePanel";
import { Panel } from "./Panel";
import { PlayingCard } from "./PlayingCard";

function optionLabel(def: CategoryCardDef): string {
  return def.detail ? `${def.label} — ${def.detail}` : def.label;
}

export function RoundBuildScreen() {
  const { state, dispatch } = useGame();
  const drill = state.currentDrill;
  const dealer = state.players[state.dealerIndex];

  useEffect(() => {
    if (!drill) dispatch({ type: "DRAW_ROUND" });
  }, [drill, dispatch]);

  if (!drill) {
    return <div className="p-6 text-white">Drawing cards…</div>;
  }

  const needsDealersChoice = CATEGORY_ORDER.filter(
    (cat) => drill.cards[cat]?.def.dealersChoice,
  );
  const missingDealersChoice = needsDealersChoice.filter(
    (cat) => (drill.dealersChoiceValues[cat] ?? "").trim().length === 0,
  );
  const readyToScore = missingDealersChoice.length === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Panel>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Round {state.round}</h2>
          <div className="text-sm text-zinc-400">
            Dealer: <span className="text-white">{dealer?.name}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {CATEGORY_ORDER.map((cat) => {
            const card = drill.cards[cat];
            if (!card) return null;
            return (
              <PlayingCard
                key={card.instanceId}
                cardId={card.def.id}
                overlay={
                  card.def.dealersChoice ? (
                    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-black/80 p-1.5">
                      {!(drill.dealersChoiceValues[cat] ?? "").trim() && (
                        <div className="text-center text-[10px] font-semibold uppercase tracking-wide text-red-400">
                          Dealer must set a value
                        </div>
                      )}
                      <select
                        value={drill.dealersChoiceValues[cat] ?? ""}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_DEALERS_CHOICE",
                            category: cat,
                            value: e.target.value,
                          })
                        }
                        className={`w-full rounded border bg-zinc-900 px-1 py-1 text-center text-[11px] text-white focus:outline-none ${
                          (drill.dealersChoiceValues[cat] ?? "").trim()
                            ? "border-red-700"
                            : "animate-pulse border-red-500 ring-2 ring-red-500"
                        }`}
                      >
                        <option value="" disabled>
                          choose one
                        </option>
                        {CATEGORY_DECKS[cat].map((def) => (
                          <option key={def.id} value={optionLabel(def)}>
                            {optionLabel(def)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </Panel>

      <ActiveWhoopsiePanel />

      {state.activeChallenges.length > 0 && (
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Active Challenge Cards
          </div>
          <ul className="flex flex-col gap-1">
            {state.activeChallenges.map((c) => {
              const target = state.players.find((p) => p.id === c.targetPlayerId);
              return (
                <li key={c.instance.instanceId} className="text-sm text-zinc-200">
                  <span className="text-white">{target?.name}</span>: {c.instance.def.text}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {!readyToScore && (
        <div className="text-center text-sm text-red-400">
          Waiting on Dealer&apos;s Choice value
          {missingDealersChoice.length > 1 ? "s" : ""} for:{" "}
          {missingDealersChoice.map((cat) => CATEGORY_LABELS[cat]).join(", ")}
        </div>
      )}
      <button
        disabled={!readyToScore}
        onClick={() => dispatch({ type: "START_SCORING" })}
        className="rounded-md bg-red-700 px-4 py-3 font-semibold uppercase tracking-wide text-white enabled:hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        Run the Drill →
      </button>
    </div>
  );
}
