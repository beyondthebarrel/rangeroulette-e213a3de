import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getAvatarUrl, uploadAvatar } from "../avatar";
import {
  getMyDisplayName,
  getMyProfile,
  listMyPistols,
  saveShooterProfile,
  SHOOTING_LEVELS,
  syncPistols,
  type PistolInput,
  type ShootingLevel,
} from "../profile";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

const LEVEL_LABELS: Record<ShootingLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  pro: "Pro",
};

function emptyPistol(): PistolInput {
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
}: {
  mode?: "onboarding" | "edit";
  onComplete: () => void;
  onBack?: () => void;
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

  const [pistols, setPistols] = useState<PistolInput[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profile, savedPistols] = await Promise.all([
        getMyProfile(user.id),
        listMyPistols(user.id),
      ]);
      if (cancelled) return;
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

  function updatePistol(index: number, patch: Partial<PistolInput>) {
    setPistols((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPistol() {
    setPistols((prev) => [...prev, emptyPistol()]);
  }

  function removePistol(index: number) {
    setPistols((prev) => prev.filter((_, i) => i !== index));
  }

  const canSave = !!user && name.trim().length > 0 && shootingLevel != null && !saving;

  async function handleSave() {
    if (!canSave || !user) return;
    setSaving(true);
    setError(null);

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

    await syncPistols(user.id, pistols);

    setSaving(false);
    onComplete();
  }

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-red-500">
            {mode === "edit" ? "Edit Your Profile" : "Build Your Profile"}
          </h1>
          <p className="text-center text-sm text-zinc-400">
            {mode === "edit"
              ? "Update your info and armory anytime."
              : "Tell us about yourself before your first drill."}
          </p>
        </TitleFrame>

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
                  className="h-16 w-16 rounded-full border-2 border-red-700 object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-zinc-600 text-center text-[10px] uppercase leading-tight tracking-wide text-zinc-500 hover:border-red-700 hover:text-red-400">
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

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-red-600 focus:outline-none"
          />

          <input
            type="number"
            min="0"
            max="120"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Age (optional)"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-red-600 focus:outline-none"
          />

          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-zinc-500">Shooting level</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SHOOTING_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setShootingLevel(level)}
                  className={`rounded border px-2 py-2 text-xs font-semibold uppercase tracking-wide ${
                    shootingLevel === level
                      ? "border-red-500 bg-red-950/40 text-red-400"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          </div>

          <input
            value={primaryPistol}
            onChange={(e) => setPrimaryPistol(e.target.value)}
            placeholder="Primary pistol trained with (e.g. Glock 19)"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-red-600 focus:outline-none"
          />
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Pistol Profile
            </div>
            <button
              onClick={addPistol}
              className="rounded border border-red-700 px-3 py-1 text-xs uppercase tracking-wide text-red-400 hover:bg-red-950"
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
                  className="flex flex-col gap-2 rounded-lg border border-red-900/50 bg-zinc-900/60 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Pistol {i + 1}
                    </span>
                    <button
                      onClick={() => removePistol(i)}
                      className="text-xs text-zinc-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PISTOL_FIELDS.map((f) => (
                      <input
                        key={f.key}
                        value={p[f.key]}
                        onChange={(e) => updatePistol(i, { [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-red-600 focus:outline-none"
                      />
                    ))}
                  </div>
                  <input
                    value={p.accessories}
                    onChange={(e) => updatePistol(i, { accessories: e.target.value })}
                    placeholder="Other accessories"
                    className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {error != null && <div className="text-center text-sm text-amber-400">{error}</div>}

        <div className="flex gap-2">
          <button
            disabled={!canSave}
            onClick={handleSave}
            className="flex-1 rounded-md bg-red-700 px-4 py-3 font-semibold uppercase tracking-wide text-white enabled:hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Save & Continue"}
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
