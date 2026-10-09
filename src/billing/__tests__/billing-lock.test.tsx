import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "../../components/ui";
import { COMMIT_EXCEPT_BILLING, WriteLockProvider } from "../../components/write-lock";
import { combineWriteLocks, useBillingLockReason, useBillingWriteLock } from "../billing-lock";
import { billingDaysLeft, billingLockAt, isBillingReadOnly } from "../billing-standing";

/**
 * The read-only lock (docs/billing-harmonization.md §3.3, §12.5, §12.6): one
 * `WriteLockProvider` for the demo's and billing's reasons, billing's sentence for a
 * payer and for a guest, and the dates a device locks itself at.
 */

const DEMO = "Not possible in the demo.";
const PAYER = "Your plan has ended. Choose a plan to make changes again.";

function Save({ lock }: { lock: { locked: boolean; reason: React.ReactNode } }) {
  return (
    <WriteLockProvider {...lock}>
      <Button commit>Save</Button>
    </WriteLockProvider>
  );
}

const reasonOf = () => {
  const save = screen.getByRole("button", { name: "Save" });
  return save.getAttribute("aria-disabled") === "true"
    ? document.getElementById(save.getAttribute("aria-describedby") ?? "")?.textContent
    : null;
};

describe("combineWriteLocks — one provider, the first locked reason (§12.6)", () => {
  it("locks when any source does, with the first locked source's sentence", () => {
    const { rerender } = render(
      <Save lock={combineWriteLocks([{ locked: false, reason: DEMO }, { locked: true, reason: PAYER }])} />,
    );
    expect(reasonOf()).toBe(PAYER);
    // The demo's refusal comes first on the server (§12.3), so its sentence does here.
    rerender(<Save lock={combineWriteLocks([{ locked: true, reason: DEMO }, { locked: true, reason: PAYER }])} />);
    expect(reasonOf()).toBe(DEMO);
    rerender(<Save lock={combineWriteLocks([{ locked: false, reason: DEMO }, { locked: false, reason: PAYER }])} />);
    expect(reasonOf()).toBeNull();
  });

  it("skips null, undefined and false entries", () => {
    expect(combineWriteLocks([null, undefined, false])).toEqual({ locked: false, reason: undefined, holds: [] });
    expect(combineWriteLocks([false, { locked: true, reason: PAYER }])).toEqual({
      locked: true,
      reason: PAYER,
      holds: [{ kind: undefined, reason: PAYER }],
    });
  });

  it("holds every locked source with its kind, in order (§12.36)", () => {
    expect(
      combineWriteLocks([
        { locked: true, reason: DEMO, kind: "demo" },
        { locked: false, reason: "Shared with you to read.", kind: "access" },
        { locked: true, reason: PAYER, kind: "billing" },
      ]),
    ).toEqual({
      locked: true,
      reason: DEMO,
      holds: [
        { kind: "demo", reason: DEMO },
        { kind: "billing", reason: PAYER },
      ],
    });
  });

  it("lets a control exempt from billing through billing's lock, but not the demo's", () => {
    const Remove = ({ lock }: { lock: ReturnType<typeof combineWriteLocks> }) => (
      <WriteLockProvider {...lock}>
        <Button commit={COMMIT_EXCEPT_BILLING}>Remove</Button>
      </WriteLockProvider>
    );
    const billing = { locked: true, reason: PAYER, kind: "billing" as const };
    const demo = { locked: true, reason: DEMO, kind: "demo" as const };
    const removeReason = () => {
      const remove = screen.getByRole("button", { name: "Remove" });
      return remove.getAttribute("aria-disabled") === "true"
        ? document.getElementById(remove.getAttribute("aria-describedby") ?? "")?.textContent
        : null;
    };
    const { rerender } = render(<Remove lock={combineWriteLocks([billing])} />);
    expect(removeReason()).toBeNull();
    rerender(<Remove lock={combineWriteLocks([demo, billing])} />);
    expect(removeReason()).toBe(DEMO);
  });

  it("does what two nested providers cannot: an unlocked billing source leaves the demo's lock on", () => {
    // Nested, the inner `locked={false}` reopens the outer lock (write-lock.tsx) …
    render(
      <WriteLockProvider locked reason={DEMO}>
        <WriteLockProvider locked={false}>
          <Button commit>Save</Button>
        </WriteLockProvider>
      </WriteLockProvider>,
    );
    expect(reasonOf()).toBeNull();
  });
});

describe("useBillingWriteLock — billing's lock as one source (§12.36)", () => {
  it("is kind billing, with the payer's or the guest's sentence", () => {
    expect(renderHook(() => useBillingWriteLock(true)).result.current).toEqual({
      locked: true,
      reason: PAYER,
      kind: "billing",
    });
    expect(renderHook(() => useBillingWriteLock(false, { guest: true })).result.current).toEqual({
      locked: false,
      reason: "This is read-only for now; its owner can lift that.",
      kind: "billing",
    });
  });
});

describe("useBillingLockReason — the payer's sentence, or the guest's (§3.3, §12.6)", () => {
  it("says the payer's plan ended, and tells a guest only 'for now'", () => {
    expect(renderHook(() => useBillingLockReason()).result.current).toBe(PAYER);
    expect(renderHook(() => useBillingLockReason({ guest: true })).result.current).toBe(
      "This is read-only for now; its owner can lift that.",
    );
    expect(renderHook(() => useBillingLockReason({ guest: true, item: "Allotment 7" })).result.current).toBe(
      "“Allotment 7” is read-only for now; its owner can lift that.",
    );
  });
});

describe("the dates a device locks itself at (§12.5)", () => {
  const NOW = Date.parse("2026-11-07T12:00:00Z");

  it("locks a trial at trial_ends_at and a grant at comped_until, nothing else by date", () => {
    expect(billingLockAt({ status: "trialing", in_good_standing: true, trial_ends_at: "2026-11-08T00:00:00Z" })).toEqual(
      new Date("2026-11-08T00:00:00Z"),
    );
    expect(billingLockAt({ status: "comped", in_good_standing: true, comped_until: "2027-10-07T00:00:00Z" })).toEqual(
      new Date("2027-10-07T00:00:00Z"),
    );
    // A pure guest's trial has not started (§12.9); a grant may have no end (§12.8).
    expect(billingLockAt({ status: "trialing", in_good_standing: true, trial_ends_at: null })).toBeNull();
    expect(billingLockAt({ status: "comped", in_good_standing: true })).toBeNull();
    // past_due → expired waits for the provider's retries, and the next sync.
    expect(billingLockAt({ status: "past_due", in_good_standing: true })).toBeNull();
  });

  it("is read-only when the server said so, or once a known date has passed", () => {
    const trial = { status: "trialing" as const, in_good_standing: true, trial_ends_at: "2026-11-07T11:59:00Z" };
    expect(isBillingReadOnly(trial, NOW)).toBe(true);
    expect(isBillingReadOnly({ ...trial, trial_ends_at: "2026-11-07T12:01:00Z" }, NOW)).toBe(false);
    expect(isBillingReadOnly({ status: "active", in_good_standing: true }, NOW)).toBe(false);
    expect(isBillingReadOnly({ status: "expired", in_good_standing: false }, NOW)).toBe(true);
    expect(isBillingReadOnly({ status: "comped", in_good_standing: true, comped_until: null }, new Date(NOW))).toBe(false);
  });

  it("counts calendar days in the device's zone: 0 today, 1 tomorrow, never below 0", () => {
    // The suite runs in Europe/Berlin (vitest.config.ts).
    const noon = new Date(2026, 10, 7, 12, 0);
    expect(billingDaysLeft(new Date(2026, 10, 7, 23, 59), noon)).toBe(0);
    expect(billingDaysLeft(new Date(2026, 10, 8, 1, 0), noon)).toBe(1);
    expect(billingDaysLeft(new Date(2026, 10, 14, 0, 0), noon)).toBe(7);
    expect(billingDaysLeft(new Date(2026, 10, 1), noon)).toBe(0);
    // Across the end of summer time (25 October 2026), still whole days.
    expect(billingDaysLeft(new Date(2026, 9, 30, 9, 0), new Date(2026, 9, 20, 9, 0))).toBe(10);
    expect(billingDaysLeft(null, noon)).toBeNull();
    expect(billingDaysLeft("not a date", noon)).toBeNull();
  });
});
