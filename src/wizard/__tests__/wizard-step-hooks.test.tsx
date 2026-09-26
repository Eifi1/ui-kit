import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useWizard } from "../use-wizard";
import { StepperNav } from "../stepper-nav";
import { useWizardNextGate, useWizardStepValidate } from "../wizard-context";
import { WizardStep } from "../wizard-step";
import type { ValidateResult, WizardStepConfig } from "../types";

/**
 * The two non-form step hooks, under a real `useWizard` + `StepperNav`: what they could
 * get wrong is the registration with the wizard, which a mocked context would assert
 * against itself.
 */
const STEPS: WizardStepConfig[] = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
];

function Harness({ children }: { children: (step: string) => React.ReactNode }) {
  const wizard = useWizard({ steps: STEPS, urlSync: false, onValidationFailed: () => {} });
  return (
    <StepperNav wizard={wizard}>
      <p data-testid="step">{wizard.currentStep.id}</p>
      {children(wizard.currentStep.id)}
    </StepperNav>
  );
}

async function clickNext() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
  });
}

function ValidatedStep({ validate }: { validate: (count: number) => ValidateResult }) {
  const [count, setCount] = useState(0);
  // An inline closure over the latest state: the ref must hand Next the CURRENT one.
  useWizardStepValidate(() => validate(count));
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      Add line
    </button>
  );
}

describe("useWizardStepValidate", () => {
  it("blocks Next while the validator fails and reads the latest state", async () => {
    const validate = vi.fn((count: number) => ({ ok: count >= 2 }));
    render(<Harness>{(step) => step === "one" && <ValidatedStep validate={validate} />}</Harness>);

    await clickNext();
    expect(screen.getByTestId("step")).toHaveTextContent("one");
    expect(validate).toHaveBeenLastCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: "Add line" }));
    fireEvent.click(screen.getByRole("button", { name: "Add line" }));
    await clickNext();
    expect(validate).toHaveBeenLastCalledWith(2);
    expect(screen.getByTestId("step")).toHaveTextContent("two");
  });

  it("throws outside a StepperNav", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ValidatedStep validate={() => true} />)).toThrow(/StepperNav/);
    logged.mockRestore();
  });
});

function GatedStep() {
  const [blocked, setBlocked] = useState(true);
  useWizardNextGate(blocked);
  return (
    <button type="button" onClick={() => setBlocked((b) => !b)}>
      Toggle gate
    </button>
  );
}

describe("useWizardNextGate", () => {
  it("disables Next while blocked, and lifts the gate when the step unmounts", async () => {
    const { rerender } = render(<Harness>{(step) => step === "one" && <GatedStep />}</Harness>);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Toggle gate" }));
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Toggle gate" }));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    // The step goes away while still blocking: the next one must not inherit it.
    rerender(<Harness>{() => null}</Harness>);
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });
});

describe("WizardStep title / description", () => {
  it("renders the heading at level 3 by default, with the description under it", () => {
    render(
      <WizardStep title="Choose a unit" description="Only vacant units are listed.">
        <p>body</p>
      </WizardStep>,
    );
    const heading = screen.getByRole("heading", { level: 3, name: "Choose a unit" });
    expect(heading).toHaveClass("text-lg", "font-semibold");
    expect(screen.getByText("Only vacant units are listed.")).toBeInTheDocument();
  });

  it("takes another heading level", () => {
    render(<WizardStep title="Lines" headingLevel={2}>x</WizardStep>);
    expect(screen.getByRole("heading", { level: 2, name: "Lines" })).toBeInTheDocument();
  });

  it("renders no header without a title or description, as before", () => {
    const { container } = render(<WizardStep>x</WizardStep>);
    expect(container.querySelector("[data-slot=wizard-step-header]")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
