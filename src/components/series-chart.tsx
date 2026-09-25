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
//
// **Bars, areas and periods too (0.8.0).** keksdose drew five money charts in raw
// recharts — net worth, investments, income/expense, grouped payees, stacked categories
// — each re-deciding the grid, the tooltip, the axis width and the "—" for a gap. They
// are the same arrangement with a different mark, so a series now says `type: "bar" |
// "area"` (and `stack`), and the abscissa may be a row of PERIODS (`x.type:
// "category"`) or real dates (`x.type: "time"`) instead of a number the app had to
// invent. What each of those does to the zoom is decided in one place,
// `defaultZoomAxes` in `chart-zoom.tsx`.
import { useMemo } from "react";
import type { ReactNode, RefObject } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart";
import {
  DEFAULT_Y_AXIS,
  axisExtent,
  withChartZoom,
  type ZoomAxesSetting,
  type ZoomBinding,
  type ZoomFitSource,
} from "./chart-zoom";
import { STEP_DASH, strokeDash, type LegendEntry } from "./toggle-legend";
import { DEFAULT_SERIES_CHART_LABELS, type SeriesChartLabels } from "./series-chart-labels";
import { categoryTicks, integerTicks, niceTicks, timeTicksWithUnit, type TimeTickUnit } from "./series-chart-ticks";
// The tick module stays internal; the one type of it a public prop names is re-exported.
export type { TimeTickUnit } from "./series-chart-ticks";
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
   *  WHICH QUANTITY and the colour says WHICH MEASUREMENT.
   *
   *  Or an SVG `stroke-dasharray` string of the caller's own, for a pattern the five do
   *  not have: keksdose's `"4 3"`, a tighter dash than the ladder's `"5 4"` that its
   *  hand-drawn recharts lines used before the kit. Prefer the index — a
   *  {@link ToggleLegend} entry can only draw the ladder's patterns, so a custom string
   *  shows there as the ladder's plain dash (index 1) rather than its own. */
  dash?: number | string;
  /** `stepAfter`, for a whole-number channel that jumps rather than travels — a
   *  straight line between index 0 and index 1 draws an index of 0.5, which does not
   *  exist. Drawn in the {@link STEP_DASH} pattern, whatever `dash` says. */
  step?: boolean;
  /** Which of `axes` this line is measured on. Default: `"y"`, the single one. */
  axis?: string;
  /**
   * The mark. `"line"` (the default) is what every chart before 0.8.0 drew. `"bar"` and
   * `"area"` are read as a LENGTH from zero, so the axis they stand on always includes
   * zero (see `SeriesChartAxis.includeZero`) and the zoom treats them differently (see
   * `defaultZoomAxes`). Bars without a `stack` stand side by side in each slot — the
   * grouped bars of keksdose's payee report.
   */
  type?: SeriesChartType;
  /**
   * Bars or areas with the same `stack` are drawn on top of each other and the axis is
   * fitted to their SUM (positive and negative layers apart, like recharts'
   * `stackOffset="sign"`). keksdose's spending-by-category area. Ignored on a line:
   * recharts cannot stack one.
   */
  stack?: string;
  /**
   * Marks on the line's (or area's) points. `true` rings every sample — the price
   * history, where a shop has a value only on the days somebody shopped there and the
   * dots are the only thing saying which points were MEASURED. A function decides per
   * point: `true` for the default dot, `false`/`null` for none, or any SVG node drawn
   * as-is at `point.cx`/`point.cy` — a buy/sell marker on keksdose's paper price.
   * Never called for a point with no value. Bars have no points, and ignore it.
   */
  dot?: boolean | ((point: SeriesChartPoint) => ReactNode);
  /** Line (or area outline) weight in px. Default 2, or 1.5 for a `step`. keksdose
   *  draws the subject of a chart at 2.5 and the reference it is read against at 1.5. */
  strokeWidth?: number;
  /** `"linear"` for a line that must not look smoothed — keksdose's cash-buffer
   *  PROJECTION, a straight extrapolation that a monotone curve would dress up as data.
   *  Default `"monotone"`; `step` wins over both. */
  curve?: "monotone" | "linear";
  /** An area's or bar's fill opacity. Default: 1 for a bar, 0.55 for a stacked area
   *  (the layers must stay tellable apart where they meet) and 0.2 for a single one. */
  fillOpacity?: number;
  /**
   * The dot that follows the pointer along a line or an area. `false` takes it off a
   * series that is not a measurement — keksdose's cash-buffer PROJECTION, where a hover
   * ring on the extrapolated line reads as a sampled value (`cash-buffer-chart.tsx`).
   * `{ r }` sets its radius. Default: recharts' dot. Bars have none, and ignore it.
   */
  activeDot?: boolean | { r?: number };
}

/** What a series draws. See {@link SeriesChartSeries.type}. */
export type SeriesChartType = "line" | "bar" | "area";

/** One point of a series, as a `dot` function is handed it. */
export interface SeriesChartPoint {
  /** The series' key. */
  key: string;
  /** The row's position in `rows`. */
  index: number;
  /** The caller's own row, with everything the chart did not plot still in it. */
  row: SeriesChartRow;
  /** The abscissa in the caller's terms: the number, the category, or (time) a Date. */
  x: SeriesChartXValue;
  value: number;
  /** Where the point is drawn, in the chart's pixels. */
  cx: number;
  cy: number;
  /** The series' paint, `var(--color-<key>)`. */
  color: string;
}

/** A row of a series chart: one abscissa value and the series' values at it. Anything
 *  else in it (a raw ISO period for a drilldown) rides along untouched and is handed
 *  back in {@link SeriesChartPoint.row} and {@link SeriesChartHit.row}. */
export type SeriesChartRow = Readonly<Record<string, unknown>>;

/** An abscissa value: a number (`x.type: "number"`), a category (a string, a number or
 *  a Date standing for a period), or a time (a Date, epoch ms or an ISO string). */
export type SeriesChartXValue = number | string | Date;

/** Ticks a caller decides — a list, or a function of the domain on show, so a zoom
 *  window gets ticks from the same rule instead of none. */
export type SeriesChartTickValues<T> =
  | readonly T[]
  | ((domain: [number, number]) => readonly T[] | undefined);

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
  /**
   * The tick values, instead of the round ones the chart picks. For a grid the DATA
   * dictates — keksdose's price axes tick on whole cents (`pricePaddedDomain`), where a
   * 1/2/5 ladder would print €1.25 under a formatter that can only say €1.3. Values
   * outside the domain on show are dropped; a function is asked again for every zoom
   * window, so the cent grid can refine with it.
   */
  tickValues?: SeriesChartTickValues<number>;
  /**
   * Keep zero inside the fitted band. On by default for an axis carrying a bar or an
   * area — their length IS the value, and a truncated baseline draws 40 as three times
   * 20 — and off for lines, whose shape is the point (a stock price anchored at zero is
   * a hairline). A pinned `domain` is left alone either way.
   */
  includeZero?: boolean;
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

/**
 * What a tick or the tooltip heading of the abscissa is handed besides its position —
 * the value in the caller's own terms, which on a category or time axis is not the
 * number the plot runs on.
 */
export interface SeriesChartXTick {
  /** The number itself, the row's category, or (time) a Date. */
  value: SeriesChartXValue;
  /** The slot, on a category axis: the row's index in `rows`. */
  index?: number;
  /** On a time axis: what one step of the ticks on show is, so a label can say as much
   *  as it means — a month start as "Mar 26", a midnight as "14 Mar". */
  unit?: TimeTickUnit;
}

export interface SeriesChartX {
  /**
   * What the abscissa is.
   *
   * - `"number"` (the default) — a number line, and all a chart before 0.8.0 could draw.
   * - `"category"` — PERIODS or names, one evenly spaced slot per row, in row order:
   *   keksdose's months, quarters and budget categories, which it used to hand recharts
   *   preformatted. The values stay the caller's own — `"2026-05"`, a Date for the
   *   month, a category name — and need not be sortable, unique or numeric. The plot
   *   runs on the slot INDEX, which is what lets it zoom: a drag across the third to the
   *   ninth month shows those months, a tick on each whole slot and the bars clipped at
   *   the edge. What else zooms depends on the MARKS, not the axis — see `zoomAxes`.
   * - `"time"` — real TIME: a Date, epoch ms or an ISO string per row, placed by when
   *   it happened. keksdose's price history and cash buffer, where a slot per row would
   *   draw two receipts a day apart and two five months apart the same width. Ticks fall
   *   on calendar boundaries (midnights, Mondays, month and quarter starts, new years)
   *   in local time; a date-only ISO string is LOCAL midnight, not the UTC one
   *   `new Date("2026-05-01")` gives, which lands on the previous day west of Greenwich.
   *   Zooms like a number line.
   */
  type?: "number" | "category" | "time";
  /** Row key of the abscissa. Default `"x"`, which is what {@link mergeSeries} writes. */
  key?: string;
  /** What the abscissa is, with its unit. Drawn under the axis. */
  title?: string;
  /**
   * A tick, formatted — bare, like the y axes'.
   *
   * `value` is the POSITION on the number line the plot runs on — the number itself,
   * epoch ms, or the slot index — so the one-argument formatters every chart before
   * 0.8.0 passes keep their meaning, and a time axis' `(ms) => …` is the tickFormatter
   * keksdose already has. The caller's own value (the category, the Date) is `tick.value`.
   * Default: the kit's number format; a category as is (a number formatted, a Date as a
   * medium date); a time as much of the date as the tick step means.
   */
  format?: (value: number, tick: SeriesChartXTick) => string;
  /**
   * Whether this chart prints the abscissa's ticks. On by default; off for every chart
   * of a stack sharing one x window but the bottom one, which prints them for all. It
   * costs no alignment: the x mapping is decided by the margins and the y bands.
   */
  ticks?: boolean;
  /** The tooltip's heading. Default: `format` — or, on a time axis, a medium date (with
   *  the time for hourly data), since a tick's "Mar 26" is not which day it was. */
  label?: (value: number, tick: SeriesChartXTick) => ReactNode;
  /** The ticks instead of the automatic ones, in the caller's terms: numbers, the
   *  categories to label, or instants. See `SeriesChartAxis.tickValues`. */
  tickValues?: SeriesChartTickValues<SeriesChartXValue>;
  /**
   * Tilt the tick labels by this many degrees — negative rises to the right. For long
   * category names that do not fit side by side: keksdose's budget performance draws its
   * categories at −45° (`budget-performance-tab.tsx`). The label is anchored by its END
   * for a negative angle and its START for a positive one, so it hangs off the tick
   * instead of being centred across it; the anchor is physical, like the plot (see
   * `ChartContainer`), so it is the same in RTL. The band under the axis grows to the
   * rotated height of the longest label on show, estimated from its length (at most
   * 120 px, past which a label is clipped). Default 0.
   */
  tickAngle?: number;
  /**
   * On a `"number"` axis, tick only on whole numbers: a step of 1 at the least, so a
   * five-point index series reads 0 1 2 3 4 rather than 0 0.5 1 … 4 — ticks at
   * positions no row can have (keksdose's short step series). A zoom window that holds
   * no whole number falls back to the ordinary ticks rather than to none.
   *
   * AUTOMATIC by default — on when every row's x is a whole number — because that is
   * exactly the case the half ticks are wrong in, and it changes nothing elsewhere: a
   * span wider than about eight already ticks on whole steps. `false` for a continuous
   * quantity that merely happens to be sampled on whole numbers (1 Hz steps) and whose
   * zoom should still be ruled in fractions; `true` to force it over rows that are not.
   * Ignored on category (already one tick per slot) and time axes.
   */
  integerTicks?: boolean;
}

/** Room for the tooltip beyond the chart — see {@link SeriesChartProps.tooltip}. */
export interface SeriesChartTooltip {
  /** Let the tooltip run past the chart's own box on that axis instead of recharts
   *  clamping it inside. Default: `{ x: true }` when `boundary` is set, else neither. */
  allowEscapeViewBox?: { x?: boolean; y?: boolean };
  /**
   * The element that actually CLIPS the chart — usually a horizontal-scroll wrapper
   * around a chart wider than the card. The tooltip then flips to the left of the cursor
   * when it would spill past that element's visible right edge (see
   * `ChartTooltipContent`'s `boundaryRef`), rather than against the wide chart's far edge
   * the reader has not scrolled to. keksdose's budget performance, which keeps a scroll
   * wrapper and a per-category `minWidth` (`budget-performance-tab.tsx`).
   */
  boundary?: RefObject<HTMLElement | null>;
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

/** The colours a reference or a marker can take by name — the kit's semantic tokens,
 *  so a threshold reads the same on every chart and flips with the theme. */
export type SeriesChartTone =
  | "muted"
  | "brand"
  | "income"
  | "expense"
  | "net"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONE_COLOR: Record<SeriesChartTone, string> = {
  muted: "var(--text-muted)",
  brand: "var(--brand)",
  income: "var(--money-income)",
  expense: "var(--money-expense)",
  net: "var(--money-net)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
};

/**
 * A line across the whole plot at one value: a threshold, a target, an event.
 *
 * keksdose's cash buffer draws "one month of runway" across at y = 30 and the projected
 * depletion date down at its x. Unlike a {@link SeriesChartSpan}, which closes a shape
 * in data coordinates, a reference spans the plot, whatever the zoom.
 *
 * A reference is part of the FITTED band: one outside the data widens the axis to show
 * it, because a threshold the reader cannot see is not a threshold. A pinned domain or a
 * zoom window does not widen — there it is discarded when outside, like a span.
 */
export interface SeriesChartReference {
  /** Distinct within the chart. Default: its position in the list. */
  key?: string;
  /** `"x"` for a vertical line at an abscissa, otherwise the id of the y axis the value
   *  is measured on. Default `"y"`, the single one — so no y axis may be called `"x"`. */
  axis?: string;
  /** An abscissa in the x axis' own terms (a category, a Date) for `axis: "x"`, a
   *  number on that axis otherwise. A category the rows do not have draws nothing. */
  value: SeriesChartXValue;
  /** Written along the line, inside the plot at its top-left. SVG text: a string. */
  label?: string;
  /** Default `"muted"`. `color` wins over it. */
  tone?: SeriesChartTone;
  color?: string;
  /** Which of `STROKE_PATTERNS`. Default 1, dashed: a reference is not data, and a
   *  solid line reads as a series nobody put in the legend. */
  dash?: number;
}

/**
 * A single labelled point — today's figure on keksdose's cash buffer, the month the
 * projection runs dry. For a mark on EVERY sample, or on the samples that meet a test,
 * use the series' `dot` instead; a marker is for a point that is a fact of its own.
 * Fitted like a reference: it widens the band it would otherwise fall outside of.
 */
export interface SeriesChartMarker {
  /** Distinct within the chart. Default: its position in the list. */
  key?: string;
  /** In the x axis' own terms, like a reference's `value`. */
  x: SeriesChartXValue;
  y: number;
  /** The y axis `y` is measured on. Default `"y"`. */
  axis?: string;
  /** Written above the point. */
  label?: string;
  /** Default `"brand"`. `color` wins over it. */
  tone?: SeriesChartTone;
  color?: string;
  /** Radius in px. Default 4.5. */
  r?: number;
}

/** What a click on the plot picked. */
export interface SeriesChartHit {
  /** The row's position in `rows`. */
  index: number;
  /** The caller's own row — with its `rawPeriod`, id or whatever the drilldown needs. */
  row: SeriesChartRow;
  x: SeriesChartXValue;
  /** The series, when the click landed ON a bar. A click anywhere else picks the slot
   *  (the period), not a series. */
  key?: string;
}

export interface SeriesChartProps {
  /** One row per abscissa value. A missing key is a hole (see `connectNulls`). */
  rows: readonly SeriesChartRow[];
  series: SeriesChartSeries[];
  /** Default: one untitled axis, `"y"`. */
  axes?: SeriesChartAxis[];
  x?: SeriesChartX;
  /** A value in the tooltip, where a number stands on its own and needs its unit.
   *  Default: `Intl.NumberFormat` in the kit's locale. */
  valueFormat?: (value: number) => string;
  /** Tailwind height class, or a height in pixels. Default `h-72`. The empty state
   *  takes it too, so a chart losing its last line does not relayout the page under it.
   *  A number is for a height the caller holds as a number — keksdose's report charts
   *  take `height = 260` as a prop and wrap the chart in a `SizedSeriesChart` div
   *  (reports/charts/networth-line.tsx) only to turn it into a style, since a class
   *  cannot be built from a number Tailwind never saw. */
  height?: string | number;
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
  /** Lines across the plot at one value. */
  references?: SeriesChartReference[];
  /** Single labelled points. */
  markers?: SeriesChartMarker[];
  /**
   * Which axes a drag may zoom: `"both"`, `"x"`, `"y"` or `"none"`. Default: read off
   * the marks — see `defaultZoomAxes` (lines both, areas x, bars none). An axis carrying
   * bars or areas never takes a DRAGGED y window: it refits to the x window, from zero.
   * Ignored by `StaticSeriesChart`, which does not zoom.
   */
  zoomAxes?: ZoomAxesSetting;
  /**
   * A click on the plot: the slot under the pointer, and the series when it landed on a
   * bar. keksdose's drilldowns — a payee's month, a budget line, a spending category.
   * A drag that zoomed is not a click.
   */
  onPointClick?: (hit: SeriesChartHit) => void;
  /** Where the tooltip may go: for a chart inside a scroll wrapper. See
   *  {@link SeriesChartTooltip}. */
  tooltip?: SeriesChartTooltip;
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

/** The tallest band tilted x ticks reserve, in px. A category name longer than this at
 *  its angle is clipped rather than squeezing the plot down to a strip. */
const MAX_TILTED_TICK_BAND = 120;

/** What one character of a tick label is taken to be, in px, for the tilted band — the
 *  shell's `text-xs`. An estimate: the SVG is not laid out yet when the band is decided. */
const TICK_CHAR_WIDTH = 7;
const TICK_LINE_HEIGHT = 12;
/** recharts' gap between the axis line and a bottom tick's text. */
const TICK_GAP = 8;

/**
 * The height the x axis reserves for ticks tilted by `angle` degrees: the rotated box of
 * the longest label, from its length. `undefined` for level ticks — recharts' own 30 px.
 */
function tiltedTickBand(labels: readonly string[], angle: number): number | undefined {
  if (!angle) return undefined;
  const rad = (Math.abs(angle) * Math.PI) / 180;
  const longest = Math.max(0, ...labels.map((label) => label.length)) * TICK_CHAR_WIDTH;
  const band = Math.sin(rad) * longest + Math.cos(rad) * TICK_LINE_HEIGHT + TICK_GAP;
  return Math.min(MAX_TILTED_TICK_BAND, Math.max(30, Math.ceil(band)));
}

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

/**
 * The band an axis carrying bars or areas draws: the data's extent with ZERO in it,
 * padded only on the sides that are not zero — bars standing on a frame's bottom edge,
 * not floating four per cent above it on a band of air nobody asked for.
 * `undefined` when there is nothing to fit.
 */
export function anchoredBand(extent: readonly [number, number] | undefined): [number, number] | undefined {
  if (!extent) return undefined;
  const low = Math.min(0, extent[0]);
  const high = Math.max(0, extent[1]);
  const pad = (high - low) * AUTO_PAD || 1;
  return [low < 0 ? low - pad : 0, high > 0 ? high + pad : 0];
}

/**
 * Series with their colours settled BEFORE any are switched off.
 *
 * A series with no `color` takes `paletteFor(its position)` — and a legend toggle that
 * hands the chart a shorter list moves every later series one position up, repainting
 * it in its neighbour's colour on each click. Resolving the colours on the full list
 * and filtering after keeps each series in the colour its legend entry shows.
 */
export function visibleSeries(
  series: readonly SeriesChartSeries[],
  hidden: ReadonlySet<string>,
): SeriesChartSeries[] {
  return series
    .map((entry, index) => ({ ...entry, color: entry.color ?? paletteFor(index) }))
    .filter((entry) => !hidden.has(entry.key));
}

/**
 * The `ToggleLegend` entries for a chart's FULL series list — colours resolved the way
 * the chart resolves them, and a stroke mark for a line drawn in a pattern (dashed,
 * step) so the key promises the stroke the plot draws. A bar or an area is a swatch.
 * Pair with {@link visibleSeries} for the chart itself.
 */
export function seriesLegendEntries(series: readonly SeriesChartSeries[]): LegendEntry[] {
  return series.map((entry, index) => {
    // A custom dash array has no legend pattern of its own; the ladder's plain dash is
    // the nearest promise (see `SeriesChartSeries.dash`).
    const own = entry.dash ?? (entry.dashed ? 1 : 0);
    const dash = entry.step ? STEP_DASH : typeof own === "string" ? 1 : own;
    const line = (entry.type ?? "line") === "line";
    return {
      key: entry.key,
      label: entry.label,
      color: entry.color ?? paletteFor(index),
      ...(line && dash !== 0 ? { marker: "stroke" as const, dash } : {}),
    };
  });
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

/** Where a category or time chart keeps each row's plotted position. Not the caller's
 *  key: that one still holds their own value, which `format` and a hit hand back. */
const PLOTTED_X = "__seriesChartX";

/** A finite number, or `undefined` — the only thing a row cell counts as a sample. */
const finite = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** A time value as epoch ms. A date-only ISO string is LOCAL midnight (see
 *  `SeriesChartX.type`); anything unreadable is `undefined`, i.e. not plotted. */
function toTime(value: unknown): number | undefined {
  if (value instanceof Date) return finite(value.getTime());
  if (typeof value === "number") return finite(value);
  if (typeof value !== "string") return undefined;
  const day = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3] ?? 1)).getTime();
  return finite(Date.parse(value));
}

/** A category's identity, so a Date matches another Date of the same instant. */
const categoryId = (value: unknown) =>
  value instanceof Date ? `d:${value.getTime()}` : `${typeof value}:${String(value)}`;

/**
 * The abscissa, reduced to a number line — which is all the plot, the ticks and the
 * zoom ever deal in. A number stays itself; a category becomes its slot index; a time
 * its epoch ms. Everything the caller sees (ticks, tooltip, hits) is turned back.
 */
interface XModel {
  kind: "number" | "category" | "time";
  /** The caller's key, still holding their value. */
  sourceKey: string;
  /** The key the plot reads. The same as `sourceKey` on a number line. */
  plotKey: string;
  /** The rows as plotted. The caller's own on a number line. */
  rows: readonly SeriesChartRow[];
  /** The caller's rows, which dots and hits hand back. */
  source: readonly SeriesChartRow[];
  position: (value: unknown) => number | undefined;
  valueAt: (position: number) => SeriesChartXValue;
}

function xModel(rows: readonly SeriesChartRow[], x: SeriesChartX): XModel {
  const sourceKey = x.key ?? "x";
  if (x.type === "category") {
    const slots = new Map<string, number>();
    rows.forEach((row, index) => {
      const id = categoryId(row[sourceKey]);
      if (!slots.has(id)) slots.set(id, index);
    });
    return {
      kind: "category",
      sourceKey,
      plotKey: PLOTTED_X,
      rows: rows.map((row, index) => ({ ...row, [PLOTTED_X]: index })),
      source: rows,
      position: (value) => slots.get(categoryId(value)),
      valueAt: (position) => rows[Math.round(position)]?.[sourceKey] as SeriesChartXValue,
    };
  }
  if (x.type === "time") {
    return {
      kind: "time",
      sourceKey,
      plotKey: PLOTTED_X,
      rows: rows.map((row) => ({ ...row, [PLOTTED_X]: toTime(row[sourceKey]) })),
      source: rows,
      position: toTime,
      valueAt: (position) => new Date(position),
    };
  }
  return {
    kind: "number",
    sourceKey,
    plotKey: sourceKey,
    rows,
    source: rows,
    position: finite,
    valueAt: (position) => position,
  };
}

/** Caller ticks, as positions inside the domain on show. */
function resolveTicks<T>(
  values: SeriesChartTickValues<T> | undefined,
  domain: [number, number] | undefined,
  position: (value: T) => number | undefined,
): number[] | undefined {
  if (!values || !domain) return undefined;
  const list = typeof values === "function" ? values(domain) : values;
  if (!list) return undefined;
  const slack = (domain[1] - domain[0]) * 1e-9;
  return list
    .map(position)
    .filter((at): at is number => at !== undefined && at >= domain[0] - slack && at <= domain[1] + slack);
}

/** A low/high pair widened by some values, or `undefined` if there is still none. */
function extend(
  span: readonly [number, number] | undefined,
  values: readonly (number | undefined)[],
): [number, number] | undefined {
  let out: [number, number] | undefined = span ? [span[0], span[1]] : undefined;
  for (const value of values) {
    if (value === undefined || !Number.isFinite(value)) continue;
    out = out ? [Math.min(out[0], value), Math.max(out[1], value)] : [value, value];
  }
  return out;
}

/** How a time tick is written, by what one step of the ticks is. */
const TIME_TICK_FORMAT: Record<TimeTickUnit, Intl.DateTimeFormatOptions> = {
  hour: { hour: "2-digit", minute: "2-digit" },
  day: { day: "numeric", month: "short" },
  month: { month: "short", year: "2-digit" },
  year: { year: "numeric" },
};

/** The two numbers every mark type needs to agree on for the chart to read as one. */
const LINE_WIDTH = 2;
const STEP_WIDTH = 1.5;

/** Bars round their FREE end only, and a stacked bar has none but the top layer's —
 *  which recharts cannot tell apart per cell, so stacks stay square. */
const BAR_RADIUS: [number, number, number, number] = [3, 3, 0, 0];

interface PlotProps extends Omit<SeriesChartProps, "rows" | "x"> {
  /** The rows AS PLOTTED — what the zoom fits on. The caller's are `model.source`. */
  rows: readonly SeriesChartRow[];
  /** What the zoom fits on: the plotted key. */
  x: { key: string };
  model: XModel;
  xAxis: SeriesChartX;
}

/** The chart proper, over an abscissa already reduced to numbers (see {@link XModel}). */
function SeriesPlot({
  model,
  xAxis,
  series,
  axes = ONE_UNTITLED_AXIS,
  valueFormat,
  height = "h-72",
  connectNulls,
  empty,
  animationMs = 0,
  spans,
  references,
  markers,
  onPointClick,
  tooltip,
  zoom,
  labels: labelsProp,
  locale: localeProp,
  className,
}: PlotProps) {
  const labels = useKitLabels("seriesChart", DEFAULT_SERIES_CHART_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  const number = useDefaultFormat(localeProp);

  // A number is pixels, set inline; a string is a class. Either way the one value
  // sizes both the chart and its empty state.
  const heightClass = typeof height === "string" ? height : undefined;
  const heightStyle = typeof height === "number" ? { height } : undefined;

  // The empty state takes the chart's own height and is centred in it: a chart that
  // shrank to its "nothing to draw" sentence moved everything under it up the page
  // the moment a legend entry was switched off.
  if (!model.source.length || !series.length) {
    return (
      <div
        className={cn("flex w-full items-center justify-center px-2 text-center", heightClass)}
        style={heightStyle}
      >
        {empty !== undefined ? (
          empty
        ) : (
          <p className="text-xs text-[var(--text-muted)]">{labels.empty}</p>
        )}
      </div>
    );
  }

  const x = xAxis;
  const xKey = model.plotKey;
  const plotted = model.rows;
  const rows = model.source;
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
    // Room for a marker's label over a point at the top of the band.
    top: markers?.some((marker) => marker.label) ? 22 : 8,
    right: onRight ? 0 : 10,
    left: onLeft ? 0 : 10,
    // Under the ticks, not under the whole axis: whatever comes next owns the gap.
    bottom: x.title ? 18 : 2,
  };

  const refs = references ?? [];
  const xRefs = refs.filter((ref) => ref.axis === "x");
  const yRefs = refs.filter((ref) => ref.axis !== "x");
  const xPos = (value: SeriesChartXValue) => model.position(value);

  // Fitted with air around it, unless the reader has zoomed or the caller pinned it.
  // Ticks are the round values INSIDE whichever domain that is (see
  // `series-chart-ticks.ts`), so a zoom window still gets round numbers, just finer.
  // A category axis is its slots, each half a slot of air either side — room for a
  // bar, and the tick under the middle of it.
  const fittedX: [number, number] | undefined =
    zoom?.xDomain ??
    (model.kind === "category"
      ? [-0.5, rows.length - 0.5]
      : padBand(
          ...(extend(
            undefined,
            [
              ...plotted.map((row) => finite(row[xKey])),
              ...xRefs.map((ref) => xPos(ref.value)),
              ...(markers ?? []).map((marker) => xPos(marker.x)),
            ],
          ) ?? [Infinity, -Infinity]),
        ));

  const timeUnit = model.kind === "time" ? timeTicksWithUnit(fittedX) : undefined;
  // Whole-number ticks on a number line whose rows are all whole numbers — see
  // `SeriesChartX.integerTicks`.
  const integerX =
    model.kind === "number" &&
    (x.integerTicks ??
      plotted.every((row) => {
        const value = finite(row[xKey]);
        return value === undefined || Number.isInteger(value);
      }));
  const xTicks =
    resolveTicks(x.tickValues, fittedX, xPos) ??
    (model.kind === "category"
      ? categoryTicks(fittedX, rows.length)
      : model.kind === "time"
        ? timeUnit?.ticks
        : integerX
          ? (integerTicks(fittedX) ?? niceTicks(fittedX))
          : niceTicks(fittedX));

  // Ticks and the tooltip heading, back in the caller's terms.
  const timeFormat = new Intl.DateTimeFormat(locale, TIME_TICK_FORMAT[timeUnit?.unit ?? "day"]);
  const dateFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    ...(timeUnit?.unit === "hour" ? { timeStyle: "short" } : {}),
  });
  const categoryText = (value: SeriesChartXValue) =>
    value instanceof Date
      ? dateFormat.format(value)
      : typeof value === "number"
        ? number(value)
        : String(value ?? "");
  const tickAt = (position: number): SeriesChartXTick => ({
    value: model.valueAt(position),
    ...(model.kind === "category" ? { index: Math.round(position) } : {}),
    ...(timeUnit ? { unit: timeUnit.unit } : {}),
  });
  const defaultFormat = (position: number, tick: SeriesChartXTick) =>
    model.kind === "category"
      ? categoryText(tick.value)
      : model.kind === "time"
        ? timeFormat.format(position)
        : number(position);
  const format = x.format ?? defaultFormat;
  const xFormat = (position: number) => format(position, tickAt(position));
  const label =
    x.label ??
    (model.kind === "time" ? (position: number) => dateFormat.format(position) : format);
  const xLabel = (position: number) => label(position, tickAt(position));

  const tickAngle = x.ticks === false ? 0 : (x.tickAngle ?? 0);
  const tickBand = tiltedTickBand((xTicks ?? []).map((tick) => xFormat(tick)), tickAngle);

  const source: ZoomFitSource = {
    rows: plotted,
    series,
    axes,
    xKey,
  };
  // An axis a bar or an area stands on is read from zero (see `includeZero`).
  const anchored = (axis: SeriesChartAxis) =>
    axis.includeZero ??
    series.some(
      (entry) => (entry.axis ?? DEFAULT_Y_AXIS) === axis.id && (entry.type ?? "line") !== "line",
    );
  const onAxis = (axisId: string) => (ref: { axis?: string }) => (ref.axis ?? DEFAULT_Y_AXIS) === axisId;
  const fittedY = (axis: SeriesChartAxis): [number, number] | undefined => {
    const own = [
      ...yRefs.filter(onAxis(axis.id)).map((ref) => finite(ref.value)),
      ...(markers ?? []).filter(onAxis(axis.id)).map((marker) => finite(marker.y)),
    ];
    if (anchored(axis)) {
      // Never a dragged y window: refitted to the x window, still from zero.
      if (zoom?.xDomain) return anchoredBand(axisExtent(source, axis.id, zoom.xDomain)) ?? axis.domain;
      return axis.domain ?? anchoredBand(extend(axisExtent(source, axis.id), own));
    }
    return (
      zoom?.yDomains[axis.id] ??
      axis.domain ??
      padBand(...(extend(axisExtent(source, axis.id), own) ?? [Infinity, -Infinity]))
    );
  };

  // The abscissa of a row in the caller's terms: a category is its slot, which is
  // its index; a time or a number is read back from where it was plotted.
  const xOf = (index: number): SeriesChartXValue =>
    model.kind === "category"
      ? (rows[index][model.sourceKey] as SeriesChartXValue)
      : model.valueAt(finite(plotted[index][xKey]) ?? NaN);
  const hitAt = (index: number, key?: string): SeriesChartHit | undefined => {
    const row = rows[index];
    return row ? { index, row, x: xOf(index), key } : undefined;
  };

  const dotFor = (entry: SeriesChartSeries) => {
    const want = entry.dot;
    if (!want) return false;
    const color = `var(--color-${entry.key})`;
    return (props: { cx?: number; cy?: number; index: number }) => {
      const { cx, cy, index } = props;
      const value = finite(rows[index]?.[entry.key]);
      if (value === undefined || !Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
      const point: SeriesChartPoint = {
        key: entry.key,
        index,
        row: rows[index],
        x: xOf(index),
        value,
        cx: cx!,
        cy: cy!,
        color,
      };
      const drawn = want === true ? true : want(point);
      if (drawn === true) {
        return (
          <circle
            className="recharts-dot"
            cx={cx}
            cy={cy}
            r={3}
            fill={color}
            // Ringed in the surface, so a dot on a crossing line still reads as a dot.
            stroke="var(--bg-surface)"
            strokeWidth={1.5}
          />
        );
      }
      if (drawn === false || drawn == null) return <g />;
      return <g>{drawn}</g>;
    };
  };

  const animation = {
    isAnimationActive: animationMs > 0,
    animationDuration: animationMs,
    animationEasing: "ease-out" as const,
  };

  return (
    <ChartContainer
      config={config}
      className={cn("w-full", heightClass, className, onPointClick && "cursor-pointer")}
      style={heightStyle}
    >
      <ComposedChart
        data={plotted as Record<string, unknown>[]}
        margin={margin}
        // Positive and negative layers stacked apart, as `axisExtent` fits them — a
        // month's expenses hang below the axis instead of eating into its income.
        stackOffset="sign"
        onClick={
          onPointClick
            ? (state) => {
                const index = Number(state?.activeTooltipIndex ?? state?.activeIndex);
                const hit = Number.isInteger(index) ? hitAt(index) : undefined;
                if (hit) onPointClick(hit);
              }
            : undefined
        }
      >
        {/* Both ways: a measurement plot is read by putting a ruler on it, and a
            horizontal-only grid answers half of those questions. */}
        <CartesianGrid yAxisId={gridAxis} />
        <XAxis
          dataKey={xKey}
          // Numeric, not categorical: a measured sweep is unevenly spaced, and a
          // category axis would straighten exactly the curvature the chart is for.
          // A category chart is numeric too — on the slot index — which is what lets
          // it zoom and keeps its ticks under the middle of each bar group.
          type="number"
          domain={fittedX ?? ["dataMin", "dataMax"]}
          ticks={xTicks}
          // Clip the lines to a zoom window instead of recharts widening it back out.
          allowDataOverflow={zoom?.xDomain !== undefined || model.kind === "category"}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          tick={x.ticks === false ? false : undefined}
          {...(tickAngle
            ? { angle: tickAngle, textAnchor: tickAngle < 0 ? "end" : "start" }
            : {})}
          // With neither ticks nor title there is nothing to reserve the band for, and
          // recharts' own 30 px would leave a gap under every chart of a stack.
          height={x.ticks === false && !x.title ? 4 : tickBand}
          tickFormatter={(value: number) => xFormat(Number(value))}
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
        {axes.map((axis) => {
          const domain = fittedY(axis);
          const zoomed = anchored(axis)
            ? zoom?.xDomain !== undefined
            : zoom?.yDomains[axis.id] !== undefined;
          return (
            <YAxis
              key={axis.id}
              yAxisId={axis.id}
              hide={axis.hide}
              domain={domain}
              ticks={resolveTicks(axis.tickValues, domain, finite) ?? niceTicks(domain)}
              allowDataOverflow={zoomed}
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
          );
        })}
        <ChartTooltip
          {...(tooltip?.allowEscapeViewBox || tooltip?.boundary
            ? { allowEscapeViewBox: tooltip.allowEscapeViewBox ?? { x: true } }
            : {})}
          // The content shifts itself 12 px off the cursor (or flips) against the
          // boundary; recharts' own offset on top would double it.
          {...(tooltip?.boundary ? { offset: 0 } : {})}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => xLabel(Number(value))}
              valueFormatter={valueFormat ?? number}
              boundaryRef={tooltip?.boundary}
            />
          }
        />
        {series.map((entry) => {
          const type = entry.type ?? "line";
          const yAxisId = entry.axis ?? DEFAULT_Y_AXIS;
          const color = `var(--color-${entry.key})`;
          const own = entry.dash ?? (entry.dashed ? 1 : 0);
          const dash = entry.step ? strokeDash(STEP_DASH) : typeof own === "string" ? own : strokeDash(own);
          const curve = entry.step ? "stepAfter" : (entry.curve ?? "monotone");
          const width = entry.strokeWidth ?? (entry.step ? STEP_WIDTH : LINE_WIDTH);
          if (type === "bar") {
            return (
              <Bar
                key={entry.key}
                yAxisId={yAxisId}
                dataKey={entry.key}
                stackId={entry.stack}
                fill={color}
                fillOpacity={entry.fillOpacity}
                radius={entry.stack === undefined ? BAR_RADIUS : 0}
                onClick={
                  onPointClick
                    ? (_bar, index, event) => {
                        // The plot's own click would report the same slot again,
                        // without the series.
                        event.stopPropagation();
                        const hit = hitAt(index, entry.key);
                        if (hit) onPointClick(hit);
                      }
                    : undefined
                }
                {...animation}
              />
            );
          }
          if (type === "area") {
            return (
              <Area
                key={entry.key}
                yAxisId={yAxisId}
                type={curve}
                dataKey={entry.key}
                stackId={entry.stack}
                stroke={color}
                strokeWidth={width}
                strokeDasharray={dash}
                fill={color}
                fillOpacity={entry.fillOpacity ?? (entry.stack !== undefined ? 0.55 : 0.2)}
                dot={dotFor(entry)}
                {...(entry.activeDot !== undefined ? { activeDot: entry.activeDot } : {})}
                connectNulls={connectNulls}
                {...animation}
              />
            );
          }
          return (
            <Line
              key={entry.key}
              yAxisId={yAxisId}
              type={curve}
              dataKey={entry.key}
              stroke={color}
              strokeWidth={width}
              strokeDasharray={dash}
              dot={dotFor(entry)}
              {...(entry.activeDot !== undefined ? { activeDot: entry.activeDot } : {})}
              connectNulls={connectNulls}
              {...animation}
            />
          );
        })}
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
        {refs.map((ref, index) => {
          const vertical = ref.axis === "x";
          const at = vertical ? xPos(ref.value) : finite(ref.value);
          if (at === undefined) return null;
          const color = ref.color ?? TONE_COLOR[ref.tone ?? "muted"];
          return (
            <ReferenceLine
              key={ref.key ?? `reference-${index}`}
              // A vertical line still needs a y axis to be drawn against, and every
              // axis here is named — the grid's is always there.
              yAxisId={vertical ? gridAxis : (ref.axis ?? DEFAULT_Y_AXIS)}
              {...(vertical ? { x: at } : { y: at })}
              stroke={color}
              strokeWidth={1}
              strokeDasharray={strokeDash(ref.dash ?? 1)}
              ifOverflow="discard"
              label={
                ref.label
                  ? {
                      value: ref.label,
                      position: "insideTopLeft",
                      fontSize: 10,
                      fill: color,
                    }
                  : undefined
              }
            />
          );
        })}
        {markers?.map((marker, index) => {
          const at = xPos(marker.x);
          if (at === undefined || finite(marker.y) === undefined) return null;
          const color = marker.color ?? TONE_COLOR[marker.tone ?? "brand"];
          return (
            <ReferenceDot
              key={marker.key ?? `marker-${index}`}
              yAxisId={marker.axis ?? DEFAULT_Y_AXIS}
              x={at}
              y={marker.y}
              r={marker.r ?? 4.5}
              fill={color}
              stroke="var(--bg-surface)"
              strokeWidth={1.5}
              ifOverflow="discard"
              label={
                marker.label
                  ? {
                      value: marker.label,
                      position: "top",
                      fontSize: 11,
                      fontWeight: 600,
                      fill: "var(--text-primary)",
                    }
                  : undefined
              }
            />
          );
        })}
        {zoom?.layer}
      </ComposedChart>
    </ChartContainer>
  );
}

const ZoomablePlot = withChartZoom(SeriesPlot);

/** The caller's props, with the abscissa reduced to numbers for the plot and the zoom. */
function plotProps(props: SeriesChartProps): PlotProps {
  const x = props.x ?? {};
  const model = xModel(props.rows, x);
  return { ...props, rows: model.rows, x: { key: model.plotKey }, model, xAxis: x };
}

/**
 * {@link SeriesChart} without the zoom: the same picture, no drag layer, no reset
 * button. For a thumbnail, a print view, or a chart the consumer wraps in its own
 * interaction.
 */
export function StaticSeriesChart(props: SeriesChartProps) {
  return <SeriesPlot {...plotProps(props)} />;
}

/**
 * The series chart, zoomable. Drag across the plot to zoom (the drag's shape picks the
 * axes), double-click or press the reset button to go back; wrap several in
 * `SharedXZoom` to move their x windows together. Which axes zoom depends on the marks
 * — see {@link SeriesChartProps.zoomAxes}.
 */
export function SeriesChart(props: SeriesChartProps) {
  // The zoom fits the PLOTTED rows — slot indices and epoch ms, not the caller's labels.
  return <ZoomablePlot {...plotProps(props)} />;
}
