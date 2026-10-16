import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";

import type { BillingOverview } from "../billing-overview";

/**
 * 0.40 (docs/billing-harmonization.md §15.2.10, §14.4): the overview's server-computed
 * `switching`, and the pay host's CSP as the contract prints it.
 */

const OVERVIEW_039: Omit<BillingOverview, "switching"> = {
  plan: "plus",
  status: "active",
  source: "provider",
  in_good_standing: true,
  trial_ends_at: null,
  comped_until: null,
  current_period_end: "2027-10-16T00:00:00Z",
  cancel_at_period_end: false,
  limits: { budgets: null },
  usage: { budgets: 3 },
  currency: "CHF",
  at_provider: true,
  paid: { plan: "plus", interval: "year", currency: "CHF" },
};

describe("BillingOverview.switching (0.40, server-kit 0.13)", () => {
  it("is an optional boolean, so a server-kit 0.12 overview still type-checks", () => {
    expectTypeOf<BillingOverview["switching"]>().toEqualTypeOf<boolean | undefined>();
    const older: BillingOverview = OVERVIEW_039;
    const newer: BillingOverview = { ...OVERVIEW_039, switching: true };
    // @ts-expect-error -- a boolean, not the rule's inputs
    const wrong: BillingOverview = { ...OVERVIEW_039, switching: "provider" };
    expect(older.switching).toBeUndefined();
    expect(newer.switching).toBe(true);
    expect(wrong).toBeDefined();
  });
});

describe("§14.4's pay block CSP (0.40, the sandbox run of 2026-10-16)", () => {
  const doc = readFileSync(resolve(__dirname, "../../../docs/billing-harmonization.md"), "utf8");
  const csp = /Content-Security-Policy "([^"]+)"/.exec(doc)?.[1] ?? "";
  const directive = (name: string) =>
    csp
      .split(";")
      .map((d) => d.trim().split(/\s+/))
      .find(([n]) => n === name)
      ?.slice(1);

  it("lets Paddle.js load its overlay stylesheet from either CDN into the pay page", () => {
    expect(directive("style-src")).toEqual([
      "'self'",
      "'unsafe-inline'",
      "https://cdn.paddle.com",
      "https://sandbox-cdn.paddle.com",
    ]);
    // style-src covers <link> stylesheets for every browser; no style-src-elem to drift from it.
    expect(directive("style-src-elem")).toBeUndefined();
  });

  it("keeps the rest as it was: the script from the live CDN only, the frame from buy", () => {
    expect(directive("script-src")).toEqual(["'self'", "https://cdn.paddle.com"]);
    expect(directive("frame-src")).toEqual(["https://buy.paddle.com", "https://sandbox-buy.paddle.com"]);
    expect(directive("default-src")).toEqual(["'none'"]);
  });
});
