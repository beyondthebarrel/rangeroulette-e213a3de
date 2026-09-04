import type { ReactNode } from "react";

function CornerMedallion({
  className,
  icon,
  variant,
}: {
  className: string;
  icon: "reticle" | "suit";
  variant: "orange" | "sky";
}) {
  return (
    <div
      className={`absolute flex h-9 w-9 items-center justify-center rounded-full border bg-black ${
        variant === "sky" ? "border-sky-700/80 text-sky-500" : "border-orange-700/80 text-orange-500"
      } ${className}`}
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

export function TitleFrame({
  children,
  variant = "orange",
}: {
  children: ReactNode;
  variant?: "orange" | "sky";
}) {
  return (
    <div
      className={`relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 px-4 pb-4 pt-6 sm:px-6 sm:pb-6 sm:pt-8 ${
        variant === "sky"
          ? "border-sky-700 shadow-[0_0_80px_rgba(2,132,199,0.2)]"
          : "border-orange-700 shadow-[0_0_80px_rgba(154,52,18,0.15)]"
      }`}
    >
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

      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl border m-1.5 ${
          variant === "sky" ? "border-sky-900/60" : "border-orange-900/60"
        }`}
      />

      <CornerMedallion className="left-2 top-2" icon="reticle" variant={variant} />
      <CornerMedallion className="right-2 top-2" icon="suit" variant={variant} />
      <CornerMedallion className="bottom-2 left-2" icon="suit" variant={variant} />
      <CornerMedallion className="bottom-2 right-2" icon="reticle" variant={variant} />

      <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-5">
        {children}
      </div>
    </div>
  );
}
