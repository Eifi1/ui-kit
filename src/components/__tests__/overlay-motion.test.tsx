import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FullBleedDialog } from "../full-bleed-dialog";
import { OVERLAY_EXIT_MS } from "../../hooks/use-close-transition";
import { Modal } from "../modal";

/**
 * Keksdose live #320: *"Evaluate how much work it would be to have nicer transitions
 * for the mobile users when clicking on a row. Not only for the tx bit for all hoc
 * derived tables."*
 *
 * The answer to "all of them" is to put the motion on the two overlay surfaces every
 * table already opens — the DataTable's row sheet and the shared Modal — rather than
 * per table. Two keyframes in tokens.css, no dependency added.
 *
 * ⚠️ jsdom runs no animations and computes no layout, so this can only hold the
 * contract: the classes are applied to the right elements, and the reduced-motion
 * escape exists. Whether 180ms feels right is a judgement to make in a browser.
 *
 * The rework — *"Choose transition should be the same, only backwards"* — added the
 * exit, and the exit is the half with a state machine in it, so the cases below are
 * about TIMING rather than about classes: the panel has to stay mounted while it
 * lowers, `onClose` has to fire once and once only, and a user who has asked for no
 * motion must not be made to wait for an animation they are not shown.
 */
describe("overlay motion (live #320)", () => {
  it("fades the row sheet's backdrop and rises its panel", () => {
    render(
      <FullBleedDialog open onClose={() => {}} closeLabel="Close" header={<span>Row</span>}>
        <div>body</div>
      </FullBleedDialog>,
    );
    const backdrop = screen.getByRole("dialog");
    expect(backdrop.className).toContain("animate-overlay");
    // The panel is the backdrop's only child — the thing that actually travels.
    const panel = backdrop.firstElementChild as HTMLElement;
    expect(panel.className).toContain("animate-sheet");
  });

  it("rises the modal only where it is bottom-anchored", () => {
    render(
      <Modal onClose={() => {}} labelledBy="t">
        <div>body</div>
      </Modal>,
    );
    const panel = screen.getByRole("dialog");
    expect(panel.className).toContain("animate-sheet");
    // From md up the Modal is CENTRED, and a centred box sliding in from off-screen
    // reads as a different component arriving rather than the same one settling.
    expect(panel.className).toContain("md:animate-none");
  });

  it("does not animate a dialog that is closed", () => {
    // Anti-vacuity: the classes must ride on a mounted overlay, not be asserted
    // against markup that is always present.
    render(
      <FullBleedDialog open={false} onClose={() => {}} closeLabel="Close">
        <div>body</div>
      </FullBleedDialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("overlay exit (live #320 rework)", () => {
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

  beforeEach(() => {
    vi.useFakeTimers();
    motion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("lowers the sheet before it tells the caller to close", () => {
    const onClose = vi.fn();
    render(
      <FullBleedDialog open onClose={onClose} closeLabel="Close" header={<span>Row</span>}>
        <div>body</div>
      </FullBleedDialog>,
    );
    fireEvent.click(screen.getByLabelText("Close"));

    // Still on screen, now running the animation backwards — this is the whole point
    // of the machine: at the moment the state says "closed" the element is normally
    // already gone, and there is nothing left to animate.
    const backdrop = screen.getByRole("dialog");
    expect(backdrop.className).toContain("animate-overlay-out");
    expect((backdrop.firstElementChild as HTMLElement).className).toContain("animate-sheet-out");
    expect(onClose).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(OVERLAY_EXIT_MS));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes once, however many times it is dismissed", () => {
    // Two Escapes while the panel is leaving used to be two timers. `onClose` run
    // twice is the caller's close logic run twice — which is how a dismissal ends up
    // also discarding the thing behind it.
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} labelledBy="t">
        <div>body</div>
      </Modal>,
    );
    const panel = screen.getByRole("dialog");
    fireEvent.keyDown(panel, { key: "Escape" });
    fireEvent.keyDown(panel, { key: "Escape" });
    act(() => void vi.advanceTimersByTime(OVERLAY_EXIT_MS * 3));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes immediately when the user has asked for no motion", () => {
    motion(true);
    const onClose = vi.fn();
    render(
      <FullBleedDialog open onClose={onClose} closeLabel="Close">
        <div>body</div>
      </FullBleedDialog>,
    );
    fireEvent.click(screen.getByLabelText("Close"));
    // No delay at all, and no `-out` class was ever applied: waiting 220ms for an
    // animation nobody is being shown is the worst of both.
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog").className).not.toContain("animate-overlay-out");
  });
});
