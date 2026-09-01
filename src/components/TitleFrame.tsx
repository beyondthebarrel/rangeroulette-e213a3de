import type { ReactNode } from "react";

function CornerMedallion({
  className,
  icon,
}: {
  className: string;
  icon: "reticle" | "suit";
}) {
  return (
    <div
      className={`absolute flex h-9 w-9 items-center justify-center rounded-full border border-orange-700/80 bg-black text-orange-500 ${className}`}
    >
      {icon === "reticle" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="7" />
          <line x1="12" y1="1" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="23" />
          <line x1="1" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="23" y2="12" />
        </svg>
      ) : (
        <span className="text-base leading-none">♠</span>
      )}
    </div>
  );
}

export function TitleFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border-2 border-orange-700 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 px-4 pb-4 pt-6 shadow-[0_0_80px_rgba(154,52,18,0.15)] sm:px-6 sm:pb-6 sm:pt-8">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <circle cx="200" cy="200" r="180" stroke="white" strokeWidth="1" />
        <circle cx="200" cy="200" r="120" stroke="white" strokeWidth="1" />
        <circle cx="200" cy="200" r="60" stroke="white" strokeWidth="1" />
        <line x1="200" y1="0" x2="200" y2="400" stroke="white" strokeWidth="1" />
        <line x1="0" y1="200" x2="400" y2="200" stroke="white" strokeWidth="1" />
      </svg>

      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-orange-900/60 m-1.5" />

      <CornerMedallion className="left-2 top-2" icon="reticle" />
      <CornerMedallion className="right-2 top-2" icon="suit" />
      <CornerMedallion className="bottom-2 left-2" icon="suit" />
      <CornerMedallion className="bottom-2 right-2" icon="reticle" />

      <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-5">
        {children}
      </div>
    </div>
  );
}
