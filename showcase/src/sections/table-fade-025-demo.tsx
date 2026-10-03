import { useState } from "react";
import type { ReactNode } from "react";
import {
  Button,
  DataTable,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  ToggleGroup,
} from "@eifi1/ui-kit";
import type { DataTableColumn } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.25: `edgeFade` on Table (the Description list & table page) and on DataTable (the
 * Data table page) — the measured edge fade ColumnRoleTable's preview drew in 0.24, as
 * the tables' own prop. Synthetic data only; figures formatted once with en-GB, so the
 * specimens do not move with the language.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface Payment {
  id: string;
  date: string;
  payee: string;
  reference: string;
  account: string;
  net: number;
  vat: number;
  status: string;
}

const PAYMENTS: Payment[] = [
  { id: "P-0001", date: "01 Feb 2026", payee: "Example Ltd", reference: "Invoice 0001", account: "6000 Rent", net: 1_200, vat: 0, status: "Booked" },
  { id: "P-0002", date: "03 Feb 2026", payee: "Sample Utilities", reference: "Account 000000", account: "6100 Energy", net: 84.5, vat: 16.9, status: "Booked" },
  { id: "P-0003", date: "07 Feb 2026", payee: "Test Insurance plc", reference: "Policy 000-000", account: "6300 Insurance", net: 312, vat: 0, status: "Open" },
  { id: "P-0004", date: "12 Feb 2026", payee: "Example Supplies", reference: "Order 0042", account: "6500 Office supplies", net: 47.2, vat: 9.44, status: "Booked" },
  { id: "P-0005", date: "19 Feb 2026", payee: "Sample Cleaning Co", reference: "Invoice 0007", account: "6200 Maintenance", net: 260, vat: 52, status: "Open" },
];

type Width = "phone" | "full";
type Direction = "ltr" | "rtl";

function Controls({
  fade,
  onFade,
  width,
  onWidth,
  widthLabel,
  direction,
  onDirection,
  extra,
}: {
  fade: boolean;
  onFade: (on: boolean) => void;
  width: Width;
  onWidth: (w: Width) => void;
  widthLabel: string;
  direction: Direction;
  onDirection: (d: Direction) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Switch label="edgeFade" checked={fade} onCheckedChange={onFade} />
      {extra}
      <ToggleGroup
        aria-label="Width"
        value={width}
        onChange={(next) => onWidth(next as Width)}
        options={[
          { value: "phone", label: widthLabel },
          { value: "full", label: "Full width" },
        ]}
      />
      <ToggleGroup
        aria-label="Direction"
        value={direction}
        onChange={(next) => onDirection(next as Direction)}
        options={[
          { value: "ltr", label: "LTR" },
          { value: "rtl", label: "RTL" },
        ]}
      />
    </div>
  );
}

export function TableEdgeFadeDemo() {
  const [fade, setFade] = useState(true);
  const [framed, setFramed] = useState(true);
  const [width, setWidth] = useState<Width>("phone");
  const [direction, setDirection] = useState<Direction>("ltr");
  return (
    <Example
      label="Table — edgeFade, a table wider than its box"
      hint="eight columns in a phone-wide box; scroll it sideways, or Tab to an Open button"
    >
      <div className="min-w-0 space-y-3">
        <Controls
          fade={fade}
          onFade={setFade}
          width={width}
          onWidth={setWidth}
          widthLabel="Phone (358px)"
          direction={direction}
          onDirection={setDirection}
          extra={<Switch label="framed" checked={framed} onCheckedChange={setFramed} />}
        />
        <div dir={direction} className={width === "phone" ? "max-w-[358px]" : undefined}>
          <Table edgeFade={fade} framed={framed} density="compact">
            <TableCaption>Payments, February 2026 (Example Ltd)</TableCaption>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Payee</TableHeaderCell>
                <TableHeaderCell>Reference</TableHeaderCell>
                <TableHeaderCell>Account</TableHeaderCell>
                <TableHeaderCell numeric>Net</TableHeaderCell>
                <TableHeaderCell numeric>VAT</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>
                  <span className="sr-only">Actions</span>
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {PAYMENTS.map((p) => (
                <TableRow key={p.id} valign="middle">
                  <TableCell className="whitespace-nowrap">{p.date}</TableCell>
                  <TableCell className="whitespace-nowrap">{p.payee}</TableCell>
                  <TableCell className="whitespace-nowrap">{p.reference}</TableCell>
                  <TableCell className="whitespace-nowrap">{p.account}</TableCell>
                  <TableCell numeric>{gbp(p.net)}</TableCell>
                  <TableCell numeric>{gbp(p.vat)}</TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" aria-label={`Open ${p.id}`}>
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Note>
        A table wider than its box scrolls inside it, and on a phone nothing said so: the
        columns simply ended at the edge. {code("edgeFade")} fades the edge with columns behind
        it — measured, so a table that fits is drawn exactly as without it; both edges once
        scrolled into the middle; the reading direction&apos;s end in RTL. It is the Tabs
        strip&apos;s fade, a {code("mask-image")}: no layout change, nothing to fade to, no
        animation; the wrapper&apos;s own scrollbars stay out of it. An Open button tabbed to
        behind the fade is scrolled clear of it, and while the scroll box itself holds keyboard
        focus the fade lifts so its outline is drawn whole. The wrapper says{" "}
        {code('data-overflow="start" | "end" | "both"')}. ColumnRoleTable&apos;s preview (0.24)
        is this prop.
      </Note>
    </Example>
  );
}

const COLUMNS: DataTableColumn<Payment>[] = [
  { key: "id", header: "No.", cell: (r) => r.id, sortBy: (r) => r.id, className: "whitespace-nowrap tabular-nums" },
  { key: "date", header: "Date", cell: (r) => r.date, className: "whitespace-nowrap" },
  { key: "payee", header: "Payee", cell: (r) => r.payee, sortBy: (r) => r.payee, mobilePrimary: true, className: "whitespace-nowrap" },
  { key: "reference", header: "Reference", cell: (r) => r.reference, className: "whitespace-nowrap" },
  { key: "account", header: "Account", cell: (r) => r.account, className: "whitespace-nowrap" },
  {
    key: "net",
    header: "Net",
    cell: (r) => gbp(r.net),
    sortBy: (r) => r.net,
    className: "text-end tabular-nums whitespace-nowrap",
    headClassName: "text-end",
  },
  {
    key: "vat",
    header: "VAT",
    cell: (r) => gbp(r.vat),
    className: "text-end tabular-nums whitespace-nowrap",
    headClassName: "text-end",
  },
  {
    key: "gross",
    header: "Gross",
    cell: (r) => gbp(r.net + r.vat),
    className: "text-end tabular-nums whitespace-nowrap",
    headClassName: "text-end",
  },
  { key: "status", header: "Status", cell: (r) => r.status },
];

export function DataTableEdgeFadeDemo() {
  const [fade, setFade] = useState(true);
  const [width, setWidth] = useState<Width>("phone");
  const [direction, setDirection] = useState<Direction>("ltr");
  return (
    <Example
      label="DataTable — edgeFade on the desktop table"
      hint="nine columns and the row actions in a 640px box; on a phone the cards never scroll sideways"
    >
      <div className="min-w-0 space-y-3">
        <Controls
          fade={fade}
          onFade={setFade}
          width={width}
          onWidth={setWidth}
          widthLabel="Narrow (640px)"
          direction={direction}
          onDirection={setDirection}
        />
        <div dir={direction} className={width === "phone" ? "max-w-[640px]" : undefined}>
          <DataTable
            rows={PAYMENTS}
            columns={COLUMNS}
            rowKey={(r) => r.id}
            edgeFade={fade}
            chrome="minimal"
            paginated={false}
            density="compact"
            maxBodyHeight="12rem"
            labels={{ table: "Payments, February 2026" }}
            rowActions={[{ kind: "edit", onAction: () => {} }, { kind: "delete", onAction: () => {} }]}
          />
        </div>
      </div>
      <Note>
        DataTable draws its own {code("<table>")} rather than going through Table, so the prop
        is its own: the same measured fade on the desktop scroller, with that scroller&apos;s
        vertical scrollbar — at the inline end, in the very band that fades — kept whole. The
        sticky header and the rows fade together; a row action tabbed to behind the fade is
        scrolled clear of it. Off by default: it changes how every overflowing desktop table
        looks. The phone layout is a list of cards, which never scrolls sideways.
      </Note>
    </Example>
  );
}
