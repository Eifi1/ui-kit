import { useState } from "react";
import type { ReactNode } from "react";
import { fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WriteLockProvider } from "../../components/write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { toLocalIso } from "../../lib/dates";
import { PlanChangeConfirm, planColumn, usePlanChangeResult, usePlanColumn } from "../plan-change";
import type { PlanChangeConfirmProps } from "../plan-change";

/**
 * The operator's plan parts (docs/billing-harmonization.md §14.12, decision 27):
 * keksdose's column and `PlanConfirm`, for all three apps, and the lines of the answer.
 */

const PLANS = [
  { code: "free", name: "Free" },
  { code: "pro", name: "Pro" },
  { code: "team", name: "Team" },
];
const planName = (code: string) => PLANS.find((p) => p.code === code)?.name ?? code;

interface Row {
  id: number;
  plan: string | null;
  status?: "trialing" | "active" | "comped";
  used?: number;
  limit?: number | null;
}

describe("planColumn (§14.12)", () => {
  const column = planColumn<Row>({
    plan: (r) => r.plan,
    planName,
    status: (r) => r.status,
    usage: (r) => (r.used === undefined ? undefined : { used: r.used, limit: r.limit ?? null, label: "budgets" }),
    filterPlans: ["FREE", "pro", "team", "free"],
  });

  it("shows the plan's name, the standing chip and the usage under it", () => {
    const { container } = render(<>{column.cell({ id: 1, plan: "PRO", status: "trialing", used: 1, limit: 5 })}</>);
    // The code is read without case (§12.16) and named by the app.
    expect(container.querySelector('[data-plan="pro"]')).toHaveTextContent("Pro");
    expect(container.querySelector('[data-status="trialing"]')).toHaveTextContent("Trial");
    expect(screen.getByText("1/5")).toBeInTheDocument();
    expect(screen.getByText("1 of 5 budgets")).toBeInTheDocument();
  });

  it("draws no chip without a status and no usage line for a null limit; a dash for no plan", () => {
    const { container } = render(<>{column.cell({ id: 2, plan: "team", used: 9, limit: null })}</>);
    expect(container.querySelector("[data-status]")).toBeNull();
    expect(container).toHaveTextContent(/^Team$/);
    const none = render(<>{column.cell({ id: 3, plan: null })}</>);
    expect(none.container).toHaveTextContent("—");
  });

  it("sorts by the code, filters over the given codes by name, and says Plan", () => {
    expect(column.key).toBe("plan");
    expect(column.header).toBe("Plan");
    expect(column.headerText).toBe("Plan");
    expect(column.sortBy?.({ id: 1, plan: "PRO" })).toBe("pro");
    expect(column.filter).toMatchObject({ type: "select" });
    const filter = column.filter as { getValue: (r: Row) => string; options: { value: string; label?: string }[] };
    expect(filter.options).toEqual([
      { value: "free", label: "Free" },
      { value: "pro", label: "Pro" },
      { value: "team", label: "Team" },
    ]);
    expect(filter.getValue({ id: 1, plan: "FREE" })).toBe("free");
    expect(filter.getValue({ id: 1, plan: null })).toBe("");
  });

  it("takes the catalogue's sort, or none, and the app's key and header", () => {
    const rank = { free: 0, pro: 1, team: 2 } as Record<string, number>;
    const ranked = planColumn<Row>({ plan: (r) => r.plan, planName, sortBy: (r) => rank[r.plan ?? ""] ?? -1 });
    expect(ranked.sortBy?.({ id: 1, plan: "team" })).toBe(2);
    expect(ranked.filter).toBeUndefined();
    const plain = planColumn<Row>({ key: "tier", plan: (r) => r.plan, planName, sortBy: false, headerText: "Tier" });
    expect(plain.sortBy).toBeUndefined();
    expect(plain).toMatchObject({ key: "tier", header: "Tier", headerText: "Tier" });
  });

  it("usePlanColumn speaks the provider's language", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>{children}</UiKitProvider>
    );
    const plan = (r: Row) => r.plan;
    const { result } = renderHook(() => usePlanColumn<Row>({ plan, planName }), { wrapper });
    expect(result.current.headerText).toBe("Tarif");
  });
});

/* ── PlanChangeConfirm ─────────────────────────────────────────────────────── */

const ADA = { email: "ada@example.com", first: "Ada", last: "Example" };

function Harness(props: Partial<PlanChangeConfirmProps> & { wrap?: (node: ReactNode) => ReactNode }) {
  const [open, setOpen] = useState(true);
  const { wrap = (node) => node, ...rest } = props;
  return (
    <UiKitProvider locale="en-GB">
      {open &&
        wrap(
          <PlanChangeConfirm
            target={ADA}
            plans={PLANS}
            current="FREE"
            onConfirm={async () => undefined}
            onClose={() => setOpen(false)}
            {...rest}
          />,
        )}
    </UiKitProvider>
  );
}

const ACK = "I have read what this does and want to continue.";

describe("PlanChangeConfirm (§14.12)", () => {
  it("opens on the current plan and holds the confirm until something changes", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => undefined);
    render(<Harness onConfirm={onConfirm} usage="3 of 5 budgets" />);
    const dialog = await screen.findByRole("alertdialog", { name: "Change plan" });
    expect(dialog).toHaveTextContent("Current plan: Free");
    expect(dialog).toHaveTextContent("3 of 5 budgets");
    expect(dialog).toHaveTextContent("A smaller plan only blocks creating more; nothing is deleted.");
    const select = within(dialog).getByRole("combobox", { name: "Plan" }) as HTMLSelectElement;
    expect(select.value).toBe("free");
    // No end field without `grantEnd` (billing off).
    expect(within(dialog).queryByText("Free until")).toBeNull();

    await user.click(within(dialog).getByRole("checkbox", { name: ACK }));
    const held = within(dialog).getByRole("button", { name: "Change plan" });
    expect(held).toHaveAttribute("aria-disabled", "true");
    expect(held).toHaveAccessibleDescription("Pick another plan or an end date.");

    await user.selectOptions(select, "pro");
    await user.click(within(dialog).getByRole("button", { name: "Change plan" }));
    expect(onConfirm).toHaveBeenCalledWith({ plan: "pro" }, { acknowledged: true });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("offers Free until with grantEnd, sent as the END of the picked day", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => undefined);
    render(<Harness onConfirm={onConfirm} grantEnd />);
    const dialog = await screen.findByRole("alertdialog", { name: "Change plan" });
    expect(dialog).toHaveTextContent("Leave empty for no end. A running beta keeps its own end.");
    // The same plan with an end is a change: a grant until the picked day.
    const today = toLocalIso(new Date());
    fireEvent.click(within(dialog).getByRole("combobox", { name: /^Free until/ }));
    const day = new Date(`${today}T12:00:00`).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    fireEvent.click(screen.getByRole("gridcell", { name: day }));
    await user.click(within(dialog).getByRole("checkbox", { name: ACK }));
    await user.click(within(dialog).getByRole("button", { name: "Change plan" }));
    expect(onConfirm).toHaveBeenCalledWith(
      { plan: "free", comped_until: new Date(`${today}T23:59:59`).toISOString() },
      { acknowledged: true },
    );
  });

  it("says a company's name where it has no address, and holds a choice with no plan yet", async () => {
    render(<Harness target={{ name: "Hausverwaltung Muster AG" }} current={null} />);
    const dialog = await screen.findByRole("alertdialog", { name: "Change plan" });
    expect(dialog).toHaveAccessibleDescription("Hausverwaltung Muster AG");
    expect(dialog).not.toHaveTextContent("Current plan");
    expect((within(dialog).getByRole("combobox", { name: "Plan" }) as HTMLSelectElement).value).toBe("");
  });

  it("stays live under a billing lock — an admin route (§12.13, §12.36) — and not under the demo's", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => undefined);
    const billing = (node: ReactNode) => (
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        {node}
      </WriteLockProvider>
    );
    const { unmount } = render(<Harness onConfirm={onConfirm} wrap={billing} />);
    let dialog = await screen.findByRole("alertdialog", { name: "Change plan" });
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "Plan" }), "team");
    await user.click(within(dialog).getByRole("checkbox", { name: ACK }));
    await user.click(within(dialog).getByRole("button", { name: "Change plan" }));
    expect(onConfirm).toHaveBeenCalledWith({ plan: "team" }, { acknowledged: true });
    unmount();

    const demo = (node: ReactNode) => (
      <WriteLockProvider locked kind="demo" reason="Not possible in the demo.">
        {node}
      </WriteLockProvider>
    );
    render(<Harness onConfirm={onConfirm} wrap={demo} />);
    dialog = await screen.findByRole("alertdialog", { name: "Change plan" });
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "Plan" }), "team");
    await user.click(within(dialog).getByRole("checkbox", { name: ACK }));
    const held = within(dialog).getByRole("button", { name: "Change plan" });
    expect(held).toHaveAttribute("aria-disabled", "true");
    expect(held).toHaveAccessibleDescription("Not possible in the demo.");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

/* ── usePlanChangeResult ───────────────────────────────────────────────────── */

describe("usePlanChangeResult — the answer's lines and tones (§14.12)", () => {
  const lines = (wrapper?: (p: { children: ReactNode }) => ReactNode) =>
    renderHook(() => usePlanChangeResult(), { wrapper }).result.current;

  it("says from → to, or set with no previous plan, as a success", () => {
    const result = lines();
    expect(result({ previous_plan: "FREE", plan: "pro", over_limit: false, limits: {}, usage: {} }, planName)).toEqual([
      { tone: "success", text: "Plan changed from Free to Pro." },
    ]);
    expect(result({ previous_plan: null, plan: "pro", over_limit: false, limits: {}, usage: {} }, planName)).toEqual([
      { tone: "success", text: "Plan set to Pro." },
    ]);
    expect(result({ previous_plan: "pro", plan: "pro", over_limit: false, limits: {}, usage: {} }, planName)[0].text).toBe("Plan set to Pro.");
  });

  it("says a kept beta as info, else a grant's end as a success", () => {
    const result = lines(({ children }) => <UiKitProvider locale="en-GB">{children}</UiKitProvider>);
    expect(
      result({ previous_plan: "free", plan: "pro", over_limit: false, limits: {}, usage: {}, kept_beta: true, comped_until: null }, planName)[1],
    ).toEqual({ tone: "info", text: "The beta keeps its end; only the plan changed." });
    const until = result(
      { previous_plan: "free", plan: "pro", over_limit: false, limits: {}, usage: {}, comped_until: "2027-01-31T22:59:59Z" },
      planName,
    );
    expect(until[1].tone).toBe("success");
    expect(until[1].text).toMatch(/^Free until 31 Jan 2027\.$/);
  });

  it("warns over the new limit, with a figure line per dimension above it", () => {
    const result = lines();
    expect(
      result(
        {
          previous_plan: "team",
          plan: "free",
          over_limit: true,
          limits: { budgets: 5, scans: null, seats: 2, units: 10 },
          usage: { budgets: 7, scans: 300, units: 10 },
        },
        planName,
        { dimensionLabels: { budgets: "Budgets" } },
      ),
    ).toEqual([
      { tone: "success", text: "Plan changed from Team to Free." },
      { tone: "warning", text: "Above the new plan’s limit: nothing is removed, new items are blocked." },
      // A null limit and a dimension at (not over) its limit give no line; nor one without a figure.
      { tone: "warning", text: "Budgets: 7 of 5" },
    ]);
  });

  it("speaks the provider's language", () => {
    const result = lines(({ children }) => <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>{children}</UiKitProvider>);
    const out = result(
      { previous_plan: "free", plan: "pro", over_limit: true, limits: { budgets: 1 }, usage: { budgets: 2 } },
      planName,
      { dimensionLabels: { budgets: "Budgets" } },
    );
    expect(out.map((l) => l.text)).toEqual([
      "Tarif von Free auf Pro geändert.",
      "Über dem Limit des neuen Tarifs: Nichts wird entfernt, neue Einträge sind gesperrt.",
      "Budgets: 2 von 1",
    ]);
  });
});
