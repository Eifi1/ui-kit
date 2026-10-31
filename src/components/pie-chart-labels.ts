// All user-facing strings for `PieChart`, as the `pieChart` namespace of
// `<UiKitProvider labels>`, and per chart the `labels` prop over that.
//
// A module of its own, with no recharts in it, for the reason `series-chart-labels`
// is one: the label registry (src/i18n) imports the defaults, and must not pull the
// chart library in behind them.

export interface PieChartLabels {
  /** Accessible name of the group of keyboard stops laid over the slices — one tab
   *  stop, arrow keys between them. */
  slices: string;
  /**
   * One slice's accessible name. `value` arrives through `formatValue`, `percent` as
   * the slice's share of what is drawn, already formatted in the locale ("42 %" in
   * German, "42%" in English) — the function only arranges them.
   */
  slice: (label: string, value: string, percent: string) => string;
  /**
   * One slice's accessible name under `redact` (0.52): the label and the share, with no
   * amount. `redact` blurs every figure on screen but not the ring, and the ring's names
   * are attributes on untagged elements, which a session replay or a redaction keyed on
   * `[data-private]` reads as they are. `percent` as for {@link PieChartLabels.slice}.
   */
  sliceShare: (label: string, percent: string) => string;
  /** The caption over the donut's centre figure. */
  total: string;
  /** What a chart with nothing to draw says, when the caller passes no `empty`. */
  empty: string;
  /** Accessible name of the chart's legend (a group of switches, one per slice). */
  legend: string;
}

export const DEFAULT_PIE_CHART_LABELS: PieChartLabels = {
  slices: "Chart slices",
  slice: (label, value, percent) => `${label}: ${value} (${percent})`,
  sliceShare: (label, percent) => `${label}: ${percent}`,
  total: "Total",
  empty: "No data",
  legend: "Categories",
};
