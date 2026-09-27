import { useState } from "react";
import { useForm } from "react-hook-form";
import { AmountInput, Button, UiKitProvider, WizardStep, formatNumber } from "@eifi1/ui-kit";
// See forms-rhf.tsx: the showcase alias maps "@eifi1/ui-kit/rhf" to src/rhf.ts.
import { Form, RhfIntegerField, RhfMoneyField, RhfTextField } from "@eifi1/ui-kit/rhf";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.13 on the Forms page: the amount field in the locale's decimal mark (kastlan 40),
 * `RhfIntegerField` (41), `RhfTextField`'s `inputClassName` (42), `WizardStep`'s
 * header `actions` (43) and `formatNumber`'s `unit` (lenkbank P8).
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap [overflow-wrap:anywhere]";
const code = (s: string) => <code className="font-mono">{s}</code>;

const LOCALES = ["fr-CH", "de-DE", "de-CH", "en-US"] as const;

function AmountLocaleDemo() {
  const [locale, setLocale] = useState<(typeof LOCALES)[number]>("fr-CH");
  const [value, setValue] = useState("1234.5");
  return (
    <Example
      label="AmountInput — the locale's decimal mark"
      hint="type 1,5 or 1.5, or a sum like 12,5+3,25; the reported value stays dot-decimal"
    >
      <div className="space-y-3">
        <Row>
          {LOCALES.map((l) => (
            <Button key={l} size="sm" variant={l === locale ? "primary" : "secondary"} onClick={() => setLocale(l)}>
              {l}
            </Button>
          ))}
        </Row>
        <UiKitProvider locale={locale}>
          <div className="max-w-xs">
            <AmountInput label="Rent" value={value} onChange={setValue} currency="CHF" />
          </div>
        </UiKitProvider>
        <p className={READOUT}>onChange: {JSON.stringify(value)}</p>
        <Note>
          The display follows {code("Intl")}: de-CH and it-CH write a point, fr-CH and de-DE a
          comma. No digit grouping while editing, so the caret never jumps.
        </Note>
      </div>
    </Example>
  );
}

type Building = { floors: number | ""; rooms: number | "" | null; iban: string; deposit: number | null };

function RhfPresetsDemo() {
  const form = useForm<Building>({ defaultValues: { floors: "", rooms: null, iban: "", deposit: null } });
  const [submitted, setSubmitted] = useState("—");
  return (
    <Example
      label="RhfIntegerField and RhfTextField inputClassName"
      hint="2.5 floors settles to 3; empty stores '' unless emptyValue says otherwise"
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => setSubmitted(JSON.stringify(v)))}
          className="grid gap-4 md:grid-cols-2"
        >
          <RhfIntegerField<Building> name="floors" label="Floors" />
          <RhfIntegerField<Building> name="rooms" label="Rooms (nullable)" emptyValue={null} />
          <RhfTextField<Building> name="iban" label="IBAN" inputClassName="font-mono tracking-wide" />
          <RhfMoneyField<Building> name="deposit" label="Deposit" currency="CHF" />
          <div className="md:col-span-2">
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </Form>
      <p className={READOUT}>submitted: {submitted}</p>
    </Example>
  );
}

function WizardStepActionsDemo() {
  const [buildings, setBuildings] = useState(["Hauptstrasse 1"]);
  return (
    <Example label="WizardStep actions — a button in the step header">
      <WizardStep
        title="Buildings"
        description="One row per building on the property."
        actions={
          <Button size="sm" onClick={() => setBuildings((b) => [...b, `Building ${b.length + 1}`])}>
            Add building
          </Button>
        }
      >
        <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
          {buildings.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </WizardStep>
    </Example>
  );
}

function FormatUnitDemo() {
  const rows: Array<[string, string]> = [
    ["formatNumber(3400, { locale: \"de-DE\", unit: \"N\" })", formatNumber(3400, { locale: "de-DE", unit: "N" })],
    ["formatNumber(4.5, { locale: \"fr-CH\", digits: 1, unit: \"m²\" })", formatNumber(4.5, { locale: "fr-CH", digits: 1, unit: "m²" })],
    ["formatNumber(null, { unit: \"N\" })", formatNumber(null, { unit: "N" })],
  ];
  return (
    <Example label="formatNumber unit — a narrow no-break space before the unit">
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {rows.map(([call, out]) => (
          <div key={call} className="contents">
            <dt className={READOUT}>{call}</dt>
            <dd className="tabular-nums">{out}</dd>
          </div>
        ))}
      </dl>
    </Example>
  );
}

export function Forms013Demo() {
  return (
    <>
      <AmountLocaleDemo />
      <RhfPresetsDemo />
      <WizardStepActionsDemo />
      <FormatUnitDemo />
    </>
  );
}
