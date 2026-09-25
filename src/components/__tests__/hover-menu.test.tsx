import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HoverMenu } from "../hover-menu";

/**
 * Menu semantics for `HoverMenu`: it declared `role="menu"` over plain list markup, with
 * no `menuitem`s, no arrow keys and no Escape, and put its name on the role-less wrapper.
 * The rows below are written the way every kit caller writes them — a `<ul>` of `<li>`
 * holding plain `<button>`s and links — because the panel has to upgrade THAT markup.
 */
function Menu({
  align,
  onPick = () => {},
  ...props
}: {
  align?: "start" | "end" | "left" | "right";
  onPick?: (what: string) => void;
  ariaLabel?: string;
  "aria-label"?: string;
}) {
  return (
    <HoverMenu
      {...props}
      align={align}
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle}>
          Tours
        </button>
      )}
    >
      {(close) => (
        <ul>
          <li className="heading">Pick one</li>
          {["Basics", "Budgets", "Reports"].map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => {
                  onPick(name);
                  close();
                }}
              >
                {name}
              </button>
            </li>
          ))}
          <li>
            <a href="/help">Help</a>
          </li>
        </ul>
      )}
    </HoverMenu>
  );
}

const trigger = () => screen.getByRole("button", { name: "Tours" });

/** A keyboard open: Enter on the focused trigger, then the click the browser makes of it. */
function keyboardOpen() {
  const t = trigger();
  act(() => t.focus());
  fireEvent.keyDown(t, { key: "Enter" });
  fireEvent.click(t);
}

describe("HoverMenu semantics", () => {
  it("exposes the rows as menuitems of a named menu, with no list roles in between", () => {
    render(<Menu aria-label="Guided tours" />);
    fireEvent.click(trigger());
    const menu = screen.getByRole("menu", { name: "Guided tours" });
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Basics", "Budgets", "Reports", "Help"]);
    for (const item of items) {
      expect(menu).toContainElement(item);
      expect(item).toHaveAttribute("tabindex", "-1");
    }
    expect(screen.queryAllByRole("list")).toHaveLength(0);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("names the menu, not the role-less wrapper", () => {
    const { container } = render(<Menu ariaLabel="Guided tours" />);
    // The wrapper used to carry it, where no screen reader reads a name.
    expect(container.firstElementChild).not.toHaveAttribute("aria-label");
    fireEvent.click(trigger());
    expect(screen.getByRole("menu")).toHaveAttribute("aria-label", "Guided tours");
  });

  it("marks the trigger as a menu button and reflects the open state", () => {
    render(<Menu />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });
});

describe("HoverMenu keyboard", () => {
  it("opening from the keyboard moves focus to the first item; a mouse click does not", () => {
    const { unmount } = render(<Menu />);
    fireEvent.click(trigger());
    expect(screen.getByRole("menuitem", { name: "Basics" })).not.toHaveFocus();
    unmount();

    render(<Menu />);
    keyboardOpen();
    expect(screen.getByRole("menuitem", { name: "Basics" })).toHaveFocus();
  });

  it("ArrowUp on the closed trigger opens onto the last item", () => {
    render(<Menu />);
    act(() => trigger().focus());
    fireEvent.keyDown(trigger(), { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Help" })).toHaveFocus();
  });

  it("moves with ↑/↓ (wrapping) and jumps with Home/End", () => {
    render(<Menu />);
    keyboardOpen();
    const item = (name: string) => screen.getByRole("menuitem", { name });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(item("Budgets")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(item("Help")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(item("Basics")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
    expect(item("Help")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(item("Basics")).toHaveFocus();
  });

  it("closes on Escape and gives focus back to the trigger", () => {
    render(<Menu />);
    keyboardOpen();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("closes on Escape without stealing focus when it was opened by hover", () => {
    vi.useFakeTimers();
    try {
      render(
        <>
          <input aria-label="elsewhere" />
          <Menu />
        </>,
      );
      const field = screen.getByRole("textbox", { name: "elsewhere" });
      act(() => field.focus());
      fireEvent.mouseEnter(trigger().parentElement!);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole("menu")).toBeInTheDocument();
      fireEvent.keyDown(field, { key: "Escape" });
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(field).toHaveFocus();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes when Tab leaves the menu", () => {
    render(<Menu />);
    keyboardOpen();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("activates the focused item with Enter like any button", () => {
    const onPick = vi.fn();
    render(<Menu onPick={onPick} />);
    keyboardOpen();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    fireEvent.click(document.activeElement!);
    expect(onPick).toHaveBeenCalledWith("Budgets");
  });
});

describe("HoverMenu align", () => {
  const panelClass = () => screen.getByRole("menu").parentElement!.className;
  it.each([
    ["start", "start-0"],
    ["end", "end-0"],
    ["left", "left-0"],
    ["right", "right-0"],
  ] as const)("align=%s anchors with %s", (align, cls) => {
    render(<Menu align={align} />);
    fireEvent.click(trigger());
    expect(panelClass()).toContain(cls);
  });

  it("defaults to the logical end edge (right in LTR, left in RTL)", () => {
    render(
      <div dir="rtl">
        <Menu />
      </div>,
    );
    fireEvent.click(trigger());
    expect(panelClass()).toContain("end-0");
    expect(panelClass()).not.toContain("right-0");
  });
});
