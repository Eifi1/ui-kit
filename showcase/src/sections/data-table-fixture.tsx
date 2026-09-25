import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@eifi1/ui-kit";
import type { ColumnFilter, DataTableColumn } from "@eifi1/ui-kit";
import { shiftIso } from "@eifi1/ui-kit/dates";
import { OutTable } from "../lib/section";

/**
 * The fixture, the columns and the small helpers the three data-table pages share —
 * "Data table", "Data table: server, URL & phone" and "Data table: parts & helpers" were
 * one page, and the helper table on the third feeds `resolveFilter` the very same column
 * objects the tables on the first two render. One module, so they cannot drift apart.
 */

/* ── fixture ─────────────────────────────────────────────────────────────────
 * Domain-free on purpose — mineral names, a date, a status and a signed number —
 * because every real consumer of this table is a ledger, and a showcase that
 * looked like one would document the ledger rather than the component.
 *
 * The dates are relative to TODAY (`shiftIso`) rather than written out. The date
 * filter's preset column offers "Last 7 days" / "This month" / "Year to date",
 * and against a frozen fixture every one of those buttons would empty the table —
 * which reads as a broken filter, not as a stale fixture.
 */

export type Status = "open" | "review" | "blocked" | "done" | "archived";

export interface TableRow {
  id: string;
  name: string;
  opened: string;
  status: Status;
  amount: number;
}

export const RAW: Array<[name: string, daysAgo: number, status: Status, amount: number]> = [
  ["Aster", 0, "open", 1240],
  ["Basalt", 1, "review", -320.5],
  ["Cobalt", 2, "open", 87],
  ["Dune", 3, "done", 512.4],
  ["Ember", 5, "blocked", -1180],
  ["Flint", 6, "open", 64.2],
  ["Garnet", 8, "review", 930],
  ["Halite", 11, "archived", -45],
  ["Indigo", 13, "open", 275.75],
  ["Jasper", 16, "done", -640],
  ["Kaolin", 19, "review", 1502],
  ["Lignite", 22, "open", -12.4],
  ["Marl", 26, "blocked", 408],
  ["Nacre", 29, "archived", 73.9],
  ["Onyx", 33, "done", -2105],
  ["Pumice", 38, "open", 19],
  ["Quartz", 41, "review", 860.25],
  ["Rutile", 47, "open", -358],
  ["Serpentine", 52, "done", 1075],
  ["Topaz", 58, "archived", -9.5],
  ["Umber", 64, "blocked", 240],
  ["Verdite", 71, "open", -775.6],
  ["Wulfenite", 83, "review", 3120],
  ["Xenotime", 96, "done", 55],
  ["Zircon", 112, "open", -430],
];

export const ROWS: TableRow[] = RAW.map(([name, daysAgo, status, amount], i) => ({
  id: `R-${String(i + 1).padStart(3, "0")}`,
  name,
  opened: shiftIso(-daysAgo),
  status,
  amount,
}));

export const ARCHIVED_COUNT = ROWS.filter((r) => r.status === "archived").length;

/** Deliberately not `Object.keys` of a map: this order IS the sort order the
 *  status column sorts by, and alphabetical ("archived" first) would be wrong. */
export const STATUS_ORDER: Status[] = ["open", "review", "blocked", "done", "archived"];

export const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  review: "In review",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived",
};

/** Chart tokens rather than fixed colours, so the dots re-skin with the palette
 *  like everything else on the page. */
export const STATUS_DOT: Record<Status, string> = {
  open: "bg-[var(--chart-3)]",
  review: "bg-[var(--chart-6)]",
  blocked: "bg-[var(--chart-7)]",
  done: "bg-[var(--chart-4)]",
  archived: "bg-[var(--text-muted)]",
};

/** The `options` a select filter is given. The labels differ from the values on
 *  purpose: the value is what the row holds and what lands in `f.status=` in the
 *  URL, the label is only ever shown — conflating the two is how a translated
 *  table ends up with untranslatable links. */
export const STATUS_OPTIONS: { value: string; label: string }[] = STATUS_ORDER.map((s) => ({
  value: s,
  label: STATUS_LABEL[s],
}));

export const AMOUNT_FMT = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-surface-2)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Amount({ value }: { value: number }) {
  // The kit's signed-number pair, not a red/green of our own: the same two tokens
  // the money field uses, so a palette that retunes one retunes both.
  return (
    <span
      className={value < 0 ? "text-[var(--money-expense)]" : "text-[var(--money-income)]"}
    >
      {AMOUNT_FMT.format(value)}
    </span>
  );
}

/* ── columns ─────────────────────────────────────────────────────────────────
 * Each filter config is a named const as well as a column field, because the
 * helper table at the bottom of this section feeds the very same objects to
 * `resolveFilter` / `decodeFilterValue`. Two copies would let the demonstration
 * drift away from the table it claims to describe.
 */

export const OPENED_FILTER: ColumnFilter<TableRow> = {
  type: "date",
  getValue: (r) => r.opened,
};

export const STATUS_FILTER: ColumnFilter<TableRow> = {
  type: "select",
  getValue: (r) => r.status,
  options: STATUS_OPTIONS,
};

export const AMOUNT_FILTER: ColumnFilter<TableRow> = {
  type: "number",
  getValue: (r) => r.amount,
};

export const ID_COL: DataTableColumn<TableRow> = {
  key: "id",
  header: "ID",
  cell: (r) => <span className="font-mono text-xs text-[var(--text-muted)]">{r.id}</span>,
  sortBy: (r) => r.id,
  className: "whitespace-nowrap",
  // Exactly the "noisy detail" the prop's own note names: an id earns its column
  // on a wide screen and only crowds a phone card.
  mobileHidden: true,
};

export const NAME_COL: DataTableColumn<TableRow> = {
  key: "name",
  header: "Name",
  cell: (r) => r.name,
  // Sort on the folded case, or "Zircon" and "aster" interleave by code point.
  sortBy: (r) => r.name.toLowerCase(),
  // `filterBy` rather than a full `filter`: `resolveFilter` falls back to a text
  // filter over it, which is the shortest way to give a column one.
  filterBy: (r) => r.name,
  // The row's headline: rendered bold and unlabelled at the top of the phone
  // card, and the cell that carries the row's anchor on desktop.
  mobilePrimary: true,
};

export const OPENED_COL: DataTableColumn<TableRow> = {
  key: "opened",
  header: "Opened",
  cell: (r) => <span className="tabular-nums">{r.opened}</span>,
  // ISO-8601 sorts lexically, so no Date is constructed per comparison.
  sortBy: (r) => r.opened,
  filter: OPENED_FILTER,
  className: "whitespace-nowrap",
};

export const STATUS_COL: DataTableColumn<TableRow> = {
  key: "status",
  header: "Status",
  cell: (r) => <StatusPill status={r.status} />,
  sortBy: (r) => STATUS_ORDER.indexOf(r.status),
  filter: STATUS_FILTER,
};

export const AMOUNT_COL: DataTableColumn<TableRow> = {
  key: "amount",
  header: "Amount",
  cell: (r) => <Amount value={r.amount} />,
  sortBy: (r) => r.amount,
  filter: AMOUNT_FILTER,
  className: "text-end tabular-nums whitespace-nowrap",
  // `text-end` in `headClassName` is load-bearing, not decoration: the header
  // sniffs it and flips its own flex row, so the sort arrow and filter funnel sit
  // BEFORE the label and stay next to the numbers they belong to — on the left in
  // LTR, on the right in RTL. A legacy `text-right` is rewritten to `text-end` by
  // the table, so pre-0.7 columns (see the line items on the Data table page) behave
  // the same.
  headClassName: "text-end",
};

export const COLUMNS: DataTableColumn<TableRow>[] = [
  ID_COL,
  NAME_COL,
  OPENED_COL,
  STATUS_COL,
  AMOUNT_COL,
];

/** A row that is locked against bulk actions — `selection.isSelectable` renders no
 *  checkbox for it and select-all skips it. */
export const isSelectable = (row: TableRow) => row.status !== "archived";

export const SMALL_ROWS = ROWS.slice(0, 12);

export const SMALL_COLUMNS: DataTableColumn<TableRow>[] = [NAME_COL, STATUS_COL, AMOUNT_COL];

/** One line per callback, newest first — so a click on the table has a visible
 *  consequence even where the table itself looks the same afterwards. */
export function useCallbackLog(max = 4) {
  const [log, setLog] = useState<string[]>([]);
  const record = (line: string) => setLog((l) => [line, ...l].slice(0, max));
  return { log, record };
}

export function CallbackLog({ log }: { log: string[] }) {
  return (
    <OutTable
      rows={
        log.length
          ? log.map((line, i) => [i === 0 ? "last callback" : "", line] as [string, ReactNode])
          : [["last callback", "— (interact with the table)"]]
      }
    />
  );
}

export const j = (v: unknown) => JSON.stringify(v);
