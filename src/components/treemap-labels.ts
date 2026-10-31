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
  /**
   * A group's accessible name (0.52, `TreemapNode.children`): its frame is a stop of the
   * map's keyboard before its tiles, so a reader hears the group and its total once, on the
   * way in. `value` and `share` as for {@link TreemapLabels.tile}, of the group's tiles
   * together; the word "group" tells it from a tile of the same shape.
   */
  group: (name: string, value: string, share: string) => string;
  /**
   * A name inside a group: `name` is the tile's (or a nested group's) own, from
   * {@link TreemapLabels.tile} or {@link TreemapLabels.group}, and `group` the name of the
   * group round it — applied once per group, the innermost first, so a tile two levels deep
   * reads "Rent: 1,050 (40%), in Housing, in Fixed costs". In the name rather than said once
   * by the frame, because Home, End and a click land on a tile without passing its frame.
   */
  inGroup: (name: string, group: string) => string;
}

export const DEFAULT_TREEMAP_LABELS: TreemapLabels = {
  tile: (name, value, share) => `${name}: ${value} (${share})`,
  group: (name, value, share) => `${name}, group: ${value} (${share})`,
  inGroup: (name, group) => `${name}, in ${group}`,
};
