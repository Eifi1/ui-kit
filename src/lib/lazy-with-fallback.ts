import { createContext, createElement, lazy, useCallback, useContext, useLayoutEffect, useState } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

/** What a {@link lazyWithFallback} fallback is given besides the component's own props. */
export interface LazyFallbackProps {
  /** What the import rejected with. Already on `console.error`. */
  error: unknown;
  /** Fetch the module again and draw it here if it comes (back online, the deploy's
   *  new chunk). Call it on the person's next attempt, never at once: offline, a retry
   *  on mount would fetch in a loop. */
  retry: () => void;
}

interface Attempt<P> {
  Component: LazyExoticComponent<ComponentType<P>>;
  /** Its import failed and its fallback was drawn: the next mount, or `retry`, takes a
   *  fresh attempt. Marked when the fallback COMMITS, not when the import rejects: a
   *  first mount that suspended is thrown away and rendered anew, and an attempt marked
   *  at the rejection would hand that re-render a fresh import — which fails, and so on. */
  spent: boolean;
}

const RetryContext = createContext<() => void>(() => {});

/**
 * `React.lazy` for a module the kit loads late (refactor audit 2026-10, MOD-1: the tour
 * overlay, the search palette, the feedback dialog), where an import that fails — a tab
 * left open across a deploy, a local-first app offline — draws `Fallback` instead of
 * throwing.
 *
 * `React.lazy` keeps what its import settled to, so one failed fetch threw on every render
 * for as long as the component stayed mounted, to the nearest error boundary. All three
 * sit above the routes — in the provider every app mounts, in the top bar — where that
 * boundary is the whole app's: a white page because somebody pressed ⌘K or "Take the
 * tour" (0.52 code review, tour.tsx: the tour's own fix, written by hand with a module-level
 * `let`, made shared here).
 *
 * A failure is logged and the next mount (or the fallback's `retry`) fetches again; a
 * re-render of a mounted fallback does not. `load` resolves to the component itself,
 * through a LITERAL relative dynamic import of its module (as feedback-submit's), so an
 * app's bundler can split it off. Render the result under a `Suspense`, as a lazy
 * component. (No import call is spelled out here: the build's fix-esm-extensions step
 * reads specifiers in the .d.ts comments too, and would try to resolve an example.)
 */
export function lazyWithFallback<P extends object>(
  load: () => Promise<ComponentType<P>>,
  Fallback: ComponentType<P & LazyFallbackProps>,
): ComponentType<P> {
  const attempt = (): Attempt<P> => {
    const made: Attempt<P> = {
      spent: false,
      Component: lazy<ComponentType<P>>(() =>
        load().then(
          (Loaded) => ({ default: Loaded }),
          (error: unknown) => {
            console.error(error);
            function Failed(props: P) {
              const retry = useContext(RetryContext);
              useLayoutEffect(() => {
                made.spent = true;
              }, []);
              return createElement(Fallback, { ...props, error, retry });
            }
            return { default: Failed };
          },
        ),
      ),
    };
    return made;
  };
  let latest = attempt();
  /** The attempt a new mount takes: the latest, or a fresh one once that has failed. */
  const take = () => (latest.spent ? (latest = attempt()) : latest);

  function LazyWithFallback(props: P) {
    // Fixed per mount, so a re-render of a mounted fallback fetches nothing.
    const [current, setCurrent] = useState(take);
    const retry = useCallback(() => setCurrent(take), []);
    return createElement(RetryContext.Provider, { value: retry }, createElement(current.Component, props));
  }
  return LazyWithFallback;
}
