import { cloneElement } from "react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useWizard } from "../use-wizard";
import { StepperNav } from "../stepper-nav";
import { WriteLockProvider } from "../../components/write-lock";
import type { WizardStepConfig } from "../types";

/**
 * keksdose G1: the Finish button takes the kit Button's write lock — `finishCommit` and
 * `finishDisabledReason` — instead of the app cloning `commit` into the element
 * `renderFinish` hands it (ynab-import-panel.tsx). Under a lock Finish is
 * `aria-disabled` but focusable, its reason is in the Tooltip and the description,
 * and `wizard.finish` does not run.
 */

type Data = Record<string, unknown>;

const STEPS: WizardStepConfig[] = [
  { id: "confirm", label: "Confirm", commits: true },
  { id: "result", label: "Result" },
];

type NavProps = Pick<
  Parameters<typeof StepperNav<Data>>[0],
  "finishCommit" | "finishDisabledReason" | "renderFinish"
>;

function Harness({ onComplete, ...nav }: NavProps & { onComplete: () => void }) {
  const wizard = useWizard<Data>({ steps: STEPS, onComplete });
  return (
    <StepperNav wizard={wizard} {...nav}>
      <p data-testid="step">{wizard.currentStep.id}</p>
    </StepperNav>
  );
}

function renderNav(nav: NavProps & { onComplete: () => void }, locked?: string) {
  const harness = <Harness {...nav} />;
  return render(
    <MemoryRouter>
      {locked === undefined ? harness : <WriteLockProvider locked reason={locked}>{harness}</WriteLockProvider>}
    </MemoryRouter>,
  );
}

const finish = () => screen.getByRole("button", { name: "Finish" });

function described(el: HTMLElement) {
  return (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);
}

describe("StepperNav: the write lock on Finish (keksdose G1)", () => {
  it("finishCommit under a locked provider: focusable, says why, and does not finish", async () => {
    const onComplete = vi.fn();
    renderNav({ onComplete, finishCommit: true }, "Read-only demo — importing is disabled");
    const button = finish();
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    act(() => button.focus());
    expect(button).toHaveFocus();
    expect(described(button)).toContain("Read-only demo — importing is disabled");
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Read-only demo — importing is disabled");

    await act(async () => {
      fireEvent.click(button);
    });
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByTestId("step")).toHaveTextContent("confirm");
  });

  it("finishDisabledReason: the app's own reason, the same focusable lock", async () => {
    const onComplete = vi.fn();
    renderNav({ onComplete, finishDisabledReason: "Map every account first" });
    expect(finish()).toHaveAttribute("aria-disabled", "true");
    expect(described(finish())).toContain("Map every account first");
    await act(async () => {
      fireEvent.click(finish());
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("the lock's reason wins over finishDisabledReason under finishCommit", () => {
    renderNav(
      { onComplete: vi.fn(), finishCommit: true, finishDisabledReason: "Its own reason" },
      "Shared with you to read",
    );
    expect(described(finish())).toContain("Shared with you to read");
    expect(described(finish())).not.toContain("Its own reason");
  });

  it("no provider (or no lock): finishCommit changes nothing — Finish finishes", async () => {
    const onComplete = vi.fn();
    renderNav({ onComplete, finishCommit: true });
    expect(finish()).not.toHaveAttribute("aria-disabled");
    await act(async () => {
      fireEvent.click(finish());
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("step")).toHaveTextContent("result");
  });

  it("only Finish is locked: without finishCommit the wizard finishes under the lock", async () => {
    const onComplete = vi.fn();
    renderNav({ onComplete }, "Locked");
    await act(async () => {
      fireEvent.click(finish());
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("renderFinish cloning `commit` in — keksdose's way until now — keeps working", async () => {
    const onComplete = vi.fn();
    renderNav(
      {
        onComplete,
        renderFinish: (button) => cloneElement(button as ReactElement<{ commit?: boolean }>, { commit: true }),
      },
      "Read-only demo",
    );
    expect(finish()).toHaveAttribute("aria-disabled", "true");
    await act(async () => {
      fireEvent.click(finish());
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
