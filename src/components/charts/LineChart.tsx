export interface LineChartDatum {
  date: string;
  value: number;
}

function formatShortDate(dateStr: string): string {
  // dateStr is a bare "YYYY-MM-DD" bucket key. Parsing that directly (or via
  // `new Date(dateStr)`) reads it as UTC midnight, which can display as the
  // previous day in timezones behind UTC — build the date from local
  // components instead so the label always matches the bucket.
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Square viewBox (0-100 both axes) so a coordinate doubles as a CSS percent —
// markers/labels are plain HTML overlaid on the SVG, since a non-uniformly
// scaled viewBox would otherwise stretch circles/text into ellipses.
const VIEW = 100;
const TOP_PAD = 14;
const BOTTOM_PAD = 6;

/** Trend over time, single series: line + wash fill, dot at each point, marker at the latest. */
export function LineChart({ data }: { data: LineChartDatum[] }) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => d.value));
  const plotHeight = VIEW - TOP_PAD - BOTTOM_PAD;
  const n = data.length;

  const points = data.map((d, i) => {
    const x = n > 1 ? (i / (n - 1)) * VIEW : VIEW / 2;
    const y = TOP_PAD + (1 - (maxValue > 0 ? d.value / maxValue : 0)) * plotHeight;
    return { x, y, d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const baseline = VIEW - BOTTOM_PAD;
  const areaPath = `${linePath} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`;
  const peakIndex = data.reduce((best, d, i, arr) => (d.value > arr[best].value ? i : best), 0);
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-24 w-full">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <path d={areaPath} fill="#f97316" fillOpacity={0.1} stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke="#f97316"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {points.map((p, i) => {
          const isLast = i === n - 1;
          return (
            <div
              key={p.d.date}
              className="absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={`${p.d.value} reps · ${formatShortDate(p.d.date)}`}
            >
              {i === peakIndex && (
                <span className="absolute -top-4 whitespace-nowrap text-[10px] text-zinc-400">
                  {p.d.value}
                </span>
              )}
              <span
                className={
                  isLast
                    ? "h-2.5 w-2.5 rounded-full bg-orange-400 ring-2 ring-black"
                    : "h-1.5 w-1.5 rounded-full bg-orange-500"
                }
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center text-[9px] text-zinc-500">
            {i % labelEvery === 0 ? formatShortDate(d.date) : " "}
          </div>
        ))}
      </div>
    </div>
  );
}
