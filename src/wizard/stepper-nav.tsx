import { useId, useMemo } from "react";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "../components/ui";
import { Modal } from "../components/modal";
import { alertFrameClass } from "../components/alert-banner";
import { WizardContextProvider } from "./wizard-context";
import { resolveWizardLabels } from "./types";
import type { UseWizardReturn, WizardLabels } from "./types";

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
 */
export function StepperNav<TData extends Record<string, unknown>>({
  wizard,
  children,
  title,
  description,
  className,
  labels,
}: {
  wizard: UseWizardReturn<TData>;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  labels?: Partial<WizardLabels>;
}) {
  const l = resolveWizardLabels(labels);
  const cancelTitleId = useId();

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
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
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
                  disabled={status === "upcoming"}
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
                        "border-slate-300 bg-[var(--bg-surface)] text-slate-400 dark:border-slate-600 dark:text-slate-500",
                      status === "skipped" &&
                        "border-slate-300 bg-[var(--bg-surface-2)] text-slate-500 dark:border-slate-600 dark:text-slate-400",
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
                        : "text-slate-500 dark:text-slate-400",
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
        <div className="min-h-[300px]">{children}</div>
      </WizardContextProvider>

      {/* Submit error */}
      {wizard.error && (
        <div
          role="alert"
          className={cn(
            "text-sm text-rose-900 dark:text-rose-100",
            alertFrameClass("danger"),
          )}
        >
          {wizard.error}
        </div>
      )}

      {/* Navigation bar */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <Button variant="secondary" onClick={wizard.cancel}>
          {l.cancel}
        </Button>
        <div className="flex items-center gap-2">
          {!wizard.isFirstStep && (
            <Button variant="secondary" onClick={wizard.goBack}>
              {l.back}
            </Button>
          )}
          {wizard.currentStep.optional && !wizard.isLastStep && (
            <Button variant="ghost" onClick={wizard.skip} disabled={wizard.nextBlocked}>
              {l.skip}
            </Button>
          )}
          {wizard.isLastStep ? (
            <Button
              variant="brand"
              data-tour="wizard-finish"
              onClick={wizard.finish}
              disabled={wizard.isSubmitting || !canFinish}
            >
              {wizard.isSubmitting ? l.submitting : l.finish}
            </Button>
          ) : (
            <Button
              variant="brand"
              data-tour="wizard-next"
              onClick={wizard.goNext}
              disabled={wizard.nextBlocked}
            >
              {l.next}
            </Button>
          )}
        </div>
      </div>

      {/* Cancel confirmation */}
      {wizard.showCancelDialog && (
        <Modal onClose={wizard.dismissCancel} labelledBy={cancelTitleId} className="space-y-4">
          <div className="space-y-1.5">
            <h2 id={cancelTitleId} className="text-lg font-semibold text-[var(--text-primary)]">
              {l.cancelTitle}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{l.confirmCancel}</p>
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
