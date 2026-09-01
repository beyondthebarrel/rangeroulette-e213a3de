export interface BenchmarkAttemptPoint {
  date: string;
  seconds: number;
  passed: boolean;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Square viewBox so a coordinate doubles as a CSS percent — see LineChart for why.
const VIEW = 100;
const TOP_PAD = 14;
const BOTTOM_PAD = 10;

/**
 * Attempt times at a fixed benchmark drill, against its par-time standard.
 * The line is the raw data (neutral hue); the dashed line is the target;
 * each point's color carries the accuracy standard (pass/fail), since a
 * fast time alone doesn't mean the benchmark was actually cleared.
 */
export function BenchmarkProgressChart({
  attempts,
  par,
}: {
  attempts: BenchmarkAttemptPoint[];
  par: number;
}) {
  if (attempts.length === 0) return null;
  const maxValue = Math.max(par, ...attempts.map((a) => a.seconds)) * 1.08;
  const plotHeight = VIEW - TOP_PAD - BOTTOM_PAD;
  const n = attempts.length;

  function yFor(value: number): number {
    return TOP_PAD + (1 - value / maxValue) * plotHeight;
  }

  const points = attempts.map((a, i) => ({
    x: n > 1 ? (i / (n - 1)) * VIEW : VIEW / 2,
    y: yFor(a.seconds),
    a,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const parY = yFor(par);
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-32 w-full">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <line
            x1={0}
            y1={parY}
            x2={VIEW}
            y2={parY}
            stroke="#f97316"
            strokeWidth={1.5}
            strokeDasharray="3,2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={linePath}
            fill="none"
            stroke="#a1a1aa"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          className="absolute left-0 -translate-y-1/2 whitespace-nowrap text-[9px] text-orange-400"
          style={{ top: `${parY}%` }}
        >
          par {par}s
        </span>
        {points.map((p, i) => (
          <div
            key={`${p.a.date}-${i}`}
            className="absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            title={`${p.a.seconds.toFixed(2)}s · ${formatShortDate(p.a.date)} · ${
              p.a.passed ? "Passed" : "Missed standard"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ring-2 ring-black ${
                p.a.passed ? "bg-emerald-400" : "bg-zinc-500"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {attempts.map((a, i) => (
          <div key={`${a.date}-${i}`} className="flex-1 text-center text-[9px] text-zinc-500">
            {i % labelEvery === 0 ? formatShortDate(a.date) : " "}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Passed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-zinc-500" /> Missed standard
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 border-t-2 border-dashed border-orange-400" /> Par
        </span>
      </div>
    </div>
  );
}
