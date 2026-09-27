import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useWizard } from "../use-wizard";
import { StepperNav } from "../stepper-nav";
import type { WizardStepConfig } from "../types";

/**
 * The step area used to be a fixed `min-h-[300px]`, which left a short wizard with a
 * ~200px hole above its buttons. It now keeps the tallest step seen so far as its
 * floor: no hole, and the button bar still does not jump back up on a shorter step.
 */

const TWO: WizardStepConfig[] = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
];

let observed: { callback: ResizeObserverCallback; target: Element }[] = [];
let heights = new Map<Element, number>();

beforeEach(() => {
  observed = [];
  heights = new Map();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        observed.push({ callback: this.callback, target });
      }
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return heights.get(this) ?? 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The step content reports `h` px tall. */
function resize(h: number) {
  const [{ callback, target }] = observed;
  heights.set(target, h);
  act(() => callback([], {} as ResizeObserver));
}

function Harness() {
  const wizard = useWizard({ steps: TWO, onComplete: () => {} });
  return (
    <StepperNav wizard={wizard}>
      <p data-testid="step">{wizard.currentStep.id}</p>
    </StepperNav>
  );
}

describe("StepperNav step area", () => {
  it("has no fixed minimum height", () => {
    render(<Harness />, { wrapper: MemoryRouter });
    const area = screen.getByTestId("step").parentElement!.parentElement!;
    expect(area.className).not.toContain("min-h-");
    expect(area.style.minHeight).toBe("");
  });

  it("keeps the tallest step's height as its floor", () => {
    render(<Harness />, { wrapper: MemoryRouter });
    const area = screen.getByTestId("step").parentElement!.parentElement!;
    resize(120);
    expect(area.style.minHeight).toBe("120px");
    // A shorter step does not pull the buttons up…
    resize(60);
    expect(area.style.minHeight).toBe("120px");
    // …and a taller one raises the floor.
    resize(180);
    expect(area.style.minHeight).toBe("180px");
  });
});
