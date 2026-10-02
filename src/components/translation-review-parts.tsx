import { useMemo } from "react";
import type { ReactNode } from "react";
import { Download } from "lucide-react";

import { useKitLabels } from "../i18n/kit-labels";
import { useKitFormat } from "../lib/format";
import { summariseRows, translationCorrections } from "../lib/translation-review";
import type {
  ReviewStatus,
  TranslationCorrection,
  TranslationRow,
  TranslationSummary,
} from "../lib/translation-review";
import { Chip } from "./chip";
import type { ChipShape, ChipSize, ChipTone, ChipVariant } from "./chip";
import { ProgressBar } from "./progress-bar";
import type { ProgressBarSegment } from "./progress-bar";
import { DEFAULT_TRANSLATION_REVIEW_LABELS, reviewStatusLabel } from "./translation-review-labels";
import type { TranslationReviewLabels } from "./translation-review-labels";
import { Button, Tabs } from "./ui";

/**
 * The small parts of the translation review, each usable on its own: the status
 * vocabulary as a chip, one locale's progress, the locale tabs and the export. The page
 * body that puts them together is `TranslationReviewPanel` (translation-review.tsx).
 */

// ── ReviewStatusChip ──────────────────────────────────────────────────────────

/**
 * The tone of each status: nothing yet is neutral, a gap is orange (kastlan's choice — a
 * hue, not a verdict), a change since review is amber, sent back is red, done is green.
 */
export const REVIEW_STATUS_TONES: Readonly<Record<ReviewStatus, ChipTone>> = {
  missing: "orange",
  unreviewed: "neutral",
  changed: "warning",
  needs_change: "danger",
  approved: "success",
};

export interface ReviewStatusChipProps {
  status: ReviewStatus;
  /** Over {@link REVIEW_STATUS_TONES}. */
  tone?: ChipTone;
  /** Over the label. */
  children?: ReactNode;
  /** Default `sm` — a chip in a table cell. */
  size?: ChipSize;
  variant?: ChipVariant;
  shape?: ChipShape;
  caps?: boolean;
  className?: string;
  /** Prop > `<UiKitProvider labels={{ translationReview }}>` > English. */
  labels?: Partial<TranslationReviewLabels>;
  [key: `data-${string}`]: string | number | boolean | undefined;
}

/** One row's status as a chip, in the kit's words and tones. Carries `data-status`. */
export function ReviewStatusChip({
  status,
  tone,
  children,
  size = "sm",
  variant,
  shape,
  caps,
  className,
  labels: labelsProp,
  ...rest
}: ReviewStatusChipProps) {
  const labels = useKitLabels("translationReview", DEFAULT_TRANSLATION_REVIEW_LABELS, labelsProp);
  return (
    <Chip
      {...rest}
      data-status={status}
      tone={tone ?? REVIEW_STATUS_TONES[status]}
      size={size}
      variant={variant}
      shape={shape}
      caps={caps}
      className={className}
    >
      {children ?? reviewStatusLabel(labels, status)}
    </Chip>
  );
}

// ── TranslationProgress ───────────────────────────────────────────────────────

export interface TranslationProgressProps {
  /** One locale's rows — or their {@link summariseRows} when the app has only counts. */
  rows?: readonly TranslationRow[];
  summary?: TranslationSummary;
  /** The list under the bar naming each part with its count. Default true. */
  legend?: boolean;
  className?: string;
  labels?: Partial<TranslationReviewLabels>;
}

/**
 * "120 of 3859 approved", and the bar split by status: approved, sent back, changed since
 * review, missing — in the chips' colours. What is left of the track is unreviewed. The
 * legend counts rows rather than percentages: "12 need a change" is the next hour's work,
 * "0.3 %" is not.
 */
export function TranslationProgress({
  rows,
  summary: summaryProp,
  legend = true,
  className,
  labels: labelsProp,
}: TranslationProgressProps) {
  const labels = useKitLabels("translationReview", DEFAULT_TRANSLATION_REVIEW_LABELS, labelsProp);
  const { formatNumber } = useKitFormat();
  const summary = useMemo(() => summaryProp ?? summariseRows(rows ?? []), [summaryProp, rows]);
  const part = (status: ReviewStatus, tone: ProgressBarSegment["tone"], color?: string): ProgressBarSegment => ({
    key: status,
    value: summary[status],
    tone,
    color,
    label: reviewStatusLabel(labels, status),
    // A status with no rows stays in the legend ("Needs a change 0" is news too) but out
    // of the bar, where it would only be a gap.
    legendOnly: summary[status] === 0 ? true : undefined,
  });
  const segments = [
    part("approved", "success"),
    part("needs_change", "danger"),
    part("changed", "warning"),
    // The chip's orange, which is a hue and not a ProgressBar tone. Only where there is
    // a gap: an app whose locales are complete never hears of "missing".
    ...(summary.missing > 0 ? [part("missing", undefined, "var(--hue-orange)")] : []),
  ];
  return (
    <ProgressBar
      className={className}
      label={labels.progress(summary.approved, summary.total)}
      max={Math.max(summary.total, 1)}
      segments={segments}
      legend={legend}
      formatValue={(value) => formatNumber(value)}
    />
  );
}

// ── TranslationLocaleTabs ─────────────────────────────────────────────────────

export interface TranslationLocaleTab {
  /** The locale code. */
  value: string;
  /** Its name, in its own language ("Français"). */
  label: ReactNode;
  /** The locale's rows, for the badge — built with the same `areas` as the panel's, so
   *  a scoped reviewer's tab counts what they can see. */
  rows: readonly TranslationRow[];
}

export interface TranslationLocaleTabsProps {
  /** The locales the viewer may see, in the app's order — the server's answer, never a
   *  guess from a role name. */
  locales: readonly TranslationLocaleTab[];
  active: string;
  onChange: (locale: string) => void;
  className?: string;
  labels?: Partial<TranslationReviewLabels>;
}

/**
 * One tab per locale with its approved/total, wrapping on a phone. Nothing for a single
 * locale: a strip with one tab is a heading that looks clickable.
 */
export function TranslationLocaleTabs({ locales, active, onChange, className, labels: labelsProp }: TranslationLocaleTabsProps) {
  const labels = useKitLabels("translationReview", DEFAULT_TRANSLATION_REVIEW_LABELS, labelsProp);
  if (locales.length < 2) return null;
  return (
    <Tabs
      aria-label={labels.locales}
      wrap
      className={className}
      tabs={locales.map((locale) => {
        const summary = summariseRows(locale.rows);
        return {
          id: locale.value,
          label: locale.label,
          name: typeof locale.label === "string" ? locale.label : locale.value,
          badge: (
            // The tab's own colour, dimmed — a fixed muted grey vanished on the selected
            // tab's brand fill (390px browser check).
            <span className="text-xs tabular-nums opacity-75">
              {labels.localeProgress(summary.approved, summary.total)}
            </span>
          ),
        };
      })}
      active={active}
      onChange={onChange}
    />
  );
}

// ── TranslationExportButton ───────────────────────────────────────────────────

export interface TranslationExportButtonProps {
  /** Every row the export covers — usually every locale's, not only the open one. */
  rows: readonly TranslationRow[];
  /** Listed in the file. Default: the locales the rows come from. */
  locales?: readonly string[];
  /** Default `translation-corrections-<date>.json`. */
  fileName?: string;
  /**
   * Take the export instead of downloading it — the entries, and the file as a ready
   * JSON Blob. Left out, the kit downloads the Blob as `fileName`.
   */
  onExport?: (corrections: TranslationCorrection[], file: Blob) => void;
  className?: string;
  labels?: Partial<TranslationReviewLabels>;
}

/**
 * "Export corrections (n)": every string sent back, as the JSON file keksdose and kastlan
 * hand a developer — `{ exported_at, locales, corrections }`. Corrections are not applied
 * on the page: the strings are source code. Disabled while there is nothing to export.
 */
export function TranslationExportButton({
  rows,
  locales,
  fileName,
  onExport,
  className,
  labels: labelsProp,
}: TranslationExportButtonProps) {
  const labels = useKitLabels("translationReview", DEFAULT_TRANSLATION_REVIEW_LABELS, labelsProp);
  const corrections = useMemo(() => translationCorrections(rows), [rows]);
  const run = () => {
    const now = new Date();
    const file = new Blob(
      [
        JSON.stringify(
          {
            exported_at: now.toISOString(),
            locales: locales ?? [...new Set(rows.map((r) => r.locale))],
            corrections,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    if (onExport) {
      onExport(corrections, file);
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ?? `translation-corrections-${now.toISOString().slice(0, 10)}.json`;
    a.click();
    // After the click has handed the URL to the download, not before.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <Button variant="secondary" disabled={corrections.length === 0} onClick={run} className={className}>
      <Download className="size-4" aria-hidden />
      {labels.exportCorrections(corrections.length)}
    </Button>
  );
}
