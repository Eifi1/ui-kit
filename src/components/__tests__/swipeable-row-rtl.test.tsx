import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SwipeableRow, type SwipeAction } from "../swipeable-row";

/**
 * SwipeableRow in a right-to-left layout.
 *
 * - The keyboard-button strip was `right-0`, which in RTL is where the row's title
 *   starts: a focused "Delete" sat on top of the text it would delete.
 * - The reveal panel's contents hug the edge the drag uncovers. That edge is physical,
 *   and a flex row starts at the inline start, so in RTL the label landed on the edge
 *   still covered by the row.
 * - `left`/`right` stay PHYSICAL drag directions (see the prop docs): dragging right
 *   commits `right` in either direction.
 */
const action = (label: string, onCommit: () => void = vi.fn()): SwipeAction => ({
  onCommit,
  label,
  className: "bg-[var(--money-neutral)]",
  armedClassName: "bg-[var(--danger)]",
});

function renderRow(onRight = vi.fn(), onLeft = vi.fn()) {
  render(
    <div dir="rtl">
      <SwipeableRow right={[action("Restore", onRight)]} left={[action("Delete", onLeft)]}>
        <span>Monthly groceries</span>
      </SwipeableRow>
    </div>,
  );
  return { onRight, onLeft };
}

/** The sliding content div — the one that carries the pointer handlers. */
const slider = () => screen.getByText("Monthly groceries").parentElement!;

function drag(dx: number, release = false) {
  const el = slider();
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 100, clientY: 0, button: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 100 + dx / 2, clientY: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 100 + dx, clientY: 0, pointerType: "touch" });
  if (release) fireEvent.pointerUp(el, { pointerId: 1, clientX: 100 + dx, clientY: 0, pointerType: "touch" });
}

/** The reveal panel: the painted layer holding the previewed action's label. */
const panel = (label: string) =>
  screen.getAllByText(label).find((el) => el.tagName === "SPAN")!.closest(".absolute")!;

describe("SwipeableRow in RTL", () => {
  it("puts the keyboard buttons at the logical end, not the physical right", () => {
    renderRow();
    const strip = screen.getByRole("group", { name: "Row actions" });
    expect(strip.className).toMatch(/(^|\s)end-0(\s|$)/);
    expect(strip.className).toMatch(/(^|\s)pe-2(\s|$)/);
    expect(strip.className).not.toMatch(/(^|\s)(right-0|pr-2)(\s|$)/);
  });

  it("lays the reveal panel out from the physical edge a rightward drag uncovers", () => {
    renderRow();
    drag(60);
    // Dragging right uncovers the LEFT edge; in RTL a plain flex row would start at the
    // right, so the panel reverses there.
    const cls = panel("Restore").className;
    expect(cls).toContain("rtl:flex-row-reverse");
    expect(cls).not.toMatch(/(^|\s)flex-row-reverse(\s|$)/);
  });

  it("and from the right edge on a leftward drag", () => {
    renderRow();
    drag(-60);
    const cls = panel("Delete").className;
    expect(cls).toMatch(/(^|\s)flex-row-reverse(\s|$)/);
    expect(cls).toContain("rtl:flex-row");
  });

  it("keeps left/right as physical drag directions", () => {
    const { onRight, onLeft } = renderRow();
    drag(150, true);
    expect(onRight).toHaveBeenCalledTimes(1);
    expect(onLeft).not.toHaveBeenCalled();
  });
});
