import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, useTourGate, type TourStep, type TourStepContext } from "../tour";

/**
 * Conditional steps and optional fields (docs/tours-harmonization.md §11.2–§11.3, contract
 * round 054 §2–§3): `when` on arrival, Back re-evaluating, `goToStep` landing on a shown
 * step, the counter over the steps shown, and "Leave empty".
 */

function Fact() {
  const [transfer, setTransfer] = useState(false);
  useTourGate("txn.transfer", transfer);
  return (
    <button type="button" onClick={() => setTransfer((t) => !t)}>
      Toggle transfer
    </button>
  );
}

function Launcher({ steps, onFinish }: { steps: TourStep[]; onFinish?: () => void }) {
  const tour = useTour();
  return (
    <>
      <button type="button" onClick={() => tour.start(steps, { onFinish })}>
        Take the tour
      </button>
      <button type="button" onClick={() => tour.goToStep(Number(prompt()))}>
        Go
      </button>
      <output data-testid="state">
        {tour.active ? `step ${tour.index} (${tour.position} of ${tour.count})` : "idle"}
      </output>
    </>
  );
}

function renderTour(steps: TourStep[], extra: React.ReactNode = <Fact />, onFinish?: () => void) {
  return render(
    <TourProvider>
      <Launcher steps={steps} onFinish={onFinish} />
      {extra}
    </TourProvider>,
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
async function press(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
  await flush();
}
async function goTo(i: number) {
  vi.stubGlobal("prompt", () => String(i));
  await press("Go");
  vi.unstubAllGlobals();
}

const state = () => screen.getByTestId("state").textContent;
const transfer = (c: TourStepContext) => c.gate("txn.transfer") === true;
const txn = (c: TourStepContext) => !transfer(c);

const STEPS: TourStep[] = [
  { title: "Mode", body: "Pick one." },
  { title: "Amount", body: "Type it." },
  { title: "Category", body: "Pick it.", when: txn },
  { title: "From", body: "From where.", when: transfer },
  { title: "To", body: "To where.", when: transfer },
  { title: "Memo", body: "A note." },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Tour when", () => {
  it("Next passes over a step whose when is false, and the counter counts the steps shown", async () => {
    renderTour(STEPS);
    await start();
    expect(state()).toBe("step 0 (1 of 4)");
    await press("Next");
    await press("Next");
    expect(state()).toBe("step 2 (3 of 4)");
    expect(screen.getByText("3 / 4")).toBeInTheDocument();
    await press("Next");
    expect(state()).toBe("step 5 (4 of 4)");
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("the counter changes at a branch (Transaction 4, Transfer 5)", async () => {
    renderTour(STEPS);
    await start();
    await press("Toggle transfer");
    await press("Next");
    expect(state()).toBe("step 1 (2 of 5)");
    await press("Next");
    expect(state()).toBe("step 3 (3 of 5)");
  });

  it("Back re-evaluates: switched to Transfer, Back from Memo lands on To", async () => {
    renderTour(STEPS);
    await start();
    await goTo(5);
    expect(state()).toBe("step 5 (4 of 4)");
    await press("Back");
    expect(state()).toBe("step 2 (3 of 4)");
    await press("Next");
    await press("Toggle transfer");
    await press("Back");
    expect(state()).toBe("step 4 (4 of 5)");
  });

  it("a skipped step's beforeStep never runs; a shown one gets the context", async () => {
    const skipped = vi.fn();
    const shown = vi.fn();
    renderTour([
      { title: "One", body: "1" },
      { title: "Hidden", body: "x", when: () => false, beforeStep: skipped },
      { title: "Two", body: "2", beforeStep: shown },
    ]);
    await start();
    await press("Next");
    expect(skipped).not.toHaveBeenCalled();
    expect(shown).toHaveBeenCalledTimes(1);
    expect(shown.mock.calls[0][0].via).toBe("next");
    expect(shown.mock.calls[0][0].gate("txn.transfer")).toBe(false);
    expect(shown.mock.calls[0][0].gate("nobody")).toBeUndefined();
  });

  it("a when that throws counts as skipped and logs the error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    renderTour([
      { title: "One", body: "1" },
      {
        title: "Broken",
        body: "x",
        when: () => {
          throw new Error("boom");
        },
      },
      { title: "Two", body: "2" },
    ]);
    await start();
    await press("Next");
    expect(state()).toBe("step 2 (2 of 2)");
    expect(error).toHaveBeenCalled();
  });

  it("Next past the last shown step finishes the tour", async () => {
    const onFinish = vi.fn();
    renderTour(
      [
        { title: "One", body: "1" },
        { title: "Hidden", body: "x", when: () => false },
      ],
      <Fact />,
      onFinish,
    );
    await start();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    await press("Done");
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(state()).toBe("idle");
  });

  it("Back is hidden on the first step shown, even when it is not index 0", async () => {
    renderTour([
      { title: "Hidden", body: "x", when: () => false },
      { title: "One", body: "1" },
      { title: "Two", body: "2" },
    ]);
    await start();
    expect(state()).toBe("step 1 (1 of 2)");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("goToStep to a hidden step lands on the next one shown, failing that the previous one", async () => {
    renderTour(STEPS);
    await start();
    await goTo(3);
    expect(state()).toBe("step 5 (4 of 4)");
    renderTour([
      { title: "A", body: "a" },
      { title: "B", body: "b", when: () => false },
    ]);
    fireEvent.click(screen.getAllByRole("button", { name: "Take the tour" })[1]);
    await flush();
    vi.stubGlobal("prompt", () => "1");
    fireEvent.click(screen.getAllByRole("button", { name: "Go" })[1]);
    await flush();
    expect(screen.getAllByTestId("state")[1].textContent).toBe("step 0 (1 of 1)");
  });

  it("beforeStep sees via: start, back, goto", async () => {
    const calls: string[] = [];
    const log = (c: TourStepContext) => {
      calls.push(c.via);
    };
    renderTour([
      { title: "A", body: "a", beforeStep: log },
      { title: "B", body: "b", beforeStep: log },
      { title: "C", body: "c", beforeStep: log },
    ]);
    await start();
    await press("Next");
    await press("Back");
    await goTo(2);
    expect(calls).toEqual(["start", "next", "back", "goto"]);
  });
});

describe("Tour optional", () => {
  const box = { top: 300, left: 400, width: 200, height: 40, right: 600, bottom: 340, x: 400, y: 300 };
  function Field() {
    const [value, setValue] = useState("");
    useTourGate("txn.payee", value !== "");
    return (
      <div data-tour="payee">
        <input aria-label="Payee" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
    );
  }
  function spy() {
    const original = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.getAttribute("data-tour") === "payee") return { ...box, toJSON: () => box } as DOMRect;
      return original.call(this);
    });
    Element.prototype.scrollIntoView = vi.fn();
  }
  const PAYEE: TourStep = {
    title: "Payee",
    body: "Who.",
    target: '[data-tour="payee"]',
    gate: "txn.payee",
    optional: true,
  };

  it("offers Leave empty beside the locked Next, with the Optional chip; it moves on and the run continues", async () => {
    spy();
    const onFinish = vi.fn();
    renderTour([PAYEE, { title: "End", body: "e" }], <Field />, onFinish);
    await start();
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
    await press("Leave empty");
    expect(state()).toBe("step 1 (2 of 2)");
    expect(screen.getByRole("textbox", { name: "Payee" })).toHaveValue("");
    await press("Done");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("Leave empty goes once the field is filled, and Next is open", async () => {
    spy();
    renderTour([PAYEE, { title: "End", body: "e" }], <Field />);
    await start();
    fireEvent.change(screen.getByRole("textbox", { name: "Payee" }), { target: { value: "Bakery" } });
    await flush();
    expect(screen.queryByRole("button", { name: "Leave empty" })).toBeNull();
    expect(screen.getByRole("button", { name: "Next" })).not.toHaveAttribute("aria-disabled");
  });

  it("optional without a gate: only the chip, and a plain Next", async () => {
    renderTour([
      { title: "Note", body: "n", optional: true },
      { title: "End", body: "e" },
    ]);
    await start();
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Leave empty" })).toBeNull();
    expect(screen.getByRole("button", { name: "Next" })).not.toHaveAttribute("aria-disabled");
  });
});
