import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { BENCHMARKS, passesBenchmark, type BenchmarkDrill } from "../data/benchmarks";
import { CATEGORY_ORDER, type CategoryKey } from "../data/cards";
import {
  clearAnalytics,
  getAnalyticsClearedAt,
  getMyShootingLevel,
  listMyPistols,
  pistolLabel,
  SHOOTING_LEVELS,
  updateShootingLevel,
  type PistolInput,
  type ShootingLevel,
} from "../profile";
import { computeAccountAnalytics } from "../training/analytics";
import { getTrainingPhotoUrl } from "../training/photos";
import { getTrainingSessions } from "../training/storage";
import type { TrainingSession } from "../training/types";
import { BenchmarkProgressChart } from "./charts/BenchmarkProgressChart";
import { DumbbellChart } from "./charts/DumbbellChart";
import { LineChart } from "./charts/LineChart";
import { RankedBarChart } from "./charts/RankedBarChart";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { PlayingCard } from "./PlayingCard";
import { RetryImage } from "./RetryImage";
import { TitleFrame } from "./TitleFrame";

const RECENT_PHOTO_LIMIT = 12;
const NO_BENCHMARKS: BenchmarkDrill[] = [];

const LEVEL_LABELS: Record<ShootingLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  pro: "Pro",
};

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
  const [shootingLevel, setShootingLevel] = useState<ShootingLevel | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const [leveling, setLeveling] = useState(false);
  const [levelError, setLevelError] = useState<string | null>(null);

  const loadAnalytics = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (!user) return;
      const [sessions, loadedPistols, level, clearedAt] = await Promise.all([
        getTrainingSessions(),
        listMyPistols(user.id),
        getMyShootingLevel(user.id),
        getAnalyticsClearedAt(user.id),
      ]);
      if (signal?.cancelled) return;
      // Non-destructive reset: sessions logged before a "Clear Analytics" are
      // simply excluded here, never deleted — see clearAnalytics for why.
      setAllSessions(clearedAt ? sessions.filter((s) => s.loggedAt > clearedAt) : sessions);
      setPistols(loadedPistols);
      setShootingLevel(level);
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

  const benchmarks = shootingLevel ? BENCHMARKS[shootingLevel] : NO_BENCHMARKS;

  const benchmarkProgress = useMemo(() => {
    if (!allSessions) return [];
    return benchmarks.map((benchmark) => ({
      benchmark,
      attempts: allSessions
        .filter(
          (s) =>
            s.drill.time.cardId === benchmark.drill.time.cardId &&
            s.drill.distance.cardId === benchmark.drill.distance.cardId &&
            s.drill.startPosition.cardId === benchmark.drill.startPosition.cardId &&
            s.drill.target.cardId === benchmark.drill.target.cardId &&
            s.drill.courseOfFire.cardId === benchmark.drill.courseOfFire.cardId,
        )
        .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
        .map((s) => ({
          date: s.loggedAt,
          seconds: s.rawSeconds,
          passed: passesBenchmark(s, benchmark),
        })),
    }));
  }, [allSessions, benchmarks]);

  const allBenchmarksPassed =
    benchmarkProgress.length > 0 && benchmarkProgress.every((bp) => bp.attempts.some((a) => a.passed));
  const nextLevel: ShootingLevel | null = shootingLevel
    ? (SHOOTING_LEVELS[SHOOTING_LEVELS.indexOf(shootingLevel) + 1] ?? null)
    : null;

  async function handleLevelUp() {
    if (!user || !nextLevel) return;
    setLeveling(true);
    setLevelError(null);
    const ok = await updateShootingLevel(user.id, nextLevel);
    setLeveling(false);
    if (!ok) {
      setLevelError("Couldn't update your level — check your connection and try again.");
      return;
    }
    setShootingLevel(nextLevel);
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

  // Most recent target photos, newest first — a quick visual log to pair with the numbers above.
  const recentPhotoSessions = useMemo(
    () => (filteredSessions ?? []).filter((s) => s.photoPath).slice(0, RECENT_PHOTO_LIMIT),
    [filteredSessions],
  );

  const fetchedPhotoPaths = useRef(new Set<string>());

  useEffect(() => {
    const bestDrillPaths = analytics?.bestDrills.map((d) => d.bestSession.photoPath).filter((p): p is string => !!p) ?? [];
    const recentPaths = recentPhotoSessions.map((s) => s.photoPath!);
    const paths = [...new Set([...recentPaths, ...bestDrillPaths])].filter(
      (p) => !fetchedPhotoPaths.current.has(p),
    );
    if (paths.length === 0) return;
    for (const p of paths) fetchedPhotoPaths.current.add(p);
    let cancelled = false;
    Promise.all(paths.map(async (p) => [p, await getTrainingPhotoUrl(p)] as const)).then((entries) => {
      if (cancelled) return;
      const urls: Record<string, string> = {};
      for (const [path, url] of entries) if (url) urls[path] = url;
      setPhotoUrls((prev) => ({ ...prev, ...urls }));
    });
    return () => {
      cancelled = true;
    };
  }, [analytics, recentPhotoSessions]);

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">Analytics</h1>
          <p className="text-center text-sm text-zinc-400">
            {selectedPistol
              ? `Every rep logged with the ${pistolLabel(selectedPistol)}.`
              : "Every rep logged on this account."}
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
                  className="rounded bg-orange-700 px-2 py-1 text-white hover:bg-orange-600 disabled:opacity-60"
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
                Starts your stats fresh from today — your logged sessions aren't deleted.
              </p>
            </>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              className="text-xs uppercase tracking-wide text-zinc-500 hover:text-orange-400"
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
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
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

            {recentPhotoSessions.length > 0 && (
              <Panel>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Target Photos
                </div>
                <div className="text-xs text-zinc-500">Most recent first — tap to view full size.</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recentPhotoSessions.map((s) =>
                    photoUrls[s.photoPath!] ? (
                      <a
                        key={s.id}
                        href={photoUrls[s.photoPath!]}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 flex-col items-center gap-1"
                      >
                        <RetryImage
                          src={photoUrls[s.photoPath!]}
                          alt="Target photo"
                          className="h-16 w-16 rounded border border-zinc-700 object-cover"
                        />
                        <span className="text-[10px] text-zinc-500">{formatDate(s.loggedAt)}</span>
                      </a>
                    ) : (
                      <div
                        key={s.id}
                        className="h-16 w-16 shrink-0 animate-pulse rounded border border-zinc-800 bg-zinc-900"
                      />
                    ),
                  )}
                </div>
              </Panel>
            )}

            {allBenchmarksPassed && shootingLevel && (
              <Panel>
                {nextLevel ? (
                  <>
                    <div className="text-sm font-semibold text-emerald-400">
                      🎉 You've passed all {benchmarkProgress.length} {LEVEL_LABELS[shootingLevel]}{" "}
                      benchmarks!
                    </div>
                    <p className="text-xs text-zinc-400">
                      Ready to move up to {LEVEL_LABELS[nextLevel]}?
                    </p>
                    <button
                      onClick={handleLevelUp}
                      disabled={leveling}
                      className="w-full rounded-md bg-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:opacity-60"
                    >
                      {leveling ? "…" : `Level Up to ${LEVEL_LABELS[nextLevel]}`}
                    </button>
                    {levelError != null && <p className="text-xs text-amber-400">{levelError}</p>}
                  </>
                ) : (
                  <div className="text-sm font-semibold text-emerald-400">
                    🏆 You've passed every Pro benchmark — top of the ladder.
                  </div>
                )}
              </Panel>
            )}

            {benchmarkProgress.map(({ benchmark, attempts }, i) => (
              <Panel key={benchmark.id}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {LEVEL_LABELS[benchmark.level]} Benchmark {i + 1}
                  </div>
                  {attempts.some((a) => a.passed) ? (
                    <span className="text-xs font-semibold text-emerald-400">✓ Achieved</span>
                  ) : (
                    <span className="text-xs text-zinc-500">Not yet achieved</span>
                  )}
                </div>
                <div className="text-sm text-white">{benchmark.name}</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {CATEGORY_ORDER.map((cat: CategoryKey) => (
                    <PlayingCard key={cat} cardId={benchmark.drill[cat].cardId} />
                  ))}
                </div>
                <div className="text-xs text-zinc-500">
                  Par {benchmark.drill.parSeconds}s · max {benchmark.maxZoneMisses} zone /{" "}
                  {benchmark.maxCompleteMisses} complete miss
                  {benchmark.maxCompleteMisses === 1 ? "" : "es"}
                </div>
                {attempts.length > 0 ? (
                  <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
                    <div className="text-xs text-zinc-500">
                      Progress toward par ({attempts.length} attempt
                      {attempts.length === 1 ? "" : "s"})
                    </div>
                    <BenchmarkProgressChart attempts={attempts} par={benchmark.drill.parSeconds!} />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    No attempts logged yet — select this benchmark from Train Mode's drill picker.
                  </p>
                )}
              </Panel>
            ))}

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
                    className="flex items-center justify-between gap-2 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {d.bestSession.photoPath && photoUrls[d.bestSession.photoPath] && (
                        <a
                          href={photoUrls[d.bestSession.photoPath]}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <RetryImage
                            src={photoUrls[d.bestSession.photoPath]}
                            alt="Target photo"
                            className="h-12 w-12 rounded border border-zinc-700 object-cover"
                          />
                        </a>
                      )}
                      <div>
                        <div className="text-sm text-white">
                          <span className="mr-2 text-zinc-500">{i + 1}.</span>
                          {d.label}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {d.bestSession.trainee} · {formatDate(d.bestSession.loggedAt)}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-lg text-orange-400">
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
                      className="flex items-center justify-between gap-2 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
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
                    className="flex items-center justify-between gap-2 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
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
                    className="flex items-center justify-between gap-2 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
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
                    <span className="font-mono text-lg text-orange-400">{d.cleanRate.toFixed(0)}%</span>
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
                      className="flex items-center justify-between gap-2 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
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
                      <span className="font-mono text-lg text-orange-400">{p.cleanRate.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}

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
