import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SWIPE_TONE, SwipeableRow } from "../swipeable-row";

/**
 * Keksdose dev#467: *"Swiping a category to the left with no option — if letting it go
 * it gets, for the way back, the background color of the opposite swipe direction where
 * there should be no color change at all."*
 *
 * A side with no actions rubber-bands a little and snaps back (an inert row reads as "not
 * swipeable"). On release `dx` snaps to 0 while the row slides back over 150 ms, and the
 * panel chose its side from the sign of `dx` — so for those frames it read "right" and
 * painted the right action's colour into the gap still open on the left. The panel now
 * keeps the side last dragged toward (swipeable-row.tsx, `lastSide`).
 *
 * Lifted from keksdose's own suite (FS-7 of its 2026-11-22 audit).
 */

function renderRow() {
  const { container } = render(
    <SwipeableRow right={[{ label: "Approve", onCommit: vi.fn(), tone: "success" }]}>
      <span>Monthly groceries</span>
    </SwipeableRow>,
  );
  return container;
}

/** The sliding content div — the one that carries the pointer handlers. */
const slider = () => screen.getByText("Monthly groceries").parentElement!;

/** Drag by `dx` px (past the axis lock, so the gesture is horizontal), released or not. */
function drag(dx: number, release: boolean) {
  const el = slider();
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 200, clientY: 100, button: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 200 + dx / 2, clientY: 100, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 200 + dx, clientY: 100, pointerType: "touch" });
  if (release) fireEvent.pointerUp(el, { pointerId: 1, clientX: 200 + dx, clientY: 100, pointerType: "touch" });
}

/** The PAINTED panel: not the keyboard buttons' `role="group"` strip, and not the
 *  `aria-hidden` card laid under the panel — neither carries a colour. */
const panel = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(".pointer-events-none:not([role='group']):not([aria-hidden])");

const IDLE = SWIPE_TONE.success.idle.split(" ");

describe("SwipeableRow's reveal panel through the release", () => {
  it("paints nothing on the way back from a side with no actions", () => {
    const container = renderRow();
    drag(-60, true);
    // dx is 0 again: the row is sliding back over a LEFT gap, which has nothing to show.
    expect(slider().style.transform).toBe("");
    expect(panel(container)).toBeNull();
  });

  it("keeps the dragged side's colour while the row slides back", () => {
    const container = renderRow();
    drag(60, true);
    expect(slider().style.transform).toBe("");
    const p = panel(container);
    expect(p).not.toBeNull();
    for (const cls of IDLE) expect(p, cls).toHaveClass(cls);
  });

  it("paints the side being dragged toward mid-gesture", () => {
    const container = renderRow();
    drag(60, false);
    const p = panel(container);
    expect(p).not.toBeNull();
    for (const cls of IDLE) expect(p, cls).toHaveClass(cls);
  });

  it("paints nothing mid-gesture toward the side with no actions", () => {
    const container = renderRow();
    drag(-60, false);
    expect(panel(container)).toBeNull();
  });
});
