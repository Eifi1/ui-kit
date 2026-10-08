import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { DEFAULT_BILLING_LABELS, SUBSCRIPTION_STATUSES } from "../billing-labels";
import { BillingBanner } from "../billing-banner";
import { PlanLimitNotice } from "../plan-limit-notice";
import { SUBSCRIPTION_STATUS_TONES, SubscriptionStatusChip } from "../subscription-status-chip";
import { SubscriptionActions } from "../subscription-actions";

/**
 * The status chip, the banners, the plan-limit notice and the portal actions
 * (docs/billing-harmonization.md §3.3, §3.4, §6, §7, §12.6, §12.21, §12.26). A made-up
 * app, "Ada's Garden Planner"; every action is a callback or a link — the kit sends
 * nothing.
 */

const plain = (s: string | null | undefined) => (s ?? "").replace(/\s/g, " ");
const banner = (kind: string) => document.querySelector(`[data-billing-banner="${kind}"]`) as HTMLElement;

describe("SubscriptionStatusChip — the status vocabulary (§3.2, §6)", () => {
  const WORDS = {
    trialing: "Trial",
    active: "Active",
    past_due: "Payment overdue",
    canceled: "Cancelled",
    expired: "Expired",
    comped: "Complimentary",
  } as const;

  it("says every status in a word, with a tone of its own", () => {
    render(
      <>
        {SUBSCRIPTION_STATUSES.map((s) => (
          <SubscriptionStatusChip key={s} status={s} />
        ))}
      </>,
    );
    for (const status of SUBSCRIPTION_STATUSES) {
      const chip = document.querySelector(`[data-status="${status}"]`);
      expect(chip).toHaveTextContent(WORDS[status]);
    }
    expect(SUBSCRIPTION_STATUS_TONES).toEqual({
      trialing: "info",
      active: "success",
      past_due: "warning",
      canceled: "neutral",
      expired: "danger",
      comped: "purple",
    });
    // Every tone is paired with a different word — never colour alone.
    expect(new Set(Object.values(WORDS)).size).toBe(SUBSCRIPTION_STATUSES.length);
  });

  it("shows an unknown status as itself, renders nothing for none, and takes the app's words", () => {
    const { container, rerender } = render(<SubscriptionStatusChip status="paused" />);
    expect(container).toHaveTextContent("paused");
    rerender(<SubscriptionStatusChip status="toString" />);
    expect(container).toHaveTextContent("toString");
    rerender(<SubscriptionStatusChip status={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(
      <UiKitProvider labels={{ billing: { status: { comped: "Beta" } } } as never}>
        <SubscriptionStatusChip status="comped" />
      </UiKitProvider>,
    );
    expect(container).toHaveTextContent("Beta");
  });
});

describe("BillingBanner — the presets (§3.3, §12.6, §12.21)", () => {
  it("counts down an ending trial and grant, info first and a warning in the last days", () => {
    render(
      <>
        <BillingBanner kind="trial-ending" daysLeft={5} actionHref="/settings/subscription" />
        <BillingBanner kind="grant-ending" daysLeft={1} actionHref="/settings/subscription" />
      </>,
    );
    const trial = banner("trial-ending");
    expect(trial).toHaveTextContent("Your trial ends in 5 days.");
    expect(trial.className).toContain("--info-bg");
    expect(within(trial).getByRole("link", { name: "Choose a plan" })).toHaveAttribute("href", "/settings/subscription");

    const grant = banner("grant-ending");
    expect(grant).toHaveTextContent("Your free access ends tomorrow.");
    expect(grant.className).toContain("--warning-bg");
  });

  it("says today at zero", () => {
    render(<BillingBanner kind="trial-ending" daysLeft={0} />);
    expect(banner("trial-ending")).toHaveTextContent("Your trial ends today.");
  });

  it("asks a failed payment to be fixed through the app's callback", async () => {
    const user = userEvent.setup();
    const openPortal = vi.fn();
    render(<BillingBanner kind="payment-failed" onAction={openPortal} />);
    const failed = banner("payment-failed");
    expect(failed).toHaveTextContent("Your last payment didn’t go through.");
    expect(failed.className).toContain("--danger-bg");
    await user.click(within(failed).getByRole("button", { name: "Update payment method" }));
    expect(openPortal).toHaveBeenCalledTimes(1);
  });

  it("says a plan ended leaves everything readable, and offers a plan", () => {
    render(<BillingBanner kind="plan-ended" actionHref="/settings/subscription" />);
    const ended = banner("plan-ended");
    expect(ended).toHaveTextContent("Your plan has ended. You can still view and export everything");
    expect(within(ended).getByRole("link", { name: "Choose a plan" })).toBeInTheDocument();
  });

  it("tells a guest only 'for now' — never a status word (§12.6)", () => {
    const { rerender } = render(<BillingBanner kind="guest" item="Allotment 7" />);
    const words = () => plain(banner("guest").textContent);
    expect(words()).toBe("“Allotment 7” is read-only for now; its owner can lift that.");
    rerender(<BillingBanner kind="guest" />);
    expect(words()).toBe("This is read-only for now; its owner can lift that.");
    // No status, no payment, no plan state: the owner's personal data stays theirs.
    const leaks = [
      ...Object.values(DEFAULT_BILLING_LABELS.status),
      "trial",
      "payment",
      "paid",
      "plan has ended",
      "expired",
      "overdue",
      "subscription",
    ];
    for (const word of leaks) expect(words().toLowerCase()).not.toContain(word.toLowerCase());
    // …and no action of its own.
    expect(within(banner("guest")).queryByRole("button")).toBeNull();
    expect(within(banner("guest")).queryByRole("link")).toBeNull();
  });

  it("shows payment processing as a live status after checkout (§12.21)", async () => {
    const user = userEvent.setup();
    const recheck = vi.fn();
    render(<BillingBanner kind="processing" onAction={recheck} />);
    const processing = banner("processing");
    expect(processing).toHaveAttribute("role", "status");
    expect(processing).toHaveTextContent("Your payment is being processed.");
    await user.click(within(processing).getByRole("button", { name: "Check again" }));
    expect(recheck).toHaveBeenCalled();
  });

  it("draws no button without the app's action, and takes the app's words and tone", () => {
    render(
      <>
        <BillingBanner kind="plan-ended" />
        <BillingBanner kind="guest" onAction={() => {}} actionLabel="Ask the owner" tone="warning" />
      </>,
    );
    expect(within(banner("plan-ended")).queryByRole("button")).toBeNull();
    expect(within(banner("plan-ended")).queryByRole("link")).toBeNull();
    expect(within(banner("guest")).getByRole("button", { name: "Ask the owner" })).toBeInTheDocument();
    expect(banner("guest").className).toContain("--warning-bg");
  });
});

describe("PlanLimitNotice — both modes (§3.4)", () => {
  it("upgrade: the meter and a link to the subscription page", () => {
    render(
      <PlanLimitNotice
        mode="upgrade"
        href="/settings/subscription"
        dimension="beds"
        dimensionLabel="Beds"
        plan="free"
        used={2}
        limit={2}
      />,
    );
    const notice = document.querySelector('[data-plan-limit-mode="upgrade"]') as HTMLElement;
    expect(notice).toHaveAttribute("data-dimension", "beds");
    expect(notice).toHaveTextContent("Plan limit reached");
    expect(notice).toHaveTextContent("To add more, choose a plan with a higher limit.");
    const meter = within(notice).getByRole("meter", { name: "Beds" });
    expect(meter).toHaveAttribute("aria-valuetext", "2 of 2");
    expect(within(notice).getByRole("link", { name: "Choose a plan" })).toHaveAttribute(
      "href",
      "/settings/subscription",
    );
  });

  it("contact: a mail to support naming the dimension, and the real figures past the limit", () => {
    render(
      <PlanLimitNotice mode="contact" email="support@example.com" dimension="beds" dimensionLabel="Beds" used={5} limit={2} />,
    );
    const notice = document.querySelector('[data-plan-limit-mode="contact"]') as HTMLElement;
    expect(notice).toHaveTextContent("To add more, ask us for a higher limit.");
    expect(within(notice).getByRole("meter", { name: "Beds" })).toHaveAttribute("aria-valuetext", "5 of 2");
    const mail = within(notice).getByRole("link", { name: "Ask for more" });
    expect(mail).toHaveAttribute("href", "mailto:support@example.com?subject=Plan%20limit%3A%20Beds");
  });

  it("reads a missing used as the limit, and draws no meter without a limit", () => {
    const { rerender } = render(<PlanLimitNotice mode="upgrade" href="/s" dimension="budgets" limit={1} />);
    expect(screen.getByRole("meter", { name: "budgets" })).toHaveAttribute("aria-valuetext", "1 of 1");
    rerender(<PlanLimitNotice mode="upgrade" href="/s" dimension="budgets" />);
    expect(screen.queryByRole("meter")).toBeNull();
    expect(screen.getByText("Plan limit reached")).toBeInTheDocument();
  });
});

describe("SubscriptionActions — the portal and a visible cancel (§12.26)", () => {
  it("offers both, as callbacks or links, and nothing without either", async () => {
    const user = userEvent.setup();
    const manage = vi.fn();
    const { container, rerender } = render(<SubscriptionActions onManage={manage} cancelHref="/portal/cancel" />);
    await user.click(screen.getByRole("button", { name: "Payment and invoices" }));
    expect(manage).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Cancel subscription" })).toHaveAttribute("href", "/portal/cancel");
    rerender(<SubscriptionActions />);
    expect(container).toBeEmptyDOMElement();
  });
});
