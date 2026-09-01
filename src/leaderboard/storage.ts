import { supabase } from "../integrations/supabase/client";

/** Minimum completed matches before a player qualifies for the Best Win % ranking. */
export const MIN_MATCHES_FOR_WIN_PCT = 3;

export interface LeaderboardEntry {
  name: string;
  wins: number;
  losses: number;
}

export interface LeaderboardStats extends LeaderboardEntry {
  matchesPlayed: number;
  winPct: number;
}

export interface LeaderboardBoards {
  mostWins: LeaderboardStats[];
  bestWinPct: LeaderboardStats[];
  notYetQualified: LeaderboardStats[];
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Records the outcome of a completed match to the shared leaderboard. Safe to call more than once for the same matchId — later calls are no-ops. */
export async function recordMatchResult(
  matchId: string,
  playerNames: string[],
  winnerName: string,
  recordedBy: string,
) {
  const winnerKey = normalizeName(winnerName);
  const rows = playerNames.map((name) => ({
    match_id: matchId,
    player_name: name,
    player_name_normalized: normalizeName(name),
    won: normalizeName(name) === winnerKey,
    recorded_by: recordedBy,
  }));

  const { error } = await supabase
    .from("match_results")
    .upsert(rows, { onConflict: "match_id,player_name_normalized", ignoreDuplicates: true });

  if (error) console.error("Failed to record match result", error);
}

/** Every shooter who has completed at least one match, for quickly re-adding them in Player Setup. */
export async function getKnownShooterNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from("match_results")
    .select("player_name, player_name_normalized")
    .order("player_name");

  if (error || !data) {
    console.error("Failed to load known shooters", error);
    return [];
  }
  const seen = new Map<string, string>();
  data.forEach((row) => seen.set(row.player_name_normalized, row.player_name));
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export async function getLeaderboardStats(): Promise<LeaderboardBoards> {
  const { data, error } = await supabase
    .from("match_results")
    .select("player_name, player_name_normalized, won");

  if (error || !data) {
    console.error("Failed to load leaderboard", error);
    return { mostWins: [], bestWinPct: [], notYetQualified: [] };
  }

  const entries = new Map<string, LeaderboardEntry>();
  data.forEach((row) => {
    const existing = entries.get(row.player_name_normalized) ?? {
      name: row.player_name,
      wins: 0,
      losses: 0,
    };
    entries.set(row.player_name_normalized, {
      name: row.player_name,
      wins: existing.wins + (row.won ? 1 : 0),
      losses: existing.losses + (row.won ? 0 : 1),
    });
  });

  const all: LeaderboardStats[] = [...entries.values()].map((e) => {
    const matchesPlayed = e.wins + e.losses;
    return {
      ...e,
      matchesPlayed,
      winPct: matchesPlayed > 0 ? e.wins / matchesPlayed : 0,
    };
  });

  const mostWins = [...all].sort(
    (a, b) => b.wins - a.wins || b.winPct - a.winPct || a.name.localeCompare(b.name),
  );

  const eligible = all.filter((e) => e.matchesPlayed >= MIN_MATCHES_FOR_WIN_PCT);
  const bestWinPct = [...eligible].sort(
    (a, b) => b.winPct - a.winPct || b.wins - a.wins || a.name.localeCompare(b.name),
  );

  const notYetQualified = all
    .filter((e) => e.matchesPlayed < MIN_MATCHES_FOR_WIN_PCT)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { mostWins, bestWinPct, notYetQualified };
}
