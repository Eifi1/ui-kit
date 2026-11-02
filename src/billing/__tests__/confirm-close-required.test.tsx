import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CancelSubscriptionConfirm } from "../cancel-subscription";
import { GrantWarningConfirm } from "../plan-card";
import { PlanSwitchConfirm } from "../plan-switch";

/**
 * 0.52 code review, cancel-subscription.tsx: 0.52 made `onOpenChange` optional for its
 * deprecation and gave `onClose` beside it as optional too (refactor audit 2026-10-30,
 * API-5), so a billing confirm given NEITHER compiled — and Back, Escape and the backdrop
 * then called nothing. 0.53 removed `onOpenChange`, and `onClose` is required: the type
 * check of this file is the test (`npm run check` runs tsc over the tests).
 */

const SIDE = { plan: "pro", interval: "month" } as const;

describe("the billing confirms require onClose", () => {
  it("refuses a confirm without onClose, and the removed onOpenChange", () => {
    // Never rendered: what matters is what compiles.
    function Confirms() {
      return (
        <>
          {/* @ts-expect-error — no onClose: nothing could dismiss it */}
          <CancelSubscriptionConfirm open periodEnd="2026-11-09" onConfirm={() => {}} />
          {/* @ts-expect-error — no onClose */}
          <PlanSwitchConfirm open from={SIDE} to={SIDE} onConfirm={() => {}} />
          {/* @ts-expect-error — no onClose */}
          <GrantWarningConfirm open onConfirm={() => {}} />
          {/* @ts-expect-error — an explicit undefined is none, too */}
          <GrantWarningConfirm open onClose={undefined} onConfirm={() => {}} />
          {/* @ts-expect-error — `onOpenChange` went in 0.53 (deprecated in 0.52): pass `onClose` */}
          <PlanSwitchConfirm open from={SIDE} to={SIDE} onConfirm={() => {}} onOpenChange={() => {}} />
          <CancelSubscriptionConfirm open periodEnd="2026-11-09" onConfirm={() => {}} onClose={() => {}} />
          <PlanSwitchConfirm open from={SIDE} to={SIDE} onConfirm={() => {}} onClose={() => {}} />
          <GrantWarningConfirm open onConfirm={() => {}} onClose={() => {}} />
        </>
      );
    }
    expect(Confirms).toBeTypeOf("function");
  });

  it("is what each dialog's Back calls", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GrantWarningConfirm open onConfirm={() => {}} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Back" }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
