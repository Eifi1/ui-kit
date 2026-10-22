import { useState } from "react";
import { ColumnMapper, ColumnRoleTable, ToggleGroup, Switch } from "@eifi1/ui-kit";
import type { ColumnMapperResult, ColumnMapping, ColumnRole } from "@eifi1/ui-kit";
import { tableNumber } from "@eifi1/ui-kit/table-text";
import { Example, Note, code } from "../lib/section";

/**
 * ColumnMapper and ColumnRoleTable — a recorder's export pasted, dropped or chosen, its
 * columns given roles — in one module, rendered as one section of the Table entry page.
 * Filed by release until the refactor audit of 2026-10 (DOC-8): column-mapper-023,
 * column-mapper-024, polish-025. Each specimen keeps its label, so its anchor and its
 * search entry hold, and says since which release in a Note.
 */

/* ── since 0.23 ─────────────────────────────────────────────────────────── */

/**
 * ColumnMapper and ColumnRoleTable (0.23): a measurement columns input and a
 * bank-file mapping step as one kit part. Synthetic data only.
 */

type CurveRole = "time" | "setpoint" | "actual";

const CURVE_ROLES: ColumnRole<CurveRole>[] = [
  { value: "time", label: "Time", required: true, numeric: true },
  { value: "setpoint", label: "Setpoint", required: true, numeric: true },
  { value: "actual", label: "Actual", required: true, numeric: true },
];

const SAMPLES = {
  german: [
    "# recorder v2",
    "t;soll;ist;status",
    "0;1,50;1,42;ok",
    "0,1;2,50;2,38;ok",
    "0,2;3,50;3,31;ok",
    "0,3;4,50;n/a;dropout",
    "0,4;5,50;5,47;ok",
    "0,5;6,50;6,44;ok",
    "0,6;7,50;7,49;ok",
    "end of record",
  ].join("\n"),
  english: ["Actual,t,Setpoint", "1.42,0,1.5", "2.38,0.1,2.5", "3.31,0.2,3.5"].join("\n"),
  dump: ["0,0 1,50 1,42", "0,1 2,50 2,38", "0,2 3,50 3,31"].join("\n"),
} as const;

type Sample = keyof typeof SAMPLES;

/** What the mapper hands over, printed under it — that answer, not the look, is what a
 *  caller builds on. */
function ResultLine({ result }: { result: ColumnMapperResult<CurveRole> | null }) {
  if (!result) return <p className="font-mono text-xs text-muted">result = null</p>;
  const actual = result.mapping.actual;
  const first =
    result.complete && typeof actual === "number" ? tableNumber(result.rows[0][actual], result.decimalComma) : null;
  return (
    <p className="font-mono text-xs break-words text-muted">
      complete = {String(result.complete)} · mapping = {JSON.stringify(result.mapping)} · rows = {result.rows.length} ·
      unread = [{result.unread.map((line) => line.line).join(", ")}]{first !== null && ` · first actual = ${first}`}
    </p>
  );
}

function CurveExample() {
  const [sample, setSample] = useState<Sample>("german");
  const [result, setResult] = useState<ColumnMapperResult<CurveRole> | null>(null);
  return (
    <Example
      label="ColumnMapper — paste, drop or choose a recorder's export"
      hint="time, setpoint and actual: required, numeric"
    >
      <div className="min-w-0 space-y-3">
        <ToggleGroup
          aria-label="Sample"
          value={sample}
          onChange={(next) => setSample(next as Sample)}
          options={[
            { value: "german", label: "German export" },
            { value: "english", label: "English CSV" },
            { value: "dump", label: "Whitespace dump" },
          ]}
        />
        {/* Uncontrolled: a new sample is a new mapper, as a new file would be. */}
        <ColumnMapper key={sample} roles={CURVE_ROLES} defaultText={SAMPLES[sample]} onChange={setResult} />
        <ResultLine result={result} />
      </div>
      <Note>
        The parse says what it assumed — the separator, the decimal convention, the header line (a
        checkbox, because detection is a guess) — and lists every line it could not read by number
        and text: the German sample&apos;s dropout row, where `actual` is no number, and its footer.
        The English sample names its columns, so `Actual` is placed by name. Picking a role another
        column holds moves it there. Drop a `.csv` on the box or the button; a Windows-1252 file is
        read as such. The rows are strings; convert with `tableNumber(cell, result.decimalComma)`.
      </Note>
    </Example>
  );
}

type BankRole = "booking_date" | "amount" | "debit" | "credit" | "payee" | "memo";

const BANK_ROLES: ColumnRole<BankRole>[] = [
  { value: "booking_date", label: "Booking date", required: true },
  { value: "amount", label: "Amount", required: "money" },
  { value: "debit", label: "Debit", required: "money" },
  { value: "credit", label: "Credit", required: "money" },
  { value: "payee", label: "Payee" },
  { value: "memo", label: "Memo" },
];

/** What a server's sniff of a bank CSV answers: column names and a sample. */
const SNIFF = {
  columns: ["Buchungstag", "Valuta", "Empfänger", "Verwendungszweck", "Soll", "Haben", "Saldo"],
  rows: [
    ["01.02.2026", "01.02.2026", "Example Ltd", "Invoice 0001", "12,50", "", "987,50"],
    ["02.02.2026", "03.02.2026", "Sample Shop", "", "3,20", "", "984,30"],
    ["03.02.2026", "03.02.2026", "Example Payroll", "Salary", "", "2.000,00", "2.984,30"],
    ["04.02.2026", "04.02.2026", "Test Utilities", "Account 000000", "45,00", "", "2.939,30"],
    ["05.02.2026", "05.02.2026", "Example Ltd", "Invoice 0002", "8,90", "", "2.930,40"],
    ["06.02.2026", "06.02.2026", "Sample Shop", "", "1,10", "", "2.929,30"],
  ],
  total: 64,
};

function BankExample() {
  // The wizard's own state, with fields beside the roles — handed back untouched.
  const [mapping, setMapping] = useState<ColumnMapping<BankRole> & { delimiter: string }>({
    booking_date: 0,
    payee: 2,
    delimiter: ";",
  });
  return (
    <Example label="ColumnRoleTable — rows a server already read" hint="a wizard's mapping step">
      <div className="min-w-0 space-y-3">
        <ColumnRoleTable
          header={SNIFF.columns}
          rows={SNIFF.rows}
          totalRows={SNIFF.total}
          roles={BANK_ROLES}
          mapping={mapping}
          onMappingChange={setMapping}
        />
        <p className="font-mono text-xs break-words text-muted">mapping = {JSON.stringify(mapping)}</p>
      </div>
      <Note>
        The preview with the role selects alone, controlled, over rows the caller already has —
        an import&apos;s step two, whose rows come from its server&apos;s sniff. `required: "money"` makes
        a group: any one of Amount, Debit and Credit satisfies it, so a bank that splits debit and
        credit needs no amount column. Ignored columns are dimmed, not hidden. The table scrolls
        sideways in its own box on a phone. A two-step wizard reading the file itself uses
        `parseTextTable` for step one and `readMappedTable` at the end.
      </Note>
    </Example>
  );
}

function ColumnMapper023Demo() {
  return (
    <>
      <CurveExample />
      <BankExample />
    </>
  );
}

/* ── since 0.24 ─────────────────────────────────────────────────────────── */

/**
 * ColumnMapper and ColumnRoleTable, 0.24: what the two apps found adopting them in 0.23 —
 * the edge fade on a preview wider than its box, "(required)" only where it tells roles
 * apart, and `bodyProps` / `rowProps` on the preview's body and rows. Synthetic data only.
 */

type BenchRole = "time" | "setpoint" | "actual" | "valve";

// A measurement shape: every part required and a number.
const BENCH_ROLES: ColumnRole<BenchRole>[] = [
  { value: "time", label: "Time (s)", required: true, numeric: true },
  { value: "setpoint", label: "Setpoint (°C)", required: true, numeric: true },
  { value: "actual", label: "Actual (°C)", required: true, numeric: true },
  { value: "valve", label: "Valve (%)", required: true, numeric: true },
];

const BENCH = [
  "t;soll;ist;ventil",
  "0;20,0;19,8;12",
  "0,5;20,0;19,9;14",
  "1,0;22,0;20,3;38",
  "1,5;22,0;21,1;52",
  "2,0;22,0;21,7;47",
  "2,5;22,0;21,9;41",
].join("\n");

type Width = "full" | "phone";

type Direction = "ltr" | "rtl";

function FadeExample() {
  const [width, setWidth] = useState<Width>("phone");
  const [direction, setDirection] = useState<Direction>("ltr");
  return (
    <Example
      label="Edge fade — a preview wider than its box"
      hint="four required numeric roles in a phone-wide box; scroll the table sideways"
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Width"
            value={width}
            onChange={(next) => setWidth(next as Width)}
            options={[
              { value: "phone", label: "Phone (358px)" },
              { value: "full", label: "Full width" },
            ]}
          />
          <ToggleGroup
            aria-label="Direction"
            value={direction}
            onChange={(next) => setDirection(next as Direction)}
            options={[
              { value: "ltr", label: "LTR" },
              { value: "rtl", label: "RTL" },
            ]}
          />
        </div>
        <div dir={direction} className={width === "phone" ? "max-w-[358px]" : undefined}>
          <ColumnMapper roles={BENCH_ROLES} defaultText={BENCH} onChange={() => {}} />
        </div>
      </div>
      <Note>
        On a phone the fourth column&apos;s select sat past the right edge and
        nothing said there was more. The edge with columns behind it now fades — measured, so
        a table that fits is drawn as before; both edges once scrolled into the middle; the
        reading direction&apos;s own end in RTL. It is the Tabs strip&apos;s fade, a{" "}
        {code("mask-image")}: no layout change, no animation, nothing to fade to. A role select
        tabbed to behind the fade is scrolled clear of it. The roles are all required, so
        none says {code("(required)")} — it told no option from another and cut{" "}
        {code("Zeit (s) (erforderl…")} short; the {code("Still needed")} line names what is missing.
      </Note>
    </Example>
  );
}



const SNIFF_024 = {
  columns: ["Buchungstag", "Empfänger", "Verwendungszweck", "Soll", "Haben"],
  rows: [
    ["01.02.2026", "Example Ltd", "Invoice 0001", "12,50", ""],
    ["02.02.2026", "Sample Shop", "", "3,20", ""],
    ["03.02.2026", "Example Payroll", "Salary", "", "2.000,00"],
    ["04.02.2026", "Test Utilities", "Account 000000", "45,00", ""],
    ["05.02.2026", "Example Ltd", "Invoice 0002", "8,90", ""],
  ],
  total: 64,
};

function PrivateExample() {
  const [demoMode, setDemoMode] = useState(true);
  const [mapping, setMapping] = useState<ColumnMapping<BankRole>>({ booking_date: 0, payee: 1 });
  return (
    <Example label="bodyProps / rowProps — attributes on the preview's body and rows" hint="an app's demo mode">
      <div className="min-w-0 space-y-3">
        <Switch label="Demo mode (blurs [data-private])" checked={demoMode} onCheckedChange={setDemoMode} />
        {/* The app's rule, here as a class: `.demo-mode [data-private]` blurs. */}
        <div className={demoMode ? "[&_[data-private]]:blur-[3px]" : undefined}>
          <ColumnRoleTable
            header={SNIFF_024.columns}
            rows={SNIFF_024.rows}
            totalRows={SNIFF_024.total}
            roles={BANK_ROLES}
            mapping={mapping}
            onMappingChange={setMapping}
            bodyProps={{ "data-private": "" }}
            rowProps={(_row, index) => ({ "data-sample-row": index + 1 })}
          />
        </div>
      </div>
      <Note>
        Sample rows may be the user&apos;s own bank data, and a demo mode blurs{" "}
        {code("[data-private]")}. On the table&apos;s {code("<tbody>")} that is {code('bodyProps={{ "data-private": "" }}')}. The head stays
        readable: the column names and role selects are what demo mode shows. {code("rowProps(row, index)")}{" "}
        puts attributes on each previewed {code("<tr>")}, as LineItems&apos; {code("rowProps")} does on its
        rows. Here some roles are optional, so the required one still says so — Booking date —
        and a group&apos;s members do not: the line under the table names the group.
      </Note>
    </Example>
  );
}

function ColumnMapper024Demo() {
  return (
    <>
      <FadeExample />
      <PrivateExample />
    </>
  );
}

/* ── since 0.25 ─────────────────────────────────────────────────────────── */


const ROLE_SETS: Record<"en" | "de" | "fr", ColumnRole<BankRole>[]> = {
  en: [
    { value: "booking_date", label: "Booking date", required: true },
    { value: "amount", label: "Amount (signed)", required: "money" },
    { value: "debit", label: "Debit column", required: "money" },
    { value: "credit", label: "Credit column", required: "money" },
    { value: "payee", label: "Payee" },
    { value: "memo", label: "Purpose / memo" },
  ],
  de: [
    { value: "booking_date", label: "Buchungstag", required: true },
    { value: "amount", label: "Betrag (mit Vorzeichen)", required: "money" },
    { value: "debit", label: "Soll-Spalte", required: "money" },
    { value: "credit", label: "Haben-Spalte", required: "money" },
    { value: "payee", label: "Zahlungsempfänger" },
    { value: "memo", label: "Verwendungszweck" },
  ],
  fr: [
    { value: "booking_date", label: "Date de comptabilisation", required: true },
    { value: "amount", label: "Montant (signé)", required: "money" },
    { value: "debit", label: "Colonne débit", required: "money" },
    { value: "credit", label: "Colonne crédit", required: "money" },
    { value: "payee", label: "Bénéficiaire" },
    { value: "memo", label: "Motif / note" },
  ],
};

const SNIFF_025 = {
  columns: ["Datum", "Empfänger", "Zweck", "Soll", "Haben"],
  rows: [
    ["01.02.2026", "Example Ltd", "Invoice 0001", "12,50", ""],
    ["02.02.2026", "Sample Shop", "", "3,20", ""],
    ["03.02.2026", "Example Payroll", "Salary", "", "2.000,00"],
  ],
};

function ColumnRoleRequired025Demo() {
  const [language, setLanguage] = useState<"en" | "de" | "fr">("en");
  const [width, setWidth] = useState<"phone" | "full">("phone");
  const [mapping, setMapping] = useState<ColumnMapping<BankRole>>({
    booking_date: 0,
    payee: 1,
    memo: 2,
    debit: 3,
    credit: 4,
  });
  return (
    <Example
      label="ColumnRoleTable — the required mark on a phone"
      hint="one required role among optional ones, in a phone-wide box; the role names are the app's own"
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Role names"
            size="sm"
            value={language}
            onChange={(v) => setLanguage(v as "en" | "de" | "fr")}
            options={[
              { value: "en", label: "English" },
              { value: "de", label: "Deutsch" },
              { value: "fr", label: "Français" },
            ]}
          />
          <ToggleGroup
            aria-label="Width"
            size="sm"
            value={width}
            onChange={(v) => setWidth(v as "phone" | "full")}
            options={[
              { value: "phone", label: "Phone (358px)" },
              { value: "full", label: "Full width" },
            ]}
          />
        </div>
        <div className={width === "phone" ? "max-w-[358px]" : undefined}>
          <ColumnRoleTable
            header={SNIFF_025.columns}
            rows={SNIFF_025.rows}
            roles={ROLE_SETS[language]}
            mapping={mapping}
            onMappingChange={setMapping}
          />
        </div>
        <Note>
          On a phone the closed select said {code("Booking date (re…")} — the mark took
          the room the role&apos;s name needed. It is short now, {code("Booking date *")}, and the
          option is still NAMED {code("Booking date (required)")} ({code("aria-label")}), so a
          screen reader hears the word, not &ldquo;star&rdquo;; {code("requiredRoleShort")} and{" "}
          {code("requiredRole")} are the two labels. And no role name is cut at all: each column
          is at least as wide as its select&apos;s longest option, up to 14rem, so a long
          translation widens the columns and the edge fade says there are more to scroll to.
          Short roles keep the 9rem column they had.
        </Note>
      </div>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** Every ColumnMapper and ColumnRoleTable specimen, in the order the releases added them. */
export function ColumnMapperDemo() {
  return (
    <>
      <ColumnMapper023Demo />
      <ColumnMapper024Demo />
      <ColumnRoleRequired025Demo />
    </>
  );
}
