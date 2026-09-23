import type { SavedStage, StageProp } from "./types";

// Client-side only for now — layouts live in this browser, keyed per signed-in
// user so a shared device doesn't mix accounts. Not synced across devices.

interface StoredState {
  current: StageProp[];
  saved: SavedStage[];
}

function storageKey(userId: string | null): string {
  return `rr-stage-builder:${userId ?? "guest"}`;
}

function readState(userId: string | null): StoredState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { current: [], saved: [] };
    const parsed = JSON.parse(raw);
    return {
      current: Array.isArray(parsed.current) ? parsed.current : [],
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
    };
  } catch {
    return { current: [], saved: [] };
  }
}

function writeState(userId: string | null, state: StoredState) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the layout just won't persist this session.
  }
}

export function loadCurrentLayout(userId: string | null): StageProp[] {
  return readState(userId).current;
}

export function saveCurrentLayout(userId: string | null, props: StageProp[]) {
  const state = readState(userId);
  state.current = props;
  writeState(userId, state);
}

export function listSavedStages(userId: string | null): SavedStage[] {
  return readState(userId).saved;
}

export function saveNamedStage(userId: string | null, name: string, props: StageProp[]): SavedStage {
  const state = readState(userId);
  const stage: SavedStage = {
    id: `s${Date.now().toString(36)}`,
    name,
    savedAt: new Date().toISOString(),
    props,
  };
  state.saved = [stage, ...state.saved];
  writeState(userId, state);
  return stage;
}

export function deleteSavedStage(userId: string | null, id: string) {
  const state = readState(userId);
  state.saved = state.saved.filter((s) => s.id !== id);
  writeState(userId, state);
}
