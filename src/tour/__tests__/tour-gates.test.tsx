import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, useTourGate, type TourStep } from "../tour";

/**
 * Value gates (docs/tours-harmonization.md §11.1, contract round 054 §1 and §8): the form
 * publishes `useTourGate(key, satisfied)`, a step names the key with `gate`, and Next stays
 * locked until the key is satisfied. Satisfied does not advance by itself.
 */

const box = { top: 300, left: 400, width: 200, height: 40, right: 600, bottom: 340, x: 400, y: 300 };

function Field({ gateKey = "form.amount", textarea = false }: { gateKey?: string | null; textarea?: boolean }) {
  const [value, setValue] = useState("");
  useTourGate(gateKey, value !== "");
  return (
    <div data-tour="amount">
      {textarea ? (
        <textarea aria-label="Amount" value={value} onChange={(e) => setValue(e.target.value)} />
      ) : (
        <input aria-label="Amount" value={value} onChange={(e) => setValue(e.target.value)} />
      )}
    </div>
  );
}

function Launcher({ steps }: { steps: TourStep[] }) {
  const tour = useTour();
  return (
    <>
      <button type="button" onClick={() => tour.start(steps)}>
        Take the tour
      </button>
      <button type="button" onClick={() => tour.next()}>
        App next
      </button>
      <output data-testid="state">{tour.active ? `step ${tour.index}` : "idle"}</output>
    </>
  );
}

function renderTour(steps: TourStep[], field: React.ReactNode = <Field />) {
  return render(
    <TourProvider>
      <Launcher steps={steps} />
      {field}
    </TourProvider>,
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
async function start() {
  fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
  await flush();
}

const state = () => screen.getByTestId("state").textContent;
const amount = () => screen.getByRole("textbox", { name: "Amount" });
const next = () => screen.getByRole("button", { name: /^(Next|Done)$/ });
const card = () => document.querySelector<HTMLElement>("[data-tour-card]")!;
const polite = () => document.querySelector('[aria-live="polite"]')!.textContent;

const STEP: TourStep = { title: "Amount", body: "Type one.", target: '[data-tour="amount"]', gate: "form.amount" };
const END: TourStep = { title: "Done", body: "All set." };

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
});

describe("useTourGate", () => {
  it("is a no-op without a TourProvider", () => {
    expect(() => render(<Field />)).not.toThrow();
  });
});

describe("Tour gate step", () => {
  it("locks Next (aria-disabled, focusable) with the hint under it", async () => {
    renderTour([STEP, END]);
    await start();
    expect(next()).toHaveAttribute("aria-disabled", "true");
    expect(next()).not.toBeDisabled();
    const hint = screen.getByText("Fill in the highlighted field to continue");
    expect(next()).toHaveAttribute("aria-describedby", hint.id);
  });

  it("a press on the locked Next does not advance: it focuses the field and reads the hint", async () => {
    renderTour([STEP, END]);
    await start();
    act(() => next().focus());
    fireEvent.click(next());
    await settle();
    expect(state()).toBe("step 0");
    expect(amount()).toHaveFocus();
    expect(polite()).toBe("Fill in the highlighted field to continue");
  });

  it("gateHint overrides the label for one step", async () => {
    renderTour([{ ...STEP, gateHint: "Type an amount first" }, END]);
    await start();
    expect(screen.getByText("Type an amount first")).toBeInTheDocument();
  });

  it("unlocks once satisfied, announces Ready once, and does not advance by itself", async () => {
    renderTour([STEP, END]);
    await start();
    fireEvent.change(amount(), { target: { value: "12" } });
    await settle();
    expect(next()).not.toHaveAttribute("aria-disabled");
    expect(polite()).toBe("Ready. Press Next or Enter to continue.");
    expect(state()).toBe("step 0");
    fireEvent.change(amount(), { target: { value: "123" } });
    await settle();
    expect(polite()).toBe("Ready. Press Next or Enter to continue.");
    fireEvent.click(next());
    await flush();
    expect(state()).toBe("step 1");
  });

  it("is open at once when the field is already filled on arrival, with no Ready", async () => {
    renderTour([STEP, END]);
    fireEvent.change(amount(), { target: { value: "5" } });
    await start();
    expect(next()).not.toHaveAttribute("aria-disabled");
    expect(polite()).toBe("");
  });

  it("Enter in the field advances once satisfied", async () => {
    renderTour([STEP, END]);
    await start();
    fireEvent.keyDown(amount(), { key: "Enter" });
    await settle();
    expect(state()).toBe("step 0");
    fireEvent.change(amount(), { target: { value: "7" } });
    fireEvent.keyDown(amount(), { key: "Enter" });
    await settle();
    expect(state()).toBe("step 1");
  });

  it("an Enter the control took (preventDefault, a combobox picking) does not advance", async () => {
    renderTour(
      [STEP, END],
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a stand-in for a combobox's own Enter
      <div onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}>
        <Field />
      </div>,
    );
    await start();
    fireEvent.change(amount(), { target: { value: "7" } });
    fireEvent.keyDown(amount(), { key: "Enter" });
    await settle();
    expect(state()).toBe("step 0");
  });

  it("a textarea takes Ctrl/Cmd+Enter, not Enter", async () => {
    renderTour([STEP, END], <Field textarea />);
    await start();
    const memo = screen.getByRole("textbox", { name: "Amount" });
    fireEvent.change(memo, { target: { value: "note" } });
    fireEvent.keyDown(memo, { key: "Enter" });
    await settle();
    expect(state()).toBe("step 0");
    fireEvent.keyDown(memo, { key: "Enter", ctrlKey: true });
    await settle();
    expect(state()).toBe("step 1");
  });

  it("focus leaving the field to nowhere advances (the number pad's Done); to another control it does not", async () => {
    renderTour(
      [STEP, END],
      <>
        <Field />
        <button type="button">Sibling</button>
      </>,
    );
    await start();
    fireEvent.change(amount(), { target: { value: "9" } });
    fireEvent.focusOut(amount(), { relatedTarget: screen.getByRole("button", { name: "Sibling" }) });
    await settle();
    expect(state()).toBe("step 0");
    fireEvent.focusIn(amount());
    fireEvent.focusOut(amount(), { relatedTarget: null });
    await settle();
    expect(state()).toBe("step 1");
  });

  it("focus moving from the field to the card advances once satisfied", async () => {
    renderTour([STEP, END]);
    await start();
    fireEvent.change(amount(), { target: { value: "9" } });
    fireEvent.focusIn(amount());
    fireEvent.focusOut(amount(), { relatedTarget: card() });
    await settle();
    expect(state()).toBe("step 1");
  });

  it("Enter and the forward arrow from the card are the locked Next", async () => {
    renderTour([STEP, END]);
    await start();
    fireEvent.keyDown(card(), { key: "Enter" });
    fireEvent.keyDown(card(), { key: "ArrowRight" });
    await settle();
    expect(state()).toBe("step 0");
  });

  it("the app's own next() always advances", async () => {
    renderTour([STEP, END]);
    await start();
    fireEvent.click(screen.getByRole("button", { name: "App next" }));
    await flush();
    expect(state()).toBe("step 1");
  });

  it("a gate nobody publishes is not enforced", async () => {
    renderTour([{ ...STEP, gate: "form.other" }, END]);
    await start();
    expect(next()).not.toHaveAttribute("aria-disabled");
  });

  it("a key of null publishes nothing", async () => {
    renderTour([STEP, END], <Field gateKey={null} />);
    await start();
    expect(next()).not.toHaveAttribute("aria-disabled");
  });

  it("opens Next when the publisher unmounts under the step (the form closed)", async () => {
    function Toggle() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            Close form
          </button>
          {open ? <Field /> : <div data-tour="amount">gone</div>}
        </>
      );
    }
    renderTour([STEP, END], <Toggle />);
    await start();
    expect(next()).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "Close form" }));
    await flush();
    expect(next()).not.toHaveAttribute("aria-disabled");
  });

  it("two publishers of one key: the one mounted last wins, the one below returns when it goes", async () => {
    function Publisher({ value }: { value: boolean }) {
      useTourGate("form.amount", value);
      return null;
    }
    function Two() {
      const [second, setSecond] = useState(true);
      return (
        <>
          <div data-tour="amount">
            <input aria-label="Amount" />
          </div>
          <Publisher value={false} />
          {second && <Publisher value={true} />}
          <button type="button" onClick={() => setSecond(false)}>
            Drop second
          </button>
        </>
      );
    }
    renderTour([STEP, END], <Two />);
    await start();
    expect(next()).not.toHaveAttribute("aria-disabled");
    fireEvent.click(screen.getByRole("button", { name: "Drop second" }));
    await flush();
    expect(next()).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Tour gate step: focus and description (§8)", () => {
  it("focuses the field on a fine pointer and describes it by the card's body, restored afterwards", async () => {
    renderTour([STEP, END]);
    await start();
    expect(amount()).toHaveFocus();
    const body = screen.getByText("Type one.");
    expect(amount().getAttribute("aria-describedby")).toBe(body.id);
    fireEvent.click(screen.getByRole("button", { name: "App next" }));
    await flush();
    expect(amount()).not.toHaveAttribute("aria-describedby");
  });

  it("gives the card the focus on a coarse pointer", async () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query === "(pointer: coarse)" }));
    vi.stubGlobal("matchMedia", matchMedia);
    try {
      renderTour([STEP, END]);
      await start();
      expect(card()).toHaveFocus();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("Tab cycles field and card as one ring", async () => {
    renderTour([{ title: "Intro", body: "Hi." }, STEP, END]);
    await start();
    fireEvent.click(next());
    await flush();
    expect(amount()).toHaveFocus();
    fireEvent.keyDown(amount(), { key: "Tab" });
    expect(screen.getByRole("button", { name: "Skip" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
    expect(amount()).toHaveFocus();
    act(() => next().focus());
    fireEvent.keyDown(next(), { key: "Tab" });
    expect(amount()).toHaveFocus();
  });
});
