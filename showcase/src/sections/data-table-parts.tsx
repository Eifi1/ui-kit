import { useState } from "react";
import type { ReactNode } from "react";
import {
  Button,
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
  UiKitProvider,
} from "@eifi1/ui-kit";
import type {
  ColumnFilter,
  DataTableColumn,
  DataTableLabels,
  FilterState,
  SortState,
} from "@eifi1/ui-kit";
import { ConstList, Example, Note, OutTable } from "../lib/section";
import {
  AMOUNT_FILTER,
  COLUMNS,
  ID_COL,
  NAME_COL,
  OPENED_FILTER,
  ROWS,
  STATUS_COL,
  STATUS_FILTER,
  STATUS_OPTIONS,
  j,
} from "./data-table-fixture";
import type { TableRow } from "./data-table-fixture";

/**
 * DATA TABLE: PARTS & HELPERS — what DataTable is assembled from, usable on its own:
 * the pager, the filter popover, the label tree and the pure sort/filter/URL helpers,
 * fed the same column objects the tables on the other two pages render. Shared fixture:
 * data-table-fixture.tsx.
 */
export function DataTablePartsSection() {
  return (
    <>
      <PaginationSpecimen />
      <FilterPopoverSpecimen />
      <LabelsSpecimen />
      <HelperTable />
    </>
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
        <div className="rounded-md border border-[var(--border)]">
          {/* No `labels`, no `locale`, no `onPageSize`: everything from the provider. */}
          <UiKitProvider labels={{ dataTable: PROVIDER_PAGER_LABELS }} locale="de-DE">
            <Pagination
              page={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              onPage={setPage}
            />
          </UiKitProvider>
        </div>
        <Note>
          The first pager passes no <code className="font-mono">labels</code>, so it speaks
          the showcase&apos;s language: a standalone <code className="font-mono">Pagination</code>{" "}
          reads the provider&apos;s <code className="font-mono">dataTable</code> labels (prop
          over provider over English), like <code className="font-mono">FilterPopover</code>.
          The second is the same state with{" "}
          <code className="font-mono">locale=&quot;ar-EG&quot;</code> (Arabic-Indic digits on
          the strip and in the select) and a <em>partial</em>{" "}
          <code className="font-mono">labels</code> object overriding{" "}
          <code className="font-mono">pageRange</code>, <code className="font-mono">rowCount</code>{" "}
          and <code className="font-mono">pageSizeAll</code> — the range summary is a function
          precisely so a translation can format its own numbers. The third sits under a nested{" "}
          <code className="font-mono">&lt;UiKitProvider labels=&#123;&#123; dataTable &#125;&#125; locale=&quot;de-DE&quot;&gt;</code>{" "}
          and passes no <code className="font-mono">onPageSize</code>: its text is the
          provider&apos;s German and it has no page-size select at all, because a size the
          user cannot change should not be offered.
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

// Partial: the pager merges it over the provider's labels and the English defaults.
const PAGER_LABELS = {
  pageSizeAll: "Everything",
  pageRange: (from, to, total) =>
    `rows ${AR_NUM.format(from)} to ${AR_NUM.format(to)} of ${AR_NUM.format(total)}`,
  rowCount: (total) => `all ${AR_NUM.format(total)} rows`,
} satisfies Partial<DataTableLabels>;

const DE_NUM = new Intl.NumberFormat("de-DE");
const PROVIDER_PAGER_LABELS = {
  pageRange: (from, to, total) =>
    `${DE_NUM.format(from)}–${DE_NUM.format(to)} von ${DE_NUM.format(total)}`,
  prevPage: "Vorherige Seite",
  nextPage: "Nächste Seite",
} satisfies Partial<DataTableLabels>;

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
          <code className="font-mono">FilterPopover</code> takes a <em>complete</em>{" "}
          <code className="font-mono">DataTableLabels</code> (or none, and then reads the
          provider), while <code className="font-mono">DataTable</code> and{" "}
          <code className="font-mono">Pagination</code> take a{" "}
          <code className="font-mono">Partial</code> and merge it for you. Handing the popover
          one changed string means calling{" "}
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
          // 0.8.0: a column's first direction, and a cycle that never unsorts.
          ['nextSorts([], "amount", false, { firstDir: "desc" })', j(nextSorts([], "amount", false, { firstDir: "desc" }))],
          [
            'nextSorts([{ key: "amount", dir: "asc" }], "amount", false, { firstDir: "desc" })',
            j(nextSorts([{ key: "amount", dir: "asc" }], "amount", false, { firstDir: "desc" })),
          ],
          ['nextSorts(DESC, "name", false, { cycle: "toggle" })', j(nextSorts(DESC, "name", false, { cycle: "toggle" }))],
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
