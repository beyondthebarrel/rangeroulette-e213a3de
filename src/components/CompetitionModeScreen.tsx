import { useMemo, useState } from "react";
import { classifierPdfUrl, CLASSIFIER_STAGES } from "../data/classifiers";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

export function CompetitionModeScreen({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CLASSIFIER_STAGES;
    return CLASSIFIER_STAGES.filter(
      (c) => c.number.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
            Competition Mode
          </h1>
          <p className="text-center text-sm text-zinc-400">
            USPSA's current active classifier roster. Each one links to the official stage PDF on
            uspsa.org — the diagram and full written procedure live there, not here.
          </p>
        </TitleFrame>

        <Panel>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number or name…"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
          />
          <div className="text-xs text-zinc-500">
            {filtered.length} of {CLASSIFIER_STAGES.length} classifiers
          </div>
        </Panel>

        <Panel>
          <ul className="flex flex-col gap-2">
            {filtered.map((c) => (
              <li
                key={c.number}
                className="flex items-center justify-between gap-3 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
              >
                <div>
                  <div className="text-sm text-white">
                    <span className="mr-2 font-mono text-orange-400">{c.number}</span>
                    {c.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {c.scoring} · {c.rounds != null ? `${c.rounds} rounds` : "round count varies"}
                  </div>
                </div>
                <a
                  href={classifierPdfUrl(c.number)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded border border-orange-700 px-3 py-1.5 text-xs uppercase tracking-wide text-orange-400 hover:bg-orange-950"
                >
                  View PDF
                </a>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-4 text-center text-sm text-zinc-500">No classifiers match that search.</li>
            )}
          </ul>
        </Panel>

        <button
          onClick={onBack}
          className="w-full rounded-md bg-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
        >
          Back
        </button>
      </div>
    </HeroBackdrop>
  );
}
