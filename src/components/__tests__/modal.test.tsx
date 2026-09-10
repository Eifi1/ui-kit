import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
