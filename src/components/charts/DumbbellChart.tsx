export interface DumbbellDatum {
  key: string;
  label: string;
  before: number;
  after: number;
  beforeDisplay: string;
  afterDisplay: string;
}

/**
 * Before -> after per item, on one shared scale so magnitude is comparable
 * row to row. Muted dot = first attempt, accent dot = best since.
 */
export function DumbbellChart({ data }: { data: DumbbellDatum[] }) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => d.before));

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => {
        const beforePct = maxValue > 0 ? (d.before / maxValue) * 100 : 0;
        const afterPct = maxValue > 0 ? (d.after / maxValue) * 100 : 0;
        return (
          <div key={d.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs text-zinc-400" title={d.label}>
                {d.label}
              </span>
              <span className="shrink-0 font-mono text-xs text-zinc-300">
                {d.beforeDisplay} <span className="text-zinc-600">→</span> {d.afterDisplay}
              </span>
            </div>
            <div className="relative h-2.5 w-full">
              <div
                className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-orange-800"
                style={{ left: `${afterPct}%`, width: `${Math.max(beforePct - afterPct, 0)}%` }}
              />
              <div
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-500 ring-2 ring-black"
                style={{ left: `${beforePct}%` }}
              />
              <div
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400 ring-2 ring-black"
                style={{ left: `${afterPct}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-zinc-500" /> First attempt
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-400" /> Best since
        </span>
      </div>
    </div>
  );
}
