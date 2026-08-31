import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_leaderboard",
  title: "Get the match leaderboard",
  description: "Aggregate wins, losses, and win percentage from recorded Range Roulette matches.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("match_results")
      .select("player_name, player_name_normalized, won");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const tally = new Map<string, { name: string; wins: number; losses: number }>();
    for (const row of (data ?? []) as any[]) {
      const cur = tally.get(row.player_name_normalized) ?? {
        name: row.player_name,
        wins: 0,
        losses: 0,
      };
      cur.wins += row.won ? 1 : 0;
      cur.losses += row.won ? 0 : 1;
      tally.set(row.player_name_normalized, cur);
    }

    const standings = [...tally.values()]
      .map((e) => ({
        ...e,
        matchesPlayed: e.wins + e.losses,
        winPct: e.wins + e.losses > 0 ? e.wins / (e.wins + e.losses) : 0,
      }))
      .sort((a, b) => b.wins - a.wins || b.winPct - a.winPct || a.name.localeCompare(b.name));

    return {
      content: [
        {
          type: "text",
          text: standings.length
            ? standings
                .map(
                  (s) =>
                    `${s.name}: ${s.wins}W-${s.losses}L (${Math.round(s.winPct * 100)}%)`,
                )
                .join("\n")
            : "No matches recorded yet.",
        },
      ],
      structuredContent: { standings },
    };
  },
});
