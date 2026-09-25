import { useState } from "react";
import {
  AmountInput,
  Button,
  CalculatorButton,
  CURRENCIES,
  CurrencyFlag,
  CurrencySelect,
  FieldHint,
  NumberInput,
  NumberPadSheet,
  PHONE_QUERY,
  commitExpression,
  evaluateExpression,
  formatResult,
  getCurrency,
  isBareAmount,
  looksLikeExpression,
  sanitizeLive,
  splitLeadingSign,
  useMediaQuery,
} from "@eifi1/ui-kit";
import { NumberFieldDemo } from "./number-time-demo";
import { Example, Note, OutTable, Row, Swatch, Stage } from "../lib/section";

/**
 * NUMBERS & MONEY.
 *
 * Every control in this section is a string-in/string-out field over one shared
 * arithmetic engine (`lib/calc`): the text you type is kept alive keystroke by
 * keystroke (`sanitizeLive`) and resolved to a number only on blur or Enter
 * (`commitExpression`). The last two examples put that engine on the page, because
 * "12.50+3.20" turning into 15.7 in a money field is only reassuring once you can
 * see what the evaluator does with the input it rejects.
 */

const TONES = ["neutral", "outflow", "inflow"] as const;
type Tone = (typeof TONES)[number];

// The prop is read as a sentence — "tint the figure by what it will DO" — so the
// specimen is labelled with the literal prop rather than with a prettier word.
const TONE_LABEL: Record<Tone, string> = {
  neutral: 'tone="neutral"',
  outflow: 'tone="outflow"',
  inflow: 'tone="inflow"',
};

// Four of the entries CURRENCIES ships, chosen for the spread: a flag that is not a
// country at all (`eu`), the plain case, a glyph two currencies share (¥ is JPY and
// CNY both, so `code` and never `symbol` is the identity) and a right-to-left one.
const SAMPLE_CODES = ["EUR", "USD", "JPY", "AED"];
const SAMPLES = CURRENCIES.filter((c) => SAMPLE_CODES.includes(c.code));

/** What a helper actually returned, quoted the way the source would write it, so
 *  `null`, `""` and the four-character string "null" stay distinguishable. */
function show(v: string | number | boolean | null): string {
  if (v === null) return "null";
  return typeof v === "string" ? JSON.stringify(v) : String(v);
}

/** The state the page is holding for a specimen. Every control here is controlled,
 *  and for the money field the interesting part is what is NOT in the text — the
 *  sign lives in a boolean beside it — so a reader has to be able to see both. */
function State({ rows }: { rows: Array<[label: string, value: string]> }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-2">
          <dt className="text-[var(--text-muted)]">{label}</dt>
          <dd className="font-mono text-[var(--text-primary)]">{value === "" ? '""' : value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Numbers() {
  // NumberInput
  const [target, setTarget] = useState("200+50");
  const [committed, setCommitted] = useState("");
  const [rate, setRate] = useState("3.9");
  const [weight, setWeight] = useState("");
  const [units, setUnits] = useState("");
  const [inline, setInline] = useState("18");
  const [noCalc, setNoCalc] = useState("18");
  const [goal, setGoal] = useState("5000");
  const [bare, setBare] = useState("7");
  const [mono, setMono] = useState("1042.5");

  // Translated strings
  const [deAmount, setDeAmount] = useState("12.50");
  const [deCurrency, setDeCurrency] = useState("CHF");
  const [dePick, setDePick] = useState("CHF");
  const [deCalc, setDeCalc] = useState("18");
  const [deCalcButton, setDeCalcButton] = useState("7");
  const [unlabelledAmount, setUnlabelledAmount] = useState("");

  // CalculatorButton, standing on its own
  const [calcValue, setCalcValue] = useState("42");
  const [calcExpr, setCalcExpr] = useState("");

  // AmountInput
  const [amount, setAmount] = useState("49.90");
  const [currency, setCurrency] = useState("EUR");
  const [direction, setDirection] = useState<"outflow" | "inflow">("outflow");
  const [toneValues, setToneValues] = useState<Record<Tone, string>>({
    neutral: "1200",
    outflow: "49.90",
    inflow: "2500",
  });
  const [locked, setLocked] = useState("250");
  const [missing, setMissing] = useState("");
  const [fee, setFee] = useState("12.40");
  const [headline, setHeadline] = useState("1250");
  const [centred, setCentred] = useState("1250");
  const [rtlAmount, setRtlAmount] = useState("49.90");
  const [rtlCurrency, setRtlCurrency] = useState("EUR");
  const [rtlUnits, setRtlUnits] = useState("12");

  // CurrencySelect
  const [pickerCode, setPickerCode] = useState("EUR");
  const [budgetCode, setBudgetCode] = useState("CHF");
  const [requiredCode, setRequiredCode] = useState("");

  // NumberPadSheet, mounted by hand — see the example's note.
  const [padOpen, setPadOpen] = useState(false);
  const [padValue, setPadValue] = useState("12.50+3.20");
  const [dePadOpen, setDePadOpen] = useState(false);

  // The same query the kit gates its phone shapes on, read here only to TELL the
  // reader which half of the page they are looking at. Nothing below branches on it.
  const isPhone = useMediaQuery(PHONE_QUERY, false);

  const outflow = direction === "outflow";
  const selected = getCurrency(pickerCode);

  return (
    <>
      <Note>
        Several affordances in this section are phone-only, gated on{" "}
        <code className="font-mono">PHONE_QUERY</code> (
        <code className="font-mono">max-width: 767px</code>): the <strong>number pad sheet</strong>{" "}
        that replaces the OS keyboard, and <code className="font-mono">variant="display"</code> on
        both fields. Above that width they are deliberately inert — the desktop calculator popover
        appears instead, and the display variant renders as an ordinary bordered field. Narrow the
        window below 768px (or use the device toolbar) before concluding a control is broken. You
        are currently <strong>{isPhone ? "below" : "at or above"}</strong> the breakpoint, so the
        phone shapes are <strong>{isPhone ? "active" : "inactive"}</strong>.
      </Note>

      <Example
        label="NumberInput — the string contract"
        hint="type 200+50, then press Enter or click away"
      >
        <Stage>
          <div className="space-y-3">
            {/* `onChange` fires per keystroke with the raw text (operators kept, so a
                half-typed sum survives); `onCommit` fires on blur/Enter with the
                EVALUATED text. A save-on-blur field wires the save to onCommit, which
                is why it can never be handed "200+50". */}
            <NumberInput
              label="Budget target"
              value={target}
              onChange={setTarget}
              onCommit={setCommitted}
              placeholder="0"
            />
            <State
              rows={[
                ["value", target],
                ["last onCommit", committed || "—"],
              ]}
            />
          </div>
        </Stage>
      </Example>

      <Example
        label="NumberInput — suffix, hint and invalid"
        hint="suffix is aria-hidden: the unit belongs to the field, so the label has to name it too"
      >
        <Stage>
          {/* The hint sits on the LABEL's line rather than at the field's right
              edge, because that edge is where the calculator lives — the two
              collided when it was placed there. */}
          <NumberInput
            className="w-56"
            label="Interest rate"
            value={rate}
            onChange={setRate}
            suffix="%"
            hint={
              <FieldHint label="Nominal annual rate. The unit is a property of the field, never part of the value." />
            }
          />
          <NumberInput
            className="w-56"
            label="Weight"
            value={weight}
            onChange={setWeight}
            suffix="kg"
          />
          <NumberInput
            className="w-56"
            label="Units (required)"
            value={units}
            onChange={setUnits}
            invalid={units.trim() === ""}
          />
        </Stage>
      </Example>

      <Example
        label="NumberInput — the calculator affordance"
        hint="the trailing trigger is hidden below 768px and when disabled; typing arithmetic still works everywhere"
      >
        <Stage>
          <NumberInput
            className="w-56"
            label="With calculator"
            value={inline}
            onChange={setInline}
          />
          {/* `calculator={false}` is for close-on-blur inline editors: clicking the
              icon blurs the field, which tears the editor down before the popover
              can open. Typed arithmetic is unaffected. */}
          <NumberInput
            className="w-56"
            label="calculator={false}"
            value={noCalc}
            onChange={setNoCalc}
            calculator={false}
          />
          <NumberInput
            className="w-56"
            label="Disabled"
            value="1000"
            onChange={() => {}}
            disabled
          />
        </Stage>
      </Example>

      <Example
        label='NumberInput — variant="display", unlabelled and inputClassName'
        hint={`display is phone-only: ${isPhone ? "active at this width" : "inactive at this width — narrow below 768px"}`}
      >
        <Stage>
          {/* The goal-target shape: one number a dialog is about, at display size
              with the chrome dropped — below PHONE_QUERY only. */}
          <NumberInput
            label="Savings goal"
            value={goal}
            onChange={setGoal}
            variant="display"
            suffix="€"
          />
          {/* No label: `ariaLabel` names it, for a table cell or an inline editor. */}
          <NumberInput
            ariaLabel="Quantity"
            value={bare}
            onChange={setBare}
            calculator={false}
          />
          <NumberInput
            label="Amount (tabular, end-aligned)"
            inputClassName="text-right font-mono tabular-nums"
            value={mono}
            onChange={setMono}
          />
        </Stage>
        <State
          rows={[
            ["goal", goal],
            ["quantity", bare],
            ["amount", mono],
          ]}
        />
      </Example>

      <Example
        label="CalculatorButton"
        hint="normally an absolutely-positioned adornment inside a field; standalone here so both onChange arguments are visible"
      >
        <Stage>
          <div className="space-y-3">
            <div className="relative inline-flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-3 py-2">
              <span className="font-mono text-sm text-[var(--text-primary)]">
                {calcValue || "—"}
              </span>
              {/* The second argument is the EXPRESSION the result came out of. A host
                  that keeps the sign outside the text (AmountInput's `negative`) needs
                  it to tell "-42+50" resolving to 8 from a freshly typed 8. */}
              <CalculatorButton
                value={calcValue}
                onChange={(next, expression) => {
                  setCalcValue(next);
                  setCalcExpr(expression ?? "");
                }}
              />
            </div>
            <State
              rows={[
                ["value", calcValue],
                ["expression", calcExpr || "—"],
              ]}
            />
          </div>
        </Stage>
      </Example>

      <Note>
        Both floating surfaces in this section — the calculator popover above and the currency list
        below — are painted with the palette tokens like the fields they open from; switch the
        palette in the top bar with one open and it re-skins with the page.
      </Note>

      <NumberFieldDemo />

      <Example
        label="AmountInput — the whole money field"
        hint="type a leading − to move the toggle; the sign is rendered, never stored"
      >
        <Stage>
          <div className="space-y-3">
            <Row>
              <Button
                type="button"
                variant={outflow ? "primary" : "secondary"}
                aria-pressed={outflow}
                onClick={() => setDirection("outflow")}
              >
                Outflow
              </Button>
              <Button
                type="button"
                variant={outflow ? "secondary" : "primary"}
                aria-pressed={!outflow}
                onClick={() => setDirection("inflow")}
              >
                Inflow
              </Button>
            </Row>
            {/* `negative` is a DISPLAYED prefix over a magnitude: the minus is glued on
                at render and split off again before anything is reported back, so the
                caller can never double-apply it and a select-all-retype keeps the
                direction. `onNegativeChange` is what arms that behaviour — pass neither
                prop (a starting balance, a loan payment) and the text owns its own sign. */}
            <AmountInput
              label="Amount"
              value={amount}
              onChange={setAmount}
              currency={currency}
              onCurrencyChange={setCurrency}
              tone={outflow ? "outflow" : "inflow"}
              negative={outflow}
              onNegativeChange={(negative) => setDirection(negative ? "outflow" : "inflow")}
            />
            <State
              rows={[
                ["value (magnitude)", amount],
                ["negative", String(outflow)],
                ["currency", currency],
              ]}
            />
          </div>
        </Stage>
      </Example>

      <Example
        label="AmountInput — every tone"
        hint="colour is the main indication of direction, and never the only one: the toggle above is what it mirrors"
      >
        <Stage>
          <div className="space-y-4">
            <Row className="items-start">
              {TONES.map((tone) => (
                <div key={tone} className="w-48">
                  <AmountInput
                    label={TONE_LABEL[tone]}
                    value={toneValues[tone]}
                    onChange={(next) => setToneValues((s) => ({ ...s, [tone]: next }))}
                    tone={tone}
                    currency="EUR"
                  />
                </div>
              ))}
            </Row>
            {/* The tints are the app's ONE money palette, not a bespoke rose/emerald
                pairing — a figure being typed has to wear the colour the same figure
                will wear once it is a row in the table behind the form. */}
            <Row>
              <Swatch name="--money-expense (outflow)" value="var(--money-expense)" />
              <Swatch name="--money-income (inflow)" value="var(--money-income)" />
            </Row>
          </div>
        </Stage>
      </Example>

      <Example
        label="AmountInput — disabled, invalid, and a read-only currency"
        hint="a currency without onCurrencyChange is a plain aria-hidden chip, not a picker"
      >
        <Stage>
          <div className="w-48">
            <AmountInput
              label="Locked"
              value={locked}
              onChange={setLocked}
              currency="EUR"
              disabled
            />
          </div>
          <div className="w-48">
            <AmountInput
              label="Required"
              value={missing}
              onChange={setMissing}
              currency="EUR"
              onCurrencyChange={() => {}}
              invalid={missing.trim() === ""}
            />
          </div>
          <div className="w-48">
            <AmountInput label="Fee" value={fee} onChange={setFee} currency="GBP" />
          </div>
        </Stage>
      </Example>

      <Example
        label='AmountInput — variant="display" and align'
        hint={`phone-only: ${isPhone ? "active at this width" : "inactive at this width — narrow below 768px"}`}
      >
        <Stage>
          <div data-stage="wide" className="grid gap-4 sm:grid-cols-2">
            {/* Same input, same numpad, same commit contract — only the chrome is
                dropped, and only below PHONE_QUERY. `align="center"` centres in what
                is LEFT of the currency chip, not in the whole box, so the last digits
                never end up behind it. */}
            <AmountInput
              label="Amount (display)"
              value={headline}
              onChange={setHeadline}
              currency="EUR"
              onCurrencyChange={() => {}}
              variant="display"
              tone="inflow"
            />
            <AmountInput
              label="Amount (display, centred)"
              value={centred}
              onChange={setCentred}
              currency="EUR"
              onCurrencyChange={() => {}}
              variant="display"
              align="center"
            />
          </div>
        </Stage>
      </Example>

      <Example
        label="CurrencySelect"
        hint="controlled by ISO code; the trigger stays flag + code so it cannot clip in a narrow field"
      >
        <Stage>
          <div className="space-y-3">
            <Row className="items-start">
              <CurrencySelect
                className="w-48"
                label="Currency"
                value={pickerCode}
                onChange={setPickerCode}
              />
              {/* `options` keeps the caller's order and silently drops codes the kit
                  has no definition for — so an app can offer only the currencies its
                  budget actually holds. */}
              <CurrencySelect
                className="w-48"
                label="Budget currencies"
                value={budgetCode}
                onChange={setBudgetCode}
                options={["CHF", "EUR", "GBP"]}
              />
              <CurrencySelect
                className="w-48"
                label="Required"
                value={requiredCode}
                onChange={setRequiredCode}
                placeholder="Pick one"
                invalid={requiredCode === ""}
              />
            </Row>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>getCurrency(value) →</span>
              {selected ? (
                <>
                  <CurrencyFlag country={selected.country} />
                  <span className="font-mono text-[var(--text-primary)]">
                    {selected.code} · {selected.symbol} · {selected.name}
                  </span>
                </>
              ) : (
                <span className="font-mono text-[var(--text-primary)]">undefined</span>
              )}
            </div>
          </div>
        </Stage>
      </Example>

      <Example
        label="Translated strings — labels and currencyNames"
        hint="one labels object per control; every key is optional and overrides <UiKitProvider labels> for this field only"
      >
        <Stage>
          <div className="space-y-2">
            {/* AmountInput owns the most strings: the currency chip's name, the
                picker's search box, the calculator trigger and its popover, and the
                phone pad. `currencyNames` is data-keyed, so it sits beside labels. */}
            <AmountInput
              label="Betrag"
              value={deAmount}
              onChange={setDeAmount}
              currency={deCurrency}
              onCurrencyChange={setDeCurrency}
              placeholder="0,00"
              labels={{
                currency: "Währung",
                currencySearch: "Währung suchen",
                calculatorTrigger: "Rechner öffnen",
                calculator: { panel: "Rechner", backspace: "Löschen", clear: "Alles löschen", equals: "Ergebnis" },
                pad: { done: "Fertig", pad: "Ziffernblock" },
              }}
              currencyNames={{ CHF: "Schweizer Franken", EUR: "Euro", GBP: "Britisches Pfund" }}
            />
            <State rows={[["value", deAmount], ["currency", deCurrency]]} />
          </div>
          <div className="space-y-2">
            <CurrencySelect
              label="Währung"
              value={dePick}
              onChange={setDePick}
              labels={{ search: "Währung suchen" }}
              currencyNames={{ CHF: "Schweizer Franken", USD: "US-Dollar", JPY: "Japanischer Yen" }}
            />
            <State rows={[["value", dePick]]} />
          </div>
          <div className="space-y-2">
            <NumberInput
              label="Zielbetrag"
              value={deCalc}
              onChange={setDeCalc}
              labels={{
                calculatorTrigger: "Rechner öffnen",
                calculator: { equals: "Ergebnis", clear: "Alles löschen" },
                pad: { done: "Fertig" },
              }}
            />
            <State rows={[["value", deCalc]]} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-[var(--text-primary)]">{deCalcButton}</span>
              <CalculatorButton
                value={deCalcButton}
                onChange={(next) => setDeCalcButton(next)}
                ariaLabel="Rechner"
                labels={{ panel: "Rechner", equals: "Ergebnis", plus: "plus", minus: "minus" }}
              />
            </div>
            {/* No `label` on this one: `ariaLabel` names an amount field that sits in
                a table cell, and `placeholder` is what it shows while empty. */}
            <AmountInput
              ariaLabel="Amount for row 3"
              placeholder="0.00"
              value={unlabelledAmount}
              onChange={setUnlabelledAmount}
              currency="EUR"
            />
          </div>
        </Stage>
        <p className="text-xs text-[var(--text-muted)]">
          Open the currency list on the first two and search &quot;Franken&quot;: the filter matches
          the <em>shown</em>, translated name. The calculator names are screen-reader names — inspect
          the trigger&apos;s <code className="font-mono">aria-label</code>, or open the popover. The
          last field is unlabelled: <code className="font-mono">ariaLabel</code> names it and{" "}
          <code className="font-mono">placeholder</code> fills it while empty.
        </p>
      </Example>

      <Example
        label="NumberInput and AmountInput — right-to-left"
        hint={<code className="font-mono">dir=&quot;rtl&quot;</code>}
      >
        <Stage>
          <div dir="rtl" className="flex flex-wrap items-start gap-4">
            <div className="w-56">
              <AmountInput
                label="المبلغ"
                value={rtlAmount}
                onChange={setRtlAmount}
                currency={rtlCurrency}
                onCurrencyChange={setRtlCurrency}
              />
            </div>
            <NumberInput
              className="w-56"
              label="الكمية"
              value={rtlUnits}
              onChange={setRtlUnits}
              suffix="kg"
            />
          </div>
        </Stage>
        <State rows={[["amount", rtlAmount], ["currency", rtlCurrency], ["units", rtlUnits]]} />
        <p className="text-xs text-[var(--text-muted)]">
          The currency chip, the calculator trigger and the unit suffix are the figure&apos;s
          trailing controls, so they sit at the logical END — the left here — with the padding
          reserved on that side; the currency list opens from the end edge too. The figures
          themselves and the calculator stay left-to-right (<code className="font-mono">dir=&quot;ltr&quot;</code>{" "}
          on its display and on the phone number pad&apos;s): arithmetic reads the same way in
          every script.
        </p>
      </Example>

      <Example
        label="NumberPadSheet"
        hint="mounted directly here; in a field it opens by FOCUS, below 768px only"
      >
        <Stage>
          <div className="space-y-3">
            <Note>
              In an app this sheet is never rendered by hand: focusing a{" "}
              <code className="font-mono">NumberInput</code> or{" "}
              <code className="font-mono">AmountInput</code> below{" "}
              <code className="font-mono">PHONE_QUERY</code> opens it, with the field's
              <code className="font-mono"> inputMode="none"</code> suppressing the OS keyboard in
              its place. The button below mounts it explicitly so a desktop reader can see it at
              all. It portals to <code className="font-mono">document.body</code> and is fixed to
              the bottom of the viewport, so look down there rather than inside this card — and note
              that it deliberately does NOT lock the page behind it: it is a keyboard, not a dialog,
              and you have to be able to scroll to the figure it is covering.
            </Note>
            <Row>
              <Button type="button" variant="primary" onClick={() => setPadOpen(true)}>
                Open the number pad
              </Button>
              <Button type="button" variant="secondary" onClick={() => setDePadOpen(true)}>
                Open it with labels (German)
              </Button>
              <span className="font-mono text-sm text-[var(--text-primary)]">
                {padValue || "0"}
              </span>
            </Row>
            {/* Stateless by design — the host's text is the single source of truth, and
                "Done" in a real field simply blurs the input, whose existing blur
                handler commits and unmounts the sheet. Every string it shows is
                overridable through `labels`, `done` included. */}
            {padOpen && (
              <NumberPadSheet
                value={padValue}
                onChange={setPadValue}
                onDone={() => setPadOpen(false)}
                label="Receipt total"
              />
            )}
            {/* `labels`: `done` is the primary key's visible text, the rest are the
                screen-reader names of the pad and its non-digit keys. */}
            {dePadOpen && (
              <NumberPadSheet
                value={padValue}
                onChange={setPadValue}
                onDone={() => setDePadOpen(false)}
                label="Belegsumme"
                labels={{
                  done: "Fertig",
                  pad: "Ziffernblock",
                  backspace: "Zeichen löschen",
                  clear: "Alles löschen",
                  equals: "Ergebnis",
                  plus: "plus",
                  minus: "minus",
                  times: "mal",
                  divide: "geteilt durch",
                  decimal: "Komma",
                }}
              />
            )}
          </div>
        </Stage>
      </Example>
    </>
  );
}

/**
 * The currency table and `lib/calc`, input → output — on the API group's Helpers page,
 * because they are what the numeric fields are BUILT on rather than fields themselves.
 */
export function NumberHelpers() {
  return (
    <>
      <Example
        label="CURRENCIES, CurrencyFlag and getCurrency"
        hint="the flags need flag-icons' stylesheet — the kit depends on it but imports it nowhere, so every consumer imports it itself"
      >
        <Stage>
          <div className="space-y-4">
            <Row>
              {SAMPLES.map((c) => (
                <span key={c.code} className="flex items-center gap-2 text-xs">
                  <CurrencyFlag country={c.country} />
                  <span className="font-mono font-medium text-[var(--text-primary)]">{c.code}</span>
                  <span className="font-mono text-[var(--text-muted)]">{c.symbol}</span>
                  <span className="text-[var(--text-secondary)]">{c.name}</span>
                </span>
              ))}
            </Row>
            <OutTable
              rows={[
                ["CURRENCIES.length", String(CURRENCIES.length)],
                // Case-insensitive on the way in, canonical on the way out: a code
                // arriving from a URL or an import does not have to be normalised first.
                ['getCurrency("eur")?.name', show(getCurrency("eur")?.name ?? null)],
                ['getCurrency("XXX")', getCurrency("XXX") === undefined ? "undefined" : "?"],
                ["getCurrency(null)", getCurrency(null) === undefined ? "undefined" : "?"],
              ]}
            />
          </div>
        </Stage>
      </Example>
      <Example
        label="lib/calc — the evaluator"
        hint="a hand-rolled tokeniser and recursive-descent parser over a closed grammar; never eval/Function"
      >
        {/* Every right-hand cell is the real function called at render, so this table
            cannot drift from the engine the fields above are using. */}
        <OutTable
          rows={[
            ['evaluateExpression("12.50+3.20")', show(evaluateExpression("12.50+3.20"))],
            ['evaluateExpression("2+3*4")', show(evaluateExpression("2+3*4"))],
            ['evaluateExpression("(2+3)*4")', show(evaluateExpression("(2+3)*4"))],
            // The keypad inserts × ÷ − and a German keyboard types a comma; both are
            // normalised here rather than at each call site.
            ['evaluateExpression("84÷2")', show(evaluateExpression("84÷2"))],
            ['evaluateExpression("1,5+1,5")', show(evaluateExpression("1,5+1,5"))],
            ['evaluateExpression("-42−−50")', show(evaluateExpression("-42−−50"))],
            // null, not a wrong number: a half-typed sum must leave the field alone.
            ['evaluateExpression("12+")', show(evaluateExpression("12+"))],
            // Division by zero is invalid rather than Infinity, which would reach a
            // money field as a value it cannot render.
            ['evaluateExpression("1/0")', show(evaluateExpression("1/0"))],
            ['evaluateExpression("process.exit(1)")', show(evaluateExpression("process.exit(1)"))],
            ['looksLikeExpression("-5")', show(looksLikeExpression("-5"))],
            ['looksLikeExpression("12+5")', show(looksLikeExpression("12+5"))],
            ['looksLikeExpression("-42−−50")', show(looksLikeExpression("-42−−50"))],
          ]}
        />
      </Example>

      <Example
        label="lib/calc — the field's own transforms"
        hint="formatResult stays in the grammar its own consumers can read back: no exponent notation, ever"
      >
        <OutTable
          rows={[
            ["formatResult(0.1 + 0.2)", show(formatResult(0.1 + 0.2))],
            ["formatResult(100 / 3)", show(formatResult(100 / 3))],
            // The U-2 finding: toString switches to exponent notation below 1e-6, and
            // neither the tokeniser nor sanitizeLive accepts an "e" — so "1e-7" used
            // to be recommitted as 17, silently, in a money field.
            ["formatResult(1e-7)", show(formatResult(1e-7))],
            ["commitExpression(formatResult(1e-7))", show(commitExpression(formatResult(1e-7)))],
            ['commitExpression("12.50+3.20")', show(commitExpression("12.50+3.20"))],
            ['commitExpression("12+")', show(commitExpression("12+"))],
            // Cut at the second dot, not joined: with no keystroke to ignore, the
            // shorter reading cannot invent a bigger number.
            ['commitExpression("1.2.3")', show(commitExpression("1.2.3"))],
            // Per OPERAND, not per string — "1.5+2.5" is a legitimate calculation.
            ['sanitizeLive("1.5+2.5")', show(sanitizeLive("1.5+2.5"))],
            ['sanitizeLive("1.234,56")', show(sanitizeLive("1.234,56"))],
            ['sanitizeLive("12a+5b")', show(sanitizeLive("12a+5b"))],
            ['isBareAmount("42.")', show(isBareAmount("42."))],
            ['isBareAmount("-42")', show(isBareAmount("-42"))],
            ['splitLeadingSign("-42")', JSON.stringify(splitLeadingSign("-42"))],
            // Arithmetic after the minus IS arithmetic: "-12+5" is -7, not -(12+5).
            ['splitLeadingSign("-12+5")', JSON.stringify(splitLeadingSign("-12+5"))],
          ]}
        />
      </Example>
    </>
  );
}
