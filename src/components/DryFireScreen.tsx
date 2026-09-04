import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { CATEGORY_DECKS, CATEGORY_LABELS, CATEGORY_ORDER, type CategoryCardDef, type CategoryKey } from "../data/cards";

// Dry fire has no live rounds and often happens in a smaller space than a
// range bay, so a few cards from the shared decks don't fit here — everything
// else (including all Time cards) stays exactly what Live Fire Train Mode uses.
const EXCLUDED_CARD_IDS = new Set([
  "distance-10",
  "distance-12",
  "sp-kneeling-wrists-above-shoulders",
  "cof-failure-drill",
  "cof-3-each-target",
  "cof-2-strong-hand",
]);

const DRY_FIRE_DECKS: Record<CategoryKey, CategoryCardDef[]> = CATEGORY_ORDER.reduce(
  (acc, cat) => {
    acc[cat] = CATEGORY_DECKS[cat].filter((c) => !EXCLUDED_CARD_IDS.has(c.id));
    return acc;
  },
  {} as Record<CategoryKey, CategoryCardDef[]>,
);
import { useOnlineStatus } from "../offline/useOnlineStatus";
import { getMyDisplayName, listMyPistols, pistolLabel, type PistolInput } from "../profile";
import { enqueueSession, getPendingSessions, PENDING_ID_PREFIX } from "../training/offlineQueue";
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
import { TitleFrame } from "./TitleFrame";
import { UtilityButton } from "./UtilityButton";
import { VideoCapture, type CapturedVideo } from "./VideoCapture";

export function DryFireScreen({
  onBack,
  onOpenHistory,
  onOpenAnalytics,
  initialDrill,
  onInitialDrillConsumed,
}: {
  onBack: () => void;
  onOpenHistory: () => void;
  onOpenAnalytics: () => void;
  initialDrill?: TrainingDrill;
  onInitialDrillConsumed?: () => void;
}) {
  const { user } = useAuth();
  const { drill, drawNew } = useTrainingDrill(DRY_FIRE_DECKS);
  // A drill repeated from History — a fixed configuration like a saved
  // drill, but never persisted. Captured once from initialDrill on mount;
  // onInitialDrillConsumed tells the parent to drop its copy so leaving and
  // returning to Dry Fire Mode later doesn't resurrect it.
  const [repeatedDrill, setRepeatedDrill] = useState<TrainingDrill | null>(initialDrill ?? null);
  useEffect(() => {
    if (initialDrill) onInitialDrillConsumed?.();
    // Only ever meant to run once, against the drill this screen mounted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [trainee, setTrainee] = useState<string | null>(null);
  const [rawSeconds, setRawSeconds] = useState<number | null>(null);
  const [lastLogged, setLastLogged] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logWarning, setLogWarning] = useState<string | null>(null);

  const [lastLoggedSessionId, setLastLoggedSessionId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [video, setVideo] = useState<CapturedVideo | null>(null);

  const [pistols, setPistols] = useState<PistolInput[]>([]);
  const [selectedPistolId, setSelectedPistolId] = useState("");

  // Hand-picked substitutions for the current random draw, one per category
  // at most — cleared whenever "Next Drill" deals a fresh hand.
  const [overrides, setOverrides] = useState<Partial<Record<CategoryKey, CategoryCardDef>>>({});

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

  function drillCardFor(cat: CategoryKey) {
    const def = overrides[cat] ?? drill[cat].def;
    return def.detail ? { cardId: def.id, label: def.label, detail: def.detail } : { cardId: def.id, label: def.label };
  }

  const randomSnapshot: TrainingDrill = {
    time: drillCardFor("time"),
    distance: drillCardFor("distance"),
    startPosition: drillCardFor("startPosition"),
    target: drillCardFor("target"),
    courseOfFire: drillCardFor("courseOfFire"),
    parSeconds: (overrides.time ?? drill.time.def).parSeconds,
  };

  const activeDrill: TrainingDrill = selectedSaved
    ? selectedSaved.drill
    : repeatedDrill
      ? repeatedDrill
      : randomSnapshot;
  const parSeconds = activeDrill.parSeconds;
  const canLog = !!trainee && rawSeconds != null && !logging && !!user;
  // Hand-picking only applies to a live random draw — a saved drill or
  // repeated past rep is a fixed configuration, not something to tweak here.
  const canHandPick = !selectedSaved && !repeatedDrill;

  function cycleCard(cat: CategoryKey, direction: 1 | -1) {
    const options = DRY_FIRE_DECKS[cat];
    const currentId = overrides[cat]?.id ?? drill[cat].def.id;
    const idx = options.findIndex((o) => o.id === currentId);
    const nextIdx = ((idx === -1 ? 0 : idx) + direction + options.length) % options.length;
    setOverrides((prev) => ({ ...prev, [cat]: options[nextIdx] }));
    resetScoreFields();
    resetNoteState();
    setLastLogged(null);
    setSavedDrillError(null);
  }

  function resetScoreFields() {
    setRawSeconds(null);
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

  function handleNewDrill() {
    setSelectedSavedId("");
    setRepeatedDrill(null);
    setOverrides({});
    drawNew();
    resetScoreFields();
    setVideo(null);
    resetNoteState();
    setLastLogged(null);
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

    const finalSeconds = rawSeconds;
    setLogging(true);
    setLogError(null);
    setLogWarning(null);
    setLastLogged(null);
    resetNoteState();

    const mediaWarnings: string[] = [];

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
      zoneMisses: 0,
      completeMisses: 0,
      finalSeconds,
      savedDrillName: selectedSaved?.name,
      videoPath,
      pistolId: selectedPistolId || undefined,
      dryFire: true,
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
    // The drill (random, saved, or benchmark) stays on screen after logging
    // so the same drill can be repeated for another rep — advancing to a
    // different one is always an explicit "Next Drill" click, not automatic.
    resetScoreFields();
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
        <TitleFrame variant="sky">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-sky-400">
            🔒 Dry Fire Mode
          </h1>

          <div className="text-center text-sm text-zinc-400">
            Training as <span className="font-semibold text-white">{trainee ?? "…"}</span>
          </div>
        </TitleFrame>

        <div className="rounded-md border border-sky-800 bg-sky-950/40 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-sky-400">
          🔒 Verify the chamber is clear and remove all ammunition from the area before starting.
        </div>

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

        <Panel variant="sky">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              {selectedSaved
                ? `Saved Drill — ${selectedSaved.name}`
                : repeatedDrill
                  ? "Repeating Past Rep"
                  : "The Drill"}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleNewDrill}
                className="rounded bg-sky-700 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-[0_0_12px_rgba(2,132,199,0.5)] hover:bg-sky-600"
              >
                Next Drill
              </button>
              <button
                onClick={() => {
                  setShowSave((v) => !v);
                  setSavedDrillError(null);
                }}
                className="rounded border border-sky-800 px-3 py-1 text-xs uppercase tracking-wide text-zinc-300 hover:bg-sky-950/60"
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
                      ? "border-sky-500 bg-sky-950/60 text-sky-400"
                      : "border-sky-800 text-zinc-300 hover:bg-sky-950/60"
                  }`}
                >
                  Manage Saved
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-bold uppercase tracking-wide text-sky-400">Drill source</div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSavedId}
                onChange={(e) => {
                  setSelectedSavedId(e.target.value);
                  setRepeatedDrill(null);
                  resetScoreFields();
                  resetNoteState();
                  setLastLogged(null);
                  setSavedDrillError(null);
                }}
                className="flex-1 rounded border border-sky-900/60 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none"
              >
                <option value="">Random draw</option>
                {savedDrills.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {selectedSaved && (
                <button
                  onClick={handleDeleteSaved}
                  className="rounded border border-sky-900/60 px-3 py-2 text-xs uppercase tracking-wide text-zinc-400 hover:bg-sky-950/60 hover:text-sky-400"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {showManageSaved && (
            <div className="flex flex-col gap-2 rounded-lg border border-sky-900/60 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Saved Drills
                </div>
                {confirmingClearSaved ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-400">Clear all {savedDrills.length}?</span>
                    <button
                      onClick={handleClearAllSaved}
                      disabled={clearingSaved}
                      className="rounded bg-sky-700 px-2 py-1 text-white hover:bg-sky-600 disabled:opacity-60"
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
                    className="rounded border border-sky-800 px-2 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-sky-950/60 hover:text-sky-400"
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
                    className="flex items-center justify-between gap-2 rounded border border-sky-950 bg-zinc-900 px-2.5 py-1.5"
                  >
                    <span className="text-sm text-white">{d.name}</span>
                    {confirmingDeleteSavedId === d.id ? (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="text-zinc-400">Delete?</span>
                        <button
                          onClick={() => handleDeleteSavedById(d.id)}
                          disabled={deletingSavedId === d.id}
                          className="rounded bg-sky-700 px-1.5 py-0.5 text-white hover:bg-sky-600 disabled:opacity-60"
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
                        className="text-zinc-500 hover:text-sky-400"
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
                className="flex-1 rounded border border-sky-900/60 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none"
              />
              <button
                disabled={saving || saveName.trim().length === 0 || !user}
                onClick={handleSaveDrill}
                className="rounded bg-sky-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white enabled:hover:bg-sky-600 disabled:bg-zinc-800 disabled:text-zinc-500"
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
              <div key={cat} className="flex flex-col gap-1">
                <PlayingCard cardId={activeDrill[cat].cardId} />
                {canHandPick && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => cycleCard(cat, -1)}
                      aria-label={`Previous ${CATEGORY_LABELS[cat]}`}
                      className="flex-1 rounded border border-sky-900/60 py-1 text-xs text-zinc-400 hover:border-sky-600 hover:text-sky-400"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => cycleCard(cat, 1)}
                      aria-label={`Next ${CATEGORY_LABELS[cat]}`}
                      className="flex-1 rounded border border-sky-900/60 py-1 text-xs text-zinc-400 hover:border-sky-600 hover:text-sky-400"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {canHandPick && (
            <p className="text-center text-[11px] text-sky-300/50">
              Use ‹ › under each card to hand-pick that category.
            </p>
          )}
        </Panel>

        <Panel variant="sky">
          {pistols.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Pistol
              </div>
              <select
                value={selectedPistolId}
                onChange={(e) => setSelectedPistolId(e.target.value)}
                className="w-full rounded border border-sky-900/60 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none"
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
              placeholder="0.00"
              className="w-28 rounded-md border-2 border-sky-700 bg-zinc-900 px-2 py-1.5 text-xl font-bold text-sky-400 focus:border-sky-500 focus:outline-none"
            />
            <span className="text-sm text-sky-300/50">
              seconds{parSeconds != null ? ` — par ${parSeconds}s` : ""}
            </span>
          </div>

          <p className="text-center text-xs text-sky-300/50">
            No live impact to score — this rep logs time only.
          </p>

          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Draw Review Video
              {!online && <span className="ml-1 normal-case text-sky-300/50">(needs a connection to attach)</span>}
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
            <div className="text-sm text-sky-400">
              Logged: {lastLogged.toFixed(2)}s
            </div>
          )}

          {lastLoggedSessionId != null && (
            <div className="flex flex-col gap-1.5 border-t border-sky-900/50 pt-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Notes on this rep
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => {
                  setNoteDraft(e.target.value);
                  setNoteSaved(false);
                }}
                placeholder="e.g. staging the trigger too much — before the next drill"
                rows={2}
                className="w-full resize-none rounded border border-sky-900/60 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="rounded border border-sky-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 enabled:hover:bg-sky-950/60 disabled:opacity-60"
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
            className="w-full rounded-md bg-sky-700 px-4 py-3 font-semibold uppercase tracking-wide text-white enabled:hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {logging ? "Logging…" : "Log Dry Rep"}
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
            label="Dry Fire Analytics"
            onClick={onOpenAnalytics}
          />
          <UtilityButton icon={<GridIcon className="h-4 w-4" />} label="Modes" onClick={onBack} />
        </div>
      </div>
    </HeroBackdrop>
  );
}
