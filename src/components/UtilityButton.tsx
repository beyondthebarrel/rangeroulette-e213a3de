import type { ReactNode } from "react";

/** Medallion-chip style utility button — icon badge echoing TitleFrame's corner medallions. */
export function UtilityButton({
  icon,
  label,
  onClick,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-1.5 rounded-lg border border-zinc-800 bg-black/40 py-2 hover:border-orange-800/80 hover:bg-zinc-900 ${className}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-700/80 bg-black text-orange-500 group-hover:border-orange-500">
        {icon}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 group-hover:text-orange-400 sm:text-xs">
        {label}
      </span>
    </button>
  );
}
