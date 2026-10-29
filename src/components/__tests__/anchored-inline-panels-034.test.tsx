import { useRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home, TextCursorInput } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DropdownPanel, useDropdown } from "../dropdown";
import { EntityCombobox } from "../entity-combobox";
import { HoverMenu } from "../hover-menu";
import { Popover } from "../popover";
import { AppShell } from "../../shell/app-shell";

/**
 * Round 0.34 Wave 2, DUP-7: every anchored panel keeps to the GLASS. Tooltip learned in
 * keksdose live #381 that on a phone `window.innerWidth` is the layout viewport, which
 * grows to the page's width once anything sticks out — 430 on a 406 px screen — so a
 * panel clamped against it ends up off the screen. On a desktop it counts the
 * scrollbar, which put the right-to-left flyout a scrollbar's width off its item.
 * The other four panels still clamped against `innerWidth`, and the entity picker's
 * panel was not clamped at all in a left-to-right form.
 *
 * jsdom lays nothing out, so the trigger's rect and the root's client width are stubbed.
 */

type Rect = { left: number; right: number; top: number; bottom: number };
const domRect = (r: Rect) =>
  ({ ...r, width: r.right - r.left, height: r.bottom - r.top, x: r.left, y: r.top, toJSON: () => r }) as DOMRect;

/** Rects for the elements `pick` names; every other element keeps jsdom's zeros. */
function stubRects(pick: (el: Element) => Rect | undefined) {
  const original = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const r = pick(this);
    return r ? domRect(r) : original.call(this);
  });
}

/** A phone whose page something has widened: the glass is `glass`, the layout viewport `layout`. */
function viewport(glass: number, layout: number) {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(layout);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: glass });
}

beforeEach(() => {
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
});
afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document.documentElement, "clientWidth");
});

describe("anchored panels clamp against the glass (DUP-7)", () => {
  it("Popover", () => {
    viewport(400, 430);
    stubRects((el) => (el.textContent === "Open" ? { left: 360, right: 420, top: 100, bottom: 130 } : undefined));
    render(
      <Popover
        width={200}
        trigger={({ toggle, ref }) => (
          <button type="button" ref={ref} onClick={toggle}>
            Open
          </button>
        )}
      >
        {() => <p>panel</p>}
      </Popover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    // End-aligned it wants 420 − 200 = 220; the glass ends at 400.
    expect(screen.getByRole("dialog").style.left).toBe(`${400 - 8 - 200}px`);
  });

  it("DropdownPanel", () => {
    viewport(400, 430);
    stubRects((el) => (el.textContent === "trigger" ? { left: 300, right: 390, top: 10, bottom: 40 } : undefined));
    function Harness() {
      const { panelRef } = useDropdown();
      const anchor = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={anchor} type="button">
            trigger
          </button>
          <DropdownPanel anchorRef={anchor} panelRef={panelRef} width={256} align="start">
            <li>row</li>
          </DropdownPanel>
        </>
      );
    }
    render(<Harness />);
    const panel = screen.getByText("row").closest("[dir]") as HTMLElement;
    expect(panel.style.left).toBe(`${400 - 8 - 256}px`);
  });

  it("the entity picker's panel, which had no clamp in a left-to-right form", () => {
    viewport(400, 400);
    stubRects((el) =>
      el.getAttribute("role") === "combobox" ? { left: 300, right: 390, top: 10, bottom: 40 } : undefined,
    );
    render(
      <EntityCombobox<string>
        label="Account"
        value={null}
        onChange={() => {}}
        options={[{ value: "a", label: "A" }]}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Account/ }));
    const panel = screen.getByRole("listbox").closest("[dir]") as HTMLElement;
    // 220 px wide (13.75rem), so it starts 228 px before the glass ends.
    expect(panel.style.left).toBe(`${400 - 8 - 220}px`);
    expect(panel.style.width).toBe("220px");
  });

  it("HoverMenu", () => {
    viewport(400, 430);
    stubRects((el) =>
      el instanceof HTMLElement && el.className.includes("top-full")
        ? { left: 300, right: 420, top: 40, bottom: 140 }
        : undefined,
    );
    render(
      <HoverMenu
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle}>
            More
          </button>
        )}
      >
        {() => <button type="button">Archive</button>}
      </HoverMenu>,
    );
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const panel = screen.getByRole("menu").parentElement!;
    expect(panel.style.transform).toBe(`translateX(${400 - 8 - 420}px)`);
  });

  it("the AppShell flyout, right to left: a desktop scrollbar is not glass", () => {
    // 1024 px window, 15 px of scrollbar.
    viewport(1009, 1024);
    stubRects(() => ({ left: 800, right: 1000, top: 100, bottom: 130 }));
    render(
      <div dir="rtl">
        <MemoryRouter>
          <AppShell
            nav={[
              {
                to: "/",
                label: "Home",
                icon: Home,
                items: [{ to: "/fields", label: "Fields", icon: TextCursorInput }],
              },
            ]}
            topBar={<div>bar</div>}
            collapseStorageKey="dup7-test"
          >
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </div>,
    );
    act(() => {
      fireEvent.mouseEnter(screen.getAllByRole("link", { name: "Home" })[0].parentElement!);
    });
    const panel = screen.getByRole("menu", { name: "Home" }).parentElement!;
    expect(panel.style.right).toBe(`${1009 - 800}px`);
  });
});
