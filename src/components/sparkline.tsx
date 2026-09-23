import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";

/**
 * The words a sparkline speaks. It has no axes, no tooltip and no legend, so its
 * accessible name is the ONLY way a screen reader learns what the shape says —
 * "Sparkline, image" is not a summary. Each message takes the values already
 * formatted, so the digits follow the locale and the sentence stays translatable.
 */
export interface SparklineLabels {
  /** Last value above the first: "Rising from 12 to 40". */
  rising: (first: string, last: string) => string;
  /** Last value below the first. */
  falling: (first: string, last: string) => string;
  /** First and last are equal — the shape may still have moved in between. */
  flat: (value: string) => string;
  /** One value is a dot, not a trend. */
  single: (value: string) => string;
  /** No value at all (empty, or every point a gap). */
  noData: string;
  /** How the series' own name is joined to the summary when `label` is given. */
  named: (name: string, summary: string) => string;
}

export const DEFAULT_SPARKLINE_LABELS: SparklineLabels = {
  rising: (first, last) => `Rising from ${first} to ${last}`,
  falling: (first, last) => `Falling from ${first} to ${last}`,
  flat: (value) => `Unchanged at ${value}`,
  single: (value) => `One value: ${value}`,
  noData: "No data",
  named: (name, summary) => `${name}: ${summary}`,
};

/**
 * What colours the marks. Token names, not colours: every one resolves to a variable
 * in tokens.css, so the sparkline re-skins with the palette like everything else.
 *
 *  - `chart` — the first series colour (`--chart-1`), the default.
 *  - `income` / `expense` / `net` — the money trio.
 *  - `signed` — a money series read by sign: bars each take income or expense by their
 *    own value, a line or area takes the colour of its LAST value (where it ended up).
 */
export type SparklineTone =
  | "chart"
  | "brand"
  | "muted"
  | "income"
  | "expense"
  | "net"
  | "signed"
  | "success"
  | "warning"
  | "danger"
  | "info";

// `color`, not `stroke`/`fill`: every mark paints with `currentColor`, so one class
// per element is enough and a signed bar chart needs no second lookup table.
const TONE_CLASS: Record<Exclude<SparklineTone, "signed">, string> = {
  chart: "text-[var(--chart-1)]",
  brand: "text-[var(--brand)]",
  muted: "text-[var(--text-muted)]",
  income: "text-[var(--money-income)]",
  expense: "text-[var(--money-expense)]",
  net: "text-[var(--money-net)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
  info: "text-[var(--info)]",
};

const signedClass = (v: number) => (v < 0 ? TONE_CLASS.expense : TONE_CLASS.income);

/** `children` is the marks and `width`/`height` are numbers here (or `fluid`), so
 *  those three are the sparkline's own; everything else lands on the `<svg>`. */
export interface SparklineProps
  extends Omit<ComponentPropsWithoutRef<"svg">, "children" | "width" | "height"> {
  /** The series, oldest first. `null`/`undefined`/`NaN` is a GAP — the line breaks
   *  there rather than drawing a zero or bridging across the missing point. */
  data: ReadonlyArray<number | null | undefined>;
  /** Width in px. Ignored under `fluid`. */
  width?: number;
  height?: number;
  /** Fill the container's width instead of a fixed one (the height stays fixed). */
  fluid?: boolean;
  variant?: "line" | "area" | "bar";
  tone?: SparklineTone;
  /** Lower / upper end of the scale. Unset, the scale is the data's own tight range
   *  (bars always include zero, since a bar's length IS its value). */
  min?: number;
  max?: number;
  /** A dashed hairline at this value, e.g. `0` for a series that crosses zero, or a
   *  target. It is pulled into the scale unless `min`/`max` exclude it. */
  referenceValue?: number;
  /** Dot on the last point (line/area) or dim every bar but the last. Default true —
   *  the last value is the one the number beside a sparkline almost always is. */
  highlightLast?: boolean;
  strokeWidth?: number;
  /** What the series is ("Price"), prefixed to the spoken summary. */
  label?: string;
  /** How a value is spoken in the summary. Defaults to `Intl.NumberFormat` in the
   *  kit's locale, at most two decimals. */
  formatValue?: (value: number) => string;
  locale?: string;
  labels?: Partial<SparklineLabels>;
}

const DEFAULT_WIDTH = 72;
const DEFAULT_HEIGHT = 24;

// One formatter per locale, not per render: a sparkline is a table-cell component and
// a hundred rows would otherwise build a hundred identical `Intl.NumberFormat`s.
const formatters = new Map<string, Intl.NumberFormat>();
function defaultFormat(locale: string | undefined): (v: number) => string {
  const key = locale ?? "";
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    formatters.set(key, f);
  }
  return (v) => f.format(v);
}

const isValue = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/** The spoken summary, without the series name. Exported for callers that want the
 *  same sentence elsewhere (a table's row description, a tooltip). */
export function sparklineSummary(
  data: ReadonlyArray<number | null | undefined>,
  labels: SparklineLabels,
  format: (value: number) => string,
): string {
  const values = data.filter(isValue);
  if (values.length === 0) return labels.noData;
  const first = values[0];
  const last = values[values.length - 1];
  if (values.length === 1) return labels.single(format(last));
  if (last > first) return labels.rising(format(first), format(last));
  if (last < first) return labels.falling(format(first), format(last));
  return labels.flat(format(last));
}

/**
 * A tiny trend line: shape only — no axes, no tooltip, no legend, no chart library.
 *
 * It is plain SVG on purpose. The two copies it replaces were recharts `LineChart`s,
 * which is a ResizeObserver, a React tree of a dozen components and a 433 KB import
 * per table cell; a sparkline is one `<path>`, cheap enough for every row of a table
 * and small enough to live on the main barrel rather than behind `/chart`.
 *
 * The scale is TIGHT by default (the data's own min to max). A price that moved from
 * 9.75 to 12.40 drawn against an implicit zero baseline is a nearly flat line at the
 * top of the box — the one thing a shape-only chart must not do (keksdose dev#449).
 * Bars are the exception: a bar's length is its value, so their scale includes zero.
 *
 * `role="img"` with a generated summary ("Rising from 12 to 40") as its name — the
 * numbers beside it are the values, the sparkline says which way they have moved.
 *
 * Under `fluid` the SVG is stretched non-uniformly to the container's width, so every
 * stroke is `non-scaling-stroke` and the last-point dot is a zero-length ROUND-CAPPED
 * stroke rather than a `<circle>`: a stroke keeps its width under that transform,
 * where a circle would be squashed into an ellipse.
 */
export function Sparkline({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  fluid = false,
  variant = "line",
  tone = "chart",
  min,
  max,
  referenceValue,
  highlightLast = true,
  strokeWidth = 1.5,
  label,
  formatValue,
  locale,
  labels,
  className,
  style,
  ...rest
}: SparklineProps) {
  const text = useKitLabels("sparkline", DEFAULT_SPARKLINE_LABELS, labels);
  const kitLocale = useKitLocale(locale);
  const format = formatValue ?? defaultFormat(kitLocale);

  const summary = sparklineSummary(data, text, format);
  const name = label ? text.named(label, summary) : summary;

  const W = width;
  const H = height;
  const points = data.map((v) => (isValue(v) ? v : null));
  const values = points.filter(isValue);
  const n = points.length;

  // ── Scale ──
  const bounds = [...values];
  if (referenceValue !== undefined && isValue(referenceValue)) bounds.push(referenceValue);
  if (variant === "bar") bounds.push(0);
  let lo = min ?? (bounds.length ? Math.min(...bounds) : 0);
  let hi = max ?? (bounds.length ? Math.max(...bounds) : 1);
  if (hi === lo) {
    // A constant series: centre it rather than divide by zero.
    lo -= 1;
    hi += 1;
  }
  const dot = strokeWidth + 1.5;
  const pad = highlightLast && variant !== "bar" ? dot : strokeWidth / 2;
  const clamp = (v: number) => Math.min(hi, Math.max(lo, v));
  const y = (v: number) => pad + ((hi - clamp(v)) / (hi - lo)) * (H - 2 * pad);
  const x = (i: number) => (n <= 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1));
  const r = (v: number) => Math.round(v * 100) / 100;

  // Last DEFINED point — the series may well end in a gap. (No `findLastIndex`: the
  // package targets ES2022.)
  let lastIndex = -1;
  for (let i = n - 1; i >= 0 && lastIndex < 0; i -= 1) if (points[i] !== null) lastIndex = i;
  const lastValue = lastIndex >= 0 ? (points[lastIndex] ?? 0) : 0;
  const lineClass = tone === "signed" ? signedClass(lastValue) : TONE_CLASS[tone];

  // Contiguous runs between gaps. A run of one point is drawn as a dot, so a value
  // isolated between two gaps is still visible.
  const runs: Array<Array<[number, number]>> = [];
  let run: Array<[number, number]> = [];
  points.forEach((v, i) => {
    if (v === null) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push([i, v]);
    }
  });
  if (run.length) runs.push(run);

  const linePath = (seg: Array<[number, number]>) =>
    seg.map(([i, v], k) => `${k === 0 ? "M" : "L"}${r(x(i))} ${r(y(v))}`).join(" ");
  const dotPath = (i: number, v: number) => `M${r(x(i))} ${r(y(v))} h0`;
  // The area closes to zero when zero is on the scale, else to the bottom edge.
  const areaBase = y(lo <= 0 && hi >= 0 ? 0 : lo);

  const STROKE = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    vectorEffect: "non-scaling-stroke",
  } as const;

  return (
    <svg
      role="img"
      aria-label={name}
      {...rest}
      width={fluid ? "100%" : W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn(fluid ? "block w-full" : "inline-block shrink-0 align-middle", "overflow-visible", className)}
      style={style}
    >
      {referenceValue !== undefined && isValue(referenceValue) && referenceValue >= lo && referenceValue <= hi && (
        <path
          d={`M0 ${r(y(referenceValue))} H${W}`}
          {...STROKE}
          strokeWidth={1}
          strokeDasharray="2 2"
          className="text-[var(--border-strong)]"
        />
      )}

      {variant === "bar"
        ? (() => {
            const slot = W / Math.max(n, 1);
            const bw = Math.max(1, slot * 0.7);
            const base = y(0);
            return points.map((v, i) => {
              if (v === null) return null;
              const top = Math.min(y(v), base);
              return (
                <rect
                  key={i}
                  x={r(i * slot + (slot - bw) / 2)}
                  y={r(top)}
                  width={r(bw)}
                  height={r(Math.abs(y(v) - base))}
                  fill="currentColor"
                  opacity={highlightLast && i !== lastIndex ? 0.55 : 1}
                  className={tone === "signed" ? signedClass(v) : TONE_CLASS[tone]}
                />
              );
            });
          })()
        : runs.map((seg, k) =>
            seg.length === 1 ? (
              <path
                key={k}
                d={dotPath(seg[0][0], seg[0][1])}
                {...STROKE}
                strokeWidth={strokeWidth * 2}
                className={lineClass}
              />
            ) : (
              <g key={k} className={lineClass}>
                {variant === "area" && (
                  <path
                    d={`${linePath(seg)} L${r(x(seg[seg.length - 1][0]))} ${r(areaBase)} L${r(x(seg[0][0]))} ${r(areaBase)} Z`}
                    fill="currentColor"
                    fillOpacity={0.15}
                    stroke="none"
                  />
                )}
                <path d={linePath(seg)} {...STROKE} strokeWidth={strokeWidth} />
              </g>
            ),
          )}

      {highlightLast && variant !== "bar" && lastIndex >= 0 && (
        <path
          d={dotPath(lastIndex, lastValue)}
          {...STROKE}
          strokeWidth={dot * 2 - 1}
          className={lineClass}
          data-sparkline-last=""
        />
      )}
    </svg>
  );
}
