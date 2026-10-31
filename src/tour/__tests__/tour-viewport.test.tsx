import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, useTourGate, type TourStep } from "../tour";
import { viewportMatchMedia } from "../../test/viewport";

// The overlay is its own chunk since 0.52 (refactor audit 2026-10-30, MOD-1): loaded once
// up front, as an app's bundle has it by the time a tour starts; React.lazy still resolves
// it a render after the start, which the waits below cover.
beforeAll(async () => {
  await import("../tour-overlay");
});

/**
 * The tour measures the screen as the rest of the kit does (refactor audit 2026-10-30,
 * DUP-9): the glass's width (`viewportSize()`, the root's client width), not the layout
 * viewport an overflow has grown (live #381); the text-scaled `sm` (40rem: 640 px at
 * Normal, 800 at Large), not a fixed 640; and the focus trap's tab stops, not a selector
 * that also takes a control out of the tab order.
 */

const box = { top: 200, left: 20, width: 300, height: 44, right: 320, bottom: 244, x: 20, y: 200 };

function Field() {
  const [value, setValue] = useState("");
  useTourGate("form.amount", value !== "");
  return (
    <div data-tour="amount">
      {/* A roving cell and a hidden button before the field: neither is a tab stop. */}
      <button type="button" tabIndex={-1}>
        Cell
      </button>
      <div hidden>
        <button type="button">Hidden</button>
      </div>
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

async function run(steps: TourStep[]) {
  render(
    <TourProvider>
      <Launcher steps={steps} />
      <Field />
    </TourProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
  await screen.findByRole("dialog");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const card = () => document.querySelector<HTMLElement>("[data-tour-card]")!;
const GATE: TourStep = { title: "Amount", body: "Type it.", target: '[data-tour="amount"]', gate: "form.amount" };
const END: TourStep = { title: "End", body: "e" };

beforeEach(() => {
  const original = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.getAttribute("data-tour") === "amount") return { ...box, toJSON: () => box } as DOMRect;
    return original.call(this);
  });
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("innerHeight", 800);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-text-size");
  Reflect.deleteProperty(document.documentElement, "clientWidth");
});

describe("Tour: the screen it measures", () => {
  it("centres a card on the glass, not on a layout viewport an overflow has grown", async () => {
    // A phone whose page sticks out: the layout viewport is 430 px, the screen 406.
    vi.stubGlobal("innerWidth", 430);
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, get: () => 406 });
    await run([{ title: "Welcome", body: "Centred." }, END]);
    // The card measures 0×0 in jsdom: its left is half the glass.
    expect(card().style.left).toBe("203px");
  });

  it("at Large text a 700 px window is below sm (800 px there): a field step docks", async () => {
    document.documentElement.setAttribute("data-text-size", "large");
    vi.stubGlobal("innerWidth", 700);
    vi.stubGlobal("matchMedia", viewportMatchMedia(700));
    await run([GATE, END]);
    expect(card()).toHaveAttribute("data-tour-docked");
  });

  it("at Normal text the same window is from sm up: no dock", async () => {
    vi.stubGlobal("innerWidth", 700);
    vi.stubGlobal("matchMedia", viewportMatchMedia(700));
    await run([GATE, END]);
    expect(card()).not.toHaveAttribute("data-tour-docked");
  });
});

describe("Tour: a field step's first control", () => {
  it("is its first tab stop, not a roving cell or a hidden button", async () => {
    vi.stubGlobal("innerWidth", 1280);
    vi.stubGlobal("matchMedia", viewportMatchMedia(1280));
    await run([GATE, END]);
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveFocus();
  });

  it("is what a press on the locked Next focuses", async () => {
    vi.stubGlobal("innerWidth", 1280);
    vi.stubGlobal("matchMedia", viewportMatchMedia(1280));
    await run([GATE, END]);
    const next = screen.getByRole("button", { name: "Next" });
    act(() => next.focus());
    fireEvent.click(next);
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveFocus();
  });
});
