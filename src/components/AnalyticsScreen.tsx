import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { listMyPistols, pistolLabel, type PistolInput } from "../profile";
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

export function AnalyticsScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [allSessions, setAllSessions] = useState<TrainingSession[] | null>(null);
  const [pistols, setPistols] = useState<PistolInput[]>([]);
  const [selectedPistolId, setSelectedPistolId] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getTrainingSessions(), listMyPistols(user.id)]).then(([sessions, loadedPistols]) => {
      if (cancelled) return;
      setAllSessions(sessions);
      setPistols(loadedPistols);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
          <h1 className="text-2xl font-bold uppercase tracking-wide text-red-500">Analytics</h1>
          <p className="text-center text-sm text-zinc-400">
            {selectedPistol
              ? `Every rep logged with the ${pistolLabel(selectedPistol)}.`
              : "Every rep logged on this account."}
          </p>
        </TitleFrame>

        {pistols.length > 0 && (
          <Panel>
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Viewing
              </div>
              <select
                value={selectedPistolId}
                onChange={(e) => setSelectedPistolId(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none"
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
                ? `No sessions tagged with the ${pistolLabel(selectedPistol)} yet.`
                : "No sessions logged yet. Run a drill in Train Mode to start tracking."}
            </p>
          </Panel>
        ) : (
          <>
            <Panel>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Overview</div>
              <div className="grid grid-cols-3 gap-4">
                <Tile value={String(analytics.totalReps)} label="Total reps logged" />
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
                    className="flex items-center justify-between gap-2 rounded-lg border border-red-900/50 bg-zinc-900/60 p-3"
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
                    <span className="font-mono text-lg text-red-400">
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
                      className="flex items-center justify-between gap-2 rounded-lg border border-red-900/50 bg-zinc-900/60 p-3"
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
                    className="flex items-center justify-between gap-2 rounded-lg border border-red-900/50 bg-zinc-900/60 p-3"
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

            <Panel>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Accuracy by Drill
              </div>
              <div className="text-xs text-zinc-500">
                Share of reps with zero zone/complete misses — lowest first.
              </div>
              <RankedBarChart
                data={analytics.leastAccurate.map((d) => ({
                  key: d.key,
                  label: d.label,
                  value: d.cleanRate,
                  displayValue: `${d.cleanRate.toFixed(0)}%`,
                }))}
              />
              <ul className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
                {analytics.leastAccurate.map((d, i) => (
                  <li
                    key={d.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-red-900/50 bg-zinc-900/60 p-3"
                  >
                    <div>
                      <div className="text-sm text-white">
                        <span className="mr-2 text-zinc-500">{i + 1}.</span>
                        {d.label}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {d.reps} rep{d.reps > 1 ? "s" : ""} · avg {d.avgZoneMisses.toFixed(1)} zone,{" "}
                        {d.avgCompleteMisses.toFixed(1)} complete miss{d.avgCompleteMisses === 1 ? "" : "es"}
                      </div>
                    </div>
                    <span className="font-mono text-lg text-red-400">{d.cleanRate.toFixed(0)}%</span>
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
                      className="flex items-center justify-between gap-2 rounded-lg border border-red-900/50 bg-zinc-900/60 p-3"
                    >
                      <div>
                        <div className="text-sm text-white">
                          <span className="mr-2 text-zinc-500">{i + 1}.</span>
                          {p.label}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {p.reps} rep{p.reps > 1 ? "s" : ""} · best {p.bestSeconds.toFixed(2)}s · avg{" "}
                          {p.averageSeconds.toFixed(2)}s
                        </div>
                      </div>
                      <span className="font-mono text-lg text-red-400">{p.cleanRate.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
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
