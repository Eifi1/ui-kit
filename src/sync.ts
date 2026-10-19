// `@eifi1/ui-kit/sync` — local-first phase 3 (docs/local-first-harmonization.md §2.3, 0.46):
// the sync engine on a Dexie copy, its worker and status hooks, and the live read of the copy.
//
// The only entry point that imports `dexie` — an optional peer for that reason. It never loads
// `/offline`'s TanStack and idb-keyval peers: the leaf utilities both entries export live in
// one module of their own (src/offline/local-first.ts). NOT re-exported from the main barrel.
export { createSyncDb, SYNC_DB_STORES } from "./sync/db";
export type { CreateSyncDbOptions, OutboxChange, OutboxStatus, SyncDb, SyncDbUpgrade, SyncedRow, SyncMetaEntry } from "./sync/db";
export { createSyncEngine, DEFAULT_HOLD_CODES, DEFAULT_SYNC_BACKOFF_MS } from "./sync/engine";
export type {
  SyncCounts,
  SyncEngine,
  SyncEngineOptions,
  SyncEngineState,
  SyncRoundResult,
  SyncStep,
  SyncStepContext,
  SyncStepResult,
} from "./sync/engine";
export { useSyncQuery, useSyncStatus, useSyncWorker } from "./sync/hooks";
export type {
  SyncPageCursor,
  SyncRefusalBody,
  SyncRejectionBody,
  SyncRequestBody,
  SyncResponseBody,
  SyncWireChange,
} from "./sync/wire";
export { isOfflineError, readLocalFirst, stampAfter, writeLocalFirst } from "./offline/local-first";
