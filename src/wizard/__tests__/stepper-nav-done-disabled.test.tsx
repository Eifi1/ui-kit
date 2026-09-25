import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useWizard } from "../use-wizard";
import { StepperNav } from "../stepper-nav";
import type { WizardStepConfig } from "../types";

/**
 * `doneDisabled`: keksdose's YNAB import ends on a recurring step whose convert loop
 * must not be left mid-run. Done stays on screen, disabled, rather than vanishing.
 */

type Data = Record<string, unknown>;

const STEPS: WizardStepConfig[] = [
  { id: "summary", label: "Summary", commits: true },
  { id: "recurring", label: "Recurring" },
];

function Harness({ onDone, doneDisabled }: { onDone: () => void; doneDisabled?: boolean }) {
  const wizard = useWizard<Data>({ steps: STEPS, onComplete: vi.fn(), onDone });
  return (
    <StepperNav wizard={wizard} doneDisabled={doneDisabled}>
      <p data-testid="step">{wizard.currentStep.id}</p>
    </StepperNav>
  );
}

describe("StepperNav doneDisabled", () => {
  it("keeps Done on screen but disabled while the step is busy, then enables it", async () => {
    const onDone = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <Harness onDone={onDone} doneDisabled />
      </MemoryRouter>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    });
    expect(screen.getByTestId("step")).toHaveTextContent("recurring");
    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toBeDisabled();
    fireEvent.click(done);
    expect(onDone).not.toHaveBeenCalled();

    rerender(
      <MemoryRouter>
        <Harness onDone={onDone} />
      </MemoryRouter>,
    );
    const enabled = screen.getByRole("button", { name: "Done" });
    expect(enabled).toBeEnabled();
    fireEvent.click(enabled);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
