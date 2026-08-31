import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_training_sessions",
  title: "List training sessions",
  description:
    "List logged training sessions, most recent first. Optionally filter by trainee name.",
  inputSchema: {
    trainee: z.string().optional().describe("Filter to one trainee name."),
    limit: z.number().optional().describe("Maximum rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ trainee, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const capped = Math.min(Math.max(Math.trunc(limit ?? 20), 1), 100);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("training_sessions")
      .select("id, trainee, logged_at, raw_seconds, zone_misses, complete_misses, final_seconds, saved_drill_name, drill")
      .order("logged_at", { ascending: false })
      .limit(capped);
    if (trainee) query = query.eq("trainee_normalized", trainee.trim().toLowerCase());

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = data ?? [];
    return {
      content: [
        {
          type: "text",
          text: rows.length
            ? rows
                .map(
                  (r: any) =>
                    `${new Date(r.logged_at).toISOString().slice(0, 10)} — ${r.trainee}: ${r.final_seconds}s (raw ${r.raw_seconds}s)`,
                )
                .join("\n")
            : "No sessions logged.",
        },
      ],
      structuredContent: { sessions: rows },
    };
  },
});
