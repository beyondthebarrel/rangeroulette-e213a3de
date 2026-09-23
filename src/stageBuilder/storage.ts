import type { SavedStage, StageProp } from "./types";

// Client-side only for now — layouts live in this browser, keyed per signed-in
// user so a shared device doesn't mix accounts. Not synced across devices.

interface CurrentLayout {
  props: StageProp[];
  courseOfFire: string;
}

interface StoredState {
  current: StageProp[];
  courseOfFire: string;
  saved: SavedStage[];
}

function storageKey(userId: string | null): string {
  return `rr-stage-builder:${userId ?? "guest"}`;
}

function readState(userId: string | null): StoredState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { current: [], courseOfFire: "", saved: [] };
    const parsed = JSON.parse(raw);
    return {
      current: Array.isArray(parsed.current) ? parsed.current : [],
      courseOfFire: typeof parsed.courseOfFire === "string" ? parsed.courseOfFire : "",
      saved: Array.isArray(parsed.saved)
        ? parsed.saved.map((s: SavedStage) => ({ ...s, courseOfFire: s.courseOfFire ?? "" }))
        : [],
    };
  } catch {
    return { current: [], courseOfFire: "", saved: [] };
  }
}

function writeState(userId: string | null, state: StoredState) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the layout just won't persist this session.
  }
}

export function loadCurrentLayout(userId: string | null): CurrentLayout {
  const state = readState(userId);
  return { props: state.current, courseOfFire: state.courseOfFire };
}

export function saveCurrentLayout(userId: string | null, props: StageProp[], courseOfFire: string) {
  const state = readState(userId);
  state.current = props;
  state.courseOfFire = courseOfFire;
  writeState(userId, state);
}

export function listSavedStages(userId: string | null): SavedStage[] {
  return readState(userId).saved;
}

export function saveNamedStage(
  userId: string | null,
  name: string,
  props: StageProp[],
  courseOfFire: string,
): SavedStage {
  const state = readState(userId);
  const stage: SavedStage = {
    id: `s${Date.now().toString(36)}`,
    name,
    savedAt: new Date().toISOString(),
    props,
    courseOfFire,
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
