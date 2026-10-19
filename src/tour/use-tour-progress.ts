import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { readStored, removeStored, writeStored } from "../lib/safe-storage";
import { httpStatusOf } from "../auth/auth-errors";
import { isTourDone, type TourCompletions } from "./tour-info";

/**
 * Which tours this device has completed (docs/tours-harmonization.md §2.6, §6.2) —
 * keksdose's `tour-progress-store` and kastlan's `completions.ts`, as one hook.
 *
 * - **Device storage, the app's key.** `storageKey` is always the app's: an app on shared
 *   devices scopes it per account (KS, bench PCs), and an app that lists its keys
 *   (KS `storage-keys.ts`) spells it there. Every access is guarded: a blocked or full
 *   storage keeps the marks for this page's life instead of throwing.
 * - **One store, every reader.** A change notifies every hook on the same key in this tab
 *   (an in-tab emitter) and in other tabs (the `storage` event), so the tours page and
 *   `TourMenu` agree without a reload (ka F3).
 * - **`migrate(raw)`** reads an older shape, so nobody loses their done marks at adoption:
 *   it gets the stored JSON (or the raw text, if it is no JSON) and returns the record for
 *   a shape it recognises, `undefined` for any other — the kit's own shape included,
 *   which it then reads itself. keksdose: zustand's `{state: {completed}, version: 1}`;
 *   kastlan: an array of ids, completed without a date (`null`). It runs only on a stored
 *   text that is not the kit's shape already, once per text and key. The FIRST `migrate`
 *   any reader, `TourProvider` or {@link completeTour} passes for a key is remembered for
 *   that key (later identities are ignored), so a reader without one, mounted first, no
 *   longer hides the old marks from the rest (keksdose B-2). **Still, define the options
 *   once, at module level, and hand the provider and every reader the same object.**
 * - **Never overwritten unread** (keksdose B-1): a write (`complete`, the provider's,
 *   `completeTour`) on a stored text that is neither empty nor the kit's shape, and that no
 *   known `migrate` reads, THROWS instead of replacing the old marks.
 * - **Resetting the device** (settings §11): register the key with `reset: () =>
 *   resetTourProgress(storageKey)`, which clears storage and the page's memory and tells
 *   every reader in this tab.
 *
 * **The stored shape** (§9.3, §9.6.6), for an app's tests and seeds: the JSON record
 * `{ [id]: ISO instant | "" }` under `storageKey`, where `""` is a completion without a
 * date (a migrated record: kastlan's id list). That is the one written form; the hooks
 * and callbacks (`completed`, `TourCompletions`) give `null` for `""`. A `null` read from
 * storage (or returned by `migrate`) is accepted as the same thing and written back as
 * `""`. To write a completion from outside a page, use {@link completeTour}.
 *
 * **On the account** (0.45, §10.2–§10.3): with `account`, the device key becomes the
 * account's CACHE — see {@link TourProgressAccount}. Without it, nothing changes from 0.44.
 */
export interface UseTourProgressOptions {
  storageKey: string;
  migrate?: (raw: unknown) => Record<string, string | null> | undefined;
  /**
   * 0.45: the account's record behind the device key (§10.2.4). Remembered per key like
   * `migrate` (the FIRST one any reader or the provider passes wins), so define it once at
   * module level. With it, `storageKey` must be per account (a prefix plus the user id).
   * Signed out, and in a demo, pass none: the device record works as in 0.44.
   */
  account?: TourProgressAccount;
}

/** The record on the wire (§10.2.2): tour id → ISO instant, or `""` (done, no date). */
type TourProgressWire = Record<string, string>;

/** The `PATCH /tours/progress` body (§10.2.2): what to mark done, and what to forget.
 *  An id is never in both. Either may be left out. */
export interface TourProgressBody {
  completed?: TourProgressWire;
  forget?: string[];
}

/**
 * Taking over a device-wide record from before the account (§10.2.5), on the FIRST load
 * of the account key on this page:
 * - `{storageKey, discard: true}` (kastlan): removes the old key and uploads nothing — a
 *   shared PC must not hand one person another's marks. Removing an absent key is a no-op.
 * - `{storageKey, migrate?}`: reads the old key once (through `migrate` for an older
 *   shape), uploads it to the first account that signs in on this device, then removes it.
 */
export type TourProgressAdopt =
  | { storageKey: string; discard: true; migrate?: never }
  | { storageKey: string; discard?: false; migrate?: UseTourProgressOptions["migrate"] };

/**
 * The app's account record (§10.3): `load()` is its `GET /tours/progress`, `save(body)`
 * its `PATCH`, each resolving to the parsed answer, `{completed}` — the whole record.
 *
 * - The page paints from the device key at once (and offline); the account is loaded on
 *   the first reader of the key on this page, on `online`, and after each save, and its
 *   answer replaces the cache.
 * - A write (`complete`, the provider's finish, `reset`) goes to the cache at once and to
 *   a PENDING record beside it, `<storageKey>:pending` (`{synced, completed, forget}`),
 *   sent as one PATCH and cleared by its answer. A failure with no answer (offline, 5xx,
 *   401) keeps it for the next load or `online`; a 403 or 422 drops it and logs.
 * - `awarded` stays the device's answer against the cache (§10.2.4).
 * - The pending record is NOT the app's outbox: leave it out of any "N waiting" count
 *   and any sign-out guard (losing a tour mark is acceptable).
 * - A device record never synced (no `:pending` with `synced: true`) is uploaded whole on
 *   its first load, by the server's merge rule (later completion wins).
 * - On every end of a session call {@link signOutTourProgress}.
 */
export interface TourProgressAccount {
  load: () => Promise<{ completed: TourProgressWire }>;
  save: (body: TourProgressBody) => Promise<{ completed: TourProgressWire }>;
  adopt?: TourProgressAdopt;
}

/** What `complete` takes: a tour id, or the tour (`{id, updated}`, a `TourInfo` fits). */
type CompletedTour = string | { id: string; updated?: { date: string } | null };

export interface TourProgress {
  /** Tour id → the completion's ISO timestamp, or `null` when recorded without a date. */
  completed: TourCompletions;
  /**
   * Record a completion. Keeps the FIRST completion's date, so a replay changes nothing —
   * unless the tour was reset by an update since (§8): pass the tour (`{id, updated}`) and
   * a completion from before `updated.date` is replaced by today's.
   *
   * Returns `true` when this counts as a new completion — the moment to award the tour's
   * points and show the app's toast (§6.1) — and `false` for a replay.
   *
   * A tour started with `start(steps, {tour})` under a `TourProvider` that has `progress`
   * is recorded by the provider (§9.6.2): do not call this from that start's `onFinish`
   * too, or the second write answers `false`.
   */
  complete: (tour: CompletedTour) => boolean;
  /** "Mark as not done": forget the completion. */
  reset: (id: string) => void;
}

/* ── The store: one per key, shared by every hook ───────────────────────────── */

const EMPTY: TourCompletions = Object.freeze({});
/** In-tab listeners per key. */
const listeners = new Map<string, Set<() => void>>();
/** What this page wrote where storage refused to keep it (blocked, full): per key. */
const memory = new Map<string, string>();
/**
 * The last raw text read per key and what it parsed to, so a snapshot keeps its identity:
 * the same text gives the same object, whichever reader asks and whatever `migrate` it
 * holds. Several readers of one key with inline `migrate` arrows used to evict each other
 * here and loop (kastlan B1, 0.43).
 */
const cache = new Map<string, { raw: string | null; value: TourCompletions; readable: boolean }>();
type Migrate = NonNullable<UseTourProgressOptions["migrate"]>;
/** Each key's migrate: the first one any reader, the provider or `completeTour` passes (B-2). */
const migrates = new Map<string, Migrate>();

/**
 * Remember `migrate` for `key` if it is the first one, and return the key's migrate. A
 * snapshot parsed before the key had one is dropped and re-parsed, and the key's readers
 * hear of it after this render (never from inside one).
 * @internal Not part of the barrel; `TourProvider` registers its `progress` with it.
 */
export function rememberMigrate(key: string, migrate: UseTourProgressOptions["migrate"]): Migrate | undefined {
  if (migrate && !migrates.has(key)) {
    migrates.set(key, migrate);
    if (cache.delete(key)) queueMicrotask(() => emit(key));
  }
  return migrates.get(key);
}

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function rawOf(key: string): string | null {
  return memory.get(key) ?? readStored(key);
}

/** Is this the kit's own shape already: a record whose every value is a string or null? */
function isKitShape(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((at) => at === null || typeof at === "string");
}

/** The kit's own shape: a record of string or null; anything else is dropped. */
function fromRecord(value: unknown): TourCompletions | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string | null> = {};
  for (const [id, at] of Object.entries(value as Record<string, unknown>)) {
    if (at === null || at === "") out[id] = null;
    else if (typeof at === "string") out[id] = at;
  }
  return out;
}

/**
 * The record, and whether the text was READ (empty, the kit's shape, or a shape `migrate`
 * knows) rather than dropped: a write over an unread text would lose it (B-1).
 */
function parse(raw: string | null, migrate: UseTourProgressOptions["migrate"]): { value: TourCompletions; readable: boolean } {
  if (raw === null || raw.trim() === "") return { value: EMPTY, readable: true };
  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    // Not JSON: `migrate` still sees the text.
  }
  if (migrate && !isKitShape(value)) {
    try {
      const migrated = fromRecord(migrate(value));
      if (migrated !== undefined) return { value: migrated, readable: true };
    } catch {
      // A migrate that throws reads as "not a shape it knows".
    }
  }
  return { value: fromRecord(value) ?? EMPTY, readable: isKitShape(value) };
}

function snapshot(key: string, migrate: UseTourProgressOptions["migrate"]): TourCompletions {
  const known = rememberMigrate(key, migrate);
  const raw = rawOf(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  const parsed = parse(raw, known);
  cache.set(key, { raw, ...parsed });
  return parsed.value;
}

/** The record a write builds on; throws rather than overwrite a text nobody could read (B-1). */
function readForWrite(key: string, migrate: UseTourProgressOptions["migrate"], own = false): TourCompletions {
  // `own`: this migrate, even where the key registered another (completeTour's `{migrate}`).
  const known = rememberMigrate(key, migrate);
  const { value, readable } =
    own && migrate && known !== migrate
      ? parse(rawOf(key), migrate)
      : { value: snapshot(key, migrate), readable: cache.get(key)?.readable };
  if (!readable) {
    throw new Error(
      `[ui-kit] tour progress: the text stored under "${key}" is not the kit's shape and no migrate reads it; ` +
        "refusing to overwrite it. Pass the key's migrate (the shared useTourProgress / TourProvider options, " +
        "or completeTour's {migrate}).",
    );
  }
  return value;
}

/** The one written form (§9.6.6): a completion without a date is stored as `""`, never `null`. */
function write(key: string, record: TourCompletions) {
  const stored: Record<string, string> = {};
  for (const [id, at] of Object.entries(record)) stored[id] = at ?? "";
  const raw = JSON.stringify(stored);
  writeStored(key, raw);
  // Storage refused it (blocked, full): keep it for this page's life instead.
  if (readStored(key) === raw) memory.delete(key);
  else memory.set(key, raw);
  emit(key);
}

/* ── The account behind the device key (0.45, §10.2.4–§10.2.8) ─────────────── */

/** The key's account: the first one any reader or the provider passes (as `migrate`). */
const accounts = new Map<string, TourProgressAccount>();
/** Keys whose account was loaded (or is loading) on this page: the first reader loads. */
const loaded = new Set<string>();
/** Keys with a sync running, and those asked for another while it ran. */
const running = new Set<string>();
const rerun = new Set<string>();
/** Keys with a sync queued for the end of this task: two writes in one handler, one PATCH. */
const queued = new Set<string>();
/** Bumped by a sign-out: an answer that comes back after it never refills the cache. */
const epochs = new Map<string, number>();
/** The pending record where storage refused to keep it. */
const pendingMemory = new Map<string, string>();
let onlineListening = false;

/** The pending record (§10.2.4): what waits to be sent, and whether the device key was
 *  ever synced. */
interface PendingRecord {
  synced: boolean;
  completed: TourProgressWire;
  forget: string[];
}

const pendingKey = (key: string) => `${key}:pending`;

function devWarn(message: string) {
  if (import.meta.env?.DEV) console.warn(message);
}

/**
 * Remember `account` for `key` if it is the first one, and return the key's account.
 * @internal Not part of the barrel; `TourProvider` registers its `progress` with it.
 */
export function rememberAccount(key: string, account: TourProgressAccount | undefined): TourProgressAccount | undefined {
  if (account && !accounts.has(key)) {
    accounts.set(key, account);
    if (account.adopt && account.adopt.storageKey === key) {
      devWarn(
        `[ui-kit] tour progress: the account key "${key}" is the key \`adopt\` takes over. ` +
          "With an account the key must be per account (a prefix plus the user id), apart from the old device-wide key.",
      );
    }
    if (!onlineListening && typeof window !== "undefined") {
      onlineListening = true;
      window.addEventListener("online", () => {
        for (const known of loaded) void sync(known);
      });
    }
  }
  return accounts.get(key);
}

function readPending(key: string): PendingRecord | null {
  const raw = pendingMemory.get(key) ?? readStored(pendingKey(key));
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingRecord> | null;
    if (!value || typeof value !== "object") return null;
    const completed: TourProgressWire = {};
    for (const [id, at] of Object.entries(value.completed ?? {})) {
      if (typeof at === "string") completed[id] = at;
      else if (at === null) completed[id] = "";
    }
    const forget = Array.isArray(value.forget) ? value.forget.filter((id): id is string => typeof id === "string") : [];
    return { synced: value.synced === true, completed, forget };
  } catch {
    return null;
  }
}

function writePending(key: string, record: PendingRecord) {
  const raw = JSON.stringify(record);
  writeStored(pendingKey(key), raw);
  if (readStored(pendingKey(key)) === raw) pendingMemory.delete(key);
  else pendingMemory.set(key, raw);
}

const hasWork = (record: PendingRecord) => Object.keys(record.completed).length > 0 || record.forget.length > 0;

/** "Later completion wins" (§10.2.3), as the server merges: an instant beats `""`, `""`
 *  beats nothing, and between two instants the later is kept. */
function later(a: string | undefined, b: string): string {
  if (a === undefined || a === "") return b;
  if (b === "") return a;
  return Date.parse(b) > Date.parse(a) ? b : a;
}

/** Note a completion (or, with `forget`, its removal) in the key's pending record. */
function markPending(key: string, id: string, at: string | null | undefined, forget = false) {
  const record = readPending(key) ?? { synced: false, completed: {}, forget: [] };
  if (forget) {
    delete record.completed[id];
    if (!record.forget.includes(id)) record.forget.push(id);
  } else {
    record.completed[id] = at ?? "";
    record.forget = record.forget.filter((other) => other !== id);
  }
  writePending(key, record);
}

/** After an answer (or a 403/422): take what was sent out of the pending record, keeping
 *  what was written while the request ran. */
function clearSent(key: string, sent: TourProgressBody, synced: boolean) {
  const record = readPending(key) ?? { synced: false, completed: {}, forget: [] };
  for (const [id, at] of Object.entries(sent.completed ?? {})) {
    if (record.completed[id] === at) delete record.completed[id];
  }
  const forgotten = new Set(sent.forget ?? []);
  record.forget = record.forget.filter((id) => !forgotten.has(id));
  record.synced = record.synced || synced;
  writePending(key, record);
}

/** The account's answer as the cache, with what still waits to be sent laid over it. */
function refill(key: string, answer: { completed: TourProgressWire } | null | undefined) {
  const next: Record<string, string> = {};
  for (const [id, at] of Object.entries(fromRecord(answer?.completed) ?? {})) next[id] = at ?? "";
  const waiting = readPending(key);
  if (waiting) {
    for (const [id, at] of Object.entries(waiting.completed)) next[id] = later(next[id], at);
    for (const id of waiting.forget) delete next[id];
  }
  const record: Record<string, string | null> = {};
  for (const [id, at] of Object.entries(next)) record[id] = at === "" ? null : at;
  write(key, record);
}

/** The first load of an account key on this page takes over the old device-wide key
 *  (§10.2.5). */
function adoptOldRecord(key: string, account: TourProgressAccount) {
  const adopt = account.adopt;
  if (!adopt || adopt.storageKey === key) return;
  const old = adopt.storageKey;
  if (!adopt.discard) {
    const { value } = parse(rawOf(old), adopt.migrate ?? migrates.get(old));
    const entries = Object.entries(value);
    if (entries.length > 0) {
      const record = readPending(key) ?? { synced: false, completed: {}, forget: [] };
      for (const [id, at] of entries) record.completed[id] = later(record.completed[id], at ?? "");
      writePending(key, record);
    }
  }
  // Removed either way, at once: no second account on this device gets it.
  removeStored(old);
  memory.delete(old);
  cache.delete(old);
  emit(old);
}

/** A device record never synced is uploaded whole on its first load (§10.2.5). */
function uploadUnsynced(key: string) {
  const record = readPending(key);
  if (record?.synced) return;
  const device = snapshot(key, migrates.get(key));
  const entries = Object.entries(device);
  const next = record ?? { synced: false, completed: {}, forget: [] };
  if (entries.length === 0 && record) return;
  for (const [id, at] of entries) {
    if (!next.forget.includes(id)) next.completed[id] = later(next.completed[id], at ?? "");
  }
  writePending(key, next);
}

/** The key's first sync on this page: take over the old record, upload a never-synced one. */
function prepare(key: string) {
  loaded.add(key);
  adoptOldRecord(key, accounts.get(key)!);
  uploadUnsynced(key);
}

/** Queue a sync for the end of this task, so a handler's writes go as one PATCH. */
function queueSync(key: string) {
  if (!loaded.has(key)) prepare(key);
  if (queued.has(key)) return;
  queued.add(key);
  queueMicrotask(() => {
    queued.delete(key);
    void sync(key);
  });
}

/** The first reader of an account key on this page loads it. */
function ensureLoaded(key: string) {
  if (!accounts.has(key) || loaded.has(key)) return;
  prepare(key);
  void sync(key);
}

/**
 * Send what waits (one PATCH) or, with nothing waiting, load; the answer replaces the
 * cache. One at a time per key; a request asked for while one runs follows it.
 */
async function sync(key: string): Promise<void> {
  const account = accounts.get(key);
  if (!account || !loaded.has(key)) return;
  if (running.has(key)) {
    rerun.add(key);
    return;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  running.add(key);
  const epoch = epochs.get(key) ?? 0;
  try {
    const waiting = readPending(key);
    if (waiting && hasWork(waiting)) {
      const body: TourProgressBody = {};
      if (Object.keys(waiting.completed).length > 0) body.completed = { ...waiting.completed };
      if (waiting.forget.length > 0) body.forget = [...waiting.forget];
      let answer: { completed: TourProgressWire };
      try {
        answer = await account.save(body);
      } catch (error) {
        const status = httpStatusOf(error);
        if (status === 403 || status === 422) {
          // Refused for good (a demo, a malformed or full record): dropped, not retried.
          if ((epochs.get(key) ?? 0) === epoch) clearSent(key, body, false);
          console.warn(`[ui-kit] tour progress: the account refused the pending record (${status}); dropped.`, error);
        }
        // No answer (offline, 5xx, 401): it stays for the next load or `online`.
        return;
      }
      if ((epochs.get(key) ?? 0) !== epoch) return;
      clearSent(key, body, true);
      refill(key, answer);
    } else {
      const answer = await account.load();
      if ((epochs.get(key) ?? 0) !== epoch) return;
      if (waiting && !waiting.synced) writePending(key, { ...waiting, synced: true });
      else if (!waiting) writePending(key, { synced: true, completed: {}, forget: [] });
      refill(key, answer);
    }
  } catch {
    // A load that failed keeps the cache as it is.
  } finally {
    running.delete(key);
    if (rerun.delete(key)) void sync(key);
  }
}

/**
 * The end of a session (§10.2.6) — sign-out, a 401 nothing could renew, the account's
 * deletion, every path: removes the CACHE only (the device key and the page's snapshot;
 * every reader in this tab moves), synchronously and with no request, and KEEPS
 * `<storageKey>:pending`. That record sits under this person's own key, holds tour ids and
 * dates only, and goes out on their next sign-in. An answer still on its way is ignored.
 *
 *     function logout() { …; signOutTourProgress(`app.tours:${user.id}`); }
 */
export function signOutTourProgress(storageKey: string): void {
  epochs.set(storageKey, (epochs.get(storageKey) ?? 0) + 1);
  loaded.delete(storageKey);
  rerun.delete(storageKey);
  removeStored(storageKey);
  memory.delete(storageKey);
  cache.delete(storageKey);
  emit(storageKey);
}

function subscribe(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  // Another tab wrote (or cleared all storage: `key` null).
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== key) return;
    memory.delete(key);
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    set.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/**
 * Forget every tour completion under `storageKey` on this device: the stored key, what the
 * page kept in memory where storage refused it, and every reader in this tab moves at
 * once. For "Reset this device's settings" (settings §11):
 *
 *     registerDeviceSetting({ key: TOUR_KEY, kind: "view", reset: () => resetTourProgress(TOUR_KEY) });
 *
 * With an account (0.45) it clears the cache only: the account is never written, the
 * pending record stays ("anything waiting to be sent", settings §11.2.2) and the next load
 * refills the cache. Tour progress is never registered with the device reset (§10.2.8).
 */
export function resetTourProgress(storageKey: string): void {
  if (accounts.has(storageKey)) loaded.delete(storageKey);
  removeStored(storageKey);
  memory.delete(storageKey);
  cache.delete(storageKey);
  emit(storageKey);
}

/**
 * Record a completion under `storageKey`, as {@link TourProgress.complete} does: through
 * the one shared store and snapshot (never a copy), so every reader of the key moves.
 * Returns `true` when it counts anew. `TourProvider` calls this on a tour's last step.
 * @internal Not part of the barrel.
 */
export function completeStored(
  storageKey: string,
  migrate: UseTourProgressOptions["migrate"],
  tour: CompletedTour,
): boolean {
  const subject = typeof tour === "string" ? { id: tour } : tour;
  // Read now rather than from a render: two completions in one handler both count.
  const current = readForWrite(storageKey, migrate);
  if (isTourDone(subject, current[subject.id])) return false;
  const at = new Date().toISOString();
  write(storageKey, { ...current, [subject.id]: at });
  if (accounts.has(storageKey)) {
    markPending(storageKey, subject.id, at);
    queueSync(storageKey);
  }
  return true;
}

/** "Mark as not done" (§10.2.8): off the cache, and `forget` to the account. @internal */
function resetStored(storageKey: string, migrate: UseTourProgressOptions["migrate"], id: string) {
  const current = snapshot(storageKey, migrate);
  if (current[id] === undefined) return;
  const next = { ...current };
  delete next[id];
  write(storageKey, next);
  if (accounts.has(storageKey)) {
    markPending(storageKey, id, undefined, true);
    queueSync(storageKey);
  }
}

/**
 * Write a completion from outside a page (§9.2): for an app's tests, seeds and scripts,
 * beside {@link resetTourProgress}. It writes the kit's stored shape (`{[id]: ISO | ""}`)
 * under `storageKey`, keeps the other tours' marks, and notifies every reader of the key
 * in this tab directly (the `storage` event reaches only OTHER tabs), so a mounted
 * `useTourProgress` or `TourCatalogue` moves at once.
 *
 * Unlike `complete`, it always writes (over a readable text; see below): `at` is the
 * completion's instant (an ISO string or a `Date`, default now), `null` a completion
 * without a date (stored as `""`, read back as `null`).
 *
 *     completeTour(TOUR_KEY, "budget", "2026-09-01T10:00:00Z");
 *
 * A stored text in an app's older shape is read through `opts.migrate`, or else the
 * migrate a reader or the provider registered for the key. If the text is neither empty
 * nor the kit's shape and no migrate reads it, this THROWS and writes nothing (B-1):
 *
 *     completeTour(TOUR_KEY, "budget", undefined, { migrate: fromZustand });
 *
 * With an account on the key (0.45) it stays a device write — no request — and is marked
 * pending, so the next load sends it.
 */
export function completeTour(
  storageKey: string,
  tour: string | { id: string },
  at?: string | Date | null,
  opts?: { migrate?: UseTourProgressOptions["migrate"] },
): void {
  const id = typeof tour === "string" ? tour : tour.id;
  const when = at === null ? null : at instanceof Date ? at.toISOString() : (at ?? new Date().toISOString());
  write(storageKey, { ...readForWrite(storageKey, opts?.migrate, true), [id]: when });
  if (accounts.has(storageKey)) markPending(storageKey, id, when);
}

/** The device's tour completions under `storageKey`; see {@link UseTourProgressOptions}. */
export function useTourProgress({ storageKey, migrate, account }: UseTourProgressOptions): TourProgress {
  // Held, not depended on: an inline arrow is a new function every render, and neither the
  // snapshot nor the callbacks may change with it.
  const migrateRef = useRef(migrate);
  useEffect(() => {
    migrateRef.current = migrate;
  });
  // The first account for the key wins (as `migrate`); its first reader on the page loads.
  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  });
  useEffect(() => {
    if (rememberAccount(storageKey, accountRef.current)) ensureLoaded(storageKey);
  }, [storageKey]);
  const completed = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(storageKey, listener), [storageKey]),
    () => snapshot(storageKey, migrateRef.current),
    () => EMPTY,
  );

  const complete = useCallback(
    (tour: CompletedTour) => completeStored(storageKey, migrateRef.current, tour),
    [storageKey],
  );

  const reset = useCallback((id: string) => resetStored(storageKey, migrateRef.current, id), [storageKey]);

  return useMemo(() => ({ completed, complete, reset }), [completed, complete, reset]);
}
