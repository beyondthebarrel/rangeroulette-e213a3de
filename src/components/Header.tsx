import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useGame } from "../game/GameContext";
import { getMyDisplayName, updateMyDisplayName } from "../profile";

export function Header() {
  const { state, dispatch } = useGame();
  const { user, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyDisplayName(user.id, user.email).then((name) => {
      if (!cancelled) setDisplayName(name);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function startEditing() {
    setDraftName(displayName ?? "");
    setEditing(true);
  }

  async function handleSaveName() {
    if (!user || draftName.trim().length === 0) return;
    setSaving(true);
    const ok = await updateMyDisplayName(user.id, draftName);
    setSaving(false);
    if (ok) {
      setDisplayName(draftName.trim());
      setEditing(false);
    }
  }

  if (state.phase === "setup") {
    return (
      <div className="border-b border-orange-900/50 bg-black px-4 py-1.5 text-right">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-2 text-xs text-zinc-500">
          {editing ? (
            <>
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="Nickname"
                className="w-32 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-white focus:border-orange-600 focus:outline-none"
              />
              <button
                onClick={handleSaveName}
                disabled={saving || draftName.trim().length === 0}
                className="text-orange-400 hover:text-orange-300 disabled:opacity-50"
              >
                {saving ? "…" : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-zinc-300">
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="truncate" title={user?.email ?? undefined}>
                {displayName ?? user?.email}
              </span>
              <button
                onClick={startEditing}
                aria-label="Edit nickname"
                title="Edit nickname"
                className="text-zinc-600 hover:text-orange-400"
              >
                ✎
              </button>
            </>
          )}
          <span className="text-zinc-700">·</span>
          <button onClick={() => signOut()} className="text-zinc-500 hover:text-zinc-300">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-orange-900/50 bg-black px-4 py-2">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
          {state.players.map((p) => (
            <span key={p.id}>
              {p.name}
              {/* Hidden during the round-result reveal (3+ players only, where that reveal is a tap-through countdown) so the point tally doesn't spoil who just won before the tap-through does. */}
              {!(state.phase === "roundResult" && state.players.length >= 3) && (
                <>
                  {" "}
                  <span className="text-orange-400">{p.points}</span>
                </>
              )}
            </span>
          ))}
        </div>
        {confirming ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">End match?</span>
            <button
              onClick={() => {
                dispatch({ type: "RESET_MATCH" });
                setConfirming(false);
              }}
              className="rounded bg-orange-700 px-2 py-1 text-white hover:bg-orange-600"
            >
              Yes, Title Screen
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded bg-zinc-700 px-2 py-1 text-white hover:bg-zinc-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            ← Title Screen
          </button>
        )}
      </div>
      {state.activeWhoopsies.length > 0 && (
        <div className="mx-auto mt-1 max-w-3xl text-xs text-pink-300">
          Active Whoopsie:{" "}
          {state.activeWhoopsies.map((w) => w.instance.def.text).join(" · ")}
        </div>
      )}
    </div>
  );
}
