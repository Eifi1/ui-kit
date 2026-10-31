import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CancelSubscriptionConfirm } from "../cancel-subscription";
import { dialogClose } from "../dialog-close";
import { GrantWarningConfirm } from "../plan-card";
import { PlanSwitchConfirm } from "../plan-switch";

/**
 * 0.52 code review, cancel-subscription.tsx: 0.52 made `onOpenChange` optional for its
 * deprecation and gave `onClose` beside it as optional too (refactor audit 2026-10-30,
 * API-5), so a billing confirm given NEITHER compiled — and Back, Escape and the backdrop
 * then called nothing. 0.51's compiler required `onOpenChange`. One of the two is required
 * now; the type check of this file is the test (`npm run check` runs tsc over the tests),
 * and the fallback between the two is one helper, not three copies.
 */

const SIDE = { plan: "pro", interval: "month" } as const;

describe("the billing confirms require one close", () => {
  it("refuses a confirm with neither onClose nor onOpenChange, and takes either or both", () => {
    // Never rendered: what matters is what compiles.
    function Confirms() {
      return (
        <>
          {/* @ts-expect-error — neither onClose nor onOpenChange: nothing could dismiss it */}
          <CancelSubscriptionConfirm open periodEnd="2026-11-09" onConfirm={() => {}} />
          {/* @ts-expect-error — neither onClose nor onOpenChange */}
          <PlanSwitchConfirm open from={SIDE} to={SIDE} onConfirm={() => {}} />
          {/* @ts-expect-error — neither onClose nor onOpenChange */}
          <GrantWarningConfirm open onConfirm={() => {}} />
          {/* @ts-expect-error — an explicit undefined is neither, too */}
          <GrantWarningConfirm open onClose={undefined} onConfirm={() => {}} />
          <CancelSubscriptionConfirm open periodEnd="2026-11-09" onConfirm={() => {}} onClose={() => {}} />
          <PlanSwitchConfirm open from={SIDE} to={SIDE} onConfirm={() => {}} onOpenChange={() => {}} />
          <GrantWarningConfirm open onConfirm={() => {}} onClose={() => {}} onOpenChange={() => {}} />
        </>
      );
    }
    expect(Confirms).toBeTypeOf("function");
  });
});

describe("dialogClose — the billing confirms' one close", () => {
  it("calls onClose when given, else onOpenChange(false)", () => {
    const onClose = vi.fn();
    const onOpenChange = vi.fn();
    dialogClose({ onClose, onOpenChange })();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
    dialogClose({ onOpenChange })();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("is what each dialog's Back calls", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<GrantWarningConfirm open onConfirm={() => {}} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Back" }));
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
