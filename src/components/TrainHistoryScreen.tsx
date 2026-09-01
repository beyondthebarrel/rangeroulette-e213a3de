import { useEffect, useState } from "react";
import { drillSummary } from "../training/drillLabel";
import { getTrainingPhotoUrl } from "../training/photos";
import { deleteTrainingSession, getTrainingSessions } from "../training/storage";
import type { TrainingSession } from "../training/types";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { RetryImage } from "./RetryImage";
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

export function TrainHistoryScreen({ onBack }: { onBack: () => void }) {
  const [sessions, setSessions] = useState<TrainingSession[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    getTrainingSessions().then(async (loaded) => {
      if (cancelled) return;
      setSessions(loaded);
      const withPhotos = loaded.filter((s) => s.photoPath);
      if (withPhotos.length === 0) return;
      const entries = await Promise.all(
        withPhotos.map(async (s) => [s.photoPath!, await getTrainingPhotoUrl(s.photoPath!)] as const),
      );
      if (cancelled) return;
      const urls: Record<string, string> = {};
      for (const [path, url] of entries) if (url) urls[path] = url;
      setPhotoUrls((prev) => ({ ...prev, ...urls }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

    setSessions(await getTrainingSessions());
  }

  const stats = sessions ? computeStats(sessions) : null;

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-red-500">
            Training History
          </h1>

          {sessions === null ? (
            <p className="text-center text-sm text-zinc-400">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">
              No sessions logged yet. Run a drill in Train Mode to start tracking.
            </p>
          ) : null}
        </TitleFrame>

        {stats && (
          <Panel>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Personal Bests
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-mono text-2xl font-bold text-red-400">
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
                <div className="text-xs text-zinc-500">Sessions</div>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Best run:{" "}
              {stats.bestSession.savedDrillName && (
                <span className="text-red-400">{stats.bestSession.savedDrillName} · </span>
              )}
              {drillSummary(stats.bestSession.drill)}
            </div>
          </Panel>
        )}

        {sessions != null && sessions.length > 0 && (
          <Panel>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Session History
            </div>
            {deleteError != null && (
              <div className="text-xs text-amber-400">{deleteError}</div>
            )}
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-red-900/50 bg-zinc-900/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg text-white">
                      {s.finalSeconds.toFixed(2)}s
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{formatDate(s.loggedAt)}</span>
                      {confirmingId === s.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <span className="text-zinc-400">Delete?</span>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deletingId === s.id}
                            className="rounded bg-red-700 px-1.5 py-0.5 text-white hover:bg-red-600 disabled:opacity-60"
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
                          className="text-zinc-500 hover:text-red-400"
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
                          <span className="text-red-400">{s.savedDrillName} · </span>
                        )}
                        {drillSummary(s.drill)}
                      </div>
                      {(s.zoneMisses > 0 || s.completeMisses > 0) && (
                        <div className="text-xs text-amber-400">
                          {s.zoneMisses > 0 &&
                            `${s.zoneMisses} zone miss${s.zoneMisses > 1 ? "es" : ""}`}
                          {s.zoneMisses > 0 && s.completeMisses > 0 && ", "}
                          {s.completeMisses > 0 &&
                            `${s.completeMisses} complete miss${s.completeMisses > 1 ? "es" : ""}`}
                        </div>
                      )}
                    </div>
                    {s.photoPath && photoUrls[s.photoPath] && (
                      <a href={photoUrls[s.photoPath]} target="_blank" rel="noreferrer">
                        <RetryImage
                          src={photoUrls[s.photoPath]}
                          alt="Target photo"
                          className="h-14 w-14 shrink-0 rounded border border-zinc-700 object-cover"
                        />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <button
          onClick={onBack}
          className="w-full rounded-md bg-red-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-red-600"
        >
          Back
        </button>
      </div>
    </HeroBackdrop>
  );
}
