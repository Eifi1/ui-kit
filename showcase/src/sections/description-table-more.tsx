import { useState } from "react";
import {
  Button,
  DescriptionItem,
  DescriptionList,
  Input,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  ToggleGroup,
} from "@eifi1/ui-kit";
import type { DescriptionListColumns, TableLayout } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * DESCRIPTION LIST & TABLE — the 0.10.0 layouts: the stacked grid with columns and
 * spans, the tight density, a cap on a card grid's columns and prose details; and the
 * table's empty row, its padding-free density and its `table-layout`.
 */

const EUR = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

function StackedList() {
  const [columns, setColumns] = useState<"1" | "2" | "3" | "4">("3");
  return (
    <Example
      label="DescriptionList — stacked, with columns and span"
      hint='layout="stacked": term above detail, in a borderless grid measured on the LIST, not the window'
    >
      <Row className="mb-4">
        <ToggleGroup<"1" | "2" | "3" | "4">
          aria-label="columns"
          size="sm"
          value={columns}
          onChange={setColumns}
          options={[
            { value: "1", label: "columns 1" },
            { value: "2", label: "columns 2" },
            { value: "3", label: "columns 3" },
            { value: "4", label: "columns 4" },
          ]}
        />
      </Row>
      <DescriptionList layout="stacked" columns={Number(columns) as DescriptionListColumns}>
        <DescriptionItem term="Tenant">Ada Lovelace</DescriptionItem>
        <DescriptionItem term="Unit">2nd floor, east</DescriptionItem>
        <DescriptionItem term="Start">1 April 2024</DescriptionItem>
        <DescriptionItem term="Net rent" numeric>
          {EUR.format(1180)}
        </DescriptionItem>
        <DescriptionItem term="Deposit" numeric>
          {EUR.format(3540)}
        </DescriptionItem>
        <DescriptionItem term="Index" span={2}>
          Consumer price index, reviewed every 12 months (span 2)
        </DescriptionItem>
        <DescriptionItem term="Notes" span="full" prose>
          The tenant asked for the heating costs to be split by metered consumption from next year on; the
          meters were fitted in spring. (span &quot;full&quot;, prose)
        </DescriptionItem>
      </DescriptionList>
      <div className="mt-3">
        <Note>
          One column on a phone-narrow pane, two from 20rem, then one more each time every column would still
          get about 12rem — up to <code className="font-mono">columns</code>. Narrow the window to watch it drop.{" "}
          <code className="font-mono">span</code> is clamped to the columns there are, so it can never open an
          implicit column and push the grid off its pane; <code className="font-mono">&quot;full&quot;</code> is the
          whole row. A stacked figure keeps its term&apos;s start edge.
        </Note>
      </div>
    </Example>
  );
}

function TightCardsProse() {
  return (
    <Example
      label="DescriptionList — tight, card columns and prose"
      hint="small print read as a block; at most n cards a row; details that are sentences, not values"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[var(--border)] p-3">
          <p className="mb-1 font-mono text-xs text-[var(--text-muted)]">density=&quot;tight&quot; numeric</p>
          <DescriptionList density="tight" numeric>
            <DescriptionItem term="Sign-ins today">1,204</DescriptionItem>
            <DescriptionItem term="New accounts">37</DescriptionItem>
            <DescriptionItem term="Imports">212</DescriptionItem>
            <DescriptionItem term="Failed imports">4</DescriptionItem>
            <DescriptionItem term="Feedback reports">9</DescriptionItem>
          </DescriptionList>
        </div>
        <div>
          <p className="mb-1 font-mono text-xs text-[var(--text-muted)]">
            layout=&quot;cards&quot; columns={"{2}"} minCardWidth=&quot;0&quot;
          </p>
          <DescriptionList layout="cards" columns={2} minCardWidth="0" density="compact">
            <DescriptionItem term="Income">{EUR.format(3100)}</DescriptionItem>
            <DescriptionItem term="Spent">{EUR.format(2560)}</DescriptionItem>
            <DescriptionItem term="Saved">{EUR.format(540)}</DescriptionItem>
            <DescriptionItem term="Budget left">{EUR.format(212.4)}</DescriptionItem>
          </DescriptionList>
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-1 font-mono text-xs text-[var(--text-muted)]">layout=&quot;cards&quot; prose (one item prose={"{false}"})</p>
        <DescriptionList layout="cards" prose minCardWidth="14rem">
          <DescriptionItem term="Hysteresis">
            How far the output lags behind the input when the direction of travel reverses.
          </DescriptionItem>
          <DescriptionItem term="Deadband">
            The range of input around zero in which the controller deliberately does nothing.
          </DescriptionItem>
          <DescriptionItem term="Gain" prose={false}>
            1.8
          </DescriptionItem>
        </DescriptionList>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">tight</code> is 11px on a 2px rhythm with no rules between the rows — a block
          of small print, not a list to scan. <code className="font-mono">columns</code> on a card grid is the MOST
          cards a row; the grid still drops columns below <code className="font-mono">minCardWidth</code>, and{" "}
          <code className="font-mono">columns={"{2}"} minCardWidth=&quot;0&quot;</code> is &ldquo;two side by
          side&rdquo; without knowing the gap. <code className="font-mono">prose</code> sets the details in the
          regular weight and secondary ink, so a grid of paragraphs does not read as a wall of headings; per
          item it overrides the list either way.
        </Note>
      </div>
    </Example>
  );
}

const LINES = [
  { text: "Rent, September", rate: "0 %", amount: 1180 },
  { text: "Electricity", rate: "19 %", amount: 212.75 },
  { text: "Internet", rate: "19 %", amount: 39.99 },
];

function TableEmptyDensityLayout() {
  const [filter, setFilter] = useState("");
  const [layout, setLayout] = useState<TableLayout>("auto");
  const [extraColumn, setExtraColumn] = useState(false);
  const rows = LINES.filter((l) => l.text.toLowerCase().includes(filter.trim().toLowerCase()));
  return (
    <Example
      label="Table — empty, TableEmpty, density none and layout"
      hint="the empty row spans every column by measuring the table, so an added column cannot leave it short"
    >
      <Row className="mb-3">
        <div className="w-60">
          <Input label="Filter the lines" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setFilter("zzz")}>
          Filter everything away
        </Button>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={extraColumn} onChange={(e) => setExtraColumn(e.target.checked)} />
          add a column
        </label>
        <ToggleGroup<TableLayout>
          aria-label="layout"
          size="sm"
          value={layout}
          onChange={setLayout}
          options={[
            { value: "auto", label: "layout auto" },
            { value: "fixed", label: "layout fixed" },
          ]}
        />
      </Row>
      <Table layout={layout} aria-label="Invoice lines">
        <TableHead>
          <TableRow>
            <TableHeaderCell className={layout === "fixed" ? "w-1/2" : undefined}>Text</TableHeaderCell>
            <TableHeaderCell>VAT</TableHeaderCell>
            {extraColumn && <TableHeaderCell>Account</TableHeaderCell>}
            <TableHeaderCell numeric>Amount</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody empty={<>No line matches &ldquo;{filter}&rdquo;.</>}>
          {rows.map((l) => (
            <TableRow key={l.text}>
              <TableCell>{l.text}</TableCell>
              <TableCell>{l.rate}</TableCell>
              {extraColumn && <TableCell className="font-mono text-xs">4400</TableCell>}
              <TableCell numeric>{EUR.format(l.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className={`mt-2 ${READOUT}`}>
        rows: {rows.length} · layout: {layout}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[var(--border)] p-3">
          <p className="mb-2 font-mono text-xs text-[var(--text-muted)]">density=&quot;none&quot; inside a card&apos;s padding</p>
          <Table density="none" aria-label="VAT summary">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Rate</TableHeaderCell>
                <TableHeaderCell numeric className="ps-2">Net</TableHeaderCell>
                <TableHeaderCell numeric className="ps-2">VAT</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>19 %</TableCell>
                <TableCell numeric className="ps-2">{EUR.format(252.74)}</TableCell>
                <TableCell numeric className="ps-2">{EUR.format(48.02)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0 %</TableCell>
                <TableCell numeric className="ps-2">{EUR.format(1180)}</TableCell>
                <TableCell numeric className="ps-2">{EUR.format(0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <p className="mb-2 font-mono text-xs text-[var(--text-muted)]">TableEmpty on its own, colSpan={"{3}"}</p>
          <Table density="compact" aria-label="Scheduled payments">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Payee</TableHeaderCell>
                <TableHeaderCell>Due</TableHeaderCell>
                <TableHeaderCell numeric>Amount</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableEmpty colSpan={3} cellClassName="italic">
                Nothing scheduled this month.
              </TableEmpty>
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">TableBody empty</code> renders ONE full-width row when the body has no rows —
          an empty map, a <code className="font-mono">false</code>, a <code className="font-mono">null</code>. Filter
          everything away, then add a column: the row still spans the table, because its{" "}
          <code className="font-mono">colSpan</code> is counted from the table after mount rather than written by
          hand. <code className="font-mono">TableEmpty</code> is that row on its own, for a body whose rows are not
          its direct children. <code className="font-mono">density=&quot;none&quot;</code> takes every cell&apos;s
          padding away for a table spaced by hand inside a card (the empty row keeps a little air).{" "}
          <code className="font-mono">layout=&quot;fixed&quot;</code> takes the widths from the first row — the text
          column holds its half however long the lines get.
        </Note>
      </div>
    </Example>
  );
}

export function DescriptionTableMore() {
  return (
    <>
      <StackedList />
      <TightCardsProse />
      <TableEmptyDensityLayout />
    </>
  );
}
