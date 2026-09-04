import { useState } from "react";
import { HeroBackdrop } from "./HeroBackdrop";
import { TitleFrame } from "./TitleFrame";

// Verbatim from the physical Safety Rules reference card (public/cards/ref-safety-rules.jpg).
const SAFETY_RULES = [
  "I will treat every firearm as if it is loaded.",
  "I will never point the muzzle at anything I'm not willing to destroy.",
  "I will keep my finger off the trigger until my sights are on target and I've made the decision to shoot.",
  "I am sure of my target and what is beyond it.",
  "I will comply with all range rules and policies.",
];

const DRY_FIRE_RULE = "I have verified the chamber is clear and removed all ammunition from the training area.";

export function SafetyChecklistScreen({
  mode,
  onAcknowledge,
  onBack,
}: {
  mode: "game" | "train" | "dryFire";
  onAcknowledge: () => void;
  onBack: () => void;
}) {
  // Dry fire usually happens at home, not at a range, so the "range rules
  // and policies" line doesn't apply — swapped out for the chamber-check rule.
  const rules =
    mode === "dryFire"
      ? [DRY_FIRE_RULE, ...SAFETY_RULES.filter((rule) => rule !== "I will comply with all range rules and policies.")]
      : SAFETY_RULES;
  const [checked, setChecked] = useState<boolean[]>(() => rules.map(() => false));
  const allChecked = checked.every(Boolean);

  function toggle(i: number) {
    setChecked((prev) => prev.map((c, idx) => (idx === i ? !c : c)));
  }

  return (
    <HeroBackdrop>
      <TitleFrame>
        <h1
          className={`text-2xl font-bold uppercase tracking-wide sm:text-3xl ${
            mode === "dryFire" ? "text-sky-400" : "text-orange-500"
          }`}
        >
          Safety Rules
        </h1>

        {mode === "game" && (
          <p className="text-center text-xs leading-snug text-zinc-400">
            Read aloud — every shooter at the line should hear this before the first drill.
          </p>
        )}

        <ul className="flex w-full flex-col gap-2">
          {rules.map((rule, i) => (
            <li key={rule}>
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border bg-zinc-900/60 p-3 text-sm text-zinc-200 hover:bg-zinc-900 ${
                  mode === "dryFire" && i === 0 ? "border-sky-700/50" : "border-orange-900/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => toggle(i)}
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    mode === "dryFire" && i === 0 ? "accent-sky-600" : "accent-orange-600"
                  }`}
                />
                <span>{rule}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className="w-full rounded-lg border border-amber-700/50 bg-amber-950/20 p-3 text-center text-xs text-amber-200">
          If at any time a shooter is uncomfortable completing the drill safely, they may pass
          or redraw.
        </div>

        <p className="text-center text-xs italic text-zinc-500">
          Safety and sound judgment take priority over competition.
        </p>

        <button
          disabled={!allChecked}
          onClick={onAcknowledge}
          className={`w-full rounded-md px-4 py-3 font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 ${
            mode === "dryFire" ? "bg-sky-700 enabled:hover:bg-sky-600" : "bg-orange-700 enabled:hover:bg-orange-600"
          }`}
        >
          I Understand — Continue
        </button>

        <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back
        </button>
      </TitleFrame>
    </HeroBackdrop>
  );
}
