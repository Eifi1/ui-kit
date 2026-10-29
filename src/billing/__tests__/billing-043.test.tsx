import { act, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { DEFAULT_BILLING_LABELS } from "../billing-labels";
import { BillingBanner } from "../billing-banner";
import { useCancelRequest } from "../cancel-request";
import { openProviderPage } from "../provider-page";
import { SubscriptionActions } from "../subscription-actions";

/**
 * 0.43 (docs/billing-harmonization.md §17): the provider's portal opens in a new tab —
 * `openProviderPage`, the portal actions' external mark and the note — and the in-app
 * cancel's follow-up (`useCancelRequest`, `cancelRequested`; kastlan `18bf4c0`).
 */

const L = DEFAULT_BILLING_LABELS;
const URL_ = "https://customer-portal.paddle.com/cpl_1";

/** A tab as `window.open` returns it: records where it is pointed and whether closed. */
function fakeTab() {
  const tab = { closed: false, opener: {} as unknown, location: { href: "about:blank" }, close: vi.fn() };
  tab.close.mockImplementation(() => {
    tab.closed = true;
  });
  return tab;
}

afterEach(() => vi.restoreAllMocks());

describe("openProviderPage (§17.2)", () => {
  it("opens about:blank inside the click, before the URL is in, and cuts the opener", async () => {
    const tab = fakeTab();
    const open = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    let answer!: (url: string) => void;
    const fetchUrl = vi.fn(() => new Promise<string>((resolve) => (answer = resolve)));
    const way = openProviderPage(fetchUrl);
    // Synchronously, before any await: a later window.open is blocked as a pop-up.
    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe("about:blank");
    answer(URL_);
    await expect(way).resolves.toBe("new-tab");
    expect(tab.location.href).toBe(URL_);
    expect(fetchUrl).toHaveBeenCalledTimes(1);
  });

  it("closes the tab on a refusal and rethrows, so the app shows its error", async () => {
    const tab = fakeTab();
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    const refusal = new Error("409 billing_not_at_provider");
    await expect(openProviderPage(() => Promise.reject(refusal))).rejects.toBe(refusal);
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(tab.location.href).toBe("about:blank");
  });

  it("goes in the same tab where the browser refused the new one", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const assign = vi.fn();
    const win = { open: window.open, location: { assign } } as unknown as Window;
    await expect(openProviderPage(() => Promise.resolve(URL_), { window: win })).resolves.toBe("same-tab");
    expect(assign).toHaveBeenCalledWith(URL_);
  });

  it("goes in the same tab where window.open throws, or the tab was closed meanwhile", async () => {
    const assign = vi.fn();
    const throwing = {
      open: () => {
        throw new Error("blocked");
      },
      location: { assign },
    } as unknown as Window;
    await expect(openProviderPage(() => Promise.resolve(URL_), { window: throwing })).resolves.toBe("same-tab");
    const tab = fakeTab();
    const closing = { open: () => tab, location: { assign } } as unknown as Window;
    await expect(
      openProviderPage(
        () => {
          tab.closed = true;
          return Promise.resolve(URL_);
        },
        { window: closing },
      ),
    ).resolves.toBe("same-tab");
    expect(assign).toHaveBeenCalledTimes(2);
  });

  it("rejects without a tab to close where the browser refused one", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    await expect(openProviderPage(() => Promise.reject(new Error("503")))).rejects.toThrow("503");
  });
});

describe("SubscriptionActions — the portal in a new tab (§17.3)", () => {
  it("marks the portal's actions and says so in a note with the provider and the app", async () => {
    const user = userEvent.setup();
    const portal = vi.fn();
    render(<SubscriptionActions onPortal={portal} providerName="Paddle" appName="Kastlan" />);
    const manage = screen.getByRole("button", { name: "Payment and invoices (opens in a new tab)" });
    const cancel = screen.getByRole("button", { name: "Cancel subscription (opens in a new tab)" });
    expect(manage.querySelector("[data-external]")).not.toBeNull();
    expect(cancel.querySelector("[data-external]")).not.toBeNull();
    expect(document.querySelector("[data-portal-note]")).toHaveTextContent(
      "Payment and invoices open at Paddle in a new tab; Kastlan stays open here.",
    );
    await user.click(manage);
    expect(portal).toHaveBeenCalledWith("overview");
  });

  it("opens a link in a new tab, and says 'this page' without the app's name", () => {
    render(<SubscriptionActions manageHref="/portal" cancelHref="/portal/cancel" />);
    const manage = screen.getByRole("link", { name: /^Payment and invoices/ });
    expect(manage).toHaveAttribute("target", "_blank");
    expect(manage).toHaveAttribute("rel", "noopener noreferrer");
    expect(manage.querySelector("[data-external]")).not.toBeNull();
    expect(screen.getByRole("link", { name: /^Cancel subscription/ })).toHaveAttribute("target", "_blank");
    expect(document.querySelector("[data-portal-note]")).toHaveTextContent(L.portalOpensNewTab("Paddle"));
    expect(L.portalOpensNewTab("Paddle")).toBe(
      "Payment and invoices open at Paddle in a new tab; this page stays open.",
    );
  });

  it("leaves the in-app cancel and Keep subscription unmarked", () => {
    const { rerender } = render(<SubscriptionActions onManage={vi.fn()} onCancelInApp={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Cancel subscription" }).querySelector("[data-external]")).toBeNull();
    rerender(<SubscriptionActions cancelAtPeriodEnd onResume={vi.fn()} onCancelInApp={vi.fn()} />);
    expect(screen.getByRole("button", { name: L.keepSubscription }).querySelector("[data-external]")).toBeNull();
    // No way to the portal shows: no note.
    expect(document.querySelector("[data-portal-note]")).toBeNull();
  });

  it("shows no note under buyer_only, before the provider, or with portalNewTab={false}", () => {
    const { rerender } = render(<SubscriptionActions portal="buyer_only" buyerName="Ada" onCancelInApp={vi.fn()} />);
    expect(document.querySelector("[data-portal-note]")).toBeNull();
    rerender(<SubscriptionActions atProvider={false} onPortal={vi.fn()} />);
    expect(document.querySelector("[data-portal-note]")).toBeNull();
    rerender(<SubscriptionActions portalNewTab={false} onPortal={vi.fn()} />);
    expect(document.querySelector("[data-portal-note]")).toBeNull();
    expect(screen.getByRole("button", { name: "Payment and invoices" }).querySelector("[data-external]")).toBeNull();
  });

  it("says it in every language, Swiss German with ss", () => {
    const catalogues = [
      UI_KIT_LABELS_DE_CH,
      UI_KIT_LABELS_ES,
      UI_KIT_LABELS_FR,
      UI_KIT_LABELS_HU,
      UI_KIT_LABELS_IT,
      UI_KIT_LABELS_ZH,
    ];
    for (const c of catalogues) {
      const words = c.billing.portalOpensNewTab("Paddle", "Kastlan");
      expect(words).toContain("Paddle");
      expect(words).toContain("Kastlan");
      expect(words).not.toBe(L.portalOpensNewTab("Paddle", "Kastlan"));
      expect(c.billing.portalOpensNewTab("Paddle")).not.toContain("undefined");
    }
    expect(UI_KIT_LABELS_DE_CH.billing.portalOpensNewTab("Paddle", "Kastlan")).toBe(
      "Zahlung und Rechnungen öffnen sich bei Paddle in einem neuen Tab; Kastlan bleibt hier offen.",
    );
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <SubscriptionActions onPortal={vi.fn()} appName="Kastlan" />
      </UiKitProvider>,
    );
    expect(document.querySelector('[data-portal-action="manage"]')).toHaveAccessibleName(
      `${UI_KIT_LABELS_DE_CH.billing.manage} (${UI_KIT_LABELS_DE_CH.common.opensInNewTab})`,
    );
    expect(document.querySelector("[data-portal-note]")?.textContent).not.toMatch(/ß/);
  });

  it("leaves the checkout alone: no new-tab mark on a plan's button", () => {
    // The checkout is PlanPicker's, in the same tab (§17.4); the kit's banners that lead
    // to a plan link the app's own page.
    render(<BillingBanner kind="plan-ended" onAction={vi.fn()} />);
    const choose = screen.getByRole("button", { name: L.choosePlan });
    expect(choose.querySelector("[data-external]")).toBeNull();
  });
});

describe("BillingBanner payment-failed — the card page in a new tab (§17.1)", () => {
  it("marks the portal call", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<BillingBanner kind="payment-failed" onAction={action} />);
    const button = screen.getByRole("button", { name: "Update payment method (opens in a new tab)" });
    expect(button.querySelector("[data-external]")).not.toBeNull();
    await user.click(button);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("leaves a link to the app's own page unmarked, unless told", () => {
    const { rerender } = render(<BillingBanner kind="payment-failed" actionHref="/settings/subscription" />);
    const link = screen.getByRole("link", { name: L.updatePayment });
    expect(link).not.toHaveAttribute("target");
    rerender(<BillingBanner kind="payment-failed" actionHref="https://portal.example/card" actionNewTab />);
    const external = screen.getByRole("link", { name: /^Update payment method/ });
    expect(external).toHaveAttribute("target", "_blank");
    expect(external.querySelector("[data-external]")).not.toBeNull();
    rerender(<BillingBanner kind="payment-failed" onAction={vi.fn()} actionNewTab={false} />);
    expect(screen.getByRole("button", { name: L.updatePayment }).querySelector("[data-external]")).toBeNull();
  });
});

describe("useCancelRequest and cancelRequested (kastlan 18bf4c0)", () => {
  /** The page's order: the request, then the overview (which reads `waiting`), then the view. */
  function usePage(row: boolean | undefined, onQuery: (waiting: boolean) => void = () => {}) {
    const request = useCancelRequest();
    onQuery(request.waiting); // useBillingOverview({ waiting: request.waiting })
    return { waiting: request.waiting, ...request.view(row) };
  }

  it("shows a cancel at once, until the row moves", () => {
    const { result, rerender } = renderHook(({ row }) => usePage(row), { initialProps: { row: false } });
    expect(result.current).toMatchObject({ requested: null, cancelScheduled: false, waiting: false });
    act(() => result.current.noteAsked());
    expect(result.current).toMatchObject({ requested: "cancel", cancelScheduled: true, waiting: true });
    // The webhook landed: the row says the rest.
    rerender({ row: true });
    expect(result.current).toMatchObject({ requested: null, cancelScheduled: true, waiting: false });
    // Keep subscription: shown at once as renewing.
    act(() => result.current.noteAsked());
    expect(result.current).toMatchObject({ requested: "resume", cancelScheduled: false, waiting: true });
    rerender({ row: false });
    expect(result.current).toMatchObject({ requested: null, cancelScheduled: false, waiting: false });
  });

  it("cancels out a cancel and its undo asked before the row moved", () => {
    const { result } = renderHook(() => usePage(false));
    act(() => result.current.noteAsked());
    act(() => result.current.noteAsked());
    expect(result.current).toMatchObject({ requested: null, cancelScheduled: false, waiting: false });
  });

  it("goes before the overview query: no data at construction, waiting feeds the query (kastlan B2)", () => {
    const query = vi.fn();
    const { result, rerender } = renderHook(({ row }) => usePage(row, query), {
      initialProps: { row: undefined as boolean | undefined },
    });
    // Loading: nothing asked, nothing shown, no polling.
    expect(result.current).toMatchObject({ requested: null, cancelScheduled: false, waiting: false });
    expect(query).toHaveBeenLastCalledWith(false);
    rerender({ row: false });
    act(() => result.current.noteAsked());
    expect(query).toHaveBeenLastCalledWith(true);
    // A refetch in flight (no data for a moment) drops nothing.
    rerender({ row: undefined });
    expect(result.current.waiting).toBe(true);
    rerender({ row: true });
    expect(query).toHaveBeenLastCalledWith(false);
  });

  it("SubscriptionActions shows what was asked: Keep after a cancel, no second cancel without onResume", () => {
    const { rerender } = render(
      <SubscriptionActions onManage={vi.fn()} onCancelInApp={vi.fn()} onResume={vi.fn()} cancelRequested="cancel" />,
    );
    expect(screen.getByRole("button", { name: L.keepSubscription })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: L.cancel })).toBeNull();
    rerender(<SubscriptionActions onManage={vi.fn()} onCancelInApp={vi.fn()} cancelRequested="cancel" />);
    expect(screen.queryByRole("button", { name: L.cancel })).toBeNull();
    expect(screen.queryByRole("button", { name: L.keepSubscription })).toBeNull();
    rerender(
      <SubscriptionActions
        onManage={vi.fn()}
        onCancelInApp={vi.fn()}
        onResume={vi.fn()}
        cancelAtPeriodEnd
        cancelRequested="resume"
      />,
    );
    expect(screen.getByRole("button", { name: L.cancel })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: L.keepSubscription })).toBeNull();
    const row = screen.getByRole("button", { name: L.cancel }).parentElement as HTMLElement;
    expect(within(row).getByRole("button", { name: /^Payment and invoices/ })).toBeInTheDocument();
  });
});
