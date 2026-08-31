import { defineTool } from "@lovable.dev/mcp-js";
import { CATEGORY_DECKS, CATEGORY_ORDER, type CategoryCardDef } from "../../../data/cards";

function pick(cards: CategoryCardDef[]): CategoryCardDef {
  return cards[Math.floor(Math.random() * cards.length)];
}

export default defineTool({
  name: "draw_drill",
  title: "Draw a random drill",
  description:
    "Draw a random Range Roulette training drill: one card each for time, distance, start position, target, and course of fire.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: () => {
    const drill = Object.fromEntries(
      CATEGORY_ORDER.map((cat) => {
        const card = pick(CATEGORY_DECKS[cat]);
        return [cat, { cardId: card.id, label: card.label, detail: card.detail }];
      }),
    ) as Record<string, { cardId: string; label: string; detail?: string }>;

    const parSeconds = CATEGORY_DECKS.time.find((c) => c.id === drill.time.cardId)?.parSeconds;
    const payload = { ...drill, parSeconds };

    const text = CATEGORY_ORDER.map((cat) => `${cat}: ${drill[cat].label}`).join("\n");
    return {
      content: [{ type: "text", text }],
      structuredContent: { drill: payload },
    };
  },
});
