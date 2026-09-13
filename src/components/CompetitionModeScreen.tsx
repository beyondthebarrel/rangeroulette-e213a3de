import { useMemo, useRef, useState } from "react";
import { classifierDiagramUrl, classifierPdfUrl, CLASSIFIER_STAGES } from "../data/classifiers";
import { CLASSIFIER_HHF, DIVISION_LABELS, DIVISION_ORDER, type Division } from "../data/classifierHhf";
import { BackLink } from "./BackLink";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { Stepper } from "./Stepper";
import { TitleFrame } from "./TitleFrame";

type PowerFactor = "major" | "minor";

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

function classForPercent(percent: number): string {
  const hit = CLASS_BREAKPOINTS.find((b) => percent >= b.pct * 100);
  return hit ? hit.label : "D";
}

export function CompetitionModeScreen({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState<Division | "">("");

  const [powerFactor, setPowerFactor] = useState<PowerFactor>("minor");
  const [aHits, setAHits] = useState(0);
  const [cHits, setCHits] = useState(0);
  const [dHits, setDHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState<number | null>(null);
  const [showClassPopup, setShowClassPopup] = useState(false);

  const cValue = powerFactor === "major" ? 4 : 3;
  const dValue = powerFactor === "major" ? 2 : 1;
  const totalPoints = aHits * 5 + cHits * cValue + dHits * dValue + misses * -10 + penalties * -10;
  const hitFactor = timeSeconds != null && timeSeconds > 0 ? totalPoints / timeSeconds : null;

  function resetCalculator() {
    setPowerFactor("minor");
    setAHits(0);
    setCHits(0);
    setDHits(0);
    setMisses(0);
    setPenalties(0);
    setTimeSeconds(null);
    setShowClassPopup(false);
  }
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
    resetCalculator();
  }

  function viewStage(number: string) {
    resetCalculator();
    setViewingNumber(number);
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
    const stageHhf = division ? CLASSIFIER_HHF[viewing.number]?.[division] : undefined;
    const percentOfHhf =
      hitFactor != null && stageHhf != null && stageHhf > 0 ? (hitFactor / stageHhf) * 100 : null;

    return (
      <HeroBackdrop>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <TitleFrame>
            <BackLink onClick={backToList} label="List" />
            <h1 className="text-xl font-bold uppercase tracking-wide text-orange-500">
              <span className="mr-2 font-mono">{viewing.number}</span>
              {viewing.name}
            </h1>
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              {viewing.scoring} ·{" "}
              {viewing.rounds != null ? `${viewing.rounds} rounds total` : "round count varies"}
            </div>
            <p className="text-center text-sm text-zinc-400">{viewing.description}</p>
          </TitleFrame>

          <Panel>
            <img
              src={classifierDiagramUrl(viewing.number)}
              alt={`${viewing.number} ${viewing.name} stage setup diagram`}
              className="w-full rounded-lg border border-zinc-700 bg-white"
            />
            <p className="text-center text-[11px] leading-snug text-zinc-500">
              Setup diagram from USPSA's official stage PDF — open the full PDF below for exact
              dimensions and the written procedure.
            </p>
          </Panel>

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
              HHF values come from USPSA's Classifier Committee HHF report (2025-03-23) — a dated
              snapshot, not a live feed. USPSA recalibrates HHFs at least semi-annually, and this
              doesn't yet cover the 25-series classifiers.
            </p>
            {division && stageHhf == null && (
              <p className="text-xs text-zinc-500">
                No HHF on file yet for {DIVISION_LABELS[division]} on this classifier.
              </p>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                Hit Factor Calculator
              </div>
              <button
                onClick={resetCalculator}
                className="rounded border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
              >
                Reset
              </button>
            </div>

            <div className="flex gap-2">
              {(["minor", "major"] as PowerFactor[]).map((pf) => (
                <button
                  key={pf}
                  onClick={() => setPowerFactor(pf)}
                  className={`flex-1 rounded border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    powerFactor === pf
                      ? "border-orange-500 bg-orange-950/40 text-orange-400"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {pf} power factor
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Stepper label="A (5 pts)" value={aHits} onChange={setAHits} color="emerald" />
              <Stepper label={`C (${cValue} pts)`} value={cHits} onChange={setCHits} color="amber" />
              <Stepper
                label={`D (${dValue} pt${dValue === 1 ? "" : "s"})`}
                value={dHits}
                onChange={setDHits}
                color="orange"
              />
              <Stepper label="Misses (−10)" value={misses} onChange={setMisses} color="red" />
              <Stepper
                label="Penalties (−10 each)"
                value={penalties}
                onChange={setPenalties}
                color="violet"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={timeSeconds ?? ""}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  setTimeSeconds(Number.isNaN(n) ? null : n);
                  setShowClassPopup(false);
                }}
                onBlur={() => {
                  if (percentOfHhf != null) setShowClassPopup(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder="0.00"
                className="w-28 rounded-md border-2 border-orange-700 bg-zinc-900 px-2 py-1.5 text-xl font-bold text-orange-400 focus:border-orange-500 focus:outline-none"
              />
              <span className="text-sm text-zinc-500">seconds (raw time)</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Total points</div>
                <div className="font-mono text-xl font-bold text-white">{totalPoints}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Hit factor</div>
                <div className="font-mono text-2xl font-bold text-orange-400">
                  {hitFactor != null ? hitFactor.toFixed(4) : "—"}
                </div>
              </div>
            </div>

            {!division && (
              <p className="text-center text-xs text-zinc-500">
                Pick your division above to see your class for this run.
              </p>
            )}

            {stageHhf != null && (
              <>
                <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400">
                  <span>This classifier's HHF ({division && DIVISION_LABELS[division]})</span>
                  <span className="font-mono text-orange-400">{stageHhf.toFixed(4)}</span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {CLASS_BREAKPOINTS.map((b) => (
                    <li
                      key={b.label}
                      className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5"
                    >
                      <span className="text-sm font-bold text-white">
                        {b.label}{" "}
                        <span className="text-xs font-normal text-zinc-500">
                          ({(b.pct * 100).toFixed(0)}%+)
                        </span>
                      </span>
                      <span className="font-mono text-sm text-orange-400">
                        {(stageHhf * b.pct).toFixed(4)}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">
                    <span className="text-sm font-bold text-white">
                      D <span className="text-xs font-normal text-zinc-500">(below 40%)</span>
                    </span>
                    <span className="font-mono text-sm text-orange-400">
                      below {(stageHhf * 0.4).toFixed(4)}
                    </span>
                  </li>
                </ul>

                {percentOfHhf != null && !showClassPopup && (
                  <button
                    onClick={() => setShowClassPopup(true)}
                    className="w-full rounded-lg border border-orange-600 bg-orange-950/30 p-3 text-center text-sm text-orange-300 hover:bg-orange-950/50"
                  >
                    View classification for this run →
                  </button>
                )}
              </>
            )}
          </Panel>

          <button
            onClick={backToList}
            className="w-full rounded-md border-2 border-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-orange-400 hover:bg-orange-950"
          >
            ← Back to List
          </button>
        </div>

        {showClassPopup && percentOfHhf != null && stageHhf != null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowClassPopup(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl border-2 border-orange-600 bg-zinc-950 p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {viewing.number} {viewing.name}
              </div>
              <div className="mt-3 text-7xl font-black text-orange-500">
                {classForPercent(percentOfHhf)}
              </div>
              <div className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Class</div>

              <div className="mt-4 flex justify-center gap-6">
                <div>
                  <div className="font-mono text-xl font-bold text-white">{hitFactor?.toFixed(4)}</div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Hit factor</div>
                </div>
                <div>
                  <div className="font-mono text-xl font-bold text-white">{percentOfHhf.toFixed(2)}%</div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    of {division && DIVISION_LABELS[division]} HHF
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowClassPopup(false)}
                className="mt-6 w-full rounded-md bg-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </HeroBackdrop>
    );
  }

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <BackLink onClick={onBack} />
          <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
            Competition Mode
          </h1>
          <p className="text-center text-sm text-zinc-400">
            USPSA's current active classifier roster. Tap a classifier to open its stage PDF and
            score your run — you'll pick your division on that screen.
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
                className="flex flex-col gap-2 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
              >
                <button
                  onClick={() => viewStage(c.number)}
                  className="flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <div className="text-sm text-white">
                      <span className="mr-2 font-mono text-orange-400">{c.number}</span>
                      {c.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {c.scoring} · {c.rounds != null ? `${c.rounds} rounds` : "round count varies"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">{c.description}</div>
                  </div>
                  <span className="shrink-0 self-start rounded border border-orange-700 px-3 py-1.5 text-xs uppercase tracking-wide text-orange-400 hover:bg-orange-950">
                    Score Run →
                  </span>
                </button>
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
