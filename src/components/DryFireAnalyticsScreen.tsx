import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { clearAnalytics, getAnalyticsClearedAt, listMyPistols, pistolLabel, type PistolInput } from "../profile";
import { computeAccountAnalytics } from "../training/analytics";
import { getTrainingSessions } from "../training/storage";
import type { TrainingSession } from "../training/types";
import { DumbbellChart } from "./charts/DumbbellChart";
import { LineChart } from "./charts/LineChart";
import { RankedBarChart } from "./charts/RankedBarChart";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

export function DryFireAnalyticsScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [allSessions, setAllSessions] = useState<TrainingSession[] | null>(null);
  const [pistols, setPistols] = useState<PistolInput[]>([]);
  const [selectedPistolId, setSelectedPistolId] = useState("");

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const loadAnalytics = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (!user) return;
      const [sessions, loadedPistols, clearedAt] = await Promise.all([
        getTrainingSessions(),
        listMyPistols(user.id),
        getAnalyticsClearedAt(user.id),
      ]);
      if (signal?.cancelled) return;
      // Non-destructive reset: sessions logged before a "Clear Analytics" are
      // simply excluded here, never deleted — see clearAnalytics for why.
      const inWindow = clearedAt ? sessions.filter((s) => s.loggedAt > clearedAt) : sessions;
      setAllSessions(inWindow.filter((s) => s.dryFire));
      setPistols(loadedPistols);
    },
    [user],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    loadAnalytics(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadAnalytics]);

  async function handleClearAnalytics() {
    if (!user) return;
    setClearing(true);
    setClearError(null);
    const ok = await clearAnalytics(user.id);
    setClearing(false);
    setConfirmingClear(false);
    if (!ok) {
      setClearError("Couldn't clear analytics — check your connection and try again.");
      return;
    }
    await loadAnalytics();
  }

  const selectedPistol = pistols.find((p) => p.id === selectedPistolId) ?? null;

  const filteredSessions = useMemo(() => {
    if (!allSessions) return null;
    if (!selectedPistolId) return allSessions;
    return allSessions.filter((s) => s.pistolId === selectedPistolId);
  }, [allSessions, selectedPistolId]);

  const analytics = useMemo(
    () => (filteredSessions ? computeAccountAnalytics(filteredSessions, pistols) : null),
    [filteredSessions, pistols],
  );

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-sky-400">
            🔒 Dry Fire Analytics
          </h1>
          <p className="text-center text-sm text-zinc-400">
            {selectedPistol
              ? `Every dry rep logged with the ${pistolLabel(selectedPistol)}.`
              : "Every dry rep logged on this account — time only, no accuracy stats."}
          </p>
        </TitleFrame>

        <div className="flex flex-col items-center gap-1">
          {confirmingClear ? (
            <>
              <span className="flex items-center gap-1.5 text-xs">
                <span className="text-zinc-400">Reset all analytics stats?</span>
                <button
                  onClick={handleClearAnalytics}
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
              <p className="text-[11px] leading-snug text-zinc-500">
                Starts your stats fresh from today — your logged sessions aren't deleted. This also
                resets Live Fire Analytics.
              </p>
            </>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              className="text-xs uppercase tracking-wide text-zinc-500 hover:text-sky-400"
            >
              Clear Analytics
            </button>
          )}
          {clearError != null && <p className="text-xs text-amber-400">{clearError}</p>}
        </div>

        {pistols.length > 0 && (
          <Panel>
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Viewing
              </div>
              <select
                value={selectedPistolId}
                onChange={(e) => setSelectedPistolId(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none"
              >
                <option value="">Whole account</option>
                {pistols.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pistolLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </Panel>
        )}

        {analytics === null ? (
          <Panel>
            <p className="text-center text-sm text-zinc-400">Loading…</p>
          </Panel>
        ) : analytics.totalReps === 0 ? (
          <Panel>
            <p className="text-center text-sm text-zinc-400">
              {selectedPistol
                ? `No dry fire reps tagged with the ${pistolLabel(selectedPistol)} yet.`
                : "No dry fire reps logged yet. Run a drill in Dry Fire Mode to start tracking."}
            </p>
          </Panel>
        ) : (
          <>
            <Panel>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Overview</div>
              <div className="grid grid-cols-3 gap-4">
                <Tile value={String(analytics.totalReps)} label="Total dry reps" />
                <Tile
                  value={`${analytics.overallBestSession!.finalSeconds.toFixed(2)}s`}
                  label="Personal best (any drill)"
                />
                <Tile value={String(analytics.uniqueDrillCount)} label="Unique drills" />
              </div>
              <div className="text-xs text-zinc-500">
                Training since {formatDate(analytics.firstLoggedAt!)} · last logged{" "}
                {formatDate(analytics.lastLoggedAt!)}
              </div>
              {analytics.dailyVolume.length > 1 && (
                <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
                  <div className="text-xs text-zinc-500">Training volume by day</div>
                  <LineChart data={analytics.dailyVolume.map((d) => ({ date: d.date, value: d.reps }))} />
                </div>
              )}
            </Panel>

            <Panel>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Overall Best Drills
              </div>
              <RankedBarChart
                data={analytics.bestDrills.map((d) => ({
                  key: d.key,
                  label: d.label,
                  value: d.bestSession.finalSeconds,
                  displayValue: `${d.bestSession.finalSeconds.toFixed(2)}s`,
                }))}
              />
              <ul className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
                {analytics.bestDrills.map((d, i) => (
                  <li
                    key={d.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-sky-900/50 bg-zinc-900/60 p-3"
                  >
                    <div>
                      <div className="text-sm text-white">
                        <span className="mr-2 text-zinc-500">{i + 1}.</span>
                        {d.label}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {d.bestSession.trainee} · {formatDate(d.bestSession.loggedAt)}
                      </div>
                    </div>
                    <span className="font-mono text-lg text-sky-400">
                      {d.bestSession.finalSeconds.toFixed(2)}s
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            {analytics.mostImproved.length > 0 && (
              <Panel>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Most Progress
                </div>
                <DumbbellChart
                  data={analytics.mostImproved.map((d) => ({
                    key: d.key,
                    label: d.label,
                    before: d.firstSession.finalSeconds,
                    after: d.bestSession.finalSeconds,
                    beforeDisplay: `${d.firstSession.finalSeconds.toFixed(2)}s`,
                    afterDisplay: `${d.bestSession.finalSeconds.toFixed(2)}s`,
                  }))}
                />
                <ul className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
                  {analytics.mostImproved.map((d, i) => (
                    <li
                      key={d.key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-sky-900/50 bg-zinc-900/60 p-3"
                    >
                      <div>
                        <div className="text-sm text-white">
                          <span className="mr-2 text-zinc-500">{i + 1}.</span>
                          {d.label}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {d.firstSession.finalSeconds.toFixed(2)}s → {d.bestSession.finalSeconds.toFixed(2)}s
                        </div>
                      </div>
                      <span className="font-mono text-lg text-green-400">
                        −{d.improvementSeconds.toFixed(2)}s
                        <span className="ml-1 text-xs text-zinc-500">({d.improvementPercent.toFixed(0)}%)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Panel>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Most Repeated Drills
              </div>
              <RankedBarChart
                data={analytics.mostRepeated.map((d) => ({
                  key: d.key,
                  label: d.label,
                  value: d.reps,
                  displayValue: `${d.reps}×`,
                }))}
              />
              <ul className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
                {analytics.mostRepeated.map((d, i) => (
                  <li
                    key={d.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-sky-900/50 bg-zinc-900/60 p-3"
                  >
                    <div className="text-sm text-white">
                      <span className="mr-2 text-zinc-500">{i + 1}.</span>
                      {d.label}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">best {d.bestSession.finalSeconds.toFixed(2)}s</span>
                      <span className="font-mono text-lg text-white">
                        {d.reps}× <span className="text-xs text-zinc-500">reps</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            {!selectedPistol && analytics.byPistol.length > 0 && (
              <Panel>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  By Pistol
                </div>
                <RankedBarChart
                  data={analytics.byPistol.map((p) => ({
                    key: p.pistolId,
                    label: p.label,
                    value: p.reps,
                    displayValue: `${p.reps}×`,
                  }))}
                />
                <ul className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
                  {analytics.byPistol.map((p, i) => (
                    <li
                      key={p.pistolId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-sky-900/50 bg-zinc-900/60 p-3"
                    >
                      <div>
                        <div className="text-sm text-white">
                          <span className="mr-2 text-zinc-500">{i + 1}.</span>
                          {p.label}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {p.reps} rep{p.reps > 1 ? "s" : ""} · best {p.bestSeconds.toFixed(2)}s
                        </div>
                      </div>
                      <span className="font-mono text-lg text-sky-400">{p.averageSeconds.toFixed(2)}s avg</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
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
