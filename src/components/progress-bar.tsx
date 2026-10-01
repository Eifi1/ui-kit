import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLocale } from "../i18n/kit-labels";

/** The words a progress bar adds of its own. */
export interface ProgressBarLabels {
  /** Shown after the value when `max={null}`: a quota with no ceiling. */
  unlimited: string;
  /** The `overage` line: how far past `max` the value is. `amount` is formatted. */
  overLimit: (amount: string) => string;
}

export const DEFAULT_PROGRESS_BAR_LABELS: ProgressBarLabels = {
  unlimited: "Unlimited",
  overLimit: (amount) => `${amount} over the limit`,
};

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

/** Each segment's fill classes: its own classes, else its tone, else (with no `color`)
 *  the next chart colour. "Next" counts the UNCOLOURED segments only — a segment with
 *  its own `className`/`tone`/`color` does not use up `--chart-1`, so an "Other" in grey
 *  ahead of two plain parts leaves them `--chart-1` and `--chart-2`. */
function segmentFills(segments: ProgressBarSegment[]): Array<string | undefined> {
  let next = 0;
  return segments.map((seg) => {
    if (seg.className) return seg.className;
    if (seg.tone) return FILL[seg.tone];
    return seg.color ? undefined : SERIES_FILL[next++ % SERIES_FILL.length];
  });
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
  /**
   * List it in the `legend` but leave it out of the bar — its value, its share of the
   * `aria-valuetext`, and the sum. keksdose's cut card (reports/cut-card:132) names
   * EVERY bucket under its bar, the empty ones included, while the bar draws only the
   * ones with a share: pass the empty buckets as `legendOnly` entries.
   */
  legendOnly?: boolean;
}

export interface ProgressBarProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "role"> {
  /**
   * `"span"` builds the bar from spans, for a place only phrasing content may go: inside
   * a button or a link (ListItem's `content`). The `legend` stays a list, so leave it off
   * there. Default `"div"`.
   */
  as?: "div" | "span";
  /** Where it stands. Leave it undefined for an INDETERMINATE bar — work is under way
   *  and nobody knows how much is left (an import that reports no count). */
  value?: number;
  min?: number;
  /**
   * The top of the scale (default 100). `null` is a quota with NO ceiling — kastlan's
   * billing usage on an unlimited plan (usage-progress-bar:25): nothing to fill, so no
   * bar is drawn; the label row shows the value and "Unlimited" (`progressBar.unlimited`)
   * as plain text. `formatValue` is then called with `max` = `Infinity`; without it,
   * the value is a plain number in the kit's locale.
   */
  max?: number | null;
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
  /**
   * What a legend row shows at its end, in place of the part's formatted value — which
   * it is handed, with the segment and its index. That value is the part's OWN, signed
   * and unclamped (`formatValue`, or a percentage of the scale): a part of −40 on a
   * 0–100 scale says "-40%" though the bar draws nothing for it. keksdose's cut card
   * shows the share AND a private outflow amount per bucket (cut-card:150), which one
   * figure could not:
   * `legendValue={(seg, share) => <>{share} <Amount … /></>}`.
   */
  legendValue?: (segment: ProgressBarSegment, formatted: string, index: number) => ReactNode;
  /** A muted line under the bar — the plan's reset date, "3 of 5 seats in use". It
   *  describes the bar (`aria-describedby`). */
  hint?: ReactNode;
  /**
   * When `value` is past `max`, say by how much, in a danger-coloured line under the bar
   * (kastlan usage-progress-bar:46): `true` prints `progressBar.overLimit` with the
   * excess as a plain number; a function renders the line itself from the excess (a
   * currency, "2 seats"). The bar stays full at `max` either way — colour it with
   * `tone="danger"` if it should read as over. Ignored for `segments` and `max={null}`.
   */
  overage?: boolean | ((over: number) => ReactNode);
  labels?: Partial<ProgressBarLabels>;
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
  max: maxProp = 100,
  variant = "progress",
  label,
  showValue = false,
  formatValue,
  tone = "brand",
  size = "md",
  locale,
  segments,
  legend = false,
  legendValue,
  hint,
  overage,
  labels,
  className,
  as = "div",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: ProgressBarProps) {
  // `as="span"`: the same bar from phrasing elements only, so it is valid inside a
  // <button> or <a> — ListItem's `content` puts a budget bar inside the row's target
  // (keksdose P2). Every span is made a block except those already laid out as flex.
  const Tag = as;
  const inlineClass = as === "span" ? "block [&_span:not(.flex):not(.inline-flex)]:block" : undefined;
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const text = useKitLabels("progressBar", DEFAULT_PROGRESS_BAR_LABELS, labels);
  const kitLocale = useKitLocale(locale);
  const labelId = useId();
  const hintId = useId();
  const hintNode =
    hint != null ? (
      <p id={hintId} data-part="hint" className="mt-1 text-xs text-[var(--text-muted)]">
        {hint}
      </p>
    ) : null;

  if (maxProp === null) {
    // No ceiling: no bar, no role — a meter with no maximum is not one. The value and
    // "Unlimited" are the content, so they are plain visible text.
    const shown =
      value === undefined || !Number.isFinite(value)
        ? undefined
        : formatValue
          ? formatValue(value, Infinity, min)
          : new Intl.NumberFormat(kitLocale).format(value);
    return (
      <Tag {...rest} className={cn("min-w-0", inlineClass, className)} data-state="unlimited">
        <Tag className="flex items-baseline gap-2 text-sm">
          {label != null && (
            <span id={labelId} className="min-w-0 text-[var(--text-secondary)]">
              {label}
            </span>
          )}
          <span data-part="unlimited" className="ms-auto shrink-0 tabular-nums text-[var(--text-muted)]">
            {shown !== undefined && `${shown} · `}
            {text.unlimited}
          </span>
        </Tag>
        {hintNode}
      </Tag>
    );
  }
  const max = maxProp;

  const stacked = segments !== undefined;
  const meter = stacked || variant === "meter";
  const span = max - min;
  const partValue = (v: number) => (Number.isFinite(v) ? Math.max(0, v - min) : 0);
  // Colours are dealt over EVERY segment, legend-only ones included, so an entry keeps
  // its swatch whether or not it is in the bar this time.
  const fills = stacked ? segmentFills(segments) : [];
  const barParts = stacked ? segments.filter((seg) => !seg.legendOnly) : [];
  const partTotal = stacked ? min + barParts.reduce((sum, seg) => sum + partValue(seg.value), 0) : undefined;
  const format = (v: number) =>
    formatValue
      ? formatValue(v, max, min)
      : new Intl.NumberFormat(kitLocale, { style: "percent", maximumFractionDigits: 0 }).format(
          span <= 0 ? 0 : (Math.min(max, Math.max(min, v)) - min) / span,
        );
  // A PART is stated as its own value, sign and all — not as the slice of track it
  // draws. The bar cannot draw a negative part (a refund inside a month's spending) or
  // one past `max`, but the legend and the reader can still say it: before 0.16 a
  // −CHF 40 part read "0 %" in both, and keksdose had to pass `legendValue` just to get
  // the minus back. For a part inside `min`–`max` this is the same text as before.
  const formatPart = (v: number) => {
    if (!Number.isFinite(v)) return format(min);
    if (formatValue) return formatValue(v, max, min);
    return new Intl.NumberFormat(kitLocale, { style: "percent", maximumFractionDigits: 0 }).format(
      span <= 0 ? 0 : (v - min) / span,
    );
  };
  const partTexts = stacked
    ? barParts.map((seg) => {
        const text = formatPart(seg.value);
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

  const over =
    overage && !stacked && value !== undefined && Number.isFinite(value) && value > max ? value - max : 0;
  const overageNode =
    over > 0 ? (
      <p id={`${hintId}-over`} data-part="overage" className="mt-1 text-xs text-[var(--danger)]">
        {typeof overage === "function"
          ? overage(over)
          : text.overLimit(new Intl.NumberFormat(kitLocale).format(over))}
      </p>
    ) : null;
  const describedBy =
    [ariaDescribedBy, hintNode && hintId, overageNode && `${hintId}-over`].filter(Boolean).join(" ") || undefined;

  const labelledBy = ariaLabelledBy ?? (label != null ? labelId : undefined);
  const name = labelledBy ? undefined : (ariaLabel ?? (indeterminate ? common.loading : undefined));

  return (
    <Tag className={cn("min-w-0", inlineClass, className)} data-state={indeterminate ? "indeterminate" : "determinate"}>
      {(label != null || (showValue && valueText !== undefined)) && (
        <Tag className="mb-1 flex items-baseline gap-2 text-sm">
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
        </Tag>
      )}
      <Tag
        {...rest}
        role={meter ? "meter" : "progressbar"}
        aria-label={name}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
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
          <Tag className="flex h-full w-full gap-0.5">
            {segments.map((seg, i) =>
              seg.legendOnly ? null : (
                <Tag
                  key={seg.key ?? i}
                  data-part="segment"
                  className={cn(
                    "h-full shrink-0 rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                    fills[i],
                  )}
                  style={{
                    width: `${span <= 0 ? 0 : (partValue(seg.value) / span) * 100}%`,
                    backgroundColor: seg.className ? undefined : seg.color,
                  }}
                />
              ),
            )}
          </Tag>
        ) : indeterminate ? (
          <Tag
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
          <Tag
            data-part="fill"
            // Block flow starts at the inline start, so a plain width fills from the
            // right under `dir="rtl"` with nothing extra.
            className={cn("h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none", FILL[tone])}
            style={{ width: `${fraction * 100}%` }}
          />
        )}
      </Tag>
      {stacked && legend && segments.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm" data-part="legend">
          {segments.map((seg, i) => (
            <li key={seg.key ?? i} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 shrink-0 rounded-sm",
                  fills[i],
                )}
                style={{ backgroundColor: seg.className ? undefined : seg.color }}
              />
              {seg.label != null && (
                <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">{seg.label}</span>
              )}
              <span className="ms-auto shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                {legendValue ? legendValue(seg, formatPart(seg.value), i) : formatPart(seg.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {overageNode}
      {hintNode}
    </Tag>
  );
}
