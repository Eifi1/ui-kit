import { useEffect, useState } from "react";

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
  const [matches, setMatches] = useState<boolean>(get);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}
