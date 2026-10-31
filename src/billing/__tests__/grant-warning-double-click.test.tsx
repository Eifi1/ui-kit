import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_BILLING_LABELS } from "../billing-labels";
import { GrantWarningConfirm, PlanPicker } from "../plan-card";
import type { BillingPlan } from "../plan-card";
import { stubDesktop } from "../../test/viewport";

/**
 * 0.52 code review, plan-card.tsx: "Buy anyway" called the `close` that DialogFrame hands
 * `actions` — the panel's ANIMATED close, which shadowed the dialog's own and reports the
 * close 220 ms later. PlanPicker cleared its `warned` choice only then, and the panel is
 * deliberately not inert while it lowers (a tap must not fall through to the page), so a
 * double click on "Buy anyway" started the checkout twice. Before 0.52 the button closed
 * through the caller at once, `warned` was null for the second click, and it did nothing.
 */

const PLANS: BillingPlan[] = [
  { code: "free", name: "Seedling" },
  { code: "pro", name: "Gardener", prices: { CHF: { year: 4900, month: 490 } } },
];

afterEach(() => vi.unstubAllGlobals());

describe("GrantWarningConfirm's Buy anyway, pressed twice while the panel lowers", () => {
  it("starts the checkout once", () => {
    // Motion on: jsdom's missing `matchMedia` reads as "no animation", which closes at once.
    stubDesktop({ reducedMotion: false });
    const onChoose = vi.fn();
    render(<PlanPicker plans={PLANS} defaultValue="pro" defaultCurrency="CHF" permanentGrant onChoose={onChoose} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Gardener" }));
    const dialog = screen.getByRole("dialog", { name: DEFAULT_BILLING_LABELS.grantWarningTitle });
    const buy = within(dialog).getByRole("button", { name: "Buy anyway" });
    fireEvent.click(buy);
    // The same button, still on screen during the exit.
    expect(buy).toBeInTheDocument();
    fireEvent.click(buy);
    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});

describe("GrantWarningConfirm shown by the app itself (keksdose's fallback to a checkout)", () => {
  function Fallback({ onConfirm }: { onConfirm: () => void }) {
    const [open, setOpen] = useState(true);
    return <GrantWarningConfirm open={open} onClose={() => setOpen(false)} onConfirm={onConfirm} />;
  }

  it("confirms once, however often the lowering panel's button is pressed", () => {
    stubDesktop({ reducedMotion: false });
    const onConfirm = vi.fn();
    render(<Fallback onConfirm={onConfirm} />);
    const buy = screen.getByRole("button", { name: "Buy anyway" });
    fireEvent.click(buy);
    expect(buy).toBeInTheDocument();
    fireEvent.click(buy);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
