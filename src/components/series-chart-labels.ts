// All user-facing strings for the series chart family — `SeriesChart`, its drag-to-zoom
// layer and `ToggleLegend` — as the `seriesChart` namespace of `<UiKitProvider labels>`,
// and per chart the `labels` prop over that.
//
// A module of its own, with no recharts in it, so the label registry (src/i18n) can
// import the defaults without pulling the chart library in behind them.

export interface SeriesChartLabels {
  /** The button that puts a zoomed chart back to its full extent. Visible text. */
  resetZoom: string;
  /** The drag-to-zoom gesture, said at the end of a zoomable chart's description (the
   *  figure's `aria-describedby`; until 0.52 the name of the drag surface, an
   *  `application` nothing could focus). It is the only place the gesture is explained,
   *  so it says how the drag is read and how to undo it. */
  zoomHint: string;
  /** What a chart with nothing to draw says, when the caller passes no `empty`. */
  empty: string;
  /** Accessible name of a `ToggleLegend` — a group of switches, one per series. */
  legend: string;
  /** Accessible name of the group of keyboard stops a chart lays over its bars or
   *  periods — one tab stop, arrow keys between them; buttons with `onPointClick`, and
   *  since 0.52 images to read without. */
  points: string;
  /**
   * The chart's name when the caller passes no `aria-label` and a y axis is titled (0.55,
   * Kurvenschmiede 0.52 adoption): "Rack force (N) over Travel (mm)". `ordinates` is the
   * titles of the drawn y axes, already joined as a list in the chart's locale
   * (`Intl.ListFormat`: "Force (N) and Speed (mm/s)"); `abscissa` the x axis' title, absent
   * on a chart that leaves it to another — an upper chart of a stack sharing one x window,
   * named by its ordinates alone.
   */
  nameFromAxes: (ordinates: string, abscissa?: string) => string;
}

export const DEFAULT_SERIES_CHART_LABELS: SeriesChartLabels = {
  resetZoom: "Reset zoom",
  zoomHint:
    "Drag to zoom: a roughly square selection zooms both axes, a long thin one only its own. Double-click to reset.",
  empty: "No data",
  legend: "Series",
  points: "Chart values",
  // Kurvenschmiede's `common.chart_name`, "{{y}} over {{x}}", as the catalogues take theirs.
  nameFromAxes: (ordinates, abscissa) => (abscissa ? `${ordinates} over ${abscissa}` : ordinates),
};
