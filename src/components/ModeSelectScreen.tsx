import { HeroBackdrop } from "./HeroBackdrop";
import {
  BookIcon,
  CardsIcon,
  ChartIcon,
  MapPinIcon,
  StopwatchIcon,
  TargetIcon,
  TrophyIcon,
  UserIcon,
} from "./icons";
import { RetryImage } from "./RetryImage";
import { TitleFrame } from "./TitleFrame";
import { UtilityButton } from "./UtilityButton";

function ModeButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl border-2 border-orange-700 bg-zinc-900/60 p-2 text-left hover:bg-zinc-900 sm:gap-3 sm:p-4"
    >
      <span className="shrink-0 text-orange-500">{icon}</span>
      <span>
        <span className="block text-sm font-bold uppercase tracking-wide text-white sm:text-lg">
          {title}
        </span>
        <span className="block text-[10px] leading-snug text-zinc-400 sm:text-xs">
          {description}
        </span>
      </span>
    </button>
  );
}

export function ModeSelectScreen({
  onSelectGame,
  onSelectTrain,
  onOpenLeaderboard,
  onOpenRules,
  onOpenAnalytics,
  onOpenProfile,
  onOpenRangeLocator,
  onOpenTargets,
}: {
  onSelectGame: () => void;
  onSelectTrain: () => void;
  onOpenLeaderboard: () => void;
  onOpenRules: () => void;
  onOpenAnalytics: () => void;
  onOpenProfile: () => void;
  onOpenRangeLocator: () => void;
  onOpenTargets: () => void;
}) {
  return (
    <HeroBackdrop>
      <TitleFrame>
        <img
          src="/badge-wheel.jpg"
          alt="Range Roulette — every draw is a new problem"
          className="w-full max-w-[130px] rounded-md sm:max-w-[260px]"
        />

        <div className="flex w-full flex-col gap-2">
          <ModeButton
            icon={<CardsIcon className="h-7 w-7 sm:h-10 sm:w-10" />}
            title="Game Mode"
            description="Pass-and-play card game for 2+ shooters"
            onClick={onSelectGame}
          />
          <ModeButton
            icon={<StopwatchIcon className="h-7 w-7 sm:h-10 sm:w-10" />}
            title="Train Mode"
            description="Solo random drill generator & performance log"
            onClick={onSelectTrain}
          />
        </div>

        <div className="grid w-full grid-cols-2 gap-2">
          <UtilityButton icon={<BookIcon className="h-4 w-4" />} label="Rules" onClick={onOpenRules} />
          <UtilityButton
            icon={<TrophyIcon className="h-4 w-4" />}
            label="Leaderboard"
            onClick={onOpenLeaderboard}
          />
          <UtilityButton
            icon={<ChartIcon className="h-4 w-4" />}
            label="Training Analytics"
            onClick={onOpenAnalytics}
          />
          <UtilityButton
            icon={<UserIcon className="h-4 w-4" />}
            label="View & Edit Profile"
            onClick={onOpenProfile}
          />
          <UtilityButton
            icon={<MapPinIcon className="h-4 w-4" />}
            label="Find Ranges"
            onClick={onOpenRangeLocator}
          />
          <UtilityButton
            icon={<TargetIcon className="h-4 w-4" />}
            label="Print Targets"
            onClick={onOpenTargets}
          />
        </div>

        <RetryImage
          src="/btb-logo.png"
          alt="Beyond the Barrel Concepts"
          className="w-16 opacity-90 sm:mt-1 sm:w-32"
        />
      </TitleFrame>
    </HeroBackdrop>
  );
}
