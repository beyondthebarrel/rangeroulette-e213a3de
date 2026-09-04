import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { listMyPistols, pistolLabel, type PistolInput } from "../profile";
import { drillSummary } from "../training/drillLabel";
import { clearTrainingHistory, deleteTrainingSession, getVisibleTrainingSessions } from "../training/storage";
import type { TrainingSession } from "../training/types";
import { getTrainingVideoUrl } from "../training/videos";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface Stats {
  bestSession: TrainingSession;
  averageSeconds: number;
  sessionCount: number;
}

function computeStats(sessions: TrainingSession[]): Stats | null {
  if (sessions.length === 0) return null;
  const bestSession = sessions.reduce((a, b) => (a.finalSeconds <= b.finalSeconds ? a : b));
  const averageSeconds =
    Math.round((sessions.reduce((sum, s) => sum + s.finalSeconds, 0) / sessions.length) * 100) / 100;
  return { bestSession, averageSeconds, sessionCount: sessions.length };
}

export function DryFireHistoryScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TrainingSession[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [pistols, setPistols] = useState<PistolInput[]>([]);

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  async function loadSessions(signal?: { cancelled: boolean }) {
    const loaded = (await getVisibleTrainingSessions()).filter((s) => s.dryFire);
    if (signal?.cancelled) return;
    setSessions(loaded);

    const withVideos = loaded.filter((s) => s.videoPath);
    if (withVideos.length > 0) {
      const entries = await Promise.all(
        withVideos.map(async (s) => [s.videoPath!, await getTrainingVideoUrl(s.videoPath!)] as const),
      );
      if (signal?.cancelled) return;
      const urls: Record<string, string> = {};
      for (const [path, url] of entries) if (url) urls[path] = url;
      setVideoUrls((prev) => ({ ...prev, ...urls }));
    }
  }

  useEffect(() => {
    const signal = { cancelled: false };
    loadSessions(signal);
    return () => {
      signal.cancelled = true;
    };
  }, []);

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

  const pistolById = new Map(pistols.filter((p) => p.id).map((p) => [p.id, p]));

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    const ok = await deleteTrainingSession(id);
    setDeletingId(null);
    setConfirmingId(null);

    if (!ok) {
      setDeleteError("Couldn't delete that session — check your connection and try again.");
      return;
    }

    await loadSessions();
  }

  async function handleClearHistory() {
    if (!user) return;
    setClearing(true);
    setClearError(null);
    const ok = await clearTrainingHistory(user.id, true);
    setClearing(false);
    setConfirmingClear(false);

    if (!ok) {
      setClearError("Couldn't clear history — check your connection and try again.");
      return;
    }

    await loadSessions();
  }

  const stats = sessions ? computeStats(sessions) : null;

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame variant="sky">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-sky-400">
            🔒 Dry Fire History
          </h1>

          {sessions === null ? (
            <p className="text-center text-sm text-zinc-400">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">
              No dry fire reps logged yet. Run a drill in Dry Fire Mode to start tracking.
            </p>
          ) : null}
        </TitleFrame>

        {stats && (
          <Panel variant="sky">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Personal Bests
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-mono text-2xl font-bold text-sky-400">
                  {stats.bestSession.finalSeconds.toFixed(2)}s
                </div>
                <div className="text-xs text-zinc-500">Best time</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-white">
                  {stats.averageSeconds.toFixed(2)}s
                </div>
                <div className="text-xs text-zinc-500">Average</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-white">{stats.sessionCount}</div>
                <div className="text-xs text-zinc-500">Reps</div>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Best run:{" "}
              {stats.bestSession.savedDrillName && (
                <span className="text-sky-400">{stats.bestSession.savedDrillName} · </span>
              )}
              {drillSummary(stats.bestSession.drill)}
            </div>
          </Panel>
        )}

        {sessions != null && sessions.length > 0 && (
          <Panel variant="sky">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Session History
              </div>
              {confirmingClear ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-400">Clear all history shown here?</span>
                  <button
                    onClick={handleClearHistory}
                    disabled={clearing}
                    className="rounded bg-sky-700 px-2 py-1 text-white hover:bg-sky-600 disabled:opacity-60"
                  >
                    {clearing ? "…" : "Yes, Clear"}
                  </button>
                  <button
                    onClick={() => setConfirmingClear(false)}
                    disabled={clearing}
                    className="rounded bg-zinc-700 px-2 py-1 text-white hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => {
                    setConfirmingClear(true);
                    setClearError(null);
                  }}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
                >
                  Clear History
                </button>
              )}
            </div>
            <p className="text-[11px] leading-snug text-zinc-500">
              Clears this list only — your lifetime records stay intact in Dry Fire Analytics.
            </p>
            {clearError != null && <div className="text-xs text-amber-400">{clearError}</div>}
            {deleteError != null && (
              <div className="text-xs text-amber-400">{deleteError}</div>
            )}
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-sky-900/50 bg-zinc-900/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg text-white">
                      {s.finalSeconds.toFixed(2)}s
                    </span>
                    <div className="flex items-center gap-2">
                      {s.pendingSync && (
                        <span className="rounded-full border border-amber-700 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                          Pending sync
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">{formatDate(s.loggedAt)}</span>
                      {confirmingId === s.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <span className="text-zinc-400">Delete?</span>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deletingId === s.id}
                            className="rounded bg-sky-700 px-1.5 py-0.5 text-white hover:bg-sky-600 disabled:opacity-60"
                          >
                            {deletingId === s.id ? "…" : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            disabled={deletingId === s.id}
                            className="rounded bg-zinc-700 px-1.5 py-0.5 text-white hover:bg-zinc-600"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmingId(s.id);
                            setDeleteError(null);
                          }}
                          aria-label="Delete session"
                          title="Delete session"
                          className="text-zinc-500 hover:text-sky-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-zinc-400">
                        {s.savedDrillName && (
                          <span className="text-sky-400">{s.savedDrillName} · </span>
                        )}
                        {drillSummary(s.drill)}
                      </div>
                      {s.pistolId && pistolById.get(s.pistolId) && (
                        <div className="text-xs text-zinc-500">
                          🔫 {pistolLabel(pistolById.get(s.pistolId)!)}
                        </div>
                      )}
                      {s.notes && (
                        <div className="mt-1 text-xs italic text-zinc-400">"{s.notes}"</div>
                      )}
                    </div>
                    {s.videoPath && videoUrls[s.videoPath] && (
                      <video
                        src={videoUrls[s.videoPath]}
                        controls
                        className="h-14 w-24 shrink-0 rounded border border-zinc-700 object-cover"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <button
          onClick={onBack}
          className="w-full rounded-md bg-sky-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-sky-600"
        >
          Back
        </button>
      </div>
    </HeroBackdrop>
  );
}
