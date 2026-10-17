import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevSwitchers, DEV_ORIGINAL_ROLE_KEY } from "../dev-switchers";

/** docs/top-bar-harmonization.md §2.7, §6.2, §6.3. */

const ROLES = ["ADMIN", "MEMBER", "REVIEWER"] as const;
const PLANS = ["free", "pro"] as const;
type Role = (typeof ROLES)[number];

function App({ billingOff = false, originalRole, enabled = true }: { billingOff?: boolean; originalRole?: Role; enabled?: boolean }) {
  const [role, setRole] = useState<Role>("ADMIN");
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("free");
  return (
    <MemoryRouter>
      <DevSwitchers
        enabled={enabled}
        roles={ROLES}
        currentRole={role}
        onRole={setRole}
        plans={PLANS}
        currentPlan={plan}
        onPlan={setPlan}
        billingOff={billingOff}
        originalRole={originalRole}
      />
    </MemoryRouter>
  );
}

const roleTrigger = () => screen.getByRole("button", { name: /Switch role/ });
const planTrigger = () => screen.getByRole("button", { name: /Switch plan/ });
const openRole = () => {
  fireEvent.click(roleTrigger());
  return screen.getByRole("menu");
};

afterEach(() => sessionStorage.clear());

describe("DevSwitchers", () => {
  it("renders nothing unless enabled", () => {
    const { container } = render(<App enabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("role then plan, both behind the amber flask", () => {
    const { container } = render(<App />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName(/Switch role · Role: ADMIN/);
    expect(buttons[1]).toHaveAccessibleName(/Switch plan · Plan: free/);
    expect(container.querySelectorAll("svg.text-warning")).toHaveLength(2);
  });

  it("checks the active role and switches through onRole", () => {
    render(<App />);
    const menu = openRole();
    expect(within(menu).getByRole("menuitemradio", { name: "ADMIN" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "MEMBER" }));
    expect(roleTrigger()).toHaveAccessibleName(/Role: MEMBER/);
  });

  it("keeps the original role in sessionStorage and offers Back to it (§6.2)", () => {
    render(<App />);
    expect(within(openRole()).queryByText(/Back to/)).toBeNull();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "MEMBER" }));
    expect(sessionStorage.getItem(DEV_ORIGINAL_ROLE_KEY)).toBe("ADMIN");
    // A second switch keeps the FIRST role.
    fireEvent.click(within(openRole()).getByRole("menuitemradio", { name: "REVIEWER" }));
    expect(sessionStorage.getItem(DEV_ORIGINAL_ROLE_KEY)).toBe("ADMIN");
    fireEvent.click(within(openRole()).getByRole("menuitem", { name: "Back to ADMIN" }));
    expect(roleTrigger()).toHaveAccessibleName(/Role: ADMIN/);
    expect(sessionStorage.getItem(DEV_ORIGINAL_ROLE_KEY)).toBeNull();
    expect(within(openRole()).queryByText(/Back to/)).toBeNull();
  });

  it("reads the kept role back after a reload", () => {
    sessionStorage.setItem(DEV_ORIGINAL_ROLE_KEY, "REVIEWER");
    render(<App />);
    expect(within(openRole()).getByRole("menuitem", { name: "Back to REVIEWER" })).toBeInTheDocument();
  });

  it("originalRole from the app wins over the kept one", () => {
    sessionStorage.setItem(DEV_ORIGINAL_ROLE_KEY, "REVIEWER");
    render(<App originalRole="MEMBER" />);
    expect(within(openRole()).getByRole("menuitem", { name: "Back to MEMBER" })).toBeInTheDocument();
  });

  it("survives a browser that refuses storage", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<App />);
    fireEvent.click(within(openRole()).getByRole("menuitemradio", { name: "MEMBER" }));
    expect(within(openRole()).getByRole("menuitem", { name: "Back to ADMIN" })).toBeInTheDocument();
    get.mockRestore();
    set.mockRestore();
  });

  it("switches the plan, and with billingOff says plans change nothing (§6.3)", () => {
    const { unmount } = render(<App />);
    fireEvent.click(planTrigger());
    expect(screen.queryByText(/Billing is off/)).toBeNull();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "pro" }));
    expect(planTrigger()).toHaveAccessibleName(/Plan: pro/);
    unmount();
    render(<App billingOff />);
    fireEvent.click(planTrigger());
    expect(screen.getByText("Billing is off locally: plans change nothing")).toBeInTheDocument();
    // Still usable.
    fireEvent.click(screen.getByRole("menuitemradio", { name: "pro" }));
    expect(planTrigger()).toHaveAccessibleName(/Plan: pro/);
  });

  it("draws only the switcher it has a list and a handler for", () => {
    const admin: Role = "ADMIN";
    render(
      <MemoryRouter>
        <DevSwitchers enabled roles={ROLES} currentRole={admin} onRole={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("draws the plan menu before the current plan is known, with no row checked (kastlan B4)", () => {
    const onPlan = vi.fn();
    render(
      <MemoryRouter>
        <DevSwitchers enabled plans={PLANS} onPlan={onPlan} billingOff />
      </MemoryRouter>,
    );
    expect(planTrigger()).toHaveAccessibleName("Switch plan");
    fireEvent.click(planTrigger());
    const rows = screen.getAllByRole("menuitemradio");
    expect(rows.every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "pro" }));
    expect(onPlan).toHaveBeenCalledWith("pro");
  });
});
