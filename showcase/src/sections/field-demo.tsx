import { useState } from "react";
import { Checkbox, Field, Input, Select, Textarea } from "@eifi1/ui-kit";
import type { FieldControlProps } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * Field (0.11): the label-ABOVE field group — label, control, hint, error — with the ids
 * wired: a render-prop child receives `id`, `aria-describedby`, `aria-invalid` and
 * `aria-required` to spread on the control.
 */

const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

/** Prints what the render prop handed the control, so the wiring is visible. */
function Wiring({ ids }: { ids: FieldControlProps }) {
  return (
    <span className="block font-mono text-[10px] text-[var(--text-muted)] [overflow-wrap:anywhere]">
      {JSON.stringify(ids)}
    </span>
  );
}

function RenderProp() {
  const [iban, setIban] = useState("DE89 3704");
  const [country, setCountry] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  const ibanError = touched && !IBAN.test(compact) ? "That is not a complete IBAN." : null;
  const countryError = touched && !country ? "Pick the account's country." : "";
  return (
    <Example
      label="Field — render-prop children with Input, Select and Textarea"
      hint="the label names the control; the control is described by the hint and error on screen"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="IBAN" required hint="22 characters for a German account" error={ibanError}>
          {(ids) => (
            <>
              <Input {...ids} value={iban} onChange={(e) => setIban(e.target.value)} onBlur={() => setTouched(true)} />
              <Wiring ids={ids} />
            </>
          )}
        </Field>
        <Field label="Country" required error={countryError}>
          {(ids) => (
            <>
              <Select {...ids} value={country} onChange={(e) => setCountry(e.target.value)} onBlur={() => setTouched(true)}>
                <option value="">Choose…</option>
                <option value="de">Germany</option>
                <option value="at">Austria</option>
                <option value="ch">Switzerland</option>
              </Select>
              <Wiring ids={ids} />
            </>
          )}
        </Field>
        <Field label="Reference" hint="Shown on the recipient's statement." className="md:col-span-2">
          {(ids) => (
            <>
              <Textarea {...ids} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              <Wiring ids={ids} />
            </>
          )}
        </Field>
      </div>
      <Row className="mt-3">
        <button
          type="button"
          className="text-sm text-[var(--brand)] underline"
          onClick={() => setTouched((t) => !t)}
        >
          {touched ? "Hide the errors" : "Show the errors"}
        </button>
      </Row>
      <OutTable
        rows={[
          ["IBAN error", String(ibanError)],
          ["Country error", JSON.stringify(countryError)],
        ]}
      />
      <div className="mt-3">
        <Note>
          Pass a function as <code className="font-mono">children</code> and it receives{" "}
          <code className="font-mono">FieldControlProps</code> — printed under each control — to spread on it. The
          label&apos;s <code className="font-mono">htmlFor</code> is the control&apos;s generated id;{" "}
          <code className="font-mono">aria-describedby</code> lists only the hint and the error that are ON SCREEN (the
          IBAN&apos;s grows by one when its error appears); <code className="font-mono">required</code> draws the star
          and sets <code className="font-mono">aria-required</code>, since the star itself is{" "}
          <code className="font-mono">aria-hidden</code>. <code className="font-mono">error</code> is a plain value:{" "}
          <code className="font-mono">null</code>, <code className="font-mono">false</code> and{" "}
          <code className="font-mono">&quot;&quot;</code> are no error (the Country passes an empty string while
          untouched). The error is not <code className="font-mono">role=&quot;alert&quot;</code>: it is read when
          focus reaches the control. The kit&apos;s own <code className="font-mono">Input</code> with no{" "}
          <code className="font-mono">label</code> is the unlabelled field, so it takes the label from here.
        </Note>
      </div>
    </Example>
  );
}

function PlainChildren() {
  const [agree, setAgree] = useState(false);
  const [dense, setDense] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [speed, setSpeed] = useState(50);
  return (
    <Example
      label="Field — plain children with htmlFor, labelSize and disabled"
      hint="for a control that wires itself: a range input, a native control, a group"
    >
      <Row className="mb-3">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={dense} onChange={(e) => setDense(e.target.checked)} />
          <code className="font-mono">labelSize=&quot;sm&quot;</code>
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
          <code className="font-mono">disabled</code>
        </label>
      </Row>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Playback speed"
          htmlFor="field-demo-speed"
          hint={`${speed}% of normal`}
          labelSize={dense ? "sm" : "md"}
          disabled={disabled}
        >
          <input
            id="field-demo-speed"
            type="range"
            min={25}
            max={200}
            step={25}
            value={speed}
            disabled={disabled}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full accent-[var(--brand)]"
          />
        </Field>
        <Field
          hint="We only email you about your own account."
          error={!agree ? "Required to continue." : undefined}
          labelSize={dense ? "sm" : "md"}
        >
          <Checkbox label="Email me about sign-ins" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        </Field>
      </div>
      <OutTable
        rows={[
          ["speed", `${speed}%`],
          ["agree", String(agree)],
        ]}
      />
      <div className="mt-3">
        <Note>
          Plain children render as they are. The first passes its range input&apos;s own id as{" "}
          <code className="font-mono">htmlFor</code>, so clicking &ldquo;Playback speed&rdquo; focuses the slider;{" "}
          <code className="font-mono">disabled</code> dims the label with its control, and{" "}
          <code className="font-mono">labelSize</code> is <code className="font-mono">sm</code> for a dense row,{" "}
          <code className="font-mono">md</code> otherwise. The second has NO <code className="font-mono">label</code> —
          the checkbox carries its own — and still shows its hint and error. With plain children the hint and error are
          on screen but describe nothing: wire the control yourself, or use the render prop.
        </Note>
      </div>
    </Example>
  );
}

export function FieldDemo() {
  return (
    <>
      <RenderProp />
      <PlainChildren />
    </>
  );
}
