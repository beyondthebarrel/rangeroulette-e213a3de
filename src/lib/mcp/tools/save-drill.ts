import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const card = z.object({
  cardId: z.string(),
  label: z.string(),
  detail: z.string().optional(),
});

export default defineTool({
  name: "save_drill",
  title: "Save a drill",
  description:
    "Save a Range Roulette drill under a name for the signed-in user. Re-saving the same name overwrites it.",
  inputSchema: {
    name: z.string().describe("Name for the saved drill."),
    drill: z
      .object({
        time: card,
        distance: card,
        startPosition: card,
        target: card,
        courseOfFire: card,
        parSeconds: z.number().optional(),
      })
      .describe("Drill snapshot, e.g. the output of draw_drill."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, drill }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const trimmed = name.trim();
    if (!trimmed)
      return { content: [{ type: "text", text: "Name is required" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("saved_drills")
      .upsert(
        {
          user_id: ctx.getUserId(),
          name: trimmed,
          name_normalized: trimmed.toLowerCase(),
          drill,
          par_seconds: drill.parSeconds ?? null,
        },
        { onConflict: "user_id,name_normalized" },
      )
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved drill "${trimmed}".` }],
      structuredContent: { drill: data },
    };
  },
});
