import { HeroBackdrop } from "./HeroBackdrop";
import {
  CardsIcon,
  ChartIcon,
  ClipboardListIcon,
  LockIcon,
  MapPinIcon,
  StopwatchIcon,
  TargetIcon,
  WrenchIcon,
} from "./icons";
import { TitleFrame } from "./TitleFrame";
import { UtilityButton } from "./UtilityButton";

function FeatureRow({
  icon,
  title,
  description,
  variant = "orange",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: "orange" | "sky" | "purple";
}) {
  const borderClass =
    variant === "sky" ? "border-sky-700" : variant === "purple" ? "border-violet-700" : "border-orange-700";
  const textClass =
    variant === "sky" ? "text-sky-500" : variant === "purple" ? "text-violet-500" : "text-orange-500";
  return (
    <div className={`flex w-full items-center gap-2.5 rounded-xl border-2 bg-zinc-900/60 p-2 sm:gap-3 sm:p-4 ${borderClass}`}>
      <span className={`shrink-0 ${textClass}`}>{icon}</span>
      <span>
        <span className="block text-sm font-bold uppercase tracking-wide text-white sm:text-lg">{title}</span>
        <span className="block text-[10px] leading-snug text-zinc-400 sm:text-xs">{description}</span>
      </span>
    </div>
  );
}

export function FeaturePreviewScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <HeroBackdrop>
      <TitleFrame>
        <img src="/rr-logo.webp" alt="Range Roulette" className="w-full max-w-[280px] sm:max-w-[380px]" />

        <p className="text-center text-sm text-zinc-400">Here's what's inside before you subscribe:</p>

        <div className="flex w-full flex-col gap-2">
          <FeatureRow
            icon={<CardsIcon className="h-7 w-7 sm:h-9 sm:w-9" />}
            title="Game Mode"
            description="Pass-and-play card game that builds random drills for 2+ shooters"
          />
          <FeatureRow
            icon={<StopwatchIcon className="h-7 w-7 sm:h-9 sm:w-9" />}
            title="Train Mode"
            description="Solo random drill generator with a full performance log"
          />
          <FeatureRow
            icon={<LockIcon className="h-7 w-7 sm:h-9 sm:w-9" />}
            title="Dry Fire Mode"
            description="No-ammo reps at home with their own pass/fail history & stats"
            variant="sky"
          />
          <FeatureRow
            icon={<ClipboardListIcon className="h-7 w-7 sm:h-9 sm:w-9" />}
            title="Competition Mode"
            description="USPSA's current classifier roster with a built-in hit-factor calculator"
            variant="purple"
          />
          <FeatureRow
            icon={<WrenchIcon className="h-7 w-7 sm:h-9 sm:w-9" />}
            title="Build Your Own Stage"
            description="Sketch a custom stage with real props, then launch it to score live runs"
            variant="purple"
          />
        </div>

        <div className="grid w-full grid-cols-3 gap-2">
          <UtilityButton icon={<MapPinIcon className="h-4 w-4" />} label="Find Ranges" onClick={() => {}} />
          <UtilityButton icon={<TargetIcon className="h-4 w-4" />} label="Print Targets" onClick={() => {}} />
          <UtilityButton icon={<ChartIcon className="h-4 w-4" />} label="Analytics" onClick={() => {}} />
        </div>

        <button
          onClick={onContinue}
          className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
        >
          See Plans →
        </button>
      </TitleFrame>
    </HeroBackdrop>
  );
}
