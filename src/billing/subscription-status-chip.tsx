import type { ReactNode } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { Chip } from "../components/chip";
import type { ChipShape, ChipSize, ChipTone, ChipVariant } from "../components/chip";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels, SubscriptionStatus } from "./billing-labels";

/**
 * The tone of each status (docs/billing-harmonization.md §3.2, §3.3). The tone follows
 * the STANDING, so a roster reads at a glance who can write:
 *
 * - `active` green: paid, in good standing;
 * - `trialing` blue (info): in good standing until `trial_ends_at`, nothing wrong;
 * - `past_due` amber: a payment failed, still in good standing while the provider retries;
 * - `expired` red: out of good standing — read-only until a plan is chosen;
 * - `canceled` grey: the payer's own choice, nothing to warn about;
 * - `comped` purple, a hue rather than a tone: free by grant — neither paid nor in trouble,
 *   only different from both.
 */
export const SUBSCRIPTION_STATUS_TONES: Readonly<Record<SubscriptionStatus, ChipTone>> = Object.freeze({
  trialing: "info",
  active: "success",
  past_due: "warning",
  canceled: "neutral",
  expired: "danger",
  comped: "purple",
});

export interface SubscriptionStatusChipProps {
  /**
   * The row's `status` as the API sends it (§3.2). A value the kit does not know yet is
   * shown as itself, in `neutral` — an unknown status is still a fact an operator should
   * see. `null` / `undefined` renders nothing.
   */
  status: SubscriptionStatus | (string & {}) | null | undefined;
  /** Over {@link SUBSCRIPTION_STATUS_TONES}. */
  tone?: ChipTone;
  /** Over the status's word, for an app whose word is its own. */
  children?: ReactNode;
  /** Default `sm` (a roster's `extra` column, §6). */
  size?: ChipSize;
  /** Default `soft`. */
  variant?: ChipVariant;
  /** Default `square`, the status tag of `AccountStateChip`. */
  shape?: ChipShape;
  /** Default true, as `AccountStateChip`. */
  caps?: boolean;
  className?: string;
  /** Prop > `<UiKitProvider labels={{ billing: { status } }}>` > English. */
  labels?: LabelOverride<BillingLabels>;
  [key: `data-${string}`]: string | number | boolean | undefined;
}

// Own keys only: `"toString" in {}` is true.
const isKnown = (value: string): value is SubscriptionStatus =>
  Object.prototype.hasOwnProperty.call(SUBSCRIPTION_STATUS_TONES, value);

/**
 * A subscription's status as a chip, in the kit's words and tones (§6: the operator's
 * roster shows the plan and the standing; §7: the subscription page). ALWAYS A WORD, never
 * colour alone: "Trial", "Active", "Payment overdue", "Cancelled", "Expired",
 * "Complimentary" — the tone repeats what the word says. Carries `data-status` with the
 * key, for a test or a style hook.
 */
export function SubscriptionStatusChip({
  status,
  tone,
  children,
  size = "sm",
  variant,
  shape = "square",
  caps = true,
  className,
  labels: labelsProp,
  ...rest
}: SubscriptionStatusChipProps) {
  const labels = useBillingLabels(labelsProp);
  if (status === null || status === undefined || status === "") return null;
  const known = isKnown(status);
  return (
    <Chip
      {...rest}
      data-status={status}
      tone={tone ?? (known ? SUBSCRIPTION_STATUS_TONES[status] : "neutral")}
      size={size}
      variant={variant}
      shape={shape}
      caps={caps}
      className={className}
    >
      {children ?? (known ? labels.status[status] : status)}
    </Chip>
  );
}
