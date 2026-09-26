import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BulkActionBar } from "../bulk-action-bar";
import { OVERLAY_EXIT_MS } from "../../hooks/use-close-transition";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * keksdose's three hand-built selection bars (mobile-bulk-bar, invoice-lines-bulk-bar,
 * payees-selection-bar) as one: a toolbar with the count, a way out and the caller's
 * actions, above the phone nav, announced, animated, and absent at zero.
 */

const motion = (reduced: boolean) =>
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduced : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });

function bar(count: number, extra: Partial<Parameters<typeof BulkActionBar>[0]> = {}) {
  return (
    <BulkActionBar count={count} onClear={extra.onClear ?? (() => {})} {...extra}>
      <button type="button">Edit</button>
      <button type="button">Delete</button>
    </BulkActionBar>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  motion(false);
});
afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, "matchMedia");
});

describe("BulkActionBar", () => {
  it("is absent at zero, but its live region is already there", () => {
    render(bar(0));
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("is a toolbar named by the count, with the clear and the actions", () => {
    const onClear = vi.fn();
    render(bar(3, { onClear }));
    const toolbar = screen.getByRole("toolbar", { name: "3 selected" });
    expect(toolbar).toHaveTextContent("3 selected");
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("floats above the measured phone nav and the safe area, inset on both sides", () => {
    render(bar(1));
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar.className).toContain("fixed");
    expect(toolbar.style.bottom).toContain("var(--app-nav-h, 0px)");
    expect(toolbar.style.bottom).toContain("env(safe-area-inset-bottom");
    expect(toolbar.className).not.toMatch(/bottom-16/);
    // Logical and symmetric, so RTL needs nothing.
    expect(toolbar.getAttribute("style")).toContain("inset-inline");
    // The phone's X leads.
    expect(toolbar.firstElementChild).toHaveAccessibleName("Clear selection");
  });

  it("sticks, and puts the clear at the end, in the desktop variant", () => {
    render(bar(2, { variant: "sticky" }));
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar.className).toContain("sticky");
    expect(toolbar.className).not.toContain("fixed");
    expect(toolbar.lastElementChild).toHaveAccessibleName("Clear selection");
  });

  it("announces a change of count, and the clear", () => {
    const view = render(bar(0));
    view.rerender(bar(2));
    act(() => void vi.advanceTimersByTime(100));
    expect(screen.getByRole("status")).toHaveTextContent("2 selected");
    view.rerender(bar(0));
    act(() => void vi.advanceTimersByTime(100));
    expect(screen.getByRole("status")).toHaveTextContent("Selection cleared");
  });

  it("enters, and plays its exit before it goes", () => {
    const view = render(bar(0));
    view.rerender(bar(2));
    expect(screen.getByRole("toolbar").className).toContain("animate-sheet");
    view.rerender(bar(0));
    // Still there, leaving, still reading the count it had — and out of reach.
    const leaving = document.querySelector("[data-bulk-action-bar]") as HTMLElement;
    expect(leaving.className).toContain("animate-sheet-out");
    expect(leaving).toHaveTextContent("2 selected");
    expect(leaving).toHaveAttribute("inert");
    act(() => void vi.advanceTimersByTime(OVERLAY_EXIT_MS));
    expect(document.querySelector("[data-bulk-action-bar]")).toBeNull();
  });

  it("goes at once under reduced motion", () => {
    motion(true);
    const view = render(bar(2));
    view.rerender(bar(0));
    expect(document.querySelector("[data-bulk-action-bar]")).toBeNull();
  });

  it("is one Tab stop, roved by the arrow keys, Home and End", () => {
    render(bar(2));
    const clear = screen.getByRole("button", { name: "Clear selection" });
    const edit = screen.getByRole("button", { name: "Edit" });
    const del = screen.getByRole("button", { name: "Delete" });
    expect([clear.tabIndex, edit.tabIndex, del.tabIndex]).toEqual([0, -1, -1]);

    clear.focus();
    fireEvent.keyDown(clear, { key: "ArrowRight" });
    expect(edit).toHaveFocus();
    expect([clear.tabIndex, edit.tabIndex]).toEqual([-1, 0]);
    fireEvent.keyDown(edit, { key: "End" });
    expect(del).toHaveFocus();
    fireEvent.keyDown(del, { key: "ArrowRight" });
    expect(clear).toHaveFocus(); // wraps
    fireEvent.keyDown(clear, { key: "ArrowLeft" });
    expect(del).toHaveFocus();
    fireEvent.keyDown(del, { key: "Home" });
    expect(clear).toHaveFocus();
  });

  it("mirrors the arrow keys in RTL", () => {
    render(<div dir="rtl">{bar(2)}</div>);
    const clear = screen.getByRole("button", { name: "Clear selection" });
    clear.focus();
    fireEvent.keyDown(clear, { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "Edit" })).toHaveFocus();
  });

  it("leaves a text field's arrows alone", () => {
    render(
      <BulkActionBar count={1} onClear={() => {}} variant="inline">
        <input aria-label="memo" />
      </BulkActionBar>,
    );
    const input = screen.getByLabelText("memo");
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowLeft" });
    expect(input).toHaveFocus();
  });

  it("reads its words from the provider", () => {
    render(
      <UiKitProvider labels={{ bulkActionBar: { selected: (n) => `${n} ausgewählt`, clear: "Auswahl aufheben" } }}>
        {bar(4)}
      </UiKitProvider>,
    );
    expect(screen.getByRole("toolbar", { name: "4 ausgewählt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Auswahl aufheben" })).toBeInTheDocument();
  });
});

describe("BulkActionBar 0.11.0 (keksdose's invoice-lines and payees bars)", () => {
  it("renders a panel below the toolbar, in the same surface, outside the roving focus", () => {
    render(
      bar(2, {
        variant: "sticky",
        className: "my-bar",
        panel: (
          <form aria-label="Bulk fields">
            <input aria-label="Category" />
            <button type="submit">Apply</button>
          </form>
        ),
      }),
    );
    const toolbar = screen.getByRole("toolbar", { name: "2 selected" });
    const form = screen.getByRole("form", { name: "Bulk fields" });
    // Not inside the toolbar, but inside the same surface — which carries the sticky
    // tint, the caller's class and the variant marker.
    expect(toolbar).not.toContainElement(form);
    const surface = toolbar.parentElement!;
    expect(surface).toContainElement(form);
    expect(surface).toHaveAttribute("data-bulk-action-bar", "sticky");
    expect(surface.className).toContain("sticky");
    expect(surface.className).toContain("my-bar");
    expect(toolbar.className).not.toContain("sticky");
    // The panel's controls keep their own Tab stops; the toolbar's roving leaves them.
    expect(screen.getByRole("button", { name: "Apply" })).not.toHaveAttribute("tabindex");
    expect(screen.getByRole("textbox", { name: "Category" })).not.toHaveAttribute("tabindex");
    // Arrow keys walk the toolbar only: Edit → Delete → Clear → Edit.
    const edit = screen.getByRole("button", { name: "Edit" });
    edit.focus();
    fireEvent.keyDown(edit, { key: "End" });
    expect(screen.getByRole("button", { name: "Clear selection" })).toHaveFocus();
    // And a key pressed in the panel is the panel's.
    const apply = screen.getByRole("button", { name: "Apply" });
    apply.focus();
    fireEvent.keyDown(apply, { key: "ArrowRight" });
    expect(apply).toHaveFocus();
  });

  it("keeps the single-element bar when there is no panel", () => {
    render(bar(2, { variant: "sticky" }));
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toHaveAttribute("data-bulk-action-bar", "sticky");
    expect(toolbar.className).toContain("sticky");
    expect(document.querySelector("[data-bulk-action-bar-panel]")).toBeNull();
  });

  it("the floating panel scrolls within the viewport", () => {
    render(bar(1, { panel: <p>Fields</p> }));
    const panel = document.querySelector("[data-bulk-action-bar-panel]")!;
    expect(panel.className).toContain("overflow-y-auto");
    expect((panel.parentElement as HTMLElement).style.bottom).toContain("--app-nav-h");
  });

  it("open shows the bar at zero — selection mode with nothing picked", () => {
    const { rerender } = render(bar(0, { open: true }));
    expect(screen.getByRole("toolbar", { name: "0 selected" })).toBeInTheDocument();
    rerender(bar(1, { open: true }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("toolbar", { name: "1 selected" })).toBeInTheDocument();
    // Back to zero inside selection mode: the bar stays, and says "0 selected" rather
    // than "Selection cleared".
    rerender(bar(0, { open: true }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("toolbar", { name: "0 selected" })).not.toHaveAttribute("inert");
    expect(screen.getByRole("status")).toHaveTextContent("0 selected");
  });

  it("open={false} hides the bar with rows selected, and plays the exit", () => {
    const { rerender } = render(bar(3, { open: true }));
    rerender(bar(3, { open: false }));
    // Leaving: still in the DOM, inert.
    expect(document.querySelector("[data-bulk-action-bar]")).toHaveAttribute("inert");
    act(() => vi.advanceTimersByTime(OVERLAY_EXIT_MS + 10));
    expect(document.querySelector("[data-bulk-action-bar]")).toBeNull();
  });

  it("resolves a responsive variant with the media queries", () => {
    const wide = (min: number) =>
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: (query: string) => {
          const m = /min-width: (\d+)px/.exec(query);
          return {
            matches: m ? Number(m[1]) <= min : false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };
        },
      });
    wide(500);
    const { unmount } = render(bar(2, { variant: { base: "floating", md: "sticky" } }));
    expect(screen.getByRole("toolbar")).toHaveAttribute("data-bulk-action-bar", "floating");
    expect(screen.getByRole("button", { name: "Clear selection" }).textContent).toBe("");
    unmount();
    wide(1100);
    render(bar(2, { variant: { base: "floating", md: "sticky" } }));
    expect(screen.getByRole("toolbar")).toHaveAttribute("data-bulk-action-bar", "sticky");
    expect(screen.getByRole("button", { name: "Clear selection" })).toHaveTextContent("Clear selection");
  });
});
