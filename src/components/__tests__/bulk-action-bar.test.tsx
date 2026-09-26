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
