import type { ComponentPropsWithRef, ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { Button } from "../components/button";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";
import type { BillingPortalAccess, PortalTarget } from "./billing-overview";
import type { CancelRequested } from "./cancel-request";

/** The portal action's mark (§17.3): the external-link glyph after the words, and "(opens
 *  in a new tab)" for a reader — on a link, `Button`'s `external` says the latter. */
export function ExternalMark({ reader }: { reader?: string }) {
  return (
    <>
      <ExternalLink aria-hidden data-external="" className="size-4 shrink-0 rtl:-scale-x-100" />
      {reader !== undefined && (
        <>
          {" "}
          <span className="sr-only">({reader})</span>
        </>
      )}
    </>
  );
}

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
  /**
   * 0.43 (kastlan `18bf4c0`): what was asked in the app and the overview does not show
   * yet — `useCancelRequest(…).requested`. `"cancel"`: shown as scheduled ("Keep
   * subscription" with {@link onResume}; without it, no second "Cancel subscription").
   * `"resume"`: shown as not scheduled. `null` (default): {@link cancelAtPeriodEnd} says.
   */
  cancelRequested?: CancelRequested;
  /**
   * 0.43 (§17): the portal opens in a NEW TAB — the app's handler calls
   * `openProviderPage` — so its actions carry the external-link mark, a link opens with
   * `target="_blank"`, and the `portalOpensNewTab` note shows under them. Default true;
   * `false` for an app whose portal still opens in the same tab.
   */
  portalNewTab?: boolean;
  /** 0.43: the provider's name in the note. Default `"Paddle"` (§2 decision 16). */
  providerName?: string;
  /** 0.43: the app's name in the note ("Kastlan stays open here"). Without it, "this page
   *  stays open". */
  appName?: string;
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
 *
 * 0.43 (§17): the portal opens in a new tab (`openProviderPage` in the app's handler):
 * its actions carry the external-link mark, and a muted note says so — "Payment and
 * invoices open at {provider} in a new tab; {app} stays open here." The in-app cancel and
 * "Keep subscription" stay unmarked. After an in-app cancel or resume, `cancelRequested`
 * (`useCancelRequest`) shows what was asked until the provider's webhook lands.
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
  cancelRequested = null,
  portalNewTab = true,
  providerName = "Paddle",
  appName,
  pending,
  labels: labelsProp,
  className,
  ...rest
}: SubscriptionActionsProps) {
  const labels = useBillingLabels(labelsProp);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
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
  // 0.43: what was asked in the app wins over the row until the row moves.
  const scheduled = cancelRequested === "cancel" ? true : cancelRequested === "resume" ? false : cancelAtPeriodEnd;
  // 0.43 (§17): the portal's actions are marked, a link opens a tab of its own.
  const newTab = portalNewTab && !buyerOnly;
  const words = (text: string, external: boolean, link: boolean): ReactNode =>
    external ? (
      <>
        {text}
        <ExternalMark reader={link ? undefined : common.opensInNewTab} />
      </>
    ) : (
      text
    );
  const portalCancelShown = !buyerOnly && (cancelHref !== undefined || portalCancel !== undefined);
  const manage = buyerOnly ? (
    <p className="basis-full text-sm text-muted" data-buyer-holds="">
      {labels.buyerHolds(buyerName || undefined)}
    </p>
  ) : manageHref !== undefined ? (
    <Button href={manageHref} variant="secondary" external={newTab || undefined} data-portal-action="manage">
      {words(labels.manage, newTab, true)}
    </Button>
  ) : manageCall !== undefined ? (
    <Button
      type="button"
      variant="secondary"
      onClick={manageCall}
      pending={pending === "manage"}
      className={newTab ? "relative" : undefined}
      data-portal-action="manage"
    >
      {words(labels.manage, newTab, false)}
    </Button>
  ) : null;
  const cancel =
    scheduled && onResume !== undefined ? (
      <Button type="button" variant="link" onClick={onResume} pending={pending === "resume"} data-keep-subscription="">
        {labels.keepSubscription}
      </Button>
    ) : cancelRequested === "cancel" ? null : cancelHref !== undefined && !buyerOnly ? (
      <Button href={cancelHref} variant="link" tone="danger" external={newTab || undefined} data-portal-action="cancel">
        {words(labels.cancel, newTab, true)}
      </Button>
    ) : cancelCall !== undefined ? (
      <Button
        type="button"
        variant="link"
        tone="danger"
        onClick={cancelCall}
        pending={pending === "cancel"}
        className={newTab && portalCancelShown ? "relative" : undefined}
        data-portal-action={portalCancelShown ? "cancel" : undefined}
      >
        {words(labels.cancel, newTab && portalCancelShown, false)}
      </Button>
    ) : null;
  if (!manage && !cancel) return null;
  // The note while a way to the portal shows: "Payment and invoices open at Paddle in a
  // new tab; Kastlan stays open here."
  const portalShown = !buyerOnly && (manage !== null || (cancel !== null && portalCancelShown && !(scheduled && onResume)));
  return (
    <div {...rest} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {manage}
      {cancel}
      {newTab && portalShown && (
        <p className="basis-full text-sm text-muted" data-portal-note="">
          {labels.portalOpensNewTab(providerName, appName || undefined)}
        </p>
      )}
    </div>
  );
}
