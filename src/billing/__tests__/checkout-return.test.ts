import { describe, expect, it } from "vitest";

import {
  CHECKOUT_RETURN_PARAM,
  CHECKOUT_RETURN_VALUE,
  checkoutReturnUrl,
  isCheckoutReturn,
  withoutCheckoutReturn,
} from "../checkout-return";

/**
 * The way back from a checkout (docs/billing-harmonization.md §14.4): `?checkout=done` on
 * the app's subscription page, read however the app holds its URL, and dropped with
 * everything else kept.
 */
describe("the checkout return marker (§14.4)", () => {
  it("is checkout=done, as server-kit names it", () => {
    expect(CHECKOUT_RETURN_PARAM).toBe("checkout");
    expect(CHECKOUT_RETURN_VALUE).toBe("done");
  });

  it("is read from a search string, a whole URL, URLSearchParams or a location", () => {
    expect(isCheckoutReturn("?checkout=done")).toBe(true);
    expect(isCheckoutReturn("checkout=done&tab=plans")).toBe(true);
    expect(isCheckoutReturn("https://keksdose.app/settings/subscription?a=1&checkout=done#plans")).toBe(true);
    expect(isCheckoutReturn(new URLSearchParams("checkout=done"))).toBe(true);
    expect(isCheckoutReturn({ search: "?checkout=done" })).toBe(true);

    expect(isCheckoutReturn("")).toBe(false);
    expect(isCheckoutReturn("?checkout=cancelled")).toBe(false);
    expect(isCheckoutReturn("?tab=plans#checkout=done")).toBe(false);
    expect(isCheckoutReturn({ search: "" })).toBe(false);
  });

  it("drops only the marker, keeping every other parameter in order, in a new object", () => {
    const params = new URLSearchParams("tab=plans&checkout=done&q=a+b");
    const next = withoutCheckoutReturn(params);
    expect(next.toString()).toBe("tab=plans&q=a+b");
    expect(params.get("checkout")).toBe("done");
  });

  it("builds the way-back URL after the page's own query and before its hash", () => {
    expect(checkoutReturnUrl("https://keksdose.app/settings/subscription")).toBe(
      "https://keksdose.app/settings/subscription?checkout=done",
    );
    expect(checkoutReturnUrl("https://kastlan.app/admin/billing?company=7#plans")).toBe(
      "https://kastlan.app/admin/billing?company=7&checkout=done#plans",
    );
    // The page's own parameters as written: no re-encoding of a space or a %.
    expect(checkoutReturnUrl("/settings/subscription?q=a%20b&r=c+d")).toBe(
      "/settings/subscription?q=a%20b&r=c+d&checkout=done",
    );
  });

  it("replaces a marker already there instead of doubling it", () => {
    expect(checkoutReturnUrl("https://app.example/s?checkout=pending&x=1")).toBe(
      "https://app.example/s?x=1&checkout=done",
    );
    expect(checkoutReturnUrl("https://app.example/s?checkout=done")).toBe("https://app.example/s?checkout=done");
  });
});
