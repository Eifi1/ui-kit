import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { CreditCard, Hourglass, PencilOff } from "lucide-react";

import type { LabelOverride } from "../i18n/kit-labels";
import { AlertBanner } from "../components/alert-banner";
import type { AlertSize, AlertTone } from "../components/alert-banner";
import { Button, Spinner } from "../components/ui";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";

/**
 * The billing banners (docs/billing-harmonization.md §3.3, §7, §12.6, §12.21):
 *
 * - `trial-ending` — from 7 days before `trial_ends_at` (§3.3);
 * - `grant-ending` — from 7 days before `comped_until`: a beta user's 12 months, an
 *   operator's grant;
 * - `payment-failed` — from the first failed payment (`past_due`), while the provider
 *   retries;
 * - `plan-ended` — out of good standing: read-only, never locked (§2.3);
 * - `guest` — a guest in someone else's read-only item (§12.6);
 * - `processing` — back from checkout before the webhook landed (§12.21).
 */
export type BillingBannerKind =
  | "trial-ending"
  | "grant-ending"
  | "payment-failed"
  | "plan-ended"
  | "guest"
  | "processing";

interface BillingBannerBaseProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onClick"> {
  /**
   * Over the kind's tone: `trial-ending` and `grant-ending` are `info` until the last
   * three days and `warning` in them; `payment-failed` is `danger` (money did not
   * arrive — kastlan's past-due strip was red); `plan-ended` is `warning`, a state with
   * everything still there rather than an error; `guest` and `processing` are `info`.
   */
  tone?: AlertTone;
  /** `strip` (default): the band under the top bar, on every page. `box`: the same
   *  message on the subscription page itself. */
  variant?: "strip" | "box";
  /** Default `sm` for a strip (the demo's banner), `md` for a box. */
  size?: AlertSize;
  /**
   * Where the action goes — the subscription page, say. The app's action, as an `href`
   * or as {@link onAction}; without either there is no button. Never a write-locked
   * commit: billing itself always works (§3.3).
   */
  actionHref?: string;
  /** What the action does — the app's portal call (`POST /billing/portal`, then off to
   *  its `url`). The kit sends no request. */
  onAction?: () => void;
  /**
   * Over the kind's action words: "Choose a plan" (trial, grant, plan ended), "Update
   * payment method" (payment failed), "Check again" (processing). The guest banner has
   * none of its own: an action there needs this.
   */
  actionLabel?: string;
  /** The action is under way: the button's spinner, no second press. */
  actionPending?: boolean;
  /** An × that calls this; the app removes the banner and remembers that it did. */
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Prop > `<UiKitProvider labels={{ billing }}>` > English. */
  labels?: LabelOverride<BillingLabels>;
}

export type BillingBannerProps = BillingBannerBaseProps &
  (
    | {
        kind: "trial-ending" | "grant-ending";
        /** Calendar days left — `billingDaysLeft(trial_ends_at)`. 0 is today. */
        daysLeft: number;
        item?: never;
      }
    | {
        kind: "guest";
        /** The item's own name ("Household 2026"), or nothing. NEVER the owner's status:
         *  the banner says "for now" and nothing more (§12.6). */
        item?: string;
        daysLeft?: never;
      }
    | {
        kind: "payment-failed" | "plan-ended" | "processing";
        daysLeft?: never;
        item?: never;
      }
  );

/** The last days, in which an ending trial or grant turns from news into a warning. */
const LAST_DAYS = 3;

function defaultTone(kind: BillingBannerKind, daysLeft: number | undefined): AlertTone {
  switch (kind) {
    case "trial-ending":
    case "grant-ending":
      return (daysLeft ?? 0) > LAST_DAYS ? "info" : "warning";
    case "payment-failed":
      return "danger";
    case "plan-ended":
      return "warning";
    default:
      return "info";
  }
}

/**
 * One of the billing banners, as a kit `AlertBanner` strip (§7): the kind's sentence, its
 * glyph and tone, and the app's action. Carries `data-billing-banner` with the kind.
 *
 * The app decides WHICH banner shows, from `GET /billing/overview` (and hides all of them
 * while billing is off, §4); the kit only says it. A guest's banner takes no status at
 * all — the type does not let one in — so the owner's payment state cannot leak into it
 * by a wrong prop (§12.6).
 *
 * `processing` is a live region (`role="status"`): it appears when the person comes back
 * from checkout and goes when the overview catches up (§12.21), and a screen reader
 * should hear both. The others are page furniture, role-less as the strip is.
 */
export function BillingBanner(props: BillingBannerProps) {
  const {
    kind,
    daysLeft,
    item,
    tone,
    variant = "strip",
    size,
    actionHref,
    onAction,
    actionLabel,
    actionPending,
    onDismiss,
    dismissLabel,
    labels: labelsProp,
    role,
    ...rest
  } = props;
  const labels = useBillingLabels(labelsProp);
  const days = Math.max(0, Math.floor(daysLeft ?? 0));

  let text: string;
  let icon: ReactNode;
  let ownAction: string | undefined;
  switch (kind) {
    case "trial-ending":
      text = labels.trialEnding(days);
      icon = <Hourglass />;
      ownAction = labels.choosePlan;
      break;
    case "grant-ending":
      text = labels.grantEnding(days);
      icon = <Hourglass />;
      ownAction = labels.choosePlan;
      break;
    case "payment-failed":
      text = labels.paymentFailed;
      icon = <CreditCard />;
      ownAction = labels.updatePayment;
      break;
    case "plan-ended":
      text = labels.planEnded;
      icon = <PencilOff />;
      ownAction = labels.choosePlan;
      break;
    case "guest":
      text = labels.guestReadOnly(item);
      icon = <PencilOff />;
      ownAction = undefined;
      break;
    case "processing":
      text = labels.processing;
      icon = <Spinner label={null} />;
      ownAction = labels.checkAgain;
      break;
  }

  const words = actionLabel ?? ownAction;
  const action =
    words === undefined || (actionHref === undefined && onAction === undefined) ? undefined : actionHref !== undefined ? (
      <Button href={actionHref} variant="secondary" size="sm">
        {words}
      </Button>
    ) : (
      <Button type="button" variant="secondary" size="sm" onClick={onAction} pending={actionPending}>
        {words}
      </Button>
    );

  return (
    <AlertBanner
      {...rest}
      role={role ?? (kind === "processing" ? "status" : undefined)}
      variant={variant}
      size={size ?? (variant === "strip" ? "sm" : "md")}
      tone={tone ?? defaultTone(kind, days)}
      icon={icon}
      action={action}
      onDismiss={onDismiss}
      dismissLabel={dismissLabel}
      data-billing-banner={kind}
    >
      {text}
    </AlertBanner>
  );
}
