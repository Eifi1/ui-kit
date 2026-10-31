import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, useTourGate, type TourStep } from "../tour";
import { setViewportWidth, viewportMatchMedia, type ViewportOptions } from "../../test/viewport";

beforeAll(async () => {
  await import("../tour-overlay");
});

/**
 * 0.52 code review, tour-overlay.tsx: a guided step reads the pointer type ON ARRIVAL — the
 * field takes the focus on a fine pointer, the card on a coarse one (§11.8). 0.52 made the
 * pointer type a dependency of that arrival effect, so on a 2-in-1 whose keyboard was
 * detached or attached mid-step, `(pointer: coarse)` flipped, the arrival ran again and
 * pulled the focus out of the field the person was typing in.
 */

const box = { top: 300, left: 400, width: 200, height: 40, right: 600, bottom: 340, x: 400, y: 300 };

function Field() {
  const [value, setValue] = useState("");
  useTourGate("form.amount", value !== "");
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

const STEP: TourStep = { title: "Amount", body: "Type one.", target: '[data-tour="amount"]', gate: "form.amount" };
const END: TourStep = { title: "Done", body: "All set." };
const amount = () => screen.getByRole("textbox", { name: "Amount" });

let rectSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  const original = Element.prototype.getBoundingClientRect;
  rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.getAttribute("data-tour") === "amount") return { ...box, toJSON: () => box } as DOMRect;
    return original.call(this);
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  rectSpy.mockRestore();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("a guided step whose pointer type changes mid-step", () => {
  it("leaves the focus where the person put it", async () => {
    const pointer: ViewportOptions = { coarse: false };
    vi.stubGlobal("matchMedia", viewportMatchMedia(1280, pointer));
    render(
      <TourProvider>
        <Launcher steps={[STEP, END]} />
        <Field />
      </TourProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    await screen.findByRole("dialog");
    await act(async () => {
      await Promise.resolve();
    });
    expect(amount()).toHaveFocus();
    fireEvent.change(amount(), { target: { value: "12" } });

    // The keyboard is detached: the stub's lists answer again, and `(pointer: coarse)` flips.
    pointer.coarse = true;
    act(() => setViewportWidth(1280));
    expect(amount()).toHaveFocus();
    const body = screen.getByText("Type one.");
    expect(amount().getAttribute("aria-describedby")).toBe(body.id);
  });
});
