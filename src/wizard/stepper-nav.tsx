import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/cn";
import { Button, Spinner } from "../components/ui";
import type { ButtonVariant } from "../components/ui";
import { Modal } from "../components/modal";
import { alertFrameClass } from "../components/alert-banner";
import { WizardContextProvider } from "./wizard-context";
import { DEFAULT_WIZARD_LABELS } from "./types";
import { useKitLabels } from "../i18n/kit-labels";
import type { UseWizardReturn, WizardLabels } from "./types";
import type { CommitScope } from "../components/write-lock";

/**
 * The chrome around a wizard: the step indicator, the step content, and the
 * Cancel / Back / Skip / Next / Finish bar — plus the cancel-confirmation
 * dialog, because "are you sure you want to lose this" is part of the wizard's
 * contract rather than something each app should re-decide.
 *
 * It is a component and not a set of parts for one reason: which button shows,
 * and whether it is enabled, is a function of `wizard` state that was getting
 * re-derived (and re-derived slightly differently) at every call site. Finish is
 * gated on `canFinish`, Next and Skip on `nextBlocked`, and Skip only appears on
 * an `optional` step that is not the last — that policy lives here now.
 *
 * The `<StepperNav>` is also what publishes {@link WizardContextProvider}, which
 * is how a mounted step registers its own validator. A step's
 * `useRhfWizardStep` / `useWizardStepValidate` therefore only works inside one.
 *
 * Which buttons show is read off `wizard` (`canCancel`, `canGoBack`, `canDone`,
 * `isCommitStep`), so the policy options — `cancellable`, `onExit`, `commits`,
 * `onDone` — are all set on `useWizard`. What is set HERE is how the Finish button
 * looks and what wraps it, because that is presentation and usually depends on
 * state the app holds (a "replace everything" toggle, a write lock — `finishCommit`).
 */
export function StepperNav<TData extends Record<string, unknown>>({
  wizard,
  children,
  title,
  description,
  className,
  labels,
  finishVariant = "brand",
  finishDisabled = false,
  finishCommit,
  finishDisabledReason,
  doneDisabled = false,
  renderFinish,
}: {
  wizard: UseWizardReturn<TData>;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  labels?: Partial<WizardLabels>;
  /** The Finish button's variant — `"danger"` for a destructive commit (an import
   *  that replaces what is there). Default `"brand"`. Next keeps `"brand"`. */
  finishVariant?: ButtonVariant;
  /** Disable Finish for a reason of the app's own, on top of the kit's gates
   *  (`canFinish`, submitting, validating). */
  finishDisabled?: boolean;
  /**
   * Finish COMMITS — {@link Button}'s `commit`, handed to the Finish button. Under a
   * locked {@link WriteLockProvider} it is `aria-disabled` but focusable, with the lock's
   * reason in the kit Tooltip, and a click (or Enter) does not run `wizard.finish`.
   * Every other button of the bar stays live: the steps before the commit write nothing,
   * so the whole wizard can still be walked through on a read-only page.
   *
   * keksdose G1: its YNAB import runs the mapping wizard on the read-only demo (dev#497)
   * and locks only the confirm step's Finish — by cloning `commit` into the element
   * `renderFinish` hands it, because StepperNav took no `commit` of its own. That clone
   * still works; this is the same thing without one. Named `finishCommit` beside
   * `finishVariant` / `finishDisabled` rather than a bare `commit`, which on a component
   * with five buttons would not say which one saves — and would read like `useWizard`'s
   * `commits`, which is a step's policy, not a lock.
   */
  finishCommit?: CommitScope;
  /**
   * Why Finish is not available — {@link Button}'s `disabledReason` on the Finish button:
   * `aria-disabled` and focusable, the reason in the kit Tooltip and on the button's
   * `aria-describedby`, `wizard.finish` not run. The explained form of `finishDisabled`
   * (a native `disabled` takes the button out of the tab order, so its reason never
   * reaches a keyboard). Under a lock with `finishCommit`, the lock's reason wins.
   */
  finishDisabledReason?: ReactNode;
  /**
   * Disable Done — the button of the last step after a commit — while the step still
   * has work of its own running. keksdose's YNAB import ends on a recurring step whose
   * convert loop writes one rule at a time (ynab-import-panel.tsx): leaving mid-loop
   * abandons the rest. Until now the panel dropped `onDone` for the duration, which
   * takes the button away instead of saying "not yet": disabled, it stays where the
   * eye left it and comes back to life when the loop ends.
   */
  doneDisabled?: boolean;
  /**
   * Wrap the Finish button: receives the kit's button element — already labelled,
   * gated and wired to `wizard.finish` — and returns what to render in its place.
   *
   * ```tsx
   * renderFinish={(button) => <SaveGuard lock={lock}>{button}</SaveGuard>}
   * ```
   *
   * A wrapper and not a replacement (`finishButton: (props) => …`) or a hook
   * (`onBeforeFinish`): the app's need is to put something AROUND the commit — a
   * write-lock tooltip, which has to sit on a wrapping element because a disabled
   * button receives no pointer events — while the kit keeps owning what the button
   * says and when it is enabled. A replacement would hand every app the gating to
   * re-derive (the problem this component exists to end); `onBeforeFinish` can veto
   * a click but cannot explain a disabled button. The element is a plain `<Button>`,
   * so a wrapper that clones it with `disabled` works as expected.
   *
   * For the write lock itself there is no need to wrap any more: `finishCommit` (and
   * `finishDisabledReason`) put the kit Button's own Tooltip on Finish. An element
   * cloned with `commit` here keeps working the same way.
   */
  renderFinish?: (button: ReactElement) => ReactNode;
}) {
  const l = useKitLabels("wizard", DEFAULT_WIZARD_LABELS, labels);
  const cancelTitleId = useId();

  // The step area never shrinks below the tallest step shown so far, so the button
  // bar does not jump up and down as Next and Back move between a long step and a
  // short one. This replaces a fixed `min-h-[300px]` (carried over from Kastlan,
  // whose steps are all long forms), which did the same for steps under 300px but
  // left a short wizard — two fields a step — with a ~200px hole above its buttons.
  // Measured rather than guessed: the floor is whatever the app's own steps need.
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentFloor, setContentFloor] = useState(0);
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const h = el.offsetHeight;
      setContentFloor((floor) => (h > floor ? h : floor));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const contextValue = useMemo(
    () => ({
      registerStepValidate: wizard.registerStepValidate,
      setNextBlocked: wizard.setNextBlocked,
    }),
    [wizard.registerStepValidate, wizard.setNextBlocked],
  );

  // Finish is only valid once every step before the last has been completed or
  // skipped (derived once in useWizard). Prevents a restored last-step index
  // (empty data after a reload) from firing an empty submit.
  const canFinish = wizard.canFinish;

  // Pending while the step's validators run (an async server check): a spinner and
  // `aria-busy`, and disabled — the hook's own re-entry guard still refuses a second
  // press, this just stops it looking like the first one did nothing.
  const pending = wizard.isValidating;
  const stepNextLabel = wizard.currentStep.nextLabel;

  // Every branch below assigns it; no initial value to overwrite.
  let forwardButton: ReactNode;
  if (wizard.isCommitStep) {
    const finishButton = (
      <Button
        variant={finishVariant}
        data-tour="wizard-finish"
        onClick={wizard.finish}
        // The kit Button's lock: a reason (its own or, with `commit`, the provider's)
        // wins over `disabled` and keeps the button reachable, saying why.
        commit={finishCommit}
        disabledReason={finishDisabledReason}
        disabled={wizard.isSubmitting || pending || !canFinish || finishDisabled}
        aria-busy={wizard.isSubmitting || pending || undefined}
      >
        {/* Decorative: the button's text is what a reader hears. */}
        {pending && <Spinner label={null} className="size-4" />}
        {wizard.isSubmitting ? l.submitting : (stepNextLabel ?? l.finish)}
      </Button>
    );
    forwardButton = renderFinish ? renderFinish(finishButton) : finishButton;
  } else if (wizard.isLastStep) {
    // The last step after a commit. Nothing to finish; Done only when the app gave
    // an `onDone` — otherwise the step carries its own way out.
    forwardButton = wizard.canDone ? (
      <Button variant="brand" data-tour="wizard-done" onClick={wizard.done} disabled={doneDisabled}>
        {stepNextLabel ?? l.done ?? DEFAULT_WIZARD_LABELS.done}
      </Button>
    ) : null;
  } else {
    forwardButton = (
      <Button
        variant="brand"
        data-tour="wizard-next"
        onClick={wizard.goNext}
        disabled={wizard.nextBlocked || pending}
        aria-busy={pending || undefined}
      >
        {pending && <Spinner label={null} className="size-4" />}
        {stepNextLabel ?? l.next}
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {(title || description) && (
        <div>
          {title && (
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
          )}
        </div>
      )}

      {/* Step indicator */}
      <nav aria-label={l.steps}>
        <ol className="flex w-full items-center">
          {wizard.steps.map((step, index) => {
            const status = wizard.stepStatus(index);
            const isLast = index === wizard.steps.length - 1;

            return (
              <li key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
                <button
                  type="button"
                  onClick={() => wizard.goToStep(index)}
                  // `canGoToStep` adds the commit lock: once past a committing step,
                  // the steps up to it are done with and cannot be reopened.
                  disabled={status === "upcoming" || !wizard.canGoToStep(index)}
                  aria-current={status === "active" ? "step" : undefined}
                  className={cn(
                    "group flex flex-col items-center gap-1.5",
                    status === "upcoming" ? "cursor-default" : "cursor-pointer",
                  )}
                >
                  {/* Circle */}
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                      status === "completed" &&
                        "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]",
                      status === "active" &&
                        "border-[var(--brand)] bg-[var(--bg-surface)] text-[var(--brand)]",
                      status === "upcoming" &&
                        "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-placeholder)]",
                      status === "skipped" &&
                        "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]",
                    )}
                  >
                    {status === "completed" ? <Check className="size-4" /> : index + 1}
                  </span>
                  {/* Label — hidden on mobile, where the line below carries it */}
                  <span
                    className={cn(
                      "hidden text-xs font-medium md:block",
                      status === "active" || status === "completed"
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)]",
                    )}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 flex-1",
                      status === "completed" ? "bg-[var(--brand)]" : "bg-[var(--border)]",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
        {/* Mobile: the labels above are hidden, so name the current step here */}
        <p className="mt-2 text-center text-sm font-medium text-[var(--text-primary)] md:hidden">
          {l.step(wizard.currentStepIndex + 1, wizard.steps.length)}
          {" — "}
          {wizard.currentStep.label}
        </p>
      </nav>

      {/* Step content */}
      <WizardContextProvider value={contextValue}>
        <div style={contentFloor > 0 ? { minHeight: contentFloor } : undefined}>
          <div ref={contentRef}>{children}</div>
        </div>
      </WizardContextProvider>

      {/* Submit error */}
      {wizard.error && (
        <div
          role="alert"
          className={cn(
            "text-sm text-[var(--danger)]",
            alertFrameClass("danger"),
          )}
        >
          {wizard.error}
        </div>
      )}

      {/* Navigation bar */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        {/* The empty span keeps the right-hand group on the right when Cancel is off. */}
        {wizard.canCancel ? (
          <Button variant="secondary" onClick={wizard.cancel}>
            {l.cancel}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {wizard.canGoBack && (
            // Disabled, not hidden, while the commit runs: it comes back if the commit
            // fails, and a button that vanishes mid-click is its own kind of surprise.
            <Button variant="secondary" onClick={wizard.goBack} disabled={wizard.isSubmitting}>
              {l.back}
            </Button>
          )}
          {wizard.currentStep.optional && !wizard.isLastStep && !wizard.isCommitStep && (
            <Button
              variant="ghost"
              onClick={wizard.skip}
              disabled={wizard.nextBlocked || wizard.isValidating}
            >
              {l.skip}
            </Button>
          )}
          {forwardButton}
        </div>
      </div>

      {/* Cancel confirmation */}
      {wizard.showCancelDialog && (
        <Modal onClose={wizard.dismissCancel} labelledBy={cancelTitleId} className="space-y-4">
          <div className="space-y-1.5">
            <h2 id={cancelTitleId} className="text-lg font-semibold text-[var(--text-primary)]">
              {l.cancelTitle}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">{l.confirmCancel}</p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={wizard.dismissCancel}>
              {l.cancelDismissLabel}
            </Button>
            <Button variant="danger" onClick={wizard.confirmCancel}>
              {l.cancelConfirmLabel}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
