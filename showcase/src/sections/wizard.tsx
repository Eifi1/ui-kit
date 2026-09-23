import { useEffect, useRef, useState } from "react";
import {
  AlertBanner,
  Button,
  DEFAULT_WIZARD_LABELS,
  Input,
  StepperNav,
  Textarea,
  ToggleGroup,
  WizardContextProvider,
  WizardStep,
  WizardStepper,
  WizardSummary,
  requiredFieldsValidator,
  resolveWizardLabels,
  useWizard,
  useWizardContext,
} from "@eifi1/ui-kit";
import type {
  SummarySection,
  ValidateResult,
  WizardContextValue,
  WizardLabels,
  WizardStepConfig,
} from "@eifi1/ui-kit";
import { ConstList, Example, Note, OutTable, Row } from "../lib/section";

/**
 * WIZARD.
 *
 * Two unrelated things share the word, and the README says so: the `wizard/`
 * engine (a step machine with validators, collected data, a cancel gate and a
 * review step) and `components/wizard-stepper`, a bare indicator for the import
 * flows with no engine behind it at all. They are rendered adjacent at the bottom
 * of this section because that is the only way the claim becomes checkable.
 *
 * The toy wizard below is deliberately domain-free — a name, a size, a note — so
 * that what you are reading is the ENGINE's behaviour and not a form's. Every gate
 * it shows is one of the engine's, and each is a different mechanism:
 *
 *   step 1  a validator REGISTERED by the mounted step through `useWizardContext`,
 *           returning per-field errors, plus `setNextBlocked` for a hard disable;
 *   step 2  the step config's own `validate`, returning a bare boolean, which is
 *           the shape that routes through `missingRequiredMessage`;
 *   step 3  no gate — `WizardSummary`, whose edit buttons call `goToStep`.
 */

type Size = "compact" | "regular" | "roomy";

/**
 * A `type`, not an `interface`: `useWizard<TData extends Record<string, unknown>>`
 * needs an implicit index signature, and only a type alias gets one. An interface
 * with exactly these fields fails to satisfy the constraint.
 */
type Draft = {
  name: string;
  size: Size | "";
  note: string;
};

const INITIAL_DRAFT: Draft = { name: "", size: "", note: "" };

const SIZE_OPTIONS = [
  { value: "compact" as const, label: "Compact" },
  { value: "regular" as const, label: "Regular" },
  { value: "roomy" as const, label: "Roomy" },
];

/** Partial, because `resolveWizardLabels` fills the rest — the point of the prop
 *  is that a monolingual app overrides the two strings it cares about rather than
 *  restating fifteen English defaults. */
const LABELS: Partial<WizardLabels> = {
  finish: "Create thing",
  cancelTitle: "Discard this draft?",
  confirmCancel: "The three fields below will be emptied.",
};

export function Wizard() {
  // The whole wizard lives under a `key`. `useWizard` exposes no reset — the
  // reducer's initial state is captured once — so remounting is the only way to
  // start a run over, and `onCancel` is where a real app would navigate away
  // instead.
  const [runId, setRunId] = useState(0);
  const [importStep, setImportStep] = useState("upload");
  const importIndex = IMPORT_STEPS.findIndex((s) => s.key === importStep);

  return (
    <>
      <Note>
        <strong>This wizard writes to the page URL.</strong> `useWizard` mirrors the active step
        to <code className="font-mono">?step=N</code> through{" "}
        <code className="font-mono">useSearchParams</code>, on mount and on every move — so it
        cannot be mounted outside a router (this page supplies a{" "}
        <code className="font-mono">HashRouter</code>), and clicking Next below changes the
        address bar for the whole showcase. It only ever WRITES the param: the hook's own
        comment explains that reading it back would restore a late step index over an EMPTY
        data set, letting Finish submit nothing at all.
      </Note>

      <ToyWizard key={runId} onRestart={() => setRunId((n) => n + 1)} />

      <Note>
        <strong>Skip bypasses validation entirely.</strong> Step 1 is{" "}
        <code className="font-mono">optional</code>, so it offers Skip — and{" "}
        <code className="font-mono">skip()</code> dispatches straight to the next step without
        running a single validator, where <code className="font-mono">goNext()</code> runs all of
        them. An optional step's gate is therefore advisory, and{" "}
        <code className="font-mono">stepStatus</code> reports it as{" "}
        <code className="font-mono">&quot;skipped&quot;</code> rather than{" "}
        <code className="font-mono">&quot;completed&quot;</code>. Both count towards{" "}
        <code className="font-mono">canFinish</code>.
      </Note>

      <Note>
        <strong>
          <code className="font-mono">nextBlocked</code> belongs to the wizard, not to the step
          that set it.
        </strong>{" "}
        Nothing in <code className="font-mono">useWizard</code> clears it on navigation, so a step
        that leaves it set disables Next and Skip on every step after it. The name step above
        therefore returns <code className="font-mono">setNextBlocked(false)</code> from its effect
        cleanup, and a step that sets it and forgets to is a wizard nobody can finish.
      </Note>

      <Example
        label="WizardContextProvider / useWizardContext"
        hint="the contract a step registers through — normally published by StepperNav"
      >
        {/* Mounted by hand here, which is the only way to SEE what the context
            carries: inside a real wizard it comes from <StepperNav>, and
            `useWizardContext()` throws "must be used within a <StepperNav>"
            anywhere else. Two members, and both are how a step talks back UP to
            the engine — there is no data in it. */}
        <WizardContextProvider value={PROBE_CONTEXT}>
          <ContextProbe />
        </WizardContextProvider>
      </Example>

      <Example
        label="requiredFieldsValidator"
        hint="folds the hand-written `const errors = {}` block every step used to repeat"
      >
        <OutTable
          rows={[
            [
              'requiredFieldsValidator({ name: "" }, [{ key: "name" }], "Required")',
              show(requiredFieldsValidator({ name: "" }, [{ key: "name" }], "Required")),
            ],
            [
              'requiredFieldsValidator({ name: "   " }, [{ key: "name" }], "Required")',
              show(requiredFieldsValidator({ name: "   " }, [{ key: "name" }], "Required")),
            ],
            [
              'requiredFieldsValidator({ name: "Ada" }, [{ key: "name" }], "Required")',
              show(requiredFieldsValidator({ name: "Ada" }, [{ key: "name" }], "Required")),
            ],
            [
              'requiredFieldsValidator({ qty: 0 }, [{ key: "qty" }], "Required")',
              show(requiredFieldsValidator({ qty: 0 }, [{ key: "qty" }], "Required")),
            ],
            [
              'requiredFieldsValidator({ qty: 0 }, [{ key: "qty", valid: (v) => Number(v) > 0 }], "Must be > 0")',
              show(
                requiredFieldsValidator(
                  { qty: 0 },
                  [{ key: "qty", valid: (v) => Number(v) > 0 }],
                  "Must be > 0",
                ),
              ),
            ],
            [
              'requiredFieldsValidator({ a: "", b: "" }, [{ key: "a", message: "A?" }, { key: "b" }], "Required")',
              show(
                requiredFieldsValidator(
                  { a: "", b: "" },
                  [{ key: "a", message: "A?" }, { key: "b" }],
                  "Required",
                ),
              ),
            ],
          ]}
        />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          Row four is the trap: the default check is a trimmed non-empty string OR{" "}
          <code className="font-mono">value != null</code>, so <code className="font-mono">0</code>{" "}
          and <code className="font-mono">false</code> pass it. Anything numeric needs the{" "}
          <code className="font-mono">valid</code> predicate, which is what it exists for. Note
          also that the helper returns <code className="font-mono">errors</code> even when{" "}
          <code className="font-mono">ok</code> is true — an empty object, not{" "}
          <code className="font-mono">undefined</code>.
        </p>
      </Example>

      <Example
        label="DEFAULT_WIZARD_LABELS"
        hint="every string the chrome shows; `step` is a function, not a template"
      >
        <ConstList
          items={[
            ["cancel", DEFAULT_WIZARD_LABELS.cancel],
            ["back", DEFAULT_WIZARD_LABELS.back],
            ["next", DEFAULT_WIZARD_LABELS.next],
            ["skip", DEFAULT_WIZARD_LABELS.skip],
            ["finish", DEFAULT_WIZARD_LABELS.finish],
            ["submitting", DEFAULT_WIZARD_LABELS.submitting],
            ["steps", DEFAULT_WIZARD_LABELS.steps],
            ["step(2, 3)", DEFAULT_WIZARD_LABELS.step(2, 3)],
            ["cancelTitle", DEFAULT_WIZARD_LABELS.cancelTitle],
            ["confirmCancel", DEFAULT_WIZARD_LABELS.confirmCancel],
            ["cancelConfirmLabel", DEFAULT_WIZARD_LABELS.cancelConfirmLabel],
            ["cancelDismissLabel", DEFAULT_WIZARD_LABELS.cancelDismissLabel],
            ["reviewTitle", DEFAULT_WIZARD_LABELS.reviewTitle],
            ["edit", DEFAULT_WIZARD_LABELS.edit],
          ]}
        />
      </Example>

      <Example label="resolveWizardLabels" hint="what StepperNav and WizardSummary both call on their `labels` prop">
        <OutTable
          rows={[
            ["resolveWizardLabels().next", resolveWizardLabels().next],
            ['resolveWizardLabels({ next: "Weiter" }).next', resolveWizardLabels({ next: "Weiter" }).next],
            [
              // The merge is shallow and total: one override never drops the rest.
              'resolveWizardLabels({ next: "Weiter" }).back',
              resolveWizardLabels({ next: "Weiter" }).back,
            ],
            [
              // Worth knowing before you mutate what you got back: with no argument
              // the function hands out the shared constant itself, not a copy.
              "resolveWizardLabels() === DEFAULT_WIZARD_LABELS",
              String(resolveWizardLabels() === DEFAULT_WIZARD_LABELS),
            ],
            [
              "resolveWizardLabels({}) === DEFAULT_WIZARD_LABELS",
              String(resolveWizardLabels({}) === DEFAULT_WIZARD_LABELS),
            ],
          ]}
        />
      </Example>

      <Example
        label="WizardStepper — the other one"
        hint="components/wizard-stepper: an indicator, nothing else. No engine, no data, no gates."
      >
        <div className="space-y-4">
          <WizardStepper steps={IMPORT_STEPS} current={importStep} ariaLabel="Import steps" />
          <Row>
            <Button
              type="button"
              variant="secondary"
              disabled={importIndex <= 0}
              onClick={() => setImportStep(IMPORT_STEPS[importIndex - 1].key)}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={importIndex >= IMPORT_STEPS.length - 1}
              onClick={() => setImportStep(IMPORT_STEPS[importIndex + 1].key)}
            >
              Next
            </Button>
            <span className="font-mono text-xs text-[var(--text-muted)]">
              current={JSON.stringify(importStep)}
            </span>
          </Row>
        </div>
      </Example>

      <Note>
        <strong>The two are not a pair.</strong>{" "}
        <code className="font-mono">WizardStepper</code> takes{" "}
        <code className="font-mono">{"{ key, label }"}</code> and a{" "}
        <code className="font-mono">current</code> KEY; the engine&apos;s indicator is built into{" "}
        <code className="font-mono">StepperNav</code>, takes{" "}
        <code className="font-mono">WizardStepConfig</code> and is driven by{" "}
        <code className="font-mono">stepStatus</code>. Nothing is shared between them — not a
        type, not a style. A `current` that matches no key is also not an error here: the index
        resolves to -1 and every chip renders as a future step, so a typo reads as &quot;not
        started&quot;.
      </Note>
    </>
  );
}

/* ── the toy wizard ──────────────────────────────────────────────────────── */

function ToyWizard({ onRestart }: { onRestart: () => void }) {
  // The step config is an ARGUMENT to `useWizard`, so a step's `validate` cannot
  // close over `wizard.data` — the wizard does not exist yet on that line. A ref
  // written from an effect is the bridge. (It is a bridge around the declaration
  // order, not around staleness: `useWizard` re-reads `stepsRef.current` on every
  // render, so the closure that runs on click is always the newest one.) The
  // context's `registerStepValidate`, which step 1 uses instead, exists precisely
  // so a step does not need this.
  const dataRef = useRef<Draft>(INITIAL_DRAFT);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Draft | null>(null);
  const [outcome, setOutcome] = useState<"succeed" | "fail">("succeed");

  const steps: WizardStepConfig[] = [
    // No `validate` here: the mounted step registers its own through the context.
    { id: "name", label: "Name", optional: true },
    {
      id: "size",
      label: "Size",
      // A bare boolean, on purpose. It blocks, but it carries no per-field detail,
      // which is the branch that falls through to `missingRequiredMessage` below.
      validate: () => dataRef.current.size !== "",
    },
    { id: "review", label: "Review" },
  ];

  const wizard = useWizard<Draft>({
    steps,
    initialData: INITIAL_DRAFT,
    missingRequiredMessage: "Pick a size before continuing.",
    // Without this the engine dynamically imports `sonner` and toasts — sonner is
    // an optional peer, imported only on this path. Routed into the page instead
    // so the message is legible beside the step that produced it (and so the
    // render test never reaches an import it does not need).
    onValidationFailed: (message) => setBlockMessage(message),
    onCancel: onRestart,
    onComplete: async (data) => {
      if (outcome === "fail") {
        // Whatever `onComplete` rejects with lands in `wizard.error` and is
        // rendered by StepperNav; `isSubmitting` is released either way.
        throw new Error("The pretend server refused this draft.");
      }
      setSubmitted(data);
    },
  });

  useEffect(() => {
    dataRef.current = wizard.data;
  }, [wizard.data]);

  // The generic message is not attached to a field, so it would otherwise linger
  // on a step the reader has already left.
  useEffect(() => setBlockMessage(null), [wizard.currentStepIndex]);

  const summarySections: SummarySection[] = [
    {
      label: "Name",
      stepIndex: 0,
      items: [{ label: "Name", value: wizard.data.name || <Empty /> }],
    },
    {
      label: "Size and note",
      stepIndex: 1,
      items: [
        {
          label: "Size",
          value: SIZE_OPTIONS.find((o) => o.value === wizard.data.size)?.label ?? <Empty />,
        },
        { label: "Note", value: wizard.data.note || <Empty /> },
      ],
    },
  ];

  return (
    <>
      <Example
        label="Three-step wizard"
        hint="useWizard + StepperNav + WizardStep + WizardSummary, with `labels` partially overridden"
      >
        <StepperNav
          wizard={wizard}
          labels={LABELS}
          title="New thing"
          description="A domain-free draft, so what you are watching is the engine."
        >
          {wizard.currentStepIndex === 0 && (
            <NameStep
              value={wizard.data.name}
              error={wizard.fieldErrors.name}
              onChange={(name) => wizard.updateData({ name })}
            />
          )}
          {wizard.currentStepIndex === 1 && (
            <SizeStep
              size={wizard.data.size}
              note={wizard.data.note}
              message={blockMessage}
              onChange={(partial) => {
                setBlockMessage(null);
                wizard.updateData(partial);
              }}
            />
          )}
          {wizard.currentStepIndex === 2 && (
            <WizardStep>
              <WizardSummary
                sections={summarySections}
                onEditStep={wizard.goToStep}
                labels={LABELS}
              />
            </WizardStep>
          )}
        </StepperNav>
      </Example>

      <Example label="Engine state, live" hint="read off the same `wizard` object the chrome above is driven by">
        <OutTable
          rows={[
            ["wizard.currentStep.id", wizard.currentStep.id],
            [
              "wizard.currentStepIndex",
              `${wizard.currentStepIndex} of ${wizard.steps.length - 1}`,
            ],
            ["wizard.isFirstStep / isLastStep", `${wizard.isFirstStep} / ${wizard.isLastStep}`],
            [
              "wizard.steps.map((_, i) => stepStatus(i))",
              wizard.steps.map((_, i) => wizard.stepStatus(i)).join(", "),
            ],
            [
              "wizard.completedSteps",
              wizard.completedSteps.size === 0
                ? "(empty)"
                : [...wizard.completedSteps].join(", "),
            ],
            ["wizard.canFinish", String(wizard.canFinish)],
            ["wizard.nextBlocked", String(wizard.nextBlocked)],
            ["wizard.isSubmitting", String(wizard.isSubmitting)],
            ["wizard.fieldErrors", JSON.stringify(wizard.fieldErrors)],
            ["wizard.error", JSON.stringify(wizard.error)],
            ["wizard.data", JSON.stringify(wizard.data)],
            ["onComplete received", submitted ? JSON.stringify(submitted) : "(not submitted)"],
          ]}
        />
        <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
          <p className="text-xs text-[var(--text-secondary)]">
            What Finish should do — the failing branch rejects, which is how{" "}
            <code className="font-mono">wizard.error</code> and the alert inside{" "}
            <code className="font-mono">StepperNav</code> get populated.
          </p>
          <Row>
            <ToggleGroup<"succeed" | "fail">
              value={outcome}
              onChange={setOutcome}
              ariaLabel="Submit outcome"
              className="w-auto"
              options={[
                { value: "succeed", label: "onComplete resolves" },
                { value: "fail", label: "onComplete rejects" },
              ]}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!wizard.error}
              onClick={wizard.clearError}
            >
              clearError()
            </Button>
            <Button type="button" variant="ghost" onClick={onRestart}>
              Start over
            </Button>
          </Row>
        </div>
      </Example>
    </>
  );
}

/** Step 1. The one that consumes the wizard context — it registers its validator
 *  and drives the hard Next gate without ever being handed the `wizard` object. */
function NameStep({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const { registerStepValidate, setNextBlocked } = useWizardContext();
  const tooLong = value.length > 24;

  // Re-registers whenever `value` changes, which is what keeps the closure fresh;
  // the effect's cleanup IS the unregister function the call returns, so only the
  // mounted step's validator is ever in the engine's map.
  useEffect(
    () =>
      registerStepValidate(() =>
        requiredFieldsValidator(
          { name: value },
          [{ key: "name", message: "A name is required." }],
          "Required",
        ),
      ),
    [registerStepValidate, value],
  );

  // The other gate: this one greys Next out instead of failing on click, for a
  // rule the user can see the violation of. Cleared on unmount because
  // `nextBlocked` outlives the step — see the note under the wizard.
  useEffect(() => {
    setNextBlocked(tooLong);
    return () => setNextBlocked(false);
  }, [tooLong, setNextBlocked]);

  return (
    <WizardStep>
      <div className="space-y-1.5">
        <Input
          label="Name"
          value={value}
          invalid={Boolean(error) || tooLong}
          onChange={(e) => onChange(e.target.value)}
        />
        {/* `fieldErrors` is populated by the LAST failed goNext and cleared for any
            key `updateData` touches, so this message disappears as you type. */}
        {error && <p className="text-xs text-[var(--text-secondary)]">{error}</p>}
        <p className="text-xs text-[var(--text-muted)]">
          {value.length}/24 — over that, Next and Skip go dead via{" "}
          <code className="font-mono">setNextBlocked</code> rather than failing on click.
        </p>
      </div>
    </WizardStep>
  );
}

/** Step 2. Gated by the step config's own `validate`, which returns a bare
 *  boolean — so the engine has no field to attach a message to and falls back to
 *  `missingRequiredMessage`. */
function SizeStep({
  size,
  note,
  message,
  onChange,
}: {
  size: Draft["size"];
  note: string;
  message: string | null;
  onChange: (partial: Partial<Draft>) => void;
}) {
  return (
    <WizardStep>
      <div className="space-y-2">
        <p className="text-sm text-[var(--text-secondary)]">Pick a size.</p>
        {/* `""` is not one of the options, which is how "nothing picked yet"
            renders: the group shows with no segment pressed. */}
        <ToggleGroup<Draft["size"]>
          value={size}
          onChange={(value) => onChange({ size: value })}
          options={SIZE_OPTIONS}
          ariaLabel="Size"
        />
      </div>
      <Textarea
        label="Note (not gated)"
        rows={3}
        value={note}
        onChange={(e) => onChange({ note: e.target.value })}
      />
      {message && <AlertBanner tone="warning">{message}</AlertBanner>}
    </WizardStep>
  );
}

/* ── references ──────────────────────────────────────────────────────────── */

const IMPORT_STEPS = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map columns" },
  { key: "confirm", label: "Confirm" },
];

/** Stand-in value so the provider can be shown on its own. Both members are
 *  no-ops: there is no engine under this one, which is the point. */
const PROBE_CONTEXT: WizardContextValue = {
  registerStepValidate: () => () => {},
  setNextBlocked: () => {},
};

function ContextProbe() {
  const ctx = useWizardContext();
  return (
    <OutTable
      rows={[
        ["Object.keys(useWizardContext())", Object.keys(ctx).join(", ")],
        ["typeof ctx.registerStepValidate", typeof ctx.registerStepValidate],
        ["ctx.registerStepValidate(fn)", `returns ${typeof ctx.registerStepValidate(() => true)} (the unregister)`],
        ["typeof ctx.setNextBlocked", typeof ctx.setNextBlocked],
        ["outside a provider", "throws: useWizardContext must be used within a <StepperNav>"],
      ]}
    />
  );
}

function Empty() {
  return <span className="text-[var(--text-muted)]">—</span>;
}

/** The helper's return type is `boolean | { ok, errors? }`; print whichever came
 *  back rather than assuming the object form. */
function show(result: ValidateResult): string {
  return JSON.stringify(result);
}
