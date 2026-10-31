import { useEffect, useEffectEvent, useState } from "react";

/**
 * Subscribe to a CSS media query, returning whether it currently matches and
 * re-rendering when it changes. `fallback` is the value used during SSR / when
 * `window.matchMedia` is unavailable.
 */
export function useMediaQuery(query: string, fallback: boolean): boolean {
  const get = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : fallback;
  // The answer is kept with the query it answers, and a new query is asked during the
  // render that brings it. Read at mount only, the first commit after a new query still
  // answered the OLD one, until the effect corrected it: `useBreakpoint` asks a new query
  // when the text size changes, and at Large in a 700 px window the tour card was drawn
  // un-docked for a frame before it docked (0.52 code review, use-breakpoint.ts).
  const [state, setState] = useState(() => ({ query, matches: get() }));
  let matches = state.matches;
  if (state.query !== query) {
    matches = get();
    setState({ query, matches });
  }
  const answered = useEffectEvent(() => matches);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const update = () =>
      setState((prev) =>
        prev.query === query && prev.matches === mql.matches ? prev : { query, matches: mql.matches },
      );
    // A change between the render and this subscription. Only then: an update that
    // changes nothing still costs a render (and a commit) right after a new query.
    if (mql.matches !== answered()) update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}
