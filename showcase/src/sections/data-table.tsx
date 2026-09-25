import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Archive, Check, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
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
  missingDataTableLabels,
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
  SwipeAction,
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
      <ControlledTable />
      <ServerTable />
      <ShortTable />
      <FillHeightTable />
      <PhoneTable />
      <RtlTable />
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
      hint="click a row to expand · ⌘/Ctrl- or Shift-click to select · the header sticks because the body is capped · on a phone the rows become cards and the detail opens full-screen"
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
          What this table leaves to the examples below: controlled filters and{" "}
          <code className="font-mono">onToggleMany</code>,{" "}
          <code className="font-mono">serverPagination</code>,{" "}
          <code className="font-mono">paginated=&#123;false&#125;</code> with the{" "}
          <code className="font-mono">labels</code> prop and{" "}
          <code className="font-mono">noRowLink</code>,{" "}
          <code className="font-mono">fillHeight</code>, and the phone-only props (
          <code className="font-mono">mobileCard</code>,{" "}
          <code className="font-mono">mobileGroupBy</code>,{" "}
          <code className="font-mono">mobileSwipeActions</code>).
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
        <Note>
          On this page even the reload does nothing. The showcase runs under{" "}
          <code className="font-mono">HashRouter</code>, so the table <em>writes</em> into the
          hash (<code className="font-mono">#/data-table?sort=…</code>, via{" "}
          <code className="font-mono">useSearchParams</code>) but <em>reads</em> the initial
          view from <code className="font-mono">window.location.search</code>, which is empty
          here — a shared hash link opens on the default view and is then overwritten. Under a
          BrowserRouter both sides are the same query string and the round trip works.
        </Note>
      </div>
    </Example>
  );
}

/* ── controlled filters, selection callbacks ─────────────────────────────── */

/** One line per callback, newest first — so a click on the table has a visible
 *  consequence even where the table itself looks the same afterwards. */
function useCallbackLog(max = 4) {
  const [log, setLog] = useState<string[]>([]);
  const record = (line: string) => setLog((l) => [line, ...l].slice(0, max));
  return { log, record };
}

function CallbackLog({ log }: { log: string[] }) {
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

const statusValues = (f: FilterState): string[] => {
  const v = f.status;
  return v && v.type === "select" ? v.values : [];
};

function ControlledTable() {
  const [filters, setFilters] = useState<FilterState>({
    status: { type: "select", values: ["open"] },
  });
  const [sorts, setSorts] = useState<SortState[]>([{ key: "name", dir: "asc" }]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const { log, record } = useCallbackLog();

  const active = statusValues(filters);
  const toggleChip = (s: Status) => {
    const values = active.includes(s) ? active.filter((v) => v !== s) : [...active, s];
    setFilters((prev) => ({ ...prev, status: { type: "select", values } }));
  };

  const selectedCount = ROWS.filter((r) => selected.has(r.id)).length;

  return (
    <Example
      label="Controlled filters and selection callbacks"
      hint="the chips and the Status funnel edit the same state · Shift-click a second row to fire onToggleMany"
    >
      <Row className="mb-3">
        {STATUS_ORDER.map((s) => (
          <Button
            key={s}
            variant={active.includes(s) ? "primary" : "secondary"}
            className="px-2 py-1 text-xs"
            aria-pressed={active.includes(s)}
            onClick={() => toggleChip(s)}
          >
            {STATUS_LABEL[s]}
          </Button>
        ))}
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs"
          disabled={Object.keys(filters).length === 0}
          onClick={() => setFilters({})}
        >
          Reset filters
        </Button>
      </Row>

      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        defaultPageSize={10}
        maxBodyHeight="18rem"
        filters={filters}
        onFiltersChange={(next) => {
          record(`onFiltersChange(${j(next)})`);
          setFilters(next);
        }}
        sorts={sorts}
        onSortsChange={(next) => {
          record(`onSortsChange(${j(next)})`);
          setSorts(next);
        }}
        selection={{
          isSelected: (r) => selected.has(r.id),
          onToggle: (r, checked) => {
            record(`onToggle(${r.id}, ${checked})`);
            setSelected((prev) => {
              const next = new Set(prev);
              if (checked) next.add(r.id);
              else next.delete(r.id);
              return next;
            });
          },
          // One call for a whole Shift-range instead of one onToggle per row.
          onToggleMany: (rows, checked) => {
            record(`onToggleMany([${rows.map((r) => r.id).join(", ")}], ${checked})`);
            setSelected((prev) => {
              const next = new Set(prev);
              for (const r of rows) {
                if (checked) next.add(r.id);
                else next.delete(r.id);
              }
              return next;
            });
          },
          allSelected: selectedCount === ROWS.length,
          someSelected: selectedCount > 0,
          onToggleAll: (checked) => {
            record(`onToggleAll(${checked})`);
            setSelected(checked ? new Set(ROWS.map((r) => r.id)) : new Set());
          },
        }}
      />

      <div className="mt-3 space-y-2">
        <OutTable
          rows={[
            ["filters (owned by this page)", j(filters)],
            ["sorts (owned by this page)", j(sorts)],
            ["selected", `${selectedCount} of ${ROWS.length}`],
          ]}
        />
        <CallbackLog log={log} />
        <Note>
          With <code className="font-mono">onFiltersChange</code> set the table stops owning
          the filters: it renders <code className="font-mono">filters</code> as given and
          reports every edit. It also stops resetting the page on a filter change — that
          becomes the owner&apos;s job, and the owner cannot reach the table&apos;s page, so
          narrowing from page 3 only lands on page 1 because the page index is clamped.
        </Note>
      </div>
    </Example>
  );
}

/* ── serverPagination ────────────────────────────────────────────────────── */

/** A pretend 70-row server: the same fixture three times over, with fresh ids. */
const SERVER_ROWS: TableRow[] = [0, 1, 2].flatMap((batch) =>
  ROWS.slice(0, batch === 2 ? 20 : ROWS.length).map((r, i) => ({
    ...r,
    id: `S-${String(batch * 100 + i + 1).padStart(3, "0")}`,
    name: batch === 0 ? r.name : `${r.name} ${batch + 1}`,
  })),
);

const SERVER_COLUMNS: DataTableColumn<TableRow>[] = [NAME_COL, OPENED_COL, STATUS_COL, AMOUNT_COL];

interface ServerQuery {
  page: number;
  pageSize: number;
  filters: FilterState;
  sorts: SortState[];
}

/** What the "backend" does with a query — built from the kit's own pure helpers,
 *  which is also how a real server-side port would stay in step with the client. */
function runQuery(q: ServerQuery): { rows: TableRow[]; total: number } {
  let rows = SERVER_ROWS;
  for (const col of SERVER_COLUMNS) {
    const state = q.filters[col.key];
    if (state && isFilterActive(state)) rows = rows.filter((r) => rowMatches(col, r, state));
  }
  if (q.sorts.length) {
    rows = [...rows].sort((a, b) => {
      for (const s of q.sorts) {
        const by = SERVER_COLUMNS.find((c) => c.key === s.key)?.sortBy;
        if (!by) continue;
        const av = by(a) ?? "";
        const bv = by(b) ?? "";
        if (av < bv) return s.dir === "asc" ? -1 : 1;
        if (av > bv) return s.dir === "asc" ? 1 : -1;
      }
      return 0;
    });
  }
  const total = rows.length;
  if (q.pageSize === Infinity) return { rows, total };
  return { rows: rows.slice(q.page * q.pageSize, (q.page + 1) * q.pageSize), total };
}

function queryString(q: ServerQuery): string {
  const sp = new URLSearchParams();
  sp.set("page", String(q.page));
  sp.set("size", q.pageSize === Infinity ? "all" : String(q.pageSize));
  const sort = encodeSorts(q.sorts);
  if (sort) sp.set("sort", sort);
  for (const [key, value] of Object.entries(q.filters)) {
    const enc = encodeFilterValue(value);
    if (enc != null) sp.set(`f.${key}`, enc);
  }
  return `GET /rows?${decodeURIComponent(sp.toString())}`;
}

const INITIAL_QUERY: ServerQuery = { page: 0, pageSize: 10, filters: {}, sorts: [] };

function ServerTable() {
  const [query, setQuery] = useState<ServerQuery>(INITIAL_QUERY);
  const [result, setResult] = useState(() => runQuery(INITIAL_QUERY));
  const [loading, setLoading] = useState(false);
  const [takeOver, setTakeOver] = useState(true);
  const latest = useRef(0);
  const { log, record } = useCallbackLog(3);

  // Every change is a round trip: the table shows the old page until the new one
  // arrives 600ms later, exactly as it would over a network.
  const request = (patch: Partial<ServerQuery>, what: string) => {
    record(what);
    const next = { ...query, ...patch };
    setQuery(next);
    setLoading(true);
    const id = ++latest.current;
    window.setTimeout(() => {
      if (id !== latest.current) return; // a newer request superseded this one
      setResult(runQuery(next));
      setLoading(false);
    }, 600);
  };

  return (
    <Example
      label="serverPagination — the server owns the rows"
      hint="600ms simulated latency · uncheck the toggle to see the sort and filter controls disappear"
    >
      <Row className="mb-3 justify-between">
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={takeOver}
            onChange={(e) => {
              setTakeOver(e.target.checked);
              request({ page: 0, filters: {}, sorts: [] }, `takeOver = ${e.target.checked}`);
            }}
          />
          pass onFiltersChange / onSortsChange
        </label>
        <span
          role="status"
          className={cn("text-xs", loading ? "text-[var(--brand)]" : "text-[var(--text-muted)]")}
        >
          {loading ? "Loading… (the page's own indicator)" : `${result.total} rows on the server`}
        </span>
      </Row>

      <DataTable
        rows={result.rows}
        columns={SERVER_COLUMNS}
        rowKey={(r) => r.id}
        maxBodyHeight="18rem"
        rowClassName={() => (loading ? "opacity-50" : undefined)}
        serverPagination={{
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          isLoading: loading,
          onPageChange: (page) => request({ page }, `onPageChange(${page})`),
          onPageSizeChange: (pageSize) =>
            request({ pageSize, page: 0 }, `onPageSizeChange(${pageSize})`),
        }}
        {...(takeOver
          ? {
              filters: query.filters,
              // The page reset on a new filter is the owner's job in this mode.
              onFiltersChange: (filters: FilterState) =>
                request({ filters, page: 0 }, `onFiltersChange(${j(filters)})`),
              sorts: query.sorts,
              onSortsChange: (sorts: SortState[]) =>
                request({ sorts, page: 0 }, `onSortsChange(${j(sorts)})`),
            }
          : {})}
        empty="The server returned no rows for this query."
      />

      <div className="mt-3 space-y-2">
        <OutTable rows={[["request", queryString(query)]]} />
        <CallbackLog log={log} />
        <Note>
          In this mode the table renders <code className="font-mono">rows</code> as-is — no
          filtering, sorting or slicing — and the footer is driven by{" "}
          <code className="font-mono">page</code> / <code className="font-mono">pageSize</code>{" "}
          / <code className="font-mono">total</code>. Sort arrows and filter funnels only
          appear when the page takes them over; unchecked above, the headers are plain text.
          On a phone the pager stays (there is no endless scroll over rows that are not here).
        </Note>
        <Note>
          <code className="font-mono">serverPagination.isLoading</code> is passed here, and
          nothing in the table changes: the prop is declared but never read. The dimmed rows
          and the status line above are this page&apos;s own doing, through{" "}
          <code className="font-mono">rowClassName</code>.
        </Note>
      </div>
    </Example>
  );
}

/* ── a short table: paginated={false}, labels, noRowLink, empty ──────────── */

interface LineItem {
  id: string;
  item: string;
  qty: number;
  price: number;
  spec: string;
}

const LINE_ITEMS: LineItem[] = [
  { id: "L1", item: "Basalt tile, 30×30", qty: 12, price: 18.5, spec: "BT-30" },
  { id: "L2", item: "Cobalt glaze", qty: 2, price: 42, spec: "CG-2" },
  { id: "L3", item: "Flint grout", qty: 5, price: 9.9, spec: "FG-5" },
  { id: "L4", item: "Quartz sealant", qty: 1, price: 27.25, spec: "QS-1" },
];

const LINE_COLUMNS: DataTableColumn<LineItem>[] = [
  {
    key: "spec",
    header: "Spec sheet",
    // The cell owns a link of its own. Without `noRowLink` the row anchor would land
    // HERE (first column, no mobilePrimary) and nest <a> in <a>.
    cell: (r) => (
      <a
        href={`https://example.com/spec/${r.spec}`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-[var(--brand)] hover:underline"
      >
        {r.spec} <ExternalLink aria-hidden className="size-3" />
      </a>
    ),
    noRowLink: true,
    className: "whitespace-nowrap",
  },
  { key: "item", header: "Item", cell: (r) => r.item, sortBy: (r) => r.item, filterBy: (r) => r.item },
  {
    key: "qty",
    header: "Qty",
    cell: (r) => r.qty,
    sortBy: (r) => r.qty,
    className: "text-right tabular-nums",
    headClassName: "text-right",
  },
  {
    key: "total",
    header: "Line total",
    cell: (r) => AMOUNT_FMT.format(r.qty * r.price),
    sortBy: (r) => r.qty * r.price,
    className: "text-right tabular-nums",
    headClassName: "text-right",
  },
];

function ShortTable() {
  const [lines, setLines] = useState<LineItem[]>(LINE_ITEMS);
  const [opened, setOpened] = useState<string | null>(null);

  return (
    <Example
      label="A short table — paginated={false}, labels, noRowLink, empty"
      hint="no footer at all · middle-click an Item cell for a new tab · hover a header or the side rail for the relabelled strings"
    >
      <Row className="mb-3">
        <Button
          variant="secondary"
          className="px-2 py-1 text-xs"
          onClick={() => setLines((l) => (l.length ? [] : LINE_ITEMS))}
        >
          {lines.length ? "Remove every line" : "Restore the lines"}
        </Button>
      </Row>
      <DataTable
        rows={lines}
        columns={LINE_COLUMNS}
        rowKey={(r) => r.id}
        paginated={false}
        onRowClick={(r) => setOpened(r.id)}
        rowHref={(r) => `#/data-table/line/${r.id}`}
        labels={{
          table: "Line items",
          columns: "Fields",
          sortHint: "Click to order · Shift-click for a second key",
          filter: "Narrow",
          filterPlaceholder: "Item contains…",
          autoSize: "Fit fields to content",
        }}
        empty={
          <span className="text-[var(--text-secondary)]">
            No line items yet — the <code className="font-mono">empty</code> prop, not a “—”.
          </span>
        }
      />
      <div className="mt-3 space-y-2">
        <OutTable
          rows={[
            ["onRowClick", opened ?? "—"],
            ["accessible name (labels.table)", "Line items"],
          ]}
        />
        <Note>
          <code className="font-mono">rowHref</code> puts the row&apos;s anchor on the first
          column that does not set <code className="font-mono">noRowLink</code> — here Item,
          because Spec sheet renders its own link. On a phone the whole card would be the
          anchor, which a card with a linked cell cannot be, so it falls back to a
          role=&quot;button&quot; card and the spec link keeps working.
        </Note>
      </div>
    </Example>
  );
}

/* ── fillHeight ──────────────────────────────────────────────────────────── */

function FillHeightTable() {
  return (
    <Example
      label="fillHeight — a table in a bounded pane"
      hint="desktop only · the dashed box is a fixed 18rem flex column; the table fills it and scrolls inside"
    >
      <div className="flex h-72 flex-col rounded-md border border-dashed border-[var(--border)] p-2">
        <div className="pb-2 text-xs text-[var(--text-muted)]">A toolbar above the table</div>
        <DataTable
          rows={ROWS}
          columns={SMALL_COLUMNS}
          rowKey={(r) => r.id}
          defaultPageSize={25}
          fillHeight
          labels={{ table: "Fill-height table" }}
        />
      </div>
      <div className="mt-3">
        <Note>
          The pager stays pinned to the bottom of the pane and the header to the top, and
          <code className="font-mono"> maxBodyHeight</code> is ignored. Without a bounded
          flex parent (a viewport-locked app shell, a split pane) there is nothing to fill
          and the prop does nothing — which is why the main table above uses{" "}
          <code className="font-mono">maxBodyHeight</code> instead.
        </Note>
      </div>
    </Example>
  );
}

/* ── the phone layout ───────────────────────────────────────────────────── */

/** Pre-sorted by status, then name: `mobileGroupBy` groups CONSECUTIVE rows. */
const BY_STATUS = [...ROWS].sort(
  (a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
    a.name.localeCompare(b.name),
);

function PhoneTable() {
  const [statusById, setStatusById] = useState<Record<string, Status>>({});
  const [compact, setCompact] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { log, record } = useCallbackLog(3);

  const rows = useMemo(() => {
    const withOverrides = BY_STATUS.map((r) => ({ ...r, status: statusById[r.id] ?? r.status }));
    return withOverrides.sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        a.name.localeCompare(b.name),
    );
  }, [statusById]);

  const setStatus = (r: TableRow, s: Status) => {
    record(`${r.name} → ${STATUS_LABEL[s]}`);
    setStatusById((m) => ({ ...m, [r.id]: s }));
  };

  const swipe = (r: TableRow): { left?: SwipeAction[]; right?: SwipeAction[] } | null => {
    // A row that must not move returns null — here the archived ones.
    if (r.status === "archived") return null;
    return {
      right: [
        {
          label: "Done",
          icon: <Check className="size-4" />,
          onCommit: () => setStatus(r, "done"),
          className: "bg-[var(--money-neutral)]",
          armedClassName: "bg-[var(--money-income)]",
        },
      ],
      left: [
        {
          label: "Archive",
          icon: <Archive className="size-4" />,
          onCommit: () => setStatus(r, "archived"),
          className: "bg-[var(--money-neutral)]",
          armedClassName: "bg-[var(--money-expense)]",
        },
      ],
    };
  };

  return (
    <Example
      label="Phone layout — mobileCard, mobileGroupBy, mobileSwipeActions"
      hint="below 768px only: narrow the window or open the screen-size preview in the top bar"
    >
      <Row className="mb-3 justify-between">
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
          custom <code className="font-mono">mobileCard</code>
        </label>
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs"
          disabled={Object.keys(statusById).length === 0}
          onClick={() => setStatusById({})}
        >
          Undo swipes
        </Button>
      </Row>
      <DataTable
        rows={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        defaultPageSize={8}
        maxBodyHeight="18rem"
        onRowClick={(r) => setExpandedId((cur) => (cur === r.id ? null : r.id))}
        isExpanded={(r) => r.id === expandedId}
        // Inline on the phone this time (no mobileExpandAsDialog): the chevron points
        // down and flips when the panel is open.
        expandedRow={(r) => (
          <span className="text-xs text-[var(--text-secondary)]">
            {r.id} · opened {r.opened} · {AMOUNT_FMT.format(r.amount)}
          </span>
        )}
        mobileGroupBy={(r) => r.status}
        mobileGroupLabel={(key) => (
          <span className="inline-flex items-center gap-2">
            {STATUS_LABEL[key as Status]}
            <span className="font-normal normal-case tracking-normal">
              ({rows.filter((r) => r.status === key).length})
            </span>
          </span>
        )}
        mobileCard={
          compact
            ? (r) => (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{r.opened}</span>
                  </span>
                  <span className="tabular-nums">
                    <Amount value={r.amount} />
                  </span>
                </div>
              )
            : undefined
        }
        mobileSwipeActions={swipe}
        rowClassName={(r) => (r.status === "archived" ? "opacity-60" : undefined)}
      />
      <div className="mt-3 space-y-2">
        <CallbackLog log={log} />
        <Note>
          On a phone the table becomes a card list and never both — the desktop header, the
          column rail and selection are not rendered at all. Filters move into a{" "}
          <em>Filters</em> bar that opens a bottom sheet; paging becomes endless scroll that
          reveals <code className="font-mono">defaultPageSize</code> more cards (8 here) as
          the “Loading…” sentinel nears the viewport. Swipe a card right for <em>Done</em>,
          left for <em>Archive</em>; archived and expanded cards do not move. With the custom
          card unchecked you get the default body: the <code className="font-mono">mobilePrimary</code>{" "}
          column bold on top, the rest as labelled pairs, ID skipped by{" "}
          <code className="font-mono">mobileHidden</code>.
        </Note>
      </div>
    </Example>
  );
}

/* ── right-to-left ───────────────────────────────────────────────────────── */

function RtlTable() {
  return (
    <Example label="Right-to-left" hint={<code className="font-mono">dir=&quot;rtl&quot; · locale=&quot;ar-EG&quot;</code>}>
      <div dir="rtl">
        <DataTable
          rows={SMALL_ROWS}
          columns={SMALL_COLUMNS}
          rowKey={(r) => r.id}
          defaultPageSize={10}
          locale="ar-EG"
          labels={{ table: "RTL table" }}
        />
      </div>
      <div className="mt-3">
        <Note>
          The text columns follow the direction, because each header is a flex row and a
          flex row starts at the inline start. The right-aligned Amount column does not: its
          cells use the physical <code className="font-mono">text-right</code> class and hug
          the right edge of the column, while the header — flipped by the same{" "}
          <code className="font-mono">text-right</code> sniff that is meant to keep the arrow
          beside the numbers — lands on the left edge. The pager&apos;s previous / next
          chevrons keep pointing left / right. The page numbers do follow{" "}
          <code className="font-mono">locale</code>.
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
        <div className="rounded-md border border-[var(--border)]">
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
            locale="ar-EG"
            labels={PAGER_LABELS}
          />
        </div>
        <Note>
          The second pager is the same state with <code className="font-mono">locale=&quot;ar-EG&quot;</code>{" "}
          (Arabic-Indic digits on the strip and in the select) and a complete{" "}
          <code className="font-mono">labels</code> object whose{" "}
          <code className="font-mono">pageRange</code>, <code className="font-mono">rowCount</code>{" "}
          and <code className="font-mono">pageSizeAll</code> are overridden — the range summary
          is a function precisely so a translation can format its own numbers. Without{" "}
          <code className="font-mono">labels</code>, a standalone{" "}
          <code className="font-mono">Pagination</code> uses the English defaults and ignores
          the provider&apos;s <code className="font-mono">dataTable</code> labels, unlike{" "}
          <code className="font-mono">FilterPopover</code>.
        </Note>
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

const AR_NUM = new Intl.NumberFormat("ar-EG");

const PAGER_LABELS = resolveDataTableLabels({
  pageSizeAll: "Everything",
  pageRange: (from, to, total) =>
    `rows ${AR_NUM.format(from)} to ${AR_NUM.format(to)} of ${AR_NUM.format(total)}`,
  rowCount: (total) => `all ${AR_NUM.format(total)} rows`,
});

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
  // Mounted on demand: the one instance that keeps the default `autoFocus`. React's
  // `autoFocus` is an imperative `.focus()` after mount, and the browser scrolls the
  // focused input into view — fine in a popover, wrong for a panel that is simply on
  // the page. The four panels below pass `autoFocus={false}` for exactly that reason.
  const [focusDemo, setFocusDemo] = useState(false);
  const labels = resolveDataTableLabels({ filterPlaceholder: "Type to narrow…" });

  const encoded: Array<[string, ReactNode]> = FILTERABLE.map(({ col, filter }) => {
    const value = state[col.key] ?? defaultFilterState(filter);
    return [`f.${col.key}`, encodeFilterValue(value) ?? "— (inactive, so nothing is written)"];
  });

  const panel = (col: DataTableColumn<TableRow>, filter: ColumnFilter<TableRow>, autoFocus: boolean) => (
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
      // NOT derived from the rows by this component: the table computes the option
      // list (from `filter.options`, or from the distinct values it can see) and
      // passes it down. On its own, FilterPopover shows an empty checklist for a
      // select column that is handed none.
      selectOptions={filter.type === "select" ? STATUS_OPTIONS : []}
      locale="en-GB"
      labels={labels}
      // The component's own prop, demonstrated on purpose (see the note below).
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={autoFocus}
    />
  );

  const nameEntry = FILTERABLE.find(({ col }) => col.key === "name");

  return (
    <Example
      label="FilterPopover"
      hint="the contents of a column's filter popover — one per filter type (text, date, select, number), driving the encoded value underneath"
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
              <span className="text-xs font-medium text-[var(--text-primary)]">{col.header}</span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {filter.type}
                {col.filterBy && !col.filter && " (via filterBy)"}
              </span>
            </div>
            {panel(col, filter, false)}
          </div>
        ))}
      </div>

      {nameEntry && (
        <div className="mt-4 rounded-md border border-dashed border-[var(--border)] p-3">
          <Button
            variant="secondary"
            className="px-2 py-1 text-xs"
            aria-expanded={focusDemo}
            onClick={() => setFocusDemo((v) => !v)}
          >
            {focusDemo ? "Unmount" : "Mount a Name filter with the default autoFocus"}
          </Button>
          {focusDemo && <div className="mt-3">{panel(nameEntry.col, nameEntry.filter, true)}</div>}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <OutTable rows={encoded} />
        <Note>
          <code className="font-mono">autoFocus</code> defaults to true, which is right for
          the popover the table opens on an explicit press of <em>Filter</em>. Embedded in a
          page, pass <code className="font-mono">false</code> — as the four panels above do —
          or the text input takes focus on mount and the browser scrolls to it. The mount
          button shows the default: the input is focused the moment it appears, and it
          shares its state with the Name panel above.
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
          ["missingDataTableLabels(DEFAULT_DATA_TABLE_LABELS)", j(missingDataTableLabels(DEFAULT_DATA_TABLE_LABELS))],
          [
            'missingDataTableLabels({ columns: "Spalten", presets: { today: "Heute" } }).length',
            String(missingDataTableLabels({ columns: "Spalten", presets: { today: "Heute" } }).length),
          ],
          [
            "…first three",
            j(missingDataTableLabels({ columns: "Spalten", presets: { today: "Heute" } }).slice(0, 3)),
          ],
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
        <Note>
          <code className="font-mono">missingDataTableLabels</code> is the other half of that
          lenient merge: it lists every key that would fall back to English (presets one by
          one), so a translated app can assert <code className="font-mono">toEqual([])</code>{" "}
          in its own test. A translated <code className="font-mono">columns</code> counts for{" "}
          <code className="font-mono">columnsCount</code> too.
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
