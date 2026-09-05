import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getAvatarUrl, uploadAvatar } from "../avatar";
import { BENCHMARKS, findBestBenchmarkPass } from "../data/benchmarks";
import { CATEGORY_ORDER, type CategoryKey } from "../data/cards";
import { deletePistolPhoto, getPistolPhotoUrl, uploadPistolPhoto } from "../pistolPhotos";
import {
  getMyDisplayName,
  getMyProfile,
  listMyPistols,
  saveShooterProfile,
  setPistolPhotoPath,
  SHOOTING_LEVELS,
  syncPistols,
  type PistolInput,
  type ShootingLevel,
} from "../profile";
import { getMySubscriptionDetails, type SubscriptionDetails } from "../subscription";
import { BADGES, earnedBadgeIds } from "../training/badges";
import { getTrainingSessions } from "../training/storage";
import type { TrainingSession } from "../training/types";
import { HeroBackdrop } from "./HeroBackdrop";
import { MembershipPanel } from "./MembershipPanel";
import { Panel } from "./Panel";
import { PlayingCard } from "./PlayingCard";
import { TitleFrame } from "./TitleFrame";

const LEVEL_LABELS: Record<ShootingLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  pro: "Pro",
};

const LEVEL_ACTIVE_CLASSES: Record<ShootingLevel, string> = {
  beginner: "border-emerald-500 bg-emerald-950/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)]",
  intermediate: "border-sky-500 bg-sky-950/40 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.35)]",
  advanced: "border-orange-500 bg-orange-950/40 text-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.35)]",
  pro: "border-red-500 bg-red-950/40 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.35)]",
};

interface PistolFormRow extends PistolInput {
  photoFile?: File | null;
  photoPreviewUrl?: string | null;
  photoRemoved?: boolean;
}

function emptyPistol(): PistolFormRow {
  return { make: "", model: "", caliber: "", optic: "", light: "", holster: "", accessories: "" };
}

const PISTOL_FIELDS: { key: keyof PistolInput; placeholder: string }[] = [
  { key: "make", placeholder: "Make" },
  { key: "model", placeholder: "Model" },
  { key: "caliber", placeholder: "Caliber" },
  { key: "optic", placeholder: "Optic" },
  { key: "light", placeholder: "Light" },
  { key: "holster", placeholder: "Holster" },
];

export function ProfileSetupScreen({
  mode = "onboarding",
  onComplete,
  onBack,
  onSubscriptionCanceled,
}: {
  mode?: "onboarding" | "edit";
  onComplete: () => void;
  onBack?: () => void;
  onSubscriptionCanceled?: () => void;
}) {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [shootingLevel, setShootingLevel] = useState<ShootingLevel | null>(null);
  const [primaryPistol, setPrimaryPistol] = useState("");

  const [currentAvatarPath, setCurrentAvatarPath] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [pistols, setPistols] = useState<PistolFormRow[]>([]);
  const [pistolPhotoUrls, setPistolPhotoUrls] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const [membership, setMembership] = useState<SubscriptionDetails | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profile, savedPistols, loggedSessions, subscriptionDetails] = await Promise.all([
        getMyProfile(user.id),
        listMyPistols(user.id),
        getTrainingSessions(),
        getMySubscriptionDetails(user.id),
      ]);
      if (cancelled) return;
      // Dry fire has no live impact to verify against, so it can't count
      // toward a benchmark's "Achieved" status here.
      setSessions(loggedSessions.filter((s) => !s.dryFire));
      // Badges use every session (dry + live) — reps are reps for the volume
      // milestones, and earnedBadgeIds itself scopes speed badges to live fire.
      setEarnedBadges(earnedBadgeIds(loggedSessions));
      setMembership(subscriptionDetails);
      if (profile) {
        setName(profile.displayName);
        setAge(profile.age != null ? String(profile.age) : "");
        setShootingLevel(profile.shootingLevel);
        setPrimaryPistol(profile.primaryPistol);
        if (profile.avatarPath) {
          setCurrentAvatarPath(profile.avatarPath);
          const url = await getAvatarUrl(profile.avatarPath);
          if (!cancelled && url) setExistingAvatarUrl(url);
        }
      } else {
        setName(await getMyDisplayName(user.id, user.email));
      }
      setPistols(savedPistols);

      const withPhotos = savedPistols.filter((p) => p.photoPath && p.id);
      if (withPhotos.length > 0) {
        const entries = await Promise.all(
          withPhotos.map(async (p) => [p.id as string, await getPistolPhotoUrl(p.photoPath!)] as const),
        );
        if (!cancelled) {
          const urls: Record<string, string> = {};
          for (const [id, url] of entries) if (url) urls[id] = url;
          setPistolPhotoUrls(urls);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setAvatarRemoved(false);
  }

  function clearAvatar() {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setExistingAvatarUrl(null);
    setAvatarRemoved(true);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  const shownAvatarUrl = avatarPreviewUrl ?? existingAvatarUrl;

  function updatePistol(index: number, patch: Partial<PistolFormRow>) {
    setPistols((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPistol() {
    setPistols((prev) => [...prev, emptyPistol()]);
  }

  function removePistol(index: number) {
    setPistols((prev) => {
      if (prev[index]?.photoPreviewUrl) URL.revokeObjectURL(prev[index].photoPreviewUrl!);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handlePistolPhotoSelect(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPistols((prev) => {
      const prevRow = prev[index];
      if (prevRow?.photoPreviewUrl) URL.revokeObjectURL(prevRow.photoPreviewUrl);
      return prev.map((p, i) =>
        i === index
          ? { ...p, photoFile: file, photoPreviewUrl: URL.createObjectURL(file), photoRemoved: false }
          : p,
      );
    });
  }

  function clearPistolPhoto(index: number) {
    setPistols((prev) => {
      const prevRow = prev[index];
      if (prevRow?.photoPreviewUrl) URL.revokeObjectURL(prevRow.photoPreviewUrl);
      return prev.map((p, i) =>
        i === index ? { ...p, photoFile: null, photoPreviewUrl: null, photoRemoved: true } : p,
      );
    });
  }

  const canSave = !!user && name.trim().length > 0 && shootingLevel != null && !saving;

  async function handleSave() {
    if (!canSave || !user) return;
    setSaving(true);
    setError(null);
    setWarning(null);

    const avatarPath = avatarFile
      ? await uploadAvatar(user.id, avatarFile)
      : avatarRemoved
        ? null
        : currentAvatarPath;

    const savedProfile = await saveShooterProfile(user.id, {
      displayName: name,
      age: age.trim() ? Number(age) : null,
      shootingLevel,
      primaryPistol,
      avatarPath,
    });

    if (!savedProfile) {
      setSaving(false);
      setError("Couldn't save your profile — check your connection and try again.");
      return;
    }

    const synced = await syncPistols(user.id, pistols);
    let pistolPhotoFailed = false;
    if (synced) {
      for (const { index, id } of synced) {
        const row = pistols[index];
        if (row.photoFile) {
          const path = await uploadPistolPhoto(user.id, id, row.photoFile);
          if (path) await setPistolPhotoPath(id, path);
          else pistolPhotoFailed = true;
        } else if (row.photoRemoved && row.photoPath) {
          await deletePistolPhoto(row.photoPath);
          await setPistolPhotoPath(id, null);
        }
      }
    }

    setSaving(false);
    if (!synced) {
      setWarning("Profile saved, but the pistol list couldn't be updated — try again in a moment.");
      return;
    }
    if (pistolPhotoFailed) {
      setWarning("Profile saved, but a pistol photo failed to upload — try attaching it again.");
      return;
    }
    onComplete();
  }

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
            {mode === "edit" ? "Edit Your Profile" : "Build Your Profile"}
          </h1>
          <p className="text-center text-sm text-zinc-400">
            {mode === "edit"
              ? "Update your info and armory anytime."
              : "Tell us about yourself before your first drill."}
          </p>
        </TitleFrame>

        {membership && <MembershipPanel details={membership} onCanceled={onSubscriptionCanceled} />}

        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Basics</div>

          <div className="flex items-center gap-4">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
              id="avatar-input"
            />
            <label htmlFor="avatar-input" className="shrink-0 cursor-pointer">
              {shownAvatarUrl ? (
                <img
                  src={shownAvatarUrl}
                  alt="Profile preview"
                  className="h-16 w-16 rounded-full border-2 border-orange-700 object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-zinc-600 text-center text-[10px] uppercase leading-tight tracking-wide text-zinc-500 hover:border-orange-700 hover:text-orange-400">
                  Add
                  <br />
                  Photo
                </span>
              )}
            </label>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="avatar-input"
                className="cursor-pointer rounded border border-zinc-600 px-3 py-1 text-center text-xs uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
              >
                {shownAvatarUrl ? "Retake / Change" : "Choose Photo"}
              </label>
              {shownAvatarUrl && (
                <button
                  onClick={clearAvatar}
                  className="rounded border border-zinc-700 px-3 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-400">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-orange-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-400">Age (optional)</div>
            <input
              type="number"
              min="0"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-orange-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-400">Shooting level</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SHOOTING_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setShootingLevel(level)}
                  className={`rounded-md border-2 px-2 py-2 text-xs font-bold uppercase tracking-wide ${
                    shootingLevel === level
                      ? LEVEL_ACTIVE_CLASSES[level]
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-400">Primary pistol</div>
            <input
              value={primaryPistol}
              onChange={(e) => setPrimaryPistol(e.target.value)}
              placeholder="e.g. Glock 19"
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-orange-600 focus:outline-none"
            />
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Badges</div>
            <div className="text-xs text-zinc-500">
              {earnedBadges.size} / {BADGES.length} earned
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BADGES.map((b) => {
              const earned = earnedBadges.has(b.id);
              return (
                <div
                  key={b.id}
                  className={`flex items-center gap-2 rounded-lg border p-2 ${
                    earned ? "border-orange-700 bg-orange-950/30" : "border-zinc-800 bg-zinc-900/40 opacity-50"
                  }`}
                >
                  <span className="text-xl">{earned ? b.icon : "🔒"}</span>
                  <span className={`text-xs ${earned ? "text-white" : "text-zinc-500"}`}>{b.label}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        {shootingLevel &&
          BENCHMARKS[shootingLevel].map((benchmark, i) => (
            <Panel key={benchmark.id}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {LEVEL_LABELS[shootingLevel]} Benchmark {i + 1}
                </div>
                {(() => {
                  const best = findBestBenchmarkPass(sessions, benchmark);
                  return best ? (
                    <span className="text-xs font-semibold text-emerald-400">
                      ✓ Achieved — {best.rawSeconds.toFixed(2)}s
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">Not yet achieved</span>
                  );
                })()}
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
                {benchmark.maxCompleteMisses === 1 ? "" : "es"} — attempt it from Train Mode's drill
                picker.
              </div>
            </Panel>
          ))}

        <Panel>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Pistol Profile
            </div>
            <button
              onClick={addPistol}
              className="rounded border border-orange-700 px-3 py-1 text-xs uppercase tracking-wide text-orange-400 hover:bg-orange-950"
            >
              + Add Pistol
            </button>
          </div>

          {pistols.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Optional — add the guns in your rotation with their setup (optic, light, holster,
              accessories).
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {pistols.map((p, i) => (
                <div
                  key={p.id ?? `new-${i}`}
                  className="flex flex-col gap-2 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Pistol {i + 1}
                    </span>
                    <button
                      onClick={() => removePistol(i)}
                      className="text-xs text-zinc-500 hover:text-orange-400"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PISTOL_FIELDS.map((f) => (
                      <div key={f.key} className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-orange-400/80">
                          {f.placeholder}
                        </div>
                        <input
                          value={p[f.key]}
                          onChange={(e) => updatePistol(i, { [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-orange-600 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-orange-400/80">
                      Other accessories
                    </div>
                    <input
                      value={p.accessories}
                      onChange={(e) => updatePistol(i, { accessories: e.target.value })}
                      placeholder="Other accessories"
                      className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-orange-600 focus:outline-none"
                    />
                  </div>
                  {(() => {
                    const shownUrl =
                      p.photoPreviewUrl ?? (!p.photoRemoved && p.id ? pistolPhotoUrls[p.id] : undefined);
                    return (
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePistolPhotoSelect(i, e)}
                          className="hidden"
                          id={`pistol-photo-input-${i}`}
                        />
                        <label htmlFor={`pistol-photo-input-${i}`} className="shrink-0 cursor-pointer">
                          {shownUrl ? (
                            <img
                              src={shownUrl}
                              alt="Pistol preview"
                              className="h-12 w-12 rounded border border-zinc-700 object-cover"
                            />
                          ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-zinc-600 text-[9px] uppercase leading-tight tracking-wide text-zinc-500 hover:border-orange-700 hover:text-orange-400">
                              Photo
                            </span>
                          )}
                        </label>
                        <label
                          htmlFor={`pistol-photo-input-${i}`}
                          className="cursor-pointer rounded border border-zinc-600 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
                        >
                          {shownUrl ? "Change" : "Add Photo"}
                        </label>
                        {shownUrl && (
                          <button
                            onClick={() => clearPistolPhoto(i)}
                            className="rounded border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {error != null && <div className="text-center text-sm text-amber-400">{error}</div>}
        {warning != null && <div className="text-center text-sm text-amber-400">{warning}</div>}

        <div className="flex gap-2">
          <button
            disabled={!canSave}
            onClick={warning != null ? onComplete : handleSave}
            className="flex-1 rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {saving
              ? "Saving…"
              : warning != null
                ? "Continue"
                : mode === "edit"
                  ? "Save Changes"
                  : "Save & Continue"}
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="rounded-md border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </HeroBackdrop>
  );
}
