import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopBarActionMenu } from "../topbar-action-menu";
import type { TopBarMenuEntry } from "../topbar-action-menu";

/**
 * `scrollable` (0.51, DevMenu): `HoverMenu` clamps the panel only sideways, so a menu
 * taller than the glass ran off the bottom of a phone — DevMenu's ~25 rows on 390×844.
 * The cap is opt-in; every other menu keeps its natural height.
 */

const ROWS: TopBarMenuEntry[] = Array.from({ length: 25 }, (_, i) => ({
  key: `row-${i}`,
  label: `Row ${i + 1}`,
  onSelect: () => {},
}));

function Menu({ scrollable }: { scrollable?: boolean }) {
  return (
    <MemoryRouter>
      <TopBarActionMenu icon={<span>?</span>} aria-label="Dev tools" entries={ROWS} scrollable={scrollable} />
    </MemoryRouter>
  );
}

const list = () => screen.getByRole("menu").querySelector("ul");

afterEach(() => vi.restoreAllMocks());

describe("TopBarActionMenu scrollable", () => {
  it("leaves the panel's height alone by default", () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole("button", { name: "Dev tools" }));
    expect(list()).not.toHaveClass("overflow-y-auto");
    expect(list()!.className).not.toMatch(/max-h-/);
  });

  it("caps the panel under the bar and scrolls the rows inside it", () => {
    render(<Menu scrollable />);
    fireEvent.click(screen.getByRole("button", { name: "Dev tools" }));
    expect(list()).toHaveClass("max-h-[calc(100dvh-4rem)]", "overflow-y-auto", "overscroll-contain");
  });

  it("the arrow keys still bring the focused row into view", () => {
    // jsdom lays nothing out, so what is checked is the mechanism: the roving focus is a
    // plain `focus()`, which a browser follows by scrolling the panel to the row. A
    // `preventScroll` anywhere on that path would leave End on a row below the cap.
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(<Menu scrollable />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Dev tools" }), { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Row 1" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("menuitem", { name: "Row 25" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Row 1" })).toHaveFocus();
    expect(focus.mock.calls.length).toBeGreaterThanOrEqual(3);
    for (const [options] of focus.mock.calls) expect((options as FocusOptions | undefined)?.preventScroll).not.toBe(true);
  });
});
