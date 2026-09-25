import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button, DataTable } from "@eifi1/ui-kit";
import type { DataTableColumn, FilterState, SortState } from "@eifi1/ui-kit";
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

