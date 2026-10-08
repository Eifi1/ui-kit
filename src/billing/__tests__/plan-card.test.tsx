import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { WriteLockProvider } from "../../components/write-lock";
import { PlanCard, PlanPicker, planRelation } from "../plan-card";
import type { BillingPlan } from "../plan-card";

/**
 * The plan picker of a made-up app, "Ada's Garden Planner" (docs/billing-harmonization.md
 * §3.1, §7, §12.17). Synthetic plans and prices; the kit sends nothing.
 */

const plain = (s: string | null | undefined) => (s ?? "").replace(/\s/g, " ");

const PLANS: BillingPlan[] = [
  { code: "free", name: "Seedling", limits: { beds: 2, helpers: 0 }, features: ["Planting calendar"] },
  {
    code: "pro",
    name: "Gardener",
    prices: { CHF: { year: 4900, month: 490 }, EUR: { year: 4500, month: 450 } },
    limits: { beds: 20, helpers: 3 },
    features: ["Planting calendar", "Harvest log"],
  },
  {
    code: "estate",
    name: "Estate",
    prices: { CHF: { year: 12900 }, EUR: { year: 11900 } },
    limits: { beds: null, helpers: null },
  },
];

const DIMENSIONS = { beds: "Beds", helpers: "Helpers" };

const card = (name: RegExp | string) => screen.getByRole("radio", { name });
const priceOf = (code: string) =>
  plain(document.querySelector(`[data-plan="${code}"]`)?.closest("label")?.querySelector("[data-part=price]")?.textContent);

describe("PlanCard — one plan on a ChoiceCard radio", () => {
  it("shows the gross price per currency and period, and says it includes VAT", () => {
    const { rerender } = render(
      <UiKitProvider locale="en-GB">
        <PlanCard name="p" plan={PLANS[1]} currency="CHF" interval="year" dimensionLabels={DIMENSIONS} />
      </UiKitProvider>,
    );
    const radio = card("Gardener");
    expect(radio).toHaveAttribute("type", "radio");
    expect(radio).toHaveAttribute("value", "pro");
    expect(priceOf("pro")).toBe("CHF 49");
    expect(plain(radio.closest("label")?.textContent)).toContain("CHF 49 per year");
    expect(plain(radio.closest("label")?.textContent)).toContain("VAT included");

    rerender(
      <UiKitProvider locale="en-GB">
        <PlanCard name="p" plan={PLANS[1]} currency="CHF" interval="month" dimensionLabels={DIMENSIONS} />
      </UiKitProvider>,
    );
    expect(priceOf("pro")).toBe("CHF 4.90");
    expect(plain(card("Gardener").closest("label")?.textContent)).toContain("per month");

    rerender(
      <UiKitProvider locale="de-DE">
        <PlanCard name="p" plan={PLANS[1]} currency="EUR" interval="month" dimensionLabels={DIMENSIONS} />
      </UiKitProvider>,
    );
    expect(priceOf("pro")).toBe("4,50 €");
  });

  it("lists the limits, Unlimited for null, and the app's feature lines", () => {
    render(
      <>
        <PlanCard name="p" plan={PLANS[1]} currency="CHF" interval="year" dimensionLabels={DIMENSIONS} />
        <PlanCard name="p" plan={PLANS[2]} currency="CHF" interval="year" dimensionLabels={DIMENSIONS} />
      </>,
    );
    const limits = screen.getAllByRole("list", { name: "Limits" });
    expect(within(limits[0]).getAllByRole("listitem").map((li) => li.textContent?.trim())).toEqual([
      "Beds: 20",
      "Helpers: 3",
    ]);
    expect(within(limits[1]).getAllByRole("listitem").map((li) => li.textContent?.trim())).toEqual([
      "Beds: Unlimited",
      "Helpers: Unlimited",
    ]);
    const features = screen.getByRole("list", { name: "Included" });
    expect(within(features).getAllByRole("listitem").map((li) => li.textContent?.trim())).toEqual([
      "Planting calendar",
      "Harvest log",
    ]);
  });

  it("calls a plan without prices Free, and a priced plan without this period not offered", () => {
    render(
      <>
        <PlanCard name="p" plan={PLANS[0]} currency="EUR" interval="month" />
        <PlanCard name="p" plan={PLANS[2]} currency="EUR" interval="month" />
      </>,
    );
    expect(priceOf("free")).toBe("Free");
    expect(priceOf("estate")).toBe("Not offered for this billing period");
    expect(card("Estate")).toBeDisabled();
  });

  it("takes the provider's localised price preview in place of the figure", () => {
    render(
      <PlanCard
        name="p"
        plan={PLANS[1]}
        currency="EUR"
        interval="year"
        pricePreview={<span data-testid="preview">€44.95</span>}
      />,
    );
    expect(screen.getByTestId("preview")).toHaveTextContent("€44.95");
    expect(priceOf("pro")).toBe("€44.95");
    expect(plain(card(/Gardener/).closest("label")?.textContent)).toContain("per year");
  });

  it("names the current plan in words, as part of the radio's name", () => {
    render(<PlanCard name="p" plan={PLANS[1]} currency="CHF" interval="year" relation="current" />);
    expect(card("Gardener Current plan")).toHaveAttribute("data-relation", "current");
  });
});

describe("planRelation — by the catalogue's order, codes without case", () => {
  it("answers current, upgrade, downgrade, or nothing without a current plan", () => {
    expect(planRelation(PLANS, "pro", "PRO")).toBe("current");
    expect(planRelation(PLANS, "estate", "pro")).toBe("upgrade");
    expect(planRelation(PLANS, "free", "pro")).toBe("downgrade");
    expect(planRelation(PLANS, "pro", null)).toBeUndefined();
    expect(planRelation(PLANS, "pro", "gone")).toBeUndefined();
  });
});

describe("PlanPicker — the period, the currency, the cards and one Choose", () => {
  it("leads with yearly, and switches period and currency", async () => {
    const user = userEvent.setup();
    render(
      <UiKitProvider locale="en-GB">
        <PlanPicker plans={PLANS} defaultCurrency="CHF" onChoose={() => {}} />
      </UiKitProvider>,
    );
    const period = screen.getByRole("radiogroup", { name: "Billing period" });
    const options = within(period).getAllByRole("radio");
    expect(options.map((o) => o.textContent)).toEqual(["Yearly", "Monthly"]);
    expect(options[0]).toBeChecked();
    expect(priceOf("pro")).toBe("CHF 49");

    await user.click(within(period).getByRole("radio", { name: "Monthly" }));
    expect(priceOf("pro")).toBe("CHF 4.90");

    const currency = screen.getByRole("radiogroup", { name: "Currency" });
    await user.click(within(currency).getByRole("radio", { name: "EUR" }));
    expect(priceOf("pro")).toBe("€4.50");
  });

  it("starts on the current plan, refuses it with a reason, and says upgrade or downgrade", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<PlanPicker plans={PLANS} current="pro" defaultCurrency="CHF" onChoose={onChoose} />);
    expect(card("Gardener Current plan")).toBeChecked();
    const button = screen.getByRole("button", { name: "Choose Gardener" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(onChoose).not.toHaveBeenCalled();
    expect(document.getElementById(button.getAttribute("aria-describedby") ?? "")).toHaveTextContent(
      "This is your current plan.",
    );

    await user.click(card("Estate"));
    await user.click(screen.getByRole("button", { name: "Upgrade to Estate" }));
    expect(onChoose).toHaveBeenLastCalledWith({ plan: "estate", interval: "year", currency: "CHF" });

    await user.click(card("Seedling"));
    expect(screen.getByRole("button", { name: "Switch to Seedling" })).not.toHaveAttribute("aria-disabled");
  });

  it("says Choose with no plan paid for yet, and hands over the period and currency picked", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<PlanPicker plans={PLANS} defaultCurrency="EUR" defaultInterval="month" onChoose={onChoose} />);
    const nothing = screen.getByRole("button", { name: "Choose a plan" });
    expect(nothing).toHaveAttribute("aria-disabled", "true");
    await user.click(card("Gardener"));
    await user.click(screen.getByRole("button", { name: "Choose Gardener" }));
    expect(onChoose).toHaveBeenCalledWith({ plan: "pro", interval: "month", currency: "EUR" });
  });

  it("starts from the locale's currency when the app passes none", () => {
    render(
      <UiKitProvider locale="de-CH">
        <PlanPicker plans={PLANS} onChoose={() => {}} />
      </UiKitProvider>,
    );
    expect(within(screen.getByRole("radiogroup", { name: "Currency" })).getByRole("radio", { name: "CHF" })).toBeChecked();
  });

  it("never takes the write lock: a read-only payer must be able to pay (§3.3)", () => {
    render(
      <WriteLockProvider locked reason="Your plan has ended.">
        <PlanPicker plans={PLANS} defaultValue="pro" defaultCurrency="CHF" onChoose={() => {}} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: "Choose Gardener" })).not.toHaveAttribute("aria-disabled");
  });
});
