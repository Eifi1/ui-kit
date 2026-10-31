// All user-facing strings for `Treemap`, as the `treemap` namespace of
// `<UiKitProvider labels>`, and per map the `labels` prop over that (0.52, refactor audit
// 2026-10-30, DSP-5).
//
// A module of its own, with no recharts in it, for the reason `pie-chart-labels` is one:
// the label registry (src/i18n) imports the defaults, and must not pull the chart
// library in behind them.

export interface TreemapLabels {
  /**
   * One tile's accessible name — what a screen reader says for a tile, clickable or
   * not, since its area is nothing it can say. `value` arrives through the map's
   * `valueFormatter` when that returns text, else as the number in the provider's
   * locale; `share` is the tile's share of what is drawn, already a formatted percent
   * ("60 %" in German, "60%" in English) — the function only arranges them.
   */
  tile: (name: string, value: string, share: string) => string;
}

export const DEFAULT_TREEMAP_LABELS: TreemapLabels = {
  tile: (name, value, share) => `${name}: ${value} (${share})`,
};
