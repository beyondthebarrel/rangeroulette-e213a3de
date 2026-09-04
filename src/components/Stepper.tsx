const COLOR_CLASSES: Record<string, string> = {
  amber: "bg-amber-600 hover:bg-amber-500 shadow-[0_0_10px_rgba(217,119,6,0.4)]",
  red: "bg-red-700 hover:bg-red-600 shadow-[0_0_10px_rgba(185,28,28,0.4)]",
  orange: "bg-orange-700 hover:bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.4)]",
};

const LABEL_COLOR_CLASSES: Record<string, string> = {
  amber: "text-amber-400",
  red: "text-red-400",
  orange: "text-orange-400",
};

export function Stepper({
  label,
  value,
  onChange,
  color = "orange",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color?: "amber" | "red" | "orange";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-sm font-bold uppercase tracking-wide ${LABEL_COLOR_CLASSES[color]}`}>{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className={`h-8 w-8 rounded-md text-lg font-bold text-white ${COLOR_CLASSES[color]}`}
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-lg font-bold text-white">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className={`h-8 w-8 rounded-md text-lg font-bold text-white ${COLOR_CLASSES[color]}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
