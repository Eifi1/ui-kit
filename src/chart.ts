// `@eifi1/ui-kit/chart` — the chart shell and its colour system.
//
// A re-slicing of what the main barrel already exports, not a new API. It exists so a
// consumer can reach the chart kit WITHOUT the barrel: `import("@eifi1/ui-kit/chart")`
// is a 31KB chunk, where the same lazy import through the barrel pulls 221KB, because
// a dynamic import of the barrel cannot be tree-shaken down to one of its members.
//
// This is also the only entry point in the package that requires `recharts`.
export * from "./components/chart";
export * from "./theme/chart-palette";

// The tile chart (treemap) the apps share — moved here from keksdose so every consumer
// derives it from the package rather than from a copy.
export * from "./components/treemap";

// lenkbank's zoomable series chart, its synced x-zoom, the toggle legend and the
// mirrored-pair axis geometry — moved here so the apps derive them from the package.
export * from "./components/series-chart";
export * from "./components/chart-zoom";
export * from "./components/toggle-legend";
export * from "./components/facing-pair";
export * from "./components/series-chart-labels";
