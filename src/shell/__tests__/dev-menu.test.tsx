import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevMenu, DEV_ORIGINAL_ROLE_KEY, type DevMenuSection } from "../dev-menu";

/**
 * docs/top-bar-harmonization.md §2.7.1 (0.51, keksdose): ONE flask for the kit's Account
 * section (the role and the plan, §6.2, §6.3) and the app's own dev sections after it —
 * keksdose's budget role, its "today" override, its resets — where 0.42 drew a flask per
 * switcher and left the app nowhere to put the rest.
 */

const ROLES = ["ADMIN", "MEMBER", "REVIEWER"] as const;
const PLANS = ["free", "pro"] as const;
type Role = (typeof ROLES)[number];
type Plan = (typeof PLANS)[number];

const BUDGET = ["owner", "editor", "guest", "viewer"] as const;
const TIME = ["Real today", "Last day of this month"] as const;

function App({
  enabled = true,
  account = true,
  withSections = true,
  billingOff = false,
  onReset = () => {},
}: {
  enabled?: boolean;
  account?: boolean;
  withSections?: boolean;
  billingOff?: boolean;
  onReset?: (what: string) => void;
}) {
  const [role, setRole] = useState<Role>("ADMIN");
  const [plan, setPlan] = useState<Plan>("free");
  const [budget, setBudget] = useState<string>("owner");
  const [time, setTime] = useState<string>("Real today");
  const [slow, setSlow] = useState(false);
  // The contract's three shapes, and nothing else: a "select" is radio rows, a toggle a
  // checkbox row, an action a plain row.
  const sections: DevMenuSection[] = [
    {
      key: "budget",
      title: "Budget",
      entries: BUDGET.map((b) => ({ key: b, label: b, checked: b === budget, onSelect: () => setBudget(b) })),
    },
    {
      key: "time",
      title: "Time",
      entries: [
        ...TIME.map((t) => ({ key: t, label: t, checked: t === time, onSelect: () => setTime(t) })),
        { key: "slow", label: "Slow server", checkable: "checkbox", checked: slow, onSelect: () => setSlow((s) => !s) },
      ],
    },
    { key: "resets", title: "Resets", entries: [{ key: "reset", label: "Reset tours", onSelect: () => onReset("tours") }] },
  ];
  return (
    <MemoryRouter>
      <DevMenu
        enabled={enabled}
        roles={account ? ROLES : undefined}
        currentRole={account ? role : undefined}
        onRole={account ? setRole : undefined}
        plans={account ? PLANS : undefined}
        currentPlan={account ? plan : undefined}
        onPlan={account ? setPlan : undefined}
        billingOff={billingOff}
        sections={withSections ? sections : undefined}
        active={time !== "Real today" || slow}
      />
    </MemoryRouter>
  );
}

const flask = () => screen.getByRole("button", { name: /^Dev tools/ });
const open = () => {
  fireEvent.click(flask());
  return screen.getByRole("menu");
};
/** The groups' names in the order drawn: each group is `aria-labelledby` its heading. */
const groupNames = () =>
  screen.getAllByRole("group").map((g) => document.getElementById(g.getAttribute("aria-labelledby") ?? "")?.textContent);
const group = (name: string | RegExp) => screen.getByRole("group", { name });

afterEach(() => sessionStorage.clear());

describe("DevMenu", () => {
  it("is one flask for the role, the plan and the app's sections", () => {
    const { container } = render(<App />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(container.querySelectorAll("svg.text-warning")).toHaveLength(1);
    // The menu's name, then what the role and plan are, as 0.42's two triggers said them.
    expect(flask()).toHaveAccessibleName("Dev tools · Role: ADMIN · Plan: free");
  });

  it("draws the Account section first: role and plan under their headings, Back to as before", () => {
    render(<App />);
    open();
    const role = group("Dev · role");
    expect(within(role).getByRole("menuitemradio", { name: "ADMIN" })).toHaveAttribute("aria-checked", "true");
    expect(within(group("Dev · plan")).getByRole("menuitemradio", { name: "free" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText(/Back to/)).toBeNull();

    fireEvent.click(within(role).getByRole("menuitemradio", { name: "MEMBER" }));
    expect(sessionStorage.getItem(DEV_ORIGINAL_ROLE_KEY)).toBe("ADMIN");
    expect(flask()).toHaveAccessibleName("Dev tools · Role: MEMBER · Plan: free");
    // A second switch keeps the FIRST role.
    open();
    fireEvent.click(within(group("Dev · role")).getByRole("menuitemradio", { name: "REVIEWER" }));
    expect(sessionStorage.getItem(DEV_ORIGINAL_ROLE_KEY)).toBe("ADMIN");
    open();
    fireEvent.click(screen.getByRole("menuitem", { name: "Back to ADMIN" }));
    expect(flask()).toHaveAccessibleName(/Role: ADMIN/);
    expect(sessionStorage.getItem(DEV_ORIGINAL_ROLE_KEY)).toBeNull();
    open();
    expect(screen.queryByText(/Back to/)).toBeNull();

    fireEvent.click(within(group("Dev · plan")).getByRole("menuitemradio", { name: "pro" }));
    expect(flask()).toHaveAccessibleName("Dev tools · Role: ADMIN · Plan: pro");
  });

  it("draws the app's sections after it, in order, each a group named by its title", () => {
    const onReset = vi.fn();
    render(<App onReset={onReset} />);
    open();
    expect(groupNames()).toEqual(["Dev · role", "Dev · plan", "Budget", "Time", "Resets"]);

    const budget = group("Budget");
    expect(within(budget).getAllByRole("menuitemradio").map((r) => r.textContent)).toEqual([...BUDGET]);
    expect(within(budget).getByRole("menuitemradio", { name: "owner" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(budget).getByRole("menuitemradio", { name: "guest" }));
    open();
    expect(within(group("Budget")).getByRole("menuitemradio", { name: "guest" })).toHaveAttribute("aria-checked", "true");

    expect(within(group("Time")).getByRole("menuitemcheckbox", { name: "Slow server" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(within(group("Resets")).getByRole("menuitem", { name: "Reset tours" }));
    expect(onReset).toHaveBeenCalledWith("tours");
  });

  it("keeps two sections' row keys apart", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const rows = (prefix: string): DevMenuSection => ({
      key: prefix,
      title: prefix,
      entries: [{ key: "reset", label: `${prefix} reset`, onSelect: () => {} }, { kind: "divider", key: "sep" }, { key: "x", label: `${prefix} x`, onSelect: () => {} }],
    });
    render(
      <MemoryRouter>
        <DevMenu enabled sections={[rows("A"), rows("B")]} />
      </MemoryRouter>,
    );
    open();
    expect(screen.getAllByRole("menuitem").map((r) => r.textContent)).toEqual(["A reset", "A x", "B reset", "B x"]);
    expect(error.mock.calls.flat().join(" ")).not.toMatch(/same key/);
    error.mockRestore();
  });

  it("names the plan group with the billingOff note, and the plans stay usable", () => {
    render(<App billingOff />);
    open();
    const plan = group(/^Dev · plan/);
    expect(plan).toHaveAccessibleName("Dev · plan Billing is off locally: plans change nothing");
    expect(screen.getByText("Billing is off locally: plans change nothing")).toBeInTheDocument();
    fireEvent.click(within(plan).getByRole("menuitemradio", { name: "pro" }));
    expect(flask()).toHaveAccessibleName(/Plan: pro/);
  });

  it("active: a dot on the flask, and its words in the trigger's name", () => {
    render(<App />);
    expect(flask().querySelector("[data-tone]")).toBeNull();
    expect(flask()).not.toHaveAccessibleName(/Overrides on/);
    open();
    fireEvent.click(within(group("Time")).getByRole("menuitemradio", { name: "Last day of this month" }));
    expect(flask().querySelector("[data-tone]")).not.toBeNull();
    expect(flask()).toHaveAccessibleName("Dev tools · Role: ADMIN · Plan: free Overrides on");
    open();
    fireEvent.click(within(group("Time")).getByRole("menuitemradio", { name: "Real today" }));
    expect(flask().querySelector("[data-tone]")).toBeNull();
    expect(flask()).toHaveAccessibleName("Dev tools · Role: ADMIN · Plan: free");
  });

  it("draws the app's sections alone, with no role or plan", () => {
    render(<App account={false} />);
    expect(flask()).toHaveAccessibleName("Dev tools");
    open();
    expect(groupNames()).toEqual(["Budget", "Time", "Resets"]);
  });

  it("renders nothing unless enabled", () => {
    const { container } = render(<App enabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing with nothing to show", () => {
    const { container, rerender } = render(<App account={false} withSections={false} />);
    expect(container).toBeEmptyDOMElement();
    // Sections with no rows in them are nothing to show either, and so is a role list
    // with no handler.
    rerender(
      <MemoryRouter>
        <DevMenu enabled roles={ROLES} currentRole="ADMIN" sections={[{ key: "empty", title: "Empty", entries: [] }]} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("reads the kept role again when it turns on late (0.43, keksdose 1)", () => {
    sessionStorage.setItem(DEV_ORIGINAL_ROLE_KEY, "ADMIN");
    const props = { roles: ROLES, currentRole: "MEMBER" as const, onRole: vi.fn() };
    const { rerender } = render(
      <MemoryRouter>
        <DevMenu enabled={false} {...props} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    rerender(
      <MemoryRouter>
        <DevMenu enabled {...props} />
      </MemoryRouter>,
    );
    open();
    expect(screen.getByRole("menuitem", { name: "Back to ADMIN" })).toBeInTheDocument();
  });

  it("scrolls its panel: ~25 rows overflow a 390×844 phone", () => {
    render(<App />);
    const list = open().querySelector("ul");
    expect(list).toHaveClass("overflow-y-auto", "max-h-[calc(100dvh-4rem)]");
  });

  it("0.51.4: from md up, one column per group, in order (keksdose dev #640)", () => {
    render(<App />);
    const list = open().querySelector("ul")!;
    expect(list).toHaveClass("md:grid");
    const columns = [...list.querySelectorAll<HTMLElement>(":scope > [data-menu-column]")];
    const names = columns.map((c) => within(c).getByRole("group").getAttribute("aria-labelledby"));
    expect(names.map((id) => document.getElementById(id!)!.textContent)).toEqual(
      within(list)
        .getAllByRole("group")
        .map((g) => document.getElementById(g.getAttribute("aria-labelledby")!)!.textContent),
    );
    expect(columns.length).toBeGreaterThanOrEqual(3);
  });
});
