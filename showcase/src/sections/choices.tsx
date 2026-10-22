import { useState } from "react";
import {
  Button,
  Checkbox,
  FieldHint,
  Input,
  NumberInput,
  Slider,
  Switch,
  IconPicker,
  SwatchPicker,
  WriteLockProvider,
} from "@eifi1/ui-kit";
import { Example, Note, Stage, code } from "../lib/section";
import { CheckboxGroup } from "../../../src/components/checkbox-group";
import { Coffee, Home, ShoppingCart, Star } from "lucide-react";
import { numberFormat } from "../lib/number-format";

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

const oneDecimal = numberFormat("en", { maximumFractionDigits: 1 });
const twoDecimals = numberFormat("en", { maximumFractionDigits: 2 });

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
            {/* A bare box has no visible label by design, so the caption beside it is
                the showcase's, not the checkbox's: without it the box read as an
                orphan left over from the row above. `aria-hidden` — the box already has
                its name from aria-label, and the caption would say it twice. */}
            <div className="flex items-center gap-2">
              <Checkbox aria-label="Bare box, named by aria-label" defaultChecked />
              <span aria-hidden className="text-xs text-muted">
                No visible label — named by <code className="font-mono">aria-label</code>
              </span>
            </div>
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
          <div data-stage="wide" className="divide-y divide-subtle">
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
            className="flex items-center justify-center gap-3 text-sm text-primary"
          >
            <span>Row in a table:</span>
            <Switch
              size="sm"
              aria-label="Active"
              checked={rowActive}
              onCheckedChange={setRowActive}
            />
            <span className="text-muted">{rowActive ? "Active" : "Inactive"}</span>
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
            <p className="text-xs text-muted">opacity: {opacity}%</p>
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
            <p className="text-xs text-muted">
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
                  aria-label="Proportional gain value"
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

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

const LANGUAGES = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "es", label: "Español" },
  { value: "hu", label: "Magyar" },
  { value: "zh", label: "中文", hint: "Legal pages only" },
];

export function CheckboxGroup022Demo() {
  const [locales, setLocales] = useState<string[]>(["de", "fr"]);
  const [layout, setLayout] = useState<string[]>([]);
  return (
    <Example label="CheckboxGroup — a reviewer's languages" hint="Kurvenschmiede's reviewer dialog, for every app">
      <div className="flex flex-col gap-6">
        <CheckboxGroup
          legend="Languages this reviewer may approve"
          options={LANGUAGES}
          value={locales}
          onChange={setLocales}
          columns={2}
          hint="Ticking none takes the reviewer role back."
        />
        <CheckboxGroup
          legend="Show on the card"
          layout="horizontal"
          options={[
            { value: "balance", label: "Balance" },
            { value: "limit", label: "Limit" },
            { value: "iban", label: "IBAN" },
          ]}
          value={layout}
          onChange={setLayout}
          required
          error={layout.length === 0 ? "Pick at least one" : undefined}
        />
      </div>
      <Note>
        A {code("<fieldset>")} named by its {code("legend")} ({code('legendVisibility="sr-only"')} keeps the name
        without the ink), one kit {code("Checkbox")} per option. The value comes back in the options&apos; order, and a
        value no option carries is kept. {code("required")} puts the star on the legend and the native{" "}
        {code("required")} on every box while none is ticked.
      </Note>
      <Note>Since 0.22.</Note>
    </Example>
  );
}

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

const FLAGS = [
  { value: "red", label: "Red", color: "var(--danger)" },
  { value: "amber", label: "Amber", color: "var(--warning)" },
  { value: "green", label: "Green", color: "var(--success)" },
  { value: "blue", label: "Blue", color: "var(--brand)" },
];

const SYMBOLS = [
  { value: "home", label: "Home", icon: Home },
  { value: "cart", label: "Shopping", icon: ShoppingCart, keywords: ["groceries"] },
  { value: "coffee", label: "Coffee", icon: Coffee },
  { value: "star", label: "Favourite", icon: Star },
];

/** SwatchPicker / IconPicker: the strip label (K2) and the lock (K3). */
export function Choices022Demo() {
  const [flag, setFlag] = useState<string | null>("amber");
  const [symbol, setSymbol] = useState<string | null>("cart");
  const [locked, setLocked] = useState(false);
  return (
    <Example label="SwatchPicker and IconPicker with a label" hint="the strip over the tiles; commit under a lock">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
          <Input label="Memo" defaultValue="Coffee beans" />
          <SwatchPicker
            label="Flag"
            hint={<FieldHint label="Your own marker, never shared" />}
            allowNone
            size="sm"
            value={flag}
            onChange={setFlag}
            options={FLAGS}
          />
          <IconPicker label="Symbol" value={symbol} onChange={setSymbol} options={SYMBOLS} size="sm" />
        </div>
        <WriteLockProvider locked={locked} reason="Reconciled rows are final.">
          <div className="flex flex-col gap-2">
            <Switch checked={locked} onCheckedChange={setLocked} label="Lock the flag (commit)" />
            <SwatchPicker aria-label="Flag (locked demo)" commit value={flag} onChange={setFlag} options={FLAGS} />
          </div>
        </WriteLockProvider>
        <Note>
          The label sits on the line of the field labels beside it; the tiles start 20px down, below its whole
          line, because a selected tile&apos;s frame is its border. Locked, the swatches stay reachable — the arrow
          keys still walk them — and the reason shows under the row.
        </Note>
      </div>
      <Note>Since 0.22.</Note>
    </Example>
  );
}
