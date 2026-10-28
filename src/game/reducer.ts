import {
  CATEGORY_ORDER,
  CHALLENGE_CARDS,
  SCORING,
  WHOOPSIE_CARDS,
  buildCategoryDeck,
  type CategoryKey,
} from "../data/cards";
import { buildDeck, discardTo, drawOne, nextId } from "./deck";
import type {
  ActiveChallenge,
  ActiveWhoopsie,
  CategoryCardInstance,
  ChallengeCardInstance,
  CurrentDrill,
  GameState,
  Player,
  RoundResult,
  ScoreEntry,
  WhoopsieCardInstance,
} from "./types";

export type Action =
  | { type: "START_MATCH"; names: string[] }
  | { type: "FINISH_BILL_DRILL" }
  | { type: "CONTINUE_TO_DRILL" }
  | { type: "DRAW_ROUND" }
  | { type: "SET_DEALERS_CHOICE"; category: CategoryKey; value: string }
  | { type: "PLAY_CHALLENGE"; playerId: string; instanceId: string; targetPlayerId: string }
  | { type: "REVERSE_CHALLENGE"; activeIndex: number }
  | { type: "START_SCORING" }
  | { type: "SET_SCORE"; playerId: string; entry: ScoreEntry }
  | { type: "SUBMIT_ROUND" }
  | { type: "CALL_WHOOPSIE"; playerId: string }
  | { type: "NEXT_ROUND" }
  | { type: "RESET_MATCH" };

function anyPlayerHasChallengeCards(players: Player[]): boolean {
  return players.some((p) => p.hand.length > 0);
}

function emptyScore(): ScoreEntry {
  return { rawSeconds: null, zoneMisses: 0, completeMisses: 0, dnf: false };
}

function freshCategoryDecks(): GameState["categoryDecks"] {
  const decks = {} as GameState["categoryDecks"];
  CATEGORY_ORDER.forEach((cat) => {
    decks[cat] = buildDeck<CategoryCardInstance["def"], CategoryCardInstance>(
      buildCategoryDeck(cat),
      `card-${cat}`,
      (def, instanceId) => ({ instanceId, def }),
    );
  });
  return decks;
}

export function initialState(): GameState {
  return {
    phase: "setup",
    matchId: nextId("match"),
    players: [],
    dealerIndex: 0,
    round: 0,
    pointsToWin: SCORING.pointsToWin,
    categoryDecks: freshCategoryDecks(),
    challengeDeck: buildDeck<ChallengeCardInstance["def"], ChallengeCardInstance>(
      CHALLENGE_CARDS,
      "card-challenge",
      (def, instanceId) => ({ instanceId, def }),
    ),
    whoopsieDeck: buildDeck<WhoopsieCardInstance["def"], WhoopsieCardInstance>(
      WHOOPSIE_CARDS,
      "card-whoopsie",
      (def, instanceId) => ({ instanceId, def }),
    ),
    currentDrill: null,
    activeChallenges: [],
    pendingPhase: "build",
    activeWhoopsies: [],
    scores: {},
    lastRoundResult: null,
    winnerId: null,
  };
}

function computeFinalTime(
  entry: ScoreEntry,
  parSeconds: number | undefined,
  extraSeconds: number,
): number | null {
  if (entry.dnf || entry.rawSeconds == null) return null;
  let total = entry.rawSeconds;
  total += entry.zoneMisses * SCORING.zoneMissPenalty;
  total += entry.completeMisses * SCORING.completeMissPenalty;
  if (parSeconds != null && entry.rawSeconds > parSeconds) {
    total += SCORING.overParPenalty;
  }
  total += extraSeconds;
  return Math.round(total * 100) / 100;
}

/** Resolves the drill's effective par time, including a Dealer's Choice time value. */
export function resolveParSeconds(drill: GameState["currentDrill"]): number | undefined {
  if (!drill || drill.isBillDrill) return undefined;
  const timeCard = drill.cards.time;
  if (!timeCard) return undefined;
  if (!timeCard.def.dealersChoice) return timeCard.def.parSeconds;
  const chosen = drill.dealersChoiceValues.time;
  if (!chosen) return undefined;
  const parsed = parseFloat(chosen);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function activeChallengesFor(
  activeChallenges: ActiveChallenge[],
  playerId: string,
): ActiveChallenge[] {
  return activeChallenges.filter((c) => c.targetPlayerId === playerId);
}

function resolveRound(state: GameState): GameState {
  const drill = state.currentDrill;
  if (!drill) return state;
  const parSeconds = resolveParSeconds(drill);

  const finalTimes: Record<string, number | null> = {};
  state.players.forEach((p) => {
    const entry = state.scores[p.id] ?? emptyScore();
    const mine = activeChallengesFor(state.activeChallenges, p.id);
    const has = (e: string) => mine.some((c) => c.instance.def.autoEffect === e);
    let extra = 0;
    if (has("plusHalfSecond")) extra += 0.5;
    if (has("minusHalfSecond")) extra -= 0.5;
    if (has("minusOneSecond")) extra -= 1.0;
    const t = computeFinalTime(entry, parSeconds, extra);
    finalTimes[p.id] = t == null ? null : Math.max(0, t);
  });

  const finishers = state.players.filter((p) => finalTimes[p.id] != null);
  let winnerId: string | null = null;
  let tie = false;
  let tiedIds: string[] = [];
  if (finishers.length > 0) {
    const best = Math.min(...finishers.map((p) => finalTimes[p.id] as number));
    tiedIds = finishers
      .filter((p) => (finalTimes[p.id] as number) === best)
      .map((p) => p.id);
    if (tiedIds.length === 1) {
      winnerId = tiedIds[0];
    } else {
      tie = true;
    }
  }

  let players = state.players;
  let challengeDeck = state.challengeDeck;
  let awardedChallenge: ChallengeCardInstance | null = null;
  const donations: { fromId: string; toId: string }[] = [];

  if (winnerId) {
    players = players.map((p) =>
      p.id === winnerId ? { ...p, points: p.points + 1 } : p,
    );
    const draw = drawOne(challengeDeck);
    challengeDeck = draw.deck;
    awardedChallenge = draw.card;
    players = players.map((p) =>
      p.id === winnerId ? { ...p, hand: [...p.hand, draw.card] } : p,
    );

    const donors = state.activeChallenges.filter(
      (c) => c.instance.def.autoEffect === "donateLastPlace",
    );
    donors.forEach((donor) => {
      const donorPlayer = players.find((p) => p.id === donor.targetPlayerId);
      if (!donorPlayer || donorPlayer.points <= 0) return;
      const lowest = Math.min(...players.map((p) => p.points));
      const lastPlace = players.find(
        (p) => p.points === lowest && p.id !== donorPlayer.id,
      );
      if (!lastPlace) return;
      players = players.map((p) => {
        if (p.id === donorPlayer.id) return { ...p, points: p.points - 1 };
        if (p.id === lastPlace.id) return { ...p, points: p.points + 1 };
        return p;
      });
      donations.push({ fromId: donorPlayer.id, toId: lastPlace.id });
    });
  }

  // "Instant Play: last place adds one point and draws a Challenge card"
  state.activeChallenges
    .filter((c) => c.instance.def.autoEffect === "lastPlaceBonus")
    .forEach(() => {
      const lowest = Math.min(...players.map((p) => p.points));
      const lastPlace = players.find((p) => p.points === lowest);
      if (!lastPlace) return;
      const draw = drawOne(challengeDeck);
      challengeDeck = draw.deck;
      players = players.map((p) =>
        p.id === lastPlace.id
          ? { ...p, points: p.points + 1, hand: [...p.hand, draw.card] }
          : p,
      );
    });

  const result: RoundResult = {
    finalTimes,
    winnerId,
    tie,
    tiedIds,
    awardedChallenge,
    donations,
  };

  const matchWinner = players.find((p) => p.points >= state.pointsToWin);

  // discard played category cards + challenge cards used this round
  let categoryDecks = state.categoryDecks;
  if (!drill.isBillDrill) {
    categoryDecks = { ...state.categoryDecks };
    CATEGORY_ORDER.forEach((cat) => {
      const card = drill.cards[cat];
      if (card) {
        categoryDecks[cat] = discardTo(categoryDecks[cat], card);
      }
    });
  }
  state.activeChallenges.forEach((c) => {
    challengeDeck = discardTo(challengeDeck, c.instance);
  });

  return {
    ...state,
    players,
    categoryDecks,
    challengeDeck,
    activeChallenges: [],
    phase: "roundResult",
    lastRoundResult: result,
    winnerId: matchWinner ? matchWinner.id : null,
  };
}

function nextDealerIndex(state: GameState, result: RoundResult): number {
  if (!result.tie) {
    return (state.dealerIndex + 1) % state.players.length;
  }
  const nonTied = state.players
    .map((p, i) => ({ i, t: result.finalTimes[p.id] }))
    .filter((x) => x.t != null && !result.tiedIds.includes(state.players[x.i].id));
  if (nonTied.length === 0) return state.dealerIndex;
  const best = nonTied.reduce((a, b) => ((a.t as number) <= (b.t as number) ? a : b));
  return best.i;
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START_MATCH": {
      const players: Player[] = action.names.map((name) => ({
        id: nextId("player"),
        name,
        points: 0,
        hand: [],
      }));
      return {
        ...initialState(),
        players,
        phase: "billDrill",
        scores: Object.fromEntries(players.map((p) => [p.id, emptyScore()])),
      };
    }

    case "FINISH_BILL_DRILL": {
      const withTimes = state.players.map((p) => {
        const entry = state.scores[p.id] ?? emptyScore();
        return { p, t: computeFinalTime(entry, undefined, 0) };
      });
      const ranked = [...withTimes].sort((a, b) => {
        if (a.t == null) return 1;
        if (b.t == null) return -1;
        return a.t - b.t;
      });

      // The very first Bill Drill (before round 1) sets initial turn order.
      // A Bill Drill forced mid-match by a tie/no-finish should only pick
      // the next dealer -- it must not reorder players or rewind the round
      // counter, since points and rotation already earned so far still stand.
      const isInitialBillDrill = state.round === 0;
      let players = state.players;
      let dealerIndex = state.dealerIndex;
      let round = state.round;

      if (isInitialBillDrill) {
        players = ranked.map((r) => r.p);
        dealerIndex = 0;
        round = 1;
      } else if (ranked[0] && ranked[0].t != null) {
        const fastestIndex = state.players.findIndex((p) => p.id === ranked[0].p.id);
        if (fastestIndex !== -1) dealerIndex = fastestIndex;
      }

      return {
        ...state,
        players,
        dealerIndex,
        round,
        pendingPhase: "build",
        phase: anyPlayerHasChallengeCards(players) ? "playChallenges" : "build",
        scores: Object.fromEntries(state.players.map((p) => [p.id, emptyScore()])),
      };
    }

    case "CONTINUE_TO_DRILL": {
      return { ...state, phase: state.pendingPhase };
    }

    case "DRAW_ROUND": {
      // Idempotent: RoundBuildScreen dispatches this on mount, and React
      // StrictMode double-invokes mount effects in dev. Without this guard,
      // that second dispatch silently draws and discards an extra set of
      // cards every round -- they never reach the discard pile, so the
      // category decks permanently lose cards twice as fast as intended.
      if (state.currentDrill) return state;
      const categoryDecks = { ...state.categoryDecks };
      const cards: CurrentDrill["cards"] = {};
      CATEGORY_ORDER.forEach((cat) => {
        const { card, deck } = drawOne(categoryDecks[cat]);
        categoryDecks[cat] = deck;
        cards[cat] = card;
      });
      return {
        ...state,
        categoryDecks,
        currentDrill: {
          isBillDrill: false,
          cards,
          dealersChoiceValues: {},
        },
      };
    }

    case "SET_DEALERS_CHOICE": {
      if (!state.currentDrill) return state;
      return {
        ...state,
        currentDrill: {
          ...state.currentDrill,
          dealersChoiceValues: {
            ...state.currentDrill.dealersChoiceValues,
            [action.category]: action.value,
          },
        },
      };
    }

    case "PLAY_CHALLENGE": {
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) return state;
      const cardIndex = player.hand.findIndex(
        (c) => c.instanceId === action.instanceId,
      );
      if (cardIndex === -1) return state;
      const instance = player.hand[cardIndex];
      const players = state.players.map((p) =>
        p.id === player.id
          ? { ...p, hand: p.hand.filter((_, i) => i !== cardIndex) }
          : p,
      );
      const active: ActiveChallenge = {
        instance,
        playedBy: action.playerId,
        targetPlayerId: action.targetPlayerId,
      };
      return {
        ...state,
        players,
        activeChallenges: [...state.activeChallenges, active],
      };
    }

    case "REVERSE_CHALLENGE": {
      const active = state.activeChallenges[action.activeIndex];
      if (!active) return state;
      const target = state.players.find((p) => p.id === active.targetPlayerId);
      if (!target) return state;
      const reverseIdx = target.hand.findIndex(
        (c) => c.def.autoEffect === "reverseChallenge",
      );
      if (reverseIdx === -1) return state;
      const reverseCard = target.hand[reverseIdx];
      const players = state.players.map((p) =>
        p.id === target.id
          ? { ...p, hand: p.hand.filter((_, i) => i !== reverseIdx) }
          : p,
      );
      const activeChallenges = state.activeChallenges.map((c, i) =>
        i === action.activeIndex
          ? { ...c, targetPlayerId: c.playedBy, playedBy: c.targetPlayerId }
          : c,
      );
      return {
        ...state,
        players,
        challengeDeck: discardTo(state.challengeDeck, reverseCard),
        activeChallenges,
      };
    }

    case "START_SCORING": {
      return {
        ...state,
        phase: "score",
        scores: Object.fromEntries(state.players.map((p) => [p.id, emptyScore()])),
      };
    }

    case "SET_SCORE": {
      return {
        ...state,
        scores: { ...state.scores, [action.playerId]: action.entry },
      };
    }

    case "SUBMIT_ROUND": {
      return resolveRound(state);
    }

    case "CALL_WHOOPSIE": {
      const { card, deck } = drawOne(state.whoopsieDeck);
      let whoopsieDeck = deck;
      let players = state.players;
      let challengeDeck = state.challengeDeck;
      const active: ActiveWhoopsie = {
        instance: card,
        calledBy: action.playerId,
        roundsRemaining: card.def.rounds,
      };
      if (card.def.drawsChallengeForAll && state.currentDrill) {
        const drawn = drawOne(challengeDeck);
        challengeDeck = drawn.deck;
        players = players.map((p) => ({
          ...p,
          hand: p.id === action.playerId ? [...p.hand, drawn.card] : p.hand,
        }));
      }
      whoopsieDeck = discardTo(whoopsieDeck, card);
      return {
        ...state,
        players,
        challengeDeck,
        whoopsieDeck,
        activeWhoopsies: [...state.activeWhoopsies, active],
      };
    }

    case "NEXT_ROUND": {
      if (state.winnerId) {
        return { ...state, phase: "matchOver" };
      }
      const result = state.lastRoundResult;
      const dealerIndex = result ? nextDealerIndex(state, result) : state.dealerIndex;
      const activeWhoopsies = state.activeWhoopsies
        .map((w) => ({ ...w, roundsRemaining: w.roundsRemaining - 1 }))
        .filter((w) => w.roundsRemaining > 0);
      const noOneFinished =
        result != null && result.winnerId == null && !result.tie;
      const forceBillDrill = result != null && result.tie && dealerIndex === state.dealerIndex && result.tiedIds.length === state.players.length;
      const targetPhase = forceBillDrill || noOneFinished ? "billDrill" : "build";
      return {
        ...state,
        dealerIndex,
        round: state.round + 1,
        currentDrill: null,
        lastRoundResult: null,
        activeWhoopsies,
        pendingPhase: targetPhase,
        phase: anyPlayerHasChallengeCards(state.players) ? "playChallenges" : targetPhase,
        scores: Object.fromEntries(state.players.map((p) => [p.id, emptyScore()])),
      };
    }

    case "RESET_MATCH": {
      return initialState();
    }

    default:
      return state;
  }
}

export function activeDeckSizes(state: GameState) {
  return {
    challenge: state.challengeDeck.draw.length + state.challengeDeck.discard.length,
    whoopsie: state.whoopsieDeck.draw.length + state.whoopsieDeck.discard.length,
  };
}
