import { useState } from "react";
import { Button, Checkbox, FieldHint, Input, NumberInput, Slider, Switch } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

/**
 * CHOICES — checkbox, switch and slider.
 *
 * All three are native inputs underneath (`type="checkbox"`, the same with
 * `role="switch"`, `type="range"`), restyled with the kit's tokens. Every specimen
 * is live and every flag on it is derived from state rather than hardcoded, so the
 * prop is visible doing its job instead of as a still.
 */

const ROWS = ["Groceries", "Rent", "Transport"] as const;

/** The measured speeds a gear set was swept at — the stops SpeedSlider marks. */
const MEASURED = [20, 50, 80, 110];

const oneDecimal = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

export function Choices() {
  const [stop, setStop] = useState(true);
  const [picked, setPicked] = useState<string[]>(["Rent"]);
  const [isDefault, setIsDefault] = useState(false);
  const [terms, setTerms] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [mirror, setMirror] = useState(true);

  const [email, setEmail] = useState(true);
  const [browser, setBrowser] = useState(false);
  const [compact, setCompact] = useState(false);
  const [rowActive, setRowActive] = useState(true);
  const [consent, setConsent] = useState(false);
  const [threshold, setThreshold] = useState(40);
  const [released, setReleased] = useState(40);
  const [opacity, setOpacity] = useState(70);

  const [speed, setSpeed] = useState(50);
  const [volume, setVolume] = useState(40);
  const [gain, setGain] = useState(12.5);
  const [gainText, setGainText] = useState("12.5");
  const [integral, setIntegral] = useState(0);
  const [zoom, setZoom] = useState(1);

  const allPicked = picked.length === ROWS.length;
  const somePicked = picked.length > 0 && !allPicked;
  const toggleRow = (row: string, on: boolean) =>
    setPicked((prev) => (on ? [...prev, row] : prev.filter((r) => r !== row)));

  const speedReading = MEASURED.includes(speed) ? "measured" : "interpolated";

  return (
    <>
      <Example
        label="Checkbox — states"
        hint="the header box goes mixed while some rows are picked"
      >
        <Stage>
          <div className="space-y-2">
            <Checkbox
              label="All categories"
              checked={allPicked}
              indeterminate={somePicked}
              onCheckedChange={(on) => setPicked(on ? [...ROWS] : [])}
            />
            <div className="space-y-2 ps-6">
              {ROWS.map((row) => (
                <Checkbox
                  key={row}
                  label={row}
                  checked={picked.includes(row)}
                  onCheckedChange={(on) => toggleRow(row, on)}
                />
              ))}
            </div>
          </div>
          <div data-stage="wide" className="flex flex-wrap items-center justify-center gap-3">
            <Checkbox
              label="Stop processing further rules"
              checked={stop}
              onCheckedChange={setStop}
            />
            <Checkbox label="Disabled" disabled />
            <Checkbox label="Disabled, checked" disabled checked readOnly />
            <Checkbox label="Disabled, mixed" disabled indeterminate readOnly />
            {/* `invalid` alone: painted and announced, with the message living
                elsewhere (a summary at the top of a form). */}
            <Checkbox label="Invalid, no message" invalid />
            <Checkbox aria-label="Bare box, named by aria-label" defaultChecked />
          </div>
        </Stage>
      </Example>

      <Example
        label="Checkbox — description, required and error"
        hint="the description and the error are aria-describedby; the required star is not part of the name"
      >
        <Stage>
          <div className="space-y-4">
            <Checkbox
              label="Default account"
              description="Used for new transactions when no account is chosen."
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            {/* `required`: the kit's star after the label (hidden from the name — the
                control itself announces "required"), and the native attribute, so a
                <form> refuses to submit it unticked. The label has no literal "*". */}
            <Checkbox
              required
              label="I accept the terms"
              checked={terms}
              onCheckedChange={setTerms}
              error={triedSubmit && !terms ? "Accept the terms to continue." : undefined}
            />
            <Button variant="secondary" onClick={() => setTriedSubmit(true)}>
              Submit
            </Button>
          </div>
        </Stage>
      </Example>

      <Example
        label="Checkbox — on a field's baseline"
        hint={<code className="font-mono">className=&quot;self-end pb-2&quot;</code>}
      >
        {/* Lenkbank's CheckboxField shape: a bare box has no floating label, so in a
            grid of fields it has to drop to the bottom of its cell to sit on the row. */}
        <Stage>
          <div data-stage="wide" className="mx-auto grid max-w-2xl grid-cols-2 gap-3">
            <Input label="Steps" defaultValue="12" />
            <Checkbox
              className="self-end pb-2"
              label="Mirror the steps"
              checked={mirror}
              onCheckedChange={setMirror}
            />
          </div>
        </Stage>
      </Example>

      <Example
        label="Switch — settings list"
        hint="the switch at the far end; takes effect when flipped"
      >
        <Stage>
          <div data-stage="wide" className="divide-y divide-[var(--border)]">
            <Switch
              className="py-3"
              label="Email notifications"
              description="A summary of the week, every Monday."
              checked={email}
              onCheckedChange={setEmail}
            />
            <Switch
              className="py-3"
              label="Browser notifications"
              description="Needs the browser's permission the first time."
              checked={browser}
              onCheckedChange={setBrowser}
            />
            <Switch className="py-3" label="Unavailable on this plan" disabled />
            <Switch
              className="py-3"
              label="Included in every plan"
              description="Disabled and on: the state is still shown, only dimmed."
              disabled
              checked
              readOnly
            />
            {/* `required`: the native attribute (a <form> refuses to submit it off,
                a screen reader says "required") plus the kit's aria-hidden star. */}
            <Switch
              className="py-3"
              label="Share usage data with the bank"
              description="Required by the account terms."
              required
              checked={consent}
              onCheckedChange={setConsent}
            />
          </div>
        </Stage>
      </Example>

      <Example label="Switch — sizes and placement">
        <Stage>
          <Switch aria-label="Medium" defaultChecked />
          <Switch aria-label="Small" size="sm" defaultChecked />
          <Switch
            label="Compact rows"
            switchPosition="start"
            checked={compact}
            onCheckedChange={setCompact}
          />
          <Switch label="Small, before the words" size="sm" switchPosition="start" defaultChecked />
          <div
            data-stage="wide"
            className="flex items-center justify-center gap-3 text-sm text-[var(--text-primary)]"
          >
            <span>Row in a table:</span>
            <Switch
              size="sm"
              aria-label="Active"
              checked={rowActive}
              onCheckedChange={setRowActive}
            />
            <span className="text-[var(--text-muted)]">{rowActive ? "Active" : "Inactive"}</span>
          </div>
        </Stage>
      </Example>

      <Example
        label="Slider — linear, with marks"
        hint="the measured speeds are the labelled ticks"
      >
        <Stage>
          <div className="space-y-6">
            <Slider
              label="Vehicle speed"
              readout={`${speed} km/h · ${speedReading}`}
              value={speed}
              min={0}
              max={130}
              step={1}
              formatValue={(v) =>
                `${v} km/h, ${MEASURED.includes(v) ? "measured" : "interpolated"}`
              }
              marks={MEASURED.map((v) => ({ value: v, label: `${v}` }))}
              onChange={setSpeed}
            />
            <Slider
              label="Volume"
              hint={<FieldHint label="Unlabelled ticks every 25%." />}
              readout={`${volume}%`}
              value={volume}
              min={0}
              max={100}
              step={5}
              marks={[0, 25, 50, 75, 100]}
              onChange={setVolume}
            />
            <Slider label="Disabled" value={60} min={0} max={100} disabled onChange={() => {}} />
          </div>
        </Stage>
      </Example>

      <Example
        label="Slider — unlabelled, and commit on release"
        hint="aria-label instead of label; onPointerUp passes through to the <input>"
      >
        <Stage>
          <div className="space-y-2">
            {/* No `label`: the slider needs an `aria-label`, and `formatValue` is what
                a screen reader says for the value. */}
            <Slider
              aria-label="Layer opacity"
              value={opacity}
              min={0}
              max={100}
              formatValue={(v) => `${v} percent`}
              onChange={setOpacity}
            />
            <p className="text-xs text-[var(--text-muted)]">opacity: {opacity}%</p>
          </div>
          <div className="space-y-2">
            {/* `onChange` fires on every movement; a request that should run once per
                drag hangs off `onPointerUp` (and `onKeyUp` for the keyboard). */}
            <Slider
              label="Budget alert threshold"
              readout={`${threshold}%`}
              value={threshold}
              min={0}
              max={100}
              step={5}
              onChange={setThreshold}
              onPointerUp={() => setReleased(threshold)}
              onKeyUp={() => setReleased(threshold)}
            />
            <p className="text-xs text-[var(--text-muted)]">
              live: {threshold}% · last released: {released}%
            </p>
          </div>
        </Stage>
      </Example>

      <Example
        label="Slider — log scale"
        hint="the far-left stop is exactly zero; the next one is min"
      >
        <Stage>
          <div className="space-y-6">
            <Slider
              label="Proportional gain"
              scale="log"
              value={gain}
              min={0.5}
              max={200}
              formatValue={(v) => (v === 0 ? "Off" : oneDecimal.format(v))}
              marks={[
                { value: 1, label: "1" },
                { value: 10, label: "10" },
                { value: 100, label: "100" },
              ]}
              readout={
                // The number is the truth: type 500 and it stays 500, the thumb pins at
                // the end. NumberInput commits on blur/Enter, so the slider does not
                // chase every keystroke of "12.5".
                <NumberInput
                  className="w-24"
                  ariaLabel="Proportional gain value"
                  calculator={false}
                  value={gainText}
                  onChange={setGainText}
                  onCommit={(text) => {
                    const next = Number(text);
                    if (Number.isFinite(next)) setGain(next);
                  }}
                />
              }
              onChange={(v) => {
                setGain(v);
                setGainText(v === 0 ? "0" : oneDecimal.format(v));
              }}
            />
            <Slider
              label="Integral gain"
              scale="log"
              value={integral}
              min={0.01}
              max={10}
              formatValue={(v) => (v === 0 ? "Off" : twoDecimals.format(v))}
              readout={integral === 0 ? "Off" : twoDecimals.format(integral)}
              onChange={setIntegral}
            />
            <Slider
              label="Zoom"
              scale="log"
              zeroStop={false}
              value={zoom}
              min={0.25}
              max={8}
              formatValue={(v) => `${oneDecimal.format(v)}×`}
              readout={`${oneDecimal.format(zoom)}×`}
              marks={[0.25, 0.5, 1, 2, 4, 8].map((v) => ({ value: v, label: `${v}×` }))}
              onChange={setZoom}
            />
          </div>
        </Stage>
        <Note>
          From “Off”, one arrow key lands on the minimum rather than rounding back to zero — try it
          on the integral gain with the keyboard.
        </Note>
      </Example>

      <Example label="Right-to-left" hint={<code className="font-mono">dir=&quot;rtl&quot;</code>}>
        {/* Everything is laid out with logical properties, and the switch thumb and
            the slider fill follow the writing direction. */}
        <div dir="rtl" className="max-w-md space-y-4">
          <Checkbox label="خانة اختيار" description="وصف قصير" defaultChecked />
          <Switch label="مفتاح" defaultChecked />
          <Slider
            label="منزلق"
            value={volume}
            min={0}
            max={100}
            step={5}
            readout={`${volume}%`}
            marks={[0, 50, 100]}
            onChange={setVolume}
          />
        </div>
      </Example>
    </>
  );
}
