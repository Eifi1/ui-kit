import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, type TourStep } from "../tour";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/**
 * keksdose live #436: a step that spotlights an AmountInput left the field unusable on a
 * phone. The field opens its NumberPadSheet (portalled, z-50) under the tour's scrim and
 * shields (z-[60]), so no key could be pressed. `interactive` drops the overlay under the
 * kit's z-50 layers; `awaitInput` advances once a value was entered.
 */

const box = { top: 300, left: 400, width: 200, height: 40, right: 600, bottom: 340, x: 400, y: 300 };

function Field() {
  const [value, setValue] = useState("");
  return (
    <div data-tour="amount">
      <input aria-label="Amount" value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

function Launcher({ steps }: { steps: TourStep[] }) {
  const { start, index, active } = useTour();
  return (
    <>
      <button type="button" onClick={() => start(steps)}>
        Take the tour
      </button>
      <output data-testid="state">{active ? `step ${index}` : "idle"}</output>
    </>
  );
}

function renderTour(steps: TourStep[], wrap = false) {
  const tree = (
    <TourProvider>
      <Launcher steps={steps} />
      <Field />
    </TourProvider>
  );
  return render(wrap ? <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>{tree}</UiKitProvider> : tree);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

/** A focusout or Enter is checked on the next macrotask, after the field's own commit. */
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
const overlay = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const amount = () => screen.getByRole("textbox", { name: "Amount" });

const STEP: TourStep = { title: "Amount", body: "Type one.", target: '[data-tour="amount"]' };
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

describe("Tour interactive step", () => {
  it("a plain step stays modal at z-[60]", async () => {
    renderTour([STEP, END]);
    await start();
    expect(overlay()).toHaveClass("z-[60]");
    expect(overlay()).toHaveAttribute("aria-modal", "true");
    expect(overlay()).not.toHaveAttribute("data-tour-interactive");
  });

  it("drops under the kit's z-50 layers, still above the top bar (z-40), and is not modal", async () => {
    renderTour([{ ...STEP, interactive: true }, END]);
    await start();
    expect(overlay()).toHaveClass("z-[45]");
    expect(overlay()).not.toHaveClass("z-[60]");
    expect(overlay()).toHaveAttribute("data-tour-interactive", "");
    expect(overlay()).not.toHaveAttribute("aria-modal");
    // The page around the hole is still shielded.
    expect(document.querySelectorAll("[data-tour-shield]")).toHaveLength(4);
  });

  it("leaves keys pressed in the target (or a layer it opened) to the page", async () => {
    renderTour([{ ...STEP, interactive: true }, END]);
    await start();
    amount().focus();
    fireEvent.keyDown(amount(), { key: "Escape" });
    fireEvent.keyDown(amount(), { key: "ArrowRight" });
    fireEvent.keyDown(amount(), { key: "Enter" });
    await flush();
    // Escape did not skip, ArrowRight and Enter did not advance.
    expect(state()).toBe("step 0");
    // From the card, the tour's keys are the tour's.
    fireEvent.keyDown(screen.getByRole("button", { name: "Skip" }).closest('[tabindex="-1"]')!, { key: "ArrowRight" });
    await flush();
    expect(state()).toBe("step 1");
  });
});

describe("Tour awaitInput step", () => {
  it("swaps Next for the hint and is interactive by itself", async () => {
    renderTour([{ ...STEP, awaitInput: true }, END]);
    await start();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.getByText("Enter a value in the highlighted field to continue")).toBeInTheDocument();
    expect(overlay()).toHaveClass("z-[45]");
  });

  it("advances once focus leaves the field with a new value — the number pad's Done", async () => {
    renderTour([{ ...STEP, awaitInput: true }, END]);
    await start();
    amount().focus();
    // As the pad types: the value changes with no native `change` event.
    fireEvent.input(amount(), { target: { value: "12" } });
    await settle();
    expect(state()).toBe("step 0");
    fireEvent.blur(amount());
    await settle();
    expect(state()).toBe("step 1");
  });

  it("does not advance on a visit that changed nothing", async () => {
    renderTour([{ ...STEP, awaitInput: true }, END]);
    await start();
    amount().focus();
    fireEvent.blur(amount());
    await settle();
    expect(state()).toBe("step 0");
  });

  it("advances on Enter after a new value", async () => {
    renderTour([{ ...STEP, awaitInput: true }, END]);
    await start();
    amount().focus();
    fireEvent.keyDown(amount(), { key: "Enter" });
    await settle();
    expect(state()).toBe("step 0");
    fireEvent.input(amount(), { target: { value: "7" } });
    fireEvent.keyDown(amount(), { key: "Enter" });
    await settle();
    expect(state()).toBe("step 1");
  });

  it("names the hint in the provider's language", async () => {
    renderTour([{ ...STEP, awaitInput: true }, END], true);
    await start();
    expect(
      screen.getByText("Geben Sie im hervorgehobenen Feld einen Wert ein, um fortzufahren"),
    ).toBeInTheDocument();
  });
});
