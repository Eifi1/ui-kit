// A legend whose entries are SWITCHES — and the stroke table it shares with
// `SeriesChart`. Lifted out of lenkbank's measurement plots, where ten legends over
// thirteen charts took channels on and off the picture.
//
// No recharts in this module: a legend of switches is plain buttons, and it is as
// useful under a chart the consumer drew by hand as under `SeriesChart`.
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { DEFAULT_SERIES_CHART_LABELS, type SeriesChartLabels } from "./series-chart-labels";

/**
 * The strokes a reader can tell apart, in the order they are handed out.
 *
 * For the charts where the colour is already spoken for: a comparison draws each
 * measurement in its own colour, so a chart carrying several CHANNELS of each has
 * nothing left but the stroke — and "solid versus dashed" only gets you two.
 *
 * **Five, and the fifth is the last one.** They are the draughtsman's line types, in
 * the draughtsman's order — continuous, dashed, dotted, dash-dot, dash-dot-dot — the
 * one family of five a century of drawings has already proved legible at a hair's
 * width. A sixth is not distinguishable from one of these at two pixels wide, so a
 * chart needing one is a chart that should be split.
 *
 * Kept here, beside the legend's own mark, and read by `SeriesChart` from here — so
 * the key under a chart and the lines on it cannot disagree.
 */
export const STROKE_PATTERNS: readonly (string | undefined)[] = [
  undefined,
  "5 4",
  "1 3",
  "9 3 2 3",
  "9 3 2 3 2 3",
];

/** The dash array for the nth pattern, wrapping past the fifth. */
export function strokeDash(order: number): string | undefined {
  const n = STROKE_PATTERNS.length;
  return STROKE_PATTERNS[((Math.trunc(order) % n) + n) % n];
}

/** Which of the patterns a `step` series is drawn in.
 *
 *  A whole-number channel that jumps rather than travels is drawn dashed, and it has
 *  to be one of {@link STROKE_PATTERNS} rather than a dash array written out at the
 *  call site: a legend entry says its pattern by index, so a step line drawn in
 *  anything else would be a legend promising a solid line for a dashed one. */
export const STEP_DASH = 1;

/**
 * One key switched, as a new hidden set.
 *
 * Every caller writes `onToggle={(key) => setHidden(toggleHidden(hidden, key))}`. A
 * new set rather than a mutated one, because the state is read during render and a
 * mutation of something a component already holds is invisible to React.
 */
export function toggleHidden(hidden: ReadonlySet<string>, key: string): ReadonlySet<string> {
  const next = new Set(hidden);
  if (!next.delete(key)) next.add(key);
  return next;
}

export interface LegendEntry {
  key: string;
  label: ReactNode;
  /** Any CSS colour — `paletteFor(i)` for the kit's own ramp. */
  color: string;
  /**
   * What the entry's mark looks like. `swatch` — a filled square, the default — says
   * WHICH MEASUREMENT. `stroke` says WHICH QUANTITY, for the charts that carry both at
   * once and tell them apart by colour and by dash.
   */
  marker?: "swatch" | "stroke";
  /** Which of {@link STROKE_PATTERNS}, when the marker is a stroke — the same index
   *  `SeriesChartSeries.dash` takes, so a legend cannot promise a dot-dash the plot
   *  draws dashed. */
  dash?: number;
}

export interface ToggleLegendProps {
  entries: LegendEntry[];
  /** The keys currently off the chart. */
  hidden: ReadonlySet<string>;
  onToggle: (key: string) => void;
  /** `vertical` is for a legend standing BESIDE the charts rather than under them —
   *  what a row of charts sharing one legend wants, since under two charts there is
   *  no "under", and putting it under one says it belongs to that one. */
  orientation?: "horizontal" | "vertical";
  /**
   * Draw a legend of ONE entry rather than nothing.
   *
   * A single line's legend is usually noise. It is not where the legend is the only
   * SWITCH that line has — a series that starts hidden and has no entry to bring it
   * back is gone for good.
   */
  showSingle?: boolean;
  className?: string;
  /** Per-instance strings over `<UiKitProvider labels={{ seriesChart }}>`. */
  labels?: Partial<SeriesChartLabels>;
}

/**
 * A legend whose entries are switches.
 *
 * `ChartLegendContent` with `onItemClick`/`activeKey` is the other kind: clicking an
 * entry HIGHLIGHTS it and dims the rest, which is right when every series belongs on
 * the chart and one of them is momentarily interesting. This is for the opposite —
 * three coordinates on one axis where y runs to 800 and z barely moves, and the only
 * way to see z is to take y off the chart entirely. Any number may be off at once.
 *
 * A hidden entry keeps its mark and its place. Removing it would reflow the legend on
 * every click and lose the one thing it is for: saying what COULD be shown.
 *
 * Each entry is a real `<button>` with `aria-pressed` — pressed means "on the chart" —
 * so Tab reaches every switch and Space/Enter flips it.
 */
export function ToggleLegend({
  entries,
  hidden,
  onToggle,
  orientation = "horizontal",
  showSingle = false,
  className,
  labels: labelsProp,
}: ToggleLegendProps) {
  const labels = useKitLabels("seriesChart", DEFAULT_SERIES_CHART_LABELS, labelsProp);
  if (entries.length < (showSingle ? 1 : 2)) return null;
  return (
    <div
      role="group"
      aria-label={labels.legend}
      className={cn(
        "flex gap-x-3 gap-y-1",
        orientation === "vertical"
          ? "flex-col items-start justify-center"
          : "mt-2 flex-wrap items-center",
        className,
      )}
    >
      {entries.map((entry) => {
        const off = hidden.has(entry.key);
        return (
          <button
            key={entry.key}
            type="button"
            // Pressed rather than a checkbox: it is a control over what the chart
            // draws, and "not pressed" is the same sentence the dimmed mark says.
            aria-pressed={!off}
            onClick={() => onToggle(entry.key)}
            className={cn(
              "flex items-center gap-1.5 rounded text-start text-[11px] text-[var(--text-secondary)] transition-opacity hover:opacity-80",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
              off && "opacity-35",
            )}
          >
            <LegendMark entry={entry} off={off} />
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The column a vertical legend stands in: beside the charts, on their horizontal
 * centre line. `h-full` + `justify-center`, so it centres in a grid cell or a flex row
 * that stretches it — and stacks whatever it is given, which is what a panel showing
 * two legends at once needs. The width is the caller's: how wide a legend column is
 * is a fact about that screen's layout.
 */
export function LegendColumn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-full flex-col justify-center gap-3", className)}>{children}</div>
  );
}

/**
 * A legend and what it is a legend OF, as a headed column.
 *
 * For legends that are several vocabularies at once — which measurement and which
 * channel — so the entries are read down a group and the groups across. Wrapped rows
 * would put the second half of one group on a line under the first half of the next.
 */
export function LegendGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </span>
      <div className="flex flex-col items-start gap-y-0.5">{children}</div>
    </div>
  );
}

/** The entry's mark: a square for a measurement, a stroke for a quantity. A hidden one
 *  keeps its outline — a mark that vanished would leave a line of text with nothing in
 *  front of it.
 *
 *  A stroke is an SVG line with the chart's own `strokeDasharray`, not a CSS gradient
 *  approximating it: a gradient can say "solid or dashed" and nothing more.
 *
 *  A hidden stroke is NOT faded here: the button around it already is (`opacity-35`),
 *  and the line used to take its own 0.35 on top — 0.35 × 0.35, about 12 %, a mark
 *  gone rather than dimmed, while the square beside it read at the full 35 %. */
function LegendMark({ entry, off }: { entry: LegendEntry; off: boolean }) {
  if (entry.marker === "stroke") {
    return (
      <svg aria-hidden viewBox="0 0 20 2" className="h-0.5 w-5 shrink-0 overflow-visible">
        <line
          x1={0}
          y1={1}
          x2={20}
          y2={1}
          stroke={entry.color}
          strokeWidth={2}
          strokeDasharray={strokeDash(entry.dash ?? 0)}
        />
      </svg>
    );
  }
  return (
    <span
      aria-hidden
      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
      style={{
        backgroundColor: off ? "transparent" : entry.color,
        boxShadow: `inset 0 0 0 1.5px ${entry.color}`,
      }}
    />
  );
}
