import { useMemo, useRef, useState } from "react";
import { classifierPdfUrl, CLASSIFIER_STAGES } from "../data/classifiers";
import { CLASSIFIER_HHF, DIVISION_LABELS, DIVISION_ORDER, type Division } from "../data/classifierHhf";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

// Fixed USPSA classification breakpoints — the percentage of a classifier's
// High Hit Factor (HHF) needed for each class. These never change; only the
// HHF itself (set per classifier, per division) does.
const CLASS_BREAKPOINTS: { label: string; pct: number }[] = [
  { label: "GM", pct: 0.95 },
  { label: "M", pct: 0.85 },
  { label: "A", pct: 0.75 },
  { label: "B", pct: 0.6 },
  { label: "C", pct: 0.4 },
];

export function CompetitionModeScreen({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState<Division | "">("");
  const [viewingNumber, setViewingNumber] = useState<string | null>(null);
  const [pdfOpened, setPdfOpened] = useState(false);
  // Deliberately not using noopener here — keeping the window reference is
  // what lets "Close PDF Tab" close it programmatically from this side.
  // uspsa.org is a fixed, trusted destination, so the usual reverse-tabnabbing
  // risk that noopener guards against doesn't really apply.
  const pdfWindowRef = useRef<Window | null>(null);

  function openPdf(url: string) {
    pdfWindowRef.current = window.open(url, "_blank");
    setPdfOpened(true);
  }

  function closePdf() {
    pdfWindowRef.current?.close();
    pdfWindowRef.current = null;
    setPdfOpened(false);
  }

  function backToList() {
    closePdf();
    setViewingNumber(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CLASSIFIER_STAGES;
    return CLASSIFIER_STAGES.filter(
      (c) => c.number.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [query]);

  const viewing = viewingNumber ? CLASSIFIER_STAGES.find((c) => c.number === viewingNumber) : null;

  if (viewing) {
    const pdfUrl = classifierPdfUrl(viewing.number);
    return (
      <HeroBackdrop>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <TitleFrame>
            <h1 className="text-xl font-bold uppercase tracking-wide text-orange-500">
              <span className="mr-2 font-mono">{viewing.number}</span>
              {viewing.name}
            </h1>
          </TitleFrame>

          <Panel>
            <p className="text-center text-sm text-zinc-400">
              USPSA's site doesn't allow its stage PDFs to be shown inline elsewhere, so this opens
              in a new tab. Use "Close PDF Tab" below when you're done to jump straight back here.
            </p>
            <button
              onClick={() => openPdf(pdfUrl)}
              className="w-full rounded-md bg-orange-700 px-4 py-3 text-center font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
            >
              🖨️ Open / Print / Save PDF
            </button>
            {pdfOpened && (
              <button
                onClick={closePdf}
                className="w-full rounded-md border-2 border-orange-700 px-4 py-2.5 text-center font-semibold uppercase tracking-wide text-orange-400 hover:bg-orange-950"
              >
                ✕ Close PDF Tab
              </button>
            )}
          </Panel>

          <button
            onClick={backToList}
            className="w-full rounded-md border-2 border-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-orange-400 hover:bg-orange-950"
          >
            ← Back to List
          </button>
        </div>
      </HeroBackdrop>
    );
  }

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
          <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
            Division
          </div>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value as Division | "")}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
          >
            <option value="">Select a division…</option>
            {DIVISION_ORDER.map((d) => (
              <option key={d} value={d}>
                {DIVISION_LABELS[d]}
              </option>
            ))}
          </select>
          <p className="text-[11px] leading-snug text-zinc-500">
            Classifying hit factors below come from USPSA's Classifier Committee HHF report
            (2025-03-23) — a dated snapshot, not a live feed. USPSA recalibrates HHFs at least
            semi-annually, and this doesn't yet cover the 25-series classifiers.
          </p>

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
            {filtered.map((c) => {
              const hhf = division ? CLASSIFIER_HHF[c.number]?.[division] : undefined;
              return (
                <li
                  key={c.number}
                  className="flex flex-col gap-2 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-white">
                        <span className="mr-2 font-mono text-orange-400">{c.number}</span>
                        {c.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {c.scoring} · {c.rounds != null ? `${c.rounds} rounds` : "round count varies"}
                      </div>
                    </div>
                    <button
                      onClick={() => setViewingNumber(c.number)}
                      className="shrink-0 rounded border border-orange-700 px-3 py-1.5 text-xs uppercase tracking-wide text-orange-400 hover:bg-orange-950"
                    >
                      View PDF
                    </button>
                  </div>

                  {division &&
                    (hhf != null ? (
                      <div className="flex flex-wrap gap-1.5 border-t border-zinc-800 pt-2">
                        {CLASS_BREAKPOINTS.map((b) => (
                          <span
                            key={b.label}
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                          >
                            <span className="font-bold text-white">{b.label}</span>{" "}
                            <span className="font-mono text-orange-400">{(hhf * b.pct).toFixed(4)}</span>
                          </span>
                        ))}
                        <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs">
                          <span className="font-bold text-white">D</span>{" "}
                          <span className="font-mono text-orange-400">below {(hhf * 0.4).toFixed(4)}</span>
                        </span>
                      </div>
                    ) : (
                      <div className="border-t border-zinc-800 pt-2 text-xs text-zinc-500">
                        No HHF on file yet for {DIVISION_LABELS[division]} on this classifier.
                      </div>
                    ))}
                </li>
              );
            })}
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
