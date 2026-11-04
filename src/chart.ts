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
// Named, not `*`, for chart-palette, series-chart and toggle-legend: 0.53 took the slice's
// share of the 55 names no app reads off the surface (deprecated in 0.52, refactor audit
// 2026-10-30, API-4) — `EDGE_MIN_CONTRAST`, `resolveTooltipPlacement`, `STROKE_PATTERNS`,
// which their modules keep for the kit's own use.
export {
  PALETTE_SIZE,
  CVD_ORDER,
  paletteFor,
  CHART_COLORS,
  CHART_ROLES,
  CHART_MUTED_HEX,
  chartEdge,
  PALETTE_HEX,
  HEATMAP_HEX,
  lerpHex,
  textOn,
  type PaletteForOptions,
  type HeatStops,
} from "./theme/chart-palette";

// The tile chart (treemap) the apps share — moved here from keksdose so every consumer
// derives it from the package rather than from a copy. 0.52: its `treemap` label namespace.
export * from "./components/treemap";
export * from "./components/treemap-labels";

// lenkbank's zoomable series chart, its synced x-zoom, the toggle legend and the
// mirrored-pair axis geometry — moved here so the apps derive them from the package.
export {
  AXIS_TICK_WIDTH,
  AXIS_TITLE_STRIP,
  anchoredBand,
  axisBandWidth,
  mergeSeries,
  oneAxis,
  padBand,
  paddedDomain,
  seriesKey,
  soleSeriesColor,
  visibleSeries,
  seriesLegendEntries,
  StaticSeriesChart,
  SeriesChart,
  type TimeTickUnit,
  type SeriesChartAxisBudget,
  type SeriesSource,
  type SeriesChartSeries,
  type SeriesChartType,
  type SeriesChartPoint,
  type SeriesChartRow,
  type SeriesChartXValue,
  type SeriesChartTickValues,
  type SeriesChartAxis,
  type SeriesChartXTick,
  type SeriesChartX,
  type SeriesChartTooltipPlacement,
  type SeriesChartTooltip,
  type SeriesChartSpan,
  type SeriesChartTone,
  type SeriesChartReference,
  type SeriesChartMarker,
  type SeriesChartHit,
  type SeriesChartProps,
  type SeriesLegendAxes,
} from "./components/series-chart";
// 0.55: the chart with its legend under it, keksdose's report wrapper as the kit's layout.
export {
  LegendedSeriesChart,
  type LegendedSeriesChartLegend,
  type LegendedSeriesChartProps,
} from "./components/legended-series-chart";
// 0.32.1 (keksdose's 0.32 report): the height every chart takes, for an app's wrappers.
export type { ChartHeight } from "./components/chart-height";
// SharedXZoom and the zoom's types: the public face of ./chart-zoom-core, whose arithmetic
// stays the kit's (refactor audit 2026-10, API-6b; off the surface in 0.35).
export * from "./components/chart-zoom";
// The same binding, named from the module that holds it and the drag layer (recharts): the
// packaging contract reads this entry's own imports to know which modules may import
// recharts, so chart-zoom-core has to be one of them (MOD-6).
export { SharedXZoom } from "./components/chart-zoom-core";
export {
  strokeDash,
  STEP_DASH,
  toggleHidden,
  ToggleLegend,
  StaticLegend,
  LegendColumn,
  LegendGroup,
  type LegendEntry,
  type ToggleLegendProps,
  type StaticLegendProps,
} from "./components/toggle-legend";
export * from "./components/facing-pair";
export * from "./components/series-chart-labels";

// The part-to-whole chart (donut / pie) — moved here from kastlan's dashboard and reports.
export * from "./components/pie-chart";
export * from "./components/pie-chart-labels";
