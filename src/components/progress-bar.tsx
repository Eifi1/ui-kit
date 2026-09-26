import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLocale } from "../i18n/kit-labels";

/**
 * `income` / `expense` are the money pair (`--money-income` / `--money-expense`), the
 * names `Chip`, `StatTile` and `Sparkline` already use for them: a share bar of what
 * came in or went out is money, and painting it `success` / `warning` said "good" and
 * "careful" about a figure that is neither. keksdose's report meters (food-group-card,
 * drilldown-modal) sit beside amounts that are already in the money colours.
 */
export type ProgressBarTone =
  | "brand"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "income"
  | "expense";
/**
 * Track heights: `sm` 4px, `slim` 6px, `md` 8px, `lg` 12px. `slim` is a word and not a
 * letter because the letters are taken in order — an `xs` at 6px would be THICKER than
 * `sm` — and renaming `sm` would move every bar already on it. 6px is the Slider's
 * track and keksdose's hand-drawn meters (`h-1.5`, landing-visuals), for a bar under a
 * line of text where 8px outweighs the text.
 */
export type ProgressBarSize = "sm" | "slim" | "md" | "lg";

const FILL: Record<ProgressBarTone, string> = {
  brand: "bg-[var(--brand)]",
  neutral: "bg-[var(--text-muted)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  income: "bg-[var(--money-income)]",
  expense: "bg-[var(--money-expense)]",
};

const TRACK_HEIGHT: Record<ProgressBarSize, string> = { sm: "h-1", slim: "h-1.5", md: "h-2", lg: "h-3" };

// A segment with no tone of its own takes the next categorical chart colour, so a
// stacked bar of unnamed parts is still a set of tellable parts rather than one fill.
const SERIES_FILL = [
  "bg-[var(--chart-1)]",
  "bg-[var(--chart-2)]",
  "bg-[var(--chart-3)]",
  "bg-[var(--chart-4)]",
  "bg-[var(--chart-5)]",
  "bg-[var(--chart-6)]",
  "bg-[var(--chart-7)]",
  "bg-[var(--chart-8)]",
  "bg-[var(--chart-9)]",
];

/** A segment's fill classes: its own classes, else its tone, else (with no `color`)
 *  the next chart colour. */
function segmentFill(seg: ProgressBarSegment, index: number): string | undefined {
  if (seg.className) return seg.className;
  if (seg.tone) return FILL[seg.tone];
  return seg.color ? undefined : SERIES_FILL[index % SERIES_FILL.length];
}

/** One part of a stacked bar. See {@link ProgressBarProps.segments}. */
export interface ProgressBarSegment {
  /** Its size, on the bar's own `min`–`max` scale. */
  value: number;
  /** A kit tone. Left out (and no `color`/`className`), the next `--chart-N` colour. */
  tone?: ProgressBarTone;
  /** Any CSS colour (`var(--token)`), for a palette the tones do not cover. Wins over `tone`. */
  color?: string;
  /** Classes for the segment's fill — keksdose's `STEP_CLASS` ramp. Wins over `tone`. */
  className?: string;
  /** The part's name: said in the bar's `aria-valuetext` and shown in the legend. */
  label?: ReactNode;
  /** A stable React key, when `label` is not a string. */
  key?: string;
}

export interface ProgressBarProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "role"> {
  /** Where it stands. Leave it undefined for an INDETERMINATE bar — work is under way
   *  and nobody knows how much is left (an import that reports no count). */
  value?: number;
  min?: number;
  max?: number;
  /**
   * `progress` (default): a task moving toward completion — `role="progressbar"`.
   * `meter`: a share of a known whole that is not going anywhere (budget used, disk
   * space, one category's slice of spending) — `role="meter"`. keksdose's share bars
   * were progress bars to a screen reader, which reads "busy" into a figure that is
   * simply a figure. A meter is never indeterminate; a missing value reads as `min`.
   */
  variant?: "progress" | "meter";
  /** Visible label above the bar, and its accessible name. Without it, pass
   *  `aria-label` (an indeterminate bar with neither is named `common.loading`). */
  label?: ReactNode;
  /** Show the value text at the end of the label row. */
  showValue?: boolean;
  /**
   * The value as words — both the visible `showValue` text and `aria-valuetext`.
   * Default: the fraction as a percentage in the kit's locale ("42 %" in French).
   * Pass one for anything that is not a percentage: `(v, max) => \`${v} of ${max} files\``.
   */
  formatValue?: (value: number, max: number, min: number) => string;
  tone?: ProgressBarTone;
  size?: ProgressBarSize;
  locale?: string;
  /**
   * Draw a METER OF PARTS: one bar, several fills side by side in order, a 2px gap
   * between them — keksdose's discretionary-spending bar (cut-card:133), a whole
   * split into the steps of a scale. Forces `variant="meter"`: parts of a whole are
   * never "busy". `aria-valuenow` is the sum; `aria-valuetext` names every part
   * ("Rent: 40%, Food: 25%"), each part's value through `formatValue` and joined in the
   * kit's locale — the words keksdose's hand-drawn bar had to hide from a reader
   * altogether, leaving the legend as the only way in. The sum is clamped to `max`,
   * and parts past it are cut off at the track's end.
   */
  segments?: ProgressBarSegment[];
  /** With `segments`: a list under the bar naming each part with its swatch and value
   *  — the table view of the bar, in text tokens rather than the segment colour. */
  legend?: boolean;
}

/**
 * A horizontal bar that fills toward `max`.
 *
 * keksdose (import progress, budget share bars) and kastlan (upload and job
 * progress) each drew their own div-in-a-div. None had a role, so a reader heard
 * nothing at all; the share bars that did have one claimed to be progress.
 *
 * `aria-valuetext` is always set when there is a value: a bare `aria-valuenow="37"`
 * is read as "37" by some readers and "37 percent" by others, and neither is right
 * when `max` is 212 files.
 *
 * The indeterminate sweep stops under `prefers-reduced-motion`. It becomes a still,
 * half-strength bar across the whole track — still visibly "something is happening",
 * with nothing moving. The sweep is a Tailwind arbitrary `animate-[…]` rather than
 * tokens.css's `.animate-indeterminate` class because that one is UNLAYERED, and an
 * unlayered rule beats every layered utility, `motion-reduce:animate-none` included.
 */
export function ProgressBar({
  value,
  min = 0,
  max = 100,
  variant = "progress",
  label,
  showValue = false,
  formatValue,
  tone = "brand",
  size = "md",
  locale,
  segments,
  legend = false,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...rest
}: ProgressBarProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const kitLocale = useKitLocale(locale);
  const labelId = useId();

  const stacked = segments !== undefined;
  const meter = stacked || variant === "meter";
  const span = max - min;
  const partValue = (v: number) => (Number.isFinite(v) ? Math.max(0, v - min) : 0);
  const partTotal = stacked ? min + segments.reduce((sum, seg) => sum + partValue(seg.value), 0) : undefined;
  const format = (v: number) =>
    formatValue
      ? formatValue(v, max, min)
      : new Intl.NumberFormat(kitLocale, { style: "percent", maximumFractionDigits: 0 }).format(
          span <= 0 ? 0 : (Math.min(max, Math.max(min, v)) - min) / span,
        );
  const partTexts = stacked
    ? segments.map((seg) => {
        const text = format(min + partValue(seg.value));
        return typeof seg.label === "string" || typeof seg.label === "number"
          ? common.fieldValue(String(seg.label), text)
          : text;
      })
    : [];
  const current =
    partTotal ?? (value === undefined || !Number.isFinite(value) ? (meter ? min : undefined) : value);
  const indeterminate = current === undefined;
  const clamped = indeterminate ? undefined : Math.min(max, Math.max(min, current));
  const fraction = clamped === undefined || span <= 0 ? 0 : (clamped - min) / span;

  const valueText = clamped === undefined ? undefined : format(clamped);
  const ariaValueText =
    stacked && partTexts.length > 0
      ? new Intl.ListFormat(kitLocale, { style: "short", type: "unit" }).format(partTexts)
      : valueText;

  const labelledBy = ariaLabelledBy ?? (label != null ? labelId : undefined);
  const name = labelledBy ? undefined : (ariaLabel ?? (indeterminate ? common.loading : undefined));

  return (
    <div className={cn("min-w-0", className)} data-state={indeterminate ? "indeterminate" : "determinate"}>
      {(label != null || (showValue && valueText !== undefined)) && (
        <div className="mb-1 flex items-baseline gap-2 text-sm">
          {label != null && (
            <span id={labelId} className="min-w-0 text-[var(--text-secondary)]">
              {label}
            </span>
          )}
          {showValue && valueText !== undefined && (
            // Hidden: the same words are the bar's aria-valuetext, and reading them
            // twice in a row is noise.
            <span aria-hidden className="ms-auto shrink-0 tabular-nums text-[var(--text-muted)]">
              {valueText}
            </span>
          )}
        </div>
      )}
      <div
        {...rest}
        role={meter ? "meter" : "progressbar"}
        aria-label={name}
        aria-labelledby={labelledBy}
        aria-valuemin={indeterminate ? undefined : min}
        aria-valuemax={indeterminate ? undefined : max}
        aria-valuenow={clamped}
        aria-valuetext={ariaValueText}
        aria-busy={!meter && indeterminate ? true : undefined}
        // `relative` + `overflow-hidden`: the indeterminate segment is positioned in
        // here and must not paint past the rounded ends.
        className={cn("relative w-full overflow-hidden rounded-full bg-[var(--bg-active)]", TRACK_HEIGHT[size])}
      >
        {stacked ? (
          // The parts in a flex row with a 2px gap, so two neighbouring steps of one
          // hue are parted by the track rather than by their difference in lightness.
          <div className="flex h-full w-full gap-0.5">
            {segments.map((seg, i) => (
              <div
                key={seg.key ?? i}
                data-part="segment"
                className={cn(
                  "h-full shrink-0 rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                  segmentFill(seg, i),
                )}
                style={{
                  width: `${span <= 0 ? 0 : (partValue(seg.value) / span) * 100}%`,
                  backgroundColor: seg.className ? undefined : seg.color,
                }}
              />
            ))}
          </div>
        ) : indeterminate ? (
          <div
            data-part="fill"
            className={cn(
              // `left-0`, deliberately physical: the keyframes (tokens.css
              // `indeterminate-sweep`) translate along the physical x axis, and under
              // RTL the same keyframes are run in REVERSE — from the right edge back
              // to the left. A logical `start-0` would park the segment at the right
              // in RTL and the reversed sweep would then start off-screen.
              "absolute inset-y-0 left-0 w-1/3 rounded-full",
              "animate-[indeterminate-sweep_1.4s_ease-in-out_infinite] rtl:[animation-direction:reverse]",
              "motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-50",
              FILL[tone],
            )}
          />
        ) : (
          <div
            data-part="fill"
            // Block flow starts at the inline start, so a plain width fills from the
            // right under `dir="rtl"` with nothing extra.
            className={cn("h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none", FILL[tone])}
            style={{ width: `${fraction * 100}%` }}
          />
        )}
      </div>
      {stacked && legend && segments.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm" data-part="legend">
          {segments.map((seg, i) => (
            <li key={seg.key ?? i} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 shrink-0 rounded-sm",
                  segmentFill(seg, i),
                )}
                style={{ backgroundColor: seg.className ? undefined : seg.color }}
              />
              {seg.label != null && (
                <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">{seg.label}</span>
              )}
              <span className="ms-auto shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                {format(min + partValue(seg.value))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
