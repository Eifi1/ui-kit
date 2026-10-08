import { describe, expect, it } from "vitest";

import { BILLING_INTERVALS, billingCurrencyFor, formatPlanPrice, minorToMajor, planPrice } from "../plan-price";
import type { PlanPrices } from "../plan-price";

/** `Intl` separates figure and symbol with a no-break space (U+00A0, U+202F). */
const plain = (s: string) => s.replace(/\s/g, " ");

const PRO: PlanPrices = {
  CHF: { year: 4900, month: 490 },
  EUR: { year: 4500, month: 450 },
};

describe("planPrice — the catalogue's figure for a currency and a period (§3.1)", () => {
  it("reads minor units per currency and period", () => {
    expect(planPrice(PRO, "CHF", "year")).toEqual({ kind: "price", minor: 4900 });
    expect(planPrice(PRO, "CHF", "month")).toEqual({ kind: "price", minor: 490 });
    expect(planPrice(PRO, "EUR", "year")).toEqual({ kind: "price", minor: 4500 });
    expect(planPrice(PRO, "EUR", "month")).toEqual({ kind: "price", minor: 450 });
  });

  it("calls a plan with no prices, or a price of 0, free", () => {
    expect(planPrice(undefined, "CHF", "year")).toEqual({ kind: "free" });
    expect(planPrice(null, "EUR", "month")).toEqual({ kind: "free" });
    expect(planPrice({}, "EUR", "month")).toEqual({ kind: "free" });
    expect(planPrice({ CHF: { year: 0, month: 0 } }, "CHF", "month")).toEqual({ kind: "free" });
  });

  it("says a priced plan without this currency or period is not offered", () => {
    const yearlyOnly: PlanPrices = { CHF: { year: 9900 } };
    expect(planPrice(yearlyOnly, "CHF", "month")).toEqual({ kind: "not-offered" });
    expect(planPrice(yearlyOnly, "EUR", "year")).toEqual({ kind: "not-offered" });
  });
});

describe("formatPlanPrice — gross minor units in the reader's notation (§4)", () => {
  it("drops the decimals of a whole amount and keeps both of any other", () => {
    expect(plain(formatPlanPrice(4900, "CHF", { locale: "en-GB" }))).toBe("CHF 49");
    expect(plain(formatPlanPrice(490, "CHF", { locale: "en-GB" }))).toBe("CHF 4.90");
    expect(plain(formatPlanPrice(4900, "CHF", { locale: "de-CH" }))).toBe("CHF 49");
    expect(plain(formatPlanPrice(450, "EUR", { locale: "de-DE" }))).toBe("4,50 €");
    expect(plain(formatPlanPrice(4500, "EUR", { locale: "de-DE" }))).toBe("45 €");
    expect(plain(formatPlanPrice(129000, "EUR", { locale: "en-GB" }))).toBe("€1,290");
  });

  it("divides by the currency's own minor unit", () => {
    expect(minorToMajor(4900, "CHF")).toBe(49);
    expect(minorToMajor(1250, "EUR")).toBe(12.5);
    expect(minorToMajor(500, "JPY")).toBe(500);
  });
});

describe("the periods and the default currency", () => {
  it("offers yearly first (§12.17)", () => {
    expect(BILLING_INTERVALS).toEqual(["year", "month"]);
  });

  it("starts in francs in Switzerland and Liechtenstein, in euros elsewhere (§12.18)", () => {
    expect(billingCurrencyFor("de-CH")).toBe("CHF");
    expect(billingCurrencyFor("fr-CH")).toBe("CHF");
    expect(billingCurrencyFor("de-LI")).toBe("CHF");
    expect(billingCurrencyFor("de")).toBe("EUR");
    expect(billingCurrencyFor("it")).toBe("EUR");
    expect(billingCurrencyFor(undefined)).toBe("EUR");
    expect(billingCurrencyFor("not a locale!")).toBe("EUR");
  });
});
