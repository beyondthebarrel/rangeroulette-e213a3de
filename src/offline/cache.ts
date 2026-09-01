const PREFIX = "rr_cache:";

/** Last-known-good read cache for data that normally comes from the network, so screens aren't blank when offline. */
export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — caching is a nice-to-have, never fatal.
  }
}
