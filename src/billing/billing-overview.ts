import type { DateInput } from "../lib/format";
import type { SubscriptionStatus } from "./billing-labels";
import type { BillingCurrency, BillingInterval } from "./plan-price";

/**
 * The billing API's shapes the kit's parts read (docs/billing-harmonization.md §4,
 * §14.5) — server-kit 0.7's schemas, field for field under their wire names, for an app
 * whose client is hand-written (kastlan's `features/billing/types.ts`, Kurvenschmiede's
 * `shared/types/billing.ts`, which no mirror test covers).
 */

/** Where a row's current state came from (server-kit's `SubscriptionSource`, §3.2). */
export type SubscriptionSource = "trial" | "provider" | "manual" | "beta";

/** `GET /billing/overview` (§4): where the payer's subscription stands, what the plan
 *  allows and what is used. Only ever the payer's own (§12.6). */
export interface BillingOverview {
  /** The plan's code, lowercase (§3.1). */
  plan: string;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  /** False: read-only (§3.3). */
  in_good_standing: boolean;
  trial_ends_at: DateInput;
  /** When the free grant ends; null: no end. */
  comped_until: DateInput;
  current_period_end: DateInput;
  cancel_at_period_end: boolean;
  /** Dimension → limit; null for unlimited. */
  limits: Record<string, number | null>;
  /** What the payer has, per dimension (§12.15). */
  usage: Record<string, number>;
  currency: BillingCurrency;
  /**
   * 0.7 (§14.5): the provider has a customer for this payer, whatever the status or the
   * source — `SubscriptionActions`' `atProvider`. False: "nothing to manage yet", and a
   * portal request would answer `409 billing_not_at_provider`.
   */
  at_provider: boolean;
  /**
   * 0.39 (server-kit 0.12, §15.2.10): the price the payer pays at the provider — its
   * plan, period and currency — or null with none (a trial, a grant without a purchase).
   * Under a grant the row keeps the grant's plan, status and source (§12.11), so this
   * is what shows that a switch landed; `checkoutFingerprint` reads it.
   */
  paid: PaidPrice | null;
}

/** 0.39: what the payer pays at the provider (server-kit's `PaidPrice`, §15.2.10),
 *  read from the row's `provider_price_id`. */
export interface PaidPrice {
  /** The plan's code, lowercase. */
  plan: string;
  interval: BillingInterval;
  currency: BillingCurrency;
}

/** 0.39: `POST /billing/plan/preview` and `POST /billing/plan`'s body (server-kit's
 *  `PlanSwitchRequest`, §15.2.10) — the plan and period to switch to. The currency stays
 *  the subscription's. */
export interface PlanSwitchRequest {
  plan: string;
  interval: BillingInterval;
}

/**
 * 0.39: what a plan switch costs — or did (server-kit's `PlanSwitchPreview`, §15.2.10):
 * Paddle's preview, prorated at once, both routes' answer. `PlanSwitchConfirm` shows it
 * before the payer agrees.
 */
export interface PlanSwitchPreview {
  /** The subscription's currency. */
  currency: BillingCurrency;
  /** Charged at once, in minor units: an upgrade's prorated difference — or, negative, a
   *  downgrade's credit to the customer's balance, which Paddle takes off the next
   *  charges. */
  now_minor: number;
  /** The next regular charge, in minor units. */
  next_minor?: number | null;
  /** When it is charged; null when Paddle names no date. */
  next_billed_at?: string | null;
  /** The plan and period switched to. */
  plan: string;
  interval: BillingInterval;
  /** The dimensions whose usage is over the new plan's limit (§3.4: a limit gates
   *  creation only — the switch is allowed). */
  over_limit: string[];
  /** The new plan's limits; null for unlimited. */
  limits: Record<string, number | null>;
  /** What the payer has, per dimension. */
  usage: Record<string, number>;
}

/**
 * Where in the provider's portal a request lands (server-kit's `PortalTarget`, §14.5):
 *
 * - `overview` — "Payment and invoices";
 * - `cancel` — "Cancel subscription": the subscription's cancel link (§12.26);
 * - `payment_method` — the payment-failed banner's "Update payment method".
 *
 * The server answers the overview where Paddle gives no such link (a paused or cancelled
 * subscription).
 */
export type PortalTarget = "overview" | "cancel" | "payment_method";

/** `POST /billing/portal`'s optional body (server-kit's `PortalRequest`, §14.5); left
 *  out, the overview. The answer is `{url}`, a fresh link that is never stored. */
export interface PortalRequest {
  target?: PortalTarget;
}
