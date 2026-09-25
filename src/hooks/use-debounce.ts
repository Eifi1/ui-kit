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
 */
export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
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
