import { createContext, useContext, useLayoutEffect, useMemo, useRef } from "react";
import type { TourStep, TourStepContext } from "./tour";

/*
 * # Value gates (docs/tours-harmonization.md §11.1)
 *
 * A form publishes whether a field holds what a tour waits for (`useTourGate`), a step
 * names the key (`TourStep.gate`). The form knows nothing about steps, the step nothing
 * about the form's state: the registry between them is a `Map` held by the provider.
 *
 * - Each key holds a STACK of publishers in mount order; the most recently mounted one
 *   is current. When it unmounts, the one below it is current again. StrictMode's
 *   double mount is push, pop, push.
 * - Writes happen in a layout effect, only when `key` or `satisfied` changes, and never
 *   re-render the provider: only the overlay subscribes (`useSyncExternalStore`), and it
 *   is mounted only while a tour runs.
 * - The same object carries the release bus of `awaitGate` steps (§11.4): `release` and
 *   `refuse` are EVENTS, not states, and are not buffered.
 */

/** One publisher of a key. */
interface GateEntry {
  satisfied: boolean;
}

/** `release(key)` / `refuse(key, reason)` from the app, as the provider hears them. */
export type GateSignal = { kind: "release"; key: string } | { kind: "refuse"; key: string; reason?: string };

export interface GateRegistry {
  /** The current publisher's value; `undefined` while nobody publishes `key`. */
  get(key: string): boolean | undefined;
  /** Is anyone publishing `key`? */
  has(key: string): boolean;
  /** For `useSyncExternalStore`: bumped on every change. */
  subscribe(listener: () => void): () => void;
  version(): number;
  push(key: string, entry: GateEntry): void;
  pop(key: string, entry: GateEntry): void;
  changed(key: string): void;
  /** Whether a tour runs (for the two-publishers warning). */
  setActive(active: boolean): void;
  /** The release bus. */
  listen(listener: (signal: GateSignal) => void): () => void;
  emit(signal: GateSignal): void;
}

/** The kit's dev switch (as number-input's): a development build, never under vitest. */
export function devWarnings(): boolean {
  return Boolean(import.meta.env?.DEV) && !import.meta.env?.VITEST;
}

export function createGateRegistry(): GateRegistry {
  let active = false;
  const stacks = new Map<string, GateEntry[]>();
  const listeners = new Set<() => void>();
  const signals = new Set<(signal: GateSignal) => void>();
  const warned = new Set<string>();
  let version = 0;
  const notify = (key: string) => {
    version++;
    const stack = stacks.get(key);
    // Two publishers of one key that disagree while a tour runs: the most recent wins,
    // which is right, but an app keying fields `amount` in two forms wants to hear it.
    if (stack && stack.length > 1 && active && devWarnings() && !warned.has(key)) {
      const values = new Set(stack.map((e) => e.satisfied));
      if (values.size > 1) {
        warned.add(key);
        console.warn(
          `[ui-kit] Two components publish the tour gate "${key}" with different values; the one mounted last ` +
            "wins. Qualify gate keys by form (`txn.amount`, `account.name`).",
        );
      }
    }
    for (const listener of listeners) listener();
  };
  return {
    get(key) {
      const stack = stacks.get(key);
      return stack && stack.length > 0 ? stack[stack.length - 1].satisfied : undefined;
    },
    has(key) {
      return (stacks.get(key)?.length ?? 0) > 0;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version: () => version,
    push(key, entry) {
      const stack = stacks.get(key) ?? [];
      stack.push(entry);
      stacks.set(key, stack);
      notify(key);
    },
    pop(key, entry) {
      const stack = stacks.get(key);
      if (!stack) return;
      const at = stack.indexOf(entry);
      if (at >= 0) stack.splice(at, 1);
      if (stack.length === 0) stacks.delete(key);
      notify(key);
    },
    changed: notify,
    setActive(value) {
      active = value;
    },
    listen(listener) {
      signals.add(listener);
      return () => {
        signals.delete(listener);
      };
    },
    emit(signal) {
      for (const listener of signals) listener(signal);
    },
  };
}

/*
 * The step context and `when` (§11.3), asked by the provider on each arrival and by the
 * overlay (a `beforeStep`, the "Back to …" link). Here rather than in tour.tsx, whose
 * names reach the barrel through `export *`, and rather than in the overlay, which loads
 * only once a tour starts (refactor audit 2026-10-30, MOD-1).
 */

export function stepContext(gates: GateRegistry, via: TourStepContext["via"]): TourStepContext {
  return { gate: (key) => gates.get(key), via };
}

/** A step's `when`, asked now; a throw is a skip, and the error goes to the console. */
export function isShown(step: TourStep, ctx: TourStepContext): boolean {
  if (!step.when) return true;
  try {
    return step.when(ctx) === true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/** What the provider shares with the gate hooks and `TourGuideButton` — internal. */
export interface TourInternals {
  gates: GateRegistry;
  /** Did the provider get a `launch`? */
  canLaunch: boolean;
}

export const TourInternalContext = createContext<TourInternals | null>(null);

/**
 * Publish whether this field holds what a tour waits for (§11.1): `useTourGate("txn.amount",
 * amount !== "")` beside the field. A step with `gate: "txn.amount"` keeps its Next locked
 * until it is `true`. A key no step names as `gate` is a FACT a step's `when` can ask
 * (`ctx.gate("txn.transfer")`).
 *
 * - `key` `null`/`undefined` publishes nothing: one field component used by a create and
 *   an edit form takes part only in create (`mode === "create" ? "txn.memo" : null`).
 * - Publish the value's state. Do not invent a "touched" gate: a field already filled
 *   when the step arrives (a date prefilled with today) shows Next open at once, which is
 *   intended.
 * - Qualify keys by form (`txn.amount`, not `amount`). Two publishers of one key: the one
 *   mounted last wins.
 * - A no-op without a `TourProvider`, so a form's tests need none. It keeps publishing
 *   while no tour runs, because "Guide me" can start inside a form already filled.
 */
export function useTourGate(key: string | null | undefined, satisfied: boolean): void {
  const gates = useContext(TourInternalContext)?.gates ?? null;
  const entryRef = useRef<GateEntry | null>(null);
  const satisfiedRef = useRef(satisfied);
  useLayoutEffect(() => {
    satisfiedRef.current = satisfied;
    const entry = entryRef.current;
    if (!gates || key == null || !entry || entry.satisfied === satisfied) return;
    entry.satisfied = satisfied;
    gates.changed(key);
  }, [gates, key, satisfied]);
  useLayoutEffect(() => {
    if (!gates || key == null) return;
    const entry: GateEntry = { satisfied: satisfiedRef.current };
    entryRef.current = entry;
    gates.push(key, entry);
    return () => {
      entryRef.current = null;
      gates.pop(key, entry);
    };
  }, [gates, key]);
}

/** What {@link useTourGateRelease} hands back. */
export interface TourGateRelease {
  /** The awaited thing happened (a save succeeded): the tour moves past the step that awaits `key`. */
  release(key: string): void;
  /** It was refused (a save failed): the step awaiting `key` stays and shows `reason`. */
  refuse(key: string, reason?: string): void;
}

const NO_RELEASE: TourGateRelease = { release: () => {}, refuse: () => {} };

/**
 * The signals of `awaitGate` steps (§11.4), usually from a mutation's `onSuccess` /
 * `onError`. Stable identities. No-ops without a provider, and while no tour runs or no
 * step of the run awaits the key: a release is an event and is never buffered.
 */
export function useTourGateRelease(): TourGateRelease {
  const gates = useContext(TourInternalContext)?.gates ?? null;
  return useMemo(
    () =>
      gates
        ? {
            release: (key: string) => gates.emit({ kind: "release", key }),
            refuse: (key: string, reason?: string) => gates.emit({ kind: "refuse", key, reason }),
          }
        : NO_RELEASE,
    [gates],
  );
}
