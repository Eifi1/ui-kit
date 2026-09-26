import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { Card, Spinner } from "./ui";
import { cn } from "../lib/cn";
import {
  defaultFilterState,
  isFilterActive,
  resolveFilter,
  rowMatches,
} from "./data-table-filters";
import type { ColumnFilter, FilterValue } from "./data-table-filters";
import { nextSorts } from "./data-table-sort";
import type { SortCycle, SortDir, SortState } from "./data-table-sort";
import { FilterPopover } from "./data-table-filter-popover";
import { Pagination } from "./data-table-pagination";
import { SwipeableRow, type SwipeAction } from "./swipeable-row";
import { useBackdropClose } from "./modal";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { FullBleedDialog } from "./full-bleed-dialog";
import { Popover } from "./popover";
import { useMediaQuery } from "../hooks/use-media-query";
import { useAnnounce } from "../hooks/use-announce";
import { resolveDataTableLabels, type DataTableLabels } from "./data-table-labels";
import { useKitLabelOverrides, useKitLocale } from "../i18n/kit-labels";
import { Tooltip } from "./tooltip";
import { dirOf, isRtl, type Direction } from "../lib/direction";

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
}

/** A `data-*` attribute, typed so `{ "data-private": "" }` needs no cast. */
type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };

/** What {@link DataTableColumn.cellProps} may return. */
export type DataTableCellProps = TdHTMLAttributes<HTMLTableCellElement> & DataAttributes;

/** What {@link DataTableColumn.headProps} takes. */
export type DataTableHeadProps = ThHTMLAttributes<HTMLTableCellElement> & DataAttributes;

/**
 * Split a caller's cell attributes into what may reach the element and what the kit
 * owns. `role` and `data-col` are dropped outright (see `cellProps`); `className` and
 * `style` come back separately so the kit can merge rather than replace them.
 */
function splitCellProps(
  props: DataTableCellProps | DataTableHeadProps | undefined,
): { attrs: Record<string, unknown>; className?: string; style?: CSSProperties } {
  if (!props) return { attrs: {} };
  const {
    className,
    style,
    role: _role,
    "data-col": _col,
    ...attrs
  } = props as DataTableCellProps & { "data-col"?: unknown };
  return { attrs, className, style };
}

/** Only the `data-*` attributes of a cell's props — what a phone card field takes. */
function dataAttrsOf(props: DataTableCellProps | undefined): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) if (k.startsWith("data-") && k !== "data-col") out[k] = v;
  return out;
}

/** A column resize in flight. Held in a ref rather than in state: the live width is
 *  written straight onto the column's cells, so a drag costs zero renders and the
 *  one `setWidths` happens when the pointer comes up. */
interface Resize {
  key: string;
  pointerId: number;
  startX: number;
  startWidth: number;
  /** +1 when a drag to the right widens the column, -1 in a right-to-left table,
   *  where the handle sits on the column's LEFT edge and widening is a drag left. */
  sign: 1 | -1;
  /** What React last rendered this column at, so a CANCELLED drag can put the header
   *  back — React cannot, it never saw the inline width the drag wrote. */
  hadWidth: number | undefined;
  /** The header and the body cells under it, collected ONCE when the drag starts.
   *  A `<th>` alone cannot shrink a column whose `<td>`s already carry a pinned
   *  width — and nothing re-renders during a drag, so the list cannot go stale. */
  cells: HTMLElement[];
  width: number;
  /** A press with no drag in it is not a resize — the handle is also the
   *  double-click target that CLEARS a width, and committing the header's current
   *  size on the way past would pin every column the user ever brushed. */
  moved: boolean;
}

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
   */
  urlSync?: boolean;
  /**
   * When true (desktop only), the table fills its parent's height and scrolls
   * INTERNALLY, with the header pinned — so the page itself doesn't add a second,
   * outer scrollbar. The parent must give it a bounded height (e.g. a flex
   * column inside the viewport-locked app shell). See feedback #207.
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
   *  instead and is the stronger statement of the same intent. */
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
   * Opt-in multi-row selection (desktop table only). When provided, a leading
   * checkbox column is rendered with a select-all box in the header; the owner
   * holds the selected set and reacts via the callbacks. Rows for which
   * `isSelectable` returns false render no checkbox and are excluded from
   * select-all. See feedback #285 (bulk edit).
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
  labels?: Partial<DataTableLabels>;
  /** BCP-47 locale for the date filter's calendar and the pager's numbers. Falls
   *  back to `<UiKitProvider locale>`, then to the runtime's default. */
  locale?: string;
  /** localStorage namespace prefix for `storageKey` persistence. Defaults to
   *  "hbui-table:"; pass your app's own prefix to keep a stable namespace. */
  storageKeyPrefix?: string;
  /**
   * On phones, surface the expanded row's detail in a full-screen dialog instead
   * of unfolding it inline (feedback #204). Desktop always uses inline expansion.
   */
  mobileExpandAsDialog?: boolean;
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
   */
  mobileCard?: (row: T) => ReactNode;
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
  /** Extra classes for the table's root element (the card, or with `frame={false}`
   *  the plain wrapper). Merged last, so a caller's margin or width wins. */
  className?: string;
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

/** The logical sides onto the physical drag directions {@link SwipeableRow} takes. */
function physicalSwipe(
  actions: MobileSwipeActions,
  dir: Direction,
): { left?: SwipeAction[]; right?: SwipeAction[] } {
  const rtl = dir === "rtl";
  return {
    left: (rtl ? actions.end : actions.start) ?? actions.left,
    right: (rtl ? actions.start : actions.end) ?? actions.right,
  };
}

// A bare `text-right` / `text-left` token, with or without variant prefixes
// (`md:text-right`). Deliberately NOT `text-right-…` or an arbitrary value.
const PHYSICAL_ALIGN = /(^|\s)((?:[\w-]+:)*)text-(left|right)(?=\s|$)/g;

/**
 * A column's `className`/`headClassName` with physical text alignment rewritten to
 * logical: `text-right` → `text-end`, `text-left` → `text-start`.
 *
 * Every numeric column written before 0.7.0 says `text-right`, and that is what it
 * MEANT: the end of the line, where digits line up. Rendered as written, a
 * right-to-left table puts those numbers on the far side from their own header's
 * sort button. Rewriting keeps each existing call site correct in both directions
 * with no change on its side; a caller who genuinely wants the physical side in RTL
 * too can say `ltr:text-right rtl:text-right`, which this leaves alone.
 */
function logicalAlign(className: string | undefined): string | undefined {
  return className?.replace(
    PHYSICAL_ALIGN,
    (token: string, lead: string, variants: string, side: string) =>
      // Already scoped to one direction: that is a caller choosing the physical side.
      /(^|:)(ltr|rtl):/.test(variants)
        ? token
        : `${lead}${variants}text-${side === "right" ? "end" : "start"}`,
  );
}

/** Whether a column is end-aligned — the header then puts its filter button first. */
const END_ALIGN = /(^|\s)text-end(?=\s|$)/;

/** Drop the undefined entries of a {@link DataTableProps.rowAttributes} map, so a
 *  caller can write `{ "data-x": cond ? "y" : undefined }` and get no attribute
 *  at all rather than the string "undefined" in the DOM. */
function cleanAttrs(
  attrs: Record<string, string | undefined> | undefined,
): Record<string, string> | undefined {
  if (!attrs) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) out[k] = v;
  return out;
}

/**
 * A column's name as a plain string.
 *
 * `header` is a ReactNode — an icon, a unit suffix, a tooltip-wrapped span — and
 * neither a live region nor the column-settings checklist can speak a React element.
 * The `key` fallback is the one the settings panel has always used; a column whose
 * header is not a string and whose key is not human-readable is a call site that
 * should pass a string header, and that is visible in what gets announced.
 */
function columnLabel<T>(col: DataTableColumn<T>): string {
  return typeof col.header === "string" ? col.header : col.key;
}

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

/** A click the APP owns. Anything else — middle, ⌘/Ctrl, Shift, Alt — belongs to
 *  the browser, and the whole feature is not touching it. */
const isPlainLeftClick = (e: React.MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * The anchor a linkable row is opened through (Keksdose feedback #451).
 *
 * The plain left click is OURS: cancelled, then handed to the row's own handler, so
 * clicking a row still expands it in place instead of reloading the page. Every
 * other click — middle, ⌘/Ctrl, Shift, Alt — is left completely untouched, which is
 * the entire point of using an anchor rather than an `onAuxClick` + `window.open`:
 * that imitation buys back the middle click and still loses ⌘/Ctrl-click, "copy link
 * address", the status-bar preview and the phone's long-press menu.
 *
 * Modified clicks DO stop propagating: on a table with `selection`, ⌘/Ctrl-click and
 * Shift-click on a row mean "select" (feedback #289), and a row must not change its
 * selection while the browser is opening a tab. The rest of the row still selects —
 * the link is one cell, not the row.
 *
 * `draggable={false}` because an anchor otherwise hijacks a horizontal mouse drag as
 * a link-drag: that is both drag-to-select-text on the desktop table and the mouse
 * path through SwipeableRow's gesture on the mobile card.
 */
function RowLink({
  href,
  onActivate,
  className,
  children,
  ...rest
}: {
  href: string;
  /** Runs on a plain left click. Omit it where an ANCESTOR already handles the
   *  click (the desktop `<tr>`), or the row would toggle twice. */
  onActivate?: () => void;
  className?: string;
  children: ReactNode;
} & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "className" | "children" | "onClick" | "onClickCapture"
>) {
  return (
    <a
      {...rest}
      href={href}
      draggable={false}
      className={className}
      // CAPTURE phase, and it has to be: on the mobile card the whole card is the
      // anchor, so a nested control sits INSIDE it — and the ones that matter
      // (the feedback row's status toggles) stop the click propagating so the row
      // won't also expand. A bubble-phase handler would never run for those, and
      // the browser would follow the link out from under the button press. Cancelling
      // here happens before any descendant can silence the event; `stopPropagation`
      // does not undo a `preventDefault`.
      onClickCapture={(e) => {
        if (isPlainLeftClick(e)) e.preventDefault();
      }}
      onClick={(e) => {
        if (!isPlainLeftClick(e)) {
          e.stopPropagation();
          return;
        }
        // Already cancelled above; this phase only decides what opens. A nested
        // control that stopped propagation deliberately never reaches it, which is
        // exactly how the row behaved before it became a link.
        onActivate?.();
      }}
    >
      {children}
    </a>
  );
}

// ---------- Main DataTable ----------



import { DEFAULT_PERSIST_PREFIX, useTableState } from "./use-table-state";
import { useMobileReveal } from "./use-mobile-reveal";

export function DataTable<T>({
  rows,
  columns,
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
  selection,
  labels: labelsProp,
  locale: localeProp,
  storageKeyPrefix = DEFAULT_PERSIST_PREFIX,
  mobileExpandAsDialog = false,
  mobileGroupBy,
  mobileGroupLabel,
  mobileCard,
  mobileSwipeActions,
  leadingRow,
  density = "comfortable",
  sortCycle = "tri",
  chrome = "full",
  columnSettings: columnSettingsProp,
  resizable: resizableProp,
  multiSort: multiSortProp,
  frame = true,
  className,
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
  const labels = useMemo(
    () =>
      resolveDataTableLabels(
        labelOverrides || labelsProp
          ? {
              ...labelOverrides,
              ...labelsProp,
              presets: { ...labelOverrides?.presets, ...labelsProp?.presets },
            }
          : undefined,
      ),
    [labelOverrides, labelsProp],
  );
  const locale = useKitLocale(localeProp);
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
    if (onSortsChange) onSortsChange(next);
    else setInternalSorts(next);

    // Announce the column the user just pressed, not `next[0]`: a shift-click adds a
    // criterion BEHIND the existing one, and answering "Sorted by Date" to a click on
    // Name misreports what the click did. The third click drops the column entirely,
    // which is the state a user is most likely to have reached by accident.
    const name = col ? columnLabel(col) : key;
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

  // ---- Column resize ----
  //
  // Pointer events with capture, rather than a `mousemove`/`mouseup` pair on `window`.
  // Three defects in one eleven-line handler (audit 2026-09-22):
  //
  //  * a `setWidths` per `mousemove` re-rendered every row of the table on every pixel
  //    of the drag — on a 500-row table that is the whole body, sixty times a second;
  //  * the two `window` listeners were added from inside an event handler, so nothing
  //    removed them if the table unmounted mid-drag (the row beneath opens a route),
  //    and `document.body.style` stayed at `user-select: none; cursor: col-resize` for
  //    the rest of the session — the whole page unselectable, with the wrong cursor;
  //  * `mousedown` is a mouse. Under a finger the handle did nothing at all.
  //
  // `setPointerCapture` answers all three: the handle itself receives every move and
  // the terminating `pointerup`/`pointercancel` wherever the pointer travels, so there
  // is nothing global to leak, and a touch drag works because a finger is a pointer.
  // The live width is written straight onto the column's own cells — the same three
  // properties the render sets, so the drag and the commit cannot disagree — and
  // `setWidths` is called once, when the drag ends.
  const resizing = useRef<Resize | null>(null);

  /** Every cell in one column, header first. `data-col` rather than a cell index:
   *  an expanded row holds a single `colSpan` cell, so the nth `<td>` of a row is
   *  not reliably the nth column. */
  const columnCells = (key: string): HTMLElement[] => {
    const th = headRefs.get(key);
    if (!th) return [];
    const table = th.closest("table");
    if (!table) return [th];
    return [
      th,
      ...Array.from(table.querySelectorAll<HTMLElement>("tbody [data-col]")).filter(
        (el) => el.dataset.col === key,
      ),
    ];
  };

  const applyLiveWidth = (cells: HTMLElement[], width: number | undefined) => {
    const px = width == null ? "" : `${width}px`;
    for (const el of cells) {
      el.style.width = px;
      el.style.minWidth = px;
      el.style.maxWidth = px;
    }
  };

  const releaseResizeChrome = (handle: Element, pointerId: number) => {
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    // Optional calls: jsdom implements neither, and the handlers sit on the handle
    // itself, so a run without capture behaves the same for anything that stays
    // inside the element.
    if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture?.(pointerId);
  };

  const startResize = (e: React.PointerEvent<HTMLElement>, key: string) => {
    // Secondary buttons open menus; only a primary press starts a drag.
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const th = headRefs.get(key);
    const startWidth = th?.getBoundingClientRect().width ?? 100;
    resizing.current = {
      key,
      pointerId: e.pointerId,
      startX: e.clientX,
      startWidth,
      sign: isRtl(e.currentTarget) ? -1 : 1,
      hadWidth: widths[key],
      cells: columnCells(key),
      width: startWidth,
      moved: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const moveResize = (e: React.PointerEvent<HTMLElement>) => {
    const drag = resizing.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    drag.width = Math.max(40, Math.round(drag.startWidth + drag.sign * (e.clientX - drag.startX)));
    drag.moved = true;
    applyLiveWidth(drag.cells, drag.width);
  };

  const finishResize = (e: React.PointerEvent<HTMLElement>, commit: boolean) => {
    const drag = resizing.current;
    // Before the early return: the page gets its selection and its cursor back even
    // for a pointer we were not tracking.
    releaseResizeChrome(e.currentTarget, e.pointerId);
    if (!drag || drag.pointerId !== e.pointerId) return;
    resizing.current = null;
    if (commit && drag.moved) {
      setWidths((w) => ({ ...w, [drag.key]: drag.width }));
      return;
    }
    // Cancelled — the browser took the pointer for a system gesture — or the press
    // never became a drag. Either way the column goes back to the width React last
    // rendered it at, which nothing else can do: the inline width the drag wrote is
    // invisible to React, so a re-render with an unchanged `widths` would keep it.
    applyLiveWidth(drag.cells, drag.hadWidth);
  };

  // The last exit path. A table that unmounts mid-drag takes the handle, and with it
  // every handler above, out of the document — this is the only place left to hand the
  // page back its text selection and its cursor.
  useEffect(
    () => () => {
      if (!resizing.current) return;
      resizing.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    },
    [],
  );

  const autoSizeAll = () => {
    // Clear widths so the table reflows to natural sizes, then snapshot each
    // column's width and write it back — except for the last visible column,
    // which is left unconstrained so it absorbs any remaining horizontal space.
    setWidths({});
    requestAnimationFrame(() => {
      const next: Record<string, number> = {};
      const cols = columns.filter((c) => !hiddenCols.has(c.key));
      cols.forEach((col, idx) => {
        if (idx === cols.length - 1) return;
        const th = headRefs.get(col.key);
        if (th) next[col.key] = Math.ceil(th.getBoundingClientRect().width);
      });
      setWidths(next);
    });
  };

  const visibleCount = visibleColumns.length;
  const totalCount = columns.length;
  // Spans the full row width including the optional leading selection column.
  const totalColSpan = visibleCount + (selection ? 1 : 0);
  const columnsCountLabel = labels.columnsCount(visibleCount, totalCount);
  // Match Tailwind's `md` breakpoint: we render either the table or the card
  // list — never both — so we don't double up DOM nodes that screen readers and
  // integration tests would have to disambiguate.
  const isMdUp = useMediaQuery("(min-width: 768px)", true);

  // ---- Mobile card list (md:hidden) ----
  // Renders the same paged/filtered/sorted slice but as stacked cards instead
  // of a horizontally-scrolling table. Filters / sort / column settings are
  // intentionally hidden here — the mobile layout assumes the user wants to
  // scan rows quickly. Switch to a wider viewport for fine-grained control.
  const mobileColumns = visibleColumns.filter((c) => !c.mobileHidden);
  const mobilePrimaryCol =
    mobileColumns.find((c) => c.mobilePrimary) ?? mobileColumns[0] ?? null;
  const mobileSecondaryColumns = mobileColumns.filter((c) => c !== mobilePrimaryCol);
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

  const { mobileSlice, canRevealMoreMobile, loadMoreRef } = useMobileReveal({
    rows: sorted,
    slice,
    isServer,
    isMdUp,
    unpaged,
    defaultPageSize,
  });
  // The row whose selection was last toggled, so Shift+click can select the range up
  // to it (feedback #289). Held as its KEY, not as an index into `slice`: the slice is
  // re-derived from the current sort, filter and page, so an index taken before a
  // header was clicked addresses a different row afterwards — and the range then ran
  // from a row the user had never touched.
  const selectionAnchor = useRef<string | number | null>(null);
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
  /** The checkbox click that drew a range, so its `onChange` can be told apart. */
  const rangeClick = useRef<Event | null>(null);
  const canSelect = (row: T) => !!selection && (selection.isSelectable?.(row) ?? true);
  const selectRange = (toIndex: number) => {
    if (!selection || selectionAnchor.current === null) return false;
    const fromIndex = slice.findIndex((r) => rowKey(r) === selectionAnchor.current);
    // The anchor has been filtered, sorted or paged off the screen: there is no range
    // on display to draw, so the click falls through to the plain single-row toggle.
    if (fromIndex < 0) return false;
    const [lo, hi] = [fromIndex, toIndex].sort((a, b) => a - b);
    const range: T[] = [];
    for (let i = lo; i <= hi; i++) {
      const r = slice[i];
      if (r && canSelect(r)) range.push(r);
    }
    // One call where the owner can take one. See `selection.onToggleMany`: the row-by-
    // row loop below is the fallback for an owner that has not adopted it, not the
    // shape this should be in.
    if (selection.onToggleMany) selection.onToggleMany(range, true);
    else for (const r of range) selection.onToggle(r, true);
    return true;
  };

  // When dialog-mode is on, the expanded row's detail goes into a bottom-sheet
  // modal instead of unfolding inline. Only one row is ever expanded at a time.
  const mobileDialogRow = mobileExpandAsDialog && !isMdUp ? mobileSlice.find((r) => isExpanded?.(r)) : undefined;
  const mobileDialogContent = mobileDialogRow ? expandedRow?.(mobileDialogRow) : null;
  // The full-screen row dialog. Its panel, header, scroll lock and Back handling all
  // live in {@link FullBleedDialog} now — this was the only copy of that shell until
  // the transactions create card needed the same one (Keksdose live #307's follow-up),
  // and two copies of a dialog is how the row editor and the create form come to look
  // like two different products.
  const dialogOpen = !!(mobileDialogRow && mobileDialogContent);
  const closeDialog = () => {
    if (mobileDialogRow) onRowClick?.(mobileDialogRow);
  };

  // One mobile card. Extracted so the flat list and the grouped list (below)
  // share identical row markup.
  const renderMobileRow = (row: T) => {
    const expanded = isExpanded?.(row) ?? false;
    const expansion = expanded ? expandedRow?.(row) : null;
    const tint = rowClassName?.(row);
    // Use div+role="button" rather than a real <button> so cells that
    // contain their own interactive controls (status toggles, action
    // icons) don't end up as illegal nested buttons.
    const interactive = !!onRowClick;
    // Say that the card OPENS something (Keksdose feedback #163). A phone card had
    // only a cursor and a tap-tint to advertise its editor — on the invoice review
    // screen, whose entire purpose is correcting mis-read lines, that read as "these
    // values are not editable". A chevron is the affordance every list on a phone
    // uses for exactly this, and it points the way the row actually opens: right into
    // a sheet, or down into an inline panel that flips it when expanded.
    const opensDetail = interactive && !!expandedRow;
    const swipeActions = mobileSwipeActions?.(row);
    const swipe = swipeActions ? physicalSwipe(swipeActions, mobileDir) : null;
    // An expanded row never swipes: the editor below it owns the horizontal space,
    // and dragging the header away from its own form reads as a glitch.
    const swipeEnabled = !!swipe && !expanded;
    const href = mobileCardLinkable ? rowHref?.(row) : undefined;
    const cardClass = cn(
      "w-full text-start flex items-center",
      compact ? "px-3 py-2 gap-2 text-sm" : "px-4 py-3 gap-3",
      // Live #320's other half: the card acknowledges the touch before the sheet
      // arrives. On a cold route the data can take a beat, and an unacknowledged tap
      // reads as "did that register?" — which is most of what "abrupt" means here.
      // `origin-center` + a 0.5% squeeze is deliberately almost subliminal: this fires
      // on every row of a long list, so anything larger becomes the list's personality
      // rather than feedback. `transition-transform` alone, so the existing background
      // flip stays instant.
      interactive &&
        "cursor-pointer transition-transform duration-100 active:scale-[0.995] active:bg-[var(--bg-active)] motion-reduce:transition-none motion-reduce:active:scale-100",
    );
    // The card's content is written once and worn by either tag below. Note that
    // the primary cell is rendered RAW here, never through `linkColumn` — the card
    // itself is the anchor, and routing it through `linkColumn` too would nest an
    // <a> inside an <a>. Desktop and mobile are mutually exclusive (`isMdUp`), so
    // exactly one anchor exists per row.
    const cardInner = (
      <>
        {/* The card's own content keeps the column it always had; the chevron sits
            beside it rather than inside, so a caller's `mobileCard` is untouched. */}
        <div className={cn("flex min-w-0 flex-1 flex-col", compact ? "gap-1" : "gap-2")}>
          {mobileCard ? (
            mobileCard(row)
          ) : (
            <>
              {/* Only the `data-*` half of `cellProps` — see its note. */}
              {mobilePrimaryCol && (
                <div {...dataAttrsOf(mobilePrimaryCol.cellProps?.(row))} className="font-medium">
                  {mobilePrimaryCol.cell(row)}
                </div>
              )}
              {mobileSecondaryColumns.length > 0 && (
                <dl
                  className={cn(
                    "grid grid-cols-[auto_1fr] gap-x-3",
                    compact ? "gap-y-0.5 text-xs" : "gap-y-1 text-sm",
                  )}
                >
                  {mobileSecondaryColumns.map((col) => (
                    <Fragment key={col.key}>
                      <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)] self-center">
                        {col.header}
                      </dt>
                      <dd
                        {...dataAttrsOf(col.cellProps?.(row))}
                        className="min-w-0 text-[var(--text-secondary)] self-center"
                      >
                        {col.cell(row)}
                      </dd>
                    </Fragment>
                  ))}
                </dl>
              )}
            </>
          )}
        </div>
        {opensDetail &&
          // `aria-hidden`: the row already announces itself as a button with
          // `aria-expanded`, so the icon would only add a second, wordless stop.
          (mobileExpandAsDialog ? (
            // Points INTO the sheet, which is the reading-forward direction.
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-[var(--text-placeholder)] rtl:-scale-x-100"
            />
          ) : (
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 shrink-0 text-[var(--text-placeholder)] transition-transform",
                expanded && "rotate-180",
              )}
            />
          ))}
      </>
    );
    const body =
      interactive && href ? (
        // A card with a URL of its own is a LINK, not a div wearing role="button"
        // (feedback #451): the phone's long-press "open in new tab" and a screen
        // reader's link semantics both come free, and the fake role goes away.
        <RowLink
          href={href}
          onActivate={() => onRowClick!(row)}
          aria-expanded={expandedRow ? expanded : undefined}
          className={cardClass}
          // Enter already activates a link natively, and that routes through
          // RowLink's own onClick — handling it here too would open the row twice.
          // Space is the only key left, and only so it opens the row instead of
          // scrolling the list.
          onKeyDown={(e) => {
            if (e.key !== " ") return;
            e.preventDefault();
            onRowClick!(row);
          }}
        >
          {cardInner}
        </RowLink>
      ) : (
        <div
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : undefined}
          onClick={interactive ? () => onRowClick!(row) : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                  // A key press inside a nested control is that control's.
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick!(row);
                  }
                }
              : undefined
          }
          aria-expanded={expandedRow ? expanded : undefined}
          className={cardClass}
        >
          {cardInner}
        </div>
      );
    return (
      <li key={rowKey(row)} className={cn(tint)} {...cleanAttrs(rowAttributes?.(row))}>
        {swipeEnabled ? (
          <SwipeableRow enabled left={swipe!.left} right={swipe!.right}>
            {body}
          </SwipeableRow>
        ) : (
          body
        )}
        {expansion && !mobileExpandAsDialog && (
          <div
            className={cn(
              "bg-[var(--bg-surface-2)] border-t border-[var(--border)]",
              compact ? "px-3 py-2" : "px-4 py-3",
            )}
          >
            {expansion}
          </div>
        )}
      </li>
    );
  };

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
        fillHeight && "md:flex md:flex-1 md:flex-col md:min-h-0",
        className,
      )}
    >
      {/* Outside both viewport branches on purpose. A screen reader subscribes to a
          live region when it encounters it, so one that appears together with its
          first message is usually missed — and crossing the md breakpoint swaps the
          card list for the table wholesale, which would remount a region living
          inside either one. */}
      <span {...regionProps} />
      {!isMdUp && (
      <div ref={mobileRootRef}>
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
        <ul
          className={cn(
            "divide-y divide-[var(--border)]",
            // Same busy treatment as the desktop body; see `isLoading` below.
            isLoading && mobileSlice.length > 0 && "opacity-60 transition-opacity",
          )}
          aria-busy={isLoading || undefined}
        >
          {mobileGroups
            ? mobileGroups.map((g) => (
                <Fragment key={`hb-group:${g.key}`}>
                  <li className="sticky top-0 z-10 bg-[var(--bg-surface-2)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] backdrop-blur">
                    {mobileGroupLabel ? mobileGroupLabel(g.key) : g.key}
                  </li>
                  {g.rows.map(renderMobileRow)}
                </Fragment>
              ))
            : mobileSlice.map(renderMobileRow)}
          {mobileSlice.length === 0 && (
            <li
              className={cn(
                "text-center text-[var(--text-muted)]",
                compact ? "px-3 py-3 text-xs" : "px-4 py-6 text-sm",
              )}
            >
              {isLoading ? <LoadingText label={labels.loading} /> : (empty ?? "—")}
            </li>
          )}
          {/* Endless-scroll sentinel: observed by IntersectionObserver to pull in
              the next chunk as it nears the viewport (feedback #232). */}
          {canRevealMoreMobile && (
            <li
              ref={loadMoreRef}
              className="px-4 py-4 text-center text-xs text-[var(--text-placeholder)]"
            >
              {labels.loading}
            </li>
          )}
        </ul>
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
            // The scroller: marked for the Tooltip's auto-portal (see the root above).
            data-clips=""
            className={cn("overflow-auto [scrollbar-gutter:stable]", fillHeight && "flex-1 min-h-0")}
            style={fillHeight ? undefined : { maxHeight: maxBodyHeight }}
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
              (see headClassName below). */}
          <thead className="bg-[var(--bg-surface-2)] text-[var(--text-secondary)]">
            <tr className="text-start">
              {selection && (
                <th
                  scope="col"
                  className={cn(
                    "sticky top-0 z-10 bg-[var(--bg-surface-2)] align-middle backdrop-blur-sm",
                    compact ? "w-8 px-2 py-1" : "w-10 px-3 py-2",
                  )}
                >
                  <input
                    type="checkbox"
                    className={cn("align-middle accent-indigo-600", compact ? "size-3.5" : "size-4")}
                    checked={selection.allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = selection.someSelected && !selection.allSelected;
                    }}
                    onChange={(e) => selection.onToggleAll(e.target.checked)}
                    aria-label={labels.selectAllRows}
                  />
                </th>
              )}
              {visibleColumns.map((col) => {
                // In server mode the utilities stay hidden unless the caller
                // takes them over and feeds them back into the server query.
                const sortable = (!isServer || !!onSortsChange) && !!col.sortBy;
                const filter = !isServer || onFiltersChange ? resolveFilter(col) : null;
                const filterState = filters[col.key] ?? (filter ? defaultFilterState(filter) : undefined);
                const sortIdx = sorts.findIndex((s) => s.key === col.key);
                const active = sortIdx !== -1;
                const Icon = active ? (sorts[sortIdx].dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                const filterActive = filterState && isFilterActive(filterState);
                // Logical, and a legacy `text-right` still counts — see `logicalAlign`.
                const headClass = logicalAlign(col.headClassName);
                const isEndAligned = !!headClass && END_ALIGN.test(headClass);
                const width = widths[col.key];
                const ownHead = splitCellProps(col.headProps);
                const pinnedHead = width ? { width, minWidth: width, maxWidth: width } : undefined;
                return (
                  <th
                    {...ownHead.attrs}
                    key={col.key}
                    ref={(el) => {
                      if (el) headRefs.set(col.key, el);
                      else headRefs.delete(col.key);
                    }}
                    scope="col"
                    // Only a header the user can actually sort says anything: an
                    // `aria-sort` on a plain column is a control that is not there,
                    // and a persisted or URL sort can name a column with no `sortBy`
                    // (the sort chain drops it silently) — which would otherwise
                    // claim a sort the table is not applying.
                    //
                    // "none" on the rest is the half that was missing. Without it a
                    // sortable header is indistinguishable from a plain one until the
                    // user presses it. Secondary criteria read "none" too: ARIA allows
                    // exactly one sorted column, and the priority is carried by the
                    // badge and by what the header button announces on press.
                    aria-sort={
                      sortable
                        ? sortIdx === 0
                          ? sorts[0].dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    style={ownHead.style || pinnedHead ? { ...ownHead.style, ...pinnedHead } : undefined}
                    className={cn(
                      "relative font-medium align-middle whitespace-nowrap",
                      compact ? "px-2 py-1" : "px-3 py-2",
                      // Keep the header visible while the user scrolls the page.
                      // Each <th> carries its own bg so the row doesn't render
                      // transparent over the data rows underneath.
                      "sticky top-0 z-10 bg-[var(--bg-surface-2)] backdrop-blur-sm",
                      logicalAlign(ownHead.className),
                      headClass,
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        isEndAligned && "flex-row-reverse",
                      )}
                    >
                      <Tooltip label={sortable && multiSort ? labels.sortHint : undefined} portal>
                        <button
                          type="button"
                          onClick={(e) => sortable && toggleSort(col.key, e.shiftKey)}
                          disabled={!sortable}
                          className={cn(
                            "flex items-center gap-1 text-start",
                            sortable && "hover:text-[var(--text-primary)]",
                          )}
                        >
                          <span>{col.header}</span>
                          {sortable && (
                            <Icon className={cn("size-3", active ? "opacity-100" : "opacity-40")} />
                          )}
                          {/* Priority badge, only meaningful with 2+ sort keys */}
                          {active && sorts.length > 1 && (
                            <span className="text-[9px] font-semibold leading-none text-brand">
                              {sortIdx + 1}
                            </span>
                          )}
                        </button>
                      </Tooltip>
                      {filter && (
                        <Popover
                          width={filter.type === "date" ? 420 : undefined}
                          // The panel is the column's filter, and says so. Unnamed it
                          // was announced as the kit-wide fallback, "Popover".
                          labels={{ panel: labels.filter }}
                          trigger={({ toggle, ref }) => (
                            <button
                              type="button"
                              ref={ref}
                              onClick={toggle}
                              aria-label={labels.filter}
                              className={cn(
                                "rounded p-1 transition-colors",
                                filterActive
                                  ? "bg-[var(--brand-bg)] text-[var(--brand-muted)]"
                                  : "text-[var(--text-placeholder)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                              )}
                            >
                              <Filter className="size-3" />
                            </button>
                          )}
                        >
                          {() => (
                            <FilterPopover
                              column={col}
                              state={filterState ?? defaultFilterState(filter)}
                              onChange={(next) => setFilterValue(col.key, next)}
                              onClear={() => clearFilter(col.key)}
                              selectOptions={selectOptionsByKey[col.key] ?? []}
                              labels={labels}
                              locale={locale}
                            />
                          )}
                        </Popover>
                      )}
                    </div>
                    {resizable && (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      onPointerDown={(e) => startResize(e, col.key)}
                      onPointerMove={moveResize}
                      onPointerUp={(e) => finishResize(e, true)}
                      onPointerCancel={(e) => finishResize(e, false)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        setWidths((w) => {
                          const next = { ...w };
                          delete next[col.key];
                          return next;
                        });
                      }}
                      // `touch-none`: without it the browser claims a finger drag for
                      // scrolling before the first `pointermove` ever arrives.
                      // `end-0` and a translate that flips with it: the handle sits on the column's
                      // trailing edge, which is its left one in a right-to-left table.
                      className="absolute end-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 rtl:translate-x-1/2 cursor-col-resize select-none touch-none hover:bg-[var(--brand-bg-hover)]"
                    />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody
            className={cn(isLoading && slice.length > 0 && "opacity-60 transition-opacity")}
          >
            {leadingRow && (
              <tr className="border-t border-[var(--border)]">
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
              return (
                <Fragment key={key}>
                  <tr
                    {...cleanAttrs(rowAttributes?.(row))}
                    data-row-nav={rowsFocusable ? "" : undefined}
                    tabIndex={rowsFocusable ? (key === tabRowKey ? 0 : -1) : undefined}
                    aria-expanded={rowsFocusable && expandedRow ? expanded : undefined}
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
                      "border-t border-[var(--border)]",
                      rowInteractive && "cursor-pointer hover:bg-[var(--bg-hover)]",
                      rowsFocusable &&
                        "focus-visible:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand)]",
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
                    {visibleColumns.map((col) => {
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
                    <tr className="bg-[var(--bg-surface-2)] border-t border-[var(--border)]">
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
                  className={cn("text-center text-[var(--text-muted)]", compact ? "px-2 py-2" : "px-3 py-4")}
                >
                  {/* Nothing is not the same as not-yet: "no results" while the first
                      page is still in flight is a claim the table cannot make. */}
                  {isLoading ? <LoadingText label={labels.loading} /> : (empty ?? "—")}
                </td>
              </tr>
            )}
          </tbody>
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
                      setPageSize(n);
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
        <>
        <Tooltip label={columnsCountLabel} portal>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label={columnsCountLabel}
            aria-hidden={showSettings}
            tabIndex={showSettings ? -1 : 0}
            className={cn(
              "group flex shrink-0 items-start justify-center overflow-hidden pt-3 transition-[width] duration-200 ease-out",
              "border-s border-[var(--border)]",
              "hover:bg-[var(--bg-hover)]",
              showSettings ? "w-0 border-s-0" : "w-8 cursor-pointer",
            )}
          >
            <span
              className="whitespace-nowrap text-xs font-medium tracking-wide text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {columnsCountLabel}
            </span>
          </button>
        </Tooltip>
        <div
          className={cn(
            "shrink-0 overflow-hidden transition-[width] duration-200 ease-out",
            showSettings ? "w-56" : "w-0",
          )}
        >
          <div className="flex w-56 flex-col border-s border-[var(--border)] p-2">
            <div className="mb-2 flex items-center justify-between gap-1">
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {columnsCountLabel}
              </div>
              <Tooltip label={labels.close} portal>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  aria-label={labels.close}
                  className="rounded p-0.5 text-[var(--text-placeholder)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                >
                  <X className="size-4" />
                </button>
              </Tooltip>
            </div>
            <button
              type="button"
              onClick={autoSizeAll}
              className="mb-2 rounded border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              {labels.autoSize}
            </button>
            <div className="flex flex-col gap-0.5">
              {columns.map((col) => {
                const checked = !hiddenCols.has(col.key);
                const headerLabel = columnLabel(col);
                return (
                  <label
                    key={col.key}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-[var(--bg-hover)]"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5"
                      checked={checked}
                      onChange={(e) => {
                        setHiddenCols((s) => {
                          const next = new Set(s);
                          if (e.target.checked) next.delete(col.key);
                          else next.add(col.key);
                          return next;
                        });
                      }}
                    />
                    <span className="truncate">{headerLabel}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        </>
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
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner label={null} className="size-4" />
      {label}
    </span>
  );
}

// ---------- Mobile filter sheet ----------

/**
 * Filter access for the mobile card list (feedback #299). The desktop table
 * houses per-column filters in its header; the card list has no header, so the
 * same filters were unreachable on phones. This renders a compact "Filters" bar
 * that opens a bottom sheet listing each filterable column as a collapsible
 * section, reusing the very same {@link FilterPopover} and filter state the
 * desktop table drives — so it filters identically and stays URL-synced.
 */
function MobileFilters<T>({
  columns,
  filters,
  selectOptionsByKey,
  isServer,
  hasFilterCallback,
  onSetFilter,
  onClearFilter,
  onClearAll,
  labels,
  locale,
}: {
  columns: DataTableColumn<T>[];
  filters: FilterState;
  selectOptionsByKey: Record<string, { value: string; label: string }[]>;
  isServer: boolean;
  hasFilterCallback: boolean;
  onSetFilter: (key: string, value: FilterValue) => void;
  onClearFilter: (key: string) => void;
  onClearAll: () => void;
  labels: DataTableLabels;
  locale?: string;
}) {
  const [open, setOpen] = useState(false);
  // The sheet is portalled to <body>, out from under whatever `dir` the table sits
  // in, so it carries the trigger's direction with it — read at the moment of opening,
  // from the element the user actually pressed.
  const [dir, setDir] = useState<Direction>("ltr");
  const [expanded, setExpanded] = useState<string | null>(null);
  const backdropClose = useBackdropClose(() => setOpen(false));
  useBodyScrollLock(open);
  // Back dismisses the filter sheet too (Keksdose feedback #172) — it is the same
  // full-screen surface, and the filters it sets are already in the URL, so closing
  // it never loses anything.
  useOverlayHistory(open, () => setOpen(false));

  const filterable = useMemo(
    () =>
      columns
        .map((col) => ({ col, filter: !isServer || hasFilterCallback ? resolveFilter(col) : null }))
        .filter((x): x is { col: DataTableColumn<T>; filter: ColumnFilter<T> } => !!x.filter),
    [columns, isServer, hasFilterCallback],
  );

  if (filterable.length === 0) return null;

  const activeCount = filterable.filter(({ col }) => {
    const s = filters[col.key];
    return s && isFilterActive(s);
  }).length;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2">
      <button
        type="button"
        onClick={(e) => {
          setDir(dirOf(e.currentTarget));
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
      >
        <Filter className="size-4" />
        <span>{labels.filters}</span>
        {activeCount > 0 && (
          <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--info-bg)] px-1 text-[11px] font-semibold text-[var(--info)]">
            {activeCount}
          </span>
        )}
      </button>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        >
          {labels.clearAll}
        </button>
      )}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            role="dialog"
            aria-modal="true"
            dir={dir}
            {...backdropClose}
          >
            <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--bg-surface)] shadow-xl">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
                <div className="font-medium">{labels.filters}</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={labels.close}
                  className="-me-1 rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto overscroll-contain">
                {filterable.map(({ col, filter }) => {
                  const state = filters[col.key];
                  const active = !!state && isFilterActive(state);
                  const isItemOpen = expanded === col.key;
                  return (
                    <div key={col.key}>
                      <button
                        type="button"
                        onClick={() => setExpanded(isItemOpen ? null : col.key)}
                        aria-expanded={isItemOpen}
                        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                          {col.header}
                          {active && <span className="size-1.5 rounded-full bg-brand" />}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-[var(--text-placeholder)] transition-transform",
                            isItemOpen && "rotate-180",
                          )}
                        />
                      </button>
                      {isItemOpen && (
                        <div className="px-4 pb-3">
                          <FilterPopover
                            column={col}
                            state={state ?? defaultFilterState(filter)}
                            onChange={(next) => onSetFilter(col.key, next)}
                            onClear={() => onClearFilter(col.key)}
                            selectOptions={selectOptionsByKey[col.key] ?? []}
                            labels={labels}
                            locale={locale}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
                <button
                  type="button"
                  onClick={onClearAll}
                  disabled={activeCount === 0}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-40"
                >
                  {labels.clearAll}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-[var(--bg-inverse)] px-4 py-2 text-sm font-medium text-[var(--text-inverse)]"
                >
                  {labels.done}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
