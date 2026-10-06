import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CompanySwitcher } from "../company-switcher";

/**
 * kastlan's several companies (docs/auth-harmonization.md §5.3): a switcher in the top
 * bar on OptionSwitcherMenu, only for a user in more than one company, disabled while a
 * switch runs. Synthetic companies only.
 */

const COMPANIES = [
  { id: 1, name: "Example Property Ltd" },
  { id: 2, name: "Sample Estates AG" },
  { id: 3, name: "Demo Housing Co" },
];

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Switch company" }));
  return screen.getByRole("menu", { name: "Switch company" });
}

describe("CompanySwitcher", () => {
  it("renders nothing for one company, or none", () => {
    const { container, rerender } = render(
      <CompanySwitcher companies={[COMPANIES[0]!]} currentId={1} onSwitch={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<CompanySwitcher companies={[]} currentId={1} onSwitch={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists the companies with the current one marked, under its heading", async () => {
    const user = userEvent.setup();
    render(<CompanySwitcher companies={COMPANIES} currentId={2} onSwitch={vi.fn()} />);
    const menu = await openMenu(user);
    expect(menu).toHaveTextContent("Companies");
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual([
      "Example Property Ltd",
      "Sample Estates AG (current)",
      "Demo Housing Co",
    ]);
  });

  it("calls onSwitch with the picked company's id, in its own type", async () => {
    const user = userEvent.setup();
    const onSwitch = vi.fn();
    render(<CompanySwitcher companies={COMPANIES} currentId={1} onSwitch={onSwitch} />);
    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Demo Housing Co" }));
    expect(onSwitch).toHaveBeenCalledWith(3);
  });

  it("does nothing for the current company", async () => {
    const user = userEvent.setup();
    const onSwitch = vi.fn();
    render(<CompanySwitcher companies={COMPANIES} currentId={1} onSwitch={onSwitch} />);
    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: /Example Property Ltd/ }));
    expect(onSwitch).not.toHaveBeenCalled();
  });

  it("is disabled while the switch runs, says so, and is back once it settles — rejected too", async () => {
    const user = userEvent.setup();
    let settle!: { resolve: () => void; reject: (e: unknown) => void };
    const onSwitch = vi.fn(
      () => new Promise<void>((resolve, reject) => (settle = { resolve, reject })),
    );
    const { container } = render(<CompanySwitcher companies={COMPANIES} currentId={1} onSwitch={onSwitch} />);
    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Sample Estates AG" }));
    const busy = screen.getByRole("button", { name: "Switch company" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(container.querySelector(".sr-only-fixed")).toHaveTextContent("Switching company…"));

    settle.reject(new Error("403"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Switch company" })).toBeEnabled());
    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Sample Estates AG" }));
    expect(onSwitch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Switch company" })).toBeDisabled();
    settle.resolve();
    await waitFor(() => expect(screen.getByRole("button", { name: "Switch company" })).toBeEnabled());
  });

  it("describes the trigger with the current company, and takes a context's own words and string ids", async () => {
    const user = userEvent.setup();
    const onSwitch = vi.fn();
    render(
      <CompanySwitcher
        companies={[
          { id: "household", name: "Household" },
          { id: "holiday", name: "Holiday fund" },
        ]}
        currentId="household"
        onSwitch={onSwitch}
        labels={{ switchCompany: "Switch budget", heading: "Budgets", current: (name) => `Budget: ${name}` }}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Switch budget" });
    // The tooltip (portalled, so mounted only while up) describes the focused trigger.
    await user.tab();
    expect(trigger).toHaveFocus();
    await waitFor(() => expect(trigger).toHaveAccessibleDescription("Budget: Household"));
    await user.click(trigger);
    expect(screen.getByRole("menu", { name: "Switch budget" })).toHaveTextContent("Budgets");
    await user.click(screen.getByRole("menuitem", { name: "Holiday fund" }));
    expect(onSwitch).toHaveBeenCalledWith("holiday");
  });
});
