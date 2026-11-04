import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * A value that follows `value`, but only once it has stopped changing for `ms`.
 *
 * kastlan asked for the pair in this module because each of its search boxes carried
 * its own copy of the same six lines — a `useEffect` with a `setTimeout` — and two of
 * them forgot the cleanup, so a stale query landed AFTER the fresh one and replaced
 * its results. The cleanup is the whole point of having one implementation.
 *
 * The first render returns `value` itself, not `undefined`: a list filtered by the
 * debounced query must render its initial state immediately, not after `ms`.
 *
 * **By default it re-arms when `value`'s IDENTITY changes** (an effect on `[value, ms]`),
 * not its content. Pass a primitive — the typed query, a JSON string — or a value whose
 * identity is stable (state, a `useMemo`). An object or array built in render is a new
 * one every render, so the timer is re-armed on every render and the value never
 * settles — or, when the debounced value feeds the render that built it, settles,
 * renders, builds another and fires again, every `ms`, with nobody typing
 * (Kurvenschmiede's control page, KS U9).
 *
 * **For such a value, name its content: `{ key }`** (0.55, KS U9). The timer then re-arms
 * when the key changes and only then, and a new object under the same key is the value
 * already on its way, not news. What comes back is the object that arrived with the key,
 * and it keeps that identity until the key changes and settles — so it can go straight
 * into a query key or a request without a `useMemo` round it. A key that comes back
 * before the wait is over (A → B → A) settles on nothing new: the caller keeps the object
 * it already had. Kurvenschmiede's own `useDebounced` (shared/lib/use-debounced.ts)
 * settles the same way, and its four callers key one of two ways, both of which this
 * takes:
 *
 * ```ts
 * // A body that is small: its JSON is its content.
 * const settled = useDebounce(geometry, 400, { key: JSON.stringify(geometry) });
 * // A body too large to stringify on every render (twenty thousand samples twice
 * // over): the few fields that say what the signal IS.
 * const settled = useDebounce(request, settleMs, { key: JSON.stringify(request?.key ?? null) });
 * ```
 */
export function useDebounce<T>(value: T, ms: number, { key }: DebounceOptions = {}): T {
  // What arms the timer: the value itself, as it always has, or the caller's name for it.
  const id: unknown = key === undefined ? value : key;
  // Held WITH the id it settled under, so a later render under the same id can be told
  // from news. Without a key the id is the value, and this is the value as it was.
  const [settled, setSettled] = useState(() => ({ id, value }));
  useEffect(() => {
    const timer = setTimeout(() => setSettled((prev) => (Object.is(prev.id, id) ? prev : { id, value })), ms);
    return () => clearTimeout(timer);
    // `value` is read as it was in the render that brought `id`: under a key, a later
    // object with the same key is the same value, and re-arming on it is KS U9's
    // metronome. Without a key `id` IS `value`, so these are today's `[value, ms]`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ms]);
  return settled.value;
}

export interface DebounceOptions {
  /**
   * What the value IS, for a value whose identity changes on every render — a request
   * body or a filter built in render: a string or number that changes exactly when the
   * content does (`JSON.stringify(body)`, or the few fields that decide it). The wait
   * restarts when the key changes, never on a new object under the same key. Without it,
   * the value's identity is its key.
   */
  key?: string | number;
}

export interface DebouncedCallbackOptions {
  /**
   * The longest a call may be held back, however often it is re-triggered. Without
   * it a user who never stops typing never saves; with it, a draft autosave still
   * lands every `maxWait` ms while the typing goes on.
   */
  maxWait?: number;
}

/** The debounced function, plus the two escapes a caller needs around it. */
export type DebouncedFunction<A extends unknown[]> = ((...args: A) => void) & {
  /** Drop the pending call, if there is one. */
  cancel: () => void;
  /** Run the pending call now, if there is one — e.g. on blur or before navigating
   *  away, so the last keystrokes of a form are not lost. */
  flush: () => void;
  /** Whether a call is waiting. */
  pending: () => boolean;
};

/**
 * `fn`, called only once calls have stopped arriving for `ms` — with the arguments
 * of the LAST call.
 *
 * The returned function keeps its identity across renders (so it can sit in an
 * effect's dependency list or be handed to a memoised child) and always calls the
 * LATEST `fn`, so a handler that closes over current state never runs a stale copy.
 * A pending call is cancelled on unmount: a debounced save firing into an unmounted
 * form is the bug kastlan reported, not a feature.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
  { maxWait }: DebouncedCallbackOptions = {},
): DebouncedFunction<A> {
  const fnRef = useRef(fn);
  // Layout effect, not render-time assignment: a ref written during render is a
  // side effect React may replay or discard. Nothing can call the debounced function
  // between this commit and the layout effect, so it is never one render behind.
  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgs = useRef<A | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    timer.current = null;
    maxTimer.current = null;
  }, []);

  const invoke = useCallback(() => {
    const args = lastArgs.current;
    clear();
    lastArgs.current = null;
    if (args) fnRef.current(...args);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return useMemo(() => {
    const debounced = ((...args: A) => {
      lastArgs.current = args;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(invoke, ms);
      if (maxWait !== undefined && !maxTimer.current) {
        maxTimer.current = setTimeout(invoke, maxWait);
      }
    }) as DebouncedFunction<A>;
    debounced.cancel = () => {
      clear();
      lastArgs.current = null;
    };
    debounced.flush = () => {
      if (lastArgs.current) invoke();
    };
    debounced.pending = () => lastArgs.current !== null;
    return debounced;
  }, [ms, maxWait, invoke, clear]);
}
