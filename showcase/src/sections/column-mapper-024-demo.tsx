import { useState } from "react";
import { ColumnMapper, ColumnRoleTable, Switch, ToggleGroup } from "@eifi1/ui-kit";
import type { ColumnMapping, ColumnRole } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * ColumnMapper and ColumnRoleTable, 0.24: what the two apps found adopting them in 0.23 —
 * the edge fade on a preview wider than its box, "(required)" only where it tells roles
 * apart, and `bodyProps` / `rowProps` on the preview's body and rows. Synthetic data only.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

type BenchRole = "time" | "setpoint" | "actual" | "valve";

// Kurvenschmiede's shape: every part required and a number.
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
        Kurvenschmiede, on a phone: the fourth column&apos;s select sat past the right edge and
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

type BankRole = "booking_date" | "amount" | "debit" | "credit" | "payee" | "memo";

const BANK_ROLES: ColumnRole<BankRole>[] = [
  { value: "booking_date", label: "Booking date", required: true },
  { value: "amount", label: "Amount", required: "money" },
  { value: "debit", label: "Debit", required: "money" },
  { value: "credit", label: "Credit", required: "money" },
  { value: "payee", label: "Payee" },
  { value: "memo", label: "Memo" },
];

const SNIFF = {
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
    <Example label="bodyProps / rowProps — attributes on the preview's body and rows" hint="keksdose's demo mode">
      <div className="min-w-0 space-y-3">
        <Switch label="Demo mode (blurs [data-private])" checked={demoMode} onCheckedChange={setDemoMode} />
        {/* The app's rule, here as a class: `.demo-mode [data-private]` blurs. */}
        <div className={demoMode ? "[&_[data-private]]:blur-[3px]" : undefined}>
          <ColumnRoleTable
            header={SNIFF.columns}
            rows={SNIFF.rows}
            totalRows={SNIFF.total}
            roles={BANK_ROLES}
            mapping={mapping}
            onMappingChange={setMapping}
            bodyProps={{ "data-private": "" }}
            rowProps={(_row, index) => ({ "data-sample-row": index + 1 })}
          />
        </div>
      </div>
      <Note>
        keksdose&apos;s sample rows are the user&apos;s own bank data, and its demo mode blurs{" "}
        {code("[data-private]")}. It set that on the table&apos;s {code("<tbody>")} from a layout effect
        after every commit; now it is {code('bodyProps={{ "data-private": "" }}')}. The head stays
        readable: the column names and role selects are what demo mode shows. {code("rowProps(row, index)")}{" "}
        puts attributes on each previewed {code("<tr>")}, as LineItems&apos; {code("rowProps")} does on its
        rows. Here some roles are optional, so the required one still says so — Booking date —
        and a group&apos;s members do not: the line under the table names the group.
      </Note>
    </Example>
  );
}

export function ColumnMapper024Demo() {
  return (
    <>
      <FadeExample />
      <PrivateExample />
    </>
  );
}
