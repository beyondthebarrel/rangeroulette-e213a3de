import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  addMaintenanceLogEntry,
  deleteMaintenanceLogEntry,
  listMaintenanceLog,
  type MaintenanceEntryType,
  type MaintenanceLogEntry,
} from "../maintenance/storage";
import { listMyPistols, pistolLabel, type PistolInput } from "../profile";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

const ENTRY_TYPES: { value: MaintenanceEntryType; label: string; icon: string }[] = [
  { value: "cleaning", label: "Cleaning", icon: "🧼" },
  { value: "malfunction", label: "Malfunction", icon: "⚠️" },
  { value: "part_replaced", label: "Part Replaced", icon: "🔧" },
  { value: "note", label: "Note", icon: "📝" },
];

function entryTypeMeta(type: MaintenanceEntryType) {
  return ENTRY_TYPES.find((t) => t.value === type) ?? ENTRY_TYPES[3];
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Parsed as a local date (not UTC midnight, which can print as the day before).
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MaintenanceLogScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MaintenanceLogEntry[] | null>(null);
  const [pistols, setPistols] = useState<PistolInput[]>([]);

  const [entryType, setEntryType] = useState<MaintenanceEntryType>("cleaning");
  const [pistolId, setPistolId] = useState("");
  const [date, setDate] = useState(todayDateString());
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadEntries(uid: string) {
    setEntries(await listMaintenanceLog(uid));
  }

  useEffect(() => {
    if (user) loadEntries(user.id);
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

  const pistolById = new Map(pistols.filter((p) => p.id).map((p) => [p.id, p]));

  async function handleAddEntry() {
    if (!user || description.trim().length === 0) return;
    setSaving(true);
    setSaveError(null);
    const saved = await addMaintenanceLogEntry(user.id, {
      entryType,
      description,
      pistolId: pistolId || undefined,
      loggedAt: date,
    });
    setSaving(false);
    if (!saved) {
      setSaveError("Couldn't save that entry — check your connection and try again.");
      return;
    }
    setDescription("");
    await loadEntries(user.id);
  }

  async function handleDelete(id: string) {
    if (!user) return;
    setDeletingId(id);
    setDeleteError(null);
    const ok = await deleteMaintenanceLogEntry(id);
    setDeletingId(null);
    setConfirmingId(null);
    if (!ok) {
      setDeleteError("Couldn't delete that entry — check your connection and try again.");
      return;
    }
    await loadEntries(user.id);
  }

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
            Maintenance Log
          </h1>
          <p className="text-center text-sm text-zinc-400">
            Track cleanings, malfunctions, and parts replaced for each pistol.
          </p>
        </TitleFrame>

        <Panel>
          <div className="flex flex-wrap gap-2">
            {ENTRY_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setEntryType(t.value)}
                className={`rounded border px-3 py-1.5 text-xs uppercase tracking-wide ${
                  entryType === t.value
                    ? "border-orange-500 bg-orange-950/40 text-orange-400"
                    : "border-zinc-700 text-zinc-400 hover:border-orange-700 hover:text-orange-400"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {pistols.length > 0 && (
              <select
                value={pistolId}
                onChange={(e) => setPistolId(e.target.value)}
                className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
              >
                <option value="">Not tagged to a pistol</option>
                {pistols.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pistolLabel(p)}
                  </option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
            />
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Full field-strip and clean, 250 rounds since last cleaning"
            rows={3}
            className="w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
          />

          {saveError != null && <div className="text-sm text-amber-400">{saveError}</div>}

          <button
            disabled={saving || description.trim().length === 0 || !user}
            onClick={handleAddEntry}
            className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {saving ? "Logging…" : "Log Entry"}
          </button>
        </Panel>

        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Entries
          </div>
          {entries === null ? (
            <p className="text-center text-sm text-zinc-400">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">
              No maintenance entries yet. Log a cleaning, malfunction, or part change above to
              start tracking.
            </p>
          ) : (
            <>
              {deleteError != null && <div className="text-xs text-amber-400">{deleteError}</div>}
              <ul className="flex flex-col gap-2">
                {entries.map((e) => {
                  const meta = entryTypeMeta(e.entryType);
                  return (
                    <li
                      key={e.id}
                      className="rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-orange-400">
                          {meta.icon} {meta.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">{formatDate(e.loggedAt)}</span>
                          {confirmingId === e.id ? (
                            <span className="flex items-center gap-1 text-xs">
                              <span className="text-zinc-400">Delete?</span>
                              <button
                                onClick={() => handleDelete(e.id)}
                                disabled={deletingId === e.id}
                                className="rounded bg-orange-700 px-1.5 py-0.5 text-white hover:bg-orange-600 disabled:opacity-60"
                              >
                                {deletingId === e.id ? "…" : "Yes"}
                              </button>
                              <button
                                onClick={() => setConfirmingId(null)}
                                disabled={deletingId === e.id}
                                className="rounded bg-zinc-700 px-1.5 py-0.5 text-white hover:bg-zinc-600"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setConfirmingId(e.id);
                                setDeleteError(null);
                              }}
                              aria-label="Delete entry"
                              title="Delete entry"
                              className="text-zinc-500 hover:text-orange-400"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      {e.pistolId && pistolById.get(e.pistolId) && (
                        <div className="text-xs text-zinc-500">
                          🔫 {pistolLabel(pistolById.get(e.pistolId)!)}
                        </div>
                      )}
                      <div className="mt-1 text-sm text-zinc-300">{e.description}</div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>

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
