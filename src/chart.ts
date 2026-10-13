// `@eifi1/ui-kit/chart` — the chart shell and its colour system.
//
// A re-slicing of what the main barrel already exports, not a new API. It exists so a
// consumer can reach the chart kit WITHOUT the barrel: `import("@eifi1/ui-kit/chart")`
// is a 31KB chunk, where the same lazy import through the barrel pulls 221KB, because
// a dynamic import of the barrel cannot be tree-shaken down to one of its members.
//
// It is about chunk size, not about the peer: `recharts` is a REQUIRED peer (since 0.5.0),
// because the main barrel re-exports everything here too, so `import { Button } from
// "@eifi1/ui-kit"` reaches recharts as well (packaging-contract.test.ts asserts it).
export * from "./components/chart";
export * from "./theme/chart-palette";

// The tile chart (treemap) the apps share — moved here from keksdose so every consumer
// derives it from the package rather than from a copy.
export * from "./components/treemap";

// lenkbank's zoomable series chart, its synced x-zoom, the toggle legend and the
// mirrored-pair axis geometry — moved here so the apps derive them from the package.
export * from "./components/series-chart";
// 0.32.1 (keksdose's 0.32 report): the height every chart takes, for an app's wrappers.
export type { ChartHeight } from "./components/chart-height";
export * from "./components/chart-zoom";
// The zoom's own module since 0.34: SharedXZoom and the drag layer (recharts) live here,
// ./chart-zoom is their public face. Named, so the arithmetic it also holds stays the
// kit's (refactor audit 2026-10, API-6b) — the same binding the line above re-exports.
export { SharedXZoom } from "./components/chart-zoom-core";
export * from "./components/toggle-legend";
export * from "./components/facing-pair";
export * from "./components/series-chart-labels";

// The part-to-whole chart (donut / pie) — moved here from kastlan's dashboard and reports.
export * from "./components/pie-chart";
export * from "./components/pie-chart-labels";
