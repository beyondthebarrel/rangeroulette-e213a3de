import type { TrainingSession } from "./types";

const QUEUE_KEY = "rr_pending_sessions";

export interface QueuedSession {
  localId: string;
  recordedBy: string;
  queuedAt: string;
  session: Omit<TrainingSession, "id" | "loggedAt">;
}

function readQueue(): QueuedSession[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSession[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedSession[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable — the session was already shown as logged
    // in the UI; losing the queue slot is better than throwing mid-drill.
  }
}

/** All sessions logged while offline that haven't reached the server yet, oldest first. */
export function getPendingSessions(recordedBy?: string): QueuedSession[] {
  const queue = readQueue();
  return recordedBy ? queue.filter((q) => q.recordedBy === recordedBy) : queue;
}

export function enqueueSession(
  session: Omit<TrainingSession, "id" | "loggedAt">,
  recordedBy: string,
): QueuedSession {
  const item: QueuedSession = {
    localId: crypto.randomUUID(),
    recordedBy,
    queuedAt: new Date().toISOString(),
    session,
  };
  writeQueue([...readQueue(), item]);
  return item;
}

export function removePendingSession(localId: string): void {
  writeQueue(readQueue().filter((q) => q.localId !== localId));
}

/** Updates the note on a session still queued offline — it'll carry over once the session syncs. */
export function updatePendingSessionNotes(localId: string, notes: string | undefined): void {
  writeQueue(
    readQueue().map((q) => (q.localId === localId ? { ...q, session: { ...q.session, notes } } : q)),
  );
}

/** Renders a queued item as a TrainingSession so it can sit alongside synced ones in History/Analytics before it reaches the server. */
export function pendingSessionToTrainingSession(q: QueuedSession): TrainingSession {
  return {
    id: `pending:${q.localId}`,
    loggedAt: q.queuedAt,
    pendingSync: true,
    ...q.session,
  };
}

export const PENDING_ID_PREFIX = "pending:";
