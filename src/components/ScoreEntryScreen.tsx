import { CATEGORY_ORDER } from "../data/cards";
import { useGame } from "../game/GameContext";
import type { ScoreEntry } from "../game/types";
import { ActiveWhoopsiePanel } from "./ActiveWhoopsiePanel";
import { Panel } from "./Panel";
import { PlayingCard } from "./PlayingCard";
import { Stepper } from "./Stepper";

function PlayerScoreCard({
  playerId,
  name,
  entry,
  onChange,
}: {
  playerId: string;
  name: string;
  entry: ScoreEntry;
  onChange: (entry: ScoreEntry) => void;
}) {
  return (
    <div className="rounded-lg border border-orange-900/50 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={entry.dnf}
            onChange={(e) => onChange({ ...entry, dnf: e.target.checked })}
          />
          DNF
        </label>
      </div>

      {!entry.dnf && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={entry.rawSeconds ?? ""}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                onChange({ ...entry, rawSeconds: Number.isNaN(n) ? null : n });
              }}
              placeholder="0.00"
              className="w-28 rounded-md border-2 border-orange-700 bg-zinc-900 px-2 py-1.5 text-xl font-bold text-orange-400 focus:border-orange-500 focus:outline-none"
            />
            <span className="text-sm text-zinc-500">seconds</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stepper
              label="Zone misses (+0.5s)"
              value={entry.zoneMisses}
              onChange={(v) => onChange({ ...entry, zoneMisses: v })}
              color="amber"
            />
            <Stepper
              label="Complete misses (+1.0s)"
              value={entry.completeMisses}
              onChange={(v) => onChange({ ...entry, completeMisses: v })}
              color="red"
            />
          </div>
        </>
      )}
      <div className="hidden">{playerId}</div>
    </div>
  );
}

export function ScoreEntryScreen({
  title,
  parSeconds,
  onSubmit,
  submitLabel,
}: {
  title: string;
  parSeconds?: number;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const { state, dispatch } = useGame();

  const allEntered = state.players.every((p) => {
    const e = state.scores[p.id];
    return e && (e.dnf || e.rawSeconds != null);
  });

  const drill = state.currentDrill;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <ActiveWhoopsiePanel />
      {drill && (
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            The Drill (for reference — run it now)
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
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1.5 text-center text-xs text-white">
                        {drill.dealersChoiceValues[cat]}
                      </div>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
          {state.activeChallenges.length > 0 && (
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
          )}
        </Panel>
      )}
      <Panel>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {parSeconds != null && (
          <div className="text-sm text-zinc-400">
            Par time: <span className="text-amber-300">{parSeconds}s</span> — over par adds +1.0s
          </div>
        )}
        {state.players.map((p) => (
          <PlayerScoreCard
            key={p.id}
            playerId={p.id}
            name={p.name}
            entry={state.scores[p.id]}
            onChange={(entry) =>
              dispatch({ type: "SET_SCORE", playerId: p.id, entry })
            }
          />
        ))}
      </Panel>
      <button
        disabled={!allEntered}
        onClick={onSubmit}
        className="rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {submitLabel}
      </button>
    </div>
  );
}
