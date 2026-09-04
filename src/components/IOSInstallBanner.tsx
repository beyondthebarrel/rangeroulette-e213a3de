import { useEffect, useState } from "react";

const DISMISSED_KEY = "rr-ios-install-dismissed";

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone(): boolean {
  return (
    ("standalone" in navigator && (navigator as unknown as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

/** A one-time nudge for iOS Safari, which has no native "install app" prompt like Chrome/Android does. */
export function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isIOS() && !isStandalone() && !localStorage.getItem(DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-md border border-orange-800 bg-orange-950/40 px-3 py-2 text-xs text-orange-300">
      <span>
        📲 Install this app: tap <span className="font-semibold">Share</span>, then{" "}
        <span className="font-semibold">"Add to Home Screen."</span>
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-orange-400 hover:text-orange-200"
      >
        ✕
      </button>
    </div>
  );
}
