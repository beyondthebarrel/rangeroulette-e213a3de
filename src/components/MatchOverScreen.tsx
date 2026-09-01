import { useGame } from "../game/GameContext";
import { HeroBackdrop } from "./HeroBackdrop";
import { PlayingCard } from "./PlayingCard";
import { RetryImage } from "./RetryImage";
import { TitleFrame } from "./TitleFrame";

export function MatchOverScreen() {
  const { state, dispatch } = useGame();
  const winner = state.players.find((p) => p.id === state.winnerId);
  const ranked = [...state.players].sort((a, b) => b.points - a.points);

  return (
    <HeroBackdrop>
      <TitleFrame>
        <h1 className="text-3xl font-bold uppercase tracking-wide text-orange-500">
          {winner?.name} Wins!
        </h1>

        <div className="flex w-full flex-col gap-2">
          {ranked.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-white">{p.name}</span>
                <span className="text-orange-400">{p.points} pts</span>
              </div>
              {p.hand.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.hand.map((c) => (
                    <PlayingCard key={c.instanceId} cardId={c.def.id} className="w-12" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => dispatch({ type: "RESET_MATCH" })}
          className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
        >
          New Match
        </button>

        <RetryImage
          src="/btb-logo.png"
          alt="Beyond the Barrel Concepts"
          className="mt-1 w-32 opacity-90"
        />
      </TitleFrame>
    </HeroBackdrop>
  );
}
