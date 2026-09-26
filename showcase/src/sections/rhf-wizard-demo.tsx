import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Button, Field, Input, Select, StepperNav, WizardStep, useWizard } from "@eifi1/ui-kit";
import type { WizardStepConfig } from "@eifi1/ui-kit";
// See forms-rhf.tsx: the showcase alias maps "@eifi1/ui-kit/rhf" to src/rhf.ts.
import { useRhfWizardStep } from "@eifi1/ui-kit/rhf";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * useRhfWizardStep (0.11, `@eifi1/ui-kit/rhf`) — the bridge between a react-hook-form
 * step and the wizard's Next gate. One form spans both steps; each step validates only
 * the fields it shows (`fields`), and the first of those in error takes focus. The
 * fields are `Field`s — label above, hint and error wired — with `register` spread
 * beside the Field's ids, so react-hook-form holds each control's ref.
 */

type Transfer = {
  name: string;
  iban: string;
  amount: string;
  schedule: "" | "now" | "monthly";
};

const DEFAULTS: Transfer = { name: "", iban: "", amount: "", schedule: "" };

/** The id of whatever has focus inside `root` — the "focus on the first error", made visible. */
function useFocusReadout(root: RefObject<HTMLElement | null>) {
  const [focused, setFocused] = useState("—");
  useEffect(() => {
    const onFocus = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !root.current?.contains(el)) return;
      setFocused(el.getAttribute("name") ?? el.getAttribute("aria-label") ?? el.textContent?.trim() ?? el.tagName);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [root]);
  return focused;
}

function PayeeStep({ form, onLog }: { form: UseFormReturn<Transfer>; onLog: (line: string) => void }) {
  useRhfWizardStep(form, { fields: ["name", "iban"], onValid: (v: Transfer) => onLog(`step 1 valid → ${v.name}, ${v.iban}`) });
  const { errors } = form.formState;
  return (
    <WizardStep>
      <div className="grid gap-4">
        <Field label="Payee" required error={errors.name?.message}>
          {(ids) => <Input {...ids} {...form.register("name", { required: "Who is the money for?" })} />}
        </Field>
        <Field label="IBAN" required hint="Two letters, two digits, then up to 30 characters" error={errors.iban?.message}>
          {(ids) => (
            <Input
              {...ids}
              {...form.register("iban", {
                required: "The payee's IBAN is needed.",
                pattern: { value: /^[A-Z]{2}\d{2}[A-Z0-9 ]{11,34}$/i, message: "That is not an IBAN." },
              })}
            />
          )}
        </Field>
      </div>
    </WizardStep>
  );
}

function PaymentStep({ form, onLog }: { form: UseFormReturn<Transfer>; onLog: (line: string) => void }) {
  useRhfWizardStep(form, { fields: ["amount", "schedule"], onValid: () => onLog("step 2 valid") });
  const { errors } = form.formState;
  return (
    <WizardStep>
      <div className="grid gap-4">
        <Field label="Amount (EUR)" required error={errors.amount?.message}>
          {(ids) => (
            <Input
              {...ids}
              inputMode="decimal"
              {...form.register("amount", {
                required: "How much?",
                validate: (v) => Number(v.replace(",", ".")) > 0 || "More than zero, please.",
              })}
            />
          )}
        </Field>
        <Field label="When" required error={errors.schedule?.message}>
          {(ids) => (
            <Select {...ids} {...form.register("schedule", { required: "Now, or every month?" })}>
              <option value="">Choose…</option>
              <option value="now">Once, now</option>
              <option value="monthly">Every month</option>
            </Select>
          )}
        </Field>
      </div>
    </WizardStep>
  );
}

const STEPS: WizardStepConfig[] = [
  { id: "payee", label: "Payee" },
  { id: "payment", label: "Payment", nextLabel: "Send transfer" },
];

function TransferWizard({ onLog, onSent }: { onLog: (line: string) => void; onSent: (v: Transfer) => void }) {
  const form = useForm<Transfer>({ defaultValues: DEFAULTS, mode: "onTouched" });
  const wizard = useWizard<Transfer>({
    steps: STEPS,
    initialData: DEFAULTS,
    urlSync: false,
    cancellable: false,
    onValidationFailed: (message) => onLog(`blocked: ${message}`),
    onComplete: () => onSent(form.getValues()),
  });
  return (
    <StepperNav wizard={wizard} title="New transfer">
      {wizard.currentStepIndex === 0 && <PayeeStep form={form} onLog={onLog} />}
      {wizard.currentStepIndex === 1 && <PaymentStep form={form} onLog={onLog} />}
    </StepperNav>
  );
}

function WizardSteps() {
  const [run, setRun] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [sent, setSent] = useState<Transfer | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const focused = useFocusReadout(ref);
  const add = (line: string) => setLog((l) => [line, ...l].slice(0, 5));
  return (
    <Example
      label="useRhfWizardStep — two steps of one form, fields per step"
      hint="press Next with the fields empty: the step stays, the messages show, the first field in error has focus"
    >
      <div ref={ref}>
        <TransferWizard key={run} onLog={add} onSent={(v) => setSent(v)} />
      </div>
      <Row className="mt-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setRun((n) => n + 1);
            setLog([]);
            setSent(null);
          }}
        >
          Start again
        </Button>
      </Row>
      <OutTable
        rows={[
          ["focus is on (name)", focused],
          ["log, latest first", log.length ? log.join(" · ") : "—"],
          ["sent", sent ? JSON.stringify(sent) : "—"],
        ]}
      />
      <div className="mt-3">
        <Note>
          ONE <code className="font-mono">useForm</code> spans both steps. Each step calls{" "}
          <code className="font-mono">useRhfWizardStep(form, &#123; fields &#125;)</code> — the payee step with{" "}
          <code className="font-mono">[&quot;name&quot;, &quot;iban&quot;]</code>, the payment step with{" "}
          <code className="font-mono">[&quot;amount&quot;, &quot;schedule&quot;]</code> — which registers its validator
          with the <code className="font-mono">StepperNav</code> it is mounted in. Next (and &ldquo;Send
          transfer&rdquo;, the last step&apos;s Finish) runs <code className="font-mono">form.trigger(fields)</code>:
          on failure the step stays, only THAT step&apos;s messages appear (the payment fields are not flagged while
          you are on the payee), the first field in error takes focus — watch the readout — and the wizard says its
          &ldquo;fill in the required fields&rdquo; line (<code className="font-mono">onValidationFailed</code>). On
          success <code className="font-mono">onValid</code> gets <code className="font-mono">form.getValues()</code>{" "}
          and the wizard advances. Focus works because <code className="font-mono">register</code> hands each{" "}
          <code className="font-mono">Input</code> its ref; the <code className="font-mono">Field</code> ids go on
          beside it.
        </Note>
      </div>
    </Example>
  );
}

type Contact = { email: string; phone: string };

function OwnNav() {
  const form = useForm<Contact>({ defaultValues: { email: "", phone: "" } });
  const [result, setResult] = useState("—");
  const [saved, setSaved] = useState<Contact | null>(null);
  // The positional shape — the whole form through handleSubmit — and no StepperNav
  // around it: nothing is registered, so the returned validator is the way in.
  const validate = useRhfWizardStep(form, (values) => setSaved(values));
  const { errors } = form.formState;
  return (
    <Example
      label="useRhfWizardStep — the whole form, and your own nav"
      hint="outside StepperNav the hook registers nothing and returns the validator"
    >
      <div className="grid max-w-md gap-4">
        <Field label="Email" required error={errors.email?.message}>
          {(ids) => (
            <Input
              {...ids}
              type="email"
              {...form.register("email", {
                required: "An email address, please.",
                pattern: { value: /.+@.+\..+/, message: "That address is missing something." },
              })}
            />
          )}
        </Field>
        <Field label="Phone" hint="Optional" error={errors.phone?.message}>
          {(ids) => (
            <Input
              {...ids}
              type="tel"
              {...form.register("phone", {
                pattern: { value: /^[+\d][\d ]{5,}$/, message: "Digits and spaces only." },
              })}
            />
          )}
        </Field>
      </div>
      <Row className="mt-3">
        <Button
          variant="brand"
          onClick={async () => {
            const ok = await validate();
            setResult(String(ok));
          }}
        >
          Continue
        </Button>
      </Row>
      <OutTable
        rows={[
          ["await validate()", result],
          ["onValid received", saved ? JSON.stringify(saved) : "—"],
        ]}
      />
      <div className="mt-3">
        <Note>
          Called as <code className="font-mono">useRhfWizardStep(form, onValid)</code> — the positional shape kastlan
          kept — it validates the WHOLE form through <code className="font-mono">handleSubmit</code>: every rule and a
          resolver run, focus follows the form&apos;s own <code className="font-mono">shouldFocusError</code>, and{" "}
          <code className="font-mono">onValid</code> receives the (transformed) values. There is no{" "}
          <code className="font-mono">StepperNav</code> here, so there is no wizard to register with; the hook returns
          the validator, and this page&apos;s own &ldquo;Continue&rdquo; awaits it.
        </Note>
      </div>
    </Example>
  );
}

export function RhfWizardDemo() {
  return (
    <>
      <WizardSteps />
      <OwnNav />
    </>
  );
}
