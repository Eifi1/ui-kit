// The measurement plot: series against a swept numeric abscissa, any number of y axes,
// dash patterns, vertical spans, and drag-to-zoom. Lifted out of lenkbank, where every
// chart on every screen is this one arrangement of the kit's shell — so the arrangement
// lives here once instead of as thirteen hand-assembled copies drifting apart.
//
// Built on `ChartContainer` + `ChartTooltipContent`, so it themes with the rest of the
// chart kit: series default to the `--chart-N` ramp, axis text and grid take the
// shell's tokens. It stays domain-free — every unit, title and number format is the
// caller's, and the few words it can say itself are the `seriesChart` label namespace.
//
// **Every series may keep its own scale.** Position runs in millimetres and jerk in
// hundreds of thousands of them per second cubed; on one axis the position line is
// flat against the bottom. Normalising each series to its peak makes the y axis mean
// nothing, so a caller declares an axis per incomparable channel instead, and may hide
// all but the ones worth a column of numbers.
//
// Charts are drawn left-to-right in every writing direction — an abscissa is a number
// line, not text — so `orientation` below is physical, and only the HTML chrome (the
// reset button) is placed by logical side.
import { useMemo } from "react";
import type { ReactNode } from "react";
import { CartesianGrid, Label, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart";
import { DEFAULT_Y_AXIS, withChartZoom, type ZoomBinding } from "./chart-zoom";
import { STEP_DASH, strokeDash } from "./toggle-legend";
import { DEFAULT_SERIES_CHART_LABELS, type SeriesChartLabels } from "./series-chart-labels";
import { paletteFor } from "../theme/chart-palette";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { cn } from "../lib/cn";

export interface SeriesChartSeries {
  /** The row key this line reads — and the `--color-<key>` it is painted with, so it
   *  must be a CSS identifier. Build keys out of data with {@link seriesKey}. */
  key: string;
  label: ReactNode;
  /** Any CSS colour the chart shell accepts (hex, rgb/hsl, `var(--token)`). Default:
   *  the kit's categorical ramp by position, `paletteFor(index)`. */
  color?: string;
  /** Marks the PAIRED line of a pair — the return stroke against the out-stroke, the
   *  reference against the measurement. Shorthand for `dash: 1`. */
  dashed?: boolean;
  /** Which of {@link STROKE_PATTERNS} this line takes, for charts where the stroke says
   *  WHICH QUANTITY and the colour says WHICH MEASUREMENT. */
  dash?: number;
  /** `stepAfter`, for a whole-number channel that jumps rather than travels — a
   *  straight line between index 0 and index 1 draws an index of 0.5, which does not
   *  exist. Drawn in the {@link STEP_DASH} pattern, whatever `dash` says. */
  step?: boolean;
  /** Which of `axes` this line is measured on. Default: `"y"`, the single one. */
  axis?: string;
}

interface SeriesChartAxisShape {
  id: string;
  /**
   * Which side of the plot the ticks stand on. Left unless said otherwise — and said
   * otherwise for the right-hand chart of a FACING pair (see `facingAxes`), whose
   * scales go on the outside so neither column of numbers stands between two pictures
   * being compared.
   */
  orientation?: "left" | "right";
  /** Tints the ticks — and the title too, when exactly one series is measured on this
   *  axis (see {@link soleSeriesColor}). */
  color?: string;
  /** What the TICKS need, in px. The title's strip is added on top. Default 48. */
  width?: number;
  /**
   * Pin the scale instead of fitting it to this chart's data. For a ROW of charts
   * read against each other: auto-fitted, a 200 N loop and a 2000 N one draw the
   * identical picture, and the comparison the layout promises is the one it fails.
   */
  domain?: [number, number];
  /** A tick, formatted — as a BARE number. The unit is said once, in the title; the
   *  tooltip gets it from `valueFormat`. Default: `Intl.NumberFormat` in the kit's
   *  locale, up to two fraction digits. */
  format?: (value: number) => string;
}

/**
 * A y axis — and a VISIBLE one says what it measures.
 *
 * A union rather than an optional field, so the rule is the type's: a column of numbers
 * whose quantity and unit are not written down is a column somebody reads as whatever
 * they expected. `title: ""` is the explicit opt-out (the right-hand chart of a facing
 * pair, whose neighbour already said it). A HIDDEN axis scales its lines and draws
 * nothing, so there is nowhere for a title to go.
 */
export type SeriesChartAxis = SeriesChartAxisShape &
  ({ title: string; hide?: false } | { title?: string; hide: true });

export interface SeriesChartX {
  /** Row key of the abscissa. Default `"x"`, which is what {@link mergeSeries} writes. */
  key?: string;
  /** What the abscissa is, with its unit. Drawn under the axis. */
  title?: string;
  /** A tick, formatted — bare, like the y axes'. */
  format?: (value: number) => string;
  /**
   * Whether this chart prints the abscissa's ticks. On by default; off for every chart
   * of a stack sharing one x window but the bottom one, which prints them for all. It
   * costs no alignment: the x mapping is decided by the margins and the y bands.
   */
  ticks?: boolean;
  /** The tooltip's heading. Default: the abscissa value through `format`. */
  label?: (value: number) => ReactNode;
}

/**
 * A vertical segment in data coordinates — two y at one x, which a row-per-abscissa
 * chart structurally cannot draw. For CLOSING a shape the series already drew: the
 * turnarounds of a hysteresis loop, where the abscissa stands still while the value
 * falls from one branch to the other.
 */
export interface SeriesChartSpan {
  /** Distinct within the chart. */
  key: string;
  /** Which y axis `from`/`to` are measured on. Default `"y"`. */
  axis?: string;
  x: number;
  from: number;
  to: number;
  /** Default: `var(--text-muted)`. */
  color?: string;
}

export interface SeriesChartProps {
  /** One row per abscissa value. A missing key is a hole (see `connectNulls`). */
  rows: Record<string, number>[];
  series: SeriesChartSeries[];
  /** Default: one untitled axis, `"y"`. */
  axes?: SeriesChartAxis[];
  x?: SeriesChartX;
  /** A value in the tooltip, where a number stands on its own and needs its unit.
   *  Default: `Intl.NumberFormat` in the kit's locale. */
  valueFormat?: (value: number) => string;
  /** Tailwind height class. Default `h-72`. The empty state takes it too, so a chart
   *  losing its last line does not relayout the page under it. */
  height?: string;
  /** Bridge holes left by sources sampled on different grids. See {@link mergeSeries}. */
  connectNulls?: boolean;
  /** Shown, centred at the chart's height, instead of an empty chart. Default: the
   *  `seriesChart.empty` label. `null` shows nothing. */
  empty?: ReactNode;
  /**
   * Milliseconds for a line to draw itself in. Off by default: a chart beside a live
   * editor re-renders on every keystroke, and an animation restarted mid-flight reads
   * as the curve twitching. Turn it on where series come and go by choice.
   */
  animationMs?: number;
  spans?: SeriesChartSpan[];
  /** Supplied by `withChartZoom` and by nothing else. */
  zoom?: ZoomBinding;
  /** Per-chart strings over `<UiKitProvider labels={{ seriesChart }}>`. */
  labels?: Partial<SeriesChartLabels>;
  /** BCP 47 tag for the default number formats. Default: the provider's. */
  locale?: string;
  /** Onto the chart's root (`ChartContainer`) — e.g. an app's own grid ink. */
  className?: string;
}

/** How much of an axis band the rotated title takes, in px. Reserved rather than
 *  shared with the ticks: a title merely offset inside the band prints on top of a
 *  five-figure tick, and which gives way depends on the data. */
export const AXIS_TITLE_STRIP = 16;

/** Where inside its strip the rotated title sits. */
const AXIS_TITLE_OFFSET = 10;

/** The width the ticks of a y axis get when a caller does not say. */
export const AXIS_TICK_WIDTH = 48;

/**
 * How much air a FITTED axis leaves between the data and its frame, as a fraction of
 * the range. Recharts fits `[dataMin, dataMax]`, which draws a peak half a stroke
 * outside the plot and a curve running to its limit indistinguishable from the frame.
 */
const AUTO_PAD = 0.04;

/** The band a fitted axis draws, padded — and a real band for constant data, which is
 *  a zero-height domain recharts cannot scale into. `undefined` when nothing finite. */
export function paddedDomain(values: Iterable<number>): [number, number] | undefined {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return padBand(low, high);
}

/**
 * {@link paddedDomain} for a caller that has already walked its own data — so a row
 * of charts can share one scale without building an array to find two numbers in, and
 * without a second padding rule. `low > high` means "nothing was seen": `undefined`.
 */
export function padBand(low: number, high: number): [number, number] | undefined {
  if (!(low <= high)) return undefined;
  const pad = (high - low) * AUTO_PAD || Math.abs(high) * AUTO_PAD || 1;
  return [low - pad, high + pad];
}

/** The whole band a y axis occupies: its ticks, and its title when it draws one. For
 *  lining a heading up over a PLOT rather than over its column. */
export function axisBandWidth(tickWidth: number | undefined, titled: boolean): number {
  return (tickWidth ?? AXIS_TICK_WIDTH) + (titled ? AXIS_TITLE_STRIP : 0);
}

/**
 * The colour an axis TITLE takes, or `undefined` for the neutral one.
 *
 * An axis measuring exactly one line is that line's, and saying so in the title lets a
 * reader find a channel's scale without counting axes. An axis measuring several is
 * nobody's — a title in the first one's colour would be claiming it. Counted off the
 * series, so toggling a second line onto an axis gives the colour up in the same render.
 */
export function soleSeriesColor(
  axis: Pick<SeriesChartAxisShape, "id" | "color">,
  series: readonly Pick<SeriesChartSeries, "axis">[],
): string | undefined {
  const mine = series.filter((entry) => (entry.axis ?? DEFAULT_Y_AXIS) === axis.id);
  return mine.length === 1 ? axis.color : undefined;
}

/** The single-axis case, which is most charts. `width` is what the TICKS need;
 *  `orientation` is which side they stand on. */
export function oneAxis(
  format: ((value: number) => string) | undefined,
  title: string,
  width?: number,
  orientation?: "left" | "right",
): SeriesChartAxis[] {
  return [{ id: DEFAULT_Y_AXIS, format, title, width, orientation }];
}

/** One source's samples: an abscissa and the channels measured against it. */
export interface SeriesSource {
  x: number[];
  channels: Record<string, number[]>;
}

/**
 * Merge sources sampled on different grids into rows the chart can draw.
 *
 * Merged ON THE ABSCISSA VALUE ITSELF, never interpolated onto a common grid: a line
 * through invented points looks exactly like one through measured ones. Where a source
 * has no sample the key is absent, and `connectNulls` bridges the hole with the same
 * straight segment an interpolation would have drawn — without claiming a measurement.
 */
export function mergeSeries(sources: SeriesSource[]): Record<string, number>[] {
  const byAbscissa = new Map<number, Record<string, number>>();
  for (const source of sources) {
    source.x.forEach((value, index) => {
      const row = byAbscissa.get(value) ?? { x: value };
      for (const [key, channel] of Object.entries(source.channels)) row[key] = channel[index];
      byAbscissa.set(value, row);
    });
  }
  return [...byAbscissa.values()].sort((a, b) => a.x - b.x);
}

/**
 * A series key built out of parts — as a CSS identifier.
 *
 * The chart shell paints each series through `--color-<key>`, and skips (with a
 * console warning) any key that is not `[A-Za-z_][A-Za-z0-9_-]*`. A line whose colour
 * was skipped has no stroke at all: an axis, a grid and nothing between them. So a key
 * assembled out of DATA — an id, an enum, a side — goes through here: every other
 * character becomes `_`, the parts are joined with `_`, and a key that would start with
 * a digit or a hyphen gets a leading `_`.
 */
export function seriesKey(...parts: (string | number)[]): string {
  const key = parts.map((part) => String(part).replace(/[^A-Za-z0-9_-]/g, "_")).join("_");
  return /^[A-Za-z_]/.test(key) ? key : `_${key}`;
}

/** The number format every default falls back to. */
function useDefaultFormat(localeProp: string | undefined): (value: number) => string {
  const locale = useKitLocale(localeProp);
  return useMemo(() => {
    const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    return (value: number) => format.format(value);
  }, [locale]);
}

/** The Y-axis list a chart draws when the caller gave none. */
const ONE_UNTITLED_AXIS: SeriesChartAxis[] = [{ id: DEFAULT_Y_AXIS, title: "" }];

/**
 * {@link SeriesChart} without the zoom: the same picture, no drag layer, no reset
 * button. For a thumbnail, a print view, or a chart the consumer wraps in its own
 * interaction.
 */
export function StaticSeriesChart({
  rows,
  x = {},
  series,
  axes = ONE_UNTITLED_AXIS,
  valueFormat,
  height = "h-72",
  connectNulls,
  empty,
  animationMs = 0,
  spans,
  zoom,
  labels: labelsProp,
  locale,
  className,
}: SeriesChartProps) {
  const labels = useKitLabels("seriesChart", DEFAULT_SERIES_CHART_LABELS, labelsProp);
  const number = useDefaultFormat(locale);

  // The empty state takes the chart's own height and is centred in it: a chart that
  // shrank to its "nothing to draw" sentence moved everything under it up the page
  // the moment a legend entry was switched off.
  if (!rows.length || !series.length) {
    return (
      <div className={cn("flex w-full items-center justify-center px-2 text-center", height)}>
        {empty !== undefined ? (
          empty
        ) : (
          <p className="text-xs text-[var(--text-muted)]">{labels.empty}</p>
        )}
      </div>
    );
  }

  const xKey = x.key ?? "x";
  const xFormat = x.format ?? number;
  const config: ChartConfig = Object.fromEntries(
    series.map((entry, index) => [
      entry.key,
      { label: entry.label, color: entry.color ?? paletteFor(index) },
    ]),
  );
  const visible = axes.filter((axis) => !axis.hide);
  // The grid hangs its horizontal rules off ONE y axis, and recharts looks for the one
  // whose id is its own default (`0`). Every axis here is named, so without saying
  // which, it finds none and draws no horizontal rules at all. The first visible axis,
  // because those are the ticks a reader puts a ruler on.
  const gridAxis = (visible[0] ?? axes[0])?.id ?? DEFAULT_Y_AXIS;
  const onLeft = visible.some((axis) => (axis.orientation ?? "left") === "left");
  const onRight = visible.some((axis) => axis.orientation === "right");
  // The margins are what is left once the axes have their bands: an axis band IS the
  // gutter on its side, so a margin beside one is a second gutter. What remains is the
  // overhang of the first/last x tick where no y axis covers it.
  const margin = {
    top: 8,
    right: onRight ? 0 : 10,
    left: onLeft ? 0 : 10,
    // Under the ticks, not under the whole axis: whatever comes next owns the gap.
    bottom: x.title ? 18 : 2,
  };

  // Fitted with air around it, unless the reader has zoomed or the caller pinned it.
  const fittedX = zoom?.xDomain ?? paddedDomain(rows.map((row) => row[xKey]));
  const fittedY = (axis: SeriesChartAxis) =>
    zoom?.yDomains[axis.id] ??
    axis.domain ??
    paddedDomain(
      series
        .filter((entry) => (entry.axis ?? DEFAULT_Y_AXIS) === axis.id)
        .flatMap((entry) => rows.map((row) => row[entry.key])),
    );

  return (
    <ChartContainer config={config} className={cn("w-full", height, className)}>
      <LineChart data={rows} margin={margin}>
        {/* Both ways: a measurement plot is read by putting a ruler on it, and a
            horizontal-only grid answers half of those questions. */}
        <CartesianGrid yAxisId={gridAxis} />
        <XAxis
          dataKey={xKey}
          // Numeric, not categorical: a measured sweep is unevenly spaced, and a
          // category axis would straighten exactly the curvature the chart is for.
          type="number"
          domain={fittedX ?? ["dataMin", "dataMax"]}
          // Clip the lines to a zoom window instead of recharts widening it back out.
          allowDataOverflow={zoom?.xDomain !== undefined}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          tick={x.ticks === false ? false : undefined}
          // With neither ticks nor title there is nothing to reserve the band for, and
          // recharts' own 30 px would leave a gap under every chart of a stack.
          height={x.ticks === false && !x.title ? 4 : undefined}
          tickFormatter={xFormat}
        >
          {x.title && (
            <Label
              value={x.title}
              position="insideBottom"
              offset={-12}
              className="fill-[var(--text-muted)] text-[11px]"
            />
          )}
        </XAxis>
        {axes.map((axis) => (
          <YAxis
            key={axis.id}
            yAxisId={axis.id}
            hide={axis.hide}
            domain={fittedY(axis)}
            allowDataOverflow={zoom?.yDomains[axis.id] !== undefined}
            orientation={axis.orientation ?? "left"}
            width={axisBandWidth(axis.width, Boolean(axis.title) && !axis.hide)}
            tickLine={false}
            axisLine={false}
            tickFormatter={axis.format ?? number}
            // With an axis per channel the tint is the only thing saying which
            // numbers belong to which line.
            tick={axis.color ? { fill: axis.color } : undefined}
          >
            {axis.title && !axis.hide && (
              <Label
                value={axis.title}
                // Rotated so both sides read upward from the bottom of their axis.
                angle={axis.orientation === "right" ? 90 : -90}
                position={axis.orientation === "right" ? "insideRight" : "insideLeft"}
                // Inline, so a sole series' colour beats the class's neutral fill —
                // and absent for a shared axis, so the class draws it.
                style={{ textAnchor: "middle", fill: soleSeriesColor(axis, series) }}
                offset={AXIS_TITLE_OFFSET}
                className="fill-[var(--text-muted)] text-[11px]"
              />
            )}
          </YAxis>
        ))}
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => (x.label ?? xFormat)(Number(value))}
              valueFormatter={valueFormat ?? number}
            />
          }
        />
        {series.map((entry) => (
          <Line
            key={entry.key}
            yAxisId={entry.axis ?? DEFAULT_Y_AXIS}
            type={entry.step ? "stepAfter" : "monotone"}
            dataKey={entry.key}
            stroke={`var(--color-${entry.key})`}
            strokeWidth={entry.step ? 1.5 : 2}
            strokeDasharray={strokeDash(
              entry.step ? STEP_DASH : (entry.dash ?? (entry.dashed ? 1 : 0)),
            )}
            dot={false}
            connectNulls={connectNulls}
            isAnimationActive={animationMs > 0}
            animationDuration={animationMs}
            animationEasing="ease-out"
          />
        ))}
        {spans?.map((span) => (
          <ReferenceLine
            key={span.key}
            yAxisId={span.axis ?? DEFAULT_Y_AXIS}
            segment={[
              { x: span.x, y: span.from },
              { x: span.x, y: span.to },
            ]}
            stroke={span.color ?? "var(--text-muted)"}
            strokeWidth={2}
            // Discarded rather than clamped when zoomed past: a span clamped to the
            // window's edge draws a vertical line at an abscissa it never stood at.
            ifOverflow="discard"
          />
        ))}
        {zoom?.layer}
      </LineChart>
    </ChartContainer>
  );
}

/**
 * The series chart, zoomable. Drag across the plot to zoom (the drag's shape picks the
 * axes), double-click or press the reset button to go back; wrap several in
 * `SharedXZoom` to move their x windows together.
 */
export const SeriesChart = withChartZoom(StaticSeriesChart);
