import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TourProvider, useTour, type TourStep } from "../tour";

/**
 * The spotlight overlay declares `role="dialog" aria-modal="true"` and then left focus
 * wherever the page had put it — the audit's *"Only Modal manages focus"* finding, in
 * the one component where it is most visible: the tour exists to direct attention, and
 * a keyboard user's attention is their focus ring.
 *
 * The card is what moves, so the card is what holds focus. Two things follow from that
 * and are pinned below: Tab cannot leave the card while the tour is up, and a step
 * change has to put focus back on the card — the buttons are not the same set on every
 * step, so the one the user just pressed can be gone in the next render.
 */

const STEPS: TourStep[] = [
  { title: "Welcome", body: "This is the register." },
  { title: "Filters", body: "Narrow the rows here." },
];

function Launcher({ startIndex }: { startIndex?: number }) {
  const { start } = useTour();
  return (
    <button type="button" onClick={() => start(STEPS, { startIndex })}>
      Take the tour
    </button>
  );
}

function renderTour(startIndex?: number) {
  return render(
    <TourProvider>
      <Launcher startIndex={startIndex} />
    </TourProvider>,
  );
}

/** The step card: the only thing inside the overlay that is focusable-but-not-tabbable. */
const card = () => screen.getByRole("button", { name: "Skip" }).closest('[tabindex="-1"]');

/** A press on a button, focus included: jsdom's `click` does not focus its target and
 *  every browser does, and where focus was when the tour started is what the card has
 *  to give back at the end. */
function press(el: HTMLElement) {
  act(() => {
    el.focus();
  });
  fireEvent.click(el);
}

/** `beforeStep` is awaited even when absent, so the first paint is a microtask away. */
async function started() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("Tour focus", () => {
  it("moves focus to the step card when the tour starts", async () => {
    renderTour();
    press(screen.getByRole("button", { name: "Take the tour" }));
    await started();
    expect(card()).toHaveFocus();
  });

  it("keeps Tab inside the card", async () => {
    renderTour();
    press(screen.getByRole("button", { name: "Take the tour" }));
    await started();
    const next = screen.getByRole("button", { name: "Next" });
    next.focus();
    fireEvent.keyDown(next, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Skip" })).toHaveFocus();
  });

  it("follows the step when the button that had focus is gone from the next one", async () => {
    // "Back" does not exist on the first step, so stepping back onto it destroys the
    // control the press came from. Focus falls to <body> — outside the card, where the
    // trap's own listener never hears a keystroke and Tab walks into the page the
    // overlay has just told assistive technology to ignore.
    renderTour(1);
    press(screen.getByRole("button", { name: "Take the tour" }));
    await started();
    const back = screen.getByRole("button", { name: "Back" });
    back.focus();
    fireEvent.click(back);
    await started();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    expect(card()).toHaveFocus();
  });

  it("gives focus back to whatever started the tour", async () => {
    renderTour();
    const launcher = screen.getByRole("button", { name: "Take the tour" });
    press(launcher);
    await started();
    // Both halves: without the first line the second is satisfied by focus never
    // having left the launcher, which is the defect rather than the fix.
    expect(launcher).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await started();
    expect(launcher).toHaveFocus();
  });
});
