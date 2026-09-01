import { useEffect } from "react";
import { flushPendingSessions } from "./storage";

/** Retries any sessions queued while offline as soon as the browser reports a connection, and once on mount in case some were left over from a previous visit. */
export function useOfflineSync(userId: string | undefined): void {
  useEffect(() => {
    if (!userId) return;
    flushPendingSessions(userId);
    const handler = () => flushPendingSessions(userId);
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [userId]);
}
