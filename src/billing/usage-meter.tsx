import type { ReactNode } from "react";

import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { formatNumber } from "../lib/format";
import { ProgressBar } from "../components/progress-bar";
import type { ProgressBarSize, ProgressBarTone } from "../components/progress-bar";
import { DEFAULT_PROGRESS_BAR_LABELS } from "../components/progress-bar-labels";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";

export interface UsageMeterProps {
  /** The dimension's name in the reader's language: "Budgets", "Units", "Files". The
   *  meter's visible label and its accessible name. */
  label: ReactNode;
  /** What the payer has — the overview's `usage[dimension]` (§12.15). */
  used: number;
  /**
   * The plan's limit — the overview's `limits[dimension]`. `null` is unlimited (§3.1), and
   * so is a dimension the overview's `limits` leaves out: no bar and no tone, the count
   * and "Unlimited" as text.
   */
  limit?: number | null;
  /** How a figure is written — kastlan's storage limit is bytes (`formatFileSize`).
   *  Default: a number in the kit's locale, with its digit grouping ("12’345"). */
  formatValue?: (value: number) => string;
  /** The track's height. Default `slim` (6px), a bar under a line of text. */
  size?: ProgressBarSize;
  /** Over the provider's locale, for the default figures. */
  locale?: string;
  className?: string;
  /** Prop > `<UiKitProvider labels={{ billing }}>` > English: `usage` ("3 of 10") and
   *  `unlimited`. The over-the-limit line is `progressBar.overLimit`'s. */
  labels?: LabelOverride<BillingLabels>;
  [key: `data-${string}`]: string | number | boolean | undefined;
}

/** Where the use stands against the limit — `data-usage`, and the tone it takes. */
type UsageState = "below" | "at" | "over" | "unlimited";

const TONE: Record<Exclude<UsageState, "unlimited">, ProgressBarTone> = {
  below: "neutral",
  at: "warning",
  over: "danger",
};

/**
 * What the payer uses of one plan limit, on `ProgressBar`'s meter variant (billing §7;
 * kastlan reuse audit 2026-11-02, proposal 3): the dimension's name, "3 of 10", and a
 * bar whose tone says what creating one more would do (Marcel 2026-11-04):
 *
 * - below the limit: `neutral` — nothing to warn about;
 * - AT it: `warning` — nothing more can be created (§3.4);
 * - PAST it: `danger` — after a downgrade, which never deletes what is over the new limit
 *   (§3.4); the bar stays full and a line under it says by how much
 *   (`progressBar.overLimit`, "2 over the limit");
 * - unlimited (`null`): no bar and no tone, the count and "Unlimited" as text.
 *
 * Carries `data-usage` (`below`, `at`, `over`, `unlimited`), for a test or a style hook.
 *
 * kastlan's `UsageProgressBar` turned amber past 80 % and wrote its counts with
 * `n.toString()`; keksdose's own `UsageMeter` warned at the limit but drew nothing past
 * it. Every figure here goes through {@link UsageMeterProps.formatValue}, the overage too.
 *
 *     {DIMENSIONS.map((d) => (
 *       <UsageMeter key={d} label={names[d]} used={overview.usage[d] ?? 0} limit={overview.limits[d]} />
 *     ))}
 */
export function UsageMeter({
  label,
  used,
  limit = null,
  formatValue,
  size = "slim",
  locale: localeProp,
  className,
  labels: labelsProp,
  ...rest
}: UsageMeterProps) {
  const labels = useBillingLabels(labelsProp);
  const bar = useKitLabels("progressBar", DEFAULT_PROGRESS_BAR_LABELS);
  const locale = useKitLocale(localeProp);
  const figure = (value: number) => (formatValue ? formatValue(value) : formatNumber(value, { locale }));
  const state: UsageState = limit === null ? "unlimited" : used < limit ? "below" : used === limit ? "at" : "over";

  return (
    <ProgressBar
      {...rest}
      variant="meter"
      size={size}
      label={label}
      showValue
      value={used}
      max={limit}
      tone={state === "unlimited" ? undefined : TONE[state]}
      // The bar hands its formatter the value clamped at `max`; the figures are the real
      // ones, so "5 of 3" after a downgrade says what the bar cannot draw. Unlimited, it
      // asks with `max` = Infinity and shows the count beside "Unlimited".
      formatValue={() => (limit === null ? figure(used) : labels.usage(figure(used), figure(limit)))}
      overage={(over) => bar.overLimit(figure(over))}
      locale={locale}
      labels={{ unlimited: labels.unlimited }}
      data-usage={state}
      className={className}
    />
  );
}
