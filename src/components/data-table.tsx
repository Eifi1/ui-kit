import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { Card } from "./card";
import { Spinner } from "./spinner";
import { isTableOwnColumn, useRowActionColumn } from "./data-table-row-actions";
import { useColumnResize } from "./data-table-resize";
import { useRangeSelection } from "./data-table-selection";
import { columnLabel, logicalAlign, resolveDataTableLabels } from "./data-table-shared";
import {
  MobileFilters,
  MobileLeadingRow,
  MobileSelectBar,
  MobileSort,
  StackedFields,
  keepsOwnClicks,
  mobileCardColumns,
  useCardColumnWarnings,
} from "./data-table-mobile";
import { DataTableMobileRow, DataTableRow, type DataTableRowCtx } from "./data-table-row";
import { DataTableHead } from "./data-table-head";
import { DataTableLeadingRow } from "./data-table-leading-row";
import {
  DataTableGroupBand,
  DataTableLoadMoreFooter,
  groupLevels,
  groupRows,
  useGroupBandTops,
  type DataTableGroupBy,
  type DataTableLoadMore,
  type RowGroup,
} from "./data-table-groups";
export type { DataTableGroupBy, DataTableLoadMore } from "./data-table-groups";
import {
  VIRTUAL_SELECT_COL,
  rowNavTarget,
  useRowWindow,
  type DataTableVirtualize,
  type VirtualGroup,
} from "./data-table-virtual";
export type { DataTableVirtualize } from "./data-table-virtual";
import { ColumnSettingsPanel } from "./data-table-column-settings";
import { useLargeText } from "../hooks/use-large-text";
import { cn } from "../lib/cn";
import { isFilterActive, resolveFilter, rowMatches } from "./data-table-filters";
import type { ColumnFilter, FilterValue } from "./data-table-filters";
import { compareSortValues, nextSorts } from "./data-table-sort";
import type { SortCycle, SortDir, SortState } from "./data-table-sort";
import { Pagination } from "./data-table-pagination";
import type { SwipeAction } from "./swipeable-row";
import type { RowActionsCollapse } from "./row-actions";
import type { CommitScope } from "./write-lock";
import { FullBleedDialog } from "./full-bleed-dialog";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { useAnnounce } from "../hooks/use-announce";
import { DEFAULT_DATA_TABLE_LABELS, type DataTableLabels } from "./data-table-labels";
import {
  useKitLabelOverrides,
  useKitLocale,
  useKitTableStorageKeyPrefix,
  type LabelOverride,
} from "../i18n/kit-labels";
import { useEdgeFade } from "../lib/strip-fade";
import { dirOf, type Direction } from "../lib/direction";
import { firstTabStop, focusContainer, focusIsLost } from "../lib/focus-left";

// ---------- Types ----------

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** What a client sort orders the column by. Strings collate in the table's `locale`
   *  (digits as numbers, case and accents left out; 0.51.7, audit 2026-10-30 DSP-3),
   *  numbers compare as numbers and sort before strings, `null` and `undefined` sort
   *  last in either direction. The order is `compareSortValues`, exported for an app's
   *  own list beside the table (0.52). */
  sortBy?: (row: T) => string | number | null | undefined;
  filter?: ColumnFilter<T>;
  filterBy?: (row: T) => string;
  className?: string;
  headClassName?: string;
  // Mobile card layout: when no `mobilePrimary` column is set the first
  // visible non-hidden column acts as the primary. The primary cell renders
  // bold at the top of the card without a label; the rest stack below as
  // labelled key/value pairs. `mobileHidden` skips a column entirely on
  // narrow viewports — useful for noisy details (IDs, raw URLs, internal
  // bookkeeping) that would crowd a card without aiding scanning.
  mobilePrimary?: boolean;
  mobileHidden?: boolean;
  /**
   * This column on the phone's default card (0.49 KIT-7; ignored with `mobileCard`):
   * `"primary"` — the card's title, as `mobilePrimary`; `"secondary"` — one of its
   * fields; `"hidden"` — not on the card, as `mobileHidden`. The card shows at most
   * three fields: the columns marked `"secondary"` when any
   * is, else the first three visible columns after the title. A field whose value is
   * empty — the cell returns `null`, `undefined`, `""` or the formatters' empty "—" —
   * is left out of that card. The columns the card does not show go into the opened
   * row with `mobileDetailsInRow`. A `noRowLink` column (the cell's own buttons or link)
   * counts as a field: past the third it leaves the card with its action, and a
   * development build says so once per table and column key. Give a column of row
   * actions `role: "actions"` instead: it is then no field, and the card draws it after
   * them.
   */
  mobile?: "primary" | "secondary" | "hidden";
  /**
   * What the column is (0.49 KIT-7), for the phone's default card; the desktop table is
   * unchanged.
   *
   * - `"status"`: its value sits as a chip beside the title instead of as a label/value
   *   line, and takes none of the card's three fields. A cell that returns text is drawn
   *   in a neutral `Chip`; one that returns an element (a `Chip` with its own tone, a
   *   `StatusDot`) is drawn as it is.
   * - `"actions"`: the row's buttons (`rowActionsColumn` sets it). Never the card's title
   *   and never one of its three fields: the card draws it after them, at its end,
   *   whether or not other columns are marked `mobile: "secondary"`; only `mobileHidden`
   *   / `mobile: "hidden"` take it off. Its cell keeps its own clicks, as `noRowLink`:
   *   no row link wraps it, and a card that draws it is not a link.
   */
  role?: "status" | "actions";
  /**
   * Set on a column whose cell renders its own `<a>` (or anything else that must
   * keep its own click): the row anchor of `rowHref` then skips it and lands on
   * the next column that allows wrapping (Keksdose feedback #451). Without it the
   * fallback can wrap such a cell the moment the headline column is hidden from
   * the settings panel — `<a>` inside `<a>`, which React warns about and which
   * kills the inner link outright, since RowLink cancels the click on the capture
   * phase and the cell's own `stopPropagation` then blocks the row handler too.
   * The rejected alternative was sniffing the rendered output for an anchor: a
   * cell that renders a link is a fact its author knows and the renderer cannot
   * see without reaching into React elements it deliberately treats as opaque.
   */
  noRowLink?: boolean;
  /**
   * The direction this column sorts in on its FIRST click. `"desc"` for money and
   * count columns, where the rows worth reading are the large ones and an ascending
   * first click opens on the zero rows (keksdose's aggregated report tables). The
   * rest of the cycle follows from it — see {@link DataTableProps.sortCycle}.
   * Default `"asc"`.
   */
  firstSort?: SortDir;
  /**
   * The column's name as plain text, for the places a ReactNode `header` cannot go:
   * the phone sort control's options ({@link DataTableProps.mobileSort}), the spoken
   * "Sorted by …" and the column-settings checklist. Only needed when `header` is not
   * a string (an icon, a unit suffix); without it those places fall back to the
   * header string, then to `key`.
   */
  headerText?: string;
  /**
   * Extra attributes for this column's `<td>` in a given row — a `data-*` hook, a
   * `title`, an `aria-describedby`, a class. keksdose's accounts page
   * (accounts-page.tsx, the name and IBAN columns) is why it exists: its demo mode
   * blurs everything marked `data-private`, and with nowhere to put the marker on the
   * cell it wrapped every value in an inner `<span data-private>` — which blurs the
   * text but not the cell, and has to be remembered in every `cell` renderer.
   *
   * MERGED under the kit's own, which win: `className` is joined before the column's
   * `className` (so the column's alignment is still the alignment), `style` is laid
   * under a resized column's pinned width, and `data-col` and a `role` stay the
   * table's — `data-col` is how a resize finds the column's cells, and a `<td>` that
   * claims another role leaves its row's cell count wrong for a screen reader.
   *
   * On a phone the card field (`<dd>`, or the primary line) gets the `data-*`
   * attributes only: the rest — padding classes, `colSpan`, a width — describe a
   * table cell and would mean something else, or nothing, on a card.
   */
  cellProps?: (row: T) => DataTableCellProps | undefined;
  /** The same for the column's `<th>`, once. `scope`, `aria-sort`, `data-col` and the
   *  width a resize pins stay the table's, and the class list goes before
   *  `headClassName` for the same reason as in {@link cellProps}. */
  headProps?: DataTableHeadProps;
  /**
   * This column's cell in the table's totals row — a `<tfoot>` on a wide screen, a
   * labelled summary card under the list on a phone. kastlan's trial balance is why
   * it exists: it hand-built a debit/credit/balance strip in a `div` UNDER the table,
   * which lined up with no column, dropped out of the table's semantics, and stayed
   * put when the user hid or resized the columns it was summing.
   *
   * `rows` is every row that passes the current filters (in the current sort order),
   * NOT just the page on screen: a total that changes when the user pages is not a
   * total, and the trial balance has to balance on page 1 as much as on page 7. The
   * page is the second argument for the rare "subtotal of this page" footer.
   *
   * Under `serverPagination` the table only ever holds one page, so both arguments are
   * that page — a server-side table computes its totals on the server and returns
   * them here (`footer: () => fmt(response.totalDebit)`), ignoring the arguments.
   *
   * The cell takes the column's `className` (so a `text-end` amount column totals
   * end-aligned), its resized width, and drops out with the column when it is hidden.
   */
  footer?: (rows: T[], page: T[]) => ReactNode;
  /**
   * This column takes the width the others leave, and its text ellipsises (0.48,
   * keksdose live #451): `w-full max-w-0` on its cells, so in the table's auto layout it
   * is "the rest of the row" and one long title can no longer widen the table. One per
   * table. It has no resize handle, and a width stored for it (before it grew) is
   * ignored: it always takes the rest. Resize the others to change it. Opt-in: without it nothing
   * changes. It keeps at least 10rem: with {@link fitPriority} columns the table leaves
   * those out first, and scrolls sideways once none is left. Every other cell keeps one
   * line at Normal text size (`whitespace-nowrap`; a column's own
   * `not-large:whitespace-normal` lets its prose wrap), so a figure or a name is never
   * broken in two to make room for it.
   */
  grow?: boolean;
  /**
   * The least this `grow` column keeps, in rem (0.51.4; default 10): the floor below which
   * the table leaves out `fitPriority` columns, and once none is left, scrolls sideways.
   * Lower it for a column whose first words carry it — the feedback inbox's Subject, 8,
   * so the inbox at 768px with a sidebar keeps Subject, Status and the row actions
   * without scrolling (Kurvenschmiede). In rem, so Large text asks for more.
   */
  growMin?: number;
  /**
   * Leave this column out while the TABLE is too narrow for it (0.48, keksdose live
   * #451) — measured on the table's own scroller, so a sidebar, the window and Large
   * text count alike. The lowest number goes first (ties: the later column first), and
   * comes back last, once the scroller is as wide as the table needed with it. Columns
   * without it never go. Desktop only: the phone's card list is not narrowed.
   *
   * The Columns panel counts only what is drawn ("Columns (8/10)") and marks a column
   * left out this way "hidden for width". Ticking it there keeps it in for as long as
   * the table is mounted (not persisted): the table makes room by leaving out the next
   * one instead, and scrolls sideways once none is left. Unticking hides it as any column.
   */
  fitPriority?: number;
  /**
   * Start this column HIDDEN (0.48, keksdose dev #617) — for as long as the view saved
   * under `storageKey` holds no entry for it: on a first visit, on a device whose saved
   * view predates the column (or the flag), and for a column the app adds later. The
   * user's own choice in the Columns panel always wins: ticking it is remembered
   * (`shown` in the saved view), unticking it again stores it as any hidden column. The
   * default itself is never written into the saved view, so dropping the flag brings the
   * column back on every device where nobody chose. In the panel it is simply unticked —
   * not "hidden for width", which `fitPriority` alone says. Ignored, like every hidden
   * column, with `columnSettings={false}`: nothing could bring it back.
   */
  defaultHidden?: boolean;
}

/** A `data-*` attribute, typed so `{ "data-private": "" }` needs no cast. */
type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };

/** What {@link DataTableColumn.cellProps} may return. */
export type DataTableCellProps = TdHTMLAttributes<HTMLTableCellElement> & DataAttributes;

/** What {@link DataTableColumn.headProps} takes. */
export type DataTableHeadProps = ThHTMLAttributes<HTMLTableCellElement> & DataAttributes;

export interface ServerPagination {
  page: number; // 0-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Without it the page size is the server's to choose, and the pager shows no
   *  page-size select at all — one that changed nothing was a control that lied. */
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * A page is being fetched. The table marks itself `aria-busy`, dims the rows it is
   * still showing (they are the PREVIOUS page's, and about to go), and replaces the
   * empty state with a loading row when there is nothing to show yet — "no results"
   * while the first page is still in flight is a claim the table cannot make.
   *
   * The pager stays usable. Disabling it would drop focus from the very button the
   * user just pressed (a disabled button cannot hold focus), and a second click
   * during a fetch is a request the owner already has to handle for a slow network.
   */
  isLoading?: boolean;
}

export interface DataTableProps<T> {
  /** `readonly` since 0.52 (refactor audit 2026-10-30, API-7): the table never changes the
   *  arrays it is handed, so a caller's `as const` list or a query's frozen result needs no
   *  copy. Only widens: a mutable array is still one. The same for `columns` and `sorts`. */
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  rowKey: (row: T) => string | number;
  defaultPageSize?: number;
  onRowClick?: (row: T) => void;
  /**
   * The URL that shows this row, when one exists — the table then renders a REAL
   * anchor for it (Keksdose feedback #451, "to be able to middle click with the
   * mouse and open in a new tab"). A row that opens through `onRowClick` alone is
   * invisible to the browser: no middle click, no ⌘/Ctrl-click, no "copy link
   * address", no status-bar preview, no long-press menu on a phone. The
   * alternative was an `onAuxClick` that calls `window.open` — it buys back only
   * the middle click and loses the other four, none of which JavaScript can fake.
   *
   * Return `undefined` for a row that has no address of its own. Only wire this up
   * where the OPEN row is genuinely in the URL (a `?row=` param, a detail route);
   * a row whose expansion lives in local component state has no link to hand out,
   * and a link the target page cannot honour is worse than no link.
   *
   * The anchor covers the row's primary cell, not the whole `<tr>`: an `<a>` may
   * not wrap table cells, and the absolutely-positioned row overlay that is the
   * usual workaround would sit on top of the per-cell controls these rows carry
   * (status toggles, the selection checkbox, nested links) and swallow them.
   *
   * With `onRowClick` a plain click opens the row through it, in place. Without one
   * (0.52, refactor audit 2026-10-30, DSP-23 b) the click follows the link — through the
   * provider's `linkComponent` for an in-app path, as every kit link — and the phone
   * card is that link too; before, the click was cancelled and opened nothing.
   */
  rowHref?: (row: T) => string | undefined;
  expandedRow?: (row: T) => ReactNode | null;
  isExpanded?: (row: T) => boolean;
  /**
   * Extra classes for a row — the `<tr>` on desktop, the card on mobile. Merged last,
   * so a `hover:` fill here replaces the row's own `hover:bg-hover`.
   *
   * **A row you paint has to pick its own hover** (0.33, docs/colour-roles-harmonization.md
   * §12.2): the kit cannot see your rest colour, and `--bg-hover` is mixed against the
   * card. The rule: a hover differs from its rest by 1.08:1 or more, and every text role
   * on it keeps 4.5:1.
   * - A row that rests on the well (`bg-surface-2`) hovers to the CARD,
   *   `hover:bg-surface`: in light the well is the page, and `--bg-hover` sits 1.04:1
   *   from it.
   * - A row whose well MARKS A STATE (selected) keeps its fill and draws a 1 px inside
   *   line instead, since the card would read as "not selected":
   *   `bg-surface-2 hover:bg-surface-2 hover:outline hover:-outline-offset-1 hover:outline-strong`.
   *   An outline, not a shadow: a shadow on a `<tr>` is not painted by every engine.
   * - Not `--bg-active` for a selected row: its muted and money text fall to 3.8–4.7:1.
   */
  rowClassName?: (row: T) => string | undefined;
  /**
   * Extra DOM attributes for a row's container — the `<tr>` on desktop, the
   * `<li>` on mobile. For hooks that have to sit on the row itself rather than
   * inside a cell: guided-tour anchors, analytics ids, e2e selectors. Undefined
   * values are dropped, so a per-row conditional needs no filtering at the call
   * site. Not a styling escape hatch — that is `rowClassName`.
   */
  rowAttributes?: (row: T) => Record<string, string | undefined> | undefined;
  /**
   * Set false for a table that is short by construction — an invoice's line
   * items, a wizard's picks — where the pager is chrome around a list that can
   * never need one. Renders every row and drops the footer entirely. Ignored in
   * `serverPagination` mode, where the pager is the only way to reach the rest
   * of the data.
   */
  paginated?: boolean;
  empty?: ReactNode;
  /**
   * If set, the table persists filter / sort / page-size state to localStorage under this key.
   * Use a stable, unique key per table (e.g. "transactions-table").
   */
  storageKey?: string;
  /**
   * When true, mirror filter/sort/page state into URL search params so views are
   * shareable and bookmarkable. URL params used: `f.<column>`, `sort`, `p`, `ps`.
   * URL state takes precedence over localStorage on initial load. Requires the
   * consuming app to render inside a react-router Router (0.49: only with `urlSync` — a
   * table without it needs none). With `urlSync` and no Router, a development build
   * throws "DataTable urlSync requires a Router"; a production build keeps the view in
   * local state instead.
   *
   * `{ prefix }` namespaces them, for two URL-synced tables on one page:
   * `urlSync={{ prefix: "inv." }}` uses `inv.f.<column>`, `inv.sort`, `inv.p`, `inv.ps`.
   */
  urlSync?: TableUrlSync;
  /**
   * When true, the table fills its parent's height and scrolls INTERNALLY, with the
   * header pinned — so the page itself doesn't add a second, outer scrollbar. The parent
   * must give it a bounded height (e.g. a flex column inside the viewport-locked app
   * shell). See feedback #207.
   *
   * **The list page** (0.40, docs/page-layout-harmonization.md §1): the root carries
   * `data-fill-height`, and from `md` up AppShell's `<main>` turns into a flex column
   * while such a table is inside — the shell's banners keep their height, the page takes
   * the rest. Wrap every element between `<main>` and the table in `FillHeight` (or merge
   * `FILL_HEIGHT_CLASS`); nothing else to wire. The body never shrinks below `basis-48`
   * (12rem, about five rows): on a window too short for that, `<main>` scrolls again.
   *
   * **On a phone** the card list becomes the scroller ONLY when its parent really bounds
   * it — measured, not assumed (0.40, keksdose live #420): the list takes the flex
   * room it is given, and only when its rows overflow that room does it turn
   * `overflow-y-auto overscroll-contain`, with the filter button pinned above. Under an
   * unbounded parent — `AppShell` on a phone, where the DOCUMENT scrolls — it stays in
   * the page's flow and grows to its content. Until 0.40 it was a scroller either way,
   * and a scroller with nothing to scroll and `overscroll-contain` swallowed the page's
   * own scroll: a swipe that started on a card moved nothing. So `fillHeight` is safe
   * to pass at every width; `fillHeight={useBreakpoint("md")}` is no longer needed.
   *
   * The cure for TWO SCROLLBARS (round 0.34 C14, kastlan feedback 55): the default
   * `maxBodyHeight` scrolls the body inside a page that scrolls too. How a page fills
   * the height is in {@link DataTableProps.maxBodyHeight}'s note.
   */
  fillHeight?: boolean;
  /** How tall the scrolling body may get before it scrolls, as a CSS length.
   *
   *  Default `calc(100dvh - 12rem)`, which is what every caller had before this
   *  existed: a bound is what makes the sticky header work, because a header
   *  can only stick to a wrapper that actually scrolls. The cap assumes the
   *  table has page chrome above and below it, and a table that is the last
   *  thing on its page can afford more — ASPICE Atlas report #12, "for the 25
   *  elements there should in best case be no scrolling necessary".
   *
   *  Ignored under `fillHeight`, which bounds the body by its flex parent
   *  instead and is the stronger statement of the same intent.
   *
   *  **Two scrollbars** (round 0.34 C14, kastlan feedback 55). The cap scrolls the
   *  body INSIDE a page that, in most shells, scrolls itself: a table taller than
   *  the cap on a page with anything else on it shows two scrollbars side by side,
   *  and the wheel moves whichever is under the pointer. For a list page whose table
   *  is the point, fill the height instead, from `md` up (a phone scrolls the page
   *  and its card list as one) — docs/page-layout-harmonization.md §1.2 says which
   *  pages fill:
   *
   *  1. `<DataTable fillHeight>`: the table marks itself (`data-fill-height`), and
   *     AppShell's `<main>` becomes a flex column while it is inside;
   *  2. each element between `<main>` and the table is a `FillHeight` (the page's
   *     root, any wrapper on the way), or merges `FILL_HEIGHT_CLASS`.
   *
   *  Only the body then scrolls, under its pinned header, and every other page grows
   *  with its content as before (kastlan e3985c9, its leases list). A short table that
   *  is the last thing on its page can instead drop the cap: `maxBodyHeight="none"`. */
  maxBodyHeight?: string;
  /**
   * When provided, the table renders the supplied rows as-is (no client-side
   * filtering/sorting/slicing) and the pagination footer is driven by these
   * server-controlled values. Column-level filters and sorting are hidden
   * UNLESS the caller takes them over via `onFiltersChange`/`onSortsChange` —
   * the caller is then expected to translate the state into the server query
   * that produces `rows`.
   */
  serverPagination?: ServerPagination;
  /**
   * 0.48.1 (keksdose K-052-1): the rows are already filtered and sorted by the server —
   * render them as given. No client filter, no client sort, no client paging (every row
   * shows, as with `paginated={false}`). The column filters and sort headers behave as
   * under `serverPagination`: hidden unless the owner takes them over with
   * `onFiltersChange` / `onSortsChange`, and then a click only REPORTS the new state (a
   * header click calls `onSortsChange` with the next sort and the rows keep their order
   * until the owner re-queries and passes new ones).
   *
   * Defaults to `true` when {@link loadMore} is set — the slices it loads come from the
   * server in its order, and re-filtering them dropped rows (the other leg of each
   * transfer). Pass `serverRows={false}` for a client table that loads more chunks but
   * filters and sorts what it holds itself. `serverPagination` implies it regardless.
   */
  serverRows?: boolean;
  /**
   * Controlled filter/sort state. When the `on*Change` callback is provided
   * the table stops owning that piece of state: it renders `filters`/`sorts`
   * as given and reports user interactions through the callback (including
   * in serverPagination mode, where the UI is otherwise disabled).
   *
   * Page reset: on a client-side table, a change in the VALUE of `filters` or
   * `sorts` sends the table back to page 1 — whoever made the change, the user
   * through the header or the owner from outside (a saved view, a chip). Compared
   * by value, so passing a fresh but equal object on every render does not reset
   * anything. In `serverPagination` mode the owner's `page` is the page, and
   * resetting it on a filter change stays the owner's job.
   */
  filters?: FilterState;
  onFiltersChange?: (next: FilterState) => void;
  sorts?: readonly SortState[];
  onSortsChange?: (next: SortState[]) => void;
  /**
   * Controlled page size, as `sorts` above: the table pages by it and hands its pager's
   * choice to `onPageSizeChange` (`Infinity` is "All"). For tables that page ALIKE —
   * `TranslationReviewPanel`'s groups share one page size as they share one sort
   * (0.35). Left out, the table keeps its own, from `defaultPageSize`, the URL and
   * `storageKey`. A change of value sends a client-side table back to page 1. In
   * `serverPagination` mode the page size is `serverPagination.pageSize`.
   */
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * Opt-in multi-row selection. When provided, a leading
   * checkbox column is rendered with a select-all box in the header; the owner
   * holds the selected set and reacts via the callbacks. Rows for which
   * `isSelectable` returns false render no checkbox and are excluded from
   * select-all. See feedback #285 (bulk edit).
   *
   * **On a phone** (0.40, keksdose live #421) the cards enter a selection MODE: a long
   * press on a card (500 ms, keksdose's register gesture) selects it and turns every
   * card into a toggle with its box showing; a tap then selects or deselects. A
   * keyboard or screen reader enters through "Select rows" (`labels.selectRows`),
   * visually hidden until focused; in the mode a bar above the cards holds "Select all
   * rows" and Cancel (`labels.cancelSelection`). The mode lasts while anything is
   * selected — the bulk bar's Clear, the last box unticked or Cancel ends it — and swipe
   * actions rest while it is on. Render the owner's `BulkActionBar` as on desktop; it
   * appears with the first selected row. With `selection` the cards' text is not
   * selectable on a phone, and a linked card's long press selects instead of opening
   * the browser's link menu.
   */
  selection?: {
    isSelectable?: (row: T) => boolean;
    isSelected: (row: T) => boolean;
    onToggle: (row: T, checked: boolean) => void;
    /**
     * Commit a whole Shift+click range in ONE call (audit 2026-09-22).
     *
     * Optional and purely additive: without it the range is still walked row by
     * row, exactly as before. With it, an owner holding a `Set` copies that Set
     * once instead of once per row — a 400-row range was 400 `onToggle` calls,
     * 400 Set copies and 400 renders of this table, all to reach a state the
     * owner could have reached in one.
     *
     * `rows` is already filtered by `isSelectable` and is in the order the table
     * is showing, so it can be applied as-is.
     */
    onToggleMany?: (rows: T[], checked: boolean) => void;
    allSelected: boolean;
    someSelected: boolean;
    onToggleAll: (checked: boolean) => void;
  };
  /** User-facing strings (English defaults); pass translated overrides. Merged over
   *  `dataTable` from `<UiKitProvider labels>`, so a call site only states what
   *  differs for THIS table — typically `table`, its accessible name. */
  labels?: LabelOverride<DataTableLabels>;
  /** BCP-47 locale for the date filter's calendar and the pager's numbers. Falls
   *  back to `<UiKitProvider locale>`, then to the runtime's default. */
  locale?: string;
  /** localStorage namespace prefix for `storageKey` persistence: the stored key is this
   *  plus `storageKey`. Falls back to `<UiKitProvider tableStorageKeyPrefix>` (0.34, set
   *  your app's prefix there once), then to "hbui-table:". This prop wins over both. */
  storageKeyPrefix?: string;
  /**
   * On phones, surface the expanded row's detail in a full-screen dialog instead
   * of unfolding it inline (feedback #204). Desktop always uses inline expansion.
   */
  mobileExpandAsDialog?: boolean;
  /**
   * Show the `mobileHidden` columns in the OPENED row on the phone layout — inline
   * under the card, or in the `mobileExpandAsDialog` dialog — so a column dropped from
   * the card to keep it short is not lost (0.32, docs/text-size-harmonization.md §4:
   * "a new `mobileDetailsInRow` puts the `mobileHidden` columns into the opened row, so
   * nothing is lost"). At Large a card holds fewer facts per screen, and dropping one
   * from the card must not drop it from the phone.
   *
   * Each column is a label above its value, BEFORE what `expandedRow` renders: the
   * row's own facts first, then the app's detail or editor. A row opens as it always
   * does (`onRowClick` toggling `isExpanded`); with this set it may open without an
   * `expandedRow` at all. `rowActions`' column is one of them — the actions, which the
   * card otherwise offers only as swipes, reachable by a tap. Desktop is unaffected.
   */
  mobileDetailsInRow?: boolean;
  /**
   * The row's name, as plain text — for the "⋯" menu its `rowActions` collapse into at
   * Large ("Actions for Ada Example", §10.8). Without it every row's menu button is
   * named "Actions", which a screen reader cannot tell apart down the list.
   */
  rowName?: (row: T) => string | undefined;
  /**
   * The phone row dialog's `backCloses` ({@link FullBleedDialog}): whether it pushes
   * its own history entry so Back dismisses it. On by default — right for a row whose
   * expansion is component state, where nothing else would answer Back.
   *
   * **Set it `false` when the open row is in the URL** and opening it PUSHES (a
   * `?row=` written with `useSearchParamState(…, { history: "replace-on-clear" })` or
   * `"push"`): Back already closes the row through the router, and a second entry on
   * top of the page's is two owners of one Back press (keksdose dev #584). Keep it on
   * when opening the row REPLACES the URL — then nothing was pushed, and the dialog's
   * own entry is the only thing Back can pop.
   *
   * The table cannot decide this for you: `isExpanded` is a predicate, and neither it
   * nor `rowHref` says whether opening pushed or replaced (keksdose's feedback page
   * has `rowHref` with a REPLACING `?row=`, and needs the entry). Ignored unless
   * `mobileExpandAsDialog`.
   */
  mobileDialogBackCloses?: boolean;
  /**
   * Group the mobile card list into sections, each with a sticky header — the
   * "assistance"-style list (like the transactions list grouped by date, but by
   * whatever key you return, e.g. a name's first letter). The returned string is
   * the section a row belongs to; rows must already be ordered so equal keys are
   * contiguous (pair with a matching default sort). `mobileGroupLabel` formats
   * the header. Desktop is unaffected. Feedback #317.
   */
  mobileGroupBy?: ((row: T) => string) | DataTableGroupBy<T>;
  /** The section header's words for `mobileGroupBy`'s key. Wins over a level's own
   *  `label` when `mobileGroupBy` is a {@link DataTableGroupBy}. */
  mobileGroupLabel?: (key: string) => ReactNode;
  /**
   * Fully replace the default mobile card body (bold primary + labelled
   * key/value rows) with a compact custom layout, while keeping the shared
   * clickable/expandable row wrapper. Use when the stacked label/value grid
   * wastes space (feedback #317). Desktop is unaffected.
   *
   * It replaces the WHOLE body, `mobilePrimary` included: a column's
   * `mobilePrimary` cell is not drawn when `mobileCard` is set, so anything that
   * cell carried (keksdose's environment and rework chips, 0.27) must be drawn by
   * the card itself — as `FeedbackMobileCard` does.
   */
  mobileCard?: (row: T) => ReactNode;
  /**
   * A "Sort by" select and a direction button above the phone card list (keksdose
   * K10). The card list has no header row, so without it a phone user is stuck with
   * whatever order the table opened in. It drives the same sort state as the column
   * headers — `sorts`/`onSortsChange` when controlled, the URL and `storageKey` when
   * not — and offers the columns a header click could sort (those with a `sortBy`).
   * Each option is named by the column's `headerText`, else its string `header`.
   *
   * Off by default, so no existing phone layout gains a row. Strings:
   * {@link DataTableSortLabels}. Phones only; the desktop table is unchanged.
   */
  mobileSort?: boolean;
  /**
   * Swipe actions for a mobile row, revealed by dragging it horizontally. Return
   * `null` (or empty sides) for rows that should not move — a locked row, one whose
   * mutation is in flight, one the user has expanded.
   *
   * Prefer `start`/`end`: actions committed by dragging the row toward the reading
   * START or END of the line. In a left-to-right layout `end` is a drag to the
   * right, and in a right-to-left one it is a drag to the left — so a "drag forward
   * to archive" row stays forward in Arabic or Hebrew without a second definition.
   * `left`/`right` are the physical directions and keep meaning exactly that; each
   * is used only where the logical side for that direction is not given.
   *
   * Mobile only, and deliberately so: the desktop table already has room for an
   * actions column, and a drag gesture on a pointer device is a worse version of a
   * button. Wraps only the row body, so an expansion panel below stays put while the
   * row above it slides. The desktop's buttons for the same actions come with it — see
   * {@link DataTableProps.desktopSwipeActions}.
   */
  mobileSwipeActions?: (row: T) => MobileSwipeActions | null;
  /**
   * The desktop half of `mobileSwipeActions` (0.46, keksdose dev#598 — Marcel: every
   * table whose phone cards swipe gets a desktop actions column with the same actions):
   * an actions column DERIVED from the very plan the card swipes with, so the two
   * viewports offer the same functions and cannot drift. Each button runs the swipe's own
   * `onCommit` — the same confirm, the same undo toast. The reading-end side's actions
   * first, then the start side's, each once (by `SwipeAction.id`, else by label); a row
   * whose plan is `null` gets an empty cell. The column is hidden on the phone, where the
   * actions are the swipes, kept off the column settings, and its tooltips open toward
   * the row's start.
   *
   * On by default wherever `mobileSwipeActions` is given, so a new swipeable table cannot
   * forget it — except beside `rowActions`, whose column is the desktop's already (pass
   * `true` or options to add this one too). `false` where the desktop row carries every
   * one of those actions as its own buttons; say so at the call site. Options:
   * {@link DataTableDesktopSwipeActions}.
   */
  desktopSwipeActions?: boolean | DataTableDesktopSwipeActions<T>;
  /**
   * Renders as a full-width row above the data rows in the desktop table, and since
   * 0.51.7 as the first item of the phone's card list (audit 2026-10-30 DSP-2: the card
   * list dropped it, and kastlan's inline "Add meter" editor never appeared on a phone).
   * On the phone it is no card: no row link, swipe or selection toggle. For a
   * toggle that shows/hides a slice of rows, style it as an expand/collapse
   * disclosure (chevron + label) so it reads as part of the table rather
   * than a floating control above it. See feedback #10/#11 (transactions'
   * "hide upcoming/scheduled" toggle).
   */
  leadingRow?: ReactNode;
  /**
   * 0.48 (keksdose dev #603: "it should rather be sticky, so the user can show hide them
   * everywhere on click"): pin the {@link leadingRow} under the sticky header while the
   * rows scroll beneath both — its `top` is the header's measured height. It sticks
   * within the table's own scroller (a bounded body: `fillHeight` or `maxBodyHeight`).
   * On a phone (0.51.7) it is pinned at the top of the card list's scroller (the list
   * under a bounded `fillHeight`, else the page), with `mobileGroupBy`'s section headers
   * under it. Default: it scrolls with the rows.
   */
  leadingRowSticky?: boolean;
  /**
   * 0.48 (keksdose dev #605): group the desktop table's rows under full-width bands, one
   * level or two (period → day). Each band is a row header spanning the visible columns
   * (selection column included, hidden and fit-hidden columns not) with a label and an
   * end slot (counts, totals), and opens its own `<tbody>`, so a screen reader announces
   * it as the reader enters the group; the period band opens the first day's. Rows must
   * already be ordered so equal keys are contiguous (as for `mobileGroupBy`); grouping
   * runs over the rows on screen, page by page.
   *
   * The bands are sticky: the period under the header (and under a sticky
   * {@link leadingRow}), the day under the period — measured offsets, inside the table's
   * own scroller (`fillHeight` or `maxBodyHeight`). The `leadingRow` stays above the first
   * group. On a phone pass the same level to `mobileGroupBy`:
   * `groupBy={[period, day]} mobileGroupBy={period}`. See {@link DataTableGroupBy}.
   */
  groupBy?: DataTableGroupBy<T> | readonly [DataTableGroupBy<T>, DataTableGroupBy<T>?];
  /**
   * 0.48 (keksdose dev #605): a "load more" footer in place of the pager. The table
   * renders every row it is given (as `paginated={false}` does — pass that too, to say
   * so), and the footer asks the owner for the next slice: as it scrolls into view (an
   * IntersectionObserver, guarded against double calls while one is in flight) and with
   * a button the keyboard reaches, named by the app ("Load August 2026"). With
   * `serverPagination` it replaces that pager as well. Both layouts: on a phone it is the
   * card list's last item. Since 0.48.1 it implies {@link serverRows} — the rows are
   * rendered in the order given, unfiltered — unless `serverRows={false}`. See
   * {@link DataTableLoadMore}.
   */
  loadMore?: DataTableLoadMore;
  /**
   * 0.48.2 (keksdose dev #632, Marcel: "The table is extremely slow. Is it virtualised…?"):
   * render only the desktop rows near the visible part of the scroller, plus `overscan`
   * rows each side ({@link DataTableVirtualize}), with spacer rows standing in for the
   * rest. For long lists — keksdose's register under `loadMore` holds 1000+ rows. Opt-in;
   * without it every row renders, as before.
   *
   * - **Scroller:** the bounded body (`fillHeight` or `maxBodyHeight`), or the page when the
   *   body is unbounded (`maxBodyHeight="none"`): the window is what of the table both the
   *   scroller and the browser window show.
   * - **Kept rendered:** the header, the `leadingRow`, the group bands (sticky and stacked
   *   as before; a period's band while any of its rows is in view), every OPEN row (so an
   *   inline editor in `expandedRow` keeps its state), the roving tab stop and a row
   *   holding the focus. The `loadMore` footer follows the last spacer and loads once.
   * - **Heights:** each rendered row is measured and remembered by its key; a row not yet
   *   seen counts as the measured average (`estimateRowHeight` before any). The scroll
   *   height settles as the rows are seen; the browser's scroll anchoring holds the rows in
   *   view while a spacer above is corrected (Safari has none: a jump of the difference
   *   is possible there on the first pass).
   * - **Columns:** the header widths are measured once and locked in a `<colgroup>`, so the
   *   columns do not move as rows come and go; a wider cell scrolling in widens its column
   *   (once). Re-measured when the rows, the columns, a width or the scroller's width
   *   change. A `grow` column and a resized one are not locked.
   * - **Keyboard and screen reader:** Arrow/Home/End move over every row — the target is
   *   rendered, then focused (End reaches the last row); Shift+click ranges and select-all
   *   work on the data, not the DOM. The table has `aria-rowcount`, every rendered row its
   *   `aria-rowindex` (bands, details and the totals row counted); spacers are
   *   `aria-hidden`.
   * - **Trade-offs:** the browser's find-in-page sees only the rendered rows, and so does
   *   print; an `id` from `rowAttributes` (an anchor, an `aria-controls` target, a
   *   `scrollIntoView` on a fresh row) exists only while its row is rendered. Memoise
   *   `columns` (and `mobileCard`): the rows bail out of a render only then, and a scroll
   *   renders the rows that come in, not the whole window.
   * - **Phone:** desktop only. The card list renders every row it holds (`loadMore`,
   *   `paginated={false}`) or reveals them in chunks as it is scrolled (client paging).
   */
  virtualize?: boolean | DataTableVirtualize;
  /**
   * Row height. `"compact"` is lenkbank's in-card tables: five `text-xs` tables with
   * `px-2 py-1` cells sitting inside cards, which at the default padding came out at
   * twice their height and pushed the card's own content below the fold — the whole
   * reason they were still hand-rolled `<table>`s. It tightens the header, the cells,
   * the selection checkboxes, the pager and the phone cards together, so a compact
   * table is compact everywhere rather than a dense body under a roomy header.
   *
   * Defaults to `"comfortable"`, which is the table every caller has today.
   */
  density?: DataTableDensity;
  /**
   * What a repeated click on a sorted header does. `"tri"` (the default, and the only
   * behaviour before 0.8.0): first direction → the other → unsorted. `"toggle"`: first
   * direction ⇄ the other, never unsorted — for a report table that is always ranked
   * by something. Each column's first direction is its own `firstSort`. `aria-sort`
   * and the spoken "Sorted by …" follow whatever the click produced, so they are
   * right under either cycle.
   */
  sortCycle?: SortCycle;
  /**
   * The desktop table's power-user chrome, as one switch. `"full"` (default) is the
   * table as it has always been. `"minimal"` is a compact report table in a half-width
   * card: no column-settings rail, no resize handles, no multi-sort (and so no
   * "Shift-click to add a sort" tooltip) — the three pieces that cost width and
   * attention and that a ten-row summary never needs. Each can still be set on its
   * own below; an explicit boolean wins over the preset.
   */
  chrome?: DataTableChrome;
  /**
   * The vertical "Columns (n/m)" rail and its show/hide + auto-size panel. Default:
   * on, unless `chrome="minimal"`. With it off, every column is shown and a hidden
   * set persisted under `storageKey` is ignored — there would be no way to get a
   * column back.
   */
  columnSettings?: boolean;
  /**
   * The drag handles on the header's trailing edges. Default: on, unless
   * `chrome="minimal"`. With it off, widths persisted under `storageKey` are ignored
   * for the same reason as above: nothing could reset them.
   */
  resizable?: boolean;
  /**
   * Shift-click adds a secondary sort criterion. Default: on, unless
   * `chrome="minimal"`. With it off, a shift-click sorts like a plain click and the
   * header drops the tooltip that advertises the gesture.
   */
  multiSort?: boolean;
  /**
   * The card around the table — border, surface, radius, shadow. Set false to sit the
   * table inside the app's own card, under its own caption and CSV button, without a
   * frame inside a frame. The table's layout is unchanged; only the chrome goes.
   * Default true.
   */
  frame?: boolean;
  /**
   * Fade out an edge of the desktop table's scroller while columns are hidden behind
   * it (0.25) — the kit {@link Table}'s `edgeFade`, on the scroller this table draws
   * itself (DataTable renders its own `<table>`, not through Table, so the prop is
   * its own too). Measured: nothing is drawn while every column fits; the end with
   * columns behind it fades, both ends once scrolled into the middle, the reading
   * direction's ends in RTL. A `mask-image`, so no layout moves and no colour is
   * assumed; never animated. The scroller's own scrollbars stay out of it — its
   * vertical one sits at the inline end, in the very band that fades. Focus landing
   * in a cell behind the fade (a row action, a link, the selection box) is scrolled
   * clear of it. The scroller carries `data-overflow` (`"start"`, `"end"`, `"both"`).
   *
   * The phone layout is a card list that never scrolls sideways; it is unaffected.
   *
   * Off by default. It is visual only, but not neutral: on the bump it would change
   * how every overflowing desktop table in an app looks, and the mask covers
   * everything the scroller paints — the sticky header and totals rows, an app's own
   * marks at the scroller's edges. Opt in per table, or app-wide from your own wrapper.
   */
  edgeFade?: boolean;
  /** Extra classes for the table's root element (the card, or with `frame={false}`
   *  the plain wrapper). Merged last, so a caller's margin or width wins. */
  className?: string;
  /**
   * Per-row actions: an actions column of icon buttons at the row's end on desktop,
   * and the same actions as swipe actions on a phone card (where the column is not
   * shown; with `mobileDetailsInRow` also as buttons in the opened row). At Large and
   * Extra large two or more collapse into one "⋯" menu with each action's words
   * (0.32, §10.8, `RowActions`) — name the rows with `rowName` so each menu button is
   * "Actions for …". kastlan's `ResourceListPage` appended this column by hand to every CRUD
   * list — the edit pencil, the delete bin, a `useConfirm` before the delete, and a
   * `stopPropagation` on each so a press did not also open the row.
   *
   * `kind: "edit"` / `"delete"` bring the icon, the label (`labels.edit` /
   * `labels.delete`), the tone and the swipe side; any other action states its own
   * `label` and `icon`. `confirm` is the hook-in for a confirmation: pass the kit's
   * `useConfirm()` (or anything answering a boolean) and the action runs only on a yes.
   *
   *     const confirm = useConfirm();
   *     rowActions={[
   *       { kind: "edit", onAction: openEditor },
   *       { kind: "delete", onAction: (r) => remove(r.id),
   *         confirm: (r) => confirm({ title: t("delete", { name: r.name }), tone: "danger" }) },
   *     ]}
   *
   * A function receives the row, for actions that differ per row. An explicit
   * `mobileSwipeActions` wins over the swipes derived from here.
   */
  rowActions?: DataTableRowAction<T>[] | ((row: T) => DataTableRowAction<T>[]);
  /**
   * The `rowActions` column's heading (0.46.1, keksdose dev#598 rework — Marcel: a
   * VISIBLE "Actions" heading on every table with an actions column). Default: the
   * provider's `dataTable.actions` ("Actions"), shown, end-aligned over the buttons. A
   * node replaces it; `false` keeps the pre-0.46.1 heading, named for a screen reader
   * only.
   */
  rowActionsHeader?: ReactNode | false;
  /**
   * The bar above the table — a search field, filter chips, a create button. Inside
   * the table's frame, above the header, on desktop and phone alike (resource-list
   * pages set a search box in a `div` above the card, outside the frame it filters).
   */
  toolbar?: ReactNode;
  /**
   * The totals row's name — "Total", "Summe", "Totals as of 30 June". It is the row's
   * header: rendered as a `<th scope="row">` in the first visible column that has no
   * `footer` of its own (falling back to the first visible column if every one has a
   * value), so a screen reader reads "Total, Debit, 12 400.00" for the cell beside it.
   * On a phone it heads the summary card, which is also named by it.
   *
   * There is no built-in default word: a new kit label key is a silent English string
   * in every translated app (see `missingKitLabels`), and the caller has the
   * word in its own catalogue already. Without it the row is unlabelled on screen —
   * pass one.
   */
  footerLabel?: ReactNode;
  /**
   * Show the totals row. Default: shown when any column declares a `footer`. Set
   * false to drop it without touching the column definitions (a "show totals"
   * switch). The row is also left out while there are no rows to total — a row of
   * zeroes under "No results" says nothing the empty state has not.
   */
  footer?: boolean;
}

/** One entry of {@link DataTableProps.rowActions}. */
export interface DataTableRowAction<T> {
  /** A preset: `"edit"` (pencil, `labels.edit`, swipes toward the END) or `"delete"`
   *  (bin, `labels.delete`, danger tone, swipes toward the START). */
  kind?: "edit" | "delete";
  /** The action's name — its tooltip, accessible name and swipe label. Required
   *  without a `kind`. */
  label?: string;
  /** The glyph. Required without a `kind`. */
  icon?: ReactNode;
  /** Runs after `confirm` (when given) has said yes. */
  onAction: (row: T) => void;
  /** Asked before `onAction`; a `false` (or a promise of one) cancels. */
  confirm?: (row: T) => boolean | Promise<boolean>;
  /** Default: `"danger"` for `kind: "delete"`, else `"default"`. */
  tone?: "default" | "danger";
  /** Leave the action out for this row. */
  hidden?: (row: T) => boolean;
  /** Why the action is locked for this row — the button stays focusable and says so,
   *  and the row gets no swipe for it. See `IconButton`'s `disabledReason`. */
  disabledReason?: (row: T) => ReactNode;
  /** Which way the phone card is dragged to commit it, or `false` for no swipe.
   *  Default: `"start"` for a danger action, `"end"` otherwise. */
  swipe?: "start" | "end" | false;
}

/** See {@link DataTableProps.chrome}. */
export type DataTableChrome = "full" | "minimal";

/** See {@link DataTableProps.density}. */
export type DataTableDensity = "comfortable" | "compact";

export type FilterState = Record<string, FilterValue>;
export type { SortState };

/** What {@link DataTableProps.mobileSwipeActions} returns for one row. */
export interface MobileSwipeActions {
  /** Committed by dragging toward the reading start (left in LTR, right in RTL). */
  start?: SwipeAction[];
  /** Committed by dragging toward the reading end (right in LTR, left in RTL). */
  end?: SwipeAction[];
  /** Committed by dragging physically LEFT, whatever the direction. */
  left?: SwipeAction[];
  /** Committed by dragging physically RIGHT, whatever the direction. */
  right?: SwipeAction[];
}

/** How {@link DataTableProps.desktopSwipeActions} draws the column (0.46, dev#598). */
export interface DataTableDesktopSwipeActions<T> {
  /** Leave an action out because the row already has its own button for it — keksdose's
   *  feedback inbox, whose status cell offers `advance` and `wont_do`
   *  (`feedbackSwipeOmitShown`). Match on `action.id` rather than the translated label. */
  omit?: (action: SwipeAction, row: T) => boolean;
  /** The row's name for the "⋯" menu ("Actions for …"). Default: the table's `rowName`. */
  name?: (row: T) => string | null | undefined;
  /** {@link RowActionsCollapse}; default `"auto"`. A table whose rows offer more than two
   *  actions passes `"menu"`, so the column does not switch between icons and a menu. */
  collapse?: RowActionsCollapse;
  /**
   * Whether an action COMMITS, refused with the reason under a locked
   * `WriteLockProvider` ({@link CommitScope}) — a swipe has no such state, so a plan
   * usually returns nothing for a locked row and the desktop shows nothing either; with
   * this the plan can stay and the desktop says why. Per action as a function. Default:
   * no commit scope (the plan decides).
   */
  commit?: CommitScope | ((action: SwipeAction, row: T) => CommitScope | undefined);
  /**
   * The column's heading (0.46.1, keksdose dev#598 rework — Marcel: a VISIBLE "Actions"
   * heading on every table with an actions column). Default: the provider's
   * `dataTable.actions` ("Actions"), shown, end-aligned over the buttons. A node
   * replaces it; `false` keeps the 0.46.0 heading, named for a screen reader only.
   */
  header?: ReactNode | false;
}

/**
 * A totals-row cell: pinned to the scroller's bottom edge, on the header's surface.
 * The rule above it is an inset shadow rather than a `border-t`: the table collapses
 * its borders, and a collapsed border belongs to the TABLE, not the cell, so it stays
 * behind at the bottom of the rows while the sticky cell rides over them.
 */
const FOOTER_CELL = "sticky bottom-0 z-10 bg-surface-2 shadow-[inset_0_2px_0_var(--border-strong)]";

/** Where focus that leaves a row is still the row's (DSP-4): an overlay — a confirm, a
 *  menu, a sheet — hands it back or closes with the row it was about. The kit marks its
 *  own (`data-kit-layer`); an app's dialog says what it is. */
const OVERLAY_SELECTOR = '[data-kit-layer],[role="dialog"],[role="alertdialog"],[aria-modal="true"],[role="menu"]';

/** How long a filter's "n of m rows" waits for the typing to pause (DSP-23 d): longer than
 *  the gap between two keystrokes, short enough to answer the word just typed. */
const FILTER_ANNOUNCE_DELAY_MS = 500;

// ---------- Phone sort control (keksdose K10) ----------

/**
 * The phone sort control's strings (keksdose K10). They are `dataTable` strings —
 * read from the table's resolved labels, so the `labels` prop and the provider's
 * `dataTable` namespace reach them — and are declared here, with the table's other
 * public types (the control itself, `MobileSort`, is in data-table-mobile.tsx), with
 * English defaults until `DataTableLabels` declares them itself.
 */
export interface DataTableSortLabels {
  /** The control's visible label: "Sort by". */
  sortBy: string;
  /** The "no sort" option — the rows in the order they were given: "Default order". */
  sortDefault: string;
  /** The direction button's name while the sort ascends: "Ascending". */
  sortAscending: string;
  /** …and while it descends: "Descending". */
  sortDescending: string;
}

/** The phone sort control's words, as they sit in {@link DEFAULT_DATA_TABLE_LABELS}
 *  (DataTableLabels extends DataTableSortLabels; one source for the English). */
export const DEFAULT_DATA_TABLE_SORT_LABELS: DataTableSortLabels = {
  sortBy: DEFAULT_DATA_TABLE_LABELS.sortBy,
  sortDefault: DEFAULT_DATA_TABLE_LABELS.sortDefault,
  sortAscending: DEFAULT_DATA_TABLE_LABELS.sortAscending,
  sortDescending: DEFAULT_DATA_TABLE_LABELS.sortDescending,
};

const flipDir = (d: SortDir): SortDir => (d === "asc" ? "desc" : "asc");

// `virtualize`'s constants (0.48.2): the band levels a group's `<tbody>` opens with.
const NO_BANDS: readonly (1 | 2)[] = [];
const BAND_1: readonly (1 | 2)[] = [1];
const BAND_2: readonly (1 | 2)[] = [2];
const BAND_1_2: readonly (1 | 2)[] = [1, 2];
const NO_VIRTUAL_OPTIONS: DataTableVirtualize = {};

// `moveRowFocus` (the roving rows' Arrow/Home/End) lives with the row in data-table-row.tsx.

// ---------- Main DataTable ----------

import { DEFAULT_PERSIST_PREFIX, useTableState, type TableUrlSync } from "./use-table-state";
import { useMobileReveal } from "./use-mobile-reveal";
import { GROW_CELL_CLASS, GROW_PEER_CELL_CLASS, useColumnFit } from "./data-table-fit";

export function DataTable<T>({
  rows,
  columns: columnsProp,
  rowKey,
  defaultPageSize = 25,
  onRowClick,
  rowHref,
  expandedRow,
  isExpanded,
  rowClassName,
  rowAttributes,
  paginated = true,
  empty,
  storageKey,
  urlSync = false,
  fillHeight = false,
  maxBodyHeight = "calc(100dvh - 12rem)",
  serverPagination,
  serverRows: serverRowsProp,
  filters: filtersProp,
  onFiltersChange,
  sorts: sortsProp,
  onSortsChange,
  pageSize: pageSizeProp,
  onPageSizeChange,
  selection,
  labels: labelsProp,
  locale: localeProp,
  storageKeyPrefix: storageKeyPrefixProp,
  mobileExpandAsDialog = false,
  mobileDetailsInRow = false,
  rowName,
  mobileDialogBackCloses = true,
  mobileGroupBy,
  mobileGroupLabel,
  mobileCard,
  mobileSort = false,
  mobileSwipeActions,
  desktopSwipeActions,
  leadingRow,
  leadingRowSticky = false,
  groupBy,
  loadMore,
  virtualize = false,
  density = "comfortable",
  sortCycle = "tri",
  chrome = "full",
  columnSettings: columnSettingsProp,
  resizable: resizableProp,
  multiSort: multiSortProp,
  frame = true,
  edgeFade = false,
  className,
  rowActions,
  rowActionsHeader,
  toolbar,
  footerLabel,
  footer: footerProp,
}: DataTableProps<T>) {
  const compact = density === "compact";
  const minimal = chrome === "minimal";
  const columnSettings = columnSettingsProp ?? !minimal;
  const resizable = resizableProp ?? !minimal;
  const multiSort = multiSortProp ?? !minimal;
  const isServer = !!serverPagination;
  // The server filtered and sorted these rows (0.48.1, K-052-1): no client filter, sort
  // or paging, and the sort/filter UI only reports to the owner. `isServer` keeps
  // meaning "the server pages" (its pager, its page and page size).
  const serverRows = isServer || (serverRowsProp ?? !!loadMore);
  const isLoading = !!serverPagination?.isLoading;
  // prop > provider > English, through the table's own resolver rather than
  // `useKitLabels`: that resolver derives `columnsCount` from a translated `columns`,
  // and a plain merge would skip it. `presets` is a record and is merged key by key,
  // as the provider merges it, so a call site renaming one preset keeps the provider's
  // other ten. Memoised because the announcement effects below list `labels` as a
  // dependency, and a fresh object every render would re-run them for nothing.
  const labelOverrides = useKitLabelOverrides("dataTable");
  // prop > provider > the kit's default, the order every kit setting resolves in (round
  // 0.34 C5, KS U4): one prefix on the provider reaches the tables an app cannot pass a
  // prop to, `TranslationReviewPanel`'s among them.
  const providerStorageKeyPrefix = useKitTableStorageKeyPrefix();
  const storageKeyPrefix = storageKeyPrefixProp ?? providerStorageKeyPrefix ?? DEFAULT_PERSIST_PREFIX;
  const labels = useMemo(() => resolveDataTableLabels(labelOverrides, labelsProp), [labelOverrides, labelsProp]);
  const locale = useKitLocale(localeProp);

  // ---- Row actions ---- (data-table-row-actions.tsx)
  // The actions column joins the caller's columns; on a phone the same actions are the
  // card's swipes, unless the caller's own `mobileSwipeActions` says otherwise.
  const { columns, swipesFromActions } = useRowActionColumn({
    columns: columnsProp,
    rowActions,
    rowActionsHeader,
    rowName,
    labels,
    density,
    mobileSwipeActions,
    desktopSwipeActions,
  });
  const swipeActionsFor = mobileSwipeActions ?? (rowActions ? swipesFromActions : undefined);

  // Sorting, filtering and paging all change WHICH rows are on screen without
  // moving focus — the header button the user pressed is still the header button
  // they are on — so there is no other channel to say it on. See use-announce.ts.
  const { announce, regionProps } = useAnnounce();
  const {
    sorts,
    filters,
    setInternalSorts,
    setInternalFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    widths: storedWidths,
    setWidths,
    hiddenCols: storedHiddenCols,
    setHiddenCols,
    showSettings,
    setShowSettings,
    headRefs,
  } = useTableState({
    columns,
    storageKey,
    storageKeyPrefix,
    urlSync,
    defaultPageSize,
    sortsProp,
    filtersProp,
    // Ignored in `serverPagination` mode, where the owner's is the page size.
    pageSizeProp: isServer ? undefined : pageSizeProp,
  });

  // With the controls that change them switched off, persisted widths and hidden
  // columns are ignored rather than applied: a table cannot be left in a state the
  // user has no control to get out of. They stay in storage untouched, so turning
  // the control back on brings them back.
  // A `grow` column takes the rest of the row by design (0.48): a width stored for it
  // (a drag or "Auto-size columns" before it grew, KS N2) is ignored, and it has no
  // handle, so it can never pin it again. Ignored rather than deleted from storage, as
  // the widths above; the next resize or auto-size writes a blob without it.
  // Keyed on the `grow` column's key, not the columns array: an inline `columns={…}`
  // gave every render new widths, and the fit measured the table for it (DSP-19).
  const growKey = columns.find((c) => c.grow)?.key;
  const widths = useMemo(() => {
    if (!resizable) return {};
    if (!growKey || !(growKey in storedWidths)) return storedWidths;
    const { [growKey]: _ignored, ...rest } = storedWidths;
    return rest;
  }, [resizable, storedWidths, growKey]);
  const hiddenCols = useMemo(
    () => (columnSettings ? storedHiddenCols : new Set<string>()),
    [columnSettings, storedHiddenCols],
  );

  // Every call site builds `columns` inline — `columns={[{ key: "name", … }]}` right
  // there in the JSX — so the array is a new object on every render of the page around
  // the table, and a `useMemo` keyed on its identity memoises nothing. The three below
  // walk all the rows; a sibling field being typed into re-filtered and re-sorted the
  // whole dataset on every keystroke.
  //
  // What they actually need from `columns` is WHICH columns there are, so that is what
  // they are keyed on. The trade-off is deliberate and narrow: swapping a column's
  // `sortBy`/`filter`/`filterBy` FUNCTION while its `key` stays the same no longer
  // invalidates on its own. A rule that changes is a different column — give it a
  // different key — and anything the rule reads (rows, filters, sorts) is a dependency
  // in its own right.
  const columnSig = columns.map((c) => c.key).join("\u0000");
  // The select filters' declared option lists are the one part of a column definition
  // the memo below reads as DATA rather than as a rule, and a caller may recompute
  // them (a lookup that arrived, a saved view applied) without the column set moving.
  const selectOptionsSig = columns
    .map((c) => {
      const f = resolveFilter(c);
      if (!f || f.type !== "select" || !f.options) return "";
      return `${c.key}:${f.options.map((o) => `${o.value}=${o.label ?? ""}`).join(",")}`;
    })
    .join("\u0000");

  const selectOptionsByKey = useMemo(() => {
    const map: Record<string, { value: string; label: string }[]> = {};
    for (const col of columns) {
      const f = resolveFilter(col);
      if (!f || f.type !== "select") continue;
      if (f.options && f.options.length > 0) {
        map[col.key] = f.options.map((o) => ({ value: o.value, label: o.label ?? o.value }));
        continue;
      }
      const seen = new Set<string>();
      for (const row of rows) {
        const v = f.getValue(row);
        if (v && !seen.has(v)) seen.add(v);
      }
      map[col.key] = Array.from(seen)
        .sort((a, b) => compareSortValues(a, b, locale))
        .map((v) => ({ value: v, label: v }));
    }
    return map;
    // `columns` by signature — see the note above the signatures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnSig, selectOptionsSig, rows, locale]);

  const filtered = useMemo(() => {
    if (serverRows) return rows;
    let result = rows;
    for (const col of columns) {
      const state = filters[col.key];
      if (!state || !isFilterActive(state)) continue;
      result = result.filter((row) => rowMatches(col, row, state, locale));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columnSig, filters, serverRows, locale]);

  const sorted = useMemo(() => {
    if (serverRows) return filtered;
    // Priority chain: the first sort key that distinguishes two rows wins;
    // nulls sort last for that key regardless of direction (as before).
    const chain = sorts
      .map((s) => {
        const col = columns.find((c) => c.key === s.key);
        return col?.sortBy ? { sortBy: col.sortBy, dir: s.dir } : null;
      })
      .filter((c): c is { sortBy: (row: T) => string | number | null | undefined; dir: "asc" | "desc" } => c !== null);
    if (!chain.length) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      for (const { sortBy, dir } of chain) {
        const av = sortBy(a);
        const bv = sortBy(b);
        if (av == null && bv == null) continue;
        if (av == null) return 1;
        if (bv == null) return -1;
        // The order `compareSortValues` exports (0.52): one rule, here and in an app's
        // own list beside the table. Nulls are last above, in either direction.
        const order = compareSortValues(av, bv, locale);
        if (order !== 0) return dir === "asc" ? order : -order;
      }
      return 0;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sorts, columnSig, serverRows, locale]);

  // `paginated={false}` is expressed as "page size = everything" rather than as a
  // second code path, so slicing, the page clamp and the range summary all keep
  // exactly one definition.
  const unpaged = !isServer && (!paginated || !!loadMore || serverRows);
  const effectivePageSize = isServer
    ? serverPagination!.pageSize
    : unpaged || pageSize === Infinity
      ? sorted.length || 1
      : pageSize;
  const paginationTotal = isServer ? serverPagination!.total : sorted.length;
  const paginationPageSize = isServer ? serverPagination!.pageSize : pageSize;
  const totalPages = isServer
    ? Math.max(1, Math.ceil(serverPagination!.total / Math.max(1, serverPagination!.pageSize)))
    : Math.max(1, Math.ceil(sorted.length / effectivePageSize));
  const safePage = isServer
    ? Math.min(Math.max(0, serverPagination!.page), totalPages - 1)
    : Math.min(page, totalPages - 1);
  // Memoised (refactor audit 2026-10-30, DSP-19): the fit, the rows' window and the
  // range selection compare the page's rows by identity, and a fresh `slice(…)` on every
  // render of a paginated table — the default — had the fit lay the whole table out on a
  // ticked box, a keystroke, any parent render.
  const wholeList = isServer || unpaged || pageSize === Infinity;
  const slice = useMemo(
    () =>
      wholeList ? sorted : sorted.slice(safePage * effectivePageSize, safePage * effectivePageSize + effectivePageSize),
    [wholeList, sorted, safePage, effectivePageSize],
  );

  const toggleSort = (key: string, shiftKey: boolean) => {
    const col = columns.find((c) => c.key === key);
    // The cycle is the table's, the first direction the column's. The announcement
    // below reads the RESULT, so it can never describe a step the cycle did not take.
    const next = nextSorts(sorts, key, multiSort && shiftKey, {
      firstDir: col?.firstSort,
      cycle: sortCycle,
    });
    commitSorts(next, key);
  };

  // Header clicks and the phone sort control (`mobileSort`) land here alike, so both
  // go through the same owner and say the same thing.
  const commitSorts = (next: SortState[], key: string) => {
    const col = columns.find((c) => c.key === key);
    if (onSortsChange) onSortsChange(next);
    else setInternalSorts(next);

    // Announce the column the user just pressed, not `next[0]`: a shift-click adds a
    // criterion BEHIND the existing one, and answering "Sorted by Date" to a click on
    // Name misreports what the click did. The third click drops the column entirely,
    // which is the state a user is most likely to have reached by accident.
    const name = col ? columnLabel(col, labels) : key;
    const entry = next.find((s) => s.key === key);
    announce(
      !entry
        ? labels.sortCleared(name)
        : entry.dir === "asc"
          ? labels.sortedAscending(name)
          : labels.sortedDescending(name),
    );
  };

  const setFilterValue = (key: string, value: FilterValue) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, [key]: value });
      // No `setPage(0)` here: the page resets when the new value comes back in
      // through the prop — see the controlled reset in useTableState. Resetting now
      // would move to page 1 for a change the owner may yet refuse.
      return;
    }
    setInternalFilters((s) => ({ ...s, [key]: value }));
    setPage(0);
  };

  const clearFilter = (key: string) => {
    if (onFiltersChange) {
      const rest = { ...filters };
      delete rest[key];
      onFiltersChange(rest);
      return;
    }
    setInternalFilters((s) => {
      const rest = { ...s };
      delete rest[key];
      return rest;
    });
    setPage(0);
  };

  // Clear every column filter at once (drives the mobile filter sheet's
  // "clear all"). Only touches keys the table actually exposes as filters.
  const clearAllFilters = () => {
    const keys = columns
      .filter((col) => (!serverRows || onFiltersChange ? resolveFilter(col) : null))
      .map((col) => col.key);
    if (!keys.length) return;
    if (onFiltersChange) {
      const rest = { ...filters };
      for (const k of keys) delete rest[k];
      onFiltersChange(rest);
      return;
    }
    setInternalFilters((s) => {
      const rest = { ...s };
      for (const k of keys) delete rest[k];
      return rest;
    });
    setPage(0);
  };

  // The result count only exists AFTER the table has re-filtered, so the sentence is
  // spoken from the render that produced the new number rather than from the handler
  // that changed the filter. Keyed on a serialised copy of the filter state, for two
  // reasons: a controlled `filters` prop arrives with a fresh identity on every
  // parent render, and a change the OWNER makes (a saved view applied, a filter chip
  // dismissed outside the table) moves the same rows and deserves the same sentence.
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  // Seeded with the mount value: a live region that speaks on first paint talks over
  // the page the user has just opened, and every table on that page does it at once.
  const announcedFilterKey = useRef(filterKey);
  // Spoken once the typing pauses (refactor audit 2026-10-30, DSP-23 d): every keystroke
  // in a text filter is a new filter, and "12 of 137 rows" on each one — through the live
  // region's 50 ms reset — talked over the very letters being typed. The count is read
  // when the sentence goes out, so it is the rows the pause left on screen.
  const filterSpeech = useRef({ shown: filtered.length, total: rows.length, labels });
  useLayoutEffect(() => {
    filterSpeech.current = { shown: filtered.length, total: rows.length, labels };
  });
  const filterTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(filterTimer.current), []);
  useEffect(() => {
    if (announcedFilterKey.current === filterKey) return;
    announcedFilterKey.current = filterKey;
    // A server-paginated table does not do the filtering: the matching rows arrive on
    // some later render from the caller, and `serverPagination.total` is ALREADY the
    // filtered total — so the "n of m" sentence has no second number to give here.
    // Saying nothing is better than announcing the page size as a result count.
    if (serverRows) return;
    clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => {
      const { shown, total, labels: words } = filterSpeech.current;
      announce(words.filterResults(shown, total));
    }, FILTER_ANNOUNCE_DELAY_MS);
  }, [filterKey, serverRows, announce]);

  // 1-based, because that is what the page strip shows and what a person says.
  const goToPage = (p: number) => {
    if (isServer) serverPagination!.onPageChange(p);
    else setPage(p);
    announce(labels.pageChanged(p + 1, totalPages));
  };

  // 0.48 (keksdose live #451): the `fitPriority` columns the table's width leaves out
  // (data-table-fit.ts). Desktop only; the scroller is read after render.
  // Large and Extra large: read here, as the fit re-measures when it changes.
  const large = useLargeText();
  const { autoHidden, keep: keepColumn } = useColumnFit({
    columns,
    hiddenCols,
    headRefs,
    scroller: () => desktopScroller.current,
    enabled: !usePhoneLayout(),
    // Measured only when one of these changed (0.48.2): not on a ticked box. The columns
    // by their keys (DSP-19): an inline `columns={…}` is a new array every render.
    content: [slice, columnSig, hiddenCols, widths, density, large],
  });
  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.key) && !autoHidden.has(c.key)),
    [columns, hiddenCols, autoHidden],
  );
  // With a `grow` column drawn, every other cell keeps one line at Normal (kastlan S2,
  // 0.48): the `w-full` column squeezed them to their min-content width.
  const growDrawn = visibleColumns.some((c) => c.grow);

  // Which cell carries the row's link when `rowHref` is set (feedback #451). The
  // `mobilePrimary` column is the row's headline by declaration, so it is both the
  // widest target and the one the pointer is already over; falls back to the first
  // column, and falls back again if the user has hidden the primary one from the
  // column panel. Resolved from `visibleColumns` for exactly that reason — off a
  // raw `columns` lookup a hidden headline would leave the row with no link at all.
  //
  // `noRowLink` (and `role: "actions"`) columns are skipped in BOTH steps: wrapping a
  // cell that owns an anchor nests two links and disables the inner one (see the prop's
  // note). If nothing visible is left to wrap, the row gets NO anchor — an anchor
  // over the one cell there is would cancel that cell's own click and hand back
  // nothing, and a row without a link still behaves exactly as it did before #451.
  const linkColumn = rowHref
    ? (visibleColumns.find((c) => c.mobilePrimary && !keepsOwnClicks(c)) ??
      visibleColumns.find((c) => !keepsOwnClicks(c)))
    : undefined;

  // ---- Column resize ---- (data-table-resize.ts: pointer capture, one `setWidths` per
  // drag, and the page's cursor and selection handed back on an unmount mid-drag)
  const { startResize, moveResize, finishResize, autoSizeAll } = useColumnResize({
    headRefs,
    widths,
    setWidths,
    columns,
    // The columns left out for width have no header to measure either.
    hiddenCols: autoHidden.size > 0 ? new Set([...hiddenCols, ...autoHidden]) : hiddenCols,
  });

  const visibleCount = visibleColumns.length;
  const totalCount = columns.length;
  // Spans the full row width including the optional leading selection column.
  const totalColSpan = visibleCount + (selection ? 1 : 0);

  // ---- Totals row ----
  // `sorted`, not `slice`: the totals are of everything the filters let through, so
  // paging does not move them — see `DataTableColumn.footer`. In server mode `sorted`
  // IS the page (the table holds nothing else), which the prop's note spells out.
  const hasFooterColumns = columns.some((c) => c.footer);
  const showFooter = footerProp !== false && hasFooterColumns && sorted.length > 0;
  // The row header sits in the first visible column that has nothing of its own to
  // show — so hiding the "Account" column moves "Total" into "Name" rather than
  // dropping it — and on the first visible column when every one carries a value.
  const footerLabelCol = showFooter
    ? (visibleColumns.find((c) => !c.footer && !isTableOwnColumn(c.key)) ?? visibleColumns[0])
    : undefined;
  // `footer` keeps its `T[]` parameters: narrowed to `readonly`, a caller's footer typed
  // `(rows: Row[]) => …` would no longer fit (API-7 only widens). The table hands over the
  // arrays it holds, as before, and changes neither.
  const footerValue = (col: DataTableColumn<T>) => col.footer?.(sorted as T[], slice as T[]);
  const footerHeadingId = useId();
  // Each open row's detail row, for its disclosure button's `aria-controls`.
  const detailIdBase = useId();
  // The actions column is the table's own, not one the user can hide: out of the count.
  const ownColumns = columns.filter((c) => isTableOwnColumn(c.key)).length;
  const ownVisible = visibleColumns.filter((c) => isTableOwnColumn(c.key)).length;
  const columnsCountLabel = labels.columnsCount(visibleCount - ownVisible, totalCount - ownColumns);
  // Match the `md:` breakpoint at the text size in force: we render either the table or
  // the card list — never both — so we don't double up DOM nodes that screen readers and
  // integration tests would have to disambiguate. `usePhoneLayout()` itself, not its twin
  // `useBreakpoint("md")`: the same query an app's own phone checks ask (keksdose's
  // sticky editor footer), so the card list and the full-screen row dialog switch with
  // them and never a frame apart (§10.4 "usePhoneLayout() is the single answer"; 0.32.1,
  // keksdose's 0.32 report, where `md` and `max-md` both missed at 767.5 px). Without
  // `matchMedia` (SSR, jsdom) it is the table, as before.
  const isMdUp = !usePhoneLayout();
  // `edgeFade` (0.25) on the desktop scroller; the phone list never scrolls sideways.
  const desktopScroller = useRef<HTMLDivElement | null>(null);
  // 0.47 (keksdose S4): the scroller's visible width, as `--dt-visible-w` on it, for the
  // expansion row's pinned content (below). Set on the element, not in state: a resize
  // re-renders nothing. Only a table that can expand a row measures.
  // The group bands and the load-more footer pin their content the same way (0.48).
  const levels = groupLevels(groupBy);
  const measuresVisibleWidth = isMdUp && (!!expandedRow || levels.length > 0 || !!loadMore);
  useEffect(() => {
    const el = desktopScroller.current;
    if (!measuresVisibleWidth || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => el.style.setProperty("--dt-visible-w", `${el.clientWidth}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [measuresVisibleWidth]);
  const edgeFadeProps = useEdgeFade(desktopScroller, edgeFade && isMdUp);

  // ---- Mobile card list (md:hidden) ----
  // Renders the same paged/filtered/sorted slice but as stacked cards instead
  // of a horizontally-scrolling table. Column settings stay desktop-only; the
  // filters come through a bottom sheet (feedback #299) and the sort through the
  // opt-in `mobileSort` row (keksdose K10), both on the table's own state.
  // Memoised on `visibleColumns`: the cards compare their columns by identity (0.48.2).
  const mobileColumns = useMemo(
    () => visibleColumns.filter((c) => !c.mobileHidden && c.mobile !== "hidden"),
    [visibleColumns],
  );
  // The default card (0.49 KIT-7): the title, the status chips beside it, at most three
  // fields — the ones marked `mobile: "secondary"`, else the first after the title — and
  // the `role: "actions"` columns after them.
  const {
    primary: mobilePrimaryCol,
    status: mobileStatusColumns,
    fields: mobileSecondaryColumns,
    actions: mobileActionColumns,
  } = useMemo(() => mobileCardColumns(mobileColumns), [mobileColumns]);
  // A development build names a `noRowLink` column (a per-row delete) the card drops.
  useCardColumnWarnings(
    columns,
    !mobileCard && !mobileDetailsInRow,
    storageKey ?? (typeof urlSync === "object" ? urlSync.prefix : undefined),
  );
  // The columns the card leaves out, for the opened row (`mobileDetailsInRow`): the
  // hidden ones and, without a `mobileCard`, the ones past the card's three fields.
  const onCard = new Set<DataTableColumn<T>>([
    ...(mobilePrimaryCol ? [mobilePrimaryCol] : []),
    ...mobileStatusColumns,
    ...mobileSecondaryColumns,
    ...mobileActionColumns,
  ]);
  const mobileDetailColumns = mobileDetailsInRow
    ? visibleColumns.filter((c) => (mobileCard ? c.mobileHidden || c.mobile === "hidden" : !onCard.has(c)))
    : [];
  // Large and Extra large (§4 "DataTable phone card"): the card's labels go ABOVE their
  // values, nothing in it truncates, and the rows get more room. Most of it is a
  // `large:` class; the label/value grid needs a different STRUCTURE (each pair in a
  // box of its own), which a class cannot write. (`large` is read above, by the fit.)
  // What an opened phone row shows: the card's left-out columns first (when asked
  // for), then the app's own `expandedRow`. Desktop keeps `expandedRow` alone.
  const opensRow = !!expandedRow || mobileDetailColumns.length > 0;
  const openedRowContent = (row: T): ReactNode => {
    const detail = expandedRow?.(row) ?? null;
    if (mobileDetailColumns.length === 0) return detail;
    return (
      <div data-row-details="" className={cn("flex flex-col", compact ? "gap-2" : "gap-3")}>
        <StackedFields columns={mobileDetailColumns} row={row} compact={compact} />
        {detail}
      </div>
    );
  };
  // The phone card IS the anchor, so unlike the desktop table there is no other
  // cell to move the row link into: if any cell the card renders owns a link, the
  // card itself cannot be one (feedback #451 — same nesting rule as `linkColumn`
  // above). It then falls back to the pre-#451 role="button" card, which still
  // opens the row and leaves the cell's own link working. A caller's `mobileCard`
  // renderer is opaque to us; a link inside one is the caller's to declare by
  // marking the column it comes from.
  const mobileCardLinkable = (mobileCard ? mobileColumns : [...onCard]).every((c) => !keepsOwnClicks(c));
  // ...except on the default card (0.50 K4, kastlan): its title becomes the row's link
  // (or, with only `onRowClick`, a button), stretched over the card, and the own-click
  // cells — a tel: link, the actions row — sit above it, so "tap to open" stays and no
  // control nests in another. A `mobileCard` stays the fallback above (its controls
  // cannot be lifted), and so does a card whose title keeps its own clicks.
  const mobileCardStretched =
    !mobileCard && !mobileCardLinkable && !!mobilePrimaryCol && !keepsOwnClicks(mobilePrimaryCol);
  // The card list's reading direction, for the one thing on it CSS cannot flip: which
  // physical drag a logical `start`/`end` swipe action means. Read off the DOM through
  // a ref callback (it runs at commit, like a layout effect) because `dir` is an
  // attribute of some ancestor the table does not own; LTR until the first commit,
  // which is also before any finger can have touched a row.
  const [mobileDir, setMobileDir] = useState<Direction>("ltr");
  const mobileRootRef = (el: HTMLElement | null) => {
    if (!el) return;
    const d = dirOf(el);
    if (d !== mobileDir) setMobileDir(d);
  };

  // `fillHeight` on a phone (0.40, keksdose live #420): the card list is a scroller only
  // while its parent bounds it — its rows overflow the flex room it was given. Under
  // AppShell's phone layout the DOCUMENT scrolls, the list's room is its own content,
  // and a scroller there (with `overscroll-contain`) only swallowed the page's scroll.
  // Measured before paint on every render (rows revealed, filtered, opened), and on a
  // resize of the list or its parent; one read of two heights.
  const phoneFill = fillHeight && !isMdUp;
  const phoneListRef = useRef<HTMLUListElement | null>(null);
  const [phoneListScrolls, setPhoneListScrolls] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- every render on purpose: what overflows is the rows, and React bails out on an unchanged boolean
  useLayoutEffect(() => {
    const el = phoneListRef.current;
    if (!phoneFill || !el) return;
    setPhoneListScrolls(el.scrollHeight > el.clientHeight + 1);
  });
  useEffect(() => {
    const el = phoneListRef.current;
    if (!phoneFill || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setPhoneListScrolls(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [phoneFill]);
  // A sticky `leadingRow`'s height on a phone (audit 2026-10-30 DSP-2): the section
  // headers stick under it, as the desktop's group bands stick under the desktop row.
  const [phoneLeadHeight, setPhoneLeadHeight] = useState(0);

  const { mobileSlice, canRevealMoreMobile, loadMoreRef } = useMobileReveal({
    // Read only there; its `T[]` widens to `readonly T[]` with its owner (API-7).
    rows: sorted as T[],
    slice: slice as T[],
    isServer,
    isMdUp,
    unpaged,
    defaultPageSize,
  });
  // ---- Phone selection mode (0.40, keksdose live #421) ----
  // The cards had no boxes, so `selection`'s bulk actions were unreachable on a phone.
  // A long press on a card (kk's register gesture) — or "Select rows", the keyboard's
  // and screen reader's way — enters the mode: every card shows its box and a tap
  // toggles it. The mode lasts while anything is selected, so emptying the selection
  // (the bulk bar's Clear, the last box unticked, Cancel) leaves it, as kk's does.
  const anySelected = !!selection && (selection.someSelected || (selection.allSelected && slice.length > 0));
  const [phoneSelectMode, setPhoneSelectMode] = useState(false);
  const [hadSelection, setHadSelection] = useState(anySelected);
  if (anySelected !== hadSelection) {
    // Adjusted while rendering, so the frame the selection empties is already out of
    // the mode (an effect would paint a frame of boxes first).
    setHadSelection(anySelected);
    if (!anySelected) setPhoneSelectMode(false);
  }
  const phoneSelecting = !!selection && !isMdUp && (phoneSelectMode || anySelected);
  // ---- Shift+click range selection ---- (data-table-selection.ts; feedback #289,
  // anchored on the row's KEY so a sort, filter or page change cannot move it)
  const { canSelect, selectRange, setAnchor, markRangeClick, takeRangeClick } = useRangeSelection({
    selection,
    slice,
    rowKey,
  });
  // ---- Keyboard-activatable rows ----
  //
  // A desktop row with `onRowClick` opened on a mouse click and on nothing else: no
  // tab stop, no Enter, no focus ring (keksdose's report tables hand-rolled all three,
  // which is half of why they could not move onto this table). The row now takes
  // focus itself, as a ROVING tab stop: one row of the table is in the tab order
  // (the last one focused, else the first), ArrowUp/ArrowDown/Home/End move between
  // rows, Enter and Space activate.
  //
  // Why the `<tr>` rather than the two alternatives:
  //  * `role="button"` on the row would replace its `row` role, and the cells with
  //    it — a screen reader would stop reading the table as a table.
  //  * A button or link in one cell is what `rowHref` already is where the row HAS a
  //    URL. Without one, a synthetic button would have to wrap caller-rendered cell
  //    content, which nests the controls those cells carry (status toggles, links)
  //    inside it — illegal markup, and the reason the mobile card is a div.
  // A focused `<tr>` keeps its role and reads out its cells. Roving rather than a tab
  // stop per row, so a 100-row page does not put 100 stops between the header and
  // the pager.
  const rowsFocusable = !!onRowClick;
  const [focusRowKey, setFocusRowKey] = useState<string | number | null>(null);
  const tabRowKey =
    focusRowKey !== null && slice.some((r) => rowKey(r) === focusRowKey)
      ? focusRowKey
      : slice.length
        ? rowKey(slice[0])
        : null;

  // What the memoised rows' handlers read at event time (0.48.2, K-052-2): the latest
  // props, refreshed every commit, so a row that bailed out of a render still toggles
  // through the current `selection` and opens through the current `onRowClick`.
  // `virtualize` (0.48.2): desktop only, and only with rows to window. Arrow/Home/End then
  // move over every row, rendered or not: the target is rendered, then focused.
  const virtualOn = !!virtualize && isMdUp && slice.length > 0;
  const focusRowRef = useRef<((index: number) => void) | undefined>(undefined);
  // ---- When the focused row leaves (refactor audit 2026-10-30, DSP-4) ----
  // The row holding the focus — its key, and where it stood — noted as the focus comes
  // into it (the rows report it, through React, so a menu or a dialog a row opened in a
  // portal is the row's too). A delete, a status change that filters the row out, an
  // approval: the row's DOM goes, the focus with it to <body>, and the commit that took it
  // puts the focus on the row now in its place (below).
  const heldRow = useRef<{ key: string | number; index: number } | null>(null);
  const noteRowFocus = (key: string | number) => {
    const shown = isMdUp ? slice : mobileSlice;
    heldRow.current = { key, index: shown.findIndex((r) => rowKey(r) === key) };
  };
  const latestRowCtx: DataTableRowCtx<T> = {
    noteFocus: noteRowFocus,
    moveFocus: virtualOn
      ? (from, key) => {
          const target = rowNavTarget(from, key, slice.length);
          if (target === null) return false;
          focusRowRef.current?.(target);
          return true;
        }
      : undefined,
    onRowClick,
    onToggle: selection?.onToggle,
    isSelected: (row) => !!selection?.isSelected(row),
    canSelect,
    selectRange,
    setAnchor,
    markRangeClick,
    takeRangeClick,
    setFocusRowKey,
    onLongPress: (row) => {
      setPhoneSelectMode(true);
      setAnchor(rowKey(row));
      if (selection && !selection.isSelected(row)) selection.onToggle(row, true);
    },
  };
  const rowCtx = useRef(latestRowCtx);
  useLayoutEffect(() => {
    rowCtx.current = latestRowCtx;
  });

  // When dialog-mode is on, the expanded row's detail goes into a bottom-sheet
  // modal instead of unfolding inline. Only one row is ever expanded at a time.
  const mobileDialogRow = mobileExpandAsDialog && !isMdUp ? mobileSlice.find((r) => isExpanded?.(r)) : undefined;
  const mobileDialogContent = mobileDialogRow ? openedRowContent(mobileDialogRow) : null;
  // The full-screen row dialog. Its panel, header, scroll lock and Back handling all
  // live in {@link FullBleedDialog} now — this was the only copy of that shell until
  // the transactions create card needed the same one (Keksdose live #307's follow-up),
  // and two copies of a dialog is how the row editor and the create form come to look
  // like two different products.
  const dialogOpen = !!(mobileDialogRow && mobileDialogContent);
  const closeDialog = () => {
    if (mobileDialogRow) onRowClick?.(mobileDialogRow);
  };

  // One mobile card (`MobileRow`, data-table-mobile.tsx). A function so the flat list
  // and the grouped list (below) share identical row markup.
  const renderMobileRow = (row: T, index: number) => {
    const key = rowKey(row);
    const expanded = isExpanded?.(row) ?? false;
    return (
      <DataTableMobileRow<T>
        key={key}
        ctx={rowCtx}
        rowKey={key}
        rowIndex={index}
        row={row}
        expanded={expanded}
        expansion={expanded ? openedRowContent(row) : null}
        opensRow={opensRow}
        className={rowClassName?.(row)}
        attrs={rowAttributes?.(row)}
        interactive={!!onRowClick}
        href={mobileCardLinkable || mobileCardStretched ? rowHref?.(row) : undefined}
        swipeActionsFor={swipeActionsFor}
        mobileDir={mobileDir}
        mobileCardLinkable={mobileCardLinkable}
        mobileCardStretched={mobileCardStretched}
        mobileCard={mobileCard}
        mobilePrimaryCol={mobilePrimaryCol}
        mobileStatusColumns={mobileStatusColumns}
        mobileSecondaryColumns={mobileSecondaryColumns}
        mobileActionColumns={mobileActionColumns}
        mobileExpandAsDialog={mobileExpandAsDialog}
        compact={compact}
        large={large}
        selectionOn={!!selection}
        selectActive={phoneSelecting}
        selectable={canSelect(row)}
        selected={!!selection && selection.isSelected(row)}
      />
    );
  };

  // Consecutive grouping of the (already-sorted) mobile slice into labelled
  // sections for the "assistance"-style list (feedback #317). Null unless the
  // caller opts in via `mobileGroupBy`.
  // The desktop's bands (0.48, keksdose dev #605), over the rows on screen.
  const tableRef = useRef<HTMLTableElement | null>(null);
  const desktopGroups = isMdUp && levels.length > 0 ? groupRows(slice, levels) : null;
  const bandTops = useGroupBandTops(
    tableRef,
    !!desktopGroups,
    `${levels.length}:${leadingRowSticky && !!leadingRow}:${desktopGroups?.[0]?.key ?? ""}`,
  );
  // ---- Row windowing ---- (0.48.2, keksdose dev #632; data-table-virtual.ts)
  // One run per innermost group, with its bands (`virtualOn` is above, with the rows' context).
  const virtualGroups: VirtualGroup[] = [];
  const virtualBands: { g1: RowGroup<T>; g2: RowGroup<T> | null }[] = [];
  if (virtualOn) {
    if (!desktopGroups) virtualGroups.push({ start: 0, end: slice.length, bands: NO_BANDS, first: 0 });
    else
      for (const g1 of desktopGroups) {
        const first = virtualGroups.length;
        if (!g1.children) {
          virtualGroups.push({ start: g1.start, end: g1.start + g1.rows.length, bands: BAND_1, first });
          virtualBands.push({ g1, g2: null });
          continue;
        }
        g1.children.forEach((g2, j) => {
          virtualGroups.push({
            start: g2.start,
            end: g2.start + g2.rows.length,
            bands: j === 0 ? BAND_1_2 : BAND_2,
            first,
          });
          virtualBands.push({ g1, g2 });
        });
      }
  }
  const expandedIndices: number[] = [];
  if (virtualOn && isExpanded && expandedRow) slice.forEach((r, i) => isExpanded(r) && expandedIndices.push(i));
  const virtualColKeys = [...(selection ? [VIRTUAL_SELECT_COL] : []), ...visibleColumns.map((c) => c.key)];
  const virtualLockable = new Set(
    virtualColKeys.filter((k) => !widths[k] && !visibleColumns.some((c) => c.key === k && c.grow)),
  );
  const rowWindow = useRowWindow({
    enabled: virtualOn,
    rows: slice,
    rowKey,
    groups: virtualGroups,
    expanded: expandedIndices,
    pinnedKeys: [tabRowKey],
    scrollerRef: desktopScroller,
    tableRef,
    options: typeof virtualize === "object" ? virtualize : NO_VIRTUAL_OPTIONS,
    compact,
    rowsBefore: 1 + (leadingRow ? 1 : 0),
    rowsAfter: showFooter ? 1 : 0,
    colKeys: virtualColKeys,
    lockable: virtualLockable,
    resetKey: `${Object.entries(widths).join(";")}|${density}|${large}|${slice.length}:${
      slice.length ? `${rowKey(slice[0])}:${rowKey(slice[slice.length - 1])}` : ""
    }`,
  });
  // What `moveFocus` (in the rows' context, above) reaches: the window's focus mover.
  const focusRowAt = rowWindow?.focusRow;
  useLayoutEffect(() => {
    focusRowRef.current = focusRowAt;
  }, [focusRowAt]);

  // The commit that took the focused row (DSP-4): if the focus fell with it — to <body>,
  // not into a dialog or a field the app chose — it goes to the row now at that index,
  // else the last row, else the table itself (`tabIndex=-1` while empty, named by
  // `labels.table`); the card on a phone. A focusable row (`onRowClick`) takes it itself,
  // any other its first control. The remaining count is said, as a filter's is: the
  // focus moved without the user moving it. translation-review's `keepFocusAt` is the
  // kit's earlier copy of the rule, for its groups.
  //
  // Every commit while a row is noted, one pass over the rows on screen. A focus the user
  // took elsewhere drops the note (`onBlur` on the root, below); one that went to nothing
  // — a click on the page's background — keeps it, and is the one case where a later
  // removal moves the focus back into the table.
  useLayoutEffect(() => {
    const held = heldRow.current;
    if (!held) return;
    const shown = isMdUp ? slice : mobileSlice;
    const now = shown.findIndex((r) => rowKey(r) === held.key);
    if (now !== -1) {
      held.index = now;
      return;
    }
    heldRow.current = null;
    const list = isMdUp ? tableRef.current : phoneListRef.current;
    if (!list || !focusIsLost()) return;
    const at = shown.length === 0 ? -1 : Math.min(Math.max(held.index, 0), shown.length - 1);
    if (at === -1) list.focus();
    else if (isMdUp && virtualOn && rowsFocusable) focusRowRef.current?.(at);
    else {
      const row = list.querySelector<HTMLElement>(
        isMdUp ? `:scope > tbody > tr[data-row-index="${at}"]` : `:scope > li[data-row-index="${at}"]`,
      );
      const target = row && (isMdUp && rowsFocusable ? row : firstTabStop(row, { includeSelf: false }));
      if (target) target.focus();
      else focusContainer(list);
    }
    announce(labels.filterResults(paginationTotal, isServer ? paginationTotal : rows.length));
  });

  // `mobileGroupBy` may be a desktop `groupBy` level (0.48), its label and end slot too.
  const mobileLevel = typeof mobileGroupBy === "function" ? null : (mobileGroupBy ?? null);
  const mobileKey = typeof mobileGroupBy === "function" ? mobileGroupBy : mobileGroupBy?.key;
  // `start`: the section's first card's place in the list (its `data-row-index`, DSP-4).
  const mobileGroups: { key: string; rows: T[]; start: number }[] | null = mobileKey
    ? mobileSlice.reduce<{ key: string; rows: T[]; start: number }[]>((acc, row, i) => {
        const key = mobileKey(row);
        const last = acc[acc.length - 1];
        if (last && last.key === key) last.rows.push(row);
        else acc.push({ key, rows: [row], start: i });
        return acc;
      }, [])
    : null;

  // `frame={false}` swaps the Card for a bare wrapper carrying the same hooks and
  // layout classes, so everything inside renders identically either way.
  const Root = frame ? FramedRoot : PlainRoot;

  return (
    <Root
      // A styling and testing hook: a host's own cell content can follow the table's
      // density (`group-data-[density=compact]/table:…`) without being told twice.
      data-density={density}
      data-frame={frame ? undefined : "none"}
      // The frame clips (`overflow-clip`), so it is a clipping container for a
      // Tooltip's auto-portal — said as an attribute as well, because jsdom computes no
      // classes and a table-cell tooltip must portal under test just as it does in the
      // browser (see `CLIPS_ATTRIBUTE`). The bare root clips nothing and is not marked.
      data-clips={frame ? "" : undefined}
      // The fill's marker (0.40, docs/page-layout-harmonization.md §1.3): AppShell's
      // `<main>` and every `FillHeight` between it and this table key off it with
      // `has-[[data-fill-height]]`, so a page asks for the fill by passing the prop.
      data-fill-height={fillHeight ? "" : undefined}
      // The focused row's note (DSP-4): cleared on the way down to whatever takes the
      // focus, and set again on the way up by the row that holds it. Focus leaving for
      // something real outside the table drops it — unless that is an overlay (a confirm,
      // a menu), which hands the focus back, or closes with the row it asked about.
      onFocusCapture={() => {
        heldRow.current = null;
      }}
      onBlur={(e) => {
        const to = e.relatedTarget;
        if (to instanceof Element && !to.closest(OVERLAY_SELECTOR)) heldRow.current = null;
      }}
      className={cn(
        "group/table",
        frame ? "overflow-clip" : "min-w-0",
        // Both layouts, not just the table: the phone card list overflowing a bounded
        // pane drew itself over whatever followed it, and in a viewport-locked shell
        // the rows below the fold could not be reached at all. From `md` the minimum is
        // the content's again (`md:min-h-auto`): the body's floor below then holds the
        // whole chain up to `<main>`, which scrolls instead of leaving a slit.
        fillHeight && "flex flex-1 flex-col min-h-0 md:min-h-auto",
        className,
      )}
    >
      {/* Outside both viewport branches on purpose. A screen reader subscribes to a
          live region when it encounters it, so one that appears together with its
          first message is usually missed — and crossing the md breakpoint swaps the
          card list for the table wholesale, which would remount a region living
          inside either one. */}
      <span {...regionProps} />
      {toolbar != null && toolbar !== false && (
        <div
          data-table-toolbar=""
          className={cn(
            "flex flex-wrap items-center gap-2",
            frame ? cn("border-b border-subtle", compact ? "px-2 py-1.5" : "px-3 py-2") : "pb-3",
          )}
        >
          {toolbar}
        </div>
      )}
      {!isMdUp && (
        <div ref={mobileRootRef} className={cn(fillHeight && "flex min-h-0 flex-1 flex-col")}>
          {/* Mobile filter access (feedback #299): the per-column filter popovers
            live in the desktop header, which the card list doesn't render — so
            expose the same filters through a bottom sheet here. */}
          {(!serverRows || onFiltersChange) && (
            <MobileFilters
              columns={columns}
              filters={filters}
              selectOptionsByKey={selectOptionsByKey}
              isServer={serverRows}
              hasFilterCallback={!!onFiltersChange}
              onSetFilter={setFilterValue}
              onClearFilter={clearFilter}
              onClearAll={clearAllFilters}
              labels={labels}
              locale={locale}
            />
          )}
          {mobileSort && (
            <MobileSort
              columns={visibleColumns.filter((c) => (!serverRows || !!onSortsChange) && !!c.sortBy)}
              sorts={sorts}
              sortCycle={sortCycle}
              compact={compact}
              labels={labels}
              onPick={(key) => {
                if (key === null) {
                  if (sorts.length > 0) commitSorts([], sorts[0].key);
                  return;
                }
                if (sorts[0]?.key === key) return;
                // A newly picked column starts where its header's first click would.
                const col = columns.find((c) => c.key === key);
                commitSorts([{ key, dir: col?.firstSort ?? "asc" }], key);
              }}
              onFlip={() => {
                if (sorts.length === 0) return;
                commitSorts(
                  sorts.map((s, i) => (i === 0 ? { ...s, dir: flipDir(s.dir) } : s)),
                  sorts[0].key,
                );
              }}
            />
          )}
          {selection && (
            <MobileSelectBar
              active={phoneSelecting}
              allSelected={selection.allSelected}
              someSelected={selection.someSelected}
              compact={compact}
              labels={labels}
              onEnter={() => setPhoneSelectMode(true)}
              onToggleAll={selection.onToggleAll}
              onCancel={() => {
                setPhoneSelectMode(false);
                if (anySelected) selection.onToggleAll(false);
              }}
            />
          )}
          <ul
            ref={phoneListRef}
            // Named as the table is, and focusable while empty: where the focus goes when
            // the last card leaves (DSP-4).
            aria-label={labels.table}
            tabIndex={mobileSlice.length === 0 ? -1 : undefined}
            className={cn(
              "divide-y divide-subtle",
              // Under `fillHeight` the list takes the room its parent gives it, and in a
              // BOUNDED parent it is the scroller, as the table body is on a wide screen:
              // the filter button stays above it and a server pager below. Only then —
              // see `phoneListScrolls` (live #420). The endless-scroll sentinel still
              // fires in here — an IntersectionObserver on the viewport sees through the
              // clipping ancestor.
              fillHeight && "min-h-0 flex-1",
              fillHeight && phoneListScrolls && "overflow-y-auto overscroll-contain",
              // Same busy treatment as the desktop body; see `isLoading` below.
              isLoading && mobileSlice.length > 0 && "opacity-60 transition-opacity",
            )}
            aria-busy={isLoading || undefined}
          >
            {/* The desktop's leading row, as the list's first item (0.51.7, audit
              2026-10-30 DSP-2; MobileLeadingRow says what it is and is not). */}
            {leadingRow ? (
              <MobileLeadingRow sticky={leadingRowSticky} onHeight={setPhoneLeadHeight}>
                {leadingRow}
              </MobileLeadingRow>
            ) : null}
            {mobileGroups
              ? mobileGroups.map((g) => (
                  <Fragment key={`hb-group:${g.key}`}>
                    <li
                      className="sticky top-0 z-10 flex flex-wrap items-baseline justify-between gap-x-3 bg-surface-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted backdrop-blur"
                      style={leadingRow && leadingRowSticky ? { top: phoneLeadHeight } : undefined}
                    >
                      <span className="min-w-0">
                        {mobileGroupLabel
                          ? mobileGroupLabel(g.key)
                          : mobileLevel?.label
                            ? mobileLevel.label(g.key, g.rows)
                            : g.key}
                      </span>
                      {mobileLevel?.end && (
                        <span className="ms-auto tabular-nums">{mobileLevel.end(g.key, g.rows)}</span>
                      )}
                    </li>
                    {g.rows.map((r, i) => renderMobileRow(r, g.start + i))}
                  </Fragment>
                ))
              : mobileSlice.map(renderMobileRow)}
            {mobileSlice.length === 0 && (
              <li className={cn("text-center text-muted", compact ? "px-3 py-3 text-xs" : "px-4 py-6 text-sm")}>
                {isLoading ? <LoadingText label={labels.loading} /> : (empty ?? labels.empty)}
              </li>
            )}
            {/* Endless-scroll sentinel: observed by IntersectionObserver to pull in
              the next chunk as it nears the viewport (feedback #232). */}
            {canRevealMoreMobile && (
              <li ref={loadMoreRef} className="px-4 py-4 text-center text-xs text-placeholder">
                {/* Isolated for the reason spelled out on LoadingText. */}
                <bdi>{labels.loading}</bdi>
              </li>
            )}
            {/* The owner's next slice (0.48), once every row held is revealed. */}
            {loadMore && !canRevealMoreMobile && (
              <DataTableLoadMoreFooter
                as="li"
                loadMore={loadMore}
                rowCount={sorted.length}
                labels={labels}
                compact={compact}
              />
            )}
          </ul>
          {/* The phone's totals: a summary card after the list rather than one more
            `<li>` in it. The list reveals rows in chunks as it is scrolled, so a last
            item would sit mid-list until the end was reached; outside it, and under
            `fillHeight` outside the scroller too, the totals stay in view the way the
            sticky `<tfoot>` keeps them in view on a wide screen. Named by
            `footerLabel` so it is announced as what it is, not as a stray list of
            numbers; `mobileHidden` columns stay hidden here as on the cards. */}
          {showFooter && mobileColumns.some((c) => c.footer) && (
            <section
              data-table-footer=""
              aria-labelledby={footerLabel != null ? footerHeadingId : undefined}
              className={cn(
                "border-t-2 border-strong bg-surface-2",
                compact ? "px-3 py-2" : "px-4 py-3",
                isLoading && "opacity-60 transition-opacity",
              )}
            >
              {footerLabel != null && (
                <div id={footerHeadingId} className={cn("font-semibold", compact ? "mb-1 text-sm" : "mb-2")}>
                  {footerLabel}
                </div>
              )}
              <dl
                className={cn("grid grid-cols-[auto_1fr] gap-x-3", compact ? "gap-y-0.5 text-xs" : "gap-y-1 text-sm")}
              >
                {mobileColumns
                  .filter((c) => c.footer)
                  .map((col) => (
                    <Fragment key={col.key}>
                      <dt className="self-center text-xs uppercase tracking-wide text-muted">{col.header}</dt>
                      <dd className="min-w-0 self-center font-semibold text-primary">{footerValue(col)}</dd>
                    </Fragment>
                  ))}
              </dl>
            </section>
          )}
          {/* Client-side mobile lists scroll endlessly (sentinel above); only
            server-paginated tables keep the pager here. */}
          {isServer && !loadMore && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              pageSize={paginationPageSize}
              total={paginationTotal}
              onPage={goToPage}
              onPageSize={serverPagination!.onPageSizeChange}
              labels={labels}
              locale={locale}
              density={density}
            />
          )}
          {/* The row's own first column is this dialog's title — the same cell the card
            behind it shows, so the panel names the row it opened from. */}
          <FullBleedDialog
            open={dialogOpen}
            // The open row's editor is the row's focus too: a Delete in it takes the row,
            // and the dialog with it (DSP-4).
            onFocus={() => {
              if (mobileDialogRow) noteRowFocus(rowKey(mobileDialogRow));
            }}
            onClose={closeDialog}
            closeLabel={labels.close}
            header={mobileDialogRow ? mobilePrimaryCol?.cell(mobileDialogRow) : null}
            backCloses={mobileDialogBackCloses}
          >
            {mobileDialogContent}
          </FullBleedDialog>
        </div>
      )}
      {isMdUp && (
        <div className={cn("flex", fillHeight && "flex-1")}>
          {/* Under `fillHeight` neither wrapper is `min-h-0`: a flex item's automatic
            minimum is its content's, and the content's height counts the body at its
            basis (`basis-48`, below), not at its rows — so the floor carries up. */}
          <div className={cn("relative min-w-0 flex-1", fillHeight && "flex flex-col")}>
            {/* scrollbar-gutter:stable reserves the vertical-scrollbar space up
              front. Expanding a row adds height, which can bring the scrollbar
              in, which narrows the content box — and in an `auto` table layout
              that re-computes every column width. Reserving the gutter is the
              other half of the `w-0 min-w-full` fix on the expansion cell below
              (feedback #104: "expanding an item resizes the columns"). */}
            <div
              ref={desktopScroller}
              // The scroller: marked for the Tooltip's auto-portal (see the root above).
              data-clips=""
              // Under `fillHeight` the body grows into the room from a 12rem basis (0.40,
              // §1.3): about five rows is its floor. A window too short for the page's
              // header and that much body scrolls `<main>` instead (keksdose's review).
              className={cn("overflow-auto [scrollbar-gutter:stable]", fillHeight && "min-h-0 grow basis-48")}
              // `edgeFade`: the mask, `data-overflow` and the focus handling; nothing
              // while off. The height bound is merged over the mask, not replaced by it.
              {...edgeFadeProps}
              style={fillHeight ? edgeFadeProps.style : { ...edgeFadeProps.style, maxHeight: maxBodyHeight }}
            >
              {/* A table with no name is "table" in a screen reader's list of tables, and
            an app renders several. `labels.table` is how a call site says which. */}
              {/* `aria-busy` while a server page is in flight: a reader holds off announcing
            the rows that are about to be replaced, and the dimmed body says the same
            to the eye. The pager stays live — see `ServerPagination.isLoading`. */}
              <table
                ref={tableRef}
                className={cn("w-full", compact ? "text-xs" : "text-sm")}
                data-fit-grow={growDrawn ? "" : undefined}
                aria-label={labels.table}
                // Focusable while empty: where the focus goes when the last row leaves (DSP-4).
                tabIndex={slice.length === 0 ? -1 : undefined}
                aria-busy={isLoading || undefined}
                // `virtualize` (0.48.2): every row counted, rendered or not.
                aria-rowcount={rowWindow?.rowCount}
                data-virtualized={rowWindow ? "" : undefined}
              >
                {/* The locked column widths (0.48.2, `virtualize`): rows coming and going no
              longer move the columns. */}
                {rowWindow && (
                  <colgroup>
                    {virtualColKeys.map((key) => {
                      const w = rowWindow.colWidths?.[key];
                      return <col key={key} style={w !== undefined ? { width: w } : undefined} />;
                    })}
                  </colgroup>
                )}
                {/* Sticky header. position:sticky pins to the nearest scroll-container
              ancestor — so the header can only stick to THIS wrapper, never the
              page. For that to actually hold the header in place, the wrapper
              must be the thing that scrolls vertically: hence overflow-auto +
              a bounded max-height (rather than overflow-x-auto, which scrolls
              only sideways and lets the header ride away on page scroll). The
              header then stays put as you scroll the rows. position:sticky on
              <thead> isn't reliable across browsers, so we put it on each <th>
              (see DataTableHead, data-table-head.tsx). */}
                <DataTableHead
                  visibleColumns={visibleColumns}
                  selection={selection}
                  compact={compact}
                  labels={labels}
                  locale={locale}
                  isServer={serverRows}
                  hasSortCallback={!!onSortsChange}
                  hasFilterCallback={!!onFiltersChange}
                  sorts={sorts}
                  filters={filters}
                  selectOptionsByKey={selectOptionsByKey}
                  multiSort={multiSort}
                  resizable={resizable}
                  widths={widths}
                  setWidths={setWidths}
                  headRefs={headRefs}
                  toggleSort={toggleSort}
                  setFilterValue={setFilterValue}
                  clearFilter={clearFilter}
                  startResize={startResize}
                  moveResize={moveResize}
                  finishResize={finishResize}
                  ariaRowIndex={rowWindow ? 1 : undefined}
                  lockedWidths={rowWindow?.colWidths}
                  selectionLockKey={VIRTUAL_SELECT_COL}
                />
                {(() => {
                  const bodyClass = cn(isLoading && slice.length > 0 && "opacity-60 transition-opacity");
                  const leading = leadingRow ? (
                    <DataTableLeadingRow
                      colSpan={totalColSpan}
                      sticky={leadingRowSticky}
                      ariaRowIndex={rowWindow ? 2 : undefined}
                    >
                      {leadingRow}
                    </DataTableLeadingRow>
                  ) : null;
                  // One memoised row each (0.48.2, K-052-2; data-table-row.tsx): the table
                  // derives each row's own inputs here, as primitives, so a tick re-renders
                  // only the rows whose inputs changed.
                  const renderRow = (row: T, rowIndex: number) => {
                    const expanded = isExpanded?.(row) ?? false;
                    const key = rowKey(row);
                    return (
                      <DataTableRow<T>
                        key={key}
                        row={row}
                        rowIndex={rowIndex}
                        rowKey={key}
                        ctx={rowCtx}
                        columns={visibleColumns}
                        widths={widths}
                        growDrawn={growDrawn}
                        linkColumn={linkColumn}
                        href={rowHref?.(row)}
                        selectionColumn={!!selection}
                        selectable={canSelect(row)}
                        selected={!!selection && selection.isSelected(row)}
                        expanded={expanded}
                        expansion={expanded ? expandedRow?.(row) : null}
                        disclosure={rowsFocusable && !!expandedRow}
                        detailId={`${detailIdBase}-${rowIndex}`}
                        rowsFocusable={rowsFocusable}
                        rowInteractive={!!onRowClick || !!selection}
                        tabbable={key === tabRowKey}
                        className={rowClassName?.(row)}
                        attrs={rowAttributes?.(row)}
                        compact={compact}
                        totalColSpan={totalColSpan}
                        rowDetailsLabel={labels.rowDetails}
                        selectRowLabel={labels.selectRow}
                        ariaRowIndex={rowWindow?.ariaRow(rowIndex)}
                      />
                    );
                  };
                  const emptyRow =
                    slice.length === 0 ? (
                      <tr>
                        <td
                          colSpan={totalColSpan}
                          className={cn("text-center text-muted", compact ? "px-2 py-2" : "px-3 py-4")}
                        >
                          {/* Nothing is not the same as not-yet: "no results" while the first
                        page is still in flight is a claim the table cannot make. */}
                          {isLoading ? <LoadingText label={labels.loading} /> : (empty ?? labels.empty)}
                        </td>
                      </tr>
                    ) : null;
                  const band = (
                    level: 1 | 2,
                    def: DataTableGroupBy<T>,
                    g: { key: string; rows: T[] },
                    ariaRowIndex?: number,
                  ) => (
                    <DataTableGroupBand
                      level={level}
                      colSpan={totalColSpan}
                      top={level === 1 ? bandTops[0] : bandTops[1]}
                      compact={compact}
                      label={def.label ? def.label(g.key, g.rows) : g.key}
                      end={def.end?.(g.key, g.rows)}
                      ariaRowIndex={ariaRowIndex}
                    />
                  );
                  if (rowWindow) {
                    // Windowed (0.48.2): each group's own `<tbody>` with its bands and the
                    // rendered rows, spacer rows between; one spacer `<tbody>` per run of groups
                    // with nothing rendered. Spacers are hidden from the accessibility tree.
                    const spacer = (key: string, height: number) => (
                      <tr key={key} aria-hidden="true" data-vt-spacer="">
                        <td colSpan={totalColSpan} style={{ height, padding: 0, border: 0 }} />
                      </tr>
                    );
                    return (
                      <>
                        {leading && <tbody className={bodyClass}>{leading}</tbody>}
                        {rowWindow.bodies.map((b) => {
                          if (b.kind === "spacer")
                            return (
                              <tbody key={b.key} data-vt-body="" aria-hidden="true">
                                {spacer("s", b.height)}
                              </tbody>
                            );
                          const g = virtualGroups[b.group];
                          const vb = virtualBands[b.group];
                          return (
                            <tbody
                              key={vb ? `vg:${vb.g1.key}:${vb.g2?.key ?? ""}:${g.start}` : "vg"}
                              data-vt-body=""
                              className={bodyClass}
                            >
                              {vb && g.bands.includes(1) && band(1, levels[0], vb.g1, rowWindow.ariaBand(b.group, 1))}
                              {vb?.g2 && band(2, levels[1], vb.g2, rowWindow.ariaBand(b.group, 2))}
                              {b.items.map((it) =>
                                it.kind === "gap" ? spacer(it.key, it.height) : renderRow(slice[it.index], it.index),
                              )}
                            </tbody>
                          );
                        })}
                      </>
                    );
                  }
                  if (!desktopGroups) {
                    return (
                      <tbody className={bodyClass}>
                        {leading}
                        {slice.map(renderRow)}
                        {emptyRow}
                      </tbody>
                    );
                  }
                  // Grouped (0.48, keksdose dev #605): one `<tbody>` per innermost group, its
                  // band the row header; the leading row (and the empty state) in their own
                  // before the first group.
                  const rowsOf = (g: { rows: T[]; start: number }) => g.rows.map((r, i) => renderRow(r, g.start + i));
                  return (
                    <>
                      {(leading || emptyRow) && (
                        <tbody className={bodyClass}>
                          {leading}
                          {emptyRow}
                        </tbody>
                      )}
                      {desktopGroups.map((g1) =>
                        g1.children ? (
                          g1.children.map((g2, j) => (
                            <tbody key={`g:${g1.key}:${g2.key}:${g2.start}`} className={bodyClass}>
                              {j === 0 && band(1, levels[0], g1)}
                              {band(2, levels[1], g2)}
                              {rowsOf(g2)}
                            </tbody>
                          ))
                        ) : (
                          <tbody key={`g:${g1.key}:${g1.start}`} className={bodyClass}>
                            {band(1, levels[0], g1)}
                            {rowsOf(g1)}
                          </tbody>
                        ),
                      )}
                    </>
                  );
                })()}
                {showFooter && (
                  // Sticky to the scroller's bottom edge for the same reason the header is
                  // sticky to its top: the body scrolls inside a bounded wrapper, and a
                  // total that scrolls away with the last row is a total nobody sees on a
                  // 25-row page. Each cell carries its own background and its own `sticky`,
                  // as the header's do — `position: sticky` on a `<tfoot>` is not reliable.
                  <tfoot
                    data-table-footer=""
                    className={cn("font-semibold text-primary", isLoading && "opacity-60 transition-opacity")}
                  >
                    <tr aria-rowindex={rowWindow?.rowCount}>
                      {/* The selection column has nothing to total: an empty cell keeps the
                    values under their own headers. */}
                      {selection && <td className={cn(FOOTER_CELL, compact ? "w-8 px-2 py-1" : "w-10 px-3 py-2")} />}
                      {visibleColumns.map((col) => {
                        const width = widths[col.key];
                        const pinned = width ? { width, minWidth: width, maxWidth: width } : undefined;
                        const isLabel = col === footerLabelCol;
                        const Cell = isLabel ? "th" : "td";
                        return (
                          <Cell
                            key={col.key}
                            data-col={col.key}
                            scope={isLabel ? "row" : undefined}
                            style={pinned}
                            className={cn(
                              FOOTER_CELL,
                              "align-top",
                              compact ? "px-2 py-1" : "px-3 py-2",
                              width && "overflow-hidden text-ellipsis",
                              // A `<th>` centres by default; the label reads from the start
                              // like the cells above it, unless the column says otherwise.
                              isLabel && "text-start",
                              col.grow ? GROW_CELL_CLASS : growDrawn && GROW_PEER_CELL_CLASS,
                              logicalAlign(col.className),
                            )}
                          >
                            {col.footer ? footerValue(col) : isLabel ? footerLabel : null}
                          </Cell>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
              {/* In the scroller, after the rows (0.48): it comes into view as the last row
            does, under `fillHeight` too, where the body is the scroller. */}
              {loadMore && (
                <DataTableLoadMoreFooter
                  loadMore={loadMore}
                  rowCount={sorted.length}
                  labels={labels}
                  compact={compact}
                />
              )}
            </div>
            {!unpaged && !loadMore && (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                pageSize={paginationPageSize}
                total={paginationTotal}
                onPage={goToPage}
                onPageSize={
                  isServer
                    ? serverPagination!.onPageSizeChange
                    : (n) => {
                        // To the owner when it holds the page size, as `commitSorts` does.
                        if (onPageSizeChange) onPageSizeChange(n);
                        else setPageSize(n);
                        setPage(0);
                      }
                }
                labels={labels}
                locale={locale}
                density={density}
              />
            )}
          </div>
          {columnSettings && (
            <ColumnSettingsPanel
              columns={columns}
              hiddenCols={hiddenCols}
              setHiddenCols={setHiddenCols}
              autoHidden={autoHidden}
              keepColumn={keepColumn}
              showSettings={showSettings}
              setShowSettings={setShowSettings}
              columnsCountLabel={columnsCountLabel}
              labels={labels}
              autoSizeAll={autoSizeAll}
            />
          )}
        </div>
      )}
    </Root>
  );
}

/** The framed root: the kit's flush Card, as every table had before `frame`. */
function FramedRoot({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card flush {...rest}>
      {children}
    </Card>
  );
}

/** The unframed root (`frame={false}`): no border, surface, radius or shadow — the
 *  host's own card supplies them. */
function PlainRoot(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

/** The loading row's content: a spinner beside the word, the word for everyone. */
function LoadingText({ label }: { label: string }) {
  // `<bdi>`: the label takes its direction from its own letters, not the table's. The
  // English default inside a `dir="rtl"` table otherwise had its trailing "…" — a
  // neutral with no letter after it — resolved right-to-left and drawn in front of
  // the word: "…Loading". An Arabic or Hebrew label still reads right-to-left.
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner label={null} className="size-4" />
      <bdi>{label}</bdi>
    </span>
  );
}
