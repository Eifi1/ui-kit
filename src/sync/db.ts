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
  /** The server's stamp of the row, as the pull carried it BESIDE `data` (kastlan's wire);
   *  the next edit here is stamped after it (`stampAfter`, D2). */
  updated_at?: string | null;
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
 * The `rows` schema with an `[entity+pk]` index (0.46.1), opt-in: the D16 pages start from a
 * server id (`/meters/7`) and {@link rowByPk} finds its copy row by this index. Not in
 * {@link SYNC_DB_STORES}, so no database on a device changes until its app names it in a
 * version of its own — kastlan, whose devices are on v2: `upgrades: [..., { version: 3,
 * stores: SYNC_DB_PK_INDEX }]`. A database new to the devices may take it at once:
 * `extraStores: { ...SYNC_DB_PK_INDEX }`.
 */
export const SYNC_DB_PK_INDEX = {
  rows: "[entity+id], entity, [entity+pk]",
} as const;

/**
 * The copy row of the server's id `pk` in `entity` (0.46.1): by the `[entity+pk]` index when
 * the database has it ({@link SYNC_DB_PK_INDEX}), else by a scan of the entity's rows.
 * `undefined` when the copy holds no such row.
 */
export async function rowByPk(db: SyncDb, entity: string, pk: number): Promise<SyncedRow | undefined> {
  if (db.rows.schema.idxByName["[entity+pk]"]) return db.rows.where("[entity+pk]").equals([entity, pk]).first();
  return db.rows
    .where("entity")
    .equals(entity)
    .filter((row) => row.pk === pk)
    .first();
}

/**
 * Open (lazily, on first use) the sync database `name`: the engine's tables plus the app's
 * `extraStores`, at version 1 or the last of `upgrades`. One database per account (kastlan:
 * per account and company, `kastlan-handover-<user>-<company>`), and one engine on it (D15).
 *
 * An app whose database predates the engine names its next version in `upgrades` and moves
 * its data there — kastlan: `{ version: 2, upgrade: (tx) => tx.table("outbox").toCollection()
 * .modify({ scope: "handover" }) }`. Dexie diffs the schema against the one on the device.
 * Name the app's own type for its tables: `createSyncDb<HandoverDb>(name, { extraStores })`.
 */
export function createSyncDb<D extends SyncDb = SyncDb>(name: string, options: CreateSyncDbOptions = {}): D {
  const db = new Dexie(name) as D;
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
