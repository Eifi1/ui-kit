// The series chart's pure half: the axis bands, the padded and anchored domains, the
// series keys and colours, and the abscissa reduced to a number line. No React, no
// recharts and no JSX here (chart-zoom lends the one name `DEFAULT_Y_AXIS`) —
// arithmetic over rows and axes, which is why apps import some of it in
// files that draw no chart (Kurvenschmiede's curve-chart-model.ts builds its series
// keys with `seriesKey`).
//
// Moved out of series-chart.tsx as it was (MOD-9, refactor audit 2026-10). The public
// names are still exported from series-chart.tsx, so `/chart` and the barrel are
// unchanged; this module is not an entry of its own. The names below that series-chart
// does not re-export (the tick-band constants, `xModel`, `finite`, …) stay internal.
import { DEFAULT_Y_AXIS } from "./chart-zoom";
import type { TimeTickUnit } from "./series-chart-ticks";
import { paletteFor } from "../theme/chart-palette";
import type {
  SeriesChartAxis,
  SeriesChartRow,
  SeriesChartSeries,
  SeriesChartTickValues,
  SeriesChartX,
  SeriesChartXValue,
} from "./series-chart";

/** How much of an axis band the rotated title takes, in px at Normal — × the text size's
 *  scale on the chart (§3.2), since the title is text. Reserved rather than shared with
 *  the ticks: a title merely offset inside the band prints on top of a five-figure tick,
 *  and which gives way depends on the data. */
export const AXIS_TITLE_STRIP = 16;

/** Where inside its strip the rotated title sits. */
export const AXIS_TITLE_OFFSET = 10;

/** The tallest band tilted x ticks reserve, in px at Normal (× the scale). A category
 *  name longer than this at its angle is clipped rather than squeezing the plot down to
 *  a strip. */
const MAX_TILTED_TICK_BAND = 120;

/** What one character of a tick label is taken to be, in px at Normal, for the tilted
 *  band — the shell's `text-xs`. An estimate: the SVG is not laid out yet when the band
 *  is decided. Both grow with the text size, as `text-xs` does (§3.2). */
const TICK_CHAR_WIDTH = 7;
const TICK_LINE_HEIGHT = 12;
/** recharts' gap between the axis line and a bottom tick's text — px, at every size:
 *  recharts draws it, not the type. */
const TICK_GAP = 8;
/** recharts' own band under level x ticks. */
const LEVEL_TICK_BAND = 30;
/** The least room recharts' x ticks keep between labels, in px at Normal. */
export const MIN_TICK_GAP = 32;

/**
 * The height the x axis reserves for its ticks at a text `scale`: tilted by `angle`
 * degrees, the rotated box of the longest label, from its length; level, recharts' own
 * 30 px grown with the labels. `undefined` for level ticks at Normal, where recharts'
 * default is exactly that.
 */
export function tiltedTickBand(labels: readonly string[], angle: number, scale = 1): number | undefined {
  if (!angle) return scale === 1 ? undefined : Math.ceil(LEVEL_TICK_BAND * scale);
  const rad = (Math.abs(angle) * Math.PI) / 180;
  const longest = Math.max(0, ...labels.map((label) => label.length)) * TICK_CHAR_WIDTH * scale;
  const band = Math.sin(rad) * longest + Math.cos(rad) * TICK_LINE_HEIGHT * scale + TICK_GAP;
  return Math.min(Math.round(MAX_TILTED_TICK_BAND * scale), Math.max(Math.ceil(LEVEL_TICK_BAND * scale), Math.ceil(band)));
}

/** The width the ticks of a y axis get when a caller does not say, in px at Normal. */
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

/**
 * The whole band a y axis occupies: its ticks, and its title when it draws one. For
 * lining a heading up over a PLOT rather than over its column.
 *
 * `scale` is the text size's (`useTextSize().scale`, §3.2, §10.10): the chart draws every
 * band — the default 48 px and a caller's own `width` alike (keksdose's
 * `MONEY_AXIS_WIDTH`) — this many times wider, because the ticks in it are `text-xs`
 * and grow with the text. A heading lined up over the plot has to pass the same scale.
 * One factor for both sides of a facing pair, so the mirrored bands stay equal.
 */
export function axisBandWidth(tickWidth: number | undefined, titled: boolean, scale = 1): number {
  const band = (tickWidth ?? AXIS_TICK_WIDTH) + (titled ? AXIS_TITLE_STRIP : 0);
  return scale === 1 ? band : Math.round(band * scale);
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
  axis: Pick<SeriesChartAxis, "id" | "color">,
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

/** Where a category or time chart keeps each row's plotted position. Not the caller's
 *  key: that one still holds their own value, which `format` and a hit hand back. */
const PLOTTED_X = "__seriesChartX";

/** A finite number, or `undefined` — the only thing a row cell counts as a sample. */
export const finite = (value: unknown): number | undefined =>
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
export interface XModel {
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

export function xModel(rows: readonly SeriesChartRow[], x: SeriesChartX): XModel {
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
export function resolveTicks<T>(
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
export function extend(
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
export const TIME_TICK_FORMAT: Record<TimeTickUnit, Intl.DateTimeFormatOptions> = {
  hour: { hour: "2-digit", minute: "2-digit" },
  day: { day: "numeric", month: "short" },
  month: { month: "short", year: "2-digit" },
  year: { year: "numeric" },
};
