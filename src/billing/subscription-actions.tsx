import type { ComponentPropsWithoutRef } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { Button } from "../components/ui";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";

export interface SubscriptionActionsProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** "Payment and invoices", as a link — or {@link onManage}. Without either, none. */
  manageHref?: string;
  /** "Payment and invoices", as the app's call: `POST /billing/portal`, then off to its
   *  `url` (§4). The kit sends no request. */
  onManage?: () => void;
  /** "Cancel subscription", as a link — or {@link onCancel}. Without either, none. */
  cancelHref?: string;
  /** "Cancel subscription", as the app's call — usually the portal again, where the
   *  provider's cancel and withdrawal functions are (§12.26). */
  onCancel?: () => void;
  /** Which of the two is under way: its spinner, no second press. */
  pending?: "manage" | "cancel" | null;
  /** Prop > `<UiKitProvider labels={{ billing }}>` > English. */
  labels?: LabelOverride<BillingLabels>;
}

/**
 * The two ways to the provider's hosted portal on the subscription page
 * (docs/billing-harmonization.md §2.8, §7, §12.26): "Payment and invoices" — the payment
 * method and the invoices live there, never in the app — and a VISIBLE "Cancel
 * subscription". Consumer law wants the second in plain sight: Germany's cancellation
 * button (§312k BGB) and the EU withdrawal function (Directive (EU) 2023/2673, from
 * 19 June 2026) are in the portal, and the app's page must not hide the way there behind
 * "manage".
 *
 * Neither takes the write lock: a read-only payer must be able to pay, leave or cancel
 * (§3.3).
 */
export function SubscriptionActions({
  manageHref,
  onManage,
  cancelHref,
  onCancel,
  pending,
  labels: labelsProp,
  className,
  ...rest
}: SubscriptionActionsProps) {
  const labels = useBillingLabels(labelsProp);
  const manage =
    manageHref !== undefined ? (
      <Button href={manageHref} variant="secondary">
        {labels.manage}
      </Button>
    ) : onManage !== undefined ? (
      <Button type="button" variant="secondary" onClick={onManage} pending={pending === "manage"}>
        {labels.manage}
      </Button>
    ) : null;
  const cancel =
    cancelHref !== undefined ? (
      <Button href={cancelHref} variant="link" tone="danger">
        {labels.cancel}
      </Button>
    ) : onCancel !== undefined ? (
      <Button type="button" variant="link" tone="danger" onClick={onCancel} pending={pending === "cancel"}>
        {labels.cancel}
      </Button>
    ) : null;
  if (!manage && !cancel) return null;
  return (
    <div {...rest} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {manage}
      {cancel}
    </div>
  );
}
