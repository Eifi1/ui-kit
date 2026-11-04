import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider, type KitDateFormatter } from "../../i18n/kit-labels";
import { DEFAULT_UI_KIT_LABELS } from "../../i18n/defaults";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { formatFileSize } from "../../i18n/kit-labels";
import { DEFAULT_BILLING_LABELS } from "../billing-labels";
import {
  SubscriptionStanding,
  subscriptionStanding,
  type SubscriptionStandingOverview,
} from "../subscription-standing";
import { UsageMeter } from "../usage-meter";

/**
 * The subscription page's standing line and usage meter (0.55; kastlan reuse audit
 * 2026-11-02, proposal 3; docs/billing-harmonization.md §7, Marcel 2026-11-04). kastlan's
 * `standingLine` said nothing for an ended plan or a failed payment, keksdose's said
 * "Renews on …" for `past_due`; kastlan's meter turned amber past 80 % and printed
 * `n.toString()`, keksdose's drew nothing past the limit.
 */

const L = DEFAULT_BILLING_LABELS;
// Midday UTC: the same calendar day in every zone a test machine runs in.
const TRIAL_END = "2026-11-09T12:00:00Z";
const GRANT_END = "2027-03-31T12:00:00Z";
const PERIOD_END = "2026-12-01T12:00:00Z";
/** A date printed as its ISO day, so a line shows which date it took. */
const day = (value: unknown) => String(value).slice(0, 10);

/** An active, paid, renewing subscription; each case changes what it needs. */
const ACTIVE: SubscriptionStandingOverview = {
  status: "active",
  in_good_standing: true,
  trial_ends_at: null,
  comped_until: null,
  current_period_end: PERIOD_END,
  cancel_at_period_end: false,
};
const line = (o: Partial<SubscriptionStandingOverview>) => subscriptionStanding({ ...ACTIVE, ...o }, L, day);

describe("subscriptionStanding — the first line that applies, in Marcel's order (§7)", () => {
  it("1. not in good standing: the plan has ended, whatever the status and the dates say", () => {
    for (const status of ["expired", "canceled", "past_due", "active", "trialing", "comped"] as const) {
      expect(line({ status, in_good_standing: false, trial_ends_at: TRIAL_END, comped_until: GRANT_END }), status).toBe(
        "Your plan has ended.",
      );
    }
    expect(line({ in_good_standing: false, cancel_at_period_end: true })).toBe(L.standing.ended);
  });

  it("2. past_due: retrying, the plan still active — and NO date, not even a cancel's", () => {
    const words = "Payment failed — we’re retrying. Your plan stays active meanwhile.";
    expect(line({ status: "past_due" })).toBe(words);
    expect(line({ status: "past_due", cancel_at_period_end: true })).toBe(words);
    expect(line({ status: "past_due", current_period_end: null })).toBe(words);
    expect(line({ status: "past_due" })).not.toContain("2026");
  });

  it("3. trialing: the trial's end; a trial that has not started (§12.9) says nothing", () => {
    expect(line({ status: "trialing", trial_ends_at: TRIAL_END, current_period_end: null })).toBe(
      "Trial until 2026-11-09",
    );
    expect(line({ status: "trialing", trial_ends_at: null, current_period_end: null })).toBeNull();
    // Not "Renews on": a cardless trial renews nothing, whatever else the row holds.
    expect(line({ status: "trialing", trial_ends_at: null })).toBeNull();
  });

  it("4. comped: free until its end, or free with none — before a cancel and a renewal", () => {
    expect(line({ status: "comped", comped_until: GRANT_END })).toBe("Free until 2027-03-31");
    expect(line({ status: "comped", comped_until: null })).toBe("Free, with no end date");
    // A payer who bought under the grant and cancelled: the grant still speaks (§12.11).
    expect(line({ status: "comped", comped_until: GRANT_END, cancel_at_period_end: true })).toBe(
      "Free until 2027-03-31",
    );
  });

  it("5. cancelled at the period's end: ends on — a cancel beats a renewal", () => {
    expect(line({ cancel_at_period_end: true })).toBe("Ends on 2026-12-01");
  });

  it("6. active: renews on the period's end", () => {
    expect(line({})).toBe("Renews on 2026-12-01");
  });

  it("7. otherwise nothing", () => {
    // No period end to name.
    expect(line({ current_period_end: null })).toBeNull();
    expect(line({ current_period_end: "" })).toBeNull();
    expect(line({ cancel_at_period_end: true, current_period_end: null })).toBeNull();
    // A status the line has no words for, in good standing (a value the kit does not know).
    expect(line({ status: "paused" as never })).toBeNull();
  });

  it("prints a date with the kit's formatDate by default", () => {
    const text = subscriptionStanding(ACTIVE, L);
    expect(text).toMatch(/^Renews on /);
    expect(text).toContain("2026");
    expect(text).not.toContain("T12:00");
  });

  it("speaks the labels it is given — de-CH says Tarif, and Swiss ss", () => {
    const de = UI_KIT_LABELS_DE_CH.billing;
    expect(subscriptionStanding({ ...ACTIVE, in_good_standing: false }, de, day)).toBe("Ihr Tarif ist abgelaufen.");
    expect(subscriptionStanding({ ...ACTIVE, status: "past_due" }, de, day)).toBe(
      "Die Zahlung ist fehlgeschlagen – wir versuchen es erneut. Ihr Tarif bleibt in der Zwischenzeit aktiv.",
    );
    expect(subscriptionStanding(ACTIVE, de, day)).toBe("Verlängert sich am 2026-12-01");
    expect(subscriptionStanding({ ...ACTIVE, cancel_at_period_end: true }, de, day)).toBe("Endet am 2026-12-01");
    expect(subscriptionStanding({ ...ACTIVE, status: "trialing", trial_ends_at: TRIAL_END }, de, day)).toBe(
      "Testphase bis 2026-11-09",
    );
    expect(subscriptionStanding({ ...ACTIVE, status: "comped", comped_until: null }, de, day)).toBe(
      "Kostenlos, ohne Enddatum",
    );
  });

  it("says an ended plan in the first sentence of the plan-ended banner and the lock's reason, in every catalogue", () => {
    const catalogues = {
      en: DEFAULT_UI_KIT_LABELS,
      "de-CH": UI_KIT_LABELS_DE_CH,
      es: UI_KIT_LABELS_ES,
      fr: UI_KIT_LABELS_FR,
      hu: UI_KIT_LABELS_HU,
      it: UI_KIT_LABELS_IT,
      zh: UI_KIT_LABELS_ZH,
    };
    for (const [code, { billing }] of Object.entries(catalogues)) {
      expect(billing.planEnded.startsWith(billing.standing.ended), code).toBe(true);
      expect(billing.lockReason.startsWith(billing.standing.ended), code).toBe(true);
    }
  });
});

describe("SubscriptionStanding — the line on the page", () => {
  it("is a muted line carrying its key, and nothing when no line applies", () => {
    const { container, rerender } = render(<SubscriptionStanding overview={{ ...ACTIVE, status: "past_due" }} />);
    const p = container.querySelector("p") as HTMLElement;
    expect(p).toHaveAttribute("data-standing", "pastDue");
    expect(p).toHaveClass("text-sm", "text-muted");
    expect(p).toHaveTextContent(L.standing.pastDue);
    rerender(<SubscriptionStanding overview={{ ...ACTIVE, current_period_end: null }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("prints the day the provider's way — its locale, or its formatDate asked for a day without a weekday", () => {
    const { rerender } = render(
      <UiKitProvider locale="en-GB">
        <SubscriptionStanding overview={ACTIVE} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Renews on 1 Dec 2026")).toHaveAttribute("data-standing", "renewsOn");

    const formatDate = vi.fn<KitDateFormatter>((iso) => `«${iso}»`);
    rerender(
      <UiKitProvider locale="en-GB" formatDate={formatDate}>
        <SubscriptionStanding overview={ACTIVE} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Renews on «2026-12-01»")).toBeInTheDocument();
    expect(formatDate).toHaveBeenCalledWith("2026-12-01", expect.objectContaining({ unit: "day", weekday: false }));
  });

  it("says it in de-CH under the de-CH catalogue", () => {
    render(
      <UiKitProvider locale="de-CH" labels={UI_KIT_LABELS_DE_CH}>
        <SubscriptionStanding overview={{ ...ACTIVE, cancel_at_period_end: true }} />
        <SubscriptionStanding overview={{ ...ACTIVE, status: "comped", comped_until: GRANT_END }} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Endet am 01.12.2026")).toHaveAttribute("data-standing", "endsOn");
    expect(screen.getByText("Kostenlos bis 31.03.2027")).toHaveAttribute("data-standing", "freeUntil");
  });

  it("takes the app's words and props", () => {
    render(
      <SubscriptionStanding
        overview={ACTIVE}
        labels={{ standing: { renewsOn: (date) => `Next charge ${date}` } }}
        locale="en-GB"
        className="mt-1"
        data-testid="standing"
      />,
    );
    const p = screen.getByTestId("standing");
    expect(p).toHaveTextContent("Next charge 1 Dec 2026");
    expect(p).toHaveClass("mt-1", "text-muted");
  });
});

const usage = () => document.querySelector("[data-usage]") as HTMLElement;
const fill = () => document.querySelector('[data-part="fill"]') as HTMLElement | null;

describe("UsageMeter — a plan limit's meter (§3.4, §7; Marcel 2026-11-04)", () => {
  it("below the limit: neutral", () => {
    render(<UsageMeter label="Units" used={3} limit={10} />);
    const meter = screen.getByRole("meter", { name: "Units" });
    expect(meter).toHaveAttribute("aria-valuetext", "3 of 10");
    expect(usage()).toHaveAttribute("data-usage", "below");
    expect(fill()).toHaveClass("bg-[var(--text-muted)]");
    expect(document.querySelector('[data-part="overage"]')).toBeNull();
  });

  it("AT the limit: a warning — nothing more can be created", () => {
    render(<UsageMeter label="Units" used={10} limit={10} />);
    expect(screen.getByRole("meter", { name: "Units" })).toHaveAttribute("aria-valuetext", "10 of 10");
    expect(usage()).toHaveAttribute("data-usage", "at");
    expect(fill()).toHaveClass("bg-warning");
    expect(document.querySelector('[data-part="overage"]')).toBeNull();
  });

  it("PAST it, after a downgrade: danger, the real figures, and by how much", () => {
    render(<UsageMeter label="Units" used={12} limit={10} />);
    const meter = screen.getByRole("meter", { name: "Units" });
    // The bar stays full at the limit; the words say what it cannot draw.
    expect(meter).toHaveAttribute("aria-valuenow", "10");
    expect(meter).toHaveAttribute("aria-valuetext", "12 of 10");
    expect(usage()).toHaveAttribute("data-usage", "over");
    expect(fill()).toHaveClass("bg-danger");
    expect(document.querySelector('[data-part="overage"]')).toHaveTextContent("2 over the limit");
  });

  it("unlimited (null, or a dimension the limits leave out): no bar and no tone", () => {
    const { rerender } = render(<UsageMeter label="Seats" used={4} limit={null} />);
    expect(screen.queryByRole("meter")).toBeNull();
    expect(fill()).toBeNull();
    expect(usage()).toHaveAttribute("data-usage", "unlimited");
    expect(document.querySelector('[data-part="unlimited"]')).toHaveTextContent("4 · Unlimited");
    rerender(<UsageMeter label="Seats" used={4} />);
    expect(usage()).toHaveAttribute("data-usage", "unlimited");
  });

  it("groups the digits in the provider's locale — never n.toString()", () => {
    const ch = new Intl.NumberFormat("de-CH");
    const { rerender } = render(<UsageMeter label="Budgets" used={12345} limit={20000} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "12,345 of 20,000");
    rerender(
      <UiKitProvider locale="de-CH" labels={UI_KIT_LABELS_DE_CH}>
        <UsageMeter label="Budgets" used={21000} limit={20000} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", `${ch.format(21000)} von ${ch.format(20000)}`);
    expect(document.querySelector('[data-part="overage"]')).toHaveTextContent(ch.format(1000));
    rerender(
      <UiKitProvider locale="de-CH" labels={UI_KIT_LABELS_DE_CH}>
        <UsageMeter label="Budgets" used={12345} limit={null} />
      </UiKitProvider>,
    );
    expect(document.querySelector('[data-part="unlimited"]')).toHaveTextContent(`${ch.format(12345)} · Unbegrenzt`);
  });

  it("writes every figure with the app's formatValue — the overage too", () => {
    const MB = 1024 ** 2;
    render(<UsageMeter label="Files" used={260 * MB} limit={200 * MB} formatValue={(b) => formatFileSize(b)} />);
    const meter = screen.getByRole("meter", { name: "Files" });
    expect(meter).toHaveAttribute("aria-valuetext", `${formatFileSize(260 * MB)} of ${formatFileSize(200 * MB)}`);
    expect(document.querySelector('[data-part="overage"]')).toHaveTextContent(
      `${formatFileSize(60 * MB)} over the limit`,
    );
  });

  it("shows the value beside its label, and takes the app's words", () => {
    render(
      <UsageMeter
        label="Beds"
        used={3}
        limit={5}
        labels={{ usage: (used, limit) => `${used}/${limit} beds` }}
        className="mt-2"
      />,
    );
    const meter = screen.getByRole("meter", { name: "Beds" });
    expect(meter).toHaveAttribute("aria-valuetext", "3/5 beds");
    const box = meter.parentElement as HTMLElement;
    expect(within(box).getByText("3/5 beds")).toBeInTheDocument();
    expect(box).toHaveClass("mt-2");
  });
});
