import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "../modal";

/**
 * Keksdose live #254: *"Merge window not scrollable for mobile users."*
 *
 * The backdrop is `fixed inset-0` and the body is scroll-locked for as long as a
 * dialog is open, so a panel taller than the screen had nowhere to put its overflow.
 * On a phone the panel is bottom-anchored, which means it grew UPWARD past the top
 * edge — and everything past it was unreachable by any gesture the screen offers.
 * Three callers had already patched themselves with `max-h-[90vh]` and an inner
 * scroller; every other dialog in the app simply lost its top.
 */
describe("Modal", () => {
  const panel = () => screen.getByRole("dialog");

  it("is a modal panel, named by `labelledBy`", () => {
    render(
      <Modal onClose={vi.fn()} labelledBy="modal-title">
        <h2 id="modal-title">Edit lease</h2>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Edit lease" })).toHaveAttribute("aria-modal", "true");
    expect(panel()).toHaveAttribute("aria-labelledby", "modal-title");
  });

  it("scrolls itself rather than growing off the screen", () => {
    render(
      <Modal onClose={vi.fn()}>
        <p>tall</p>
      </Modal>,
    );
    // Bounded by the backdrop's content box, and scrollable inside that bound.
    expect(panel().className).toContain("max-h-full");
    expect(panel().className).toContain("overflow-y-auto");
  });

  it("lets a caller that manages its own scrolling keep doing so", () => {
    // `cn` is tailwind-merge, so the caller's height wins over the default —
    // the drilldown and the payee backfill both set one, with an inner scroller
    // under a sticky header.
    render(
      <Modal onClose={vi.fn()} className="max-h-[90vh] flex flex-col">
        <p>tall</p>
      </Modal>,
    );
    expect(panel().className).toContain("max-h-[90vh]");
    expect(panel().className).not.toContain("max-h-full");
  });

  /**
   * Keksdose live #254, the 2026-09-07 rework: *"Enlarge the dialog in width for the
   * desktop users."* Two callers had already reached past the `lg` cap with a
   * hand-written `max-w-3xl` className, which is the signal that the size was
   * missing rather than that those callers were unusual.
   */
  it.each([
    ["md", "max-w-md"],
    ["lg", "max-w-lg"],
    ["xl", "max-w-3xl"],
    // Round 0.34 C3 (KS U1): a table to be read. Kurvenschmiede's five part dialogs
    // wrote `w-[min(110rem,94vw)] max-w-none`, Keksdose's drilldown `max-w-5xl`.
    ["2xl", "max-w-[110rem]"],
  ] as const)("caps the panel at the %s width", (size, expected) => {
    render(
      <Modal onClose={vi.fn()} size={size}>
        <p>wide</p>
      </Modal>,
    );
    expect(panel().className).toContain(expected);
    // Still the full-width bottom sheet on a phone — the cap is a MAX and there is
    // no floor under it. A `min-w-*` here is what would turn a wider dialog into a
    // horizontally scrolling one at 406px.
    expect(panel().className).toContain("w-full");
    expect(panel().className).not.toMatch(/(^|\s)min-w-/);
  });
});

/**
 * Keksdose feedback #254: selecting text in a dialog — press inside, drag out, release
 * over the backdrop — closed it. A plain onClick fires on the release, and on the common
 * ancestor of the press and the release, so the reverse drag closed it too. The backdrop
 * closes on a press that starts AND ends on it (`useBackdropClose`). Lifted from
 * keksdose's own suite (FS-7 of its 2026-11-22 audit).
 */
describe("Modal's backdrop", () => {
  function setup() {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <button type="button">Inside</button>
      </Modal>,
    );
    // The backdrop is the panel's parent.
    return { onClose, backdrop: screen.getByRole("dialog").parentElement!, inside: screen.getByText("Inside") };
  }

  it("closes on a press that starts and ends on it", () => {
    const { onClose, backdrop } = setup();
    fireEvent.mouseDown(backdrop);
    fireEvent.mouseUp(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open for a press inside the panel", () => {
    const { onClose, inside } = setup();
    fireEvent.mouseDown(inside);
    fireEvent.mouseUp(inside);
    fireEvent.click(inside);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open for a drag from inside the panel released on the backdrop", () => {
    const { onClose, backdrop, inside } = setup();
    fireEvent.mouseDown(inside);
    fireEvent.mouseUp(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open for a drag from the backdrop released inside the panel", () => {
    const { onClose, backdrop, inside } = setup();
    fireEvent.mouseDown(backdrop);
    fireEvent.mouseUp(inside);
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });
});
