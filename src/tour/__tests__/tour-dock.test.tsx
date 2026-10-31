import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, useTourGate, type TourStep } from "../tour";
import { dockEdge, dockStyle, readBand, scrollIntoFreeHalf } from "../tour-dock";
import { viewportMatchMedia } from "../../test/viewport";

// The overlay is its own chunk since 0.52 (refactor audit 2026-10-30, MOD-1): loaded once
// up front, as an app's bundle has it by the time a tour starts; React.lazy still resolves
// it a render after the start, which the waits below cover.
beforeAll(async () => {
  await import("../tour-overlay");
});

/**
 * The docked card on phones (docs/tours-harmonization.md §11.7, contract round 054 §6): the
 * band, the edge away from the field with hysteresis, the height cap, the scroll of the
 * field's own scroll container, and the default for field steps (Marcel's Q1).
 */

const VIEW = { width: 390, height: 844 };
type Box = { top: number; left: number; width: number; height: number };
const boxes = new Map<Element, Box>();
let fieldBox: Box = { top: 200, left: 20, width: 350, height: 44 };

function rect(b: Box) {
  const r = { ...b, right: b.left + b.width, bottom: b.top + b.height, x: b.left, y: b.top };
  return { ...r, toJSON: () => r } as DOMRect;
}

beforeEach(() => {
  fieldBox = { top: 200, left: 20, width: 350, height: 44 };
  boxes.clear();
  const original = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.getAttribute("data-tour") === "amount") return rect(fieldBox);
    const b = boxes.get(this);
    if (b) return rect(b);
    return original.call(this);
  });
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("innerWidth", VIEW.width);
  vi.stubGlobal("innerHeight", VIEW.height);
  // Below `sm` is a media query since 0.52 (DUP-9), as `max-sm:` asks it.
  vi.stubGlobal("matchMedia", viewportMatchMedia(VIEW.width));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  cleanup();
  document.body.innerHTML = "";
});

describe("the band", () => {
  it("is the layout viewport without a keyboard", () => {
    expect(readBand(null, null)).toEqual({ top: 0, bottom: 844 });
  });

  it("is the visual viewport while a keyboard is up", () => {
    vi.stubGlobal("visualViewport", { offsetTop: 0, height: 500, scale: 1, width: 390 });
    expect(readBand(null, null)).toEqual({ top: 0, bottom: 500 });
  });

  it("is not shrunk by pinch zoom", () => {
    vi.stubGlobal("visualViewport", { offsetTop: 100, height: 400, scale: 2, width: 195 });
    expect(readBand(null, null)).toEqual({ top: 0, bottom: 844 });
  });

  it("ends at the top of the highest obstruction (the number pad), not one holding the field", () => {
    const pad = document.createElement("div");
    pad.setAttribute("data-tour-obstruction", "");
    document.body.appendChild(pad);
    boxes.set(pad, { top: 560, left: 0, width: 390, height: 284 });
    expect(readBand(null, null)).toEqual({ top: 0, bottom: 560 });
    const field = document.createElement("input");
    pad.appendChild(field);
    expect(readBand(field, null)).toEqual({ top: 0, bottom: 844 });
  });

  it("counts a tall pad (Large text: over half the phone)", () => {
    const pad = document.createElement("div");
    pad.setAttribute("data-tour-obstruction", "");
    document.body.appendChild(pad);
    boxes.set(pad, { top: 385, left: 0, width: 390, height: 459 });
    expect(readBand(null, null)).toEqual({ top: 0, bottom: 385 });
  });

  it("ignores a full-screen obstruction (a picker opened over everything)", () => {
    const sheet = document.createElement("div");
    sheet.setAttribute("data-tour-obstruction", "");
    document.body.appendChild(sheet);
    boxes.set(sheet, { top: 0, left: 0, width: 390, height: 844 });
    expect(readBand(null, null)).toEqual({ top: 0, bottom: 844 });
  });
});

describe("the edge", () => {
  const band = { top: 0, bottom: 844 };
  it("is the bottom for a field in the upper half, the top for one in the lower half", () => {
    expect(dockEdge({ top: 100, left: 0, width: 300, height: 40 }, band, null, 200)).toBe("bottom");
    expect(dockEdge({ top: 600, left: 0, width: 300, height: 40 }, band, null, 200)).toBe("top");
  });

  it("keeps its edge across the middle unless it would cover the field (hysteresis)", () => {
    expect(dockEdge({ top: 450, left: 0, width: 300, height: 40 }, band, "bottom", 200)).toBe("bottom");
    expect(dockEdge({ top: 700, left: 0, width: 300, height: 40 }, band, "bottom", 200)).toBe("top");
  });

  it("caps the card's height to the free space between the field and its edge", () => {
    const style = dockStyle("bottom", { top: 100, left: 0, width: 300, height: 40 }, { top: 0, bottom: 560 });
    expect(style.maxHeight).toBe(560 - 140 - 16);
    expect(style.bottom).toBe(844 - 560 + 8);
    expect(style.width).toBe("auto");
    expect(dockStyle("top", { top: 600, left: 0, width: 300, height: 40 }, { top: 0, bottom: 844 }).maxHeight).toBe(
      600 - 16,
    );
  });
});

describe("the scroll", () => {
  it("scrolls the field's own scroll container into the free half; the window stays", () => {
    const body = document.createElement("div");
    body.style.overflowY = "auto";
    Object.defineProperty(body, "scrollHeight", { value: 2000 });
    Object.defineProperty(body, "clientHeight", { value: 800 });
    const field = document.createElement("input");
    field.setAttribute("data-tour", "amount");
    body.appendChild(field);
    document.body.appendChild(body);
    fieldBox = { top: 1200, left: 20, width: 350, height: 44 };
    const scrollBy = vi.fn();
    vi.stubGlobal("scrollBy", scrollBy);
    const edge = scrollIntoFreeHalf(field, null, null);
    expect(edge).toBe("top");
    // Centred in the lower half [422, 836]: 1222 → 629.
    expect(body.scrollTop).toBe(1222 - 629);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("leaves a field already in the free half alone", () => {
    const field = document.createElement("input");
    document.body.appendChild(field);
    field.setAttribute("data-tour", "amount");
    fieldBox = { top: 100, left: 20, width: 350, height: 44 };
    const scrollBy = vi.fn();
    vi.stubGlobal("scrollBy", scrollBy);
    expect(scrollIntoFreeHalf(field, null, null)).toBe("bottom");
    expect(scrollBy).not.toHaveBeenCalled();
  });
});

function Field() {
  const [value, setValue] = useState("");
  useTourGate("txn.amount", value !== "");
  return (
    <div data-tour="amount">
      <input aria-label="Amount" value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

function Launcher({ steps }: { steps: TourStep[] }) {
  const tour = useTour();
  return (
    <button type="button" onClick={() => tour.start(steps)}>
      Take the tour
    </button>
  );
}

async function run(steps: TourStep[], dockOnPhones?: boolean) {
  render(
    <TourProvider dockOnPhones={dockOnPhones}>
      <Launcher steps={steps} />
      <Field />
    </TourProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
  // The overlay is a chunk of its own (MOD-1): the card is there a render later.
  await screen.findByRole("dialog");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
const card = () => document.querySelector<HTMLElement>("[data-tour-card]")!;
const GATE: TourStep = { title: "Amount", body: "Type it.", target: '[data-tour="amount"]', gate: "txn.amount" };
const END: TourStep = { title: "End", body: "e" };

describe("where it applies", () => {
  it("a field step with no placement docks on a phone, away from the field", async () => {
    await run([GATE, END]);
    expect(card()).toHaveAttribute("data-tour-docked", "bottom");
    expect(card().style.width).toBe("auto");
  });

  it("not from sm up", async () => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("matchMedia", viewportMatchMedia(1024));
    await run([GATE, END]);
    expect(card()).not.toHaveAttribute("data-tour-docked");
  });

  it("a plain look-at step keeps today's placement; placement: dock opts it in", async () => {
    const look: TourStep = { title: "Look", body: "l", target: '[data-tour="amount"]' };
    await run([look, END]);
    expect(card()).not.toHaveAttribute("data-tour-docked");
    cleanup();
    await run([{ ...look, placement: "dock" }, END]);
    expect(card()).toHaveAttribute("data-tour-docked", "bottom");
  });

  it("an explicit placement wins over the default, and dockOnPhones={false} makes it opt-in", async () => {
    await run([{ ...GATE, placement: "top" }, END]);
    expect(card()).not.toHaveAttribute("data-tour-docked");
    cleanup();
    await run([GATE, END], false);
    expect(card()).not.toHaveAttribute("data-tour-docked");
  });

  it("re-docks when the number pad opens under an unmoved field", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      fieldBox = { top: 120, left: 20, width: 350, height: 44 };
      await run([GATE, END]);
      expect(card().style.bottom).toBe("max(8px, env(safe-area-inset-bottom))");
      const pad = document.createElement("div");
      pad.setAttribute("data-tour-obstruction", "");
      document.body.appendChild(pad);
      boxes.set(pad, { top: 560, left: 0, width: 390, height: 284 });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(card().style.bottom).toBe(`${844 - 560 + 8}px`);
    } finally {
      vi.useRealTimers();
    }
  });
});
