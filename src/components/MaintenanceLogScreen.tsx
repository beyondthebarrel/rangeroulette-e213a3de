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

const SECTIONS: { type: MaintenanceEntryType; label: string; icon: string; placeholder: string }[] = [
  {
    type: "cleaning",
    label: "Cleaning Log",
    icon: "🧼",
    placeholder: "e.g. Full field-strip and clean, 250 rounds since last cleaning",
  },
  {
    type: "malfunction",
    label: "Malfunctions / Issues",
    icon: "⚠️",
    placeholder: "e.g. Failure to extract at round 40",
  },
  {
    type: "part_replaced",
    label: "Parts Replaced",
    icon: "🔧",
    placeholder: "e.g. Replaced recoil spring at 5,000 rounds",
  },
];

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

function MaintenanceSection({
  type,
  label,
  icon,
  placeholder,
  entries,
  pistols,
  pistolById,
  userId,
  onChanged,
}: {
  type: MaintenanceEntryType;
  label: string;
  icon: string;
  placeholder: string;
  entries: MaintenanceLogEntry[];
  pistols: PistolInput[];
  pistolById: Map<string, PistolInput>;
  userId: string | undefined;
  onChanged: () => void;
}) {
  const [date, setDate] = useState(todayDateString());
  const [description, setDescription] = useState("");
  const [pistolId, setPistolId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleAdd() {
    if (!userId || description.trim().length === 0) return;
    setSaving(true);
    setSaveError(null);
    const saved = await addMaintenanceLogEntry(userId, {
      entryType: type,
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
    onChanged();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    const ok = await deleteMaintenanceLogEntry(id);
    setDeletingId(null);
    setConfirmingId(null);
    if (!ok) {
      setDeleteError("Couldn't delete that entry — check your connection and try again.");
      return;
    }
    onChanged();
  }

  return (
    <Panel>
      <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
        {icon} {label}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
        />
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
      </div>

      <div className="flex gap-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
        />
        <button
          disabled={saving || description.trim().length === 0 || !userId}
          onClick={handleAdd}
          className="rounded bg-orange-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {saving ? "…" : "Add"}
        </button>
      </div>
      {saveError != null && <div className="text-xs text-amber-400">{saveError}</div>}

      {entries.length === 0 ? (
        <p className="text-center text-xs text-zinc-500">No entries yet.</p>
      ) : (
        <>
          {deleteError != null && <div className="text-xs text-amber-400">{deleteError}</div>}
          <ul className="flex flex-col gap-1.5">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-2 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5"
              >
                <div className="flex-1">
                  <div className="text-xs text-zinc-500">
                    {formatDate(e.loggedAt)}
                    {e.pistolId && pistolById.get(e.pistolId) && (
                      <> · 🔫 {pistolLabel(pistolById.get(e.pistolId)!)}</>
                    )}
                  </div>
                  <div className="text-sm text-zinc-200">{e.description}</div>
                </div>
                {confirmingId === e.id ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs">
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
                    className="shrink-0 text-zinc-500 hover:text-orange-400"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

export function MaintenanceLogScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MaintenanceLogEntry[] | null>(null);
  const [pistols, setPistols] = useState<PistolInput[]>([]);

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

  const pistolById = new Map(
    pistols.filter((p): p is PistolInput & { id: string } => !!p.id).map((p) => [p.id, p]),
  );

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

        {entries === null ? (
          <Panel>
            <p className="text-center text-sm text-zinc-400">Loading…</p>
          </Panel>
        ) : (
          SECTIONS.map((section) => (
            <MaintenanceSection
              key={section.type}
              type={section.type}
              label={section.label}
              icon={section.icon}
              placeholder={section.placeholder}
              entries={entries.filter((e) => e.entryType === section.type)}
              pistols={pistols}
              pistolById={pistolById}
              userId={user?.id}
              onChanged={() => user && loadEntries(user.id)}
            />
          ))
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
