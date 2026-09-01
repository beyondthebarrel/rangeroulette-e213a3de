const KEY = "rr_hidden_shooters";

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function readHidden(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeHidden(names: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...names]));
  } catch {
    // Storage full or unavailable — this is just a display preference, never fatal.
  }
}

/**
 * Names hidden from this device's "Prior Shooters" quick-add suggestions in
 * Game Mode. Local only, per device — `match_results` is a shared leaderboard
 * across every signed-in account with no delete permission, so this can only
 * ever declutter the local suggestion list, never touch anyone's standings.
 */
export function getHiddenShooterNames(): Set<string> {
  return readHidden();
}

export function hideShooterName(name: string): void {
  const hidden = readHidden();
  hidden.add(normalize(name));
  writeHidden(hidden);
}

export function hideShooterNames(names: string[]): void {
  const hidden = readHidden();
  for (const n of names) hidden.add(normalize(n));
  writeHidden(hidden);
}
