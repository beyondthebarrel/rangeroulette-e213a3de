import { useCallback, useState } from "react";
import { CATEGORY_DECKS, CATEGORY_ORDER, type CategoryCardDef, type CategoryKey } from "../data/cards";
import { buildDeck, discardTo, drawOne } from "../game/deck";
import type { CategoryCardInstance, DeckState } from "../game/types";

type Decks = Record<CategoryKey, DeckState<CategoryCardInstance>>;
type Drill = Record<CategoryKey, CategoryCardInstance>;

function freshDecks(decks: Record<CategoryKey, CategoryCardDef[]>): Decks {
  const built = {} as Decks;
  CATEGORY_ORDER.forEach((cat) => {
    built[cat] = buildDeck<CategoryCardInstance["def"], CategoryCardInstance>(
      decks[cat],
      `train-${cat}`,
      (def, instanceId) => ({ instanceId, def }),
    );
  });
  return built;
}

function drawAll(decks: Decks): { drill: Drill; decks: Decks } {
  const nextDecks = { ...decks };
  const drill = {} as Drill;
  CATEGORY_ORDER.forEach((cat) => {
    const { card, deck } = drawOne(nextDecks[cat]);
    nextDecks[cat] = deck;
    drill[cat] = card;
  });
  return { drill, decks: nextDecks };
}

/** Manages a solo training drill: a fresh 5-card draw with reshuffle-on-empty, no dealer/challenge mechanics. */
export function useTrainingDrill(decks: Record<CategoryKey, CategoryCardDef[]> = CATEGORY_DECKS) {
  const [state, setState] = useState<{ decks: Decks; drill: Drill }>(() => {
    return drawAll(freshDecks(decks));
  });

  const drawNew = useCallback(() => {
    setState((prev) => {
      const decks = { ...prev.decks };
      CATEGORY_ORDER.forEach((cat) => {
        decks[cat] = discardTo(decks[cat], prev.drill[cat]);
      });
      return drawAll(decks);
    });
  }, []);

  return { drill: state.drill, drawNew };
}
