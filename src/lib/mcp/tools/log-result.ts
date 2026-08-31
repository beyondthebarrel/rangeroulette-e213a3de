import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const card = z.object({
  cardId: z.string(),
  label: z.string(),
  detail: z.string().optional(),
});

/** Mirrors the app's scoring: +0.5s per zone miss, +1.0s per complete miss, +1.0s over par. */
function computeFinalSeconds(
  rawSeconds: number,
  zoneMisses: number,
  completeMisses: number,
  parSeconds?: number,
): number {
  let total = rawSeconds + zoneMisses * 0.5 + completeMisses * 1;
  if (parSeconds != null && rawSeconds > parSeconds) total += 1;
  return Math.round(total * 100) / 100;
}

export default defineTool({
  name: "log_training_result",
  title: "Log a training result",
  description:
    "Log a training run for a trainee: raw time plus zone/complete misses. The penalised final time is computed automatically.",
  inputSchema: {
    trainee: z.string().describe("Trainee name."),
    rawSeconds: z.number().describe("Raw time on the timer, in seconds."),
    zoneMisses: z.number().optional().describe("Number of zone misses (default 0)."),
    completeMisses: z.number().optional().describe("Number of complete misses (default 0)."),
    savedDrillName: z
      .string()
      .optional()
      .describe("Name of a saved drill to log against; its snapshot is used."),
    drill: z
      .object({
        time: card,
        distance: card,
        startPosition: card,
        target: card,
        courseOfFire: card,
        parSeconds: z.number().optional(),
      })
      .optional()
      .describe("Drill snapshot, required when savedDrillName is not given."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    let drill = input.drill as Record<string, unknown> | undefined;

    if (input.savedDrillName) {
      const { data, error } = await supabase
        .from("saved_drills")
        .select("name, drill")
        .eq("user_id", ctx.getUserId())
        .eq("name_normalized", input.savedDrillName.trim().toLowerCase())
        .maybeSingle();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      if (!data)
        return {
          content: [{ type: "text", text: `No saved drill named "${input.savedDrillName}".` }],
          isError: true,
        };
      drill = (data as any).drill;
    }

    if (!drill)
      return {
        content: [{ type: "text", text: "Provide either savedDrillName or a drill snapshot." }],
        isError: true,
      };

    const zoneMisses = input.zoneMisses ?? 0;
    const completeMisses = input.completeMisses ?? 0;
    const finalSeconds = computeFinalSeconds(
      input.rawSeconds,
      zoneMisses,
      completeMisses,
      (drill as { parSeconds?: number }).parSeconds,
    );

    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        recorded_by: ctx.getUserId(),
        trainee: input.trainee.trim(),
        trainee_normalized: input.trainee.trim().toLowerCase(),
        drill,
        raw_seconds: input.rawSeconds,
        zone_misses: zoneMisses,
        complete_misses: completeMisses,
        final_seconds: finalSeconds,
        ...(input.savedDrillName ? { saved_drill_name: input.savedDrillName.trim() } : {}),
      })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged ${finalSeconds.toFixed(2)}s for ${input.trainee}.` }],
      structuredContent: { session: data, finalSeconds },
    };
  },
});
