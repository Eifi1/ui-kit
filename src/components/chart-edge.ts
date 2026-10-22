// The live side of `chartEdge` (theme/chart-palette.ts): which colours a FILLED mark is
// painted with and which grounds it sits on, read off <html> as the page resolves them —
// so the 1px ink edge follows a theme toggle and a palette switch without the chart
// knowing either store. Shared by SeriesChart (bars, areas) and Treemap (tiles).
import { useCallback, useSyncExternalStore } from "react";
import { chartEdge } from "../theme/chart-palette";
import { parseHex } from "../theme/color";

/** The tokens a theme or palette change can move, read as ONE string so
 *  `useSyncExternalStore` compares a primitive (a fresh array would never be equal). */
const WATCHED = [
  "--bg-surface",
  "--bg-page",
  ...Array.from({ length: 9 }, (_, i) => `--chart-${i + 1}`),
  "--chart-ink",
  "--chart-muted",
  "--money-income",
  "--money-expense",
  "--money-net",
  "--money-neutral",
  "--brand",
];

function readWatched(): string {
  const style = getComputedStyle(document.documentElement);
  return WATCHED.map((name) => style.getPropertyValue(name).trim()).join(",");
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme", "data-contrast"],
  });
  return () => observer.disconnect();
}

/** Server render: nothing measured, so no edge — the client adds it on hydration. */
const SERVER = "";

const BARE_VAR = /^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/;

/** A colour as the page resolves it: a hex as it is, a bare `var(--token)` read off
 *  <html>, anything else (a `color-mix()`, a var with a fallback) null. */
export function resolveChartColor(color: string, style: Pick<CSSStyleDeclaration, "getPropertyValue">): string | null {
  const trimmed = color.trim();
  if (parseHex(trimmed)) return trimmed;
  const m = BARE_VAR.exec(trimmed);
  if (!m) return null;
  const value = style.getPropertyValue(m[1]).trim();
  return parseHex(value) ? value : null;
}

/**
 * `(fill) => edge`: the ink stroke a filled mark in `fill` needs on this page, or
 * `undefined` — only for a colour under 3:1 against the card or the page (WCAG 1.4.11).
 * `fill` may be a hex or a bare `var(--chart-N)` / `var(--money-…)`; anything it cannot
 * measure gets no edge.
 */
export function useChartEdge(): (fill: string | undefined) => string | undefined {
  const snapshot = useSyncExternalStore(subscribe, readWatched, () => SERVER);
  return useCallback(
    (fill: string | undefined) => {
      if (!fill || snapshot === SERVER || typeof document === "undefined") return undefined;
      const style = getComputedStyle(document.documentElement);
      const hex = resolveChartColor(fill, style);
      if (!hex) return undefined;
      const surfaces = ["--bg-surface", "--bg-page"].map((n) => style.getPropertyValue(n).trim());
      return chartEdge(hex, surfaces);
    },
    [snapshot],
  );
}
