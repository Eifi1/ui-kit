import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useLocation } from "react-router";
import {
  Button,
  DataTable,
  DEFAULT_DATA_TABLE_LABELS,
  FilterPopover,
  PAGE_SIZE_OPTIONS,
  Pagination,
  cn,
  decodeFilterValue,
  decodeFilterValueOfType,
  decodeSorts,
  defaultFilterState,
  encodeFilterValue,
  encodeSorts,
  isFilterActive,
  nextSorts,
  normalizeSorts,
  resolveDataTableLabels,
  resolveFilter,
  rowMatches,
} from "@eifi1/ui-kit";
import type {
  ColumnFilter,
  DataTableColumn,
  FilterState,
  SortState,
} from "@eifi1/ui-kit";
import { shiftIso } from "@eifi1/ui-kit/dates";
import { ConstList, Example, Note, OutTable, Row } from "../lib/section";

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

type Status = "open" | "review" | "blocked" | "done" | "archived";

interface TableRow {
  id: string;
  name: string;
  opened: string;
  status: Status;
  amount: number;
}

const RAW: Array<[name: string, daysAgo: number, status: Status, amount: number]> = [
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

const ROWS: TableRow[] = RAW.map(([name, daysAgo, status, amount], i) => ({
  id: `R-${String(i + 1).padStart(3, "0")}`,
  name,
  opened: shiftIso(-daysAgo),
  status,
  amount,
}));

const ARCHIVED_COUNT = ROWS.filter((r) => r.status === "archived").length;

/** Deliberately not `Object.keys` of a map: this order IS the sort order the
 *  status column sorts by, and alphabetical ("archived" first) would be wrong. */
const STATUS_ORDER: Status[] = ["open", "review", "blocked", "done", "archived"];

const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  review: "In review",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived",
};

/** Chart tokens rather than fixed colours, so the dots re-skin with the palette
 *  like everything else on the page. */
const STATUS_DOT: Record<Status, string> = {
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
const STATUS_OPTIONS: { value: string; label: string }[] = STATUS_ORDER.map((s) => ({
  value: s,
  label: STATUS_LABEL[s],
}));

const AMOUNT_FMT = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function StatusPill({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-surface-2)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function Amount({ value }: { value: number }) {
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

const OPENED_FILTER: ColumnFilter<TableRow> = {
  type: "date",
  getValue: (r) => r.opened,
};

const STATUS_FILTER: ColumnFilter<TableRow> = {
  type: "select",
  getValue: (r) => r.status,
  options: STATUS_OPTIONS,
};

const AMOUNT_FILTER: ColumnFilter<TableRow> = {
  type: "number",
  getValue: (r) => r.amount,
};

const ID_COL: DataTableColumn<TableRow> = {
  key: "id",
  header: "ID",
  cell: (r) => <span className="font-mono text-xs text-[var(--text-muted)]">{r.id}</span>,
  sortBy: (r) => r.id,
  className: "whitespace-nowrap",
  // Exactly the "noisy detail" the prop's own note names: an id earns its column
  // on a wide screen and only crowds a phone card.
  mobileHidden: true,
};

const NAME_COL: DataTableColumn<TableRow> = {
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

const OPENED_COL: DataTableColumn<TableRow> = {
  key: "opened",
  header: "Opened",
  cell: (r) => <span className="tabular-nums">{r.opened}</span>,
  // ISO-8601 sorts lexically, so no Date is constructed per comparison.
  sortBy: (r) => r.opened,
  filter: OPENED_FILTER,
  className: "whitespace-nowrap",
};

const STATUS_COL: DataTableColumn<TableRow> = {
  key: "status",
  header: "Status",
  cell: (r) => <StatusPill status={r.status} />,
  sortBy: (r) => STATUS_ORDER.indexOf(r.status),
  filter: STATUS_FILTER,
};

const AMOUNT_COL: DataTableColumn<TableRow> = {
  key: "amount",
  header: "Amount",
  cell: (r) => <Amount value={r.amount} />,
  sortBy: (r) => r.amount,
  filter: AMOUNT_FILTER,
  className: "text-right tabular-nums whitespace-nowrap",
  // `text-right` in `headClassName` is load-bearing, not decoration: the header
  // sniffs it and flips its own flex row, so the sort arrow and filter funnel sit
  // to the LEFT of the label and stay next to the numbers they belong to.
  headClassName: "text-right",
};

const COLUMNS: DataTableColumn<TableRow>[] = [
  ID_COL,
  NAME_COL,
  OPENED_COL,
  STATUS_COL,
  AMOUNT_COL,
];

/** A row that is locked against bulk actions — `selection.isSelectable` renders no
 *  checkbox for it and select-all skips it. */
const isSelectable = (row: TableRow) => row.status !== "archived";

export function DataTableSection() {
  return (
    <>
      <Note>
        <strong>
          A Router is a hard requirement, with or without{" "}
          <code className="font-mono">urlSync</code>.
        </strong>{" "}
        <code className="font-mono">DataTable</code> calls{" "}
        <code className="font-mono">useSearchParams()</code> unconditionally at the top of
        the component — the flag only decides whether anything is ever written back. Mount
        it outside a router and it throws on the first render, so a consumer that has no
        routing at all still has to wrap the table in a{" "}
        <code className="font-mono">MemoryRouter</code>.
      </Note>
      <MainTable />
      <UrlSyncTable />
      <PaginationSpecimen />
      <FilterPopoverSpecimen />
      <LabelsSpecimen />
      <HelperTable />
    </>
  );
}

/* ── the kitchen-sink table ──────────────────────────────────────────────── */

function MainTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [hideArchived, setHideArchived] = useState(false);

  const rows = useMemo(
    () => (hideArchived ? ROWS.filter((r) => r.status !== "archived") : ROWS),
    [hideArchived],
  );
  // Select-all is measured against the rows the table was GIVEN, not the page on
  // screen: the table owns the paging, so the header checkbox is the only place
  // that could claim "all" while 15 rows sit on page two. The kit deliberately
  // leaves this to the caller — `allSelected` is a boolean it renders, not one it
  // computes.
  const selectable = useMemo(() => rows.filter(isSelectable), [rows]);
  const selectedCount = selectable.filter((r) => selected.has(r.id)).length;

  return (
    <Example
      label="DataTable — the whole surface"
      hint="click a row to expand · ⌘/Ctrl- or Shift-click to select · the header sticks because the body is capped"
    >
      <Row className="mb-3 justify-between">
        <span className="text-xs text-[var(--text-secondary)]">
          {selectedCount} of {selectable.length} selectable rows selected
          {ARCHIVED_COUNT > 0 && ` · ${ARCHIVED_COUNT} archived rows carry no checkbox`}
        </span>
        <Button
          variant="secondary"
          className="px-2 py-1 text-xs"
          disabled={selectedCount === 0}
          onClick={() => setSelected(new Set())}
        >
          Clear selection
        </Button>
      </Row>

      <DataTable
        rows={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        defaultPageSize={10}
        // 25 rows over three pages, so the pager is a control rather than an
        // ornament. Kept to a value that IS in PAGE_SIZE_OPTIONS — see the note
        // under the pager below.
        maxBodyHeight="20rem"
        locale="en-GB"
        storageKey="showcase-data-table"
        storageKeyPrefix="uikit-showcase:"
        onRowClick={(r) => setExpandedId((cur) => (cur === r.id ? null : r.id))}
        isExpanded={(r) => r.id === expandedId}
        expandedRow={(r) => (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-[var(--text-muted)]">Identifier</dt>
            <dd className="font-mono text-[var(--text-primary)]">{r.id}</dd>
            <dt className="text-[var(--text-muted)]">Opened</dt>
            <dd className="text-[var(--text-primary)]">{r.opened}</dd>
            <dt className="text-[var(--text-muted)]">Status</dt>
            <dd className="text-[var(--text-primary)]">{STATUS_LABEL[r.status]}</dd>
            <dt className="text-[var(--text-muted)]">Amount</dt>
            <dd className="text-[var(--text-primary)]">{AMOUNT_FMT.format(r.amount)}</dd>
          </dl>
        )}
        // The expansion is local component state, so it has no address — except
        // that this page IS the address here, which is the one case the prop's
        // note allows. Archived rows return undefined: a row with nowhere to go
        // gets no anchor rather than a dead one.
        rowHref={(r) => (r.status === "archived" ? undefined : `#/data-table/${r.id}`)}
        rowClassName={(r) => (r.status === "archived" ? "opacity-60" : undefined)}
        // Not styling — attributes that have to land on the row element itself.
        // The undefined branch is dropped rather than stringified, which is why a
        // per-row conditional needs no filtering here.
        rowAttributes={(r) => ({
          "data-status": r.status,
          "data-archived": r.status === "archived" ? "true" : undefined,
        })}
        leadingRow={
          <button
            type="button"
            onClick={() => setHideArchived((v) => !v)}
            aria-expanded={!hideArchived}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]"
          >
            {hideArchived ? (
              <ChevronRight aria-hidden className="size-3.5" />
            ) : (
              <ChevronDown aria-hidden className="size-3.5" />
            )}
            {hideArchived
              ? `Show ${ARCHIVED_COUNT} archived rows`
              : `Hide ${ARCHIVED_COUNT} archived rows`}
          </button>
        }
        selection={{
          isSelectable,
          isSelected: (r) => selected.has(r.id),
          onToggle: (r, checked) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (checked) next.add(r.id);
              else next.delete(r.id);
              return next;
            }),
          allSelected: selectable.length > 0 && selectedCount === selectable.length,
          someSelected: selectedCount > 0,
          onToggleAll: (checked) =>
            setSelected(checked ? new Set(selectable.map((r) => r.id)) : new Set()),
        }}
        // Phones open the detail in a full-screen dialog instead of unfolding it
        // under the row; desktop always unfolds. Nothing to see above 768px.
        mobileExpandAsDialog
        empty={
          <span className="text-[var(--text-secondary)]">
            No rows match the current filters.
          </span>
        }
      />

      <div className="mt-3 space-y-2">
        <Note>
          The column panel is the vertical <em>Columns (n/m)</em> strip on the right edge:
          it hides columns, and <em>Auto-size columns</em> freezes every visible column to
          its measured width except the last, which is left elastic to absorb the slack.
          Drag the hairline at a header's right edge to resize by hand; double-click it to
          give that one column its width back.
        </Note>
        <Note>
          This table passes <code className="font-mono">storageKey</code>, so sort, filters,
          page size, column widths and hidden columns are written to{" "}
          <code className="font-mono">uikit-showcase:showcase-data-table</code> and survive a
          reload. If you return to this page and a column is missing, that is the feature —
          re-tick it in the panel. The default prefix is{" "}
          <code className="font-mono">hbui-table:</code>; it is a prop so several apps can
          share one localStorage origin without colliding.
        </Note>
        <Note>
          Selection and the row link share the modifier keys, and the link wins:{" "}
          <code className="font-mono">rowHref</code> wraps the{" "}
          <code className="font-mono">mobilePrimary</code> cell (Name) in a real anchor, so
          ⌘/Ctrl-clicking <em>that cell</em> opens a tab instead of selecting the row — the
          anchor stops the click rather than letting the row change under a navigation.
          ⌘/Ctrl-click anywhere else in the row still selects. A cell that renders its own
          link must set <code className="font-mono">noRowLink</code> so the anchor skips it;
          nesting two anchors disables the inner one outright.
        </Note>
        <Note>
          Not shown, and why: <code className="font-mono">fillHeight</code> needs a parent
          with a bounded height to flex into (this page scrolls, so{" "}
          <code className="font-mono">maxBodyHeight</code> is the honest choice here);{" "}
          <code className="font-mono">mobileGroupBy</code> requires rows already ordered so
          equal keys are contiguous, i.e. a matching default sort;{" "}
          <code className="font-mono">serverPagination</code> replaces client filtering and
          sorting wholesale and needs a server to be about.
        </Note>
      </div>
    </Example>
  );
}

/* ── urlSync ─────────────────────────────────────────────────────────────── */

const SMALL_ROWS = ROWS.slice(0, 12);

const SMALL_COLUMNS: DataTableColumn<TableRow>[] = [NAME_COL, STATUS_COL, AMOUNT_COL];

function UrlSyncTable() {
  // Sort is CONTROLLED here (`sorts` + `onSortsChange`), which is the other half
  // worth seeing: the table renders the array it is handed and reports clicks
  // back, and urlSync mirrors that same array. One source, two readouts.
  const [sorts, setSorts] = useState<SortState[]>([{ key: "amount", dir: "desc" }]);
  const { search } = useLocation();

  return (
    <Example
      label="urlSync — the view lives in the address"
      hint="sort, filter or page this table and watch the hash query below change"
    >
      <DataTable
        rows={SMALL_ROWS}
        columns={SMALL_COLUMNS}
        rowKey={(r) => r.id}
        urlSync
        defaultPageSize={10}
        sorts={sorts}
        onSortsChange={setSorts}
        // No `labels` prop: the showcase's <UiKitProvider> hands every table on the page
        // the active language, including the calendar inside the date filter, which a
        // prop at this call site could never reach.
      />

      <div className="mt-3 space-y-2">
        <OutTable
          rows={[
            ["location.search", search || "— (defaults: nothing to say)"],
            ["sorts (controlled)", JSON.stringify(sorts)],
            ["managed params", "f.<column>, sort, p, ps"],
          ]}
        />
        <Note>
          Only non-default state is written: page 1 drops <code className="font-mono">p</code>
          , a page size equal to <code className="font-mono">defaultPageSize</code> drops{" "}
          <code className="font-mono">ps</code>, and a filter at its empty value drops{" "}
          <code className="font-mono">f.&lt;column&gt;</code> — so an untouched table leaves
          the URL alone. Every write is <code className="font-mono">replace: true</code>:
          sorting a table is not a history entry you want to press Back through.
        </Note>
        <Note>
          The URL is read exactly <em>once</em>, on mount, and only ever written afterwards.
          That is what stops the browser's own history fighting the user's next click — but
          it also means editing the address by hand does nothing until you reload.
        </Note>
      </div>
    </Example>
  );
}

/* ── Pagination, standalone ──────────────────────────────────────────────── */

function PaginationSpecimen() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const total = 137;
  // "All" arrives as Infinity, so the page maths has to survive it: one page,
  // and the range summary collapses to a bare count.
  const totalPages = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  return (
    <Example
      label="Pagination"
      hint="the DataTable's footer, usable on its own — 137 imaginary rows"
    >
      <Pagination
        page={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        total={total}
        onPage={setPage}
        onPageSize={(n) => {
          setPageSize(n);
          setPage(0);
        }}
      />
      <div className="mt-3 space-y-2">
        <OutTable
          rows={[
            ["PAGE_SIZE_OPTIONS", PAGE_SIZE_OPTIONS.join(", ")],
            ["page (0-based)", String(safePage)],
            ["…rendered as", String(safePage + 1)],
            ["pageSize", pageSize === Infinity ? 'Infinity — the "All" option' : String(pageSize)],
            ["totalPages", String(totalPages)],
          ]}
        />
        <Note>
          The page strip is windowed: up to seven pages are all shown, beyond that it is
          first, last and ±2 around the current page with an ellipsis across the gap. Jump
          to page 7 of 14 to see both ellipses at once.
        </Note>
        <Note>
          <code className="font-mono">page</code> is 0-based in the props and 1-based on the
          buttons, and the size select offers exactly{" "}
          <code className="font-mono">PAGE_SIZE_OPTIONS</code> plus “All”. A{" "}
          <code className="font-mono">defaultPageSize</code> that is not one of those five
          values leaves the select showing nothing at all, because no{" "}
          <code className="font-mono">&lt;option&gt;</code> matches it.
        </Note>
      </div>
    </Example>
  );
}

/* ── FilterPopover, standalone ───────────────────────────────────────────── */

/** The columns that actually have a filter, paired with the resolved config —
 *  `resolveFilter` is the only thing that knows `filterBy` is shorthand for a
 *  text filter, so it is what decides the list. */
const FILTERABLE: Array<{ col: DataTableColumn<TableRow>; filter: ColumnFilter<TableRow> }> =
  COLUMNS.flatMap((col) => {
    const filter = resolveFilter(col);
    return filter ? [{ col, filter }] : [];
  });

function FilterPopoverSpecimen() {
  const [state, setState] = useState<FilterState>({});
  // Mounted on demand, one at a time, because that is how the table mounts them —
  // and because it has to be. `FilterPopover` hard-codes `autoFocus` on its text
  // input (data-table-filter-popover.tsx:58), which is right for popover content
  // and unavoidable anywhere else: React's `autoFocus` is not the HTML attribute,
  // it is an imperative `.focus()` after mount. Rendered always-open in a long
  // page, that one input pulled focus on load and scrolled this page 25,000px
  // down to itself before the reader saw anything.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const labels = resolveDataTableLabels({ filterPlaceholder: "Type to narrow…" });

  const encoded: Array<[string, ReactNode]> = FILTERABLE.map(({ col, filter }) => {
    const value = state[col.key] ?? defaultFilterState(filter);
    return [`f.${col.key}`, encodeFilterValue(value) ?? "— (inactive, so nothing is written)"];
  });

  return (
    <Example
      label="FilterPopover"
      hint="the contents of a column's filter popover — one per filter type, driving the encoded value underneath"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {FILTERABLE.map(({ col, filter }) => (
          <div
            key={col.key}
            className={cn(
              "rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3",
              // The date variant is the one the table opens at a fixed 420px: a
              // preset column beside a calendar does not fold into half a grid.
              filter.type === "date" && "md:col-span-2",
            )}
          >
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <button
                type="button"
                onClick={() => setOpenKey((k) => (k === col.key ? null : col.key))}
                aria-expanded={openKey === col.key}
                className="text-xs font-medium text-[var(--brand)] hover:underline"
              >
                {col.header}
              </button>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {filter.type}
                {col.filterBy && !col.filter && " (via filterBy)"}
              </span>
            </div>
            {openKey !== col.key ? (
              <p className="text-xs text-[var(--text-muted)]">
                Closed — the state below is still live.
              </p>
            ) : (
            <FilterPopover
              column={col}
              state={state[col.key] ?? defaultFilterState(filter)}
              onChange={(next) => setState((prev) => ({ ...prev, [col.key]: next }))}
              onClear={() =>
                setState((prev) => {
                  const rest = { ...prev };
                  delete rest[col.key];
                  return rest;
                })
              }
              // NOT derived from the rows by this component: the table computes
              // the option list (from `filter.options`, or from the distinct
              // values it can see) and passes it down. On its own, FilterPopover
              // shows an empty checklist for a select column that is handed none.
              selectOptions={filter.type === "select" ? STATUS_OPTIONS : []}
              locale="en-GB"
              labels={labels}
            />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <OutTable rows={encoded} />
        <Note>
          Open one with its column name. They mount closed because{" "}
          <code className="font-mono">FilterPopover</code> hard-codes{" "}
          <code className="font-mono">autoFocus</code> on the text input — correct for
          popover content, and a real constraint on embedding it anywhere else: a
          consumer who renders it inline gets focus pulled to it on mount, with no prop
          to opt out.
        </Note>
        <Note>
          <code className="font-mono">FilterPopover</code> and{" "}
          <code className="font-mono">Pagination</code> take a <em>complete</em>{" "}
          <code className="font-mono">DataTableLabels</code>, while{" "}
          <code className="font-mono">DataTable</code> takes a{" "}
          <code className="font-mono">Partial</code> and merges it for you. Rendering one of
          these two directly means calling{" "}
          <code className="font-mono">resolveDataTableLabels(yourOverrides)</code> first —
          which is what this specimen does to change the text placeholder.
        </Note>
        <Note>
          Ticking <em>Absolute value</em> on Amount with no min and no max marks the column
          as filtered and writes <code className="font-mono">f.amount=..!</code>, but every
          row still passes: with no bound to compare against, the absolute value changes
          nothing.
        </Note>
      </div>
    </Example>
  );
}

/* ── labels ──────────────────────────────────────────────────────────────── */

/** Every string the suite can show, minus `presets` (an object, listed below).
 *  This IS the translation surface: a consumer that covers these keys has no
 *  English left anywhere in the table. */
const LABEL_ITEMS: Array<[string, string]> = Object.entries(DEFAULT_DATA_TABLE_LABELS).flatMap(
  ([key, value]) => (typeof value === "string" ? [[key, value] as [string, string]] : []),
);

const PRESET_ITEMS: Array<[string, string]> = Object.entries(DEFAULT_DATA_TABLE_LABELS.presets);

const MERGED = resolveDataTableLabels({
  columns: "Spalten",
  presets: { today: "Heute" },
});

function LabelsSpecimen() {
  return (
    <Example
      label="DEFAULT_DATA_TABLE_LABELS / resolveDataTableLabels"
      hint="the package ships no i18n — every string is a prop, with English defaults"
    >
      <OutTable
        rows={[
          [
            "resolveDataTableLabels() === DEFAULT_DATA_TABLE_LABELS",
            String(resolveDataTableLabels() === DEFAULT_DATA_TABLE_LABELS),
          ],
          ['resolveDataTableLabels({ columns: "Spalten" }).columns', MERGED.columns],
          ["…and an untouched key", MERGED.filter],
          ['…presets: { today: "Heute" } → presets.today', MERGED.presets.today],
          ["…presets.last_week (merged, not replaced)", MERGED.presets.last_week],
        ]}
      />
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-medium text-[var(--text-primary)]">
            DataTableLabels
          </div>
          <ConstList items={LABEL_ITEMS} />
        </div>
        <div>
          <div className="mb-2 text-xs font-medium text-[var(--text-primary)]">
            …presets, keyed by the key <code className="font-mono">dateRangePresets()</code>{" "}
            returns
          </div>
          <ConstList items={PRESET_ITEMS} />
        </div>
      </div>
      <div className="mt-3">
        <Note>
          Passing no argument returns the default object <em>itself</em>, not a copy — the
          merge only happens when there is something to merge, so the common case allocates
          nothing. Nested <code className="font-mono">presets</code> are merged key by key,
          so translating one preset does not blank the other ten.
        </Note>
      </div>
    </Example>
  );
}

/* ── pure helpers ────────────────────────────────────────────────────────── */

const j = (v: unknown) => JSON.stringify(v);

const ASC: SortState[] = [{ key: "name", dir: "asc" }];
const DESC: SortState[] = [{ key: "name", dir: "desc" }];
const VALID_KEYS = new Set(COLUMNS.map((c) => c.key));

function HelperTable() {
  return (
    <Example
      label="The pure helpers"
      hint="every value below is computed at render — nothing here is a transcript"
    >
      <OutTable
        rows={[
          ["resolveFilter(NAME_COL)?.type", String(resolveFilter(NAME_COL)?.type)],
          ["resolveFilter(ID_COL)", String(resolveFilter(ID_COL))],
          ['isFilterActive({ type: "text", q: "   " })', String(isFilterActive({ type: "text", q: "   " }))],
          [
            'isFilterActive({ type: "number", min: "", max: "", abs: true })',
            String(isFilterActive({ type: "number", min: "", max: "", abs: true })),
          ],
          ["isFilterActive(undefined)", String(isFilterActive(undefined))],
          [
            'rowMatches(STATUS_COL, ROWS[0], { values: ["open"] })',
            String(rowMatches(STATUS_COL, ROWS[0], { type: "select", values: ["open"] })),
          ],
          [
            'rowMatches(ID_COL, ROWS[0], { q: "nonsense" })',
            String(rowMatches(ID_COL, ROWS[0], { type: "text", q: "nonsense" })),
          ],
          ["defaultFilterState(AMOUNT_FILTER)", j(defaultFilterState(AMOUNT_FILTER))],
          ["defaultFilterState(OPENED_FILTER)", j(defaultFilterState(OPENED_FILTER))],
          [
            'encodeFilterValue({ type: "text", q: "   " })',
            String(encodeFilterValue({ type: "text", q: "   " })),
          ],
          [
            'encodeFilterValue({ type: "date", from: "2026-01-01", to: "" })',
            String(encodeFilterValue({ type: "date", from: "2026-01-01", to: "" })),
          ],
          [
            'encodeFilterValue({ type: "number", min: "", max: "50", abs: true })',
            String(encodeFilterValue({ type: "number", min: "", max: "50", abs: true })),
          ],
          [
            'encodeFilterValue({ type: "select", values: ["a,b", "100%"] })',
            String(encodeFilterValue({ type: "select", values: ["a,b", "100%"] })),
          ],
          [
            'decodeFilterValue(STATUS_FILTER, "a%2Cb,100%25")',
            j(decodeFilterValue(STATUS_FILTER, "a%2Cb,100%25")),
          ],
          [
            'decodeFilterValueOfType("number", "..50!")',
            j(decodeFilterValueOfType("number", "..50!")),
          ],
          [
            'normalizeSorts({ key: "opened", dir: "desc" })',
            j(normalizeSorts({ key: "opened", dir: "desc" })),
          ],
          [
            'normalizeSorts([{ key: "a" }, { key: "a", dir: "desc" }, null])',
            j(normalizeSorts([{ key: "a" }, { key: "a", dir: "desc" }, null])),
          ],
          ['nextSorts([], "name", false)', j(nextSorts([], "name", false))],
          ['nextSorts(ASC, "name", false)', j(nextSorts(ASC, "name", false))],
          ['nextSorts(DESC, "name", false)', j(nextSorts(DESC, "name", false))],
          ['nextSorts(ASC, "amount", true) // shift-click', j(nextSorts(ASC, "amount", true))],
          [
            'encodeSorts([{ opened, desc }, { name, asc }])',
            String(encodeSorts([{ key: "opened", dir: "desc" }, { key: "name", dir: "asc" }])),
          ],
          ["encodeSorts([])", String(encodeSorts([]))],
          [
            'decodeSorts("opened.desc,ghost,name", validKeys)',
            j(decodeSorts("opened.desc,ghost,name", VALID_KEYS)),
          ],
        ]}
      />
      <div className="mt-3 space-y-2">
        <Note>
          The select codec escapes only <code className="font-mono">,</code> and{" "}
          <code className="font-mono">%</code>, not the whole string: these values sit inside
          a query parameter that <code className="font-mono">URLSearchParams</code> already
          encodes, and a second pass would turn every space into{" "}
          <code className="font-mono">%2520</code>. The comma is the one character that could
          be misread, because it is the separator.
        </Note>
        <Note>
          <code className="font-mono">normalizeSorts</code> exists for the blobs written
          before the table could sort by more than one column: a lone{" "}
          <code className="font-mono">{"{ key, dir }"}</code> object comes back as a
          one-element list, and duplicate or malformed entries are dropped rather than
          thrown on. <code className="font-mono">decodeSorts</code> is the same idea for a
          URL a user may have edited — it takes the set of real column keys and silently
          drops anything else.
        </Note>
        <Note>
          Plain click cycles the single sort asc → desc → none; Shift-click{" "}
          (<code className="font-mono">additive</code>) appends a second key, then cycles
          that one in place. That is the whole of the header's click semantics, and it is a
          pure function you can test without rendering a table.
        </Note>
      </div>
    </Example>
  );
}
