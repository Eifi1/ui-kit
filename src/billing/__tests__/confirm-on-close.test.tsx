import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CancelSubscriptionConfirm } from "../cancel-subscription";
import { GrantWarningConfirm } from "../plan-card";
import { PlanSwitchConfirm } from "../plan-switch";
import type { PlanSwitchPreview } from "../billing-overview";

/**
 * The three billing confirms close as every other kit dialog does, with `open` +
 * `onClose` (0.52, refactor audit 2026-10-30, API-5; CONTRIBUTING §4). `onOpenChange`
 * stays one minor as the deprecated alias, still called with `false` when it is the only
 * one given; given both, `onClose` alone is called.
 */

const PREVIEW: PlanSwitchPreview = {
  currency: "CHF",
  now_minor: 1250,
  next_minor: 9900,
  next_billed_at: "2026-11-09T10:00:00Z",
  plan: "business",
  interval: "year",
  over_limit: [],
  limits: {},
  usage: {},
};

const cases = [
  {
    name: "CancelSubscriptionConfirm",
    back: "Back",
    render: (close: { onClose?: () => void; onOpenChange?: (open: boolean) => void }) => (
      <CancelSubscriptionConfirm open periodEnd="2026-11-09" onConfirm={() => {}} {...close} />
    ),
  },
  {
    name: "PlanSwitchConfirm",
    back: "Cancel",
    render: (close: { onClose?: () => void; onOpenChange?: (open: boolean) => void }) => (
      <PlanSwitchConfirm
        open
        from={{ plan: "pro", interval: "month" }}
        to={{ plan: "business", interval: "year" }}
        preview={PREVIEW}
        onConfirm={() => {}}
        {...close}
      />
    ),
  },
  {
    name: "GrantWarningConfirm",
    back: "Back",
    render: (close: { onClose?: () => void; onOpenChange?: (open: boolean) => void }) => (
      <GrantWarningConfirm open onConfirm={() => {}} {...close} />
    ),
  },
];

describe.each(cases)("$name closes through onClose", ({ back, render: dialog }) => {
  it("calls onClose on its dismissing button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onOpenChange = vi.fn();
    render(dialog({ onClose, onOpenChange }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: back }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("still calls the deprecated onOpenChange(false) when it is the only one", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(dialog({ onOpenChange }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: back }));
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

describe("GrantWarningConfirm's Buy anyway", () => {
  it("confirms, then closes through onClose", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<GrantWarningConfirm open onConfirm={() => calls.push("confirm")} onClose={() => calls.push("close")} />);
    await user.click(screen.getByRole("button", { name: "Buy anyway" }));
    expect(calls).toEqual(["confirm", "close"]);
  });
});
