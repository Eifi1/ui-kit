import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, type TourStep } from "../tour";

/**
 * Keys, pointer containment and RTL placement of the tour overlay.
 *
 * - Enter used to advance from anywhere, so Enter on a focused Skip or Back ran that
 *   button AND stepped forward.
 * - ←/→ were physical; in RTL "forward" is ←.
 * - The overlay said `aria-modal` while the whole dimmed page stayed clickable.
 * - `start`/`end` placements resolve against the target's reading direction.
 */

const THREE: TourStep[] = [
  { title: "Welcome", body: "First." },
  { title: "Filters", body: "Second." },
  { title: "Rows", body: "Third." },
];

function Launcher({ steps, startIndex, onSkip }: { steps: TourStep[]; startIndex?: number; onSkip?: () => void }) {
  const { start, index, active } = useTour();
  return (
    <>
      <button type="button" onClick={() => start(steps, { startIndex, onSkip })}>
        Take the tour
      </button>
      <output data-testid="state">{active ? `step ${index}` : "idle"}</output>
    </>
  );
}

function renderTour(steps: TourStep[], { dir, startIndex, onSkip }: { dir?: "rtl"; startIndex?: number; onSkip?: () => void } = {}) {
  return render(
    <div dir={dir}>
      <TourProvider>
        <Launcher steps={steps} startIndex={startIndex} onSkip={onSkip} />
        <button type="button" data-tour="target">
          Target
        </button>
        <button type="button">Elsewhere</button>
      </TourProvider>
    </div>,
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function start() {
  fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
  await flush();
}

const state = () => screen.getByTestId("state").textContent;

describe("Tour keyboard", () => {
  it("Enter on the card itself advances", async () => {
    renderTour(THREE);
    await start();
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    await flush();
    expect(state()).toBe("step 1");
  });

  it("Enter on a focused Back button goes back only", async () => {
    renderTour(THREE, { startIndex: 1 });
    await start();
    const back = screen.getByRole("button", { name: "Back" });
    back.focus();
    // The browser turns Enter on a button into its click; the tour must not ALSO advance.
    fireEvent.keyDown(back, { key: "Enter" });
    fireEvent.click(back);
    await flush();
    expect(state()).toBe("step 0");
  });

  it("Enter on a focused Skip button skips without advancing first", async () => {
    const onSkip = vi.fn();
    renderTour(THREE, { onSkip });
    await start();
    const skip = screen.getByRole("button", { name: "Skip" });
    skip.focus();
    fireEvent.keyDown(skip, { key: "Enter" });
    await flush();
    expect(state()).toBe("step 0");
    fireEvent.click(skip);
    await flush();
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(state()).toBe("idle");
  });

  it("ArrowRight advances and ArrowLeft goes back in LTR", async () => {
    renderTour(THREE);
    await start();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    await flush();
    expect(state()).toBe("step 1");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    await flush();
    expect(state()).toBe("step 0");
  });

  it("follows the reading direction in RTL: ArrowLeft advances, ArrowRight goes back", async () => {
    const original = document.documentElement.getAttribute("dir");
    // A centered step takes the document's direction — the overlay is portalled out of
    // any local `dir` subtree and has no target to read one from.
    document.documentElement.setAttribute("dir", "rtl");
    try {
      renderTour(THREE);
      await start();
      expect(screen.getByRole("dialog")).toHaveAttribute("dir", "rtl");
      fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
      await flush();
      expect(state()).toBe("step 1");
      fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
      await flush();
      expect(state()).toBe("step 0");
    } finally {
      if (original === null) document.documentElement.removeAttribute("dir");
      else document.documentElement.setAttribute("dir", original);
    }
  });
});

describe("Tour with a spotlighted target", () => {
  // jsdom lays nothing out; give the target a box so the finder accepts it.
  const box = { top: 300, left: 400, width: 100, height: 40, right: 500, bottom: 340, x: 400, y: 300 };
  let rectSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    const original = Element.prototype.getBoundingClientRect;
    rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.getAttribute("data-tour") === "target") return { ...box, toJSON: () => box } as DOMRect;
      return original.call(this);
    });
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(768);
  });
  afterEach(() => {
    rectSpy.mockRestore();
    vi.restoreAllMocks();
  });

  const cardOf = () => screen.getByRole("button", { name: "Skip" }).closest('[tabindex="-1"]') as HTMLElement;

  it("blocks the page around the spotlight but leaves the hole open", async () => {
    renderTour([{ title: "Target", body: "Here.", target: '[data-tour="target"]' }]);
    await start();
    const shields = Array.from(document.querySelectorAll<HTMLElement>("[data-tour-shield]"));
    expect(shields).toHaveLength(4);
    for (const s of shields) expect(s.className).toContain("pointer-events-auto");
    // The spotlight is the target's box padded by 8px; the shields stop at its edges.
    const [above, below, leftSide, rightSide] = shields;
    expect(above.style.height).toBe("292px");
    expect(below.style.top).toBe("348px");
    expect(leftSide.style.width).toBe("392px");
    expect(rightSide.style.left).toBe("508px");
  });

  it("places `end` on the right in LTR", async () => {
    renderTour([{ title: "Target", body: "Here.", target: '[data-tour="target"]', placement: "end" }]);
    await start();
    // spot.left 392 + spot.width 116 + margin 12 (the card measures 0 wide in jsdom).
    expect(cardOf().style.left).toBe("520px");
  });

  it("places `end` on the left in RTL, and puts the target's dir on the portal", async () => {
    renderTour([{ title: "Target", body: "Here.", target: '[data-tour="target"]', placement: "end" }], { dir: "rtl" });
    await start();
    expect(screen.getByRole("dialog")).toHaveAttribute("dir", "rtl");
    // spot.left 392 - card width 0 - margin 12.
    expect(cardOf().style.left).toBe("380px");
  });

  it("keeps `right` physical in RTL", async () => {
    renderTour([{ title: "Target", body: "Here.", target: '[data-tour="target"]', placement: "right" }], { dir: "rtl" });
    await start();
    expect(cardOf().style.left).toBe("520px");
  });
});
