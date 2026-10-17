import { useCallback, useMemo, useSyncExternalStore } from "react";
import { readStored, writeStored } from "../lib/safe-storage";
import { isTourDone, type TourCompletions, type TourUpdate } from "./tour-info";

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
 *   kastlan: an array of ids, completed without a date (`null`).
 *
 * The kit's own shape is the record itself, `{ [id]: ISO | null }`; an empty string reads
 * as `null` (kastlan's record of 0.42).
 */
export interface UseTourProgressOptions {
  storageKey: string;
  migrate?: (raw: unknown) => Record<string, string | null> | undefined;
}

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
   */
  complete: (tour: string | { id: string; updated?: TourUpdate | null }) => boolean;
  /** "Mark as not done": forget the completion. */
  reset: (id: string) => void;
}

/* ── The store: one per key, shared by every hook ───────────────────────────── */

const EMPTY: TourCompletions = Object.freeze({});
/** In-tab listeners per key. */
const listeners = new Map<string, Set<() => void>>();
/** What this page wrote where storage refused to keep it (blocked, full): per key. */
const memory = new Map<string, string>();
/** The last raw text read per key and what it parsed to, so a snapshot keeps its identity. */
const cache = new Map<string, { raw: string | null; migrate: unknown; value: TourCompletions }>();

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function rawOf(key: string): string | null {
  return memory.get(key) ?? readStored(key);
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
  if (migrate) {
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
  if (hit && hit.raw === raw && hit.migrate === migrate) return hit.value;
  const value = parse(raw, migrate);
  cache.set(key, { raw, migrate, value });
  return value;
}

function write(key: string, record: TourCompletions) {
  const raw = JSON.stringify(record);
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

/** The device's tour completions under `storageKey`; see {@link UseTourProgressOptions}. */
export function useTourProgress({ storageKey, migrate }: UseTourProgressOptions): TourProgress {
  const completed = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(storageKey, listener), [storageKey]),
    () => snapshot(storageKey, migrate),
    () => EMPTY,
  );

  const complete = useCallback(
    (tour: string | { id: string; updated?: TourUpdate | null }) => {
      const subject = typeof tour === "string" ? { id: tour } : tour;
      // Read now rather than from the render: two completions in one handler both count.
      const current = snapshot(storageKey, migrate);
      if (isTourDone(subject, current[subject.id])) return false;
      write(storageKey, { ...current, [subject.id]: new Date().toISOString() });
      return true;
    },
    [storageKey, migrate],
  );

  const reset = useCallback(
    (id: string) => {
      const current = snapshot(storageKey, migrate);
      if (current[id] === undefined) return;
      const next = { ...current };
      delete next[id];
      write(storageKey, next);
    },
    [storageKey, migrate],
  );

  return useMemo(() => ({ completed, complete, reset }), [completed, complete, reset]);
}
