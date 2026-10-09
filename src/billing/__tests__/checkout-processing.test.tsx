import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkoutFingerprint, checkoutLanded, noteCheckoutStarted, useCheckoutProcessing } from "../checkout-processing";
import type { CheckoutOverview, CheckoutProcessingOptions } from "../checkout-processing";

/**
 * "Payment processing" after the way back (docs/billing-harmonization.md §12.21, §14.4):
 * keksdose's fingerprint against the departure, bounded, remembered per payer across the
 * whole-page return, and one state for every mounted instance.
 */

const TRIAL: CheckoutOverview = { plan: "free", status: "trialing", source: "trial", in_good_standing: true };
const PAID: CheckoutOverview = {
  plan: "pro",
  status: "active",
  source: "provider",
  in_good_standing: true,
  current_period_end: "2026-11-09T00:00:00Z",
};
/** A beta payer: the grant keeps its status whatever the provider says (§12.11). */
const BETA: CheckoutOverview = { plan: "pro", status: "comped", source: "beta", in_good_standing: true };
/** …who bought: only the period's end moves. */
const BETA_BOUGHT: CheckoutOverview = { ...BETA, current_period_end: "2027-10-09T10:00:00Z" };

describe("checkoutFingerprint and checkoutLanded (§14.4 rule 1)", () => {
  it("sees a trial buying: the status, the plan and the source move", () => {
    const before = checkoutFingerprint(TRIAL);
    expect(checkoutLanded(before, TRIAL)).toBe(false);
    expect(checkoutLanded(before, PAID)).toBe(true);
  });

  it("sees a beta payer buying, though the status stays comped", () => {
    const before = checkoutFingerprint(BETA);
    expect(checkoutLanded(before, BETA)).toBe(false);
    expect(checkoutLanded(before, BETA_BOUGHT)).toBe(true);
  });

  it("waits for active with no departure on record", () => {
    expect(checkoutLanded(null, BETA_BOUGHT)).toBe(false);
    expect(checkoutLanded(null, PAID)).toBe(true);
  });

  it("reads the plan without case and the period's end as an instant", () => {
    expect(checkoutFingerprint({ ...PAID, plan: "PRO", current_period_end: "2026-11-09T00:00:00+00:00" })).toBe(
      checkoutFingerprint(PAID),
    );
  });
});

let keys = 0;
/** A store of its own per test: the module-level stores outlive a test. */
const freshKey = () => `checkout-test-${++keys}`;

type Probe = Omit<CheckoutProcessingOptions, "refetch" | "onConsumed"> & {
  refetchA?: () => unknown;
  refetchB?: () => unknown;
  onConsumed?: () => void;
  hook?: typeof useCheckoutProcessing;
};

/** Two instances side by side — keksdose's banner and its subscription page. */
function Two({ refetchA = () => {}, refetchB = () => {}, onConsumed = () => {}, hook = useCheckoutProcessing, ...rest }: Probe) {
  const a = hook({ ...rest, refetch: refetchA, onConsumed });
  const b = hook({ ...rest, refetch: refetchB, onConsumed });
  return (
    <>
      <span data-testid="a">{String(a.processing)}</span>
      <span data-testid="b">{String(b.processing)}</span>
      <button type="button" onClick={b.checkAgain}>
        check
      </button>
    </>
  );
}

const shown = () => `${screen.getByTestId("a").textContent} ${screen.getByTestId("b").textContent}`;

describe("useCheckoutProcessing (§14.4)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("consumes the marker once, polls with one timer, and lands once for every instance", () => {
    const storageKey = freshKey();
    noteCheckoutStarted(7, TRIAL, { storageKey });
    const onConsumed = vi.fn();
    const refetchA = vi.fn();
    const refetchB = vi.fn();
    const onLanded = vi.fn();
    const props = { payer: 7, storageKey, onConsumed, refetchA, refetchB, onLanded };
    const { rerender } = render(<Two {...props} returned overview={TRIAL} />);

    expect(onConsumed).toHaveBeenCalledTimes(1);
    expect(shown()).toBe("true true");

    // One timer, with the latest mounted instance's refetch.
    act(() => void vi.advanceTimersByTime(8_000));
    expect(refetchB).toHaveBeenCalledTimes(2);
    expect(refetchA).not.toHaveBeenCalled();

    // The app dropped the marker; the overview catches up.
    rerender(<Two {...props} returned={false} overview={TRIAL} />);
    expect(shown()).toBe("true true");
    rerender(<Two {...props} returned={false} overview={PAID} />);
    expect(shown()).toBe("false false");
    expect(onLanded).toHaveBeenCalledTimes(1);

    act(() => void vi.advanceTimersByTime(20_000));
    expect(refetchB).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });

  it("checks again with the overview's refetch", () => {
    const storageKey = freshKey();
    const refetchB = vi.fn(() => Promise.reject(new Error("offline")));
    render(<Two payer={7} storageKey={storageKey} returned={false} overview={TRIAL} refetchB={refetchB} />);
    act(() => screen.getByRole("button", { name: "check" }).click());
    expect(refetchB).toHaveBeenCalledTimes(1);
  });

  it("stops at the timeout, whatever the overview says", () => {
    const storageKey = freshKey();
    noteCheckoutStarted("company:3", BETA, { storageKey });
    const refetchB = vi.fn();
    const { rerender } = render(
      <Two payer="company:3" storageKey={storageKey} returned overview={BETA} refetchB={refetchB} timeoutMs={60_000} />,
    );
    expect(shown()).toBe("true true");
    rerender(
      <Two payer="company:3" storageKey={storageKey} returned={false} overview={BETA} refetchB={refetchB} timeoutMs={60_000} />,
    );
    act(() => void vi.advanceTimersByTime(60_000));
    expect(shown()).toBe("false false");
    const calls = refetchB.mock.calls.length;
    act(() => void vi.advanceTimersByTime(60_000));
    expect(refetchB).toHaveBeenCalledTimes(calls);
  });

  it("remembers the departure across the whole-page return", async () => {
    const storageKey = freshKey();
    noteCheckoutStarted(7, BETA, { storageKey });
    // The provider's page, then a whole-page load back: a new module, the same storage.
    vi.resetModules();
    const fresh = await import("../checkout-processing");
    const onLanded = vi.fn();
    const props = { payer: 7, storageKey, onLanded, hook: fresh.useCheckoutProcessing };
    const { rerender } = render(<Two {...props} returned overview={BETA} />);
    expect(shown()).toBe("true true");
    // Judged against the departure: only the period's end moved, and that is the payment.
    rerender(<Two {...props} returned={false} overview={BETA_BOUGHT} />);
    expect(shown()).toBe("false false");
    expect(onLanded).toHaveBeenCalledTimes(1);
  });

  it("drops a mark that ran out while the page was closed, before it can show", async () => {
    const storageKey = freshKey();
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ payer: "7", before: null, returnedAt: Date.now() - 11 * 60_000 }),
    );
    vi.resetModules();
    const fresh = await import("../checkout-processing");
    render(<Two payer={7} storageKey={storageKey} returned={false} overview={TRIAL} hook={fresh.useCheckoutProcessing} />);
    expect(shown()).toBe("false false");
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });

  it("never lets one payer's mark speak for another", () => {
    const storageKey = freshKey();
    noteCheckoutStarted(7, BETA, { storageKey });
    const { rerender } = render(<Two payer={8} storageKey={storageKey} returned={false} overview={BETA} />);
    expect(shown()).toBe("false false");

    // Payer 8 comes back: the departure was 7's, so 8's return waits for active.
    rerender(<Two payer={8} storageKey={storageKey} returned overview={BETA_BOUGHT} />);
    expect(shown()).toBe("true true");
    rerender(<Two payer={8} storageKey={storageKey} returned={false} overview={PAID} />);
    expect(shown()).toBe("false false");
  });

  it("waits with the marker in the URL until the payer is known", () => {
    const storageKey = freshKey();
    const onConsumed = vi.fn();
    const { rerender } = render(
      <Two payer={null} storageKey={storageKey} returned overview={undefined} onConsumed={onConsumed} />,
    );
    expect(onConsumed).not.toHaveBeenCalled();
    expect(shown()).toBe("false false");
    rerender(<Two payer={7} storageKey={storageKey} returned overview={TRIAL} onConsumed={onConsumed} />);
    expect(onConsumed).toHaveBeenCalledTimes(1);
    expect(shown()).toBe("true true");
  });

  it("works from memory when the browser's storage throws", () => {
    const real = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
    try {
      const storageKey = freshKey();
      expect(() => noteCheckoutStarted(7, TRIAL, { storageKey })).not.toThrow();
      const onLanded = vi.fn();
      const { rerender } = render(<Two payer={7} storageKey={storageKey} returned overview={TRIAL} onLanded={onLanded} />);
      expect(shown()).toBe("true true");
      rerender(<Two payer={7} storageKey={storageKey} returned={false} overview={PAID} onLanded={onLanded} />);
      expect(shown()).toBe("false false");
      expect(onLanded).toHaveBeenCalledTimes(1);
    } finally {
      if (real) Object.defineProperty(window, "localStorage", real);
      else Reflect.deleteProperty(window, "localStorage");
    }
  });
});
