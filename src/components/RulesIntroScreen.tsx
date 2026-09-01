import { useState } from "react";
import { HeroBackdrop } from "./HeroBackdrop";
import { TitleFrame } from "./TitleFrame";

interface RuleItem {
  heading?: string;
  text: string;
}

interface Slide {
  title: string;
  items: RuleItem[];
}

// Adapted from the physical "Rules & Directions" reference cards
// (public/cards/ref-rules-1.jpg, ref-rules-2.jpg), regrouped by theme and
// corrected against the app's actual current behavior rather than the
// printed card text (Bill Drill is 7 yards here, not 5; there's no 10-point
// full-game mode implemented, only first-to-5).
const SLIDES: Slide[] = [
  {
    title: "How to Play",
    items: [
      { text: "Score points by posting the fastest clean run each round." },
      {
        heading: "1. Start",
        text: "Everyone runs a Bill Drill (6 rounds, 7 yards, A-zone). Fastest goes first.",
      },
      { heading: "2. Build", text: "Draw one card from each deck to create the drill." },
      { heading: "3. Run", text: "Every shooter performs the same drill." },
      {
        heading: "4. Score",
        text: "Fastest time wins the round and draws a Challenge card.",
      },
      { heading: "5. Rotate", text: "The next shooter builds the following drill." },
      { heading: "Win", text: "First to 5 points wins the match." },
    ],
  },
  {
    title: "Scoring & Penalties",
    items: [
      { heading: "Zone hit", text: "Outside the scoring zone: +0.5 sec." },
      { heading: "Complete miss", text: "+1.0 sec each." },
      { heading: "Over par time", text: "+1.0 sec." },
      { heading: "Make-up shots", text: "Allowed, unless a card says otherwise." },
      {
        heading: "Tie",
        text: "Next-fastest shooter builds the next drill. Everyone tied? Run a Bill Drill.",
      },
    ],
  },
  {
    title: "Cards & Curveballs",
    items: [
      {
        heading: "Challenge cards",
        text: "Won each round, played on any shooter before the next drill, active for one round.",
      },
      {
        heading: "Whoopsie",
        text: "Gear drops, setup errors, timer hiccups — draw a Whoopsie card. Its effect hits everyone next round.",
      },
      {
        heading: "Dealer's Choice",
        text: "The dealer can set a custom condition beyond what's printed — e.g. 3.5 sec, or 7 yards.",
      },
      {
        heading: "Uncomfortable?",
        text: "You can always pass or redraw. Safety and sound judgment take priority over competition.",
      },
    ],
  },
];

export function RulesIntroScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <HeroBackdrop>
      <TitleFrame>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500 sm:text-3xl">
          {slide.title}
        </h1>

        <ul className="flex w-full flex-col gap-2">
          {slide.items.map((item) => (
            <li
              key={item.heading ?? item.text}
              className="rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3 text-sm text-zinc-200"
            >
              {item.heading && (
                <div className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-orange-400">
                  {item.heading}
                </div>
              )}
              <div>{item.text}</div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-center gap-1.5">
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 w-1.5 rounded-full ${
                i === index ? "bg-orange-500" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <div className="flex w-full gap-2">
          {index > 0 && (
            <button
              onClick={() => setIndex((i) => i - 1)}
              className="rounded border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}
            className="flex-1 rounded-md bg-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>

        <button onClick={onDone} className="text-xs text-zinc-500 hover:text-zinc-300">
          Skip
        </button>
      </TitleFrame>
    </HeroBackdrop>
  );
}
