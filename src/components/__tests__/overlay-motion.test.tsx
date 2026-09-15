import { render, screen } from "@testing-library/react";
import { FullBleedDialog } from "../full-bleed-dialog";
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
      <Modal open onClose={() => {}} title="T">
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
