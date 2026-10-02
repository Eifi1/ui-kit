import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, type TourStep } from "../tour";

/**
 * keksdose tours audit 2026-10-02, §1.0 A: "Stale spotlight on the step after a
 * spotlighted one" — 15 steps across all 16 tours, desktop and phone, mouse and
 * keyboard alike.
 *
 * When step N spotlights a target and step N+1 has no target (or its target is not on
 * the page), N+1 kept N's spotlight hole and placed its card beside it instead of
 * centring it. Back→Next onto the same step kept the old hole for as long as anybody
 * watched (3.4 s+ in the audit's probe). A deep link straight to the untargeted step
 * was fine — the bug needed a spotlighted step to have run for a while first.
 *
 * The overlay reset its rect during render when the step changed, and React 19 does not
 * persist a render-phase update while an earlier, lower-priority update to the same
 * state is still queued: the "follow the target" interval queues exactly such an update
 * every 250 ms (eagerly bailed out because the rect had not moved, but queued all the
 * same), so the next render re-based on the old rect and the reset was gone. These
 * tests need that interval to have fired before the step changes, hence the waits.
 */

const box = { top: 300, left: 400, width: 100, height: 40, right: 500, bottom: 340, x: 400, y: 300 };

function Launcher({ steps, startIndex }: { steps: TourStep[]; startIndex?: number }) {
  const { start, index, active } = useTour();
  return (
    <>
      <button type="button" onClick={() => start(steps, { startIndex })}>
        Take the tour
      </button>
      <output data-testid="state">{active ? `step ${index}` : "idle"}</output>
    </>
  );
}

function renderTour(steps: TourStep[], startIndex?: number) {
  return render(
    <TourProvider>
      <Launcher steps={steps} startIndex={startIndex} />
      <button type="button" data-tour="target">
        Target
      </button>
    </TourProvider>,
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Real time passing, so the overlay's follow interval (250 ms) runs at least once. */
async function wait(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

const shields = () => document.querySelectorAll("[data-tour-shield]");
const cardOf = () => screen.getByRole("button", { name: "Skip" }).closest('[tabindex="-1"]') as HTMLElement;
const state = () => screen.getByTestId("state").textContent;

/** Centred on a 1024×768 viewport; the card measures 0×0 in jsdom. */
function expectCentredWithoutSpotlight() {
  expect(shields()).toHaveLength(0);
  expect(cardOf().style.top).toBe("384px");
  expect(cardOf().style.left).toBe("512px");
}

describe("Tour: no stale spotlight on the step after a spotlighted one", () => {
  beforeEach(() => {
    const original = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.getAttribute("data-tour") === "target") return { ...box, toJSON: () => box } as DOMRect;
      return original.call(this);
    });
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(768);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const SPOT_THEN_CENTRED: TourStep[] = [
    { title: "Target", body: "Here.", target: '[data-tour="target"]' },
    { title: "All set", body: "Centred." },
  ];

  it("a targeted step followed by an untargeted step leaves no hole and centres the card", async () => {
    renderTour(SPOT_THEN_CENTRED);
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    await flush();
    expect(shields()).toHaveLength(4);
    await wait(300);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await flush();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("All set");
    expectCentredWithoutSpotlight();
    // …and it stays that way: nothing re-lights the old target later.
    await wait(300);
    expectCentredWithoutSpotlight();
  });

  it("Back then Next onto the untargeted step is centred too", async () => {
    renderTour(SPOT_THEN_CENTRED, 1);
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    await flush();
    // The deep-link case was always fine.
    expectCentredWithoutSpotlight();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await flush();
    expect(state()).toBe("step 0");
    expect(shields()).toHaveLength(4);
    await wait(300);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await flush();
    expect(state()).toBe("step 1");
    expectCentredWithoutSpotlight();
    await wait(300);
    expectCentredWithoutSpotlight();
  });

  it("advancing with the keyboard behaves the same", async () => {
    renderTour(SPOT_THEN_CENTRED);
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    await flush();
    await wait(300);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    await flush();
    expect(state()).toBe("step 1");
    expectCentredWithoutSpotlight();
  });

  it("a step whose anchor is missing reads as untargeted, not as the previous target", async () => {
    renderTour([
      { title: "Target", body: "Here.", target: '[data-tour="target"]' },
      { title: "Gone", body: "Its anchor is not on this page.", target: '[data-tour="nowhere"]' },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    await flush();
    await wait(300);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    // The finder retries for 45 frames before it gives up and centres the card.
    await wait(1200);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Gone");
    expectCentredWithoutSpotlight();
  });

  it("going back from the untargeted step spotlights the target again", async () => {
    renderTour(SPOT_THEN_CENTRED);
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    await flush();
    await wait(300);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await flush();
    expectCentredWithoutSpotlight();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await flush();
    expect(shields()).toHaveLength(4);
    expect((shields()[0] as HTMLElement).style.height).toBe("292px");
  });
});
