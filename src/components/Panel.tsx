import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  variant = "orange",
}: {
  children: ReactNode;
  className?: string;
  variant?: "orange" | "sky";
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-4 sm:p-6 ${
        variant === "sky"
          ? "border-sky-800/70 shadow-[0_0_50px_rgba(2,132,199,0.15)]"
          : "border-orange-800/70 shadow-[0_0_50px_rgba(154,52,18,0.1)]"
      } ${className}`}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]"
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
      <div className="relative z-10 flex flex-col gap-4">{children}</div>
    </div>
  );
}
