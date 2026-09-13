/** Lightweight "← Back" link for the top of a screen — a quick way back without
 * scrolling to the full-size Back button most screens already have at the bottom. */
export function BackLink({
  onClick,
  label = "Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="self-start text-xs uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
    >
      ← {label}
    </button>
  );
}
