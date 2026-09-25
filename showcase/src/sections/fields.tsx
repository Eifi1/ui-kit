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
  const [inlineClassQuery, setInlineClassQuery] = useState("");
  const [rtlQuery, setRtlQuery] = useState("بحث");
  const [iban, setIban] = useState("DE89 3704 0044");
  const [statesAccount, setStatesAccount] = useState("");
  const [statesReason, setStatesReason] = useState("");
  const [staticRef, setStaticRef] = useState("INV-2026-0142");
  const [period, setPeriod] = useState("q3");
  const [listPick, setListPick] = useState("eur");

  // Ids are ours to mint here because these specimens assemble FloatingField by
  // hand; the Input/Select/Textarea wrappers generate their own.
  const referenceId = useId();
  const displayId = useId();
  const handRolledId = useId();
  const handRolledPickId = useId();
  const staticId = useId();
  const ibanHintId = useId();

  // The display treatment is not a style you choose, it is a style the VIEWPORT
  // chooses — so the specimen says out loud whether it is switched on right now.
  const isPhone = useMediaQuery(PHONE_QUERY, false);

  const emailInvalid = email.trim() !== "" && !email.includes("@");
  const reasonInvalid = reason.length > 80;
  const ibanDigits = iban.replace(/\s/g, "");
  const ibanError =
    ibanDigits.length === 22 ? undefined : `That IBAN has ${ibanDigits.length} characters, not 22.`;

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
        hint="type=password gets an eye toggle — a real tab stop with aria-pressed, named by passwordLabels"
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
          {/* The toggle is the one string Input renders on its own behalf, so it is the
              one `passwordLabels` translates — it is the eye's accessible name. */}
          <Input
            className="w-56"
            label="Kennwort"
            type="password"
            passwordLabels={{ show: "Kennwort anzeigen", hide: "Kennwort verbergen" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            className="w-56"
            label="Disabled — no reveal either"
            type="password"
            disabled
            readOnly
            value="hunter2"
          />
        </Stage>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          The third field passes{" "}
          <code className="font-mono">
            passwordLabels={"{{"} show, hide {"}}"}
          </code>{" "}
          — without it the names come from <code className="font-mono">&lt;UiKitProvider labels&gt;</code>
          , then English. A disabled field disables its toggle too: a value the user may not edit
          is not one the keyboard may reveal.
        </p>
      </Example>

      <Example
        label="Input, Select, Textarea — states"
        hint="default · disabled · readOnly · invalid · error — one row per control"
      >
        <Stage>
          <div data-stage="wide" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Input label="Default" defaultValue="Amelia" />
              <Input label="Disabled" disabled readOnly value="Amelia" />
              <Input label="Read-only" readOnly value="Amelia" />
              <Input label="Invalid" invalid defaultValue="Amelia" />
              <Input
                label="IBAN"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                error={ibanError}
                aria-describedby={ibanHintId}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Select label="Default" defaultValue="b">
                <option value="b">Business</option>
                <option value="p">Personal</option>
              </Select>
              <Select label="Disabled" disabled defaultValue="b">
                <option value="b">Business</option>
              </Select>
              {/* A caller's own aria-invalid — what a form library's control slot sets —
                  paints as well as announces, the same as `invalid`. */}
              <Select label="aria-invalid" aria-invalid defaultValue="">
                <option value="">Choose…</option>
                <option value="b">Business</option>
              </Select>
              <Select label="Invalid" invalid defaultValue="">
                <option value="">Choose…</option>
                <option value="b">Business</option>
              </Select>
              <Select
                label="Account"
                value={statesAccount}
                onChange={(e) => setStatesAccount(e.target.value)}
                error={statesAccount === "" ? "Choose the account to settle from." : undefined}
              >
                <option value="">Choose…</option>
                <option value="current">Current — 2051</option>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Textarea rows={2} label="Default" defaultValue="Treasury" />
              <Textarea rows={2} label="Disabled" disabled defaultValue="Treasury" />
              <Textarea rows={2} label="Read-only" readOnly defaultValue="Treasury" />
              <Textarea rows={2} label="Invalid" invalid defaultValue="Treasury" />
              <Textarea
                rows={2}
                label="Reason"
                value={statesReason}
                onChange={(e) => setStatesReason(e.target.value)}
                error={statesReason.trim() === "" ? "Say why the entry is returned." : undefined}
              />
            </div>
            <p id={ibanHintId} className="text-xs text-[var(--text-muted)]">
              IBAN hint: 22 characters for a German account — this line is the IBAN field&apos;s
              own <code className="font-mono">aria-describedby</code>.
            </p>
          </div>
        </Stage>
        <p className="text-xs text-[var(--text-muted)]">
          The last column passes <code className="font-mono">error</code>: the message renders under
          the field, implies <code className="font-mono">invalid</code>, and is attached through{" "}
          <code className="font-mono">aria-describedby</code> — MERGED with one the caller passed
          (the IBAN field keeps pointing at its hint line and adds the error after it). Type a valid
          IBAN, pick an account or give a reason and the message goes; a falsy{" "}
          <code className="font-mono">error</code> (<code className="font-mono">undefined</code>,{" "}
          <code className="font-mono">&quot;&quot;</code>, <code className="font-mono">false</code>)
          renders nothing and leaves the DOM exactly as without the prop.
        </p>
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
        label="Select — size, and selectClassName"
        hint='size="sm" is the 28px toolbar select; a NUMBER is still the native list-box rows'
      >
        <Stage>
          <div className="flex items-center gap-2">
            <Select
              size="sm"
              aria-label="Period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="q3">Q3 2026</option>
              <option value="q2">Q2 2026</option>
            </Select>
            <span className="text-xs text-[var(--text-muted)]">size=&quot;sm&quot; · {period}</span>
          </div>
          {/* `selectClassName` reaches the <select>; `className` (the width here) stays
              on the wrapper the chevron is positioned against. */}
          <Select
            label="Fee currency (monospace)"
            selectClassName="font-mono tabular-nums"
            value={handRolledPick}
            onChange={(e) => setHandRolledPick(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            size={4}
            aria-label="Currency list box"
            value={listPick}
            onChange={(e) => setListPick(e.target.value)}
          >
            <option value="eur">EUR — Euro</option>
            <option value="gbp">GBP — Pound sterling</option>
            <option value="usd">USD — US dollar</option>
            <option value="chf">CHF — Swiss franc</option>
            <option value="jpy">JPY — Yen</option>
          </Select>
        </Stage>
        <p className="text-xs text-[var(--text-muted)]">
          <code className="font-mono">size=&quot;sm&quot;</code> is honoured by unlabelled selects
          only — a floating label needs the tall box to float in, so a labelled Select ignores it.{" "}
          <code className="font-mono">size={"{4}"}</code> passes straight through as the HTML
          attribute (the rows of a list box; picked: <code className="font-mono">{listPick}</code>).
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
            {/* `aria-label` shortens what a screen reader hears without shortening
                what the bubble shows — by default the bubble text IS the name. */}
            <Select
              className="w-64"
              label="Booking date basis"
              hint={
                <FieldHint
                  label="Value date is when the money moves; booking date is when the bank records it. Statements sort by booking date."
                  aria-label="About the date basis"
                />
              }
              defaultValue="value"
            >
              <option value="value">Value date</option>
              <option value="booking">Booking date</option>
            </Select>
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

            {/* FloatingField with `staticLabel`: the label is always floated, for a
                control that always has a value. `srOnlyLabel` is shown in the display
                specimen above, `hint` in the FieldHint one. */}
            <FloatingField className="w-56" htmlFor={staticId} label="Invoice number" staticLabel>
              <input
                id={staticId}
                className={cn(FIELD_BASE, FIELD_FLOATING_PAD)}
                value={staticRef}
                onChange={(e) => setStaticRef(e.target.value)}
              />
            </FloatingField>

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
              aria-label="Filter entries"
              clearLabel="Clear filter"
            />
            <SearchField
              value={plainQuery}
              onChange={setPlainQuery}
              aria-label="Filter entries (no clear)"
              placeholder="No clearLabel, no ×"
            />
            {/* `inputClassName` reaches the <input>; `className` only the wrapper the
                icon and the × are positioned against. */}
            <SearchField
              value={inlineClassQuery}
              onChange={setInlineClassQuery}
              aria-label="Filter by reference"
              placeholder="Reference (monospace)"
              clearLabel="Clear reference"
              inputClassName="font-mono"
            />
            <SearchField
              value=""
              onChange={() => {}}
              aria-label="Filter (disabled)"
              clearLabel="Clear filter"
              disabled
            />
            {/* The deprecated spelling still works, and names the field only when
                `aria-label` is absent. */}
            <SearchField
              value={plainQuery}
              onChange={setPlainQuery}
              label="Deprecated label= spelling"
            />
            <div dir="rtl">
              <SearchField
                value={rtlQuery}
                onChange={setRtlQuery}
                aria-label="تصفية القيود"
                clearLabel="مسح"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Current value: <code className="font-mono">{JSON.stringify(query)}</code>
            </p>
          </div>
        </Stage>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          A name is required — <code className="font-mono">aria-label</code>, or the deprecated{" "}
          <code className="font-mono">label</code> — and the placeholder falls back to it, never the
          other way round — a placeholder vanishes the moment someone types, so a field named only
          by one is unnamed exactly when a screen-reader user is working in it. Omitting{" "}
          <code className="font-mono">clearLabel</code> removes the clear button entirely, and the
          right padding with it; that is a decision, not a default. Chrome paints its own native
          cross on <code className="font-mono">type=&quot;search&quot;</code>, so the kit suppresses
          it and keeps the named one that also returns focus to the input. The last field sits in{" "}
          <code className="font-mono">dir=&quot;rtl&quot;</code>: the icon and the clear button are
          placed with logical sides, so they swap ends with the writing direction.
        </p>
      </Example>

      <Note>
        <strong>`invalid` paints and announces; `error` also explains.</strong>{" "}
        <code className="font-mono">invalid</code> sets{" "}
        <code className="font-mono">aria-invalid</code> on the control and applies{" "}
        <code className="font-mono">FIELD_INVALID</code> — the two were fused into one prop because
        writing the attribute by hand announced the problem and painted nothing. A caller&apos;s own{" "}
        <code className="font-mono">aria-invalid</code> (what a form library sets) now paints too,
        on all three. <code className="font-mono">error</code> is the message: rendered under the
        field and wired through <code className="font-mono">aria-describedby</code>, merged with any
        id you pass. Use <code className="font-mono">invalid</code> alone when the message lives
        elsewhere — a summary at the top of a dialog.
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
