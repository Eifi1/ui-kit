import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import { useSearchParams } from "react-router";
import { Card } from "./ui";
import { cn } from "../lib/cn";
import { readStored, writeStored } from "../lib/safe-storage";
import {
  decodeFilterValue,
  defaultFilterState,
  encodeFilterValue,
  isFilterActive,
  resolveFilter,
  rowMatches,
} from "./data-table-filters";
import type { ColumnFilter, FilterValue } from "./data-table-filters";
import {
  decodeSorts,
  encodeSorts,
  nextSorts,
  normalizeSorts,
} from "./data-table-sort";
import type { SortState } from "./data-table-sort";
import { FilterPopover } from "./data-table-filter-popover";
import { Pagination } from "./data-table-pagination";
import { SwipeableRow, type SwipeAction } from "./swipeable-row";
import { useBackdropClose } from "./modal";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { Popover } from "./popover";
import { useMediaQuery } from "../hooks/use-media-query";
import { resolveDataTableLabels, type DataTableLabels } from "./data-table-labels";
import { Tooltip } from "./tooltip";

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
}

export interface ServerPagination {
  page: number; // 0-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
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
   * in serverPagination mode, where the UI is otherwise disabled). The owner
   * is responsible for any page reset on change.
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
    allSelected: boolean;
    someSelected: boolean;
    onToggleAll: (checked: boolean) => void;
  };
  /** User-facing strings (English defaults); pass translated overrides. */
  labels?: Partial<DataTableLabels>;
  /** BCP-47 locale for the date-filter picker. Defaults to "en". */
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
   * Mobile only, and deliberately so: the desktop table already has room for an
   * actions column, and a drag gesture on a pointer device is a worse version of a
   * button. Wraps only the row body, so an expansion panel below stays put while the
   * row above it slides.
   */
  mobileSwipeActions?: (row: T) => { left?: SwipeAction[]; right?: SwipeAction[] } | null;
  /**
   * Renders as a full-width row above the data rows in the desktop table
   * (mobile has no equivalent list-row slot, so it's desktop-only). For a
   * toggle that shows/hides a slice of rows, style it as an expand/collapse
   * disclosure (chevron + label) so it reads as part of the table rather
   * than a floating control above it. See feedback #10/#11 (transactions'
   * "hide upcoming/scheduled" toggle).
   */
  leadingRow?: ReactNode;
}

export type FilterState = Record<string, FilterValue>;
export type { SortState };

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

interface PersistedState {
  // Multi-sort array; blobs from before the upgrade hold a single {key, dir}
  // object (or null) — read back through normalizeSorts.
  sort: SortState[] | { key: string; dir: string } | null;
  filters: FilterState;
  pageSize: number | "all";
  widths?: Record<string, number>;
  hidden?: string[];
}

const DEFAULT_PERSIST_PREFIX = "hbui-table:";

function loadPersisted(storageKey: string | undefined, prefix: string): Partial<PersistedState> {
  if (!storageKey) return {};
  const raw = readStored(prefix + storageKey);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {}; // corrupt JSON — the storage access itself is guarded by readStored
  }
}

function savePersisted(storageKey: string | undefined, state: PersistedState, prefix: string): void {
  if (!storageKey) return;
  writeStored(prefix + storageKey, JSON.stringify(state));
}

// ---------- URL sync helpers ----------

const URL_FILTER_PREFIX = "f.";
const URL_SORT_KEY = "sort";
const URL_PAGE_KEY = "p";
const URL_PAGE_SIZE_KEY = "ps";

interface UrlState {
  sorts?: SortState[];
  filters?: FilterState;
  pageSize?: number; // Infinity for "all"
  page?: number; // 0-based
}

function readUrlState<T>(columns: DataTableColumn<T>[]): UrlState {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const out: UrlState = {};

  const filters: FilterState = {};
  for (const col of columns) {
    const filter = resolveFilter(col);
    if (!filter) continue;
    const raw = sp.get(URL_FILTER_PREFIX + col.key);
    if (raw == null) continue;
    filters[col.key] = decodeFilterValue(filter, raw);
  }
  if (Object.keys(filters).length) out.filters = filters;

  const sortRaw = sp.get(URL_SORT_KEY);
  if (sortRaw) {
    const decoded = decodeSorts(sortRaw, new Set(columns.map((c) => c.key)));
    if (decoded.length) out.sorts = decoded;
  }

  const psRaw = sp.get(URL_PAGE_SIZE_KEY);
  if (psRaw === "all") out.pageSize = Infinity;
  else if (psRaw && Number(psRaw) > 0) out.pageSize = Number(psRaw);

  const pRaw = sp.get(URL_PAGE_KEY);
  if (pRaw && Number(pRaw) >= 1) out.page = Number(pRaw) - 1;

  return out;
}

function writeUrlState<T>(
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  columns: DataTableColumn<T>[],
  sorts: SortState[],
  filters: FilterState,
  pageSize: number,
  page: number,
  defaultPageSize: number,
): void {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      // clear managed keys
      for (const col of columns) next.delete(URL_FILTER_PREFIX + col.key);
      next.delete(URL_SORT_KEY);
      next.delete(URL_PAGE_KEY);
      next.delete(URL_PAGE_SIZE_KEY);
      // write filters
      for (const col of columns) {
        const state = filters[col.key];
        if (!state || !isFilterActive(state)) continue;
        const enc = encodeFilterValue(state);
        if (enc != null) next.set(URL_FILTER_PREFIX + col.key, enc);
      }
      // write sort
      const sortEnc = encodeSorts(sorts);
      if (sortEnc) next.set(URL_SORT_KEY, sortEnc);
      // write page size if non-default
      if (pageSize === Infinity) next.set(URL_PAGE_SIZE_KEY, "all");
      else if (pageSize !== defaultPageSize) next.set(URL_PAGE_SIZE_KEY, String(pageSize));
      // write page if not first
      if (page > 0) next.set(URL_PAGE_KEY, String(page + 1));
      return next;
    },
    { replace: true },
  );
}

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
  serverPagination,
  filters: filtersProp,
  onFiltersChange,
  sorts: sortsProp,
  onSortsChange,
  selection,
  labels: labelsProp,
  locale,
  storageKeyPrefix = DEFAULT_PERSIST_PREFIX,
  mobileExpandAsDialog = false,
  mobileGroupBy,
  mobileGroupLabel,
  mobileCard,
  mobileSwipeActions,
  leadingRow,
}: DataTableProps<T>) {
  const isServer = !!serverPagination;
  const labels = resolveDataTableLabels(labelsProp);
  const [, setSearchParams] = useSearchParams();
  // Read URL once on mount so URL-encoded views (e.g. shared links, deep links
  // from other pages) populate initial state. After mount, state is local.
  const [urlInitial] = useState<UrlState>(() => (urlSync ? readUrlState(columns) : {}));
  const initial = useMemo(() => loadPersisted(storageKey, storageKeyPrefix), [storageKey, storageKeyPrefix]);
  const [internalSorts, setInternalSorts] = useState<SortState[]>(() =>
    urlInitial.sorts !== undefined ? urlInitial.sorts : normalizeSorts(initial.sort),
  );
  const [internalFilters, setInternalFilters] = useState<FilterState>(
    () => urlInitial.filters ?? initial.filters ?? {},
  );
  // Controlled when the owner passes state + callback (server-driven tables);
  // self-owned otherwise.
  const sorts = sortsProp ?? internalSorts;
  const filters = filtersProp ?? internalFilters;
  const [page, setPage] = useState(() => urlInitial.page ?? 0);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (urlInitial.pageSize !== undefined) return urlInitial.pageSize;
    if (initial.pageSize === "all") return Infinity;
    if (typeof initial.pageSize === "number" && initial.pageSize > 0) return initial.pageSize;
    return defaultPageSize;
  });
  const [widths, setWidths] = useState<Record<string, number>>(() => initial.widths ?? {});
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => new Set(initial.hidden ?? []));
  const [showSettings, setShowSettings] = useState(false);
  const headRefs = useMemo(() => new Map<string, HTMLTableCellElement>(), []);

  useEffect(() => {
    if (!storageKey) return;
    savePersisted(storageKey, {
      sort: sorts,
      filters,
      pageSize: pageSize === Infinity ? "all" : pageSize,
      widths,
      hidden: Array.from(hiddenCols),
    }, storageKeyPrefix);
  }, [storageKey, storageKeyPrefix, sorts, filters, pageSize, widths, hiddenCols]);

  useEffect(() => {
    if (!urlSync) return;
    writeUrlState(setSearchParams, columns, sorts, filters, pageSize, page, defaultPageSize);
    // columns identity changes per render but URL output only depends on column keys;
    // including columns would re-run on every render. We rely on data state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSync, sorts, filters, pageSize, page, defaultPageSize]);

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
  }, [columns, rows]);

  const filtered = useMemo(() => {
    if (isServer) return rows;
    let result = rows;
    for (const col of columns) {
      const state = filters[col.key];
      if (!state || !isFilterActive(state)) continue;
      result = result.filter((row) => rowMatches(col, row, state));
    }
    return result;
  }, [rows, columns, filters, isServer]);

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
  }, [filtered, sorts, columns, isServer]);

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

  const toggleSort = (key: string, additive: boolean) => {
    const next = nextSorts(sorts, key, additive);
    if (onSortsChange) onSortsChange(next);
    else setInternalSorts(next);
  };

  const setFilterValue = (key: string, value: FilterValue) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, [key]: value });
      return; // page reset is the controlling owner's job
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

  const startResize = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = headRefs.get(key);
    const startWidth = th?.getBoundingClientRect().width ?? 100;
    const startX = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(40, Math.round(startWidth + (ev.clientX - startX)));
      setWidths((w) => ({ ...w, [key]: next }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

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
  const columnsCountLabel = `${labels.columns} (${visibleCount}/${totalCount})`;
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

  // Mobile uses endless scrolling instead of pager buttons (feedback #232):
  // since client-side tables already hold every row, we just reveal more of the
  // sorted list as a sentinel scrolls into view. Server-paginated tables keep
  // their pager (the rows aren't all here to reveal). The reveal count only ever
  // grows and self-caps at the (re-filtered) list length, so no reset is needed.
  const [mobileLimit, setMobileLimit] = useState(defaultPageSize);
  const mobileSlice = isServer ? slice : sorted.slice(0, mobileLimit);
  const canRevealMoreMobile = !isServer && !isMdUp && mobileLimit < sorted.length;
  const loadMoreRef = useRef<HTMLLIElement | null>(null);
  // Index of the last row whose selection was toggled, so Shift+click can select
  // the range up to it (feedback #289). Indexes into `slice` (the rendered rows).
  const selectionAnchor = useRef<number | null>(null);
  const canSelect = (row: T) => !!selection && (selection.isSelectable?.(row) ?? true);
  const selectRange = (toIndex: number) => {
    if (!selection || selectionAnchor.current === null) return false;
    const [lo, hi] = [selectionAnchor.current, toIndex].sort((a, b) => a - b);
    for (let i = lo; i <= hi; i++) {
      const r = slice[i];
      if (r && canSelect(r)) selection.onToggle(r, true);
    }
    return true;
  };
  useEffect(() => {
    if (!canRevealMoreMobile) return;
    const el = loadMoreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMobileLimit((n) => n + (defaultPageSize || 25));
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canRevealMoreMobile, mobileLimit, defaultPageSize]);

  // When dialog-mode is on, the expanded row's detail goes into a bottom-sheet
  // modal instead of unfolding inline. Only one row is ever expanded at a time.
  const mobileDialogRow = mobileExpandAsDialog && !isMdUp ? mobileSlice.find((r) => isExpanded?.(r)) : undefined;
  const mobileDialogContent = mobileDialogRow ? expandedRow?.(mobileDialogRow) : null;
  // Lock background scrolling while the full-screen row dialog is open so the
  // table behind it can't scroll/jump under the overlay (feedback #204).
  const dialogOpen = !!(mobileDialogRow && mobileDialogContent);
  const dialogBackdropClose = useBackdropClose(() => {
    if (mobileDialogRow) onRowClick?.(mobileDialogRow);
  });
  useBodyScrollLock(dialogOpen);
  // ...and Back closes it, like any other dialog (Keksdose feedback #172). This one
  // is the phone's row EDITOR, so the alternative was the worst case of the bug: the
  // gesture people use to back out of a form navigated the page away instead.
  useOverlayHistory(dialogOpen, () => {
    if (mobileDialogRow) onRowClick?.(mobileDialogRow);
  });

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
    const swipe = mobileSwipeActions?.(row);
    // An expanded row never swipes: the editor below it owns the horizontal space,
    // and dragging the header away from its own form reads as a glitch.
    const swipeEnabled = !!swipe && !expanded;
    const href = mobileCardLinkable ? rowHref?.(row) : undefined;
    const cardClass = cn(
      "w-full px-4 py-3 text-left flex items-center gap-3",
      interactive && "active:bg-slate-50 dark:active:bg-slate-800/40 cursor-pointer",
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
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {mobileCard ? (
            mobileCard(row)
          ) : (
            <>
              {mobilePrimaryCol && <div className="font-medium">{mobilePrimaryCol.cell(row)}</div>}
              {mobileSecondaryColumns.length > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  {mobileSecondaryColumns.map((col) => (
                    <Fragment key={col.key}>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 self-center">
                        {col.header}
                      </dt>
                      <dd className="min-w-0 text-slate-700 dark:text-slate-200 self-center">
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
            <ChevronRight aria-hidden className="size-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 shrink-0 text-slate-400 transition-transform",
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
          <div className="px-4 py-3 bg-slate-50/60 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
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

  return (
    <Card flush className={cn("overflow-clip", fillHeight && "md:flex md:flex-1 md:flex-col md:min-h-0")}>
      {!isMdUp && (
      <div>
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
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {mobileGroups
            ? mobileGroups.map((g) => (
                <Fragment key={`hb-group:${g.key}`}>
                  <li className="sticky top-0 z-10 bg-slate-50/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur dark:bg-slate-800/80 dark:text-slate-400">
                    {mobileGroupLabel ? mobileGroupLabel(g.key) : g.key}
                  </li>
                  {g.rows.map(renderMobileRow)}
                </Fragment>
              ))
            : mobileSlice.map(renderMobileRow)}
          {mobileSlice.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {empty ?? "—"}
            </li>
          )}
          {/* Endless-scroll sentinel: observed by IntersectionObserver to pull in
              the next chunk as it nears the viewport (feedback #232). */}
          {canRevealMoreMobile && (
            <li
              ref={loadMoreRef}
              className="px-4 py-4 text-center text-xs text-slate-400 dark:text-slate-500"
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
            onPage={serverPagination!.onPageChange}
            onPageSize={(n) => serverPagination!.onPageSizeChange?.(n)}
            labels={labels}
          />
        )}
        {mobileDialogRow &&
          mobileDialogContent &&
          createPortal(
            // Full-bleed mobile dialog: the panel covers the viewport edge to edge
            // (feedback #32 — the inset panel of #204 left a strip of page showing
            // beside it on a phone, and tapping that strip dismissed the form
            // mid-edit). With no backdrop exposed there is nothing to mis-tap, so
            // the X button is the way out; `dialogBackdropClose` stays wired for
            // any layout that does leave a backdrop visible. Body scroll is locked
            // while open (see effect above), so the table behind stays put; the
            // panel body scrolls on its own.
            <div
              className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40"
              role="dialog"
              aria-modal="true"
              {...dialogBackdropClose}
            >
              <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-xl dark:bg-slate-900">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 dark:border-slate-800">
                  <div className="min-w-0 font-medium">{mobilePrimaryCol?.cell(mobileDialogRow)}</div>
                  <button
                    type="button"
                    onClick={() => onRowClick?.(mobileDialogRow)}
                    aria-label={labels.close}
                    className="-mr-1 shrink-0 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                {/* px-3, not px-4: every pixel of chrome here is width the form
                    fields lose on a phone (feedback #32). */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                  {mobileDialogContent}
                </div>
              </div>
            </div>,
            document.body,
          )}
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
            className={cn(
              "overflow-auto [scrollbar-gutter:stable]",
              fillHeight ? "flex-1 min-h-0" : "max-h-[calc(100dvh-12rem)]",
            )}
          >
        <table className="w-full text-sm">
          {/* Sticky header. position:sticky pins to the nearest scroll-container
              ancestor — so the header can only stick to THIS wrapper, never the
              page. For that to actually hold the header in place, the wrapper
              must be the thing that scrolls vertically: hence overflow-auto +
              a bounded max-height (rather than overflow-x-auto, which scrolls
              only sideways and lets the header ride away on page scroll). The
              header then stays put as you scroll the rows. position:sticky on
              <thead> isn't reliable across browsers, so we put it on each <th>
              (see headClassName below). */}
          <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
            <tr className="text-left">
              {selection && (
                <th className="sticky top-0 z-10 w-10 bg-slate-50 px-3 py-2 align-middle dark:bg-slate-800/95 backdrop-blur-sm">
                  <input
                    type="checkbox"
                    className="size-4 align-middle accent-indigo-600"
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
                const isRightAligned = col.headClassName?.includes("text-right");
                const width = widths[col.key];
                return (
                  <th
                    key={col.key}
                    ref={(el) => {
                      if (el) headRefs.set(col.key, el);
                      else headRefs.delete(col.key);
                    }}
                    aria-sort={
                      sortIdx === 0
                        ? sorts[0].dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    style={width ? { width, minWidth: width, maxWidth: width } : undefined}
                    className={cn(
                      "relative px-3 py-2 font-medium align-middle whitespace-nowrap",
                      // Keep the header visible while the user scrolls the page.
                      // Each <th> carries its own bg so the row doesn't render
                      // transparent over the data rows underneath.
                      "sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-sm",
                      col.headClassName,
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        isRightAligned && "flex-row-reverse",
                      )}
                    >
                      <Tooltip label={sortable ? labels.sortHint : undefined} portal>
                        <button
                          type="button"
                          onClick={(e) => sortable && toggleSort(col.key, e.shiftKey)}
                          disabled={!sortable}
                          className={cn(
                            "flex items-center gap-1 text-left",
                            sortable && "hover:text-slate-900 dark:hover:text-slate-200",
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
                          trigger={({ toggle, ref }) => (
                            <button
                              type="button"
                              ref={ref}
                              onClick={toggle}
                              aria-label={labels.filter}
                              className={cn(
                                "rounded p-1 transition-colors",
                                filterActive
                                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800",
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
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      onMouseDown={(e) => startResize(e, col.key)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        setWidths((w) => {
                          const next = { ...w };
                          delete next[col.key];
                          return next;
                        });
                      }}
                      className="absolute right-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 cursor-col-resize select-none hover:bg-indigo-300/60 dark:hover:bg-indigo-500/40"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {leadingRow && (
              <tr className="border-t border-slate-100 dark:border-slate-800">
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
              return (
                <Fragment key={rowKey(row)}>
                  <tr
                    {...cleanAttrs(rowAttributes?.(row))}
                    className={cn(
                      "border-t border-slate-100 dark:border-slate-800",
                      rowInteractive && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40",
                      rowClassName?.(row),
                    )}
                    onClick={
                      rowInteractive
                        ? (e) => {
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
                                selectionAnchor.current = rowIndex;
                                selection.onToggle(row, !selection.isSelected(row));
                                return;
                              }
                              if (e.metaKey || e.ctrlKey) {
                                selectionAnchor.current = rowIndex;
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
                        className="w-10 px-3 py-2 align-top"
                        // Don't let selecting a row also trigger the row click
                        // (which expands/edits it).
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canSelect(row) && (
                          <input
                            type="checkbox"
                            className="size-4 accent-indigo-600"
                            checked={selection.isSelected(row)}
                            // Shift+click selects the range from the last toggled
                            // row; preventDefault stops the native toggle (and the
                            // onChange that would double-handle it).
                            onClick={(e) => {
                              if (e.shiftKey && selectRange(rowIndex)) e.preventDefault();
                            }}
                            onChange={(e) => {
                              selectionAnchor.current = rowIndex;
                              selection.onToggle(row, e.target.checked);
                            }}
                            aria-label={labels.selectRow}
                          />
                        )}
                      </td>
                    )}
                    {visibleColumns.map((col) => {
                      const width = widths[col.key];
                      return (
                        <td
                          key={col.key}
                          style={width ? { width, minWidth: width, maxWidth: width } : undefined}
                          className={cn("px-3 py-2 align-top", width && "overflow-hidden text-ellipsis", col.className)}
                        >
                          {col === linkColumn && href ? (
                            // No `onActivate`: the click is left to bubble to the
                            // <tr> handler above, which already owns expand-vs-select.
                            // Calling it here as well would toggle the row twice.
                            <RowLink href={href} className="block">
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
                    <tr className="bg-slate-50/60 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
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
                        <div className="w-0 min-w-full px-3 py-3">{expansion}</div>
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
                  className="px-3 py-4 text-center text-slate-500 dark:text-slate-400"
                >
                  {empty ?? "—"}
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
              onPage={isServer ? serverPagination!.onPageChange : setPage}
              onPageSize={
                isServer
                  ? (n) => serverPagination!.onPageSizeChange?.(n)
                  : (n) => {
                      setPageSize(n);
                      setPage(0);
                    }
              }
              labels={labels}
            />
          )}
        </div>
        <Tooltip label={columnsCountLabel} portal>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label={columnsCountLabel}
            aria-hidden={showSettings}
            tabIndex={showSettings ? -1 : 0}
            className={cn(
              "group flex shrink-0 items-start justify-center overflow-hidden pt-3 transition-[width] duration-200 ease-out",
              "border-l border-slate-100 dark:border-slate-800",
              "hover:bg-slate-50 dark:hover:bg-slate-800/40",
              showSettings ? "w-0 border-l-0" : "w-8 cursor-pointer",
            )}
          >
            <span
              className="whitespace-nowrap text-xs font-medium tracking-wide text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200"
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
          <div className="flex w-56 flex-col border-l border-slate-100 p-2 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between gap-1">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {columnsCountLabel}
              </div>
              <Tooltip label={labels.close} portal>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  aria-label={labels.close}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="size-4" />
                </button>
              </Tooltip>
            </div>
            <button
              type="button"
              onClick={autoSizeAll}
              className="mb-2 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {labels.autoSize}
            </button>
            <div className="flex flex-col gap-0.5">
              {columns.map((col) => {
                const checked = !hiddenCols.has(col.key);
                const headerLabel = typeof col.header === "string" ? col.header : col.key;
                return (
                  <label
                    key={col.key}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
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
      </div>
      )}
    </Card>
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
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Filter className="size-4" />
        <span>{labels.filters}</span>
        {activeCount > 0 && (
          <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-sky-100 px-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
            {activeCount}
          </span>
        )}
      </button>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
            {...backdropClose}
          >
            <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="font-medium">{labels.filters}</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={labels.close}
                  className="-mr-1 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain dark:divide-slate-800">
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
                        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          {col.header}
                          {active && <span className="size-1.5 rounded-full bg-brand" />}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-slate-400 transition-transform",
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
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClearAll}
                  disabled={activeCount === 0}
                  className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-40 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {labels.clearAll}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
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
