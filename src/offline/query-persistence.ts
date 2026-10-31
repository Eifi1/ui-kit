import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { QueryClient } from "@tanstack/react-query";
import type { PersistedClient, PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { del, get, keys, set } from "idb-keyval";

/**
 * The persisted TanStack Query cache, keksdose's policy as a kit helper
 * (docs/local-first-harmonization.md §1.5 D4, D5, D7; §1.6). keksdose's
 * shared/state/query-client.ts is the canon: an IndexedDB persister, a deny-list, the
 * plain-JSON guard on write (`shouldDehydrateQuery`) and its twin on restore that keeps
 * paused mutations. On top: a key per account (and company), a scrub list that removes
 * secret fields from payloads that are otherwise wanted offline, and `removeStale` for
 * another account's leftovers.
 *
 * The only module of the kit that imports TanStack and idb-keyval: both are optional peers
 * of `@eifi1/ui-kit/offline` and never reached from the main barrel (packaging-contract).
 */

/** A field name the scrub removes: an exact name, or a pattern (`/^signature_/`). */
export type ScrubField = string | RegExp;

/**
 * Removed from every query's data, at any depth, before it is persisted (D4, D7): bank
 * account numbers and the handover protocol's signatures. A page restored offline shows
 * such a field as missing ("Needs a connection").
 */
export const DEFAULT_SCRUB_FIELDS: readonly ScrubField[] = Object.freeze([
  "iban",
  "qr_iban",
  "default_qr_iban",
  /^signature_/,
]);

/** The storage the persister writes to. The default is IndexedDB through idb-keyval. */
export interface QueryPersistenceStorage {
  getItem: (key: string) => Promise<string | null | undefined>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
  /** Every key in the store — what `removeStale` walks. */
  keys: () => Promise<readonly unknown[]>;
}

export interface QueryPersistenceOptions {
  /** The app's name, the key's first part: `kastlan` → `kastlan-query-cache-…`. */
  app: string;
  /** The signed-in account. One cache per account (D5). */
  user: string | number;
  /** The acting company, where the app has several (kastlan): the switch changes the key,
   *  so no wipe and no cross-company leak — provided the app switches as
   *  {@link QueryPersistence.leave} says (leave, then remount the provider per key). */
  company?: string | number | null;
  /** The app's own rule, beside `denyRoots` — keksdose denies one exact key and every key
   *  whose second segment is `"admin"`. `false` keeps the query out. */
  shouldPersistKey?: (queryKey: readonly unknown[]) => boolean;
  /** Query roots (`queryKey[0]`) that never reach the disk: admin, billing, reports… */
  denyRoots?: readonly string[];
  /** Replaces {@link DEFAULT_SCRUB_FIELDS}; spread it to add to it. `[]` scrubs nothing.
   *  A paused mutation whose variables carry one of these fields is never persisted (a
   *  scrubbed mutation would send something else), and one an older build wrote is dropped
   *  on restore. */
  scrubFields?: readonly ScrubField[];
  /** Told when a query's data is not plain JSON and is therefore not persisted. Default:
   *  `console.error`, as keksdose's `cacheSafeOrWarn`. */
  onUnsafe?: (queryKey: readonly unknown[], data: unknown) => void;
  /** Changes with each deploy (the app version), so a new build discards the old cache. */
  buster: string;
  /** How long a persisted cache is good for, in ms (keksdose: 24 h). The QueryClient's
   *  `gcTime` must be at least this, or restore drops every query. */
  maxAge: number;
  /** Default: IndexedDB (idb-keyval). Tests pass an in-memory one. */
  storage?: QueryPersistenceStorage;
  /** Default 1000 ms, as keksdose. */
  throttleTime?: number;
  /**
   * 0.46 (kastlan K1): whether paused mutations are written with the cache. Default `true`
   * (keksdose: an offline write waits in TanStack's queue and is sent after a reload).
   * `false` keeps every mutation off the disk, and drops any an older build wrote on
   * restore — for an app that queues offline writes in its own outbox (kastlan's Dexie
   * outbox), instead of overriding `dehydrateOptions` by hand.
   */
  persistMutations?: boolean;
}

/**
 * One persisted cache, for one key. **Mount it per key**: the provider subscribes once and
 * ignores a changed `persistOptions`, so give it the key as its React key —
 *
 * ```tsx
 * <PersistQueryClientProvider key={persistence.key} client={queryClient} persistOptions={persistence.persistOptions}>
 * ```
 *
 * — and create the persistence once the account (and company) is known (`useMemo` on
 * them); before sign-in, mount the plain `QueryClientProvider`. On a company switch, call
 * {@link QueryPersistence.leave} on the old one BEFORE the new key mounts, instead of a bare
 * `queryClient.clear()`: otherwise the old subscription saves the emptied (or the next
 * company's) cache under the old key.
 */
export interface QueryPersistence {
  /** `<app>-query-cache-<user>[-<company>]`. */
  key: string;
  /** Everything `<PersistQueryClientProvider persistOptions>` needs. */
  persistOptions: Omit<PersistQueryClientOptions, "queryClient">;
  /** Sign-out: stops writing under this key, empties the in-memory cache and deletes this
   *  key's persisted copy. In every tab (0.52): the persistences of this key in the other tabs
   *  stop writing too, and delete the key once more after any save of theirs under way.
   *  Best-effort; never throws. */
  clear: (queryClient: QueryClient) => Promise<void>;
  /** The company switch (or any change of key without a sign-out): stops writing under this
   *  key — a save already scheduled is dropped too — and empties the in-memory cache, so
   *  the next key's provider starts clean. The persisted copy stays for the way back. A
   *  provider that mounts this persistence again re-arms it with its restore. Never throws. */
  leave: (queryClient: QueryClient) => Promise<void>;
  /** At sign-in: deletes this app's OTHER persisted caches older than `maxAge` (another
   *  account's, another company's). Other apps' keys and fresh ones stay. Never throws. */
  removeStale: () => Promise<void>;
}

const idbStorage: QueryPersistenceStorage = {
  getItem: (key) => get<string>(key),
  setItem: (key, value) => set(key, value),
  removeItem: (key) => del(key),
  keys: () => keys(),
};

export interface RemoveStaleQueryCopiesOptions {
  /** Default: IndexedDB (idb-keyval), the store {@link createQueryPersistence} writes to. */
  storage?: QueryPersistenceStorage;
  /** One key to spare whatever its age — the signed-in account's own
   *  (`QueryPersistence.removeStale` passes its key). */
  keep?: string;
}

/**
 * 0.46 (kastlan K2): deletes this app's persisted query caches (`<app>-query-cache-…`)
 * older than `maxAge`, with no persistence at hand — for the sign-in page, where no
 * account is known. A session that ended with no user known (a refresh token refused at
 * boot) cannot name its key for `clear`; this sweeps its copy once it is stale, without
 * waiting for someone's next sign-in. Other apps' keys, other stores' keys and fresh
 * caches stay; an unreadable one is stale. Never throws.
 * {@link QueryPersistence.removeStale} is this with `keep` = its own key.
 */
export async function removeStaleQueryCopies(
  app: string,
  maxAge: number,
  { storage = idbStorage, keep }: RemoveStaleQueryCopiesOptions = {},
): Promise<void> {
  const prefix = `${app}-query-cache-`;
  try {
    const now = Date.now();
    for (const k of await storage.keys()) {
      if (typeof k !== "string" || !k.startsWith(prefix) || k === keep) continue;
      let timestamp = 0;
      try {
        const raw = await storage.getItem(k);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === "object" && typeof (parsed as PersistedClient).timestamp === "number") {
          timestamp = (parsed as PersistedClient).timestamp;
        }
      } catch {
        /* unreadable: stale */
      }
      if (now - timestamp > maxAge) await storage.removeItem(k);
    }
  } catch {
    /* best-effort */
  }
}

/**
 * True when `data` still means the same thing after JSON.stringify and JSON.parse —
 * keksdose's `isCacheSafe` (query-client.ts:165). Class instances, Map/Set/Date/Blob, a
 * non-finite number, a function: all refused. An `undefined` property survives.
 */
export function isCacheSafe(data: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (data === null) return true;
  const t = typeof data;
  if (t === "string" || t === "boolean") return true;
  if (t === "number") return Number.isFinite(data as number);
  if (t !== "object") return false;
  if (Array.isArray(data)) return data.every((v) => isCacheSafe(v, depth + 1));
  const proto: unknown = Object.getPrototypeOf(data);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(data as Record<string, unknown>).every((v) => v === undefined || isCacheSafe(v, depth + 1));
}

/** A copy of `data` without the scrubbed fields, at any depth. The input is not touched. */
function scrub(data: unknown, fields: readonly ScrubField[]): unknown {
  if (fields.length === 0 || data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map((v) => scrub(v, fields));
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
    if (fields.some((f) => (typeof f === "string" ? f === name : f.test(name)))) continue;
    out[name] = scrub(value, fields);
  }
  return out;
}

const defaultOnUnsafe = (queryKey: readonly unknown[]) => {
  console.error(
    `[query-cache] refusing to persist ${JSON.stringify(queryKey)}: the value is not plain JSON ` +
      `(a class instance, Map, Set, Date or Blob). Return plain data from the queryFn and build ` +
      `the rich object at the call site.`,
  );
};

export function createQueryPersistence({
  app,
  user,
  company,
  shouldPersistKey,
  denyRoots = [],
  scrubFields = DEFAULT_SCRUB_FIELDS,
  onUnsafe = defaultOnUnsafe,
  buster,
  maxAge,
  storage = idbStorage,
  throttleTime = 1000,
  persistMutations = true,
}: QueryPersistenceOptions): QueryPersistence {
  const prefix = `${app}-query-cache-`;
  const key = `${prefix}${user}${company === undefined || company === null || company === "" ? "" : `-${company}`}`;
  const denied = new Set(denyRoots);
  // Set by `leave` and `clear`: a write under this key after the person left it (a
  // throttled save of the emptied cache) is dropped. A restore re-arms it.
  let retired = false;

  // 0.52 (refactor audit 2026-10-30, FLW-1): `retired` lived in this tab alone, so a sign-out
  // in one tab deleted the key and another tab's persister wrote its in-memory cache straight
  // back under it. While armed, a persistence listens on a channel named after its key; a
  // `clear` there retires it, and it deletes the key once more — IndexedDB runs a save of its
  // own already under way first. A `leave` posts nothing: another tab may still be on that
  // company. Without BroadcastChannel, as before 0.52.
  const across = `eifi1-query-cache:${key}`;
  let channel: BroadcastChannel | null = null;

  const retire = () => {
    retired = true;
    channel?.close();
    channel = null;
  };

  const listen = () => {
    if (channel || typeof BroadcastChannel === "undefined") return;
    try {
      channel = new BroadcastChannel(across);
    } catch {
      return;
    }
    // Node's channel (an app's tests) holds its worker open while it listens, and a test that
    // restores and never leaves would keep it listening. Browsers have no `unref`.
    (channel as BroadcastChannel & { unref?: () => void }).unref?.();
    channel.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (data !== "clear") return;
      retire();
      Promise.resolve()
        .then(() => storage.removeItem(key))
        .catch(() => undefined);
    };
  };

  const tellOtherTabs = () => {
    if (typeof BroadcastChannel === "undefined") return;
    try {
      const out = new BroadcastChannel(across);
      out.postMessage("clear");
      out.close();
    } catch {
      /* best-effort */
    }
  };

  const keyAllowed = (queryKey: readonly unknown[]) =>
    !denied.has(String(queryKey[0])) && (shouldPersistKey ? shouldPersistKey(queryKey) : true);

  /** The write side: a success, an allowed key, plain JSON (or the warning). */
  const shouldDehydrateQuery = (query: {
    queryKey: readonly unknown[];
    state: { status: string; data?: unknown };
  }): boolean => {
    if (query.state.status !== "success" || !keyAllowed(query.queryKey)) return false;
    if (isCacheSafe(query.state.data)) return true;
    onUnsafe(query.queryKey, query.state.data);
    return false;
  };

  /** One persisted query entry, scrubbed; `null` when it may not be restored. */
  const restorable = (entry: unknown): unknown => {
    if (!entry || typeof entry !== "object") return null;
    const { queryKey, state } = entry as { queryKey?: unknown; state?: { data?: unknown } };
    if (!Array.isArray(queryKey) || !keyAllowed(queryKey)) return null;
    if (!isCacheSafe(state?.data)) return null;
    return withScrubbedData(entry);
  };

  /** Whether `value` has a scrubbed field's name anywhere in it. */
  const carriesScrubbed = (value: unknown, depth = 0): boolean => {
    if (scrubFields.length === 0 || depth > 12 || value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some((v) => carriesScrubbed(v, depth + 1));
    return Object.entries(value as Record<string, unknown>).some(
      ([name, v]) =>
        scrubFields.some((f) => (typeof f === "string" ? f === name : f.test(name))) || carriesScrubbed(v, depth + 1),
    );
  };

  /** The write side for mutations: TanStack's default (paused ones), minus any whose
   *  variables carry a scrubbed field (S6); none at all with `persistMutations: false`. */
  const shouldDehydrateMutation = (mutation: { state: { isPaused: boolean; variables?: unknown } }): boolean =>
    persistMutations && mutation.state.isPaused && !carriesScrubbed(mutation.state.variables);

  const withScrubbedData = (entry: unknown): unknown => {
    const query = entry as { state?: { data?: unknown } };
    if (!query.state || !("data" in query.state)) return entry;
    return { ...query, state: { ...query.state, data: scrub(query.state.data, scrubFields) } };
  };

  // The scrub on the way OUT: the in-memory cache keeps the field (the page that is open
  // shows it), the disk never sees it. Mutations are a paused write queue and are kept
  // whole — scrubbing one would change what it sends — so one carrying a scrubbed field is
  // not written at all (`shouldDehydrateMutation`).
  const serialize = (client: PersistedClient): string =>
    JSON.stringify({
      ...client,
      clientState: { ...client.clientState, queries: client.clientState.queries.map(withScrubbedData) },
    });

  // The twin on the way IN (keksdose's `sanitizePersistedCache`, :264-298): an older build
  // wrote what this one may deny. Never throws; an unreadable blob comes back with
  // `timestamp: 0`, which the restore treats as unusable and removes.
  const deserialize = (raw: string): PersistedClient => {
    const empty: PersistedClient = { timestamp: 0, buster: "", clientState: { mutations: [], queries: [] } };
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return empty;
      const { timestamp, buster: stored, clientState } = parsed as Partial<PersistedClient>;
      if (typeof timestamp !== "number" || typeof stored !== "string") return empty;
      if (!clientState || typeof clientState !== "object" || !Array.isArray(clientState.queries)) return empty;
      return {
        timestamp,
        buster: stored,
        clientState: {
          mutations:
            persistMutations && Array.isArray(clientState.mutations)
              ? clientState.mutations.filter(
                  (m) => !carriesScrubbed((m as { state?: { variables?: unknown } } | null)?.state?.variables),
                )
              : [],
          queries: clientState.queries
            .map(restorable)
            .filter((q) => q !== null) as PersistedClient["clientState"]["queries"],
        },
      };
    } catch {
      return empty;
    }
  };

  const persister = createAsyncStoragePersister({
    storage: {
      // Only the provider's restore reads: mounting this persistence again re-arms it.
      getItem: async (k) => {
        retired = false;
        listen();
        return (await storage.getItem(k)) ?? null;
      },
      setItem: async (k, v) => {
        if (!retired) await storage.setItem(k, v);
      },
      removeItem: async (k) => {
        await storage.removeItem(k);
      },
    },
    key,
    throttleTime,
    serialize,
    deserialize,
  });

  const leave = async (queryClient: QueryClient) => {
    retire();
    try {
      queryClient.clear();
    } catch {
      /* best-effort */
    }
  };

  const clear = async (queryClient: QueryClient) => {
    retire();
    // Before this tab's delete: the other tabs stop writing as early as they can.
    tellOtherTabs();
    try {
      queryClient.clear();
      await persister.removeClient();
    } catch {
      /* best-effort: private mode / IndexedDB unavailable */
    }
  };

  const removeStale = () => removeStaleQueryCopies(app, maxAge, { storage, keep: key });

  return {
    key,
    persistOptions: { persister, maxAge, buster, dehydrateOptions: { shouldDehydrateQuery, shouldDehydrateMutation } },
    clear,
    leave,
    removeStale,
  };
}
