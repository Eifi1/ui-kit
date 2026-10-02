import { useState } from "react";
import {
  AmountInput,
  CurrencySelect,
  FieldHint,
  MoneyField,
  NumberField,
  NumberInput,
  SignChip,
  ToggleGroup,
  UiKitProvider,
} from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.22 on the Numbers & money page: NumberInput's locale marks and grouping parse
 * (keksdose K5), its money guard (kastlan 5), `calculator={false}` on the money fields
 * (keksdose K6), `error` and `hint` where the field anatomy had gaps (keksdose K4), and
 * the exported sign chip (keksdose K15).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const READOUT = "font-mono text-xs text-[var(--text-secondary)] [overflow-wrap:anywhere]";

const LOCALES = [
  { value: "fr-CH", label: "fr-CH" },
  { value: "de-DE", label: "de-DE" },
  { value: "de-CH", label: "de-CH" },
  { value: "en-US", label: "en-US" },
];

/* ── NumberInput: the locale's mark, and grouping read off ─────────────────── */

function LocaleMarks() {
  const [locale, setLocale] = useState("fr-CH");
  const [quantity, setQuantity] = useState("3.5");
  const [committed, setCommitted] = useState<number | null>(1234.56);
  return (
    <Example
      label="NumberInput and NumberField — the locale's decimal mark, and grouping read off"
      hint="type 1.234,56 in de-DE, or 1,234.56 in en-US"
    >
      <div className="flex flex-col gap-3">
        <ToggleGroup aria-label="Locale" value={locale} onChange={setLocale} options={LOCALES} />
        <UiKitProvider locale={locale}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <NumberInput label="Quantity" suffix="kg" value={quantity} onChange={setQuantity} />
              <p className={READOUT}>value: {JSON.stringify(quantity)}</p>
            </div>
            <div className="min-w-0">
              <NumberField label="Stock" unit="pcs" value={committed} nullable onCommit={setCommitted} />
              <p className={READOUT}>committed: {String(committed)}</p>
            </div>
          </div>
        </UiKitProvider>
        <Note>
          The provider's {code("locale")} (or the field's own) decides the mark the field SHOWS: "3,5" for fr-CH and
          de-DE, "3.5" for de-CH and en-US, as {code("Intl")} has it. What it reports stays dot-decimal, so{" "}
          {code("Number(value)")} keeps working. Typing reads grouping the way {code("AmountInput")} does: both marks
          present, the one that is not the locale's is grouping; a lone "." in thousands shape is grouping in a comma
          locale; a lone "," stays a decimal in a dot locale. Before 0.22 NumberInput showed "3.5" everywhere and read
          "1.234,56" as 1.23456. While you type, the field keeps your own text (the caret never jumps); it is re-spelt
          without grouping when it settles.
        </Note>
      </div>
    </Example>
  );
}

/* ── Money: AmountInput / MoneyField, not NumberInput ─────────────────────── */

function MoneyNotNumber() {
  const [cost, setCost] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <Example label="Money belongs in AmountInput or MoneyField" hint="the dev-only money guard on NumberInput">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <NumberInput label="Estimated cost (CHF)" value={cost} onChange={setCost} />
          <p className={READOUT}>NumberInput keeps: {JSON.stringify(cost)}</p>
        </div>
        <div className="min-w-0">
          <AmountInput label="Estimated cost" currency="CHF" value={amount} onChange={setAmount} />
          <p className={READOUT}>AmountInput settles: {JSON.stringify(amount)}</p>
        </div>
      </div>
      <Note>
        Type {code("12.345")} or {code("100/3")} into both and leave the field. NumberInput never rounds, so a
        3-decimal amount reaches a 2-decimal Money column (kastlan 5: a 422, in a wizard whose first record was already
        saved). AmountInput (a string value) and MoneyField (a number) settle to the currency's minor unit. In a
        development build a NumberInput with a currency as its unit, or in the label of a field with no unit, warns
        once on the console — never in production, never under vitest, and never for a unit of measure ("mm", "N·m",
        "%") at any number of decimals.
      </Note>
    </Example>
  );
}

/* ── calculator={false} for close-on-blur editors ─────────────────────────── */

function InlineCell() {
  const [assigned, setAssigned] = useState<number | null>(250);
  const [vat, setVat] = useState<number | null>(19.95);
  return (
    <Example label="AmountInput / MoneyField calculator={false}" hint="for an inline editor that closes on blur">
      <div className="flex max-w-md flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm text-[var(--text-secondary)]">Groceries — assigned</span>
          <div className="w-36 shrink-0">
            <MoneyField ariaLabel="Assigned" currency="EUR" calculator={false} value={assigned} onCommit={setAssigned} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm text-[var(--text-secondary)]">With the calculator (default)</span>
          <div className="w-36 shrink-0">
            <MoneyField ariaLabel="VAT" currency="EUR" value={vat} onCommit={setVat} />
          </div>
        </div>
      </div>
      <Note>
        In an editor that closes on blur, a click on the calculator icon blurs the field and tears the editor down
        before the popover can open. {code("calculator={false}")} drops the icon (and the room reserved for it); a typed
        sum — {code("200+50")}, then Enter — still evaluates, and a phone keeps its numpad. NumberInput has had the prop
        all along; AmountInput and MoneyField have it now (keksdose K6).
      </Note>
    </Example>
  );
}

/* ── error and hint ───────────────────────────────────────────────────────── */

function Anatomy() {
  const [target, setTarget] = useState("0");
  const [payment, setPayment] = useState("900");
  const [currency, setCurrency] = useState("USD");
  const targetError = Number(target) > 0 ? undefined : "Must be above zero";
  const paymentError = Number(payment) > 800 ? "Exceeds the outstanding 800.00" : undefined;
  const currencyError = currency === "CHF" ? undefined : "The account is in CHF";
  return (
    <Example label="error on NumberInput, AmountInput, MoneyField, CurrencySelect; hint on CurrencySelect" hint="the same anatomy as Input and Select">
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberInput label="Goal target" value={target} onChange={setTarget} hint="Per month" error={targetError} />
        <AmountInput label="Payment" currency="CHF" value={payment} onChange={setPayment} error={paymentError} />
        <CurrencySelect
          label="Currency"
          value={currency}
          onChange={setCurrency}
          hint={<FieldHint label="The currency the account is kept in" />}
          error={currencyError}
        />
      </div>
      <Note>
        {code("error")} is {code("Input")}'s: the message under the field, after a text {code("hint")}, merged into{" "}
        {code("aria-describedby")} after the caller's own ids, and it implies {code("invalid")}. {code("null")},{" "}
        {code("false")} and {code('""')} are no message. A field that passes {code("error")} keeps one steady box, so the
        message coming and going never remounts the input mid-keystroke. CurrencySelect's {code("hint")} follows{" "}
        {code("Select")}: a {code("FieldHint")} rides the label line, plain text is a caption under the field.
      </Note>
    </Example>
  );
}

/* ── SignChip ─────────────────────────────────────────────────────────────── */

function Sign() {
  const [amount, setAmount] = useState("42.50");
  const [negative, setNegative] = useState(true);
  return (
    <Example label="SignChip — the amount's direction, beside the figure" hint="one chip that shows the state it is in">
      <div className="flex max-w-sm items-end gap-2">
        <div className="min-w-0 flex-1">
          <AmountInput
            label="Amount"
            currency="EUR"
            value={amount}
            onChange={setAmount}
            negative={negative}
            onNegativeChange={setNegative}
            tone={negative ? "outflow" : "inflow"}
          />
        </div>
        <SignChip negative={negative} onNegativeChange={setNegative} />
      </div>
      <Note>
        keksdose's direction chip as a kit piece (K15). It takes the same {code("negative")} /{" "}
        {code("onNegativeChange")} pair as AmountInput, so one state feeds both, and wears the same money tones as the
        figure. The word IS the state, so it is an action button with no {code("aria-pressed")}; its name says the state
        and what a press does. Words from the {code("signChip")} labels namespace.
      </Note>
    </Example>
  );
}

export function Numbers022Demo() {
  return (
    <>
      <LocaleMarks />
      <MoneyNotNumber />
      <InlineCell />
      <Anatomy />
      <Sign />
    </>
  );
}
