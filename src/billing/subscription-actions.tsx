import type { ComponentPropsWithoutRef } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { Button } from "../components/ui";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";
import type { PortalTarget } from "./billing-overview";

export interface SubscriptionActionsProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** "Payment and invoices", as a link — or {@link onManage}. Without either, none. */
  manageHref?: string;
  /** "Payment and invoices", as the app's call: `POST /billing/portal` with
   *  `{target: "overview"}`, then off to its `url` (§4, §14.5). The kit sends no
   *  request. */
  onManage?: () => void;
  /** "Cancel subscription", as a link — or {@link onCancel}. Without either, none. */
  cancelHref?: string;
  /** "Cancel subscription", as the app's call: the portal again, with `{target:
   *  "cancel"}` — its cancel link, where the provider's cancel and withdrawal functions
   *  are (§12.26, §14.5). Not the overview. */
  onCancel?: () => void;
  /**
   * Both, as one call that says where to ({@link PortalTarget}, the body of
   * `POST /billing/portal`): `"overview"` for "Payment and invoices",
   * `"cancel"` for "Cancel subscription" — so the target can't be mixed up (kastlan's
   * cancel opened the overview). {@link onManage} and {@link onCancel} win over it.
   */
  onPortal?: (target: PortalTarget) => void;
  /**
   * The overview's `at_provider` (§14.5): whether the payer has reached the provider.
   * `false`: no customer there yet, so nothing to open — a caption (`notAtProvider`)
   * stands in place of both actions. `true`: both show, WHATEVER the status or source —
   * a payer who bought under a grant keeps the way to the invoices and to "Cancel"
   * (§12.26). Default true (0.32's behaviour).
   */
  atProvider?: boolean;
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
 *
 * Before the payer has reached the provider (`atProvider={false}`, a trial without a
 * card, a beta) there is no portal to open: the part says so in a caption instead of
 * offering two buttons that could only end in `409 billing_not_at_provider`.
 */
export function SubscriptionActions({
  manageHref,
  onManage,
  cancelHref,
  onCancel,
  onPortal,
  atProvider = true,
  pending,
  labels: labelsProp,
  className,
  ...rest
}: SubscriptionActionsProps) {
  const labels = useBillingLabels(labelsProp);
  if (!atProvider) {
    return (
      <div {...rest} data-at-provider="false" className={cn("text-sm text-[var(--text-muted)]", className)}>
        <p>{labels.notAtProvider}</p>
      </div>
    );
  }
  const manageCall = onManage ?? (onPortal ? () => onPortal("overview") : undefined);
  const cancelCall = onCancel ?? (onPortal ? () => onPortal("cancel") : undefined);
  const manage =
    manageHref !== undefined ? (
      <Button href={manageHref} variant="secondary">
        {labels.manage}
      </Button>
    ) : manageCall !== undefined ? (
      <Button type="button" variant="secondary" onClick={manageCall} pending={pending === "manage"}>
        {labels.manage}
      </Button>
    ) : null;
  const cancel =
    cancelHref !== undefined ? (
      <Button href={cancelHref} variant="link" tone="danger">
        {labels.cancel}
      </Button>
    ) : cancelCall !== undefined ? (
      <Button type="button" variant="link" tone="danger" onClick={cancelCall} pending={pending === "cancel"}>
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
