import { useState } from "react";
import { Checkbox, DataTable, numberFilter } from "@eifi1/ui-kit";
import type { DataTableColumn } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * DATA TABLE 0.17 — the totals row: a column's `footer` and the table's `footerLabel`
 * (kastlan 54, the trial balance that hand-built its totals under the table).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

interface Account {
  no: string;
  name: string;
  debit: number;
  credit: number;
}

const ACCOUNTS: Account[] = [
  { no: "1000", name: "Cash", debit: 4_250, credit: 0 },
  { no: "1020", name: "Bank", debit: 38_910.4, credit: 0 },
  { no: "1100", name: "Accounts receivable", debit: 12_480, credit: 0 },
  { no: "1500", name: "Equipment", debit: 22_000, credit: 0 },
  { no: "2000", name: "Accounts payable", debit: 0, credit: 9_640.4 },
  { no: "2100", name: "VAT payable", debit: 0, credit: 3_120 },
  { no: "2800", name: "Share capital", debit: 0, credit: 50_000 },
  { no: "3000", name: "Revenue", debit: 0, credit: 61_380 },
  { no: "4000", name: "Cost of materials", debit: 18_200, credit: 0 },
  { no: "5000", name: "Salaries", debit: 24_600, credit: 0 },
  { no: "6000", name: "Rent", debit: 3_600, credit: 0 },
  { no: "6500", name: "Office supplies", debit: 100, credit: 0 },
];

const money = new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n: number) => money.format(n);
const sum = (rows: Account[], pick: (r: Account) => number) => rows.reduce((t, r) => t + pick(r), 0);
const AMOUNT = "text-end tabular-nums whitespace-nowrap";

const COLUMNS: DataTableColumn<Account>[] = [
  { key: "no", header: "Account", cell: (r) => r.no, sortBy: (r) => r.no, className: "tabular-nums" },
  { key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name, mobilePrimary: true },
  {
    key: "debit",
    header: "Debit",
    cell: (r) => (r.debit ? fmt(r.debit) : ""),
    sortBy: (r) => r.debit,
    filter: numberFilter((r) => r.debit),
    className: AMOUNT,
    headClassName: "text-end",
    firstSort: "desc",
    // Every row the filters let through, not the page: paging does not move a total.
    footer: (rows) => fmt(sum(rows, (r) => r.debit)),
  },
  {
    key: "credit",
    header: "Credit",
    cell: (r) => (r.credit ? fmt(r.credit) : ""),
    sortBy: (r) => r.credit,
    filter: numberFilter((r) => r.credit),
    className: AMOUNT,
    headClassName: "text-end",
    firstSort: "desc",
    footer: (rows) => fmt(sum(rows, (r) => r.credit)),
  },
  {
    key: "balance",
    header: "Balance",
    cell: (r) => fmt(r.debit - r.credit),
    sortBy: (r) => r.debit - r.credit,
    className: AMOUNT,
    headClassName: "text-end",
    footer: (rows) => fmt(sum(rows, (r) => r.debit - r.credit)),
  },
];

export function DataTableTotalsDemo() {
  const [showTotals, setShowTotals] = useState(true);
  return (
    <Example
      label="Totals row: a trial balance"
      hint={
        <>
          {code("footer")} per column, {code("footerLabel")} for the row. Totals are of every
          filtered row, not the page; on a phone they are a summary card under the list.
        </>
      }
    >
      <div className="mb-2">
        <Checkbox label="Show totals" checked={showTotals} onChange={(e) => setShowTotals(e.target.checked)} />
      </div>
      <DataTable
        rows={ACCOUNTS}
        columns={COLUMNS}
        rowKey={(r) => r.no}
        defaultPageSize={5}
        footer={showTotals}
        footerLabel="Total"
        labels={{ table: "Trial balance" }}
      />
      <Note>
        Page through it: the totals stay those of all twelve accounts and still balance to
        zero. Filter the debit column and they follow the filter. Hide the Account column from
        the column panel and the &quot;Total&quot; row header moves into Name. A server-paged
        table returns its totals with the page and ignores the {code("rows")} argument:{" "}
        {code("footer: () => fmt(page.totalDebit)")}.
      </Note>
    </Example>
  );
}
