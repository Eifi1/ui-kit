import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Settings2, Trash2 } from "lucide-react";
import { HoverMenu } from "../hover-menu";
import { MenuItem } from "../menu-item";
import { TOPBAR_MENU_ITEM_CLASS } from "../../shell/topbar-controls";

/** keksdose's budget switcher, rebuilt from MenuItems: a radio set, a link, a danger row. */
function BudgetMenu({ onPick = () => {}, active = "home" }: { onPick?: (id: string) => void; active?: string }) {
  return (
    <HoverMenu
      aria-label="Account"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle}>
          Me
        </button>
      )}
    >
      {(close) => (
        <ul>
          {["home", "holiday"].map((id) => (
            <li key={id}>
              <MenuItem
                checked={id === active}
                onClick={() => {
                  onPick(id);
                  close();
                }}
              >
                {id}
              </MenuItem>
            </li>
          ))}
          <li>
            <MenuItem href="/budgets" icon={Settings2} onClick={close}>
              Manage budgets
            </MenuItem>
          </li>
          <li>
            <MenuItem icon={Trash2} tone="danger" disabled>
              Delete
            </MenuItem>
          </li>
          <li>
            <MenuItem tone="danger" onClick={close}>
              Sign out
            </MenuItem>
          </li>
        </ul>
      )}
    </HoverMenu>
  );
}

describe("MenuItem", () => {
  it("wears the shell's top-bar menu row, so mixed menus are one look", () => {
    render(<MenuItem onClick={() => {}}>Row</MenuItem>);
    const classes = screen.getByRole("menuitem").className.split(/\s+/);
    for (const cls of TOPBAR_MENU_ITEM_CLASS.split(/\s+/)) expect(classes).toContain(cls);
  });

  it("is a menuitemradio with aria-checked when it is a choice, and draws the check", () => {
    render(<BudgetMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Me" }));
    const radios = screen.getAllByRole("menuitemradio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    expect(radios[0].querySelector("svg")).not.toBeNull();
    expect(radios[1].querySelector("svg")).toBeNull();
    expect(radios[0]).not.toHaveAttribute("aria-pressed");
  });

  it("is a menuitemcheckbox for an independent on/off", () => {
    render(
      <MenuItem checkable="checkbox" checked={false} onClick={() => {}}>
        Show archived
      </MenuItem>,
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Show archived" })).toHaveAttribute("aria-checked", "false");
  });

  it("joins HoverMenu's roving focus, skipping the disabled row", () => {
    render(<BudgetMenu />);
    const t = screen.getByRole("button", { name: "Me" });
    act(() => t.focus());
    fireEvent.keyDown(t, { key: "Enter" });
    fireEvent.click(t);
    expect(document.activeElement).toHaveTextContent("home");
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
      order.push(document.activeElement!.textContent ?? "");
    }
    // home → holiday → Manage budgets → Sign out (Delete is skipped) → wraps to home.
    expect(order).toEqual(["holiday", "Manage budgets", "Sign out", "home"]);
    for (const row of [...screen.getAllByRole("menuitemradio"), ...screen.getAllByRole("menuitem")]) {
      expect(row).toHaveAttribute("tabindex", "-1");
    }
  });

  it("runs onClick, and a disabled row does not", () => {
    const onPick = vi.fn();
    render(<BudgetMenu onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: "Me" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "holiday" }));
    expect(onPick).toHaveBeenCalledWith("holiday");

    const onClick = vi.fn();
    render(
      <MenuItem disabled onClick={onClick}>
        Off
      </MenuItem>,
    );
    const off = screen.getByRole("menuitem", { name: "Off" });
    expect(off).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(off);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is a link through renderLink, with role menuitem and aria-current for the current page", () => {
    const onClick = vi.fn();
    render(
      <MenuItem
        href="/budgets"
        current
        onClick={onClick}
        renderLink={({ href, children, ...p }) => (
          <a data-router="yes" href={`#${href}`} {...p}>
            {children}
          </a>
        )}
      >
        Budgets
      </MenuItem>,
    );
    const link = screen.getByRole("menuitem", { name: "Budgets" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("data-router", "yes");
    expect(link).toHaveAttribute("href", "#/budgets");
    expect(link).toHaveAttribute("aria-current", "page");
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalled();
  });

  it("colours a danger row with the danger token", () => {
    render(
      <MenuItem tone="danger" onClick={() => {}}>
        Sign out
      </MenuItem>,
    );
    expect(screen.getByRole("menuitem").className).toContain("text-[var(--danger)]");
  });
});
