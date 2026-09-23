import { useState } from "react";
import { FieldHint, NumberField, TimeInput, UiKitProvider } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

/**
 * NumberField and TimeInput.
 *
 * Both are typed values rather than text: a NumberField holds a `number | null`
 * and commits on blur/Enter, a TimeInput holds an `"HH:mm"` string. Each specimen
 * prints the value it holds under it, so what the component EMITS is visible — the
 * point of both controls is the contract, not the look.
 */

/** The raw value under a specimen. */
function StateLine({ children }: { children: string }) {
  return <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">value = {children}</p>;
}

/** NumberField — on the Numbers page, right after the NumberInput it is built on. */
export function NumberFieldDemo() {
  const [wheelbase, setWheelbase] = useState<number | null>(2700);
  const [rate, setRate] = useState<number | null>(19);
  const [yoke, setYoke] = useState<number | null>(null);
  const [german, setGerman] = useState<number | null>(1234.5);
  const [gain, setGain] = useState<number | null>(0.125);

  return (
    <>
      <Note>
        <strong>NumberField</strong> commits on blur or Enter, never per keystroke. Type a
        calculation (<code>2700+50</code>) and it resolves; empty or unparsable text snaps back to
        the last value, unless the field is <code>nullable</code>, where empty commits{" "}
        <code>null</code>.
      </Note>

      <Example label="NumberField — unit as suffix" hint="digits={0}, clamped to 1000–5000">
        <Stage>
          <NumberField
            label="Wheelbase"
            unit="mm"
            digits={0}
            min={1000}
            max={5000}
            value={wheelbase}
            onCommit={setWheelbase}
          />
        </Stage>
        <StateLine>{String(wheelbase)}</StateLine>
      </Example>

      <Example
        label="NumberField — unit in the label"
        hint='unitPlacement="label", a row of narrow fields'
      >
        <Stage>
          <NumberField
            className="w-36"
            label="Gain"
            unit="Nm/°"
            unitPlacement="label"
            digits={3}
            value={gain}
            hint={<FieldHint label="Static gain of the plant." />}
            onCommit={setGain}
          />
          <NumberField
            className="w-36"
            label="VAT"
            unit="%"
            unitPlacement="label"
            digits={1}
            min={0}
            max={100}
            calculator={false}
            value={rate}
            onCommit={setRate}
          />
        </Stage>
        <StateLine>{`gain ${String(gain)}, vat ${String(rate)}`}</StateLine>
      </Example>

      <Example label="NumberField — nullable" hint="empty is an answer: null">
        <Stage>
          <NumberField
            label="Input yoke Y"
            unit="mm"
            nullable
            value={yoke}
            onCommit={setYoke}
            error={yoke !== null && yoke < 0 ? "Must not be negative" : undefined}
          />
        </Stage>
        <StateLine>{String(yoke)}</StateLine>
      </Example>

      <Example
        label="NumberField — German decimal comma"
        hint='locale from <UiKitProvider locale="de-DE">'
      >
        <UiKitProvider locale="de-DE">
          <div className="max-w-xs">
            <NumberField label="Betrag" unit="€" digits={2} value={german} onCommit={setGerman} />
          </div>
        </UiKitProvider>
        <StateLine>{String(german)}</StateLine>
      </Example>
    </>
  );
}

/** TimeInput — on the Dates page, beside the other pickers of a point in time. */
export function TimeInputDemo() {
  const [meeting, setMeeting] = useState("18:30");
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [lap, setLap] = useState("00:01:30");
  const [office, setOffice] = useState("07:30");

  return (
    <>
      <Note>
        <strong>TimeInput</strong> is the browser&apos;s own time control: 12- or 24-hour display
        follows the viewer&apos;s system settings, phones get their native wheel, and a click
        anywhere in the field opens the picker. The value is always <code>HH:mm</code> — or{" "}
        <code>HH:mm:ss</code> when <code>step</code> is not a whole minute.
      </Note>

      <Example label="TimeInput — labelled" hint="floating label, like Input">
        <Stage>
          <TimeInput label="Meeting time" value={meeting} onValueChange={setMeeting} />
        </Stage>
        <StateLine>{JSON.stringify(meeting)}</StateLine>
      </Example>

      <Example label="TimeInput — compact pair" hint="unlabelled; className sizes the input">
        <Stage>
          <div className="flex items-center gap-1.5">
            <label htmlFor="demo-quiet-start" className="text-xs text-[var(--text-muted)]">
              From
            </label>
            <TimeInput
              id="demo-quiet-start"
              className="w-auto px-2 py-1"
              value={quietStart}
              onValueChange={setQuietStart}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="demo-quiet-end" className="text-xs text-[var(--text-muted)]">
              to
            </label>
            <TimeInput
              id="demo-quiet-end"
              className="w-auto px-2 py-1"
              value={quietEnd}
              onValueChange={setQuietEnd}
            />
          </div>
        </Stage>
        <StateLine>{`${JSON.stringify(quietStart)} – ${JSON.stringify(quietEnd)}`}</StateLine>
      </Example>

      <Example
        label="TimeInput — bounds and seconds"
        hint="min/max paint out-of-range; step={1} adds seconds"
      >
        <Stage>
          <div className="w-48">
            <TimeInput
              label="Office opens"
              min="08:00"
              max="18:00"
              value={office}
              onValueChange={setOffice}
              error={office !== "" && office < "08:00" ? "Before 08:00" : undefined}
            />
          </div>
          <div className="w-48">
            <TimeInput label="Lap" step={1} value={lap} onValueChange={setLap} />
          </div>
        </Stage>
        <StateLine>{`${JSON.stringify(office)}, ${JSON.stringify(lap)}`}</StateLine>
      </Example>
    </>
  );
}
