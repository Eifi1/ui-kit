import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { readStored, writeStored } from "../lib/safe-storage";
import {
  decodeFilterValue,
  encodeFilterValue,
  isFilterActive,
  resolveFilter,
} from "./data-table-filters";
import { decodeSorts, encodeSorts, normalizeSorts, type SortState } from "./data-table-sort";
import type { DataTableColumn, FilterState, ServerPagination } from "./data-table";

// ---------- Persisted + URL-encoded view state ----------
//
// Moved here with `useTableState` when `DataTable` was split: these are what the hook
// reads and writes, and nothing else in the table ever called them.

interface PersistedState {
  // Multi-sort array; blobs from before the upgrade hold a single {key, dir}
  // object (or null) — read back through normalizeSorts.
  sort: SortState[] | { key: string; dir: string } | null;
  filters: FilterState;
  pageSize: number | "all";
  widths?: Record<string, number>;
  hidden?: string[];
}

export const DEFAULT_PERSIST_PREFIX = "hbui-table:";

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

/** The blob that would be stored — also the value the effect below compares by, so
 *  the comparison and the write can never disagree about what "unchanged" means. */
function serializePersisted(state: PersistedState): string {
  return JSON.stringify(state);
}

// ---------- URL sync helpers ----------

const URL_FILTER_PREFIX = "f.";
const URL_SORT_KEY = "sort";
const URL_PAGE_KEY = "p";
const URL_PAGE_SIZE_KEY = "ps";
/** The free-text search term — managed only by {@link useTableUrlState}, and only when
 *  it is asked to (`search: true`); a plain `urlSync` table leaves a `q` alone. */
const URL_SEARCH_KEY = "q";

/** What {@link readTableUrlState} found in a query string. */
export interface TableUrlState {
  sorts?: SortState[];
  filters?: FilterState;
  /** `Infinity` for `ps=all`. */
  pageSize?: number;
  /** 0-based (the URL's `p` is 1-based). */
  page?: number;
}

/**
 * What a table's URL says, read out of a query string: the column filters (`f.<key>`),
 * the sort, the page size and the 0-based page. Absent keys are absent here too, so a
 * caller can tell "not in the link" from "the default". The same reader `urlSync` uses
 * on mount, exported for an owner that keeps the state itself — see
 * {@link useTableUrlState}.
 *
 * Pass the ROUTER's query string — the one `setSearchParams` writes.
 *
 * This read `window.location.search` until 0.7.0, which is the same string only under a
 * BrowserRouter. Under a HashRouter the router's query lives after the `#`
 * (`/#/tx?f.payee=Rewe`) and `window.location.search` is empty: a shared link opened
 * unfiltered, and the table's first write then replaced the link's filter with its own
 * empty state. Reading and writing through `useSearchParams` is one source for both
 * directions under every router, MemoryRouter included.
 */
export function readTableUrlState<T>(
  sp: URLSearchParams,
  columns: DataTableColumn<T>[],
): TableUrlState {
  const out: TableUrlState = {};

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

/**
 * The managed part of the query string, as a string, for comparing by VALUE.
 *
 * Everything the table puts in the address and nothing else, in a fixed order.
 * `columns` is walked for its keys only, which is why it can be left out of the
 * effect's dependencies without lying: a new column ARRAY carrying the same keys
 * produces the same signature, and a genuinely different set of filterable columns
 * produces a different one.
 */
function urlSignature<T>(
  columns: DataTableColumn<T>[],
  sorts: SortState[],
  filters: FilterState,
  pageSize: number,
  page: number,
  defaultPageSize: number,
): string {
  const parts: string[] = [];
  for (const col of columns) {
    const state = filters[col.key];
    if (!state || !isFilterActive(state)) continue;
    const enc = encodeFilterValue(state);
    if (enc != null) parts.push(`${URL_FILTER_PREFIX}${col.key}=${enc}`);
  }
  parts.push(`${URL_SORT_KEY}=${encodeSorts(sorts)}`);
  parts.push(
    `${URL_PAGE_SIZE_KEY}=${
      pageSize === Infinity ? "all" : pageSize === defaultPageSize ? "" : String(pageSize)
    }`,
  );
  parts.push(`${URL_PAGE_KEY}=${page > 0 ? String(page + 1) : ""}`);
  return parts.join("&");
}

function writeUrlState<T>(
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  columns: DataTableColumn<T>[],
  sorts: SortState[],
  filters: FilterState,
  pageSize: number,
  page: number,
  defaultPageSize: number,
  // `undefined`: the search term is not ours to manage, and a `q` is left as it is.
  search: string | undefined,
  // The current entry's route state, carried over the replace. A query rewrite is not
  // a navigation, and dropping the state would, for one, lose the mark a URL-bound
  // dialog's opener leaves there (see useDialogParam).
  state: unknown,
): void {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      // clear managed keys
      for (const col of columns) next.delete(URL_FILTER_PREFIX + col.key);
      next.delete(URL_SORT_KEY);
      next.delete(URL_PAGE_KEY);
      next.delete(URL_PAGE_SIZE_KEY);
      if (search !== undefined) {
        next.delete(URL_SEARCH_KEY);
        if (search.trim()) next.set(URL_SEARCH_KEY, search);
      }
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
    { replace: true, state },
  );
}

/**
 * Where a table's view lives: what it is sorted and filtered by, which page, how wide
 * the columns are and which are hidden — plus the two places that outlives a render.
 *
 * Lifted out of `DataTable`, which was 984 lines and twenty hooks in one function. This
 * is the part that is genuinely about STATE rather than about drawing, and the three
 * rules it encodes are easy to lose among the markup:
 *
 * * **The URL is read once, on mount.** A shared or deep link populates the initial view;
 *   after that the state is local, or the browser's own history would fight the user's
 *   next click.
 * * **Sorting and filtering are optionally CONTROLLED.** A server-driven table passes
 *   state and a callback and owns them; everything else is self-owned. That is the
 *   `sortsProp ?? internalSorts` pair, and it is why the setters are exposed separately.
 * * **Persistence writes on every change, the URL only when asked.** `storageKey` is the
 *   per-table identity; `urlSync` is opt-in because only some tables want their view in
 *   a shareable address.
 * * **A controlled filter or sort that changes sends the table back to page 1.** See
 *   the note at the reset below.
 */
export function useTableState<T>({
  columns,
  storageKey,
  storageKeyPrefix,
  urlSync,
  defaultPageSize,
  sortsProp,
  filtersProp,
}: {
  columns: DataTableColumn<T>[];
  storageKey?: string;
  storageKeyPrefix: string;
  urlSync?: boolean;
  defaultPageSize: number;
  sortsProp?: SortState[];
  filtersProp?: FilterState;
}) {
  // Called unconditionally (a Router is required either way — see src/data-table.ts),
  // and the SAME pair is used to read and to write; see `readTableUrlState`.
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  // Read URL once on mount so URL-encoded views (e.g. shared links, deep links from
  // other pages) populate initial state. After mount, state is local.
  const [urlInitial] = useState<TableUrlState>(() =>
    urlSync ? readTableUrlState(searchParams, columns) : {},
  );
  const initial = useMemo(
    () => loadPersisted(storageKey, storageKeyPrefix),
    [storageKey, storageKeyPrefix],
  );
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

  // ---- Controlled filters/sorts reset the page ----
  //
  // A self-owned table resets to page 1 in the filter handlers. A CONTROLLED one could
  // not: the handlers hand the change to the owner and return, and `page` lives here,
  // where the owner has no way to reach it — so narrowing a filter from outside (a
  // saved view, a chip dismissed above the table) left a client-side table on page 4
  // of what was now two pages, clamped to the last one instead of the first.
  //
  // So the table does it: whenever the controlled VALUE changes, back to the first
  // page. Compared by value, because a controlled prop is a fresh object on every
  // parent render. Adjusted during render rather than in an effect, so the stale page
  // is never painted and never written to the URL. Not on mount: a deep link's `p=3`
  // must survive the owner's first render. (In `serverPagination` mode this state is
  // unused — the owner's `page` is the page, and resetting it stays the owner's job.)
  const controlledSig =
    sortsProp !== undefined || filtersProp !== undefined
      ? JSON.stringify([sortsProp ?? null, filtersProp ?? null])
      : null;
  const [seenControlledSig, setSeenControlledSig] = useState(controlledSig);
  if (seenControlledSig !== controlledSig) {
    setSeenControlledSig(controlledSig);
    setPage(0);
  }
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

  // ---- Writing out: both of these compare by VALUE ----
  //
  // A CONTROLLED table (`sorts`/`filters` props plus callbacks — every server-driven
  // one) receives a freshly-built object on every render of the page around it, and
  // `{}` is never `===` the `{}` before it. Keyed on identity, both effects below
  // therefore fired on every unrelated parent render: persistence wrote the same JSON
  // into `localStorage` each time — a synchronous main-thread write, on a page whose
  // other half may be a form being typed into — and the URL one handed react-router a
  // `replace` it answers with a render, which is the loop the audit records. A `ref`
  // holding what was last written is what makes "changed" mean changed.
  const lastPersisted = useRef<string | null>(null);
  const persisted = !storageKey
    ? ""
    : serializePersisted({
        sort: sorts,
        filters,
        pageSize: pageSize === Infinity ? "all" : pageSize,
        widths,
        hidden: Array.from(hiddenCols),
      });
  useEffect(() => {
    if (!storageKey) return;
    // The destination is part of the signature: two tables can hold identical state,
    // and a table that swaps `storageKey` has to write under the new one even though
    // nothing about the view changed.
    const target = storageKeyPrefix + storageKey;
    const sig = `${target}\u0000${persisted}`;
    if (lastPersisted.current === sig) return;
    lastPersisted.current = sig;
    writeStored(target, persisted);
  }, [storageKey, storageKeyPrefix, persisted]);

  const lastUrl = useRef<string | null>(null);
  const urlSig = urlSync
    ? urlSignature(columns, sorts, filters, pageSize, page, defaultPageSize)
    : "";
  useEffect(() => {
    if (!urlSync) return;
    if (lastUrl.current === urlSig) return;
    lastUrl.current = urlSig;
    // `columns` is deliberately not a dependency and does not need to be: the
    // signature above is computed from it, so a column set that would produce a
    // different address produces a different signature first.
    writeUrlState(setSearchParams, columns, sorts, filters, pageSize, page, defaultPageSize, undefined, location.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSync, urlSig]);

  return {
    sorts,
    filters,
    setInternalSorts,
    setInternalFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    widths,
    setWidths,
    hiddenCols,
    setHiddenCols,
    showSettings,
    setShowSettings,
    headRefs,
  };
}

// ---------- Owner-held table state, mirrored to the URL ----------

export interface UseTableUrlStateOptions<T> {
  /** The table's columns — read for their keys and filter types only. */
  columns: DataTableColumn<T>[];
  /** Default 25. A page size equal to it is left out of the URL. */
  defaultPageSize?: number;
  /** Mirror the state into the URL and seed it from there on mount. Default true. */
  urlSync?: boolean;
  /** Also hold a free-text search term, under `q`. Off by default, so a `q` that
   *  belongs to someone else on the page is never touched. */
  search?: boolean;
}

/** The part of {@link DataTableProps} a server-driven table takes from its owner. */
export interface TableUrlStateProps {
  serverPagination: ServerPagination;
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  sorts: SortState[];
  onSortsChange: (next: SortState[]) => void;
}

export interface UseTableUrlStateReturn {
  /** 0-based. */
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  /** Also back to the first page. */
  setPageSize: (pageSize: number) => void;
  filters: FilterState;
  /** Also back to the first page. */
  setFilters: (next: FilterState) => void;
  sorts: SortState[];
  /** Also back to the first page. */
  setSorts: (next: SortState[]) => void;
  /** The search term (`""` unless `search: true`). */
  search: string;
  /** Also back to the first page. */
  setSearch: (next: string) => void;
  /**
   * Everything the table needs, to spread onto it:
   * `<DataTable {...table.tableProps(data?.total ?? 0, { isLoading })} rows={…} … />`.
   */
  tableProps: (total: number, options?: { isLoading?: boolean }) => TableUrlStateProps;
}

interface OwnedState {
  sorts: SortState[];
  filters: FilterState;
  pageSize: number;
  page: number;
  search: string;
}

/**
 * The controlled state of a `serverPagination` table — filters, sorts, page, page size
 * and optionally a search term — kept by the OWNER and mirrored into the URL in the
 * table's own scheme (`f.<key>`, `sort`, `p`, `ps`, and `q`).
 *
 * A server-driven table owns none of this: the owner has to hold it to turn it into
 * the query that fetches `rows`, and until now it also had to restate the table's URL
 * codec to keep the view bookmarkable (kastlan's use-server-table.ts copied
 * `readUrlState` / `writeUrlState` to do it). Same rules as `urlSync`:
 *
 * * **The URL is read once, on mount** — a shared or deep link (see {@link filterHref})
 *   seeds the view; after that the state is local and written out with `replace`.
 * * **Any change but the page itself goes back to page 1** — a narrower filter must not
 *   leave the user on page 7 of 2.
 * * **Written by value**: an unchanged view writes nothing, however often the owner
 *   renders.
 *
 * Mapping the state onto the backend's query parameters stays the owner's: that is the
 * part the kit cannot know.
 */
export function useTableUrlState<T>({
  columns,
  defaultPageSize = 25,
  urlSync = true,
  search: manageSearch = false,
}: UseTableUrlStateOptions<T>): UseTableUrlStateReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [state, setState] = useState<OwnedState>(() => {
    const url = urlSync ? readTableUrlState(searchParams, columns) : {};
    return {
      sorts: url.sorts ?? [],
      filters: url.filters ?? {},
      pageSize: url.pageSize ?? defaultPageSize,
      page: url.page ?? 0,
      search: urlSync && manageSearch ? (searchParams.get(URL_SEARCH_KEY) ?? "") : "",
    };
  });

  const lastUrl = useRef<string | null>(null);
  const urlSig = urlSync
    ? urlSignature(columns, state.sorts, state.filters, state.pageSize, state.page, defaultPageSize) +
      (manageSearch ? `&${URL_SEARCH_KEY}=${state.search.trim() ? state.search : ""}` : "")
    : "";
  useEffect(() => {
    if (!urlSync) return;
    // First run included: a link that arrives with `p=1` or a default `ps` is
    // normalised to the table's own spelling, as `urlSync` does.
    if (lastUrl.current === urlSig) return;
    lastUrl.current = urlSig;
    writeUrlState(
      setSearchParams,
      columns,
      state.sorts,
      state.filters,
      state.pageSize,
      state.page,
      defaultPageSize,
      manageSearch ? state.search : undefined,
      location.state,
    );
    // Keyed on the signature, which is computed from everything the write reads — see
    // the same effect in useTableState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSync, urlSig]);

  const setPage = (page: number) => setState((s) => ({ ...s, page }));
  const setPageSize = (pageSize: number) => setState((s) => ({ ...s, pageSize, page: 0 }));
  const setFilters = (filters: FilterState) => setState((s) => ({ ...s, filters, page: 0 }));
  const setSorts = (sorts: SortState[]) => setState((s) => ({ ...s, sorts, page: 0 }));
  const setSearch = (search: string) => setState((s) => ({ ...s, search, page: 0 }));

  return {
    page: state.page,
    setPage,
    pageSize: state.pageSize,
    setPageSize,
    filters: state.filters,
    setFilters,
    sorts: state.sorts,
    setSorts,
    search: state.search,
    setSearch,
    tableProps: (total, options) => ({
      serverPagination: {
        page: state.page,
        pageSize: state.pageSize,
        total,
        onPageChange: setPage,
        onPageSizeChange: setPageSize,
        isLoading: options?.isLoading,
      },
      filters: state.filters,
      onFiltersChange: setFilters,
      sorts: state.sorts,
      onSortsChange: setSorts,
    }),
  };
}
