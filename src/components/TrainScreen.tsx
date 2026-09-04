import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { BENCHMARKS, type BenchmarkDrill } from "../data/benchmarks";
import { CATEGORY_ORDER, type CategoryKey } from "../data/cards";
import { useOnlineStatus } from "../offline/useOnlineStatus";
import {
  getMyDisplayName,
  getMyShootingLevel,
  listMyPistols,
  pistolLabel,
  type PistolInput,
} from "../profile";
import { enqueueSession, getPendingSessions, PENDING_ID_PREFIX } from "../training/offlineQueue";
import { uploadTrainingPhoto } from "../training/photos";
import {
  deleteAllSavedDrills,
  deleteSavedDrill,
  listSavedDrills,
  saveDrill,
  type SavedDrill,
} from "../training/savedDrills";
import { recordTrainingSession, updateSessionNotes } from "../training/storage";
import type { TrainingDrill } from "../training/types";
import { useTrainingDrill } from "../training/useTrainingDrill";
import { uploadTrainingVideo } from "../training/videos";
import { HeroBackdrop } from "./HeroBackdrop";
import { ChartIcon, GridIcon, HistoryIcon } from "./icons";
import { Panel } from "./Panel";
import { PlayingCard } from "./PlayingCard";
import { Stepper } from "./Stepper";
import { TitleFrame } from "./TitleFrame";
import { UtilityButton } from "./UtilityButton";
import { VideoCapture, type CapturedVideo } from "./VideoCapture";

const BENCHMARK_OPTION_PREFIX = "__benchmark__";
function benchmarkOptionValue(id: string): string {
  return `${BENCHMARK_OPTION_PREFIX}${id}`;
}

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
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [trainee, setTrainee] = useState<string | null>(null);
  const [rawSeconds, setRawSeconds] = useState<number | null>(null);
  const [zoneMisses, setZoneMisses] = useState(0);
  const [completeMisses, setCompleteMisses] = useState(0);
  const [lastLogged, setLastLogged] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logWarning, setLogWarning] = useState<string | null>(null);

  const [lastLoggedSessionId, setLastLoggedSessionId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [video, setVideo] = useState<CapturedVideo | null>(null);

  const [pistols, setPistols] = useState<PistolInput[]>([]);
  const [selectedPistolId, setSelectedPistolId] = useState("");

  const [benchmarks, setBenchmarks] = useState<BenchmarkDrill[]>([]);
  const [benchmarkResult, setBenchmarkResult] = useState<boolean | null>(null);

  const [savedDrills, setSavedDrills] = useState<SavedDrill[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedDrillError, setSavedDrillError] = useState<string | null>(null);

  const [showManageSaved, setShowManageSaved] = useState(false);
  const [confirmingDeleteSavedId, setConfirmingDeleteSavedId] = useState<string | null>(null);
  const [deletingSavedId, setDeletingSavedId] = useState<string | null>(null);
  const [confirmingClearSaved, setConfirmingClearSaved] = useState(false);
  const [clearingSaved, setClearingSaved] = useState(false);

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
      if (!cancelled) setBenchmarks(level ? BENCHMARKS[level] : []);
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

  useEffect(() => {
    return () => {
      if (video) URL.revokeObjectURL(video.previewUrl);
    };
  }, [video]);

  useEffect(() => {
    if (!user) return;
    setPendingCount(getPendingSessions(user.id).length);
    if (!online) return;
    // Give a just-reconnected sync a moment to finish before re-checking,
    // rather than reading the queue mid-flush.
    const t = setTimeout(() => setPendingCount(getPendingSessions(user.id).length), 2000);
    return () => clearTimeout(t);
  }, [user, online]);

  const selectedSaved = savedDrills.find((d) => d.id === selectedSavedId) ?? null;
  const selectedBenchmark =
    benchmarks.find((b) => selectedSavedId === benchmarkOptionValue(b.id)) ?? null;

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

  const activeDrill: TrainingDrill = selectedBenchmark
    ? selectedBenchmark.drill
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

  // The note opportunity is tied to whichever session was just logged — once
  // the drill changes, that window closes rather than silently attaching a
  // stray note to whatever gets logged next.
  function resetNoteState() {
    setLastLoggedSessionId(null);
    setNoteDraft("");
    setNoteSaved(false);
    setNoteError(null);
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
    setVideo(null);
    resetNoteState();
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
    await handleDeleteSavedById(selectedSaved.id);
  }

  // Saved drills are just templates (name + drill config) in their own
  // table — a logged session snapshots its drill/name at log time instead of
  // referencing this row, so deleting or clearing templates here never
  // touches History or Analytics.
  async function handleDeleteSavedById(id: string) {
    setDeletingSavedId(id);
    setSavedDrillError(null);
    const deleted = await deleteSavedDrill(id);
    setDeletingSavedId(null);
    setConfirmingDeleteSavedId(null);
    if (!deleted) {
      setSavedDrillError("Couldn't delete that drill — check your connection and try again.");
      return;
    }
    if (selectedSavedId === id) setSelectedSavedId("");
    await refreshSaved();
  }

  async function handleClearAllSaved() {
    if (!user) return;
    setClearingSaved(true);
    setSavedDrillError(null);
    const cleared = await deleteAllSavedDrills(user.id);
    setClearingSaved(false);
    setConfirmingClearSaved(false);
    if (!cleared) {
      setSavedDrillError("Couldn't clear saved drills — check your connection and try again.");
      return;
    }
    if (selectedSaved) setSelectedSavedId("");
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
    resetNoteState();

    const mediaWarnings: string[] = [];

    let photoPath: string | undefined;
    if (photoFile && navigator.onLine) {
      const uploaded = await uploadTrainingPhoto(user.id, photoFile);
      if (uploaded) {
        photoPath = uploaded;
      } else {
        mediaWarnings.push("the photo failed to upload — try attaching it again");
      }
    } else if (photoFile) {
      mediaWarnings.push("the photo needs a connection to attach, so it was skipped");
    }

    let videoPath: string | undefined;
    if (video && navigator.onLine) {
      const uploaded = await uploadTrainingVideo(user.id, video.file);
      if (uploaded) {
        videoPath = uploaded;
      } else {
        mediaWarnings.push("the video failed to upload — try attaching it again");
      }
    } else if (video) {
      mediaWarnings.push("the video needs a connection to attach, so it was skipped");
    }

    const sessionPayload = {
      trainee,
      drill: activeDrill,
      rawSeconds,
      zoneMisses,
      completeMisses,
      finalSeconds,
      savedDrillName: selectedSaved?.name,
      photoPath,
      videoPath,
      pistolId: selectedPistolId || undefined,
    };

    // Only attempt the network write if the browser thinks it's connected —
    // otherwise skip straight to queuing so a dead connection doesn't stall
    // the button for a request that's guaranteed to fail.
    const saved = navigator.onLine ? await recordTrainingSession(sessionPayload, user.id) : null;
    setLogging(false);

    let queuedOffline = false;
    if (saved) {
      setLastLoggedSessionId(saved.id);
    } else {
      if (!navigator.onLine) {
        const queued = enqueueSession(sessionPayload, user.id);
        setPendingCount(getPendingSessions(user.id).length);
        setLastLoggedSessionId(`${PENDING_ID_PREFIX}${queued.localId}`);
        queuedOffline = true;
      } else {
        setLogError("Couldn't save that result — check your connection and try again.");
        return;
      }
    }

    setLastLogged(finalSeconds);
    setLogWarning(
      queuedOffline
        ? "Saved offline — will sync automatically once you're back online."
        : mediaWarnings.length > 0
          ? `Result logged, but ${mediaWarnings.join(" and ")}.`
          : null,
    );
    if (selectedBenchmark) {
      const par = selectedBenchmark.drill.parSeconds ?? Infinity;
      setBenchmarkResult(
        rawSeconds <= par &&
          zoneMisses <= selectedBenchmark.maxZoneMisses &&
          completeMisses <= selectedBenchmark.maxCompleteMisses,
      );
    }
    // The drill (random, saved, or benchmark) stays on screen after logging
    // so the same drill can be repeated for another rep — advancing to a
    // different one is always an explicit "Next Drill" click, not automatic.
    resetScoreFields();
    clearPhoto();
    setVideo(null);
  }

  async function handleSaveNote() {
    if (!lastLoggedSessionId) return;
    setSavingNote(true);
    setNoteError(null);
    const ok = await updateSessionNotes(lastLoggedSessionId, noteDraft);
    setSavingNote(false);
    if (!ok) {
      setNoteError("Couldn't save that note — check your connection and try again.");
      return;
    }
    setNoteSaved(true);
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

        {(!online || pendingCount > 0) && (
          <div className="flex items-center justify-center gap-2 rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-amber-400">
            {!online ? "📴 Offline — results will save on this device and sync later" : "🔄 Syncing offline results…"}
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-800/60 px-2 py-0.5 text-amber-200">
                {pendingCount} pending
              </span>
            )}
          </div>
        )}

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {selectedBenchmark
                ? `🎯 Benchmark — ${selectedBenchmark.name}`
                : selectedSaved
                  ? `Saved Drill — ${selectedSaved.name}`
                  : "The Drill"}
            </div>
            <div className="flex flex-wrap gap-2">
              {benchmarks.map((b, i) => (
                <button
                  key={b.id}
                  title={b.name}
                  onClick={() => {
                    setSelectedSavedId(benchmarkOptionValue(b.id));
                    resetScoreFields();
                    resetNoteState();
                    setLastLogged(null);
                    setBenchmarkResult(null);
                    setSavedDrillError(null);
                  }}
                  className={`rounded border px-3 py-1 text-xs uppercase tracking-wide ${
                    selectedBenchmark?.id === b.id
                      ? "border-orange-500 bg-orange-950/40 text-orange-400"
                      : "border-orange-700 text-orange-400 hover:bg-orange-950"
                  }`}
                >
                  🎯 {i + 1}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowSave((v) => !v);
                  setSavedDrillError(null);
                }}
                className="rounded border border-zinc-600 px-3 py-1 text-xs uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
              >
                Save Drill
              </button>
              {savedDrills.length > 0 && (
                <button
                  onClick={() => {
                    setShowManageSaved((v) => !v);
                    setSavedDrillError(null);
                    setConfirmingDeleteSavedId(null);
                    setConfirmingClearSaved(false);
                  }}
                  className={`rounded border px-3 py-1 text-xs uppercase tracking-wide ${
                    showManageSaved
                      ? "border-zinc-400 bg-zinc-800 text-white"
                      : "border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  Manage Saved
                </button>
              )}
              <button
                onClick={handleNewDrill}
                className="rounded border border-orange-700 px-3 py-1 text-xs uppercase tracking-wide text-orange-400 hover:bg-orange-950"
              >
                Next Drill
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSavedId}
              onChange={(e) => {
                setSelectedSavedId(e.target.value);
                resetScoreFields();
                resetNoteState();
                setLastLogged(null);
                setBenchmarkResult(null);
                setSavedDrillError(null);
              }}
              className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
            >
              <option value="">Random draw</option>
              {benchmarks.map((b) => (
                <option key={b.id} value={benchmarkOptionValue(b.id)}>
                  🎯 Benchmark — {b.name}
                </option>
              ))}
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

          {showManageSaved && (
            <div className="flex flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Saved Drills
                </div>
                {confirmingClearSaved ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-400">Clear all {savedDrills.length}?</span>
                    <button
                      onClick={handleClearAllSaved}
                      disabled={clearingSaved}
                      className="rounded bg-orange-700 px-2 py-1 text-white hover:bg-orange-600 disabled:opacity-60"
                    >
                      {clearingSaved ? "…" : "Yes, Clear"}
                    </button>
                    <button
                      onClick={() => setConfirmingClearSaved(false)}
                      disabled={clearingSaved}
                      className="rounded bg-zinc-700 px-2 py-1 text-white hover:bg-zinc-600"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmingClearSaved(true)}
                    className="rounded border border-zinc-600 px-2 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <p className="text-[11px] leading-snug text-zinc-500">
                Only removes these templates — your logged times stay intact in History and
                Analytics.
              </p>
              <ul className="flex flex-col gap-1.5">
                {savedDrills.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5"
                  >
                    <span className="text-sm text-white">{d.name}</span>
                    {confirmingDeleteSavedId === d.id ? (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="text-zinc-400">Delete?</span>
                        <button
                          onClick={() => handleDeleteSavedById(d.id)}
                          disabled={deletingSavedId === d.id}
                          className="rounded bg-orange-700 px-1.5 py-0.5 text-white hover:bg-orange-600 disabled:opacity-60"
                        >
                          {deletingSavedId === d.id ? "…" : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteSavedId(null)}
                          disabled={deletingSavedId === d.id}
                          className="rounded bg-zinc-700 px-1.5 py-0.5 text-white hover:bg-zinc-600"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingDeleteSavedId(d.id)}
                        aria-label={`Delete ${d.name}`}
                        title="Delete"
                        className="text-zinc-500 hover:text-orange-400"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
              Target Photo{!online && <span className="ml-1 normal-case text-zinc-500">(needs a connection to attach)</span>}
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

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Target Video{!online && <span className="ml-1 normal-case text-zinc-500">(needs a connection to attach)</span>}
            </div>
            <VideoCapture value={video} onChange={setVideo} disabled={!online} />
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

          {lastLoggedSessionId != null && (
            <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Notes on this rep
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => {
                  setNoteDraft(e.target.value);
                  setNoteSaved(false);
                }}
                placeholder="e.g. throwing low left, check grip — before the next drill"
                rows={2}
                className="w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="rounded border border-zinc-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 enabled:hover:bg-zinc-800 disabled:opacity-60"
                >
                  {savingNote ? "Saving…" : "Save Note"}
                </button>
                {noteSaved && <span className="text-xs text-emerald-400">✓ Saved</span>}
              </div>
              {noteError != null && <div className="text-xs text-amber-400">{noteError}</div>}
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
