import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WriteLockProvider } from "../../components/write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { formatDate } from "../../lib/format";
import { BillingBanner } from "../billing-banner";
import { DEFAULT_BILLING_LABELS } from "../billing-labels";
import type { BillingLabels } from "../billing-labels";
import { isPermanentGrant } from "../billing-overview";
import type { BillingOverview } from "../billing-overview";
import { CancelSubscriptionConfirm } from "../cancel-subscription";
import { GrantWarningConfirm, PlanPicker } from "../plan-card";
import type { BillingPlan } from "../plan-card";
import { PlanSwitchConfirm } from "../plan-switch";
import { SubscriptionActions } from "../subscription-actions";

/**
 * Round 0.42 (docs/billing-harmonization.md §16): the portal for the buyer only, the
 * in-app cancel and its undo, the payment-failed banner that names the buyer, and the
 * warning before paying under a grant without an end. Synthetic names throughout.
 */

const L = DEFAULT_BILLING_LABELS;

describe("isPermanentGrant (§16.7 E)", () => {
  const base = { status: "comped", source: "manual", comped_until: null } as const;

  it("is an operator's grant with no end — and nothing else", () => {
    expect(isPermanentGrant(base)).toBe(true);
    expect(isPermanentGrant({ ...base, comped_until: undefined })).toBe(true);
    // A grant with an end: the bought plan applies from it on.
    expect(isPermanentGrant({ ...base, comped_until: "2027-03-01T00:00:00Z" })).toBe(false);
    // Kurvenschmiede's pre-launch beta rows have no end either, and aren't permanent.
    expect(isPermanentGrant({ ...base, source: "beta" })).toBe(false);
    expect(isPermanentGrant({ ...base, status: "active", source: "provider" })).toBe(false);
  });

  it("takes the overview as it comes", () => {
    const overview = { ...base, plan: "pro", in_good_standing: true } as unknown as BillingOverview;
    expect(isPermanentGrant(overview)).toBe(true);
  });
});

describe("SubscriptionActions — the portal for the buyer only (§16.2, §16.7 C)", () => {
  it("under buyer_only: a caption naming the buyer, and Cancel is the in-app cancel", async () => {
    const user = userEvent.setup();
    const portal = vi.fn();
    const inApp = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <SubscriptionActions
        portal="buyer_only"
        buyerName="Ada Gardener"
        onPortal={portal}
        onManage={portal}
        onCancel={onCancel}
        cancelHref="/portal/cancel"
        onCancelInApp={inApp}
      />,
    );
    expect(screen.queryByRole("button", { name: L.manage })).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(L.buyerHolds("Ada Gardener"))).toBeInTheDocument();
    expect(L.buyerHolds("Ada Gardener")).toBe(
      "The payment method and the invoices are with Ada Gardener, who bought the subscription.",
    );
    await user.click(screen.getByRole("button", { name: L.cancel }));
    expect(inApp).toHaveBeenCalledTimes(1);
    expect(portal).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    // The buyer is gone: the caption names the role.
    rerender(<SubscriptionActions portal="buyer_only" buyerName={null} onCancelInApp={inApp} />);
    expect(
      screen.getByText("The payment method and the invoices are with the admin who bought the subscription."),
    ).toBeInTheDocument();
    // No in-app cancel given: the caption alone, never a portal button.
    rerender(<SubscriptionActions portal="buyer_only" onPortal={portal} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelector("[data-buyer-holds]")).not.toBeNull();
  });

  it("offers Keep subscription in the cancel's place while a cancel is scheduled", async () => {
    const user = userEvent.setup();
    const resume = vi.fn();
    const portal = vi.fn();
    const { rerender } = render(
      <SubscriptionActions portal="buyer_only" onCancelInApp={() => {}} cancelAtPeriodEnd onResume={resume} />,
    );
    expect(screen.queryByRole("button", { name: L.cancel })).toBeNull();
    await user.click(screen.getByRole("button", { name: L.keepSubscription }));
    expect(resume).toHaveBeenCalledTimes(1);
    // The buyer, under "open", too.
    rerender(<SubscriptionActions onPortal={portal} cancelAtPeriodEnd onResume={resume} pending="resume" />);
    expect(screen.getByRole("button", { name: L.manage })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: L.cancel })).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(L.keepSubscription) })).toHaveAttribute("aria-busy", "true");
    // Without onResume the cancel stays as before.
    rerender(<SubscriptionActions onPortal={portal} cancelAtPeriodEnd />);
    expect(screen.getByRole("button", { name: L.cancel })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: L.keepSubscription })).toBeNull();
  });

  it("under open: as before; the in-app cancel only where no portal cancel is given", async () => {
    const user = userEvent.setup();
    const portal = vi.fn();
    const inApp = vi.fn();
    const { rerender } = render(<SubscriptionActions portal="open" buyerName="Ada" onPortal={portal} onCancelInApp={inApp} />);
    await user.click(screen.getByRole("button", { name: L.manage }));
    await user.click(screen.getByRole("button", { name: L.cancel }));
    expect(portal.mock.calls).toEqual([["overview"], ["cancel"]]);
    expect(inApp).not.toHaveBeenCalled();
    expect(document.querySelector("[data-buyer-holds]")).toBeNull();
    rerender(<SubscriptionActions cancelHref="/portal/cancel" onCancelInApp={inApp} />);
    expect(screen.getByRole("link", { name: L.cancel })).toHaveAttribute("href", "/portal/cancel");
    rerender(<SubscriptionActions onCancelInApp={inApp} />);
    await user.click(screen.getByRole("button", { name: L.cancel }));
    expect(inApp).toHaveBeenCalledTimes(1);
  });
});

describe("CancelSubscriptionConfirm — the in-app cancel (§16.2 decision 2)", () => {
  const END = "2026-11-09T10:00:00Z";

  it("names the period's end, confirms with its own words, and Back dismisses", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CancelSubscriptionConfirm open onOpenChange={onOpenChange} periodEnd={END} onConfirm={onConfirm} locale="en-GB" />,
    );
    const dialog = screen.getByRole("dialog", { name: L.cancelConfirmTitle });
    const date = formatDate(END, "medium", { locale: "en-GB" });
    expect(within(dialog).getByText(`Your subscription ends on ${date}. Until then everything works as before.`)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel subscription now" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Back" }));
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("holds a second press and Escape while pending", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<CancelSubscriptionConfirm open onOpenChange={onOpenChange} periodEnd={END} onConfirm={onConfirm} pending />);
    await user.click(screen.getByRole("button", { name: /Cancel subscription now/ }));
    await user.keyboard("{Escape}");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });

  it("takes no billing lock; a demo lock holds it", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <WriteLockProvider locked reason="Your plan has ended." kind="billing">
        <CancelSubscriptionConfirm open onOpenChange={() => {}} periodEnd={END} onConfirm={onConfirm} />
      </WriteLockProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Cancel subscription now" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    rerender(
      <WriteLockProvider locked reason="Not in the demo." kind="demo">
        <CancelSubscriptionConfirm open onOpenChange={() => {}} periodEnd={END} onConfirm={onConfirm} />
      </WriteLockProvider>,
    );
    await user.click(screen.getByRole("button", { name: /Cancel subscription now/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("speaks Swiss German: Jetzt kündigen", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
        <CancelSubscriptionConfirm open onOpenChange={() => {}} periodEnd={END} onConfirm={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("dialog", { name: "Abonnement kündigen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jetzt kündigen" })).toBeInTheDocument();
  });
});

describe("BillingBanner payment-failed — ask the buyer (§16.7 A, §16.8)", () => {
  it("names the buyer and shows no button under buyer_only", () => {
    const onAction = vi.fn();
    const { rerender } = render(
      <BillingBanner kind="payment-failed" portal="buyer_only" buyerName="Ada Gardener" onAction={onAction} actionHref="/x" />,
    );
    expect(screen.getByText("The payment failed. Ada Gardener can update the payment method.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    rerender(<BillingBanner kind="payment-failed" portal="buyer_only" buyerName={null} onAction={onAction} />);
    expect(
      screen.getByText("The payment failed. The admin who bought the subscription can update the payment method."),
    ).toBeInTheDocument();
    // "open": as before.
    rerender(<BillingBanner kind="payment-failed" portal="open" buyerName="Ada" onAction={onAction} />);
    expect(screen.getByText(L.paymentFailed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: L.updatePayment })).toBeInTheDocument();
  });
});

const PLANS: BillingPlan[] = [
  { code: "free", name: "Seedling" },
  { code: "pro", name: "Gardener", prices: { CHF: { year: 4900, month: 490 } } },
];

describe("PlanPicker and PlanSwitchConfirm — the permanent-grant warning (§16.2 decision 5, §16.8 B)", () => {
  it("warns before the checkout: Buy anyway goes on, Back doesn't", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<PlanPicker plans={PLANS} defaultValue="pro" defaultCurrency="CHF" permanentGrant onChoose={onChoose} />);
    await user.click(screen.getByRole("button", { name: "Choose Gardener" }));
    let dialog = screen.getByRole("dialog", { name: L.grantWarningTitle });
    expect(within(dialog).getByText(L.grantWarningBody)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Back" }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onChoose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Choose Gardener" }));
    dialog = screen.getByRole("dialog", { name: L.grantWarningTitle });
    await user.click(within(dialog).getByRole("button", { name: "Buy anyway" }));
    expect(onChoose).toHaveBeenCalledWith({ plan: "pro", interval: "year", currency: "CHF" });
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it("no grant, or a pick into the switch: straight to onChoose, no picker warning", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    const { rerender } = render(<PlanPicker plans={PLANS} defaultValue="pro" defaultCurrency="CHF" onChoose={onChoose} />);
    await user.click(screen.getByRole("button", { name: "Choose Gardener" }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    rerender(
      <PlanPicker plans={PLANS} defaultValue="pro" defaultCurrency="CHF" permanentGrant switching onChoose={onChoose} />,
    );
    await user.click(screen.getByRole("button", { name: "Choose Gardener" }));
    expect(onChoose).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("GrantWarningConfirm stands alone, for a switch that falls back to a checkout", async () => {
    // keksdose: /billing/plan/preview → 409 billing_not_subscribed → checkout. The picker
    // skipped its own warning (switching), so the app shows this before the checkout.
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(<GrantWarningConfirm open={false} onOpenChange={onOpenChange} onConfirm={onConfirm} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<GrantWarningConfirm open onOpenChange={onOpenChange} onConfirm={onConfirm} />);
    let dialog = screen.getByRole("dialog", { name: L.grantWarningTitle });
    expect(dialog.closest("[data-grant-warning]") ?? dialog.querySelector("[data-grant-warning]")).not.toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Back" }));
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onConfirm).not.toHaveBeenCalled();

    onOpenChange.mockClear();
    rerender(<GrantWarningConfirm open onOpenChange={onOpenChange} onConfirm={onConfirm} labels={{ grantWarningAction: "Pay now" }} />);
    dialog = screen.getByRole("dialog", { name: L.grantWarningTitle });
    await user.click(within(dialog).getByRole("button", { name: "Pay now" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("GrantWarningConfirm speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <GrantWarningConfirm open onOpenChange={() => {}} onConfirm={() => {}} />
      </UiKitProvider>,
    );
    expect(
      screen.getByRole("dialog", { name: UI_KIT_LABELS_DE_CH.billing.grantWarningTitle }),
    ).toBeInTheDocument();
  });

  it("PlanSwitchConfirm shows the warning above its figures, once", () => {
    const props = {
      open: true,
      onOpenChange: () => {},
      from: { plan: "pro", interval: "month" },
      to: { plan: "business", interval: "year" },
      onConfirm: () => {},
      locale: "en-US",
    } as const;
    const { rerender } = render(<PlanSwitchConfirm {...props} />);
    expect(document.querySelector("[data-grant-warning]")).toBeNull();
    rerender(
      <PlanSwitchConfirm
        {...props}
        permanentGrant
        preview={{
          currency: "CHF",
          now_minor: 1250,
          plan: "business",
          interval: "year",
          over_limit: [],
          limits: {},
          usage: {},
        }}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const warning = dialog.querySelector("[data-grant-warning]")!;
    expect(warning).toHaveTextContent(L.grantWarningTitle);
    expect(warning).toHaveTextContent(L.grantWarningBody);
    expect(dialog.querySelectorAll("[data-grant-warning]")).toHaveLength(1);
    const figures = dialog.querySelector("[data-plan-switch-preview]")!;
    expect(warning.compareDocumentPosition(figures) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Confirm stays the switch's own.
    expect(within(dialog).getByRole("button", { name: L.switchConfirm })).toBeInTheDocument();
  });
});

describe("the 0.42 words in every catalogue", () => {
  const KEYS = [
    "cancelConfirmTitle",
    "cancelConfirmAction",
    "keepSubscription",
    "grantWarningTitle",
    "grantWarningBody",
    "grantWarningAction",
  ] as const;
  const CATALOGUES: Array<[string, BillingLabels]> = [
    ["de-CH", UI_KIT_LABELS_DE_CH.billing],
    ["es", UI_KIT_LABELS_ES.billing],
    ["fr", UI_KIT_LABELS_FR.billing],
    ["hu", UI_KIT_LABELS_HU.billing],
    ["it", UI_KIT_LABELS_IT.billing],
    ["zh", UI_KIT_LABELS_ZH.billing],
  ];

  it.each(CATALOGUES)("%s translates them, names the buyer, and keeps the fallback", (_code, billing) => {
    for (const key of KEYS) expect(billing[key]).not.toBe(L[key]);
    expect(billing.buyerHolds("Ada Gardener")).toContain("Ada Gardener");
    expect(billing.paymentFailedAskBuyer("Ada Gardener")).toContain("Ada Gardener");
    expect(billing.buyerHolds()).not.toContain("undefined");
    expect(billing.paymentFailedAskBuyer()).not.toContain("undefined");
    expect(billing.cancelConfirmBody("9 Nov 2026")).toContain("9 Nov 2026");
  });

  it("de-CH: Swiss spelling, formal Sie", () => {
    const b = UI_KIT_LABELS_DE_CH.billing;
    const all = [
      ...KEYS.map((k) => b[k]),
      b.buyerHolds("Ada"),
      b.buyerHolds(),
      b.paymentFailedAskBuyer("Ada"),
      b.paymentFailedAskBuyer(),
      b.cancelConfirmBody("9. Nov. 2026"),
    ].join(" ");
    expect(all).not.toMatch(/ß/);
    expect(all).not.toMatch(/\b(du|dein|deine|dir|dich)\b/i);
    expect(b.cancelConfirmAction).toBe("Jetzt kündigen");
    expect(b.cancelConfirmBody("9. Nov. 2026")).toBe("Ihr Abonnement endet am 9. Nov. 2026. Bis dahin funktioniert alles wie bisher.");
  });
});
