import Dexie, { type Table, type Transaction } from "dexie";

/*
 * The device's copy for the sync engine (docs/local-first-harmonization.md §2.3, D10): ONE
 * Dexie database with the engine's three tables — the rows as `/sync` carries them, the
 * outbox of changes made here, and a key/value `meta` — plus the app's own (kastlan's
 * `photos`). A generic store, not keksdose's per-entity tables.
 */

/** A row as `/sync` carries it: the entity (a table name), its sync id, the server's id
 *  once it has one, and its fields. */
export interface SyncedRow {
  entity: string;
  id: string;
  pk: number | null;
  data: Record<string, unknown>;
}

/**
 * Where a change made here stands. `pending`: queued. `sending`: in the request now out (a
 * new edit starts a change of its own). `waiting`: refused with a hold code (a lapsed plan,
 * `holdCodes`), sent again every round. `blocked`: refused with any other code, kept, sent
 * again only on `retryBlocked()`. `rejected`: the server's rules refused it (`reason` says
 * why); never sent again.
 */
export type OutboxStatus = "pending" | "sending" | "waiting" | "blocked" | "rejected";

/** A change made on this device, for `/sync`, in the scope its caller named (D11). */
export interface OutboxChange {
  seq?: number;
  scope: string;
  entity: string;
  id: string;
  op: "upsert" | "delete";
  data: Record<string, unknown>;
  /** The edit's time on this device (D2), stamped with `stampAfter`. */
  updated_at: string;
  status: OutboxStatus;
  /** The server's words: a rejection's `detail`, a refusal's `detail`. */
  reason?: string;
  /** The server's code: a rejection's or a refusal's `code`. */
  code?: string;
}

export interface SyncMetaEntry {
  key: string;
  value: unknown;
}

/** The engine's database: its three tables, and the app's own under the names it gave. */
export type SyncDb = Dexie & {
  rows: Table<SyncedRow, [string, string]>;
  outbox: Table<OutboxChange, number>;
  meta: Table<SyncMetaEntry, string>;
};

/** A schema step of an existing database (kastlan's v2: `scope` on the outbox). */
export interface SyncDbUpgrade {
  version: number;
  /** Stores this version adds or changes, beside the engine's and `extraStores`. */
  stores?: Record<string, string | null>;
  upgrade?(tx: Transaction): Promise<void> | void;
}

export interface CreateSyncDbOptions {
  /** The app's own tables, Dexie schema strings: kastlan `{ photos: "id, roomId, status" }`. */
  extraStores?: Record<string, string>;
  /** Later versions of a database that exists on devices already, oldest first. */
  upgrades?: readonly SyncDbUpgrade[];
}

/** The engine's own tables. `scope` is indexed: a round takes one scope's queue (D11). */
export const SYNC_DB_STORES = {
  rows: "[entity+id], entity",
  outbox: "++seq, [entity+id], status, scope",
  meta: "key",
} as const;

/**
 * Open (lazily, on first use) the sync database `name`: the engine's tables plus the app's
 * `extraStores`, at version 1 or the last of `upgrades`. One database per account (kastlan:
 * per account and company, `kastlan-handover-<user>-<company>`), and one engine on it (D15).
 *
 * An app whose database predates the engine names its next version in `upgrades` and moves
 * its data there — kastlan: `{ version: 2, upgrade: (tx) => tx.table("outbox").toCollection()
 * .modify({ scope: "handover" }) }`. Dexie diffs the schema against the one on the device.
 */
export function createSyncDb(name: string, options: CreateSyncDbOptions = {}): SyncDb {
  const db = new Dexie(name) as SyncDb;
  let stores: Record<string, string | null> = { ...SYNC_DB_STORES, ...options.extraStores };
  db.version(1).stores(stores);
  const upgrades = [...(options.upgrades ?? [])].sort((a, b) => a.version - b.version);
  for (const step of upgrades) {
    stores = { ...stores, ...step.stores };
    const version = db.version(step.version).stores(stores);
    if (step.upgrade) version.upgrade(step.upgrade);
  }
  return db;
}
