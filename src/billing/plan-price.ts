import { currencyMinorDigits, formatMoney } from "../lib/format";

/**
 * Money and periods of the plan catalogue (docs/billing-harmonization.md §3.1, §4, §12.17).
 *
 * Money crosses the wire as INTEGER MINOR UNITS plus an ISO currency, never as a float
 * (§4): 4900 CHF is CHF 49.00. The kit turns it into the reader's notation with
 * `formatMoney`, so no app divides by 100 by hand.
 */

/** A billing period: the provider charges per month or per year. */
export type BillingInterval = "month" | "year";

/** The two currencies every app sells in (§2.6). */
export type BillingCurrency = "CHF" | "EUR";

/**
 * The periods in the order the picker offers them — YEARLY FIRST (§12.17): a Merchant of
 * Record takes about 5 % + 0.50 per transaction, so a small monthly price loses a fifth
 * of itself (CHF 3 a month loses about 22 %). The page leads with the yearly price.
 */
export const BILLING_INTERVALS: readonly BillingInterval[] = Object.freeze(["year", "month"]);

/** One currency's prices, in minor units, per period. A period left out is not offered. */
export type PlanIntervalPrices = Partial<Record<BillingInterval, number>>;

/** A plan's prices as server-kit's `PlanSpec.prices` sends them: currency → period →
 *  minor units, GROSS (§12.17). */
export type PlanPrices = Partial<Record<BillingCurrency, PlanIntervalPrices>>;

/**
 * What one plan costs in one currency and period:
 * - `price` — a gross amount in minor units;
 * - `free` — a plan with no prices at all (keksdose's free plan), or a price of 0;
 * - `not-offered` — a plan with prices, but none for this currency and period.
 */
export type PlanPriceAnswer =
  | { kind: "price"; minor: number }
  | { kind: "free" }
  | { kind: "not-offered" };

/** Whether a price table holds any figure at all. */
function hasAnyPrice(prices: PlanPrices | null | undefined): boolean {
  if (!prices) return false;
  return Object.values(prices).some(
    (byInterval) => byInterval && Object.values(byInterval).some((v) => typeof v === "number"),
  );
}

/** What `prices` says for `currency` and `interval` — see {@link PlanPriceAnswer}. */
export function planPrice(
  prices: PlanPrices | null | undefined,
  currency: BillingCurrency,
  interval: BillingInterval,
): PlanPriceAnswer {
  const minor = prices?.[currency]?.[interval];
  if (typeof minor === "number" && Number.isFinite(minor)) {
    return minor === 0 ? { kind: "free" } : { kind: "price", minor };
  }
  return hasAnyPrice(prices) ? { kind: "not-offered" } : { kind: "free" };
}

/** Minor units as the amount: 4900 CHF → 49, 1250 EUR → 12.5. The currency's minor unit
 *  comes from `Intl` (CHF and EUR have 2); a code `Intl` cannot read counts as 2. */
export function minorToMajor(minor: number, currency: string): number {
  const digits = currencyMinorDigits(currency) ?? 2;
  return minor / 10 ** digits;
}

/**
 * A price in minor units, in the reader's notation: "CHF 49", "CHF 4.90", "49 €",
 * "4,90 €". A whole amount drops its decimals — a price list reads "CHF 49" — and any
 * other keeps all of them ("CHF 4.90", never "CHF 4.9").
 */
export function formatPlanPrice(minor: number, currency: string, options: { locale?: string } = {}): string {
  const digits = currencyMinorDigits(currency) ?? 2;
  const whole = Number.isInteger(minor) && minor % 10 ** digits === 0;
  return formatMoney(minorToMajor(minor, currency), currency, {
    locale: options.locale,
    digits: whole ? 0 : digits,
  });
}

/**
 * The currency a payer starts with when the app stores none (§12.18): francs where the
 * locale's region is Switzerland or Liechtenstein, euros everywhere else — "de-CH" and
 * "fr-CH" CHF, "de" (Germany, once `Intl` fills the region in) and "it" EUR.
 *
 * Only the fallback: an account's stored currency comes first (keksdose's
 * `reporting_currency` — a de-CH speaker living in Germany pays in euros), and the payer
 * may switch in the picker either way; checkout takes the one they leave it on (§4).
 */
export function billingCurrencyFor(locale?: string): BillingCurrency {
  if (!locale) return "EUR";
  try {
    const region = new Intl.Locale(locale).maximize().region;
    return region === "CH" || region === "LI" ? "CHF" : "EUR";
  } catch {
    return "EUR";
  }
}
