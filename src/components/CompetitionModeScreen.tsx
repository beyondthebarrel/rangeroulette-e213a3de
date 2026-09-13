import { useMemo, useState } from "react";
import { classifierPdfUrl, CLASSIFIER_STAGES } from "../data/classifiers";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { Stepper } from "./Stepper";
import { TitleFrame } from "./TitleFrame";

type PowerFactor = "major" | "minor";

export function CompetitionModeScreen({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");

  const [powerFactor, setPowerFactor] = useState<PowerFactor>("minor");
  const [aHits, setAHits] = useState(0);
  const [cHits, setCHits] = useState(0);
  const [dHits, setDHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState<number | null>(null);

  const cValue = powerFactor === "major" ? 4 : 3;
  const dValue = powerFactor === "major" ? 2 : 1;
  const totalPoints = aHits * 5 + cHits * cValue + dHits * dValue + misses * -10 + penalties * -10;
  const hitFactor = timeSeconds != null && timeSeconds > 0 ? totalPoints / timeSeconds : null;

  function resetCalculator() {
    setAHits(0);
    setCHits(0);
    setDHits(0);
    setMisses(0);
    setPenalties(0);
    setTimeSeconds(null);
  }

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
            <Stepper label={`D (${dValue} pt${dValue === 1 ? "" : "s"})`} value={dHits} onChange={setDHits} color="orange" />
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
        </Panel>

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
