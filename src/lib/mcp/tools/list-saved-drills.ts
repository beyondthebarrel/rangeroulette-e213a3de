import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_saved_drills",
  title: "List saved drills",
  description: "List the signed-in user's saved Range Roulette training drills.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("saved_drills")
      .select("id, name, drill, par_seconds, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false });

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = data ?? [];
    return {
      content: [
        {
          type: "text",
          text: rows.length
            ? rows.map((r: any) => `${r.name} (par ${r.par_seconds ?? "—"}s)`).join("\n")
            : "No saved drills yet.",
        },
      ],
      structuredContent: { drills: rows },
    };
  },
});
