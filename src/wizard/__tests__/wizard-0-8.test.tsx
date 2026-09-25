import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { cloneElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useWizard } from "../use-wizard";
import { StepperNav } from "../stepper-nav";
import type { UseWizardOptions, WizardStepConfig } from "../types";

/**
 * B16 (0.8.0): what keksdose's YNAB import needed to move onto the kit wizard —
 * a customisable Finish, a Back that waits for the commit, an optional Cancel and a
 * Back that leaves from step 1, steps after the commit, a pending Next, a wizard
 * with no router, and a per-step Next label.
 */

type Data = Record<string, unknown>;

const THREE: WizardStepConfig[] = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C" },
];

/** The last URL search the wizard left behind, rendered where a test can read it. */
function SearchProbe() {
  return <output data-testid="search">{useLocation().search}</output>;
}

function Harness({
  options,
  nav,
  children,
}: {
  options: UseWizardOptions<Data>;
  nav?: Partial<Parameters<typeof StepperNav<Data>>[0]>;
  children?: (wizard: ReturnType<typeof useWizard<Data>>) => ReactNode;
}) {
  const wizard = useWizard<Data>(options);
  return (
    <StepperNav wizard={wizard} {...nav}>
      <p data-testid="step">{wizard.currentStep.id}</p>
      {children?.(wizard)}
    </StepperNav>
  );
}

function renderInRouter(ui: ReactElement, initial = "/import") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      {ui}
      <SearchProbe />
    </MemoryRouter>,
  );
}

const click = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

describe("B16.1 a customisable Finish", () => {
  const ONE: WizardStepConfig[] = [{ id: "only", label: "Only" }];

  it("takes a variant and a disabled state of its own", async () => {
    const onComplete = vi.fn();
    const { rerender } = renderInRouter(
      <Harness options={{ steps: ONE, onComplete }} nav={{ finishVariant: "danger", finishDisabled: true }} />,
    );
    const finish = screen.getByRole("button", { name: "Finish" });
    expect(finish).toBeDisabled();
    expect(finish.className).toContain("bg-[var(--danger)]");

    rerender(
      <MemoryRouter>
        <Harness options={{ steps: ONE, onComplete }} nav={{ finishVariant: "danger" }} />
      </MemoryRouter>,
    );
    await click("Finish");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("hands the kit's own button to renderFinish, which can wrap and disable it", async () => {
    const onComplete = vi.fn();
    // SaveGuard's shape: a wrapper that clones its child with `disabled`.
    const Guard = ({ children, locked }: { children: ReactElement; locked: boolean }) => (
      <span data-testid="guard" title={locked ? "Read-only demo" : undefined}>
        {locked ? cloneElement(children as ReactElement<{ disabled?: boolean }>, { disabled: true }) : children}
      </span>
    );
    renderInRouter(
      <Harness
        options={{ steps: ONE, onComplete }}
        nav={{ renderFinish: (button) => <Guard locked>{button}</Guard> }}
      />,
    );
    const guard = screen.getByTestId("guard");
    const finish = screen.getByRole("button", { name: "Finish" });
    expect(guard).toContainElement(finish);
    expect(finish).toBeDisabled();
    expect(finish).toHaveAttribute("data-tour", "wizard-finish");
  });
});

describe("B16.2 Back while submitting", () => {
  it("is disabled in the chrome and refused by the hook until onComplete settles", async () => {
    let resolve!: () => void;
    const onComplete = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    let wizardRef!: ReturnType<typeof useWizard<Data>>;
    renderInRouter(
      <Harness options={{ steps: THREE, onComplete }}>
        {(w) => {
          wizardRef = w;
          return null;
        }}
      </Harness>,
    );
    await click("Next");
    await click("Next");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Back" })).toBeDisabled());
    act(() => wizardRef.goBack());
    expect(screen.getByTestId("step")).toHaveTextContent("c");
    await act(async () => resolve());
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
  });
});

describe("B16.3 optional Cancel, confirm, and Back from step 1", () => {
  it("hides Cancel when cancellable is false", () => {
    renderInRouter(<Harness options={{ steps: THREE, cancellable: false }} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("cancels without the dialog when confirmCancel is false", async () => {
    const onCancel = vi.fn();
    renderInRouter(<Harness options={{ steps: THREE, onCancel, confirmCancel: false }} />);
    await click("Cancel");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("still asks by default", async () => {
    const onCancel = vi.fn();
    renderInRouter(<Harness options={{ steps: THREE, onCancel }} />);
    await click("Cancel");
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText("Discard this form?")).toBeInTheDocument();
  });

  it("shows Back on step 1 only with onExit, and calls it", async () => {
    const { unmount } = renderInRouter(<Harness options={{ steps: THREE }} />);
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    unmount();

    const onExit = vi.fn();
    renderInRouter(<Harness options={{ steps: THREE, onExit }} />);
    await click("Back");
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe("B16.4 steps after a committing step", () => {
  const IMPORT: WizardStepConfig[] = [
    { id: "accounts", label: "Accounts" },
    { id: "summary", label: "Summary", commits: true, nextLabel: "Import" },
    { id: "recurring", label: "Recurring" },
  ];

  it("commits on the flagged step, advances, and locks the way back", async () => {
    const onComplete = vi.fn();
    const onDone = vi.fn();
    let wizardRef!: ReturnType<typeof useWizard<Data>>;
    renderInRouter(
      <Harness options={{ steps: IMPORT, onComplete, onDone }}>
        {(w) => {
          wizardRef = w;
          return null;
        }}
      </Harness>,
    );
    await click("Next");
    // The committing step's forward button is Finish, under its own label.
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    await click("Import");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("step")).toHaveTextContent("recurring");
    expect(wizardRef.committed).toBe(true);

    // No Back across the commit, no Cancel of what is already written.
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    act(() => wizardRef.goBack());
    act(() => wizardRef.goToStep(0));
    expect(screen.getByTestId("step")).toHaveTextContent("recurring");
    // …and the indicator agrees.
    const indicator = screen.getByRole("navigation", { name: "Steps" });
    const [first, second] = indicator.querySelectorAll("button");
    expect(first).toBeDisabled();
    expect(second).toBeDisabled();

    // A second commit is refused.
    await act(async () => wizardRef.finish());
    expect(onComplete).toHaveBeenCalledTimes(1);

    await click("Done");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("stays on the committing step when onComplete rejects", async () => {
    const onComplete = vi.fn(async () => {
      throw new Error("server said no");
    });
    renderInRouter(<Harness options={{ steps: IMPORT, onComplete }} />);
    await click("Next");
    await click("Import");
    expect(screen.getByTestId("step")).toHaveTextContent("summary");
    expect(screen.getByRole("alert")).toHaveTextContent("server said no");
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
  });

  it("renders no Done without onDone — the step brings its own way out", async () => {
    renderInRouter(<Harness options={{ steps: IMPORT, onComplete: vi.fn() }} />);
    await click("Next");
    await click("Import");
    expect(screen.getByTestId("step")).toHaveTextContent("recurring");
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  });

  it("allows Back between post-commit steps, but not across the commit", async () => {
    const steps: WizardStepConfig[] = [
      { id: "a", label: "A", commits: true },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ];
    renderInRouter(<Harness options={{ steps, onComplete: vi.fn() }} />);
    await click("Finish");
    expect(screen.getByTestId("step")).toHaveTextContent("b");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await click("Next");
    await click("Back");
    expect(screen.getByTestId("step")).toHaveTextContent("b");
  });

  it("leaves a last-step commit as it was before 0.8", async () => {
    const onComplete = vi.fn();
    let wizardRef!: ReturnType<typeof useWizard<Data>>;
    renderInRouter(
      <Harness options={{ steps: THREE, onComplete }}>
        {(w) => {
          wizardRef = w;
          return null;
        }}
      </Harness>,
    );
    await click("Next");
    await click("Next");
    await click("Finish");
    expect(onComplete).toHaveBeenCalledTimes(1);
    // Still there, Back and Cancel still offered, Finish can be pressed again.
    expect(screen.getByTestId("step")).toHaveTextContent("c");
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(wizardRef.commitStepIndex).toBe(2);
    await click("Finish");
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it("writes the post-commit step to the URL like any other", async () => {
    renderInRouter(<Harness options={{ steps: IMPORT, onComplete: vi.fn() }} />);
    await click("Next");
    await click("Import");
    expect(screen.getByTestId("search")).toHaveTextContent("?step=2");
  });
});

describe("B16.5 a pending Next while an async validate runs", () => {
  it("shows a spinner, aria-busy and disabled, then settles", async () => {
    let release!: (ok: boolean) => void;
    const validate = vi.fn(() => new Promise<boolean>((r) => (release = r)));
    renderInRouter(<Harness options={{ steps: [{ ...THREE[0], validate }, THREE[1]] }} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });
    const next = screen.getByRole("button", { name: "Next" });
    await waitFor(() => expect(next).toHaveAttribute("aria-busy", "true"));
    expect(next).toBeDisabled();
    expect(next.querySelector(".animate-spin")).not.toBeNull();
    // A second click is still refused (the 0.7 guard), and the validator ran once.
    fireEvent.click(next);
    expect(validate).toHaveBeenCalledTimes(1);
    await act(async () => release(true));
    expect(screen.getByTestId("step")).toHaveTextContent("b");
    expect(screen.getByRole("button", { name: "Finish" })).not.toHaveAttribute("aria-busy");
  });

  it("exposes isValidating on the hook and clears it when validation fails", async () => {
    let release!: (ok: boolean) => void;
    const { result } = renderHook(
      () =>
        useWizard({
          steps: [{ ...THREE[0], validate: () => new Promise<boolean>((r) => (release = r)) }, THREE[1]],
          onValidationFailed: () => {},
        }),
      { wrapper: MemoryRouter },
    );
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.goNext();
    });
    expect(result.current.isValidating).toBe(true);
    await act(async () => {
      release(false);
      await pending;
    });
    expect(result.current.isValidating).toBe(false);
    expect(result.current.currentStepIndex).toBe(0);
  });
});

describe("B16.6 optional URL sync", () => {
  it("runs with no router at all under urlSync: false", async () => {
    render(<Harness options={{ steps: THREE, urlSync: false }} />);
    await click("Next");
    expect(screen.getByTestId("step")).toHaveTextContent("b");
  });

  it("writes ?step= by default, or a custom param", async () => {
    const { unmount } = renderInRouter(<Harness options={{ steps: THREE }} />);
    await click("Next");
    expect(screen.getByTestId("search")).toHaveTextContent("?step=1");
    unmount();

    renderInRouter(<Harness options={{ steps: THREE, urlSync: { param: "importStep" } }} />, "/i?tab=ynab");
    await click("Next");
    expect(screen.getByTestId("search")).toHaveTextContent("?tab=ynab&importStep=1");
  });

  it("drops the param when the wizard is left through Cancel, onExit or Done", async () => {
    const { unmount } = renderInRouter(
      <Harness options={{ steps: THREE, onCancel: vi.fn(), confirmCancel: false }} />,
      "/i?tab=ynab",
    );
    await click("Next");
    await click("Cancel");
    expect(screen.getByTestId("search")).toHaveTextContent(/^\?tab=ynab$/);
    unmount();

    const second = renderInRouter(<Harness options={{ steps: THREE, onExit: vi.fn() }} />);
    expect(screen.getByTestId("search")).toHaveTextContent("?step=0");
    await click("Back");
    expect(screen.getByTestId("search").textContent).toBe("");
    second.unmount();

    renderInRouter(
      <Harness
        options={{
          steps: [{ id: "a", label: "A", commits: true }, { id: "b", label: "B" }],
          onComplete: vi.fn(),
          onDone: vi.fn(),
        }}
      />,
    );
    await click("Finish");
    expect(screen.getByTestId("search")).toHaveTextContent("?step=1");
    await click("Done");
    expect(screen.getByTestId("search").textContent).toBe("");
  });

  it("does not touch the URL under urlSync: false", async () => {
    renderInRouter(<Harness options={{ steps: THREE, urlSync: false }} />, "/i?tab=ynab");
    await click("Next");
    expect(screen.getByTestId("search")).toHaveTextContent(/^\?tab=ynab$/);
  });
});

describe("B16.7 a per-step Next label", () => {
  it("labels Next on that step only, and Finish on the committing step", async () => {
    renderInRouter(
      <Harness
        options={{
          steps: [
            { id: "a", label: "A", nextLabel: "Analyse" },
            { id: "b", label: "B" },
            { id: "c", label: "C", nextLabel: "Replace and import" },
          ],
          onComplete: vi.fn(),
        }}
      />,
    );
    await click("Analyse");
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    await click("Next");
    expect(screen.getByRole("button", { name: "Replace and import" })).toBeInTheDocument();
  });
});
