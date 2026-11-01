import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CancelSubscriptionConfirm } from "../cancel-subscription";
import { GrantWarningConfirm } from "../plan-card";
import { PlanSwitchConfirm } from "../plan-switch";
import type { PlanSwitchPreview } from "../billing-overview";

/**
 * The three billing confirms close as every other kit dialog does, with `open` +
 * `onClose` (0.52, refactor audit 2026-10-30, API-5; CONTRIBUTING §4). `onOpenChange`,
 * the deprecated alias, went in 0.53.
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

type Close = { onClose: () => void };

const cases = [
  {
    name: "CancelSubscriptionConfirm",
    back: "Back",
    render: (close: Close) => <CancelSubscriptionConfirm open periodEnd="2026-11-09" onConfirm={() => {}} {...close} />,
  },
  {
    name: "PlanSwitchConfirm",
    back: "Cancel",
    render: (close: Close) => (
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
    render: (close: Close) => <GrantWarningConfirm open onConfirm={() => {}} {...close} />,
  },
];

describe.each(cases)("$name closes through onClose", ({ back, render: dialog }) => {
  it("calls onClose on its dismissing button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(dialog({ onClose }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: back }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
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
