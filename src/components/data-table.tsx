import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { Card } from "./card";
import { Spinner } from "./spinner";
import { ROW_ACTIONS_KEY, useRowActionColumn } from "./data-table-row-actions";
import { useColumnResize } from "./data-table-resize";
import { useRangeSelection } from "./data-table-selection";
import {
  RowLink,
  cleanAttrs,
  columnLabel,
  fromOutside,
  logicalAlign,
  resolveDataTableLabels,
  splitCellProps,
} from "./data-table-shared";
import { MobileFilters, MobileRow, MobileSelectBar, MobileSort, StackedFields } from "./data-table-mobile";
import { DataTableHead } from "./data-table-head";
import { ColumnSettingsPanel } from "./data-table-column-settings";
import { useLargeText } from "../hooks/use-large-text";
import { cn } from "../lib/cn";
import { isFilterActive, resolveFilter, rowMatches } from "./data-table-filters";
import type { ColumnFilter, FilterValue } from "./data-table-filters";
import { nextSorts } from "./data-table-sort";
import type { SortCycle, SortDir, SortState } from "./data-table-sort";
import { Pagination } from "./data-table-pagination";
import type { SwipeAction } from "./swipeable-row";
import { FullBleedDialog } from "./full-bleed-dialog";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { useAnnounce } from "../hooks/use-announce";
import { DEFAULT_DATA_TABLE_LABELS, type DataTableLabels } from "./data-table-labels";
import { useKitLabelOverrides, useKitLocale, useKitTableStorageKeyPrefix, type LabelOverride } from "../i18n/kit-labels";
import { useEdgeFade } from "../lib/strip-fade";
import { dirOf, type Direction } from "../lib/direction";

// ---------- Types ----------

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
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
  rows: T[];
  columns: DataTableColumn<T>[];
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
   * consuming app to render inside a react-router Router.
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
   *  and its card list as one):
   *
   *  1. the shell's content column becomes a flex column of the main area's height
   *     when the page asks — kastlan's
   *     `md:has-[>[data-fill-height]]:flex md:has-[>[data-fill-height]]:h-full md:has-[>[data-fill-height]]:flex-col`;
   *  2. the page's root asks, and is a flex column that may shrink:
   *     `data-fill-height` and `md:flex md:min-h-0 md:flex-1 md:flex-col`;
   *  3. the table takes the rest: `<DataTable fillHeight>`.
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
  sorts?: SortState[];
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
  mobileGroupBy?: (row: T) => string;
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
   * row above it slides.
   */
  mobileSwipeActions?: (row: T) => MobileSwipeActions | null;
  /**
   * Renders as a full-width row above the data rows in the desktop table
   * (mobile has no equivalent list-row slot, so it's desktop-only). For a
   * toggle that shows/hides a slice of rows, style it as an expand/collapse
   * disclosure (chevron + label) so it reads as part of the table rather
   * than a floating control above it. See feedback #10/#11 (transactions'
   * "hide upcoming/scheduled" toggle).
   */
  leadingRow?: ReactNode;
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

/**
 * A totals-row cell: pinned to the scroller's bottom edge, on the header's surface.
 * The rule above it is an inset shadow rather than a `border-t`: the table collapses
 * its borders, and a collapsed border belongs to the TABLE, not the cell, so it stays
 * behind at the bottom of the rows while the sticky cell rides over them.
 */
const FOOTER_CELL =
  "sticky bottom-0 z-10 bg-surface-2 shadow-[inset_0_2px_0_var(--border-strong)]";

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

/**
 * What counts as a control of its own inside a clickable row: a click or key press
 * that lands on one of these belongs to it, not to the row's `onRowClick`. The row's
 * own link (`rowHref`, marked `data-row-link`) is the exception — it IS the row.
 */
const OWN_CONTROL =
  'a[href],button,input,select,textarea,label,summary,[role="button"],[role="link"],[role="checkbox"],[role="switch"],[role="menuitem"],[role="option"],[contenteditable=""],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

/** Whether an event on `row` started on a control nested inside it. */
function fromOwnControl(target: EventTarget | null, row: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;
  const hit = target.closest(OWN_CONTROL);
  return !!hit && hit !== row && row.contains(hit) && !hit.hasAttribute("data-row-link");
}

/** Arrow/Home/End between the focusable rows of one `<tbody>` — the roving half of
 *  the keyboard-activatable rows (see the row's `onKeyDown`). */
function moveRowFocus(from: HTMLElement, key: string): boolean {
  if (!(key in ROW_NAV_KEYS)) return false;
  const body = from.parentElement;
  if (!body) return false;
  const rows = Array.from(body.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute("data-row-nav"),
  );
  const i = rows.indexOf(from);
  const target =
    key === "ArrowDown"
      ? rows[i + 1]
      : key === "ArrowUp"
        ? rows[i - 1]
        : key === "Home"
          ? rows[0]
          : key === "End"
            ? rows[rows.length - 1]
            : undefined;
  // At either end the key is still consumed, or ArrowDown on the last row would
  // scroll the page out from under a focused row.
  target?.focus();
  return true;
}
const ROW_NAV_KEYS = { ArrowDown: 1, ArrowUp: 1, Home: 1, End: 1 } as const;

// ---------- Main DataTable ----------



import { DEFAULT_PERSIST_PREFIX, useTableState, type TableUrlSync } from "./use-table-state";
import { useMobileReveal } from "./use-mobile-reveal";

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
  leadingRow,
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
    rowName,
    labels,
    density,
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
  const widths = useMemo(() => (resizable ? storedWidths : {}), [resizable, storedWidths]);
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
        .sort()
        .map((v) => ({ value: v, label: v }));
    }
    return map;
    // `columns` by signature — see the note above the signatures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnSig, selectOptionsSig, rows]);

  const filtered = useMemo(() => {
    if (isServer) return rows;
    let result = rows;
    for (const col of columns) {
      const state = filters[col.key];
      if (!state || !isFilterActive(state)) continue;
      result = result.filter((row) => rowMatches(col, row, state, locale));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columnSig, filters, isServer, locale]);

  const sorted = useMemo(() => {
    if (isServer) return filtered;
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
        if (av < bv) return dir === "asc" ? -1 : 1;
        if (av > bv) return dir === "asc" ? 1 : -1;
      }
      return 0;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sorts, columnSig, isServer]);

  // `paginated={false}` is expressed as "page size = everything" rather than as a
  // second code path, so slicing, the page clamp and the range summary all keep
  // exactly one definition.
  const unpaged = !isServer && !paginated;
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
  const slice =
    isServer || unpaged || pageSize === Infinity
      ? sorted
      : sorted.slice(safePage * effectivePageSize, safePage * effectivePageSize + effectivePageSize);

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
      .filter((col) => ((!isServer || onFiltersChange) ? resolveFilter(col) : null))
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
  useEffect(() => {
    if (announcedFilterKey.current === filterKey) return;
    announcedFilterKey.current = filterKey;
    // A server-paginated table does not do the filtering: the matching rows arrive on
    // some later render from the caller, and `serverPagination.total` is ALREADY the
    // filtered total — so the "n of m" sentence has no second number to give here.
    // Saying nothing is better than announcing the page size as a result count.
    if (isServer) return;
    announce(labels.filterResults(filtered.length, rows.length));
  }, [filterKey, filtered.length, rows.length, isServer, announce, labels]);

  // 1-based, because that is what the page strip shows and what a person says.
  const goToPage = (p: number) => {
    if (isServer) serverPagination!.onPageChange(p);
    else setPage(p);
    announce(labels.pageChanged(p + 1, totalPages));
  };

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.key)),
    [columns, hiddenCols],
  );

  // Which cell carries the row's link when `rowHref` is set (feedback #451). The
  // `mobilePrimary` column is the row's headline by declaration, so it is both the
  // widest target and the one the pointer is already over; falls back to the first
  // column, and falls back again if the user has hidden the primary one from the
  // column panel. Resolved from `visibleColumns` for exactly that reason — off a
  // raw `columns` lookup a hidden headline would leave the row with no link at all.
  //
  // `noRowLink` columns are skipped in BOTH steps: wrapping a cell that owns an
  // anchor nests two links and disables the inner one (see the prop's note). If
  // nothing visible is left to wrap, the row gets NO anchor — an anchor over the
  // one cell there is would cancel that cell's own click and hand back nothing,
  // and a row without a link still behaves exactly as it did before #451.
  const linkColumn = rowHref
    ? (visibleColumns.find((c) => c.mobilePrimary && !c.noRowLink) ??
      visibleColumns.find((c) => !c.noRowLink))
    : undefined;

  // ---- Column resize ---- (data-table-resize.ts: pointer capture, one `setWidths` per
  // drag, and the page's cursor and selection handed back on an unmount mid-drag)
  const { startResize, moveResize, finishResize, autoSizeAll } = useColumnResize({
    headRefs,
    widths,
    setWidths,
    columns,
    hiddenCols,
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
    ? (visibleColumns.find((c) => !c.footer && c.key !== ROW_ACTIONS_KEY) ?? visibleColumns[0])
    : undefined;
  const footerValue = (col: DataTableColumn<T>) => col.footer?.(sorted, slice);
  const footerHeadingId = useId();
  // Each open row's detail row, for its disclosure button's `aria-controls`.
  const detailIdBase = useId();
  // The actions column is the table's own, not one the user can hide: out of the count.
  const columnsCountLabel = rowActions
    ? labels.columnsCount(visibleCount - 1, totalCount - 1)
    : labels.columnsCount(visibleCount, totalCount);
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
  const edgeFadeProps = useEdgeFade(desktopScroller, edgeFade && isMdUp);

  // ---- Mobile card list (md:hidden) ----
  // Renders the same paged/filtered/sorted slice but as stacked cards instead
  // of a horizontally-scrolling table. Column settings stay desktop-only; the
  // filters come through a bottom sheet (feedback #299) and the sort through the
  // opt-in `mobileSort` row (keksdose K10), both on the table's own state.
  const mobileColumns = visibleColumns.filter((c) => !c.mobileHidden);
  const mobilePrimaryCol =
    mobileColumns.find((c) => c.mobilePrimary) ?? mobileColumns[0] ?? null;
  const mobileSecondaryColumns = mobileColumns.filter((c) => c !== mobilePrimaryCol);
  // The columns the card leaves out, for the opened row (`mobileDetailsInRow`).
  const mobileDetailColumns = mobileDetailsInRow ? visibleColumns.filter((c) => c.mobileHidden) : [];
  // Large and Extra large (§4 "DataTable phone card"): the card's labels go ABOVE their
  // values, nothing in it truncates, and the rows get more room. Most of it is a
  // `large:` class; the label/value grid needs a different STRUCTURE (each pair in a
  // box of its own), which a class cannot write.
  const large = useLargeText();
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
  const mobileCardLinkable = mobileColumns.every((c) => !c.noRowLink);
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

  const { mobileSlice, canRevealMoreMobile, loadMoreRef } = useMobileReveal({
    rows: sorted,
    slice,
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
  const anySelected =
    !!selection && (selection.someSelected || (selection.allSelected && slice.length > 0));
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
  const { selectionAnchor, rangeClick, canSelect, selectRange } = useRangeSelection({
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
  const renderMobileRow = (row: T) => (
    <MobileRow
      key={rowKey(row)}
      row={row}
      isExpanded={isExpanded}
      openedRowContent={openedRowContent}
      opensRow={opensRow}
      rowClassName={rowClassName}
      rowAttributes={rowAttributes}
      onRowClick={onRowClick}
      rowHref={rowHref}
      swipeActionsFor={swipeActionsFor}
      mobileDir={mobileDir}
      mobileCardLinkable={mobileCardLinkable}
      mobileCard={mobileCard}
      mobilePrimaryCol={mobilePrimaryCol}
      mobileSecondaryColumns={mobileSecondaryColumns}
      mobileExpandAsDialog={mobileExpandAsDialog}
      compact={compact}
      large={large}
      select={
        selection
          ? {
              active: phoneSelecting,
              selectable: canSelect(row),
              selected: selection.isSelected(row),
              onToggle: (checked) => {
                selectionAnchor.current = rowKey(row);
                selection.onToggle(row, checked);
              },
              onLongPress: () => {
                setPhoneSelectMode(true);
                selectionAnchor.current = rowKey(row);
                if (!selection.isSelected(row)) selection.onToggle(row, true);
              },
            }
          : null
      }
    />
  );

  // Consecutive grouping of the (already-sorted) mobile slice into labelled
  // sections for the "assistance"-style list (feedback #317). Null unless the
  // caller opts in via `mobileGroupBy`.
  const mobileGroups: { key: string; rows: T[] }[] | null = mobileGroupBy
    ? mobileSlice.reduce<{ key: string; rows: T[] }[]>((acc, row) => {
        const key = mobileGroupBy(row);
        const last = acc[acc.length - 1];
        if (last && last.key === key) last.rows.push(row);
        else acc.push({ key, rows: [row] });
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
      className={cn(
        "group/table",
        frame ? "overflow-clip" : "min-w-0",
        // Both layouts, not just the table: the phone card list overflowing a bounded
        // pane drew itself over whatever followed it, and in a viewport-locked shell
        // the rows below the fold could not be reached at all.
        fillHeight && "flex flex-1 flex-col min-h-0",
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
            frame
              ? cn("border-b border-subtle", compact ? "px-2 py-1.5" : "px-3 py-2")
              : "pb-3",
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
        {(!isServer || onFiltersChange) && (
          <MobileFilters
            columns={columns}
            filters={filters}
            selectOptionsByKey={selectOptionsByKey}
            isServer={isServer}
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
            columns={visibleColumns.filter((c) => (!isServer || !!onSortsChange) && !!c.sortBy)}
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
          {mobileGroups
            ? mobileGroups.map((g) => (
                <Fragment key={`hb-group:${g.key}`}>
                  <li className="sticky top-0 z-10 bg-surface-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted backdrop-blur">
                    {mobileGroupLabel ? mobileGroupLabel(g.key) : g.key}
                  </li>
                  {g.rows.map(renderMobileRow)}
                </Fragment>
              ))
            : mobileSlice.map(renderMobileRow)}
          {mobileSlice.length === 0 && (
            <li
              className={cn(
                "text-center text-muted",
                compact ? "px-3 py-3 text-xs" : "px-4 py-6 text-sm",
              )}
            >
              {isLoading ? <LoadingText label={labels.loading} /> : (empty ?? labels.empty)}
            </li>
          )}
          {/* Endless-scroll sentinel: observed by IntersectionObserver to pull in
              the next chunk as it nears the viewport (feedback #232). */}
          {canRevealMoreMobile && (
            <li
              ref={loadMoreRef}
              className="px-4 py-4 text-center text-xs text-placeholder"
            >
              {/* Isolated for the reason spelled out on LoadingText. */}
              <bdi>{labels.loading}</bdi>
            </li>
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
              className={cn(
                "grid grid-cols-[auto_1fr] gap-x-3",
                compact ? "gap-y-0.5 text-xs" : "gap-y-1 text-sm",
              )}
            >
              {mobileColumns
                .filter((c) => c.footer)
                .map((col) => (
                  <Fragment key={col.key}>
                    <dt className="self-center text-xs uppercase tracking-wide text-muted">
                      {col.header}
                    </dt>
                    <dd className="min-w-0 self-center font-semibold text-primary">
                      {footerValue(col)}
                    </dd>
                  </Fragment>
                ))}
            </dl>
          </section>
        )}
        {/* Client-side mobile lists scroll endlessly (sentinel above); only
            server-paginated tables keep the pager here. */}
        {isServer && (
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
      <div className={cn("flex", fillHeight && "min-h-0 flex-1")}>
        <div className={cn("relative min-w-0 flex-1", fillHeight && "flex flex-col min-h-0")}>
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
            className={cn("overflow-auto [scrollbar-gutter:stable]", fillHeight && "flex-1 min-h-0")}
            // `edgeFade`: the mask, `data-overflow` and the focus handling; nothing
            // while off. The height bound is merged over the mask, not replaced by it.
            {...edgeFadeProps}
            style={
              fillHeight
                ? edgeFadeProps.style
                : { ...edgeFadeProps.style, maxHeight: maxBodyHeight }
            }
          >
        {/* A table with no name is "table" in a screen reader's list of tables, and
            an app renders several. `labels.table` is how a call site says which. */}
        {/* `aria-busy` while a server page is in flight: a reader holds off announcing
            the rows that are about to be replaced, and the dimmed body says the same
            to the eye. The pager stays live — see `ServerPagination.isLoading`. */}
        <table
          className={cn("w-full", compact ? "text-xs" : "text-sm")}
          aria-label={labels.table}
          aria-busy={isLoading || undefined}
        >
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
            isServer={isServer}
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
          />
          <tbody
            className={cn(isLoading && slice.length > 0 && "opacity-60 transition-opacity")}
          >
            {leadingRow && (
              <tr className="border-t border-subtle">
                <td colSpan={totalColSpan} className="p-0">
                  {leadingRow}
                </td>
              </tr>
            )}
            {slice.map((row, rowIndex) => {
              const expanded = isExpanded?.(row) ?? false;
              const expansion = expanded ? expandedRow?.(row) : null;
              const rowInteractive = !!onRowClick || !!selection;
              const href = rowHref?.(row);
              const key = rowKey(row);
              const detailId = `${detailIdBase}-${rowIndex}`;
              // Whether the row is open, said where ARIA allows it (round 0.34, the
              // showcase's axe check): `aria-expanded` belongs to a treegrid's row, not a
              // table's, and the <tr> wore it. A disclosure button in the first cell carries
              // it now, with `aria-controls` on the detail row while that is there.
              // Visually hidden and not a tab stop: the row stays the one roving stop, with
              // Enter/Space and the whole-row click — this is the screen reader cursor's
              // way in, and where it hears the state. Named by `aria-label`, so the cell's
              // text stays the cell's own.
              const disclosure =
                rowsFocusable && expandedRow ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="sr-only-fixed"
                    aria-label={labels.rowDetails}
                    aria-expanded={expanded}
                    aria-controls={expansion ? detailId : undefined}
                    // The row's own handler leaves a click on a control inside it alone.
                    onClick={() => onRowClick!(row)}
                  />
                ) : null;
              return (
                <Fragment key={key}>
                  <tr
                    {...cleanAttrs(rowAttributes?.(row))}
                    data-row-nav={rowsFocusable ? "" : undefined}
                    tabIndex={rowsFocusable ? (key === tabRowKey ? 0 : -1) : undefined}
                    onFocus={
                      rowsFocusable
                        ? (e) => {
                            if (e.target === e.currentTarget) setFocusRowKey(key);
                          }
                        : undefined
                    }
                    onKeyDown={
                      rowsFocusable
                        ? (e) => {
                            // Only the row's own key presses: Enter on a nested button
                            // or link is that control's, and Space in a nested input
                            // is a space.
                            if (e.target !== e.currentTarget) return;
                            if (e.altKey || e.ctrlKey || e.metaKey) return;
                            if (e.key === "Enter" || e.key === " ") {
                              // Space would otherwise scroll the table.
                              e.preventDefault();
                              onRowClick!(row);
                              return;
                            }
                            if (e.shiftKey) return;
                            if (moveRowFocus(e.currentTarget, e.key)) e.preventDefault();
                          }
                        : undefined
                    }
                    className={cn(
                      "border-t border-subtle",
                      rowInteractive && "cursor-pointer hover:bg-hover",
                      // The kit's focus frame width (§5, `--focus-ring-width`), drawn as an
                      // OUTLINE rather than FOCUS_RING's box-shadow: a shadow on a `<tr>`
                      // is not painted by every engine, an outline is.
                      rowsFocusable &&
                        "focus-visible:bg-hover focus-visible:outline-focus focus-visible:-outline-offset-2 focus-visible:outline-brand",
                      rowClassName?.(row),
                    )}
                    onClick={
                      rowInteractive
                        ? (e) => {
                            // A click on a control inside the row (a button, a link,
                            // an input the cell renders) is that control's — it must
                            // not also open the row. Cells no longer have to
                            // `stopPropagation` to get that.
                            if (fromOwnControl(e.target, e.currentTarget)) return;
                            if (fromOutside(e.target, e.currentTarget)) return;
                            // Modifier-clicks anywhere in the row drive
                            // selection instead of expanding it (feedback #289):
                            // Ctrl/Cmd toggles a single row, Shift selects the
                            // range from the last-toggled row (inclusive of this
                            // one) — the same as the checkbox, but for the whole
                            // row, which is what the checkbox-only version was
                            // missing.
                            if (selection && canSelect(row)) {
                              if (e.shiftKey) {
                                // Drop the text selection a shift-click would
                                // otherwise smear across the rows.
                                window.getSelection?.()?.removeAllRanges();
                                if (selectRange(rowIndex)) return;
                                // No anchor yet: treat it as the first pick.
                                selectionAnchor.current = rowKey(row);
                                selection.onToggle(row, !selection.isSelected(row));
                                return;
                              }
                              if (e.metaKey || e.ctrlKey) {
                                selectionAnchor.current = rowKey(row);
                                selection.onToggle(row, !selection.isSelected(row));
                                return;
                              }
                            }
                            onRowClick?.(row);
                          }
                        : undefined
                    }
                  >
                    {selection && (
                      <td
                        className={cn("align-top", compact ? "w-8 px-2 py-1" : "w-10 px-3 py-2")}
                        // Don't let selecting a row also trigger the row click
                        // (which expands/edits it).
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canSelect(row) && (
                          <input
                            type="checkbox"
                            className={cn("accent-indigo-600", compact ? "size-3.5" : "size-4")}
                            checked={selection.isSelected(row)}
                            // Shift+click selects the range from the last toggled
                            // row. `preventDefault` puts the box back, but it does NOT
                            // stop React's `onChange`: React derives a checkbox's
                            // change from the `click` itself, after the browser has
                            // already flipped `checked` and before the cancellation
                            // reverts it — so the same click also reported itself as
                            // a single toggle, and the owner got `onToggleMany` and
                            // then `onToggle` for the clicked row. The click is
                            // remembered by identity and its change is dropped; a
                            // boolean flag would outlive a click whose change never
                            // came and swallow the user's next real one.
                            onClick={(e) => {
                              if (e.shiftKey && selectRange(rowIndex)) {
                                e.preventDefault();
                                rangeClick.current = e.nativeEvent;
                              }
                            }}
                            onChange={(e) => {
                              if (rangeClick.current && e.nativeEvent === rangeClick.current) {
                                rangeClick.current = null;
                                return;
                              }
                              selectionAnchor.current = rowKey(row);
                              selection.onToggle(row, e.target.checked);
                            }}
                            aria-label={labels.selectRow}
                          />
                        )}
                      </td>
                    )}
                    {visibleColumns.map((col, colIndex) => {
                      const width = widths[col.key];
                      // The caller's first, the table's over it — see `cellProps`.
                      const own = splitCellProps(col.cellProps?.(row));
                      const pinned = width ? { width, minWidth: width, maxWidth: width } : undefined;
                      return (
                        <td
                          {...own.attrs}
                          key={col.key}
                          data-col={col.key}
                          style={own.style || pinned ? { ...own.style, ...pinned } : undefined}
                          className={cn(
                            "align-top",
                            compact ? "px-2 py-1" : "px-3 py-2",
                            width && "overflow-hidden text-ellipsis",
                            logicalAlign(own.className),
                            logicalAlign(col.className),
                          )}
                        >
                          {colIndex === 0 && disclosure}
                          {col === linkColumn && href ? (
                            // No `onActivate`: the click is left to bubble to the
                            // <tr> handler above, which already owns expand-vs-select.
                            // Calling it here as well would toggle the row twice.
                            <RowLink href={href} className="block" data-row-link="">
                              {col.cell(row)}
                            </RowLink>
                          ) : (
                            col.cell(row)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {expansion && (
                    <tr id={disclosure ? detailId : undefined} className="bg-surface-2 border-t border-subtle">
                      {/* The detail panel spans every column. In an `auto` table
                          layout (the default here — columns only get fixed style
                          widths once the user resizes/auto-sizes them) the cell's
                          content preferred-width is redistributed across the
                          spanned columns, so a long expansion visibly re-sizes the
                          columns above it — and one-line content does not, since
                          its preferred width is small (feedback #104). Wrapping the
                          content in `w-0 min-w-full` pins the cell's preferred
                          width to ~0 (the explicit width:0 child), so it can never
                          perturb the columns; the div then fills to the full row
                          width only at paint time, and long text wraps within it. */}
                      <td colSpan={totalColSpan} className="p-0">
                        <div className={cn("w-0 min-w-full", compact ? "px-2 py-2" : "px-3 py-3")}>
                          {expansion}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {slice.length === 0 && (
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
            )}
          </tbody>
          {showFooter && (
            // Sticky to the scroller's bottom edge for the same reason the header is
            // sticky to its top: the body scrolls inside a bounded wrapper, and a
            // total that scrolls away with the last row is a total nobody sees on a
            // 25-row page. Each cell carries its own background and its own `sticky`,
            // as the header's do — `position: sticky` on a `<tfoot>` is not reliable.
            <tfoot
              data-table-footer=""
              className={cn(
                "font-semibold text-primary",
                isLoading && "opacity-60 transition-opacity",
              )}
            >
              <tr>
                {/* The selection column has nothing to total: an empty cell keeps the
                    values under their own headers. */}
                {selection && (
                  <td
                    className={cn(
                      FOOTER_CELL,
                      compact ? "w-8 px-2 py-1" : "w-10 px-3 py-2",
                    )}
                  />
                )}
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
      </div>
          {!unpaged && (
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
