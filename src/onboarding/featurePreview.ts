const SEEN_KEY = "range-roulette-seen-feature-preview-v1";

export function hasSeenFeaturePreview(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFeaturePreviewSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // ignore — non-critical convenience feature
  }
}
