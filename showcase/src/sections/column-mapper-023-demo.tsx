import { useState } from "react";
import { ColumnMapper, ColumnRoleTable, ToggleGroup } from "@eifi1/ui-kit";
import type { ColumnMapperResult, ColumnMapping, ColumnRole } from "@eifi1/ui-kit";
import { tableNumber } from "@eifi1/ui-kit/table-text";
import { Example, Note } from "../lib/section";

/**
 * ColumnMapper and ColumnRoleTable (0.23): Kurvenschmiede's columns input and
 * keksdose's bank-file mapping step as one kit part. Synthetic data only.
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
  if (!result) return <p className="font-mono text-xs text-[var(--text-muted)]">result = null</p>;
  const actual = result.mapping.actual;
  const first =
    result.complete && typeof actual === "number" ? tableNumber(result.rows[0][actual], result.decimalComma) : null;
  return (
    <p className="font-mono text-xs break-words text-[var(--text-muted)]">
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
        <p className="font-mono text-xs break-words text-[var(--text-muted)]">mapping = {JSON.stringify(mapping)}</p>
      </div>
      <Note>
        The preview with the role selects alone, controlled, over rows the caller already has —
        keksdose&apos;s step two, whose rows come from its server&apos;s sniff. `required: "money"` makes
        a group: any one of Amount, Debit and Credit satisfies it, so a bank that splits debit and
        credit needs no amount column. Ignored columns are dimmed, not hidden. The table scrolls
        sideways in its own box on a phone. A two-step wizard reading the file itself uses
        `parseTextTable` for step one and `readMappedTable` at the end.
      </Note>
    </Example>
  );
}

export function ColumnMapper023Demo() {
  return (
    <>
      <CurveExample />
      <BankExample />
    </>
  );
}
