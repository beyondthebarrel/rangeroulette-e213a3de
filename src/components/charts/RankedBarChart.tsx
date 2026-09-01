export interface RankedBarDatum {
  key: string;
  label: string;
  value: number;
  displayValue: string;
}

/**
 * Horizontal bars for comparing magnitude across categories (reps, best
 * times, etc). Single accent hue — the job here is magnitude, not identity,
 * so no per-bar color coding.
 */
export function RankedBarChart({ data }: { data: RankedBarDatum[] }) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => {
        const pct = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
        return (
          <div key={d.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs text-zinc-400" title={d.label}>
                {d.label}
              </span>
              <span className="shrink-0 font-mono text-xs text-zinc-300">{d.displayValue}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-sm bg-zinc-800">
              <div
                className="h-full rounded-r bg-red-500"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
