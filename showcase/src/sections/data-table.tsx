import { useEffect, useMemo, useRef, useState } from "react";
import { MemoryRouter, UNSAFE_LocationContext } from "react-router";
import { ChevronDown, ChevronRight, ExternalLink, Archive, Home, List } from "lucide-react";
import {
  AppShell,
  FillHeight,
  Switch,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Pagination,
  ToggleGroup,
  BooleanMark,
  CopyButton,
  SearchField,
  booleanColumn,
  useConfirm,
  Checkbox,
  numberFilter,
} from "@eifi1/ui-kit";
import type {
  AppShellNavItem,
  DataTableChrome,
  DataTableColumn,
  DataTableDensity,
  FilterState,
  SortCycle,
  SortState,
  DataTableRowAction,
} from "@eifi1/ui-kit";
import { Example, Note, NO_ROUTER, OutTable, Row, code, READOUT } from "../lib/section";
import {
  AMOUNT_FMT,
  ARCHIVED_COUNT,
  CallbackLog,
  COLUMNS,
  ROWS,
  SMALL_COLUMNS,
  SMALL_ROWS,
  STATUS_LABEL,
  STATUS_ORDER,
  isSelectable,
  j,
  useCallbackLog,
} from "./data-table-fixture";
import type { Status } from "./data-table-fixture";

/**
 * DATA TABLE — the whole surface, a controlled table, a short one, one in a bounded
 * pane, and right-to-left. The server-owned, URL-synced and phone layouts are on
 * "Data table: server, URL & phone" (data-table-server.tsx); Pagination, FilterPopover,
 * the labels and the pure helpers on "Data table: parts & helpers" (data-table-parts.tsx).
 * The fixture all three share is data-table-fixture.tsx.
 */
function DataTableSection() {
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
      <ControlledTable />
      <ShortTable />
      <DensityTable />
      <ReportTable />
      <PrivateCellsTable />
      <FillHeightTable />
      <ListPageTable />
      <RtlTable />
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
        <span className="text-xs text-secondary">
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
            <dt className="text-muted">Identifier</dt>
            <dd className="font-mono text-primary">{r.id}</dd>
            <dt className="text-muted">Opened</dt>
            <dd className="text-primary">{r.opened}</dd>
            <dt className="text-muted">Status</dt>
            <dd className="text-primary">{STATUS_LABEL[r.status]}</dd>
            <dt className="text-muted">Amount</dt>
            <dd className="text-primary">{AMOUNT_FMT.format(r.amount)}</dd>
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
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-start text-xs text-secondary hover:bg-surface-2"
          >
            {hideArchived ? (
              <ChevronRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
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
          <span className="text-secondary">
            No rows match the current filters.
          </span>
        }
      />

      <div className="mt-3 space-y-2">
        <Note>
          The column panel is the vertical <em>Columns (n/m)</em> strip on the end edge (the
          right in this left-to-right table):
          it hides columns, and <em>Auto-size columns</em> freezes every visible column to
          its measured width except the last, which is left elastic to absorb the slack.
          Drag the hairline at a header&apos;s trailing edge to resize by hand (in a
          right-to-left table it sits on the left and a drag to the left widens); double-click it to
          give that one column its width back.
        </Note>
        <Note>
          This table passes <code className="font-mono">storageKey</code>, so sort, filters,
          page size, column widths and hidden columns are written to{" "}
          <code className="font-mono">uikit-showcase:showcase-data-table</code> and survive a
          reload. If you return to this page and a column is missing, that is the feature —
          re-tick it in the panel. The default prefix is{" "}
          <code className="font-mono">hbui-table:</code>; it is a prop so several apps can
          share one localStorage origin without colliding. Since 0.34 an app sets its prefix
          once, on <code className="font-mono">{"<UiKitProvider tableStorageKeyPrefix>"}</code>,
          and every kit table below takes it — <code className="font-mono">TranslationReviewPanel</code>
          too, which took none — while a table&apos;s own prop still wins. The stored key is the
          prefix plus <code className="font-mono">storageKey</code>, so an app that wrapped
          DataTable to pass its prefix keeps every reader&apos;s saved view when it moves the
          prefix to the provider.
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

/* ── controlled filters, selection callbacks ─────────────────────────────── */


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
          Shift-click a second checkbox and the log shows exactly one line,{" "}
          <code className="font-mono">onToggleMany([…], true)</code>, for the whole range — the
          clicked row is not reported a second time through{" "}
          <code className="font-mono">onToggle</code>.
        </Note>
        <Note>
          With <code className="font-mono">onFiltersChange</code> set the table stops owning
          the filters: it renders <code className="font-mono">filters</code> as given and
          reports every edit. The page still resets: whenever the <em>value</em> of{" "}
          <code className="font-mono">filters</code> or <code className="font-mono">sorts</code>{" "}
          changes — from the funnel, a header click, or a chip above the table — a client-side
          table goes back to page 1. Tick every chip, move to page 2, then drop a chip: the
          table lands on page 1 rather than being clamped to the last page. A fresh but equal
          object on every render resets nothing, because the comparison is by value. (In{" "}
          <code className="font-mono">serverPagination</code> mode the owner&apos;s{" "}
          <code className="font-mono">page</code> is the page, and resetting it stays the
          owner&apos;s job.)
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
        className="inline-flex items-center gap-1 text-brand hover:underline"
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
    // Deliberately the pre-0.7 physical class: the table rewrites it to `text-end`.
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
          <span className="text-secondary">
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
        <Note>
          <code className="font-mono">paginated=&#123;false&#125;</code> holds on a phone too:
          every line is a card, with no endless-scroll chunking and no “Loading…” sentinel for
          rows that are already in memory. Qty and Line total still say the pre-0.7{" "}
          <code className="font-mono">text-right</code>; the table rewrites a bare{" "}
          <code className="font-mono">text-right</code> / <code className="font-mono">text-left</code>{" "}
          to <code className="font-mono">text-end</code> / <code className="font-mono">text-start</code>,
          so old column definitions are right in both directions (write{" "}
          <code className="font-mono">ltr:text-right rtl:text-right</code> for a truly physical side).
        </Note>
      </div>
    </Example>
  );
}

/* ── density ─────────────────────────────────────────────────────────────── */

function DensityTable() {
  const [density, setDensity] = useState<DataTableDensity>("compact");
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  return (
    <Example
      label="density"
      hint='"compact" tightens the header, the cells, the checkboxes, the pager and the phone cards together'
    >
      <Row className="mb-3">
        <ToggleGroup<DataTableDensity>
          aria-label="Density"
          value={density}
          onChange={setDensity}
          options={[
            { value: "comfortable", label: "comfortable" },
            { value: "compact", label: "compact" },
          ]}
        />
      </Row>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-primary">Measurements in a card</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <DataTable
            rows={SMALL_ROWS}
            columns={SMALL_COLUMNS}
            rowKey={(r) => r.id}
            density={density}
            defaultPageSize={5}
            selection={{
              isSelected: (r) => picked.has(r.id),
              onToggle: (r, checked) =>
                setPicked((p) => {
                  const next = new Set(p);
                  if (checked) next.add(r.id);
                  else next.delete(r.id);
                  return next;
                }),
              allSelected: picked.size === SMALL_ROWS.length,
              someSelected: picked.size > 0 && picked.size < SMALL_ROWS.length,
              onToggleAll: (checked) => setPicked(checked ? new Set(SMALL_ROWS.map((r) => r.id)) : new Set()),
            }}
            labels={{ table: "Invoices, density demo" }}
          />
        </CardContent>
      </Card>
      <div className="mt-4 max-w-xl rounded-md border border-subtle">
        <Pagination page={page} totalPages={8} pageSize={25} total={187} onPage={setPage} density={density} />
      </div>
      <div className="mt-3">
        <Note>
          Lenkbank&apos;s in-card tables were hand-rolled <code className="font-mono">&lt;table&gt;</code>s
          because at the default padding a table inside a card came out twice its height and pushed
          the card&apos;s own content below the fold. <code className="font-mono">density=&quot;compact&quot;</code>{" "}
          is <code className="font-mono">text-xs</code> with <code className="font-mono">px-2 py-1</code>{" "}
          cells, and it reaches the pager under the table too — the standalone{" "}
          <code className="font-mono">Pagination</code> below takes the same prop. Narrow the window to
          see the phone cards tighten with it.
        </Note>
      </div>
    </Example>
  );
}


/* ── a report table: firstSort, sortCycle, chrome, frame ─────────────────── */

interface PayeeRow {
  payee: string;
  count: number;
  total: number;
}

const PAYEES: PayeeRow[] = [
  { payee: "Rewe", count: 38, total: 1642.1 },
  { payee: "Landlord", count: 9, total: 10620 },
  { payee: "Deutsche Bahn", count: 14, total: 486.3 },
  { payee: "Stadtwerke", count: 3, total: 212.75 },
  { payee: "Bakery", count: 61, total: 188.4 },
  { payee: "Insurance", count: 9, total: 577.8 },
  { payee: "Pharmacy", count: 5, total: 64.2 },
];

const PAYEE_COLUMNS: DataTableColumn<PayeeRow>[] = [
  { key: "payee", header: "Payee", cell: (r) => r.payee, sortBy: (r) => r.payee.toLowerCase(), mobilePrimary: true },
  {
    key: "count",
    header: "Bookings",
    cell: (r) => r.count,
    sortBy: (r) => r.count,
    firstSort: "desc",
    className: "text-end tabular-nums",
    headClassName: "text-end",
  },
  {
    key: "total",
    header: "Total",
    cell: (r) => AMOUNT_FMT.format(r.total),
    sortBy: (r) => r.total,
    firstSort: "desc",
    className: "text-end tabular-nums whitespace-nowrap",
    headClassName: "text-end",
  },
];

type Tri = "preset" | "on" | "off";
const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: "preset", label: "preset" },
  { value: "on", label: "on" },
  { value: "off", label: "off" },
];
/** The control rows' prop names. On a phone each control wraps to a line of its own,
 *  and a label only as wide as its word started every group at a different x; a fixed
 *  column (wide enough for "columnSettings") lines the groups up. From `sm` they sit
 *  inline, where a column would only be a gap. */
const TRI_LABEL = "font-mono max-sm:w-28 max-sm:shrink-0";
/** One control: its name and its toggle group. It WRAPS (0.32) — at Extra large on a
 *  phone the name's column and three options are wider than the screen, so the group
 *  goes under its name rather than past the edge. */
const CONTROL = "flex flex-wrap items-center gap-x-2 gap-y-1";
const tri = (v: Tri) => (v === "preset" ? undefined : v === "on");

function ReportTable() {
  const [chrome, setChrome] = useState<DataTableChrome>("minimal");
  const [cycle, setCycle] = useState<SortCycle>("toggle");
  const [framed, setFramed] = useState(false);
  const [columnSettings, setColumnSettings] = useState<Tri>("preset");
  const [resizable, setResizable] = useState<Tri>("preset");
  const [multiSort, setMultiSort] = useState<Tri>("preset");
  const [opened, setOpened] = useState<string>("—");
  return (
    <Example
      label="A report table — firstSort, sortCycle, chrome, frame={false}, keyboard rows"
      hint="the half-width summary keksdose's reports need: ranked by size, no power-user chrome, inside the app's own card"
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-secondary">
        <span className={CONTROL}>
          <code className={TRI_LABEL}>chrome</code>
          <ToggleGroup<DataTableChrome>
            aria-label="chrome"
            value={chrome}
            onChange={setChrome}
            options={[
              { value: "full", label: "full" },
              { value: "minimal", label: "minimal" },
            ]}
          />
        </span>
        <span className={CONTROL}>
          <code className={TRI_LABEL}>sortCycle</code>
          <ToggleGroup<SortCycle>
            aria-label="sortCycle"
            value={cycle}
            onChange={setCycle}
            options={[
              { value: "tri", label: "tri" },
              { value: "toggle", label: "toggle" },
            ]}
          />
        </span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={framed} onChange={(e) => setFramed(e.target.checked)} />
          <code className="font-mono">frame</code>
        </label>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-secondary">
        {(
          [
            ["columnSettings", columnSettings, setColumnSettings],
            ["resizable", resizable, setResizable],
            ["multiSort", multiSort, setMultiSort],
          ] as const
        ).map(([name, value, set]) => (
          <span key={name} className={CONTROL}>
            <code className={TRI_LABEL}>{name}</code>
            <ToggleGroup<Tri> aria-label={name} value={value} onChange={set} options={TRI_OPTIONS} />
          </span>
        ))}
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-primary">Top payees, September</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <DataTable
            rows={PAYEES}
            columns={PAYEE_COLUMNS}
            rowKey={(r) => r.payee}
            paginated={false}
            chrome={chrome}
            sortCycle={cycle}
            columnSettings={tri(columnSettings)}
            resizable={tri(resizable)}
            multiSort={tri(multiSort)}
            frame={framed}
            className={framed ? undefined : "rounded-md border border-subtle"}
            density="compact"
            onRowClick={(r) => setOpened(r.payee)}
            labels={{ table: "Top payees" }}
          />
        </CardContent>
      </Card>
      <p className="mt-2 font-mono text-xs text-secondary">onRowClick → {opened}</p>
      <div className="mt-3">
        <Note>
          Bookings and Total are <code className="font-mono">firstSort: &quot;desc&quot;</code>: the first
          click ranks the big ones on top. With <code className="font-mono">sortCycle=&quot;toggle&quot;</code>{" "}
          the next click flips it and the table is never unsorted again; <code className="font-mono">tri</code>{" "}
          is the old desc → asc → off. <code className="font-mono">aria-sort</code> and the spoken &ldquo;Sorted
          by …&rdquo; follow either way. <code className="font-mono">chrome=&quot;minimal&quot;</code> drops the
          columns rail, the resize handles and multi-sort (and its Shift-click tooltip); each has its own
          switch, and an explicit on/off wins over the preset. <code className="font-mono">frame={"{false}"}</code>{" "}
          removes the table&apos;s own card, so it sits in the app&apos;s without a frame inside a frame, and{" "}
          <code className="font-mono">className</code> reaches the root — here a plain border instead.
        </Note>
        <Note>
          <strong>Clickable rows take the keyboard.</strong> With <code className="font-mono">onRowClick</code>{" "}
          the body is one roving tab stop: Tab into it, ↑/↓ and Home/End move between rows, Enter or
          Space opens one — and the rows keep their <code className="font-mono">row</code> role. A click on a
          control inside a row no longer opens the row as well.
        </Note>
      </div>
    </Example>
  );
}

/* ── cellProps / headProps: a data-private marker on the cell itself ────────── */

interface AccountRow {
  name: string;
  iban: string;
  kind: string;
  balance: number;
}

const ACCOUNTS: AccountRow[] = [
  { name: "Joint checking", iban: "DE89 3704 0044 0532 0130 00", kind: "Checking", balance: 2418.55 },
  { name: "Rainy day", iban: "DE12 5001 0517 0648 4898 90", kind: "Savings", balance: 9100 },
  { name: "Travel card", iban: "DE44 1001 1001 2620 1234 56", kind: "Credit", balance: -312.4 },
];

const ACCOUNT_COLUMNS: DataTableColumn<AccountRow>[] = [
  {
    key: "name",
    header: "Account",
    cell: (r) => r.name,
    mobilePrimary: true,
    // On the <td> itself, not an inner span: the whole cell is the private thing.
    cellProps: () => ({ "data-private": "" }),
  },
  {
    key: "iban",
    header: "IBAN",
    cell: (r) => <span className="font-mono text-xs">{r.iban}</span>,
    cellProps: (r) => ({ "data-private": "", title: `IBAN of ${r.name}` }),
    headProps: { title: "Masked in demo mode", "data-col-kind": "private" },
  },
  { key: "kind", header: "Type", cell: (r) => r.kind },
  {
    key: "balance",
    header: "Balance",
    cell: (r) => AMOUNT_FMT.format(r.balance),
    className: "text-end tabular-nums whitespace-nowrap",
    headClassName: "text-end",
    // Per row: only the negative balances are marked, and the class joins under the
    // column's own (its text-end still wins).
    cellProps: (r) => (r.balance < 0 ? { "data-private": "", className: "font-medium" } : undefined),
    headProps: { "aria-description": "Negative balances are masked in demo mode" },
  },
];

function PrivateCellsTable() {
  const [demo, setDemo] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState({ cells: 0, heads: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setCounts({
      cells: el.querySelectorAll("[data-private]").length,
      heads: el.querySelectorAll("th[data-col-kind]").length,
    });
  }, [demo]);
  return (
    <Example
      label="Column cellProps and headProps"
      hint="attributes for a column's <td> per row, and for its <th> once — here data-private for a demo mode"
    >
      <label className="mb-3 flex items-center gap-2 text-xs text-secondary">
        <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
        {/* One span: bare text beside the <code> made three flex items, three ragged columns. */}
        <span>
          demo mode (the page&apos;s own <code className="font-mono">[data-private]</code> blur rule)
        </span>
      </label>
      <div ref={box} className={demo ? "[&_[data-private]]:blur-[5px]" : undefined}>
        <DataTable
          rows={ACCOUNTS}
          columns={ACCOUNT_COLUMNS}
          rowKey={(r) => r.iban}
          paginated={false}
          chrome="minimal"
          density="compact"
          labels={{ table: "Accounts" }}
        />
      </div>
      <p className="mt-2 font-mono text-xs text-secondary">
        [data-private] elements = {counts.cells} · th[data-col-kind] = {counts.heads}
      </p>
      <div className="mt-3">
        <Note>
          <code className="font-mono">{"cellProps: (row) => ({ \"data-private\": \"\" })"}</code> puts the marker on
          the <code className="font-mono">&lt;td&gt;</code>, so the blur covers the cell rather than a span
          inside it, and no <code className="font-mono">cell</code> renderer has to remember it. The IBAN
          cells also get a per-row <code className="font-mono">title</code> (hover one); the balance column
          marks only the negative row and adds a class, merged under the column&apos;s own{" "}
          <code className="font-mono">text-end</code>. <code className="font-mono">headProps</code> gives the IBAN
          header a <code className="font-mono">title</code> and a <code className="font-mono">data-col-kind</code>{" "}
          hook, and the balance header an <code className="font-mono">aria-description</code>. The table keeps{" "}
          <code className="font-mono">data-col</code>, <code className="font-mono">role</code>,{" "}
          <code className="font-mono">scope</code> and <code className="font-mono">aria-sort</code> for itself. On a
          phone the card fields get the <code className="font-mono">data-*</code> half only — narrow the window
          and the names and IBANs are still blurred.
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
      hint="the dashed box is a fixed 24rem flex column; the table — or the card list on a phone — fills it and scrolls inside"
    >
      {/* 24rem, not 18rem (0.40): from md the body keeps a 12rem floor, and 18rem left
          the header, that floor and the pager no room — the table ran past the box. */}
      <div className="flex h-96 flex-col rounded-md border border-dashed border-subtle p-2">
        <div className="pb-2 text-xs text-muted">A toolbar above the table</div>
        <DataTable
          rows={ROWS}
          columns={SMALL_COLUMNS}
          rowKey={(r) => r.id}
          // Ten, not 25: with every row on one page there is no pager, and the Note's
          // "the pager stays pinned to the bottom" had nothing to point at.
          defaultPageSize={10}
          fillHeight
          labels={{ table: "Fill-height table" }}
        />
      </div>
      <div className="mt-3">
        <Note>
          The pager stays pinned to the bottom of the pane and the header to the top. On a
          phone a client-side table has no pager — it reveals more cards as the list scrolls —
          so there the card list fills the pane under the toolbar and scrolls inside it. And
          <code className="font-mono"> maxBodyHeight</code> is ignored. Without a bounded
          flex parent (a viewport-locked app shell, a split pane) there is nothing to fill
          and the prop does nothing — which is why the main table above uses{" "}
          <code className="font-mono">maxBodyHeight</code> instead. From{" "}
          <code className="font-mono">md</code> the body never shrinks below 12rem (0.40):
          a pane shorter than the header, that floor and the pager lets the table run past it.
        </Note>
        <Note>
          <strong>Two scrollbars</strong> (0.34, kastlan feedback 55): the default{" "}
          <code className="font-mono">maxBodyHeight</code>,{" "}
          <code className="font-mono">calc(100dvh - 12rem)</code>, scrolls the body inside a
          page that scrolls itself, so a long table under a page header shows two scrollbars
          side by side. A list page whose table is the point fills the window from{" "}
          <code className="font-mono">md</code> up instead — the next example.
        </Note>
      </div>
    </Example>
  );
}

/* ── the list page fills the window (0.40) ─────────────────────────────── */

const LIST_PAGE_NAV: AppShellNavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/payees", label: "Payees", icon: List },
];

function ListPageTable() {
  const [banner, setBanner] = useState(true);
  const [short, setShort] = useState(false);
  return (
    <Example
      label="The list page fills the window — FillHeight in an AppShell"
      hint="an embedded AppShell; from md only the table's body scrolls, under the banner and the page's header"
    >
      <Row>
        <Switch label="A banner above the page" checked={banner} onCheckedChange={setBanner} />
        <Switch label="A short window (20rem)" checked={short} onCheckedChange={setShort} />
      </Row>
      <div
        className={
          (short ? "h-80" : "h-[32rem]") +
          " mt-3 overflow-hidden rounded-md border border-subtle bg-page"
        }
      >
        <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
          <MemoryRouter initialEntries={["/payees"]}>
            <AppShell nav={LIST_PAGE_NAV} embedded topBar={<span className="font-semibold">Acme Books</span>}>
              {banner && (
                <div className="border-b border-subtle bg-surface-2 px-4 py-2 text-sm text-secondary">
                  A banner: the shell&apos;s, above the page — it keeps its height.
                </div>
              )}
              <FillHeight className="gap-3 p-4">
                <h2 className="text-lg font-semibold text-primary">Payees</h2>
                <DataTable
                  rows={ROWS}
                  columns={SMALL_COLUMNS}
                  rowKey={(r) => r.id}
                  defaultPageSize={25}
                  fillHeight
                  labels={{ table: "Payees" }}
                />
              </FillHeight>
            </AppShell>
          </MemoryRouter>
        </UNSAFE_LocationContext.Provider>
      </div>
      <div className="mt-3">
        <Note>
          docs/page-layout-harmonization.md §1 (0.40). The table marks itself under{" "}
          <code className="font-mono">fillHeight</code> (<code className="font-mono">data-fill-height</code>);
          while one is inside, AppShell&apos;s <code className="font-mono">&lt;main&gt;</code> becomes a
          flex column from <code className="font-mono">md</code>, so the banner keeps its own row
          and the page takes the rest — <code className="font-mono">&lt;main&gt;</code> no longer
          overflows by the banner&apos;s height. Every element between{" "}
          <code className="font-mono">&lt;main&gt;</code> and the table is a{" "}
          <code className="font-mono">FillHeight</code>, or merges{" "}
          <code className="font-mono">FILL_HEIGHT_CLASS</code>; both do nothing below{" "}
          <code className="font-mono">md</code> or around any other page.
        </Note>
        <Note>
          The floor: the body keeps at least 12rem, about five rows. Switch on the short
          window — the page keeps the header and that much body, and{" "}
          <code className="font-mono">&lt;main&gt;</code> scrolls instead of leaving a slit of
          rows. On a phone nothing fills: the page scrolls as one, the card list in its flow.
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
          Everything follows the direction. The header row is{" "}
          <code className="font-mono">text-start</code>, so Name and Status read from the
          right. Amount is <code className="font-mono">text-end</code>: its cells and its
          header hug the logical end — the left edge here — with the sort arrow and funnel
          beside the numbers. The pager&apos;s previous / next chevrons flip to point back
          and forward along the line, the column-resize hairline sits on each header&apos;s
          left edge, the Columns strip is on the left, and the page numbers follow{" "}
          <code className="font-mono">locale</code>. On a phone the filter sheet keeps{" "}
          <code className="font-mono">dir</code> even though it is portalled.
        </Note>
      </div>
    </Example>
  );
}

/* ── since 0.12 ─────────────────────────────────────────────────────────── */

/**
 * DATA TABLE 0.12 — per-row actions, the toolbar, the translated empty label, yes/no
 * columns and a copy button in a cell (the "data-table" page); and the owner-held URL
 * state with `filterHref` links and the filter builders (the "data-table-server" page).
 */

/* ── Tenants: rowActions, toolbar, empty, BooleanMark, CopyButton ──────────── */

interface Tenant {
  id: string;
  name: string;
  email: string;
  autopay: boolean;
  /** `null`: the check has not been run yet. */
  verified: boolean | null;
  /** A tenant with open arrears cannot be archived. */
  arrears: number;
}

const TENANTS: Tenant[] = [
  { id: "T-01", name: "Ada Brandt", email: "ada.brandt@example.com", autopay: true, verified: true, arrears: 0 },
  { id: "T-02", name: "Kemal Aydın", email: "kemal@example.org", autopay: false, verified: true, arrears: 420 },
  { id: "T-03", name: "Léa Moreau", email: "lea.moreau@example.fr", autopay: true, verified: null, arrears: 0 },
  { id: "T-04", name: "Zsófia Kiss", email: "zsofia.kiss@example.hu", autopay: false, verified: false, arrears: 0 },
  { id: "T-05", name: "Wang Fang", email: "wang.fang@example.cn", autopay: true, verified: true, arrears: 0 },
];

const TENANT_COLUMNS: DataTableColumn<Tenant>[] = [
  {
    key: "name",
    header: "Tenant",
    cell: (r) => r.name,
    sortBy: (r) => r.name.toLowerCase(),
    mobilePrimary: true,
  },
  {
    key: "email",
    header: "Email",
    cell: (r) => (
      <span className="inline-flex items-center gap-1">
        <span className="truncate">{r.email}</span>
        {/* No `tooltipPortal`: left unset, the Tooltip notices the table's data-clips
            scroller and portals itself, so the bubble is not cut off at the edge. */}
        <CopyButton text={r.email} label={`Copy ${r.email}`} size="2xs" stopPropagation />
      </span>
    ),
    className: "whitespace-nowrap",
  },
  booleanColumn<Tenant>({
    key: "autopay",
    header: "Autopay",
    value: (r) => r.autopay,
    // Mostly-true is news only when it is false: dashes read as "the rest".
    falseAs: "dash",
    filterOptions: { true: "On", false: "Off" },
  }),
  booleanColumn<Tenant>({
    key: "verified",
    header: "ID checked",
    value: (r) => r.verified,
    filterOptions: { true: "Checked", false: "Failed", unset: "Not yet" },
  }),
];

function DataTableActionsDemo() {
  const confirm = useConfirm();
  const [rows, setRows] = useState(TENANTS);
  const [query, setQuery] = useState("");
  const [log, setLog] = useState("—");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const rowActions: DataTableRowAction<Tenant>[] = [
    { kind: "edit", onAction: (r) => setLog(`edit ${r.id}`) },
    {
      label: "Archive",
      icon: <Archive />,
      onAction: (r) => {
        setRows((all) => all.filter((x) => x.id !== r.id));
        setLog(`archived ${r.id}`);
      },
      disabledReason: (r) => (r.arrears > 0 ? `€${r.arrears} in arrears — settle before archiving` : undefined),
    },
    {
      kind: "delete",
      onAction: (r) => {
        setRows((all) => all.filter((x) => x.id !== r.id));
        setLog(`deleted ${r.id}`);
      },
      confirm: (r) =>
        confirm({
          title: `Delete ${r.name}?`,
          body: "The tenant and their payment history are removed. This cannot be undone.",
          confirmLabel: "Delete",
          tone: "danger",
        }),
    },
  ];

  return (
    <Example
      label="rowActions, toolbar and the empty label"
      hint={<>{code("rowActions")} · {code("toolbar")} · {code("booleanColumn")} · a {code("CopyButton")} in a cell</>}
    >
      <DataTable
        rows={visible}
        columns={TENANT_COLUMNS}
        rowKey={(r) => r.id}
        paginated={false}
        rowActions={rowActions}
        onRowClick={(r) => setLog(`row ${r.id} opened`)}
        toolbar={
          <>
            <SearchField
              variant="inline"
              aria-label="Search tenants"
              placeholder="Search tenants"
              value={query}
              onChange={setQuery}
              className="min-w-0 flex-1 basis-40"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRows(TENANTS);
                setQuery("");
              }}
            >
              Restore all
            </Button>
          </>
        }
      />
      <div className="mt-3 space-y-2">
        <p className={READOUT}>last: {log}</p>
        <OutTable
          rows={[
            ["BooleanMark value={true}", <BooleanMark key="t" value />],
            ["BooleanMark value={false}", <BooleanMark key="f" value={false} />],
            ['BooleanMark value={false} falseAs="dash"', <BooleanMark key="d" value={false} falseAs="dash" />],
            ["BooleanMark value={null}", <BooleanMark key="n" value={null} />],
          ]}
        />
        <Note>
          The pencil and the bin are the {code('kind: "edit"')} / {code('"delete"')} presets — icon, translated
          label and tone included; <em>Archive</em> states its own label and icon, and is locked with a{" "}
          {code("disabledReason")} for Kemal, who owes rent. The delete runs only after{" "}
          {code("useConfirm()")} says yes. A press on an action never opens the row. On a phone the column
          disappears and the same actions become the card&apos;s swipes.
        </Note>
        <Note>
          The search lives in the {code("toolbar")}, inside the table&apos;s frame. Type{" "}
          {code("nobody")} — the empty body now says {code("labels.empty")} (&ldquo;No entries&rdquo;, in the
          page&apos;s language) instead of a bare dash. {code("booleanColumn")} gives each yes/no column a
          check-first sort and a Yes/No filter; the screen reader hears the word, not a glyph. Hover a copy
          button: its tooltip leaves the scroller rather than being clipped by it.
        </Note>
      </div>
      <Note>Since 0.12.</Note>
    </Example>
  );
}

/* ── since 0.17 ─────────────────────────────────────────────────────────── */

/**
 * DATA TABLE 0.17 — the totals row: a column's `footer` and the table's `footerLabel`
 * (kastlan 54, the trial balance that hand-built its totals under the table).
 */

interface Account {
  no: string;
  name: string;
  debit: number;
  credit: number;
}

const ACCOUNTS_017: Account[] = [
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

const TOTALS_COLUMNS: DataTableColumn<Account>[] = [
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

function DataTableTotalsDemo() {
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
        rows={ACCOUNTS_017}
        columns={TOTALS_COLUMNS}
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
      <Note>Since 0.17.</Note>
    </Example>
  );
}

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

interface Payee {
  id: number;
  name: string;
  total: number;
  count: number;
}

const PAYEES_022: Payee[] = [
  { id: 1, name: "Migros", total: 1240.5, count: 38 },
  { id: 2, name: "SBB", total: 860, count: 12 },
  { id: 3, name: "Coop", total: 990.2, count: 41 },
  { id: 4, name: "Swisscom", total: 420, count: 6 },
];

const PAYEE_COLUMNS_022: DataTableColumn<Payee>[] = [
  { key: "name", header: "Payee", cell: (p) => p.name, sortBy: (p) => p.name, mobilePrimary: true },
  {
    key: "total",
    header: <span>Paid (CHF)</span>,
    headerText: "Paid",
    cell: (p) => p.total.toFixed(2),
    sortBy: (p) => p.total,
    firstSort: "desc",
    className: "text-end tabular-nums",
    headClassName: "text-end",
  },
  {
    key: "count",
    header: "Payments",
    cell: (p) => p.count,
    sortBy: (p) => p.count,
    firstSort: "desc",
    className: "text-end tabular-nums",
    headClassName: "text-end",
  },
];

function DataTableMobileSort022Demo() {
  return (
    <Example
      label="DataTable — a Sort by row on the phone"
      hint="`mobileSort`: the card list has no header row, so the sort gets its own control"
    >
      <DataTable
        rows={PAYEES_022}
        columns={PAYEE_COLUMNS_022}
        rowKey={(p) => p.id}
        mobileSort
        sortCycle="toggle"
        chrome="minimal"
        paginated={false}
        labels={{ table: "Payees" }}
      />
      <Note>
        Narrow the window below 768px: the cards get a &ldquo;Sort by&rdquo; select and a direction button above
        them. They drive the table&apos;s own sort, so the header shows what the phone chose and the other way round,
        a picked column starts in its {code("firstSort")} like a header click, and under {code('sortCycle="toggle"')}
        &ldquo;Default order&rdquo; is offered only until the table is ranked. A column whose header is not text names
        its option with {code("headerText")}. keksdose K10 (its aggregated report tables, #258). Off by default.
      </Note>
      <Note>Since 0.22.</Note>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** The Data table page */
export function DataTableDemo() {
  return (
    <>
      <DataTableSection />
      <DataTableActionsDemo />
      <DataTableTotalsDemo />
      <DataTableMobileSort022Demo />
    </>
  );
}
