import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { readStored, removeStored, writeStored } from "../lib/safe-storage";
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
 *   text that is not the kit's shape already, once per text and key, whichever reader
 *   reads it first; its identity is ignored. **Define `migrate` once, at module level**,
 *   and hand every reader of the key the same one: readers of one key share one snapshot.
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
 */
export interface UseTourProgressOptions {
  storageKey: string;
  migrate?: (raw: unknown) => Record<string, string | null> | undefined;
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
const cache = new Map<string, { raw: string | null; value: TourCompletions }>();

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

function parse(raw: string | null, migrate: UseTourProgressOptions["migrate"]): TourCompletions {
  if (raw === null) return EMPTY;
  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    // Not JSON: `migrate` still sees the text.
  }
  if (migrate && !isKitShape(value)) {
    try {
      const migrated = migrate(value);
      if (migrated !== undefined) return fromRecord(migrated) ?? EMPTY;
    } catch {
      // A migrate that throws reads as "not a shape it knows".
    }
  }
  return fromRecord(value) ?? EMPTY;
}

function snapshot(key: string, migrate: UseTourProgressOptions["migrate"]): TourCompletions {
  const raw = rawOf(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  const value = parse(raw, migrate);
  cache.set(key, { raw, value });
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
 */
export function resetTourProgress(storageKey: string): void {
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
  const current = snapshot(storageKey, migrate);
  if (isTourDone(subject, current[subject.id])) return false;
  write(storageKey, { ...current, [subject.id]: new Date().toISOString() });
  return true;
}

/**
 * Write a completion from outside a page (§9.2): for an app's tests, seeds and scripts,
 * beside {@link resetTourProgress}. It writes the kit's stored shape (`{[id]: ISO | ""}`)
 * under `storageKey`, keeps the other tours' marks, and notifies every reader of the key
 * in this tab directly (the `storage` event reaches only OTHER tabs), so a mounted
 * `useTourProgress` or `TourCatalogue` moves at once.
 *
 * Unlike `complete`, it always writes: `at` is the completion's instant (an ISO string or
 * a `Date`, default now), `null` a completion without a date (stored as `""`).
 *
 *     completeTour(TOUR_KEY, "budget", "2026-09-01T10:00:00Z");
 *
 * A stored text in an app's older shape is read as the key's readers last read it (their
 * `migrate`); with no reader yet, only the kit's shape is kept.
 */
export function completeTour(storageKey: string, tour: string | { id: string }, at?: string | Date | null): void {
  const id = typeof tour === "string" ? tour : tour.id;
  const when = at === null ? null : at instanceof Date ? at.toISOString() : (at ?? new Date().toISOString());
  write(storageKey, { ...snapshot(storageKey, undefined), [id]: when });
}

/** The device's tour completions under `storageKey`; see {@link UseTourProgressOptions}. */
export function useTourProgress({ storageKey, migrate }: UseTourProgressOptions): TourProgress {
  // Held, not depended on: an inline arrow is a new function every render, and neither the
  // snapshot nor the callbacks may change with it.
  const migrateRef = useRef(migrate);
  useEffect(() => {
    migrateRef.current = migrate;
  });
  const completed = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(storageKey, listener), [storageKey]),
    () => snapshot(storageKey, migrateRef.current),
    () => EMPTY,
  );

  const complete = useCallback(
    (tour: CompletedTour) => completeStored(storageKey, migrateRef.current, tour),
    [storageKey],
  );

  const reset = useCallback(
    (id: string) => {
      const current = snapshot(storageKey, migrateRef.current);
      if (current[id] === undefined) return;
      const next = { ...current };
      delete next[id];
      write(storageKey, next);
    },
    [storageKey],
  );

  return useMemo(() => ({ completed, complete, reset }), [completed, complete, reset]);
}
