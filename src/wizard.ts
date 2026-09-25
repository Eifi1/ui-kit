// `@eifi1/ui-kit/wizard` — the multi-step engine, its chrome and its review step.
//
// A re-slicing of the main barrel, not a new API. By default useWizard syncs the
// active step to `?step=` via react-router's useSearchParams, so it needs a router;
// `urlSync: false` keeps the step in memory and needs none.
//
// NOT the same thing as `WizardStepper` in components/wizard-stepper, which is a bare
// two-step indicator with no engine and stays on the main barrel.
export * from "./wizard/types";
export * from "./wizard/use-wizard";
export * from "./wizard/wizard-context";
export * from "./wizard/validation";
export * from "./wizard/wizard-step";
export * from "./wizard/wizard-summary";
export * from "./wizard/stepper-nav";
