// `@eifi1/ui-kit/chart` — the chart shell and its colour system.
//
// A re-slicing of what the main barrel already exports, not a new API. It exists so a
// consumer can reach the chart kit WITHOUT the barrel: `import("@eifi1/ui-kit/chart")`
// is a chunk of its own (50.4 KB min, 19.9 KB gzip at 0.51.6, refactor audit 2026-10-30
// MOD-7; it was 31KB when this was written), where the same lazy import through the barrel
// pulls the barrel, because a dynamic import of it cannot be tree-shaken down to one member.
//
// It is about chunk size, not about the peer: `recharts` is a REQUIRED peer (since 0.5.0),
// because the main barrel re-exports everything here too, so `import { Button } from
// "@eifi1/ui-kit"` reaches recharts as well (packaging-contract.test.ts asserts it).
export * from "./components/chart";
export * from "./theme/chart-palette";
// 0.52: the slice's share of the 55 names no app reads (refactor audit 2026-10-30, API-4,
// decision 4), tagged on their specifiers as the barrel's are — the modules keep them.
export {
  /** @deprecated 0.52 — `chartEdge`, which measures a fill against it (API-4); removed in 0.53 */
  EDGE_MIN_CONTRAST,
  /** @deprecated 0.52 — `--chart-ink` (`CHART_ROLES.outline`), the same ink as a token (API-4); removed in 0.53 */
  CHART_INK_HEX,
} from "./theme/chart-palette";

// The tile chart (treemap) the apps share — moved here from keksdose so every consumer
// derives it from the package rather than from a copy. 0.52: its `treemap` label namespace.
export * from "./components/treemap";
export * from "./components/treemap-labels";

// lenkbank's zoomable series chart, its synced x-zoom, the toggle legend and the
// mirrored-pair axis geometry — moved here so the apps derive them from the package.
export * from "./components/series-chart";
export {
  /** @deprecated 0.52 — `SeriesChart`, which places its tooltip with it (API-4); removed in 0.53 */
  resolveTooltipPlacement,
} from "./components/series-chart";
// 0.32.1 (keksdose's 0.32 report): the height every chart takes, for an app's wrappers.
export type { ChartHeight } from "./components/chart-height";
// SharedXZoom and the zoom's types: the public face of ./chart-zoom-core, whose arithmetic
// stays the kit's (refactor audit 2026-10, API-6b; off the surface in 0.35).
export * from "./components/chart-zoom";
// The same binding, named from the module that holds it and the drag layer (recharts): the
// packaging contract reads this entry's own imports to know which modules may import
// recharts, so chart-zoom-core has to be one of them (MOD-6).
export { SharedXZoom } from "./components/chart-zoom-core";
export * from "./components/toggle-legend";
export {
  /** @deprecated 0.52 — `strokeDash`, which picks a series' pattern from it (API-4); removed in 0.53 */
  STROKE_PATTERNS,
} from "./components/toggle-legend";
export * from "./components/facing-pair";
export * from "./components/series-chart-labels";

// The part-to-whole chart (donut / pie) — moved here from kastlan's dashboard and reports.
export * from "./components/pie-chart";
export * from "./components/pie-chart-labels";
