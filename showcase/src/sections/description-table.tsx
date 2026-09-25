import { useState } from "react";
import {
  Button,
  DescriptionItem,
  DescriptionList,
  NUMERIC_CELL_CLASS,
  ScrollArea,
  Separator,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  ToggleGroup,
} from "@eifi1/ui-kit";
import type { DescriptionListDensity, DescriptionListLayout, TableDensity } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * DESCRIPTION LIST & TABLE — the static, read-only ways to lay out facts: a `<dl>` of
 * terms and details, a plain `<table>` with none of DataTable's machinery, and the two
 * small layout pieces that sit between them, Separator and ScrollArea.
 *
 * Every figure below is formatted once at module scope with en-GB, so the specimens do
 * not move when the language changes — the components' own words (none, here) would.
 */

const EUR = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });

function DescriptionRows() {
  const [layout, setLayout] = useState<DescriptionListLayout>("rows");
  const [density, setDensity] = useState<DescriptionListDensity>("comfortable");
  const [closed, setClosed] = useState(false);
  return (
    <Example
      label="DescriptionList — rows and cards, comfortable and compact"
      hint="a real <dl>; rows stack when the LIST is narrower than 24rem (a container query)"
    >
      <Row className="mb-4">
        <ToggleGroup<DescriptionListLayout>
          aria-label="Layout"
          value={layout}
          onChange={setLayout}
          options={[
            { value: "rows", label: "rows" },
            { value: "cards", label: "cards" },
          ]}
        />
        <ToggleGroup<DescriptionListDensity>
          aria-label="Density"
          value={density}
          onChange={setDensity}
          options={[
            { value: "comfortable", label: "comfortable" },
            { value: "compact", label: "compact" },
          ]}
        />
        <Button variant="ghost" onClick={() => setClosed((v) => !v)}>
          {closed ? "Reopen the account" : "Close the account"}
        </Button>
      </Row>
      <div className="max-w-xl">
        <DescriptionList layout={layout} density={density} minCardWidth="9rem">
          <DescriptionItem term="Account">Household · joint</DescriptionItem>
          <DescriptionItem term="IBAN" detailClassName="font-mono">
            DE89 3704 0044 0532 0130 00
          </DescriptionItem>
          <DescriptionItem term="Opened">12 March 2019</DescriptionItem>
          {closed && <DescriptionItem term="Closed">25 September 2026</DescriptionItem>}
          <DescriptionItem term="Balance" numeric hint="Booked transactions only; pending card payments are not included.">
            {EUR.format(4213.07)}
          </DescriptionItem>
          <DescriptionItem term="Overdraft" numeric>
            {EUR.format(1500)}
          </DescriptionItem>
        </DescriptionList>
      </div>
      <div className="mt-3">
        <Note>
          Composed from <code className="font-mono">DescriptionItem</code> children, so a
          conditional fact is <code className="font-mono">{"{closed && <DescriptionItem …>}"}</code>{" "}
          — press the ghost button. The two figures are <code className="font-mono">numeric</code>{" "}
          per item (tabular digits, end-aligned); the IBAN&apos;s <code className="font-mono">detailClassName</code>{" "}
          sets it in mono. The ? beside Balance is <code className="font-mono">hint</code>, the same{" "}
          <code className="font-mono">FieldHint</code> the fields and StatTile use.{" "}
          <code className="font-mono">minCardWidth</code> is the narrowest a card gets before the
          grid drops a column.
        </Note>
      </div>
    </Example>
  );
}

function DescriptionNumeric() {
  return (
    <Example
      label="DescriptionList — numeric, in a narrow panel"
      hint="a numeric list of rows never stacks: a figure is short"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--border)] p-3">
          <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">numeric, compact</p>
          <DescriptionList numeric density="compact">
            <DescriptionItem term="Net rent">{EUR.format(1180)}</DescriptionItem>
            <DescriptionItem term="Service charge">{EUR.format(245.5)}</DescriptionItem>
            <DescriptionItem term="Heating">{EUR.format(96)}</DescriptionItem>
            <DescriptionItem term="Status" numeric={false}>
              Paid on the 1st
            </DescriptionItem>
          </DescriptionList>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">text, the same width</p>
          <DescriptionList>
            <DescriptionItem term="Landlord">Hausverwaltung Nord GmbH</DescriptionItem>
            <DescriptionItem term="Contract">Indexed, from 2021</DescriptionItem>
          </DescriptionList>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          The panels are well under 24rem: the right-hand list stacks each term over its detail,
          the numeric one keeps figure beside term — stacking a figure would double the list&apos;s
          height for no width. <code className="font-mono">numeric={"{false}"}</code> on one item
          overrides the list for a textual detail.
        </Note>
      </div>
    </Example>
  );
}

const LEDGER = [
  { date: "2026-09-01", text: "Rent, September", amount: -1180 },
  { date: "2026-09-02", text: "Salary", amount: 3100 },
  { date: "2026-09-05", text: "Groceries", amount: -86.4 },
  { date: "2026-09-09", text: "Electricity, quarterly", amount: -212.75 },
  { date: "2026-09-14", text: "Refund, train ticket", amount: 39.9 },
  { date: "2026-09-18", text: "Insurance", amount: -64.2 },
];

function StaticTable() {
  const [density, setDensity] = useState<TableDensity>("comfortable");
  const [zebra, setZebra] = useState(true);
  const [hover, setHover] = useState(false);
  const total = LEDGER.reduce((sum, row) => sum + row.amount, 0);
  return (
    <Example
      label="Table — caption, head, body, foot"
      hint="static parts in the kit's tokens: density, zebra, hover; numeric and align are logical"
    >
      <Row className="mb-3">
        <ToggleGroup<TableDensity>
          aria-label="Density"
          value={density}
          onChange={setDensity}
          options={[
            { value: "comfortable", label: "comfortable" },
            { value: "compact", label: "compact" },
          ]}
        />
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={zebra} onChange={(e) => setZebra(e.target.checked)} />
          <code className="font-mono">zebra</code>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={hover} onChange={(e) => setHover(e.target.checked)} />
          <code className="font-mono">hover</code>
        </label>
      </Row>
      <Table density={density} zebra={zebra} hover={hover}>
        <TableCaption>September, main account</TableCaption>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Text</TableHeaderCell>
            <TableHeaderCell align="center">Kind</TableHeaderCell>
            <TableHeaderCell numeric>Amount</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {LEDGER.map((row) => (
            <TableRow key={row.date + row.text}>
              <TableCell className="whitespace-nowrap font-mono text-xs">{row.date}</TableCell>
              <TableCell>{row.text}</TableCell>
              <TableCell align="center">{row.amount < 0 ? "out" : "in"}</TableCell>
              <TableCell numeric>{EUR.format(row.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFoot>
          <TableRow>
            <TableHeaderCell colSpan={3}>Net for the month</TableHeaderCell>
            <TableCell numeric className="font-semibold">
              {EUR.format(total)}
            </TableCell>
          </TableRow>
        </TableFoot>
      </Table>
      <div className="mt-3">
        <Note>
          <code className="font-mono">TableHeaderCell</code>&apos;s <code className="font-mono">scope</code>{" "}
          defaults to <code className="font-mono">col</code> in the head and{" "}
          <code className="font-mono">row</code> elsewhere, so the foot&apos;s &ldquo;Net for the
          month&rdquo; heads its row. <code className="font-mono">numeric</code> is end-aligned
          tabular digits — the same string as the exported{" "}
          <code className="font-mono">NUMERIC_CELL_CLASS</code> (
          <code className="font-mono">{NUMERIC_CELL_CLASS}</code>), for a cell the kit did not render.{" "}
          <code className="font-mono">hover</code> is off by default: a static table whose rows light
          up promises a click that does nothing.
        </Note>
      </div>
    </Example>
  );
}

const WIDE_COLUMNS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WIDE_ROWS = [
  ["Rent", 1180],
  ["Energy", 142],
  ["Groceries", 410],
  ["Transport", 96],
] as const;

function OverflowTable() {
  return (
    <Example
      label="Table — overflow"
      hint="a table cannot shrink below its content; the wrapper scrolls, and while it does it is a named, focusable region"
    >
      <Table density="compact" aria-label="Monthly budget by category" wrapperClassName="max-h-44 rounded-md border border-[var(--border)]">
        <TableHead>
          <TableRow>
            <TableHeaderCell className="sticky start-0 bg-[var(--bg-surface-2)]">Category</TableHeaderCell>
            {WIDE_COLUMNS.map((m) => (
              <TableHeaderCell key={m} numeric>
                {m}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {[...WIDE_ROWS, ...WIDE_ROWS].map(([name, base], i) => (
            <TableRow key={i}>
              <TableHeaderCell className="sticky start-0 bg-[var(--bg-surface)] font-normal">{name}</TableHeaderCell>
              {WIDE_COLUMNS.map((m, j) => (
                <TableCell key={m} numeric>
                  {EUR.format(base + ((i + 1) * (j + 3)) % 40)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-3">
        <Note>
          Twelve months do not fit a phone (or this card): the overflow wrapper scrolls sideways, and
          <code className="font-mono"> wrapperClassName</code> gives it a max height and a border here.
          While it overflows it becomes a tab stop with <code className="font-mono">role=&quot;region&quot;</code>,
          named by the <code className="font-mono">TableCaption</code> or, as here, the table&apos;s{" "}
          <code className="font-mono">aria-label</code> — Tab to it and the arrow keys scroll it.
        </Note>
      </div>
    </Example>
  );
}

function Separators() {
  return (
    <Example label="Separator" hint='role="separator" by default; decorative={true} is role="none" — a line for the eye only'>
      <div className="space-y-4 text-sm text-[var(--text-secondary)]">
        <div>
          <p>Account settings</p>
          <Separator className="my-3" />
          <p>Danger zone</p>
        </div>
        <div className="flex h-8 items-center gap-3">
          <Button variant="ghost">Bold</Button>
          <Button variant="ghost">Italic</Button>
          <Separator orientation="vertical" />
          <Button variant="ghost">Link</Button>
          <Separator orientation="vertical" decorative />
          <span className="text-xs text-[var(--text-muted)]">saved 2 min ago</span>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          The first two are real separators a reader announces — between two sections, between a
          toolbar&apos;s halves (the vertical one carries <code className="font-mono">aria-orientation</code>;
          horizontal is the role&apos;s default and is not stated). The last one only separates the
          toolbar from a status line the structure already separates, so it is{" "}
          <code className="font-mono">decorative</code>.
        </Note>
      </div>
    </Example>
  );
}

const ACTIVITY = Array.from({ length: 24 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"} — sync step ${i + 1} finished`);
const TAGS = ["groceries", "rent", "energy", "insurance", "travel", "gifts", "health", "fees", "savings", "salary", "refunds", "tax"];

function ScrollAreas() {
  const [short, setShort] = useState(false);
  return (
    <Example
      label="ScrollArea"
      hint="thin scrollbar in the kit's colours; a tab stop and a named region only while the content overflows"
    >
      <div className="grid gap-4 md:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-1">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">vertical (default) · label</p>
          <ScrollArea label="Activity log" className="h-40 rounded-md border border-[var(--border)] p-2">
            <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
              {(short ? ACTIVITY.slice(0, 3) : ACTIVITY).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </ScrollArea>
          <Button variant="link" className="text-xs" onClick={() => setShort((v) => !v)}>
            {short ? "Show all 24 lines" : "Show 3 lines (no overflow, no tab stop)"}
          </Button>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">horizontal</p>
          <ScrollArea orientation="horizontal" label="Tags" className="rounded-md border border-[var(--border)] p-2">
            <div className="flex w-max gap-2">
              {TAGS.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--bg-surface-2)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                  {tag}
                </span>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">both</p>
          <ScrollArea orientation="both" label="Grid preview" className="h-40 rounded-md border border-[var(--border)]">
            <div className="grid w-[36rem] grid-cols-6 gap-1 p-2">
              {Array.from({ length: 60 }, (_, i) => (
                <span key={i} className="rounded bg-[var(--bg-surface-2)] px-2 py-3 text-center font-mono text-[10px] text-[var(--text-muted)]">
                  {i + 1}
                </span>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          A container that scrolls but holds nothing focusable cannot be scrolled from the keyboard
          at all — Tab jumps past it. So while it overflows, the box itself is{" "}
          <code className="font-mono">tabIndex=0</code> and the arrow keys and Page Up/Down scroll it
          natively; shorten the log and it leaves the tab order. The scrollbar is the platform&apos;s
          own, thinned and coloured: native momentum and dragging, no script.
        </Note>
      </div>
    </Example>
  );
}

export function DescriptionTable() {
  return (
    <>
      <DescriptionRows />
      <DescriptionNumeric />
      <StaticTable />
      <OverflowTable />
      <Separators />
      <ScrollAreas />
    </>
  );
}
