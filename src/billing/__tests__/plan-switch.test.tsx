import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WriteLockProvider } from "../../components/write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { formatDate, formatMoney } from "../../lib/format";
import type { PlanSwitchPreview } from "../billing-overview";
import { PlanSwitchConfirm } from "../plan-switch";
import type { PlanSwitchConfirmProps } from "../plan-switch";

/**
 * The payer's plan switch (docs/billing-harmonization.md §15.2.10): Paddle's preview as
 * a figure the payer agrees to — a charge or a credit, and the next charge — the
 * dimensions over the new limit, and a confirm no billing lock holds.
 */

const NAMES: Record<string, string> = { free: "Free", pro: "Pro", business: "Business" };
const planName = (code: string) => NAMES[code] ?? code;

const UPGRADE: PlanSwitchPreview = {
  currency: "CHF",
  now_minor: 1250,
  next_minor: 9900,
  next_billed_at: "2026-11-09T10:00:00Z",
  plan: "business",
  interval: "year",
  over_limit: [],
  limits: { budgets: 20 },
  usage: { budgets: 3 },
};

const DOWNGRADE: PlanSwitchPreview = {
  ...UPGRADE,
  currency: "EUR",
  now_minor: -730,
  next_minor: 490,
  plan: "free",
  interval: "month",
  over_limit: ["budgets", "members"],
  limits: { budgets: 1, members: 2, devices: null },
  usage: { budgets: 7, members: 5, devices: 9 },
};

function Switch(props: Partial<PlanSwitchConfirmProps> & { wrap?: (node: ReactNode) => ReactNode }) {
  const { wrap = (node) => node, ...rest } = props;
  return wrap(
    <PlanSwitchConfirm
      open
      onOpenChange={() => {}}
      from={{ plan: "pro", interval: "month" }}
      to={{ plan: "business", interval: "year" }}
      preview={UPGRADE}
      planName={planName}
      onConfirm={() => {}}
      locale="en-US"
      {...rest}
    />,
  );
}

const dialog = () => screen.findByRole("dialog", { name: "Change plan" });
/** Text with every space alike: `Intl` writes a no-break space into a sum. */
const flat = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ");
const textOf = (el: Element | null) => flat(el?.textContent);

describe("PlanSwitchConfirm (§15.2.10)", () => {
  it("names both sides with their periods, and the upgrade's charge now and next charge", async () => {
    render(<Switch />);
    const d = await dialog();
    expect(d).toHaveAccessibleDescription("From Pro (Monthly) to Business (Yearly)");
    const preview = d.querySelector("[data-plan-switch-preview]")!;
    expect(textOf(preview)).toContain(flat(`Charged now${formatMoney(12.5, "CHF", { locale: "en-US" })}`));
    expect(textOf(preview)).toContain(
      flat(
        `Next charge on ${formatDate("2026-11-09T10:00:00Z", "medium", { locale: "en-US" })}${formatMoney(99, "CHF", { locale: "en-US" })}`,
      ),
    );
    expect(d.querySelector("[data-now]")).toHaveAttribute("data-now", "charge");
    expect(d.querySelector("[data-plan-switch-over-limit]")).toBeNull();
  });

  it("says a downgrade's credit as a positive figure, and the lines over the new limit", async () => {
    render(
      <Switch
        to={{ plan: "free", interval: "month" }}
        preview={DOWNGRADE}
        dimensionLabels={{ budgets: "Budgets", members: { one: "member", other: "members" } }}
      />,
    );
    const d = await dialog();
    const now = d.querySelector("[data-now]")!;
    expect(now).toHaveAttribute("data-now", "credit");
    expect(textOf(now)).toBe(flat(formatMoney(7.3, "EUR", { locale: "en-US" })));
    expect(now).not.toHaveTextContent("-");
    expect(d).toHaveTextContent("Credited towards your next charges");
    expect(d).not.toHaveTextContent("Charged now");
    const over = d.querySelector("[data-plan-switch-over-limit]")!;
    expect(over).toHaveTextContent("Above the new plan’s limit");
    // A heading's word in limitUsageLine, plural forms in usageOf; an unlimited one none.
    expect(
      within(over as HTMLElement)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Budgets: 7 of 1", "5 of 2 members"]);
  });

  it("formats the figures as the app says, and names a dimension by its key without a word", async () => {
    render(
      <Switch
        preview={{ ...DOWNGRADE, over_limit: ["storage"], limits: { storage: 1024 }, usage: { storage: 2048 } }}
        formatLimit={(dimension, value) => `${value / 1024} GB (${dimension})`}
      />,
    );
    const d = await dialog();
    expect(within(d).getByRole("listitem")).toHaveTextContent("storage: 2 GB (storage) of 1 GB (storage)");
  });

  it("leaves out the next charge without a date", async () => {
    render(<Switch preview={{ ...UPGRADE, next_billed_at: null }} />);
    const d = await dialog();
    expect(d).not.toHaveTextContent("Next charge");
  });

  it("takes a server's preview without the next charge's fields (0.39.1: optional, as OpenAPI generates them)", async () => {
    const { next_minor: _minor, next_billed_at: _at, ...withoutNext } = UPGRADE;
    render(<Switch preview={withoutNext} />);
    const d = await dialog();
    expect(d).not.toHaveTextContent("Next charge");
  });

  it("shows a spinner and holds Confirm while the preview loads", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Switch preview={undefined} onConfirm={onConfirm} />);
    const d = await dialog();
    expect(within(d).getByRole("status")).toHaveTextContent("Loading…");
    expect(d).toHaveAttribute("aria-busy", "true");
    await user.click(within(d).getByRole("button", { name: "Change plan" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms once, and Cancel answers onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(<Switch onConfirm={onConfirm} onOpenChange={onOpenChange} />);
    const d = await dialog();
    await user.click(within(d).getByRole("button", { name: "Change plan" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    rerender(<Switch onConfirm={onConfirm} onOpenChange={onOpenChange} pending />);
    await user.click(within(d).getByRole("button", { name: "Change plan" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    rerender(<Switch onConfirm={onConfirm} onOpenChange={onOpenChange} />);
    await user.click(within(d).getByRole("button", { name: "Cancel" }));
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("takes no billing lock — a read-only payer may change plan — but a demo lock holds it", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const billing = (node: ReactNode) => (
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        {node}
      </WriteLockProvider>
    );
    const { unmount } = render(<Switch onConfirm={onConfirm} wrap={billing} />);
    let d = await dialog();
    await user.click(within(d).getByRole("button", { name: "Change plan" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    unmount();

    const demo = (node: ReactNode) => (
      <WriteLockProvider locked kind="demo" reason="Not possible in the demo.">
        {node}
      </WriteLockProvider>
    );
    render(<Switch onConfirm={onConfirm} wrap={demo} />);
    d = await dialog();
    const held = within(d).getByRole("button", { name: "Change plan" });
    expect(held).toHaveAttribute("aria-disabled", "true");
    expect(held).toHaveAccessibleDescription("Not possible in the demo.");
  });

  it("speaks the provider's language", async () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
        <Switch locale={undefined} to={{ plan: "free", interval: "month" }} preview={DOWNGRADE} />
      </UiKitProvider>,
    );
    const d = await screen.findByRole("dialog", { name: "Tarif ändern" });
    expect(d).toHaveAccessibleDescription("Von Pro (Monatlich) zu Free (Monatlich)");
    expect(d).toHaveTextContent("Gutschrift auf die nächsten Belastungen");
    expect(textOf(d)).toContain(flat(formatMoney(7.3, "EUR", { locale: "de-CH" })));
    expect(d).toHaveTextContent("budgets: 7 von 1");
  });
});
