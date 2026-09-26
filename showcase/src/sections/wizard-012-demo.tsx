import { useState } from "react";
import {
  AlertBanner,
  Button,
  Input,
  NumberField,
  StepperNav,
  WizardStep,
  useWizard,
  useWizardNextGate,
  useWizardStepValidate,
} from "@eifi1/ui-kit";
import type { WizardStepConfig } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.12 on the Wizard page: `WizardStep`'s own `title` / `description`, and the two
 * gates a step that is NOT a react-hook-form uses — `useWizardNextGate` (Next greyed
 * out before a click) and `useWizardStepValidate` (a validator Next runs).
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

type Share = { name: string; pct: number | null };
type Payee = string;

const STEPS: WizardStepConfig[] = [
  { id: "shares", label: "Shares" },
  { id: "payees", label: "Payees" },
  { id: "done", label: "Review" },
];

function SharesStep({ shares, setShares }: { shares: Share[]; setShares: (s: Share[]) => void }) {
  const sum = shares.reduce((s, x) => s + (x.pct ?? 0), 0);
  // Greys Next and Skip out while the shares do not add up — lifted again on unmount.
  useWizardNextGate(sum !== 100);
  return (
    <WizardStep
      title="Split the tenancy"
      description="Each tenant's share of the rent. Next unlocks when they add up to exactly 100 %."
    >
      <div className="grid gap-3">
        {shares.map((s, i) => (
          <NumberField
            key={s.name}
            label={s.name}
            unit="%"
            digits={0}
            min={0}
            max={100}
            nullable
            value={s.pct}
            onValueChange={(pct) => setShares(shares.map((x, j) => (j === i ? { ...x, pct } : x)))}
            onCommit={(pct) => setShares(shares.map((x, j) => (j === i ? { ...x, pct } : x)))}
          />
        ))}
        <p className={READOUT} aria-live="polite">
          sum: {sum} % · useWizardNextGate({String(sum !== 100)})
        </p>
      </div>
    </WizardStep>
  );
}

function PayeesStep({
  payees,
  setPayees,
  error,
}: {
  payees: Payee[];
  setPayees: (p: Payee[]) => void;
  error: string | undefined;
}) {
  const [draft, setDraft] = useState("");
  // Answers a click on Next: a hand-managed list, not a form.
  useWizardStepValidate(() =>
    payees.length >= 2
      ? { ok: true }
      : { ok: false, errors: { payees: `Add at least two payees (${payees.length} so far).` } },
  );
  return (
    <WizardStep
      title="Who gets paid"
      description="Next is always enabled here; it runs a validator this step registered, and stays put while fewer than two payees are listed."
    >
      <div className="grid gap-3">
        <Row>
          <Input
            aria-label="Payee"
            placeholder="Payee name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!draft.trim()}
            onClick={() => {
              setPayees([...payees, draft.trim()]);
              setDraft("");
            }}
          >
            Add
          </Button>
        </Row>
        <ul className="space-y-1 text-sm text-[var(--text-primary)]">
          {payees.map((p, i) => (
            <li key={`${p}-${i}`} className="flex items-center justify-between gap-2">
              <span className="truncate">{p}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPayees(payees.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </li>
          ))}
          {payees.length === 0 && <li className="text-[var(--text-muted)]">No payees yet.</li>}
        </ul>
        {error && <AlertBanner tone="danger">{error}</AlertBanner>}
      </div>
    </WizardStep>
  );
}

function GatedWizard({ onLog, onRestart }: { onLog: (line: string) => void; onRestart: () => void }) {
  const [shares, setShares] = useState<Share[]>([
    { name: "Ada", pct: 50 },
    { name: "Grace", pct: 30 },
    { name: "Alan", pct: 10 },
  ]);
  const [payees, setPayees] = useState<Payee[]>(["City utilities"]);
  const [finished, setFinished] = useState(false);
  const wizard = useWizard({
    steps: STEPS,
    urlSync: false,
    cancellable: false,
    onValidationFailed: (message) => onLog(`blocked: ${message}`),
    onComplete: () => {
      setFinished(true);
      onLog("finished");
    },
  });
  if (finished) {
    return (
      <Row>
        <span className="text-sm text-[var(--text-primary)]">Tenancy saved.</span>
        <Button type="button" variant="secondary" onClick={onRestart}>
          Start over
        </Button>
      </Row>
    );
  }
  const payeeError = wizard.fieldErrors.payees;
  return (
    <StepperNav wizard={wizard} title="New tenancy">
      {wizard.currentStepIndex === 0 && <SharesStep shares={shares} setShares={setShares} />}
      {wizard.currentStepIndex === 1 && (
        <PayeesStep
          payees={payees}
          setPayees={(p) => {
            setPayees(p);
            wizard.clearFieldErrors();
          }}
          error={typeof payeeError === "string" ? payeeError : undefined}
        />
      )}
      {wizard.currentStepIndex === 2 && (
        <WizardStep title="Review" description="A step with a heading and nothing to gate." headingLevel={3}>
          <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
            {shares.map((s) => (
              <li key={s.name}>
                {s.name}: {s.pct ?? 0} %
              </li>
            ))}
            <li>Payees: {payees.join(", ")}</li>
          </ul>
        </WizardStep>
      )}
    </StepperNav>
  );
}

export function WizardStepHooksDemo() {
  const [run, setRun] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  return (
    <Example
      label="WizardStep title and description, useWizardNextGate and useWizardStepValidate"
      hint="step 1 greys Next out until the shares make 100 %; step 2 lets you click and says no"
    >
      <GatedWizard
        key={run}
        onLog={(line) => setLog((l) => [line, ...l].slice(0, 4))}
        onRestart={() => {
          setRun((n) => n + 1);
          setLog([]);
        }}
      />
      <p className={`mt-3 ${READOUT}`}>log: {log.length ? log.join(" · ") : "—"}</p>
      <div className="mt-3">
        <Note>
          {code("<WizardStep title description>")} draws every step&apos;s heading in one style (an{" "}
          {code("h3")} by default, {code("headingLevel")} to change it). The shares step calls{" "}
          {code("useWizardNextGate(sum !== 100)")}: Next and Skip are disabled before any click, and the
          gate lifts when the step unmounts. The payees step calls {code("useWizardStepValidate")} with an
          inline closure over its list; Next runs it with the step&apos;s other validators, and its{" "}
          {code("errors")} land in {code("wizard.fieldErrors")}, shown here in a banner. This wizard has{" "}
          {code("urlSync: false")}, so it leaves the address bar alone.
        </Note>
      </div>
    </Example>
  );
}
