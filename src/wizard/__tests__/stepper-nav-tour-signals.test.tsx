import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWizard } from "../use-wizard";
import { StepperNav } from "../stepper-nav";
import type { WizardStepConfig } from "../types";
import { TourProvider, useTour, type TourStep } from "../../tour/tour";

/**
 * StepperNav's tour signals (docs/tours-harmonization.md §11.9, contract round 054 §7): Next
 * releases "wizard-next" when the wizard moved and refuses it when a validator kept it in
 * place; Finish releases "wizard-finish" once onComplete resolved and refuses it, with the
 * error's message, when it threw. kastlan's `awaitClick` on wizard-next advanced on a
 * refused Next; `awaitGate: "wizard-next"` does not.
 */

function Wizard({ ok, onComplete }: { ok: () => boolean; onComplete: () => Promise<void> }) {
  const steps: WizardStepConfig[] = [
    { id: "a", label: "A", validate: () => ok() },
    { id: "b", label: "B" },
  ];
  const wizard = useWizard({ steps, onComplete });
  return (
    <StepperNav wizard={wizard}>
      <p data-testid="step">{wizard.currentStep.id}</p>
    </StepperNav>
  );
}

function Launcher({ steps }: { steps: TourStep[] }) {
  const tour = useTour();
  return (
    <>
      <button type="button" onClick={() => tour.start(steps)}>
        Take the tour
      </button>
      <output data-testid="tour">{tour.active ? `step ${tour.index}` : "idle"}</output>
    </>
  );
}

const TOUR: TourStep[] = [
  { title: "Next", body: "Press Next.", target: '[data-tour="wizard-next"]', awaitGate: "wizard-next" },
  { title: "Finish", body: "Press Finish.", target: '[data-tour="wizard-finish"]', awaitGate: "wizard-finish" },
  { title: "Done", body: "Created." },
];

beforeEach(() => {
  const original = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.hasAttribute("data-tour")) {
      const r = { top: 500, left: 300, width: 100, height: 36, right: 400, bottom: 536, x: 300, y: 500 };
      return { ...r, toJSON: () => r } as DOMRect;
    }
    return original.call(this);
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function setup(onComplete: () => Promise<void>) {
  let valid = false;
  render(
    <MemoryRouter>
      <TourProvider>
        <Launcher steps={TOUR} />
        <Wizard ok={() => valid} onComplete={onComplete} />
      </TourProvider>
    </MemoryRouter>,
  );
  return {
    makeValid: () => {
      valid = true;
    },
  };
}

const tour = () => screen.getByTestId("tour").textContent;
const press = async (name: string | RegExp) => {
  fireEvent.click(screen.getByRole("button", { name }));
  await settle();
};

describe("StepperNav tour signals", () => {
  it("a Next a validator refused keeps the tour on its step and shows the refusal; one that moved releases", async () => {
    const { makeValid } = setup(async () => {});
    await press("Take the tour");
    expect(tour()).toBe("step 0");
    fireEvent.click(document.querySelector('[data-tour="wizard-next"]')!);
    await settle();
    expect(screen.getByTestId("step")).toHaveTextContent("a");
    expect(tour()).toBe("step 0");
    expect(screen.getByText(/That wasn’t saved yet/)).toBeInTheDocument();
    makeValid();
    fireEvent.click(document.querySelector('[data-tour="wizard-next"]')!);
    await settle();
    expect(screen.getByTestId("step")).toHaveTextContent("b");
    expect(tour()).toBe("step 1");
  });

  it("a Finish that threw refuses with its message; one that resolved releases", async () => {
    let fail = true;
    const { makeValid } = setup(async () => {
      if (fail) throw new Error("The server said no.");
    });
    makeValid();
    await press("Take the tour");
    fireEvent.click(document.querySelector('[data-tour="wizard-next"]')!);
    await settle();
    expect(tour()).toBe("step 1");
    fireEvent.click(document.querySelector('[data-tour="wizard-finish"]')!);
    await settle();
    expect(tour()).toBe("step 1");
    expect(document.querySelector("[data-tour-refused]")).toHaveTextContent("The server said no.");
    fail = false;
    fireEvent.click(document.querySelector('[data-tour="wizard-finish"]')!);
    await settle();
    expect(tour()).toBe("step 2");
  });

  it("works as before without a TourProvider", async () => {
    render(
      <MemoryRouter>
        <Wizard ok={() => true} onComplete={async () => {}} />
      </MemoryRouter>,
    );
    fireEvent.click(document.querySelector('[data-tour="wizard-next"]')!);
    await settle();
    expect(screen.getByTestId("step")).toHaveTextContent("b");
  });
});
