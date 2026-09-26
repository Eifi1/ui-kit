// All user-facing strings for the series chart family — `SeriesChart`, its drag-to-zoom
// layer and `ToggleLegend` — as the `seriesChart` namespace of `<UiKitProvider labels>`,
// and per chart the `labels` prop over that.
//
// A module of its own, with no recharts in it, so the label registry (src/i18n) can
// import the defaults without pulling the chart library in behind them.

export interface SeriesChartLabels {
  /** The button that puts a zoomed chart back to its full extent. Visible text. */
  resetZoom: string;
  /** Accessible name of the drag surface laid over the plot. It is the only place the
   *  gesture is explained, so it says how the drag is read and how to undo it. */
  zoomHint: string;
  /** What a chart with nothing to draw says, when the caller passes no `empty`. */
  empty: string;
  /** Accessible name of a `ToggleLegend` — a group of switches, one per series. */
  legend: string;
  /** Accessible name of the group of keyboard stops a clickable chart (`onPointClick`)
   *  lays over its bars or periods — one tab stop, arrow keys between them. */
  points: string;
}

export const DEFAULT_SERIES_CHART_LABELS: SeriesChartLabels = {
  resetZoom: "Reset zoom",
  zoomHint:
    "Drag to zoom: a roughly square selection zooms both axes, a long thin one only its own. Double-click to reset.",
  empty: "No data",
  legend: "Series",
  points: "Chart values",
};
