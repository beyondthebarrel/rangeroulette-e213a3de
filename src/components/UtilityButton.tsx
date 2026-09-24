import type { ReactNode } from "react";
import { LockIcon } from "./icons";

/** Medallion-chip style utility button — icon badge echoing TitleFrame's corner medallions. */
export function UtilityButton({
  icon,
  label,
  onClick,
  className = "",
  locked = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  /** Shows a lock badge and dims the button for a feature that needs a subscription. */
  locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 rounded-lg border py-2 hover:bg-zinc-900 ${
        locked ? "border-zinc-800 bg-black/20 opacity-70" : "border-zinc-800 bg-black/40 hover:border-orange-800/80"
      } ${className}`}
    >
      {locked && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-zinc-400">
          <LockIcon className="h-2.5 w-2.5" />
        </span>
      )}
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border bg-black ${
          locked ? "border-zinc-700 text-zinc-500" : "border-orange-700/80 text-orange-500 group-hover:border-orange-500"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${
          locked ? "text-zinc-500" : "text-zinc-400 group-hover:text-orange-400"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
