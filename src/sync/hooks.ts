import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { liveQuery } from "dexie";
import type { SyncStatus } from "../shell/sync-status-indicator";
import type { SyncDb } from "./db";
import type { SyncEngine, SyncEngineState } from "./engine";

/**
 * Keep `engine` running while it is mounted: started on mount, stopped on unmount or when
 * the engine changes (a company switch builds a new engine on its own database, D15).
 * `null` runs nothing — signed out, or a computer marked shared. Mount once, in the
 * signed-in layout (kastlan's `useHandoverSyncLoop`).
 */
export function useSyncWorker(engine: SyncEngine | null): void {
  useEffect(() => {
    if (!engine) return;
    engine.start();
    return () => engine.stop();
  }, [engine]);
}

const IDLE: SyncEngineState = {
  phase: "idle",
  online: true,
  counts: { pending: 0, waiting: 0, blocked: 0, rejected: 0 },
  lastSyncedAt: null,
  nextRetryAt: null,
};
const noEngine = () => () => undefined;
const idle = () => IDLE;

/**
 * The engine's state as the kit's `SyncStatusIndicator` reads it (§2.3): `pending` = queued
 * and in flight (and the steps' pending), `waitingForPlan` = `waiting`, `blocked` = `blocked`
 * + `rejected`, `lastSyncedAt` from `meta`. `onSync` is "Sync now". Without an engine, an
 * idle status that follows the browser's connection.
 */
export function useSyncStatus(engine: SyncEngine | null): { status: SyncStatus; onSync: () => Promise<void> } {
  const state = useSyncExternalStore(
    engine ? engine.subscribe : noEngine,
    engine ? engine.getState : idle,
    engine ? engine.getState : idle,
  );
  const browserOnline = useSyncExternalStore(subscribeOnline, readOnline, () => true);
  const onSync = useCallback(async () => {
    await engine?.syncNow();
  }, [engine]);
  const status: SyncStatus = {
    phase: state.phase,
    online: engine ? state.online : browserOnline,
    pending: state.counts.pending,
    waitingForPlan: state.counts.waiting,
    blocked: state.counts.blocked + state.counts.rejected,
    lastSyncedAt: state.lastSyncedAt,
  };
  return { status, onSync };
}

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}
const readOnline = () => navigator.onLine !== false;

/**
 * A read of the copy that follows every change to it (Dexie's `liveQuery`; kastlan's
 * `useLive`). `deps` names what `query` reads; `query` itself is rebuilt every render.
 */
export function useSyncQuery<T>(
  db: SyncDb | null,
  query: (db: SyncDb) => Promise<T>,
  deps: readonly unknown[],
): { data: T | undefined; isLoading: boolean } {
  const [state, setState] = useState<{ data: T | undefined; isLoading: boolean }>({ data: undefined, isLoading: true });
  useEffect(() => {
    if (!db) return;
    const subscription = liveQuery(() => query(db)).subscribe({
      next: (data) => setState({ data, isLoading: false }),
      error: () => setState({ data: undefined, isLoading: false }),
    });
    return () => subscription.unsubscribe();
    // `query` is rebuilt every render; `deps` names what it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ...deps]);
  return db ? state : NO_COPY;
}

const NO_COPY = { data: undefined, isLoading: false } as const;
