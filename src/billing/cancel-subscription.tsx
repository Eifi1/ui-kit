import { useKitLabels } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_COMMON_LABELS } from "../i18n/shared-labels";
import { useDayFormatter } from "../lib/day-format";
import type { DateInput } from "../lib/format";
import { Button } from "../components/button";
import { DialogFrame } from "../components/dialog-frame";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";

export interface CancelSubscriptionConfirmProps {
  open: boolean;
  /** The admin dismissed it — Back, Escape, the backdrop. Confirm leaves it open: close it
   *  once `POST /billing/cancel` answers. 0.52: every other kit dialog's `onClose`
   *  (CONTRIBUTING §4; refactor audit 2026-10-30, API-5). */
  onClose?: () => void;
  /** @deprecated 0.52 — `onClose`, as every other kit dialog; removed in 0.53. Called with
   *  `false` when there is no `onClose`. */
  onOpenChange?: (open: boolean) => void;
  /** The overview's `current_period_end`: the day the subscription ends, in a sentence —
   *  the `<UiKitProvider formatDate>` (the app's date preference) when it set one, else the
   *  kit's `formatDate`, `"medium"`, in the provider's locale and `timeZone` (0.52). */
  periodEnd: DateInput;
  /** Confirm: the app's `POST /billing/cancel` (server-kit 0.14, §16.3). */
  onConfirm: () => void;
  /** The cancel is under way: Confirm's spinner, no second press, and neither Escape,
   *  the backdrop nor Back closes it. */
  pending?: boolean;
  /** The date's locale. Default: the provider's. */
  locale?: string;
  /** Prop > `<UiKitProvider labels={{ billing }}>` > English. */
  labels?: LabelOverride<BillingLabels>;
}

/**
 * The in-app cancel's confirm (docs/billing-harmonization.md §16.2 decision 2, §16.4,
 * ui-kit 0.42): "Cancel subscription" for an admin the provider's portal doesn't open for
 * (`SubscriptionActions`' `portal="buyer_only"` → `onCancelInApp`). It names the day the
 * subscription ends — "Your subscription ends on 9 Nov 2026. Until then everything works
 * as before." — and its button reads "Cancel subscription now" (German "Jetzt kündigen",
 * the confirmation button of §312k BGB).
 *
 *     <CancelSubscriptionConfirm
 *       open={asking}
 *       onClose={() => setAsking(false)}
 *       periodEnd={overview.current_period_end}
 *       pending={cancel.isPending}
 *       onConfirm={() => cancel.mutate()}
 *     />
 *
 * The cancel is at the period's end (Paddle's `cancel`, not immediately); the row follows
 * by webhook (`cancel_at_period_end`), as after a cancel in the portal, and
 * `SubscriptionActions` then offers "Keep subscription" (`onResume`).
 *
 * It takes no billing lock (`COMMIT_EXCEPT_BILLING` built in, §3.3): a read-only payer
 * may always cancel. A demo lock still holds it, as the server's demo guard does. The kit
 * sends no request.
 */
export function CancelSubscriptionConfirm({
  open,
  onClose,
  onOpenChange,
  periodEnd,
  onConfirm,
  pending = false,
  locale: localeProp,
  labels: labelsProp,
}: CancelSubscriptionConfirmProps) {
  const labels = useBillingLabels(labelsProp);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const day = useDayFormatter(undefined, localeProp);

  return (
    <DialogFrame
      open={open}
      title={labels.cancelConfirmTitle}
      description={labels.cancelConfirmBody(day(periodEnd))}
      onClose={() => (onClose ? onClose() : onOpenChange?.(false))}
      busy={pending}
      data-cancel-subscription-confirm=""
      actions={(close) => (
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>
            {common.back}
          </Button>
          <Button
            variant="danger"
            commit={COMMIT_EXCEPT_BILLING}
            pending={pending}
            onClick={() => {
              if (!pending) onConfirm();
            }}
          >
            {labels.cancelConfirmAction}
          </Button>
        </>
      )}
    />
  );
}
