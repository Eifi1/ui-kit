import type { ComponentPropsWithRef } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { Button } from "../components/button";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";
import type { BillingPortalAccess, PortalTarget } from "./billing-overview";

export interface SubscriptionActionsProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
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
  /**
   * 0.42 (§16.2, server-kit 0.14): the overview's `portal`. `"buyer_only"` — the row has
   * a buyer and the viewer isn't them, so the portal would answer `403
   * billing_portal_buyer_only`: "Payment and invoices" becomes a caption naming the buyer
   * (`buyerHolds`, no button), and "Cancel subscription" calls {@link onCancelInApp}
   * (no portal at all — `cancelHref`, `onCancel` and `onPortal` are not used). `"open"`
   * (default): as before.
   */
  portal?: BillingPortalAccess;
  /** 0.42: the overview's `buyer_name`, for the caption under `"buyer_only"`. Empty: "…with
   *  the admin who bought the subscription". */
  buyerName?: string | null;
  /**
   * 0.42 (§16.2 decision 2): "Cancel subscription" in the app — open
   * `CancelSubscriptionConfirm`, whose Confirm is `POST /billing/cancel`. The cancel under
   * `"buyer_only"`. Under `"open"` it is the last resort, used only when no portal cancel
   * (`cancelHref`, `onCancel`, `onPortal`) is given — a person-payer app that mounts the
   * route and not the portal's cancel.
   */
  onCancelInApp?: () => void;
  /** 0.42 (§16.7 C): the overview's `cancel_at_period_end` — a cancel is scheduled. With
   *  {@link onResume}, "Keep subscription" takes the cancel's place. */
  cancelAtPeriodEnd?: boolean;
  /** 0.42 (§16.7 C): "Keep subscription", the app's `POST /billing/resume` — shown in
   *  the cancel's place while {@link cancelAtPeriodEnd} is true. Without it, the cancel
   *  stays as before. */
  onResume?: () => void;
  /** Which one is under way: its spinner, no second press. `"resume"` since 0.42. */
  pending?: "manage" | "cancel" | "resume" | null;
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
 *
 * 0.42 (§16): where the company's buyer is another admin (`portal="buyer_only"`), the
 * portal stays the buyer's — "Payment and invoices" is a caption that names them, and
 * "Cancel subscription" is the in-app cancel (`onCancelInApp`). While a cancel is
 * scheduled (`cancelAtPeriodEnd`) and `onResume` is given, "Keep subscription" stands in
 * the cancel's place, whoever the viewer is.
 */
export function SubscriptionActions({
  manageHref,
  onManage,
  cancelHref,
  onCancel,
  onPortal,
  atProvider = true,
  portal = "open",
  buyerName,
  onCancelInApp,
  cancelAtPeriodEnd = false,
  onResume,
  pending,
  labels: labelsProp,
  className,
  ...rest
}: SubscriptionActionsProps) {
  const labels = useBillingLabels(labelsProp);
  if (!atProvider) {
    return (
      <div {...rest} data-at-provider="false" className={cn("text-sm text-muted", className)}>
        <p>{labels.notAtProvider}</p>
      </div>
    );
  }
  const buyerOnly = portal === "buyer_only";
  const manageCall = onManage ?? (onPortal ? () => onPortal("overview") : undefined);
  const portalCancel = onCancel ?? (onPortal ? () => onPortal("cancel") : undefined);
  // Under "buyer_only" the in-app cancel only; under "open" the portal's first, the
  // in-app cancel only where no way to the portal's is given.
  const cancelCall = buyerOnly ? onCancelInApp : (portalCancel ?? (cancelHref === undefined ? onCancelInApp : undefined));
  const manage = buyerOnly ? (
    <p className="basis-full text-sm text-muted" data-buyer-holds="">
      {labels.buyerHolds(buyerName || undefined)}
    </p>
  ) : manageHref !== undefined ? (
    <Button href={manageHref} variant="secondary">
      {labels.manage}
    </Button>
  ) : manageCall !== undefined ? (
    <Button type="button" variant="secondary" onClick={manageCall} pending={pending === "manage"}>
      {labels.manage}
    </Button>
  ) : null;
  const cancel =
    cancelAtPeriodEnd && onResume !== undefined ? (
      <Button type="button" variant="link" onClick={onResume} pending={pending === "resume"} data-keep-subscription="">
        {labels.keepSubscription}
      </Button>
    ) : cancelHref !== undefined && !buyerOnly ? (
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
