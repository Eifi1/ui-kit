import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, DataTable, Pagination, ToggleGroup } from "@eifi1/ui-kit";
import type { DataTableChrome, DataTableColumn, DataTableDensity, FilterState, SortCycle, SortState } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";
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
      <ControlledTable />
      <ShortTable />
      <DensityTable />
      <ReportTable />
      <FillHeightTable />
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
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-start text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]"
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
          <span className="text-[var(--text-secondary)]">
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
          <CardTitle className="text-[var(--text-primary)]">Measurements in a card</CardTitle>
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
      <div className="mt-4 max-w-xl rounded-md border border-[var(--border)]">
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
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-2">
          chrome
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
        <span className="flex items-center gap-2">
          sortCycle
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
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-secondary)]">
        {(
          [
            ["columnSettings", columnSettings, setColumnSettings],
            ["resizable", resizable, setResizable],
            ["multiSort", multiSort, setMultiSort],
          ] as const
        ).map(([name, value, set]) => (
          <span key={name} className="flex items-center gap-2">
            <code className="font-mono">{name}</code>
            <ToggleGroup<Tri> aria-label={name} value={value} onChange={set} options={TRI_OPTIONS} />
          </span>
        ))}
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)]">Top payees, September</CardTitle>
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
            className={framed ? undefined : "rounded-md border border-[var(--border)]"}
            density="compact"
            onRowClick={(r) => setOpened(r.payee)}
            labels={{ table: "Top payees" }}
          />
        </CardContent>
      </Card>
      <p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">onRowClick → {opened}</p>
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

