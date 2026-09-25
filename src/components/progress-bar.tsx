import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLocale } from "../i18n/kit-labels";

export type ProgressBarTone = "brand" | "neutral" | "success" | "warning" | "danger" | "info";
export type ProgressBarSize = "sm" | "md" | "lg";

const FILL: Record<ProgressBarTone, string> = {
  brand: "bg-[var(--brand)]",
  neutral: "bg-[var(--text-muted)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
};

const TRACK_HEIGHT: Record<ProgressBarSize, string> = { sm: "h-1", md: "h-2", lg: "h-3" };

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
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...rest
}: ProgressBarProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const kitLocale = useKitLocale(locale);
  const labelId = useId();

  const meter = variant === "meter";
  const current = value === undefined || !Number.isFinite(value) ? (meter ? min : undefined) : value;
  const indeterminate = current === undefined;
  const span = max - min;
  const clamped = indeterminate ? undefined : Math.min(max, Math.max(min, current));
  const fraction = clamped === undefined || span <= 0 ? 0 : (clamped - min) / span;

  const valueText =
    clamped === undefined
      ? undefined
      : formatValue
        ? formatValue(clamped, max, min)
        : new Intl.NumberFormat(kitLocale, { style: "percent", maximumFractionDigits: 0 }).format(fraction);

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
        aria-valuetext={valueText}
        aria-busy={!meter && indeterminate ? true : undefined}
        // `relative` + `overflow-hidden`: the indeterminate segment is positioned in
        // here and must not paint past the rounded ends.
        className={cn("relative w-full overflow-hidden rounded-full bg-[var(--bg-active)]", TRACK_HEIGHT[size])}
      >
        {indeterminate ? (
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
    </div>
  );
}
