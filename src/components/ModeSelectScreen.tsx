import { HeroBackdrop } from "./HeroBackdrop";
import {
  BookIcon,
  CardsIcon,
  ChartIcon,
  ClipboardListIcon,
  LockIcon,
  MapPinIcon,
  StopwatchIcon,
  TargetIcon,
  TrophyIcon,
  UserIcon,
  WrenchIcon,
} from "./icons";
import { IOSInstallBanner } from "./IOSInstallBanner";
import { RetryImage } from "./RetryImage";
import { TitleFrame } from "./TitleFrame";
import { UtilityButton } from "./UtilityButton";

function ModeButton({
  icon,
  title,
  description,
  onClick,
  variant = "orange",
  locked = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  variant?: "orange" | "sky" | "purple";
  /** Shows a lock badge and a "subscribe to unlock" line instead of the mode's own blurb. */
  locked?: boolean;
}) {
  const borderClass =
    variant === "sky" ? "border-sky-700" : variant === "purple" ? "border-violet-700" : "border-orange-700";
  const textClass =
    variant === "sky" ? "text-sky-500" : variant === "purple" ? "text-violet-500" : "text-orange-500";
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl border-2 bg-zinc-900/60 p-2 text-left hover:bg-zinc-900 sm:gap-3 sm:p-4 ${
        locked ? "border-zinc-700 opacity-80" : borderClass
      }`}
    >
      <span className={`shrink-0 ${locked ? "text-zinc-500" : textClass}`}>{icon}</span>
      <span className="flex-1">
        <span className="flex items-center gap-1.5">
          <span className="block text-sm font-bold uppercase tracking-wide text-white sm:text-lg">
            {title}
          </span>
          {locked && <LockIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />}
        </span>
        <span className="block text-[10px] leading-snug text-zinc-400 sm:text-xs">
          {locked ? "Subscribe to unlock this mode" : description}
        </span>
      </span>
    </button>
  );
}

export function ModeSelectScreen({
  subscribed,
  onRequireSubscription,
  onSelectGame,
  onSelectTrain,
  onSelectDryFire,
  onOpenLeaderboard,
  onOpenRules,
  onOpenAnalytics,
  onOpenProfile,
  onOpenRangeLocator,
  onOpenTargets,
  onOpenMaintenanceLog,
  onOpenCompetitionMode,
  onOpenStageBuilder,
}: {
  /** Dry Fire Mode and Build Your Own Stage stay free to explore regardless of
   * this — every other mode/utility gates behind it. */
  subscribed: boolean;
  onRequireSubscription: () => void;
  onSelectGame: () => void;
  onSelectTrain: () => void;
  onSelectDryFire: () => void;
  onOpenLeaderboard: () => void;
  onOpenRules: () => void;
  onOpenAnalytics: () => void;
  onOpenProfile: () => void;
  onOpenRangeLocator: () => void;
  onOpenTargets: () => void;
  onOpenMaintenanceLog: () => void;
  onOpenCompetitionMode: () => void;
  onOpenStageBuilder: () => void;
}) {
  const gate = (fn: () => void) => (subscribed ? fn : onRequireSubscription);

  return (
    <HeroBackdrop>
      <TitleFrame>
        <IOSInstallBanner />
        <img
          src="/rr-logo.webp"
          alt="Range Roulette"
          className="w-full max-w-[320px] sm:max-w-[460px]"
        />

        <div className="flex w-full flex-col gap-2">
          <ModeButton
            icon={<CardsIcon className="h-7 w-7 sm:h-10 sm:w-10" />}
            title="Game Mode"
            description="Pass-and-play card game for 2+ shooters"
            onClick={gate(onSelectGame)}
            locked={!subscribed}
          />
          <ModeButton
            icon={<StopwatchIcon className="h-7 w-7 sm:h-10 sm:w-10" />}
            title="Train Mode"
            description="Solo random drill generator & performance log"
            onClick={gate(onSelectTrain)}
            locked={!subscribed}
          />
          <ModeButton
            icon={<LockIcon className="h-7 w-7 sm:h-10 sm:w-10" />}
            title="Dry Fire Mode"
            description="Free to explore — no-ammo reps at home with their own history & stats"
            onClick={onSelectDryFire}
            variant="sky"
          />
          <ModeButton
            icon={<ClipboardListIcon className="h-7 w-7 sm:h-10 sm:w-10" />}
            title="Competition Mode"
            description="USPSA's current classifier roster with a built-in hit-factor calculator"
            onClick={gate(onOpenCompetitionMode)}
            variant="purple"
            locked={!subscribed}
          />
          <ModeButton
            icon={<WrenchIcon className="h-7 w-7 sm:h-10 sm:w-10" />}
            title="Build Your Own Stage"
            description="Free to explore — sketch a custom stage, then launch it to score live runs"
            onClick={onOpenStageBuilder}
            variant="purple"
          />
        </div>

        <div className="grid w-full grid-cols-2 gap-2">
          <UtilityButton
            icon={<BookIcon className="h-4 w-4" />}
            label="Rules"
            onClick={gate(onOpenRules)}
            locked={!subscribed}
          />
          <UtilityButton
            icon={<TrophyIcon className="h-4 w-4" />}
            label="Leaderboard"
            onClick={gate(onOpenLeaderboard)}
            locked={!subscribed}
          />
          <UtilityButton
            icon={<ChartIcon className="h-4 w-4" />}
            label="Training Analytics"
            onClick={gate(onOpenAnalytics)}
            locked={!subscribed}
          />
          <UtilityButton
            icon={<UserIcon className="h-4 w-4" />}
            label="View & Edit Profile"
            onClick={onOpenProfile}
          />
          <UtilityButton
            icon={<MapPinIcon className="h-4 w-4" />}
            label="Find Ranges"
            onClick={gate(onOpenRangeLocator)}
            locked={!subscribed}
          />
          <UtilityButton
            icon={<TargetIcon className="h-4 w-4" />}
            label="Print Targets"
            onClick={gate(onOpenTargets)}
            locked={!subscribed}
          />
        </div>

        <div className="flex w-full justify-center">
          <UtilityButton
            icon={<WrenchIcon className="h-4 w-4" />}
            label="Maintenance Log"
            onClick={gate(onOpenMaintenanceLog)}
            locked={!subscribed}
            className="w-1/2"
          />
        </div>

        {!subscribed && (
          <button
            onClick={onRequireSubscription}
            className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
          >
            🔓 Subscribe to Unlock Everything
          </button>
        )}

        <RetryImage
          src="/btb-logo.png"
          alt="Beyond the Barrel Concepts"
          className="w-16 opacity-90 sm:mt-1 sm:w-32"
        />
      </TitleFrame>
    </HeroBackdrop>
  );
}
