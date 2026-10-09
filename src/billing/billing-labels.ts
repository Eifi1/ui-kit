import { useKitLabels } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";

/**
 * The subscription's status vocabulary (docs/billing-harmonization.md §3.2) — server-kit's
 * `SubscriptionStatus`, value for value:
 *
 * - `trialing` — the 30-day trial without a card (§2.7), or a pure guest's row whose trial
 *   has not started (§12.9, `trial_ends_at` empty);
 * - `active` — paid;
 * - `past_due` — a payment failed; in good standing during the provider's retries (§3.3);
 * - `canceled` — the payer cancelled; the American spelling is the wire's, the word shown
 *   is "Cancelled";
 * - `expired` — a trial, a grant or a failed subscription ran out: read-only (§2.3);
 * - `comped` — free by the operator's grant or as a beta user (§3.2, `comped_until`).
 */
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired" | "comped";

/** Every status, in the order a lifecycle reads: trial, paid, trouble, ended, granted. */
export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = Object.freeze([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "comped",
]);

/**
 * The words of the subscription parts — the `billing` namespace of `<UiKitProvider labels>`
 * (docs/billing-harmonization.md §7, §10; ui-kit 0.32.0).
 *
 * WORDING (§12.24): the English group is "Subscription", never "Plan" — keksdose's "plan"
 * is the month's budget plan ("One plan per month"), and two meanings of one word on one
 * settings page is the clash the review found. "Plan" stays the word for WHAT is bought
 * (Free, Pro), "subscription" for the standing arrangement. German says "Tarif" for the
 * plan and "Abonnement" for the subscription (§10).
 *
 * Prices are GROSS (§12.17): Swiss consumer law (PBV) wants a consumer price with the
 * MWST in it, so the cards say so (`vatIncluded`).
 */
export interface BillingLabels {
  /** The settings group or admin section the parts live on (§7, §12.24): "Subscription". */
  group: string;

  /* ── PlanPicker / PlanCard (§7) ── */
  /** The picker's name when it has no visible `legend`: "Plans". */
  plans: string;
  /** The name of the billing-period switch: "Billing period". */
  interval: string;
  /** The switch's two options — yearly first (§12.17). */
  yearly: string;
  monthly: string;
  /** The name of the currency switch: "Currency". */
  currency: string;
  /** After a price: "per year", "per month". */
  perYear: string;
  perMonth: string;
  /** Under a price (§12.17): "VAT included". German: "inkl. MWST". */
  vatIncluded: string;
  /** A plan with no price, or a price of 0: "Free". */
  free: string;
  /** A plan with prices, but none for this currency and period. */
  notOffered: string;
  /** A limit of `null` (§3.1): "Unlimited". */
  unlimited: string;
  /** The accessible names of a card's two lists. */
  limits: string;
  features: string;
  /** The chip on the payer's current plan. */
  current: string;
  /** The picker's button for `plan` (the plan's display name) with no current plan —
   *  during a trial, or after a plan ended: "Choose Pro". */
  choose: (plan: string) => string;
  /** …for a plan after the current one in the catalogue's order: "Upgrade to Pro". */
  upgrade: (plan: string) => string;
  /** …for a plan before it: "Switch to Free". */
  downgrade: (plan: string) => string;
  /** Why the button is off while the current plan is the one picked. */
  isCurrent: string;
  /** Why it is off while nothing is picked. */
  pickFirst: string;

  /* ── SubscriptionStatusChip (§6) ── */
  /** One word per status. */
  status: Record<SubscriptionStatus, string>;

  /* ── BillingBanner (§3.3, §12.6, §12.21) ── */
  /** A trial ends in `days` calendar days — 0 is today, 1 tomorrow. */
  trialEnding: (days: number) => string;
  /** A free grant (`comped_until`: a beta user's 12 months, an operator's grant) ends in
   *  `days` calendar days. */
  grantEnding: (days: number) => string;
  /** The first failed payment (`past_due`), while the provider retries. */
  paymentFailed: string;
  /** Out of good standing: read-only, never locked (§2.3). */
  planEnded: string;
  /**
   * A guest in someone else's item that is read-only for billing (§12.6). It never says
   * WHY beyond "for now": the owner's payment status is the owner's personal data.
   * `item` is the item's own name ("Household 2026"), shown in quotes — or `undefined`.
   */
  guestReadOnly: (item?: string) => string;
  /** Back from checkout before the provider's webhook landed (§12.21). */
  processing: string;
  /** The action of the trial, grant and plan-ended banners, and of `PlanLimitNotice`'s
   *  `upgrade` mode: "Choose a plan". */
  choosePlan: string;
  /** The payment-failed banner's action, to the provider's portal: "Update payment method". */
  updatePayment: string;
  /** The processing banner's action, when the app gives one: "Check again". */
  checkAgain: string;

  /* ── The read-only lock (§3.3, §12.6) ── */
  /** The `WriteLockProvider` reason for the payer (§3.3, verbatim). A guest's reason is
   *  {@link guestReadOnly}. */
  lockReason: string;

  /* ── PlanLimitNotice (§3.4) ── */
  /** The notice's first line: "Plan limit reached". */
  limitReached: string;
  /** Mode `upgrade`: what the action does. */
  limitUpgrade: string;
  /** Mode `contact` (the operator grants plans by hand, keksdose's today). */
  limitContact: string;
  /** Mode `contact`'s action, a mail to support: "Ask for more". */
  askForMore: string;
  /** The meter's value: "3 of 3". Both figures are formatted already. */
  usage: (used: string, limit: string) => string;
  /** The subject of the `contact` mail; `dimension` is the app's name for it ("Budgets"). */
  contactSubject: (dimension: string) => string;
  /**
   * The figure line of the limit's toast (`usePlanLimitToast`, §14.11) and of an
   * operator's plan change over the new limit (§14.12): "Budgets: 3 of 3". A key of its
   * own rather than `${dimension}: ${usage}`, because French puts a space before the
   * colon. Both figures are formatted already.
   */
  limitUsageLine: (dimension: string, used: string, limit: string) => string;

  /* ── The provider's portal (§7, §12.26) ── */
  /** The portal: payment method and invoices (§2.8, the provider hosts both). */
  manage: string;
  /**
   * The visible cancel link on the app's subscription page (§12.26). German: §312k BGB
   * wants the button that leads to the cancellation labelled "Verträge hier kündigen" or
   * as unambiguously — a translator should use exactly that.
   */
  cancel: string;
  /**
   * In place of both while the payer hasn't reached the provider (the overview's
   * `at_provider` is false, §14.5): there is no customer to open a portal for yet. Also
   * the words for `409 billing_not_at_provider`, a stale page that asked anyway.
   */
  notAtProvider: string;

  /* ── The pay page (§14.4) ── */
  /* Built into the static page `dist/pay/` at the kit's build: it has no React and no
     provider, so an app's override never reaches it. */
  /** While the checkout opens. */
  payOpening: string;
  /** A link without a transaction, or billing switched off: nothing to pay. */
  payNothing: string;
  /** Paddle's script didn't load, or the page's configuration is wrong. */
  payFailed: string;
  /** The buyer closed the checkout without paying. */
  payBack: string;

  /* ── Offline (§12.5) ── */
  /** Changes refused as `billing_read_only` inside a sync reply, kept queued and sent
   *  after payment: "3 changes waiting for a plan". */
  waitingChanges: (count: number) => string;
  /** The sign-out guard's way out for someone who will not pay. */
  discardWaiting: string;

  /* ── Refusals with no part of their own (0.32.1, kastlan's 0.32 report) ── */
  /**
   * `billing_not_configured`: billing is on but the provider's settings are missing — the
   * operator's mistake, so the words ask the payer to wait, not to act. For the toast or
   * alert after "Choose a plan" or "Payment and invoices" (`isBillingError(err,
   * "billing_not_configured")`). `billing_read_only` and `plan_limit` need none: the
   * write lock, the banner and `PlanLimitNotice` say them.
   */
  notConfigured: string;
  /** `billing_disabled`: billing is switched off on this server (§2.9), for a page or a
   *  link that reached it anyway. */
  disabled: string;
  /* 0.33.0 — server-kit 0.7's refusals (§14.2). `billing_not_at_provider` is
     {@link notAtProvider}'s: a stale page that asked for the portal anyway. */
  /** `billing_provider_unavailable` (502): the provider didn't answer. Try again. */
  providerUnavailable: string;
  /** `billing_already_subscribed` (409): a second checkout while a subscription runs
   *  (§14.6) — plan changes go through the portal. */
  alreadySubscribed: string;
  /** `billing_plan_not_sold` (422): the catalogue doesn't sell this plan with that
   *  period or currency. */
  planNotSold: string;
}

/** "today", "tomorrow", "in 5 days". */
function inDays(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export const DEFAULT_BILLING_LABELS: BillingLabels = {
  group: "Subscription",

  plans: "Plans",
  interval: "Billing period",
  yearly: "Yearly",
  monthly: "Monthly",
  currency: "Currency",
  perYear: "per year",
  perMonth: "per month",
  vatIncluded: "VAT included",
  free: "Free",
  notOffered: "Not offered for this billing period",
  unlimited: "Unlimited",
  limits: "Limits",
  features: "Included",
  current: "Current plan",
  choose: (plan) => `Choose ${plan}`,
  upgrade: (plan) => `Upgrade to ${plan}`,
  downgrade: (plan) => `Switch to ${plan}`,
  isCurrent: "This is your current plan.",
  pickFirst: "Pick a plan first.",

  status: {
    trialing: "Trial",
    active: "Active",
    past_due: "Payment overdue",
    canceled: "Cancelled",
    expired: "Expired",
    comped: "Complimentary",
  },

  trialEnding: (days) =>
    `Your trial ends ${inDays(days)}. After that you can still view everything, but changes need a plan.`,
  grantEnding: (days) =>
    `Your free access ends ${inDays(days)}. After that you can still view everything, but changes need a plan.`,
  paymentFailed: "Your last payment didn’t go through. Update your payment method to keep your plan.",
  planEnded: "Your plan has ended. You can still view and export everything; choose a plan to make changes again.",
  guestReadOnly: (item) =>
    item ? `“${item}” is read-only for now; its owner can lift that.` : "This is read-only for now; its owner can lift that.",
  processing: "Your payment is being processed. Your plan starts as soon as it’s confirmed; this page updates by itself.",
  choosePlan: "Choose a plan",
  updatePayment: "Update payment method",
  checkAgain: "Check again",

  lockReason: "Your plan has ended. Choose a plan to make changes again.",

  limitReached: "Plan limit reached",
  limitUpgrade: "To add more, choose a plan with a higher limit.",
  limitContact: "To add more, ask us for a higher limit.",
  askForMore: "Ask for more",
  usage: (used, limit) => `${used} of ${limit}`,
  contactSubject: (dimension) => `Plan limit: ${dimension}`,
  limitUsageLine: (dimension, used, limit) => `${dimension}: ${used} of ${limit}`,

  manage: "Payment and invoices",
  cancel: "Cancel subscription",
  notAtProvider: "Nothing to manage yet. Payments and invoices appear here once you have a paid plan.",

  payOpening: "Opening the secure checkout…",
  payNothing: "There’s no payment to make here. To choose a plan, go back to the app.",
  payFailed: "The checkout couldn’t be opened. Please go back and try again in a moment.",
  payBack: "The checkout was closed. You can go back, or reload this page to open it again.",

  waitingChanges: (count) =>
    count === 1 ? "1 change waiting for a plan" : `${count} changes waiting for a plan`,
  discardWaiting: "Discard waiting changes",

  notConfigured: "Payments aren't set up yet. Please try again later.",
  disabled: "Subscriptions aren't available here.",
  providerUnavailable: "The payment provider can’t be reached right now. Please try again in a moment.",
  alreadySubscribed: "You already have a subscription. To change your plan, go to “Payment and invoices”.",
  planNotSold: "This plan isn’t offered for that billing period or currency. Please choose another.",
};

/** The `billing` namespace, resolved: English, then the provider, then `labels` — which
 *  may be partial at every depth (`{ status: { comped: "Beta" } }`). */
export function useBillingLabels(labels?: LabelOverride<BillingLabels>): BillingLabels {
  return useKitLabels("billing", DEFAULT_BILLING_LABELS, labels as Partial<BillingLabels> | undefined);
}
