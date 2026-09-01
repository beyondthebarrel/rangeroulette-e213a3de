import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { BENCHMARKS, type BenchmarkDrill } from "../data/benchmarks";
import { CATEGORY_ORDER, type CategoryKey } from "../data/cards";
import {
  getMyDisplayName,
  getMyShootingLevel,
  listMyPistols,
  pistolLabel,
  type PistolInput,
} from "../profile";
import { uploadTrainingPhoto } from "../training/photos";
import {
  deleteSavedDrill,
  listSavedDrills,
  saveDrill,
  type SavedDrill,
} from "../training/savedDrills";
import { recordTrainingSession } from "../training/storage";
import type { TrainingDrill } from "../training/types";
import { useTrainingDrill } from "../training/useTrainingDrill";
import { HeroBackdrop } from "./HeroBackdrop";
import { ChartIcon, GridIcon, HistoryIcon } from "./icons";
import { Panel } from "./Panel";
import { PlayingCard } from "./PlayingCard";
import { Stepper } from "./Stepper";
import { TitleFrame } from "./TitleFrame";
import { UtilityButton } from "./UtilityButton";

const BENCHMARK_OPTION_VALUE = "__benchmark__";

export function TrainScreen({
  onBack,
  onOpenHistory,
  onOpenAnalytics,
}: {
  onBack: () => void;
  onOpenHistory: () => void;
  onOpenAnalytics: () => void;
}) {
  const { user } = useAuth();
  const { drill, drawNew } = useTrainingDrill();
  const [trainee, setTrainee] = useState<string | null>(null);
  const [rawSeconds, setRawSeconds] = useState<number | null>(null);
  const [zoneMisses, setZoneMisses] = useState(0);
  const [completeMisses, setCompleteMisses] = useState(0);
  const [lastLogged, setLastLogged] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logWarning, setLogWarning] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [pistols, setPistols] = useState<PistolInput[]>([]);
  const [selectedPistolId, setSelectedPistolId] = useState("");

  const [benchmark, setBenchmark] = useState<BenchmarkDrill | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<boolean | null>(null);

  const [savedDrills, setSavedDrills] = useState<SavedDrill[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedDrillError, setSavedDrillError] = useState<string | null>(null);

  const refreshSaved = useCallback(async () => {
    if (!user) return;
    setSavedDrills(await listSavedDrills(user.id));
  }, [user]);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyDisplayName(user.id, user.email).then((name) => {
      if (!cancelled) setTrainee(name);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listMyPistols(user.id).then((loaded) => {
      if (!cancelled) setPistols(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyShootingLevel(user.id).then((level) => {
      if (!cancelled) setBenchmark(level ? BENCHMARKS[level] : null);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const selectedSaved = savedDrills.find((d) => d.id === selectedSavedId) ?? null;
  const isBenchmarkSelected = selectedSavedId === BENCHMARK_OPTION_VALUE && !!benchmark;

  const randomSnapshot: TrainingDrill = {
    time: { cardId: drill.time.def.id, label: drill.time.def.label, detail: drill.time.def.detail },
    distance: {
      cardId: drill.distance.def.id,
      label: drill.distance.def.label,
      detail: drill.distance.def.detail,
    },
    startPosition: {
      cardId: drill.startPosition.def.id,
      label: drill.startPosition.def.label,
      detail: drill.startPosition.def.detail,
    },
    target: {
      cardId: drill.target.def.id,
      label: drill.target.def.label,
      detail: drill.target.def.detail,
    },
    courseOfFire: {
      cardId: drill.courseOfFire.def.id,
      label: drill.courseOfFire.def.label,
      detail: drill.courseOfFire.def.detail,
    },
    parSeconds: drill.time.def.parSeconds,
  };

  const activeDrill: TrainingDrill = isBenchmarkSelected
    ? benchmark!.drill
    : selectedSaved
      ? selectedSaved.drill
      : randomSnapshot;
  const parSeconds = activeDrill.parSeconds;
  const canLog = !!trainee && rawSeconds != null && !logging && !!user;

  function resetScoreFields() {
    setRawSeconds(null);
    setZoneMisses(0);
    setCompleteMisses(0);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function handleNewDrill() {
    setSelectedSavedId("");
    drawNew();
    resetScoreFields();
    clearPhoto();
    setLastLogged(null);
    setBenchmarkResult(null);
    setLogError(null);
    setLogWarning(null);
    setSavedDrillError(null);
  }

  async function handleSaveDrill() {
    if (!user || saveName.trim().length === 0) return;
    setSaving(true);
    setSavedDrillError(null);
    const saved = await saveDrill(user.id, saveName.trim(), activeDrill);
    setSaving(false);
    if (!saved) {
      setSavedDrillError("Couldn't save that drill — check your connection and try again.");
      return;
    }
    setSaveName("");
    setShowSave(false);
    await refreshSaved();
    setSelectedSavedId(saved.id);
  }

  async function handleDeleteSaved() {
    if (!selectedSaved) return;
    setSavedDrillError(null);
    const deleted = await deleteSavedDrill(selectedSaved.id);
    if (!deleted) {
      setSavedDrillError("Couldn't delete that drill — check your connection and try again.");
      return;
    }
    setSelectedSavedId("");
    await refreshSaved();
  }

  async function handleLog() {
    if (!canLog || rawSeconds == null || !user || !trainee) return;

    // Training Mode has no win/loss to score — Analytics already tracks raw
    // time and misses (accuracy) as separate, honest numbers, so the logged
    // time is just the time on the clock, with no Game Mode-style penalties
    // folded in.
    const finalSeconds = rawSeconds;
    setLogging(true);
    setLogError(null);
    setLogWarning(null);
    setLastLogged(null);
    setBenchmarkResult(null);

    let photoPath: string | undefined;
    let photoWarning: string | null = null;
    if (photoFile) {
      const uploaded = await uploadTrainingPhoto(user.id, photoFile);
      if (uploaded) {
        photoPath = uploaded;
      } else {
        photoWarning = "Result logged, but the photo failed to upload — try attaching it again.";
      }
    }

    const saved = await recordTrainingSession(
      {
        trainee,
        drill: activeDrill,
        rawSeconds,
        zoneMisses,
        completeMisses,
        finalSeconds,
        savedDrillName: selectedSaved?.name,
        photoPath,
        pistolId: selectedPistolId || undefined,
      },
      user.id,
    );
    setLogging(false);

    if (!saved) {
      setLogError("Couldn't save that result — check your connection and try again.");
      return;
    }

    setLastLogged(finalSeconds);
    setLogWarning(photoWarning);
    if (isBenchmarkSelected && benchmark) {
      const par = benchmark.drill.parSeconds ?? Infinity;
      setBenchmarkResult(
        rawSeconds <= par &&
          zoneMisses <= benchmark.maxZoneMisses &&
          completeMisses <= benchmark.maxCompleteMisses,
      );
    }
    if (!selectedSaved && !isBenchmarkSelected) drawNew();
    resetScoreFields();
    clearPhoto();
  }

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
            Train Mode
          </h1>

          <div className="text-center text-sm text-zinc-400">
            Training as <span className="font-semibold text-white">{trainee ?? "…"}</span>
          </div>
        </TitleFrame>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {isBenchmarkSelected
                ? `🎯 Benchmark — ${benchmark!.name}`
                : selectedSaved
                  ? `Saved Drill — ${selectedSaved.name}`
                  : "The Drill"}
            </div>
            <div className="flex flex-wrap gap-2">
              {benchmark && (
                <button
                  onClick={() => {
                    setSelectedSavedId(BENCHMARK_OPTION_VALUE);
                    resetScoreFields();
                    setLastLogged(null);
                    setBenchmarkResult(null);
                    setSavedDrillError(null);
                  }}
                  className={`rounded border px-3 py-1 text-xs uppercase tracking-wide ${
                    isBenchmarkSelected
                      ? "border-orange-500 bg-orange-950/40 text-orange-400"
                      : "border-orange-700 text-orange-400 hover:bg-orange-950"
                  }`}
                >
                  🎯 Benchmark
                </button>
              )}
              <button
                onClick={() => {
                  setShowSave((v) => !v);
                  setSavedDrillError(null);
                }}
                className="rounded border border-zinc-600 px-3 py-1 text-xs uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
              >
                Save Drill
              </button>
              <button
                onClick={handleNewDrill}
                className="rounded border border-orange-700 px-3 py-1 text-xs uppercase tracking-wide text-orange-400 hover:bg-orange-950"
              >
                New Drill
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSavedId}
              onChange={(e) => {
                setSelectedSavedId(e.target.value);
                resetScoreFields();
                setLastLogged(null);
                setBenchmarkResult(null);
                setSavedDrillError(null);
              }}
              className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
            >
              <option value="">Random draw</option>
              {benchmark && (
                <option value={BENCHMARK_OPTION_VALUE}>🎯 Benchmark — {benchmark.name}</option>
              )}
              {savedDrills.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {selectedSaved && (
              <button
                onClick={handleDeleteSaved}
                className="rounded border border-zinc-700 px-3 py-2 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
              >
                Delete
              </button>
            )}
          </div>

          {showSave && (
            <div className="flex gap-2">
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Drill name"
                className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
              />
              <button
                disabled={saving || saveName.trim().length === 0 || !user}
                onClick={handleSaveDrill}
                className="rounded bg-orange-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}

          {savedDrillError != null && (
            <div className="text-sm text-amber-400">{savedDrillError}</div>
          )}

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {CATEGORY_ORDER.map((cat: CategoryKey) => (
              <PlayingCard key={cat} cardId={activeDrill[cat].cardId} />
            ))}
          </div>
        </Panel>

        <Panel>
          {pistols.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Pistol
              </div>
              <select
                value={selectedPistolId}
                onChange={(e) => setSelectedPistolId(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
              >
                <option value="">Not tagged</option>
                {pistols.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pistolLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={rawSeconds ?? ""}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                setRawSeconds(Number.isNaN(n) ? null : n);
              }}
              placeholder="seconds"
              className="w-28 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white"
            />
            <span className="text-sm text-zinc-500">
              seconds{parSeconds != null ? ` — par ${parSeconds}s` : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Zone misses" value={zoneMisses} onChange={setZoneMisses} />
            <Stepper label="Complete misses" value={completeMisses} onChange={setCompleteMisses} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Target Photo
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
              id="target-photo-input"
            />
            {photoPreviewUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={photoPreviewUrl}
                  alt="Target photo preview"
                  className="h-20 w-20 rounded border border-zinc-700 object-cover"
                />
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="target-photo-input"
                    className="cursor-pointer rounded border border-zinc-600 px-3 py-1 text-center text-xs uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
                  >
                    Retake / Change
                  </label>
                  <button
                    onClick={clearPhoto}
                    className="rounded border border-zinc-700 px-3 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="target-photo-input"
                className="w-full cursor-pointer rounded border border-dashed border-zinc-600 px-3 py-3 text-center text-sm text-zinc-400 hover:border-orange-700 hover:text-orange-400"
              >
                Take / Add Photo
              </label>
            )}
          </div>

          {logError != null && (
            <div className="text-sm text-amber-400">{logError}</div>
          )}

          {logWarning != null && (
            <div className="text-sm text-amber-400">{logWarning}</div>
          )}

          {lastLogged != null && (
            <div className="text-sm text-orange-400">
              Logged: {lastLogged.toFixed(2)}s
            </div>
          )}

          {benchmarkResult != null && (
            <div
              className={`text-sm font-semibold ${
                benchmarkResult ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {benchmarkResult ? "🎯 Benchmark achieved!" : "Not yet — beat the standard to pass."}
            </div>
          )}

          <button
            disabled={!canLog}
            onClick={handleLog}
            className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {logging ? "Logging…" : "Log Result"}
          </button>
        </Panel>

        <div className="grid grid-cols-3 gap-2">
          <UtilityButton
            icon={<HistoryIcon className="h-4 w-4" />}
            label="History"
            onClick={onOpenHistory}
          />
          <UtilityButton
            icon={<ChartIcon className="h-4 w-4" />}
            label="Training Analytics"
            onClick={onOpenAnalytics}
          />
          <UtilityButton icon={<GridIcon className="h-4 w-4" />} label="Modes" onClick={onBack} />
        </div>
      </div>
    </HeroBackdrop>
  );
}
