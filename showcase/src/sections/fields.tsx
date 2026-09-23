import { useId, useState } from "react";
import {
  cn,
  FieldChevron,
  FieldHint,
  FieldLabel,
  FloatingField,
  Input,
  SearchField,
  Select,
  Textarea,
  useMediaQuery,
  FIELD_BASE,
  FIELD_DISPLAY,
  FIELD_FLOATING_PAD,
  FIELD_INVALID,
  FIELD_TRIGGER,
  FIELD_WRITABLE_LOOK,
  FLOATING_INPUT_CLASS,
  FLOATING_LABEL_CLASS,
  FLOATING_LABEL_STATIC,
  PHONE_QUERY,
} from "@eifi1/ui-kit";
import { ConstList, Example, Note, Row, Stage } from "../lib/section";

/** The three the trigger specimen cycles through — a stand-in for a real menu, so
 *  the trigger is something you can actually operate rather than a still. */
const CURRENCIES = ["EUR", "GBP", "USD"] as const;

/** Not state: the field it sits in is `readOnly`, and a setter nothing can call
 *  would only suggest otherwise. */
const TWO_FACTOR_CODE = "8392 1174";

export function Fields() {
  // Every `invalid` below is DERIVED from the value rather than hardcoded, because
  // a permanently-rose field shows you the colour and nothing about the prop. Type
  // into these and the ring arrives and leaves.
  const [text, setText] = useState("");
  const [holder, setHolder] = useState("Amelia Fournier");
  const [email, setEmail] = useState("amelia.example.org");
  const [password, setPassword] = useState("correct horse");
  const [pin, setPin] = useState("");
  const [due, setDue] = useState("2026-10-01");
  const [amount, setAmount] = useState("1042.50");
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState("transfer");
  const [account, setAccount] = useState("");
  const [accountType, setAccountType] = useState("business");
  const [currency, setCurrency] = useState("EUR");
  const [notes, setNotes] = useState("");
  const [bio, setBio] = useState("Treasury, since 2019.");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [handRolled, setHandRolled] = useState("");
  const [handRolledPick, setHandRolledPick] = useState("EUR");
  const [triggerIdx, setTriggerIdx] = useState(0);
  const [query, setQuery] = useState("transfer");
  const [plainQuery, setPlainQuery] = useState("");

  // Ids are ours to mint here because these specimens assemble FloatingField by
  // hand; the Input/Select/Textarea wrappers generate their own.
  const referenceId = useId();
  const displayId = useId();
  const handRolledId = useId();
  const handRolledPickId = useId();

  // The display treatment is not a style you choose, it is a style the VIEWPORT
  // chooses — so the specimen says out loud whether it is switched on right now.
  const isPhone = useMediaQuery(PHONE_QUERY, false);

  const emailInvalid = email.trim() !== "" && !email.includes("@");
  const reasonInvalid = reason.length > 80;

  return (
    <>
      <Example
        label="Input — unlabelled and labelled"
        hint="the label is not a sibling <label> but a float inside the field's top strip"
      >
        <Row>
          <Input
            className="w-56"
            placeholder="Payee reference"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Input
            className="w-56"
            label="Account holder"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
          />
          {/* Both flags on purpose: `disabled` is the specimen, `readOnly` is what
              keeps React from warning about a value with no onChange. */}
          <Input className="w-56" label="Closed on" disabled readOnly value="12 March 2024" />
        </Row>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Clear the second field and click away: the label drops back to the centre. The float is
          driven by <code className="font-mono">:placeholder-shown</code>, which is why a labelled
          Input forces its placeholder to a single space — pass your own and it is ignored.
        </p>
      </Example>

      <Example label="Input — invalid" hint="type something without an @ to raise the ring">
        <Stage>
          <Input
            className="w-56"
            label="Email"
            type="email"
            invalid={emailInvalid}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            className="w-56"
            placeholder="Email (unlabelled)"
            type="email"
            invalid={emailInvalid}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Stage>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          The highlight is a border <em>plus</em> a 1px ring, not a thicker border. A ring is a
          box-shadow, so it adds no layout and nothing beside the field moves when the value arrives
          — and at 125% display scaling the two together guarantee one fully covered device pixel on
          the vertical edges, which a lone 1px border does not.
        </p>
      </Example>

      <Example
        label="Input — password reveal"
        hint="type=password gets an eye toggle; it is tabIndex={-1} so it never sits between two fields in the tab order"
      >
        <Stage>
          <Input
            className="w-56"
            label="Passphrase"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            className="w-56"
            type="password"
            placeholder="PIN (unlabelled)"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </Stage>
      </Example>

      <Example
        label='Input — variant="display"'
        hint={`applies only below 768px; PHONE_QUERY matches right now: ${String(isPhone)}`}
      >
        <Stage>
          <div className="space-y-4">
            <Input
              label="Subject"
              variant="display"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            {/* The same treatment assembled by hand, so it is visible on a desktop
                too: FIELD_DISPLAY plus the size/weight the control adds on top, with
                the label kept in the accessibility tree by `srOnlyLabel`. This is
                character-for-character what the Input above becomes under 768px. */}
            <FloatingField htmlFor={displayId} label="Subject" srOnlyLabel>
              <input
                id={displayId}
                className={cn(FIELD_DISPLAY, "text-xl font-semibold leading-snug")}
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </FloatingField>
          </div>
        </Stage>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Narrow the window past 768px and the first field becomes the second. The chrome goes so
          the one field a form is about reads as the thing itself; a hairline baseline stays, and
          the label goes <code className="font-mono">sr-only</code> rather than away — display type
          is legible to the eye, not to a screen reader.
        </p>
      </Example>

      <Example
        label="Input — read-only, and the opt-out"
        hint="FIELD_WRITABLE_LOOK cancels the grey for a field that is readOnly for some other reason"
      >
        <Stage>
          <Input className="w-56" label="IBAN" readOnly value="DE02 1203 0000 0000 2020 51" />
          <Input
            className="w-56"
            label="Two-factor code"
            readOnly
            inputClassName={FIELD_WRITABLE_LOOK}
            value={TWO_FACTOR_CODE}
          />
        </Stage>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          The grey is matched on the <code className="font-mono">[readonly]</code> ATTRIBUTE, never
          the <code className="font-mono">:read-only</code> pseudo-class — per Selectors 4 that
          pseudo-class matches everything that is not <code className="font-mono">:read-write</code>
          , so it also caught every <code className="font-mono">&lt;select&gt;</code> and every
          field-styled button and painted three different-looking families out of one field style.
        </p>
      </Example>

      <Example
        label="Input — native picker types and inputClassName"
        hint="date/time/month/week open their picker on a click anywhere in the field, not just the trailing glyph"
      >
        <Stage>
          <Input
            className="w-56"
            label="Value date"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <Input
            className="w-56"
            label="Amount"
            inputMode="decimal"
            inputClassName="tabular-nums text-right"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Stage>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          <code className="font-mono">className</code> and{" "}
          <code className="font-mono">inputClassName</code> are not interchangeable: once a{" "}
          <code className="font-mono">label</code> turns an Input into a FloatingField,{" "}
          <code className="font-mono">className</code> styles the WRAPPER, and{" "}
          <code className="font-mono">inputClassName</code> is the only way to reach the{" "}
          <code className="font-mono">&lt;input&gt;</code> itself.
        </p>
      </Example>

      <Example
        label="Select — unlabelled, labelled, invalid, disabled"
        hint="labelled selects always wear the static (already-floated) label, because a select always has a value"
      >
        <Stage>
          <Select
            className="w-56"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label="Entry kind"
          >
            <option value="transfer">Transfer</option>
            <option value="direct-debit">Direct debit</option>
            <option value="standing-order">Standing order</option>
          </Select>
          <Select
            className="w-56"
            label="Settlement account"
            invalid={account === ""}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option value="">Choose…</option>
            <option value="current">Current — 2051</option>
            <option value="savings">Savings — 9930</option>
          </Select>
          {/* `disabled` alone is enough to keep React quiet about a value with no
              onChange — but it is still wired, because the specimen is about what
              the control DROPS when disabled, not about being a still. */}
          <Select
            className="w-56"
            label="Account type"
            disabled
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
          >
            <option value="business">Business</option>
            <option value="personal">Personal</option>
          </Select>
        </Stage>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Pick an account and the rose ring goes. The third select is disabled and has{" "}
          <em>dropped its chevron</em> on purpose: the arrow is the one thing on the control that
          promises a choice, and a read-only account type that still looked like a picker is what
          produced the rule.
        </p>
      </Example>

      <Example
        label="FieldHint — the “?” on the label line"
        hint="a button, not a bare glyph: hover alone puts the explanation out of reach of a keyboard and of every touch device"
      >
        <Stage>
          <div className="space-y-4">
            <Select
              className="w-64"
              label="Settlement currency"
              hint={<FieldHint label="The currency the counterparty is paid in." side="right" />}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {/* An ANIMATED label places the hint differently: it follows the label
                rather than sitting at the far end of the strip, because the controls
                that carry an animated label are the ones with something at the right
                edge of the field (a calculator, a stepper) for it to collide with. */}
            <FloatingField
              className="w-64"
              htmlFor={referenceId}
              label="Payment reference"
              hint={<FieldHint label="Shown on the counterparty's statement." side="right" />}
            >
              <input
                id={referenceId}
                className={FLOATING_INPUT_CLASS}
                placeholder=" "
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </FloatingField>
            <div>
              <p className="mb-2 text-xs text-[var(--text-muted)]">
                All four sides — hover or tab to each. The bubble is portalled, so it measures
                itself and turns round when the chosen side would not fit.
              </p>
              <Row>
                {(["left", "right", "top", "bottom"] as const).map((side) => (
                  <span key={side} className="inline-flex items-center gap-1.5">
                    <FieldHint label={`side="${side}"`} side={side} />
                    <code className="font-mono text-xs text-[var(--text-secondary)]">{side}</code>
                  </span>
                ))}
              </Row>
            </div>
          </div>
        </Stage>
      </Example>

      <Example label="Textarea" hint="type past 80 characters in the third to raise the ring">
        <Stage>
          <div data-stage="wide" className="grid gap-4 sm:grid-cols-2">
            <Textarea
              rows={3}
              placeholder="Internal note (unlabelled)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Textarea rows={3} label="About" value={bio} onChange={(e) => setBio(e.target.value)} />
            <div>
              <Textarea
                rows={3}
                label="Reason for return"
                invalid={reasonInvalid}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">{reason.length} / 80</p>
            </div>
          </div>
        </Stage>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Textarea has no <code className="font-mono">inputClassName</code> escape hatch and no{" "}
          <code className="font-mono">hint</code> slot — on a labelled one,{" "}
          <code className="font-mono">className</code> reaches the wrapper only. Compose with{" "}
          <code className="font-mono">FloatingField</code> directly if you need either.
        </p>
      </Example>

      <Example
        label="FloatingField, FieldLabel, FieldChevron — composing your own"
        hint="everything above is these three plus the class constants; this is what a control the kit does not ship looks like"
      >
        <Stage>
          <Row className="items-start">
            {/* The animated half, assembled from the raw constants. Note the ORDER:
                FLOATING_LABEL_CLASS compiles to `peer-*`, a sibling selector, so the
                label has to come AFTER the input it follows — a label nested in a
                wrapper, or placed before, simply never floats. */}
            <div className="relative w-56">
              <input
                id={handRolledId}
                className={FLOATING_INPUT_CLASS}
                placeholder=" "
                value={handRolled}
                onChange={(e) => setHandRolled(e.target.value)}
              />
              <label htmlFor={handRolledId} className={FLOATING_LABEL_CLASS}>
                Counterparty
              </label>
            </div>

            {/* The static half. FLOATING_LABEL_STATIC on a real <label> because a
                <select> is labelable; FieldLabel next door is the same placement as
                a <span>, for a trigger that is a <button> and therefore is not. */}
            <div className="relative w-56">
              <select
                id={handRolledPickId}
                className={cn(FIELD_BASE, FIELD_FLOATING_PAD, "appearance-none pr-9")}
                value={handRolledPick}
                onChange={(e) => setHandRolledPick(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label htmlFor={handRolledPickId} className={FLOATING_LABEL_STATIC}>
                Fee currency
              </label>
              <FieldChevron />
            </div>

            {/* A dropdown trigger: FIELD_TRIGGER is FIELD_BASE as a flex row, and it
                carries `relative` precisely so FieldChevron can centre on the FIELD
                box. As an ordinary flex child the chevron centres on the CONTENT box
                instead, which FIELD_FLOATING_PAD has already pushed down — that is
                how a labelled picker's chevron ended up sitting lower than the native
                select's beside it. */}
            <div className="relative w-56">
              <FieldLabel>Settlement currency</FieldLabel>
              <button
                type="button"
                onClick={() => setTriggerIdx((i) => (i + 1) % CURRENCIES.length)}
                className={cn(FIELD_TRIGGER, FIELD_FLOATING_PAD, "pr-9")}
              >
                <span className="truncate">{CURRENCIES[triggerIdx]}</span>
                <FieldChevron />
              </button>
            </div>
          </Row>
        </Stage>
      </Example>

      <Example label="SearchField" hint="controlled, and emits a plain string rather than an event">
        <Stage>
          <div className="space-y-4">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Filter entries"
              clearLabel="Clear filter"
            />
            <SearchField
              value={plainQuery}
              onChange={setPlainQuery}
              label="Filter entries (no clear)"
              placeholder="No clearLabel, no ×"
            />
            <p className="text-xs text-[var(--text-muted)]">
              Current value: <code className="font-mono">{JSON.stringify(query)}</code>
            </p>
          </div>
        </Stage>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          <code className="font-mono">label</code> is required and is deliberately not defaulted to
          the placeholder — a placeholder vanishes the moment someone types, so a field named only
          by one is unnamed exactly when a screen-reader user is working in it. Omitting{" "}
          <code className="font-mono">clearLabel</code> removes the clear button entirely, and the
          right padding with it; that is a decision, not a default. Chrome paints its own native
          cross on <code className="font-mono">type=&quot;search&quot;</code>, so the kit suppresses
          it and keeps the named one that also returns focus to the input.
        </p>
      </Example>

      <Note>
        <strong>`invalid` paints and announces, but carries no message.</strong> It sets{" "}
        <code className="font-mono">aria-invalid</code> on the control and applies{" "}
        <code className="font-mono">FIELD_INVALID</code> — the two were fused into one prop because
        writing the attribute by hand announced the problem and painted nothing, and there is no{" "}
        <code className="font-mono">[aria-invalid]</code> rule in this package or in either
        consumer. What it does <em>not</em> do is attach the error text: there is no{" "}
        <code className="font-mono">error</code> / <code className="font-mono">describedBy</code>{" "}
        prop, and nothing wires <code className="font-mono">aria-errormessage</code> or{" "}
        <code className="font-mono">aria-describedby</code> to a message node. If you are coming
        from a form library, this is the piece you have to supply: render your own message, give it
        an id, and pass <code className="font-mono">aria-describedby</code> through — it reaches the
        element via the props spread on Input and Textarea. On a labelled{" "}
        <code className="font-mono">Select</code> it reaches the element too, but note that Select
        overwrites a hand-written <code className="font-mono">aria-invalid</code> after the spread,
        where Input and Textarea OR with it.
      </Note>

      <Note>
        <strong>Fields follow the palette like everything else.</strong> The surface, the text, the
        border, the floating label, the focus ring and the invalid highlight are all tokens (
        <code className="font-mono">--bg-surface</code>,{" "}
        <code className="font-mono">--text-primary</code>,{" "}
        <code className="font-mono">--brand</code>,{" "}
        <code className="font-mono">--danger-border</code>), so switching the palette in the top bar
        re-skins the field interiors with the cards around them. The class constants a custom field
        is composed from are on the Helpers page.
      </Note>
    </>
  );
}

/**
 * The class constants a consumer composes its own field from. Public API with no
 * rendering of its own, so it lives with the other helpers, not among the fields.
 */
export function FieldClassConstants() {
  return (
    <>
      <Example
        label="Exported class constants"
        hint="public API: a consumer composes its own controls from these, so they are shown as their literal values"
      >
        <ConstList
          items={[
            ["FIELD_BASE", FIELD_BASE],
            ["FIELD_WRITABLE_LOOK", FIELD_WRITABLE_LOOK],
            ["FIELD_FLOATING_PAD", FIELD_FLOATING_PAD],
            ["FIELD_INVALID", FIELD_INVALID],
            ["FIELD_DISPLAY", FIELD_DISPLAY],
            ["FIELD_TRIGGER", FIELD_TRIGGER],
            ["FLOATING_INPUT_CLASS", FLOATING_INPUT_CLASS],
            ["FLOATING_LABEL_CLASS", FLOATING_LABEL_CLASS],
            ["FLOATING_LABEL_STATIC", FLOATING_LABEL_STATIC],
            ["PHONE_QUERY", PHONE_QUERY],
          ]}
        />
      </Example>
    </>
  );
}
