// A series chart with its legend under it, as one part (0.55). Lifted out of keksdose's
// reports, where `LegendedSeriesChart` (features/reports/charts/legended-series-chart.tsx)
// wired six report charts — net worth, investments, income and expense, the grouped and
// stacked payees, budget performance, the price history — and out of kastlan's reporting
// and dashboard charts and keksdose's metrics panel, which wrote the same pairing by hand:
// a hidden set, `visibleSeries` for the chart, the FULL list for the legend through
// `seriesLegendEntries`, and a `ToggleLegend` centred under the plot. The kit exported the
// parts and left the pairing to every app; this is the pairing.
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  SeriesChart,
  seriesLegendEntries,
  visibleSeries,
  type SeriesChartAxis,
  type SeriesChartProps,
  type SeriesChartSeries,
} from "./series-chart";
import { StaticLegend, ToggleLegend, toggleHidden, type LegendEntry } from "./toggle-legend";
import { cn } from "../lib/cn";

/**
 * What the legend is, and who keeps the series it has switched off.
 *
 * - `legend: "toggle"` (the default): every entry a switch that takes its series off the
 *   chart and brings it back (`ToggleLegend`). The chart keeps what is off — or the caller
 *   does, with `hidden` and `onToggle` together: for a choice that has to outlive the chart
 *   (a tab that shows its skeleton while the next month loads), or one kept by something
 *   steadier than the series key (keksdose's shop names, whose keys re-slot when the markets
 *   narrow).
 * - `legend: "key"`: a key, not a control (`StaticLegend`) — a list to a screen reader, no
 *   tab stops, every series drawn. For a legend that says what a mark means without
 *   letting it be switched: keksdose's cash buffer, whose dashed projection and amber
 *   marker are named, not toggled.
 */
export type LegendedSeriesChartLegend =
  | {
      legend?: "toggle";
      hidden?: undefined;
      onToggle?: undefined;
    }
  | {
      legend?: "toggle";
      /** The keys switched off, kept by the caller. */
      hidden: ReadonlySet<string>;
      /** An entry was switched: its series' key. */
      onToggle: (key: string) => void;
    }
  | { legend: "key"; hidden?: undefined; onToggle?: undefined };

/**
 * The props of {@link LegendedSeriesChart}: a {@link SeriesChartProps} for rows of type
 * `TRow`, whose `series` is the FULL list and whose `axes` may follow what is switched off.
 */
export type LegendedSeriesChartProps<TRow extends object = object> = Omit<SeriesChartProps<TRow>, "series" | "axes"> &
  LegendedSeriesChartLegend & {
    /** EVERY series, the switched-off ones included: the legend lists them all, and the
     *  chart draws the rest through `visibleSeries`, which settles each colour on this full
     *  list first, so a switch never repaints a neighbour. */
    series: readonly SeriesChartSeries<TRow>[];
    /** The axes, or a function of the switched-off keys, for an axis drawn only while its
     *  series is: keksdose's running sum, whose axis hands the bars its room back when the
     *  line is switched off. */
    axes?: readonly SeriesChartAxis[] | ((hidden: ReadonlySet<string>) => readonly SeriesChartAxis[]);
    /**
     * The legend's entries, when not the kit's own for `series` (`seriesLegendEntries`,
     * handed the axes drawn and those the axis budget hid, so a series on an undrawn axis
     * says its unit): a stroke for every line, or a key's marks that are not series (a
     * marker, a reference line). A switch reports its entry's `key`.
     */
    legendEntries?: readonly LegendEntry[];
    /** Onto the legend: its row is centred under the chart, wrapping. */
    legendClassName?: string;
    /** Wraps the chart and the chart alone — a horizontal scroller the legend has to stay
     *  out of, so it is in view however far the chart is scrolled (keksdose's budget
     *  performance, with `tooltip.boundary` on the scroller). */
    frame?: (chart: ReactNode) => ReactNode;
  };

/** Nothing switched off, one set for every chart that keeps its own. */
const NONE: ReadonlySet<string> = new Set();

/**
 * A {@link SeriesChart} and its legend, the legend centred under it: the kit's layout of the
 * two, which keksdose, kastlan and the kit's own showcase each assembled from the parts.
 *
 * With the default `legend: "toggle"` each entry is a switch: the chart is drawn with
 * `visibleSeries(series, hidden)`, the legend lists every series (`seriesLegendEntries`),
 * and a series that is off keeps its place and its colour in the legend. A legend of one
 * series is drawn only while that series is off — the one way to bring it back. With
 * `legend: "key"` it is a {@link StaticLegend} of the same entries, and every series is
 * drawn.
 *
 * Everything else is the chart's: rows, axes, zoom, tooltip, `onPointClick`, `aria-label`,
 * all as {@link SeriesChartProps} take them. Generic in its rows as SeriesChart is (0.53):
 * `hit.row` and a `dot`'s `point.row` are typed as `rows` is. A plain function, so the
 * generic survives.
 *
 * The chart is handed the same `series` and `axes` objects while neither the caller's nor
 * the hidden set changes, so a render of the page costs it nothing (see SeriesChart's
 * memoised plot) — as long as the caller keeps its own the same.
 */
export function LegendedSeriesChart<TRow extends object = object>({
  series,
  axes,
  legend = "toggle",
  legendEntries,
  legendClassName,
  frame,
  hidden: hiddenProp,
  onToggle,
  onAxisBudget,
  ...chartProps
}: LegendedSeriesChartProps<TRow>) {
  const [ownHidden, setOwnHidden] = useState<ReadonlySet<string>>(NONE);
  // A key switches nothing: every series is drawn.
  const hidden = legend === "key" ? NONE : (hiddenProp ?? ownHidden);
  const toggle = useCallback(
    (key: string) => (onToggle ? onToggle(key) : setOwnHidden((was) => toggleHidden(was, key))),
    [onToggle],
  );
  // What the axis budget hid, for the legend to say those axes' units (SeriesChart's
  // `onAxisBudget`); the caller's own callback is still told.
  const [budgeted, setBudgeted] = useState<readonly string[]>([]);
  const reportBudget = useCallback(
    (ids: readonly string[]) => {
      setBudgeted(ids);
      onAxisBudget?.(ids);
    },
    [onAxisBudget],
  );
  const drawn = useMemo(() => visibleSeries(series, hidden), [series, hidden]);
  const drawnAxes = useMemo(() => (typeof axes === "function" ? axes(hidden) : axes), [axes, hidden]);
  const entries = useMemo(
    () => legendEntries ?? seriesLegendEntries(series, { axes: drawnAxes, budgeted }),
    [legendEntries, series, drawnAxes, budgeted],
  );
  // SeriesChart's own props, with `TRow` as the caller's: the rest is passed through as is.
  const chart = (
    <SeriesChart<TRow>
      {...(chartProps as Omit<SeriesChartProps<TRow>, "series" | "axes" | "onAxisBudget">)}
      series={drawn}
      axes={drawnAxes}
      onAxisBudget={reportBudget}
    />
  );
  return (
    <div>
      {frame ? frame(chart) : chart}
      {legend === "key" ? (
        <StaticLegend entries={entries} className={cn("justify-center", legendClassName)} />
      ) : (
        <ToggleLegend
          entries={entries}
          hidden={hidden}
          onToggle={toggle}
          // One series' legend is noise — until that series is off, and its entry is the
          // only way back.
          showSingle={entries.some((entry) => hidden.has(entry.key))}
          className={cn("justify-center", legendClassName)}
        />
      )}
    </div>
  );
}
