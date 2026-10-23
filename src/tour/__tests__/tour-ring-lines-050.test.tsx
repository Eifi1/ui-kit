import { useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, type TourStep } from "../tour";

/**
 * keksdose S1 (build review 0.50): the ring's 8px padding put its frame on a field's own
 * line underneath ("No account chosen — saved to …"). On a field step the spot takes in
 * the lines the field's `aria-describedby` names when they are within the ring's reach,
 * so the frame goes round field and line (docs/tours-harmonization.md §11.6).
 */

type Box = { top: number; left: number; width: number; height: number };
const boxes = new Map<string, Box>();

function rect(b: Box) {
  const r = { ...b, right: b.left + b.width, bottom: b.top + b.height, x: b.left, y: b.top };
  return { ...r, toJSON: () => r } as DOMRect;
}

beforeEach(() => {
  boxes.clear();
  boxes.set("field", { top: 200, left: 20, width: 350, height: 44 });
  // 4px under the field, as `mt-1` draws it.
  boxes.set("note", { top: 248, left: 20, width: 260, height: 16 });
  // An error 4px under the note: in reach of the note, so taken too.
  boxes.set("error", { top: 268, left: 20, width: 200, height: 16 });
  boxes.set("far", { top: 400, left: 20, width: 200, height: 16 });
  boxes.set("tip", { top: 250, left: 20, width: 120, height: 30 });
  boxes.set("sr", { top: 246, left: 20, width: 1, height: 1 });
  boxes.set("beside", { top: 248, left: 380, width: 100, height: 16 });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const key = this.getAttribute("data-box");
    const b = key ? boxes.get(key) : undefined;
    return rect(b ?? { top: 0, left: 0, width: 0, height: 0 });
  });
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("innerWidth", 1280);
  vi.stubGlobal("innerHeight", 900);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  cleanup();
  document.body.innerHTML = "";
});

function Form({ describedBy }: { describedBy: string }) {
  return (
    <div>
      <div data-tour="acct" data-box="field">
        <input aria-label="Account" aria-describedby={describedBy} />
      </div>
      <p id="note" data-box="note">
        No account chosen — saved to Cash
      </p>
      <p id="error" data-box="error">
        Required
      </p>
      <p id="far" data-box="far">
        Far away
      </p>
      <div role="tooltip" id="tip" data-box="tip">
        A tooltip
      </div>
      <span id="sr" data-box="sr">
        Read only
      </span>
      <p id="beside" data-box="beside">
        Beside, not under
      </p>
    </div>
  );
}

function Run({ step }: { step: TourStep }) {
  const { start } = useTour();
  useEffect(() => {
    start([step]);
  }, [start, step]);
  return null;
}

async function ring(step: TourStep, describedBy: string) {
  render(
    <TourProvider dockOnPhones={false}>
      <Form describedBy={describedBy} />
      <Run step={step} />
    </TourProvider>,
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
  const el = document.querySelector<HTMLElement>("[data-tour-overlay] .rounded-lg");
  expect(el).not.toBeNull();
  const { top, left, width, height } = el!.style;
  return { top: parseFloat(top), left: parseFloat(left), width: parseFloat(width), height: parseFloat(height) };
}

const field: TourStep = { target: '[data-tour="acct"]', title: "Account", body: "Pick one.", gate: "acct" };

describe("the ring on a field step takes in the field's own lines", () => {
  it("frames the field and the adjacent line its aria-describedby names, and the line after it", async () => {
    // field 200–244, note 248–264, error 268–284; padding 8.
    expect(await ring(field, "note error")).toEqual({ top: 192, left: 12, width: 366, height: 100 });
  });

  it("leaves out a far line, a tooltip, an sr-only text and a line beside the field", async () => {
    expect(await ring(field, "far tip sr beside")).toEqual({ top: 192, left: 12, width: 366, height: 60 });
  });

  it("a plain step (no gate) keeps the target's own box", async () => {
    const plain: TourStep = { target: '[data-tour="acct"]', title: "Account", body: "This is it." };
    expect(await ring(plain, "note")).toEqual({ top: 192, left: 12, width: 366, height: 60 });
  });
});
