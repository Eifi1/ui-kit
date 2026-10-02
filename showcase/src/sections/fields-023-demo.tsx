import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { AmountInput, Button, CountrySelect, MoneyField } from "@eifi1/ui-kit";
// See forms-rhf.tsx: the showcase alias maps "@eifi1/ui-kit/rhf" to src/rhf.ts.
import { Form, RhfCountrySelect, RhfMonthPicker } from "@eifi1/ui-kit/rhf";
import { Example, Note } from "../lib/section";

/**
 * 0.23 fields. Three demos, one per page:
 *
 *  - `Rhf023Demo` (Forms): kastlan's address country and budget fiscal year, bound in a
 *    line each — and a failed Save lands focus on the first of them.
 *  - `CountryClear023Demo` (Entity pickers): CountrySelect's `clearable` and its `ref`.
 *  - `AmountClass023Demo` (Numbers): `inputClassName` on AmountInput and MoneyField
 *    (keksdose G7, a right-aligned VAT cell).
 *
 * Synthetic values only.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap [overflow-wrap:anywhere]";
const code = (s: string) => <code className="font-mono">{s}</code>;

const NEIGHBOURS = ["CH", "LI", "DE", "AT", "FR", "IT"];

type Contact = {
  country: string;
  /** Optional: `""` when cleared, as a `z.string()` schema spells "none". */
  nationality: string;
  billingMonth: string;
  /** An integer column: `valueAsNumber`. */
  fiscalYear: number | null;
};

/** Forms page (slug `forms`). */
export function Rhf023Demo() {
  const form = useForm<Contact>({
    defaultValues: { country: "", nationality: "AT", billingMonth: "", fiscalYear: null },
  });
  const [submitted, setSubmitted] = useState("—");
  return (
    <Example
      label="RhfCountrySelect, RhfMonthPicker"
      hint="save empty: focus lands on the first field in error, a picker's trigger included"
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => setSubmitted(JSON.stringify(v)))}
          className="grid gap-4 md:grid-cols-2"
        >
          <RhfCountrySelect<Contact>
            name="country"
            label="Country"
            hint="Where the contact lives"
            required
            preferred={NEIGHBOURS}
            rules={{ required: "Choose a country" }}
          />
          <RhfCountrySelect<Contact>
            name="nationality"
            label="Nationality"
            hint="Optional — the × clears it"
            clearable
            clearValue=""
          />
          <RhfMonthPicker<Contact>
            name="billingMonth"
            label="First billing month"
            required
            min="2026-01"
            rules={{ required: "Choose a month" }}
          />
          <RhfMonthPicker<Contact>
            name="fiscalYear"
            label="Fiscal year"
            mode="year"
            valueAsNumber
            required
            min="2020"
            max="2029"
            rules={{ required: "Choose a year" }}
          />
          <div className="md:col-span-2">
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </Form>
      <p className={READOUT}>submitted: {submitted}</p>
      <Note>
        Both bind the way {code("RhfIbanInput")} does: {code("field.ref")} reaches the trigger, so a failed submit
        focuses it; the form&apos;s error paints the trigger and is the message under it; the hint is the
        form&apos;s description. {code("RhfCountrySelect")} stores the upper-case code, or {code("clearValue")} (
        {code("null")} by default) once cleared. {code("RhfMonthPicker")} stores {code('"YYYY-MM"')}, or with{" "}
        {code('mode="year"')} {code('"YYYY"')} — a number with {code("valueAsNumber")}.
      </Note>
    </Example>
  );
}

/** Entity pickers page (slug `entity-pickers`). */
export function CountryClear023Demo() {
  const [country, setCountry] = useState<string | null>("CH");
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <Example
      label="CountrySelect — clearable, and a ref to the trigger"
      hint="the × (or Delete on the trigger) hands onChange null"
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <CountrySelect
            ref={ref}
            label="Bank country"
            clearable
            value={country}
            onChange={setCountry}
            preferred={NEIGHBOURS}
          />
          <div className="flex items-center">
            <Button variant="secondary" size="sm" onClick={() => ref.current?.focus()}>
              Focus the field
            </Button>
          </div>
        </div>
        <p className={READOUT}>value: {country === null ? "null" : JSON.stringify(country)}</p>
      </div>
      <Note>
        {code("clearable")} types {code("onChange")} as {code("(code: string | null) => void")}; without it the handler
        is the {code("(code: string) => void")} it always was. The {code("×")} is the combobox family&apos;s — out of the
        tab order, named by {code("combobox.clear")} or {code("clearLabel")} — and is not offered while disabled or
        locked. {code("ref")} is the trigger button, which is what react-hook-form&apos;s focus-on-error needs.
      </Note>
    </Example>
  );
}

/** Numbers page (slug `numbers`). */
export function AmountClass023Demo() {
  const [gross, setGross] = useState("1234.50");
  const [vat, setVat] = useState<number | null>(95.2);
  return (
    <Example
      label="AmountInput and MoneyField — inputClassName"
      hint="classes for the <input>; className stays the wrapper's"
    >
      <div className="grid max-w-md grid-cols-2 gap-3">
        <AmountInput
          ariaLabel="Gross"
          value={gross}
          onChange={setGross}
          calculator={false}
          inputClassName="text-end tabular-nums"
        />
        <MoneyField ariaLabel="VAT" value={vat} onCommit={setVat} calculator={false} inputClassName="text-end tabular-nums" />
      </div>
      <Note>
        A money column right-aligns its figures so the decimal points line up (keksdose G7, the VAT cell). It used to
        take {code("className=\"[&_input]:text-end\"")}; {code("inputClassName")} is the element&apos;s own, merged
        after the field&apos;s base and before the room the calculator and the currency chip reserve and the invalid
        border — as on {code("NumberInput")} and {code("Input")}. {code("RhfMoneyField")} takes it too.
      </Note>
    </Example>
  );
}
