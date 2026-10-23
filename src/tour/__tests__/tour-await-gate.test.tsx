import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, useTourGate, useTourGateRelease, type TourStep } from "../tour";

/**
 * Finish on save success (docs/tours-harmonization.md §11.4, contract round 054 §4): an
 * `awaitGate` step advances only on `release(key)`; `refuse(key, reason)` keeps the step,
 * shows the reason and offers "Back to …" without jumping (Marcel's Q3).
 */

const boxes: Record<string, { top: number; left: number; width: number; height: number }> = {
  amount: { top: 100, left: 40, width: 200, height: 40 },
  save: { top: 300, left: 40, width: 100, height: 40 },
};

function Form({ onSave }: { onSave?: (ok: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const gates = useTourGateRelease();
  useTourGate("txn.amount", amount !== "");
  return (
    <>
      <div data-tour="amount">
        <input aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <button type="button" data-tour="save" onClick={() => onSave?.(true)}>
        Save
      </button>
      <button type="button" onClick={() => gates.release("txn.saved")}>
        Server ok
      </button>
      <button type="button" onClick={() => gates.refuse("txn.saved", "The server said no.")}>
        Server error
      </button>
      <button type="button" onClick={() => gates.refuse("txn.saved")}>
        Server error without reason
      </button>
      <button type="button" onClick={() => setAmount("")}>
        Clear amount
      </button>
    </>
  );
}

function Launcher({ steps, onFinish }: { steps: TourStep[]; onFinish?: () => void }) {
  const tour = useTour();
  return (
    <>
      <button type="button" onClick={() => tour.start(steps, { onFinish })}>
        Take the tour
      </button>
      <output data-testid="state">{tour.active ? `step ${tour.index}` : "idle"}</output>
    </>
  );
}

const STEPS: TourStep[] = [
  { title: "Intro", body: "Hi." },
  { title: "Amount", body: "Type it.", target: '[data-tour="amount"]', gate: "txn.amount" },
  { title: "Save", body: "Press Save.", target: '[data-tour="save"]', awaitGate: "txn.saved" },
  { title: "Finish", body: "Saved." },
];

function renderTour(steps = STEPS, onFinish?: () => void) {
  return render(
    <TourProvider>
      <Launcher steps={steps} onFinish={onFinish} />
      <Form />
    </TourProvider>,
  );
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
async function press(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
  await flush();
}
const state = () => screen.getByTestId("state").textContent;

beforeEach(() => {
  const original = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const b = boxes[this.getAttribute("data-tour") ?? ""];
    if (b) {
      const r = { ...b, right: b.left + b.width, bottom: b.top + b.height, x: b.left, y: b.top };
      return { ...r, toJSON: () => r } as DOMRect;
    }
    return original.call(this);
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function toSave() {
  await press("Take the tour");
  await press("Next");
  fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "12" } });
  await flush();
  await press("Next");
  expect(state()).toBe("step 2");
}

describe("Tour awaitGate", () => {
  it("replaces Next with the hint; a click on Save does not advance, a release does", async () => {
    renderTour();
    await toSave();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.getByText("Save to continue")).toBeInTheDocument();
    await press("Save");
    expect(state()).toBe("step 2");
    fireEvent.keyDown(document.querySelector("[data-tour-card]")!, { key: "ArrowRight" });
    await flush();
    expect(state()).toBe("step 2");
    await press("Server ok");
    expect(state()).toBe("step 3");
  });

  it("is interactive: the overlay is not modal and carries the marker", async () => {
    renderTour();
    await toSave();
    const overlay = document.querySelector("[data-tour-overlay]")!;
    expect(overlay).toHaveAttribute("data-tour-interactive", "");
    expect(overlay).not.toHaveAttribute("aria-modal");
  });

  it("a release on the last step finishes and records, as Done does", async () => {
    const onFinish = vi.fn();
    renderTour(STEPS.slice(0, 3), onFinish);
    await toSave();
    await press("Server ok");
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(state()).toBe("idle");
  });

  it("a release on an earlier step jumps past the step that awaits it (Enter in the memo saved)", async () => {
    renderTour();
    await press("Take the tour");
    await press("Next");
    expect(state()).toBe("step 1");
    await press("Server ok");
    expect(state()).toBe("step 3");
  });

  it("a release nobody awaits does nothing", async () => {
    renderTour([STEPS[0], STEPS[3]]);
    await press("Take the tour");
    await press("Server ok");
    expect(state()).toBe("step 0");
  });

  it("refuse keeps the step and shows the reason, or the default words", async () => {
    renderTour();
    await toSave();
    await press("Server error");
    expect(state()).toBe("step 2");
    expect(screen.getByText("The server said no.")).toBeInTheDocument();
    expect(screen.getByText("The server said no.").closest('[aria-live="assertive"]')).not.toBeNull();
    await press("Server error without reason");
    expect(screen.getByText(/That wasn’t saved yet/)).toBeInTheDocument();
  });

  it("after a refusal, offers Back to the first earlier field emptied — and does not jump there itself", async () => {
    renderTour();
    await toSave();
    await press("Server error");
    expect(screen.queryByRole("button", { name: /Back to/ })).toBeNull();
    await press("Clear amount");
    await press("Server error");
    expect(state()).toBe("step 2");
    await press("Back to “Amount”");
    expect(state()).toBe("step 1");
  });

  it("refuse on another step is ignored", async () => {
    renderTour();
    await press("Take the tour");
    await press("Server error");
    expect(screen.queryByText("The server said no.")).toBeNull();
  });

  it("a release does not need the form to close (Create & another): it moves on over the open form", async () => {
    renderTour();
    await toSave();
    await press("Clear amount");
    await press("Server ok");
    expect(state()).toBe("step 3");
    expect(screen.getByRole("textbox", { name: "Amount" })).toBeInTheDocument();
  });

  it("without its target (a viewer's missing Save) the step keeps a plain Next", async () => {
    renderTour([STEPS[0], { ...STEPS[2], target: '[data-tour="nope"]' }, STEPS[3]]);
    await press("Take the tour");
    await press("Next");
    // The finder gives up after 45 frames and centres the card.
    expect(await screen.findByRole("button", { name: "Next" }, { timeout: 3000 })).toBeInTheDocument();
    expect(state()).toBe("step 1");
  });
});
