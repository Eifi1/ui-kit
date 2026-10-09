import type { DateInput } from "../lib/format";
import type { SubscriptionStatus } from "./billing-labels";
import type { BillingCurrency } from "./plan-price";

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
