import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";
import * as ReactRouter from "react-router";
import { useLocation, useSearchParams } from "react-router";
import { useKitTableStorageKeyPrefix } from "../i18n/kit-labels";
import { readStored, writeStored } from "../lib/safe-storage";
import { decodeFilterValue, encodeFilterValue, isFilterActive, resolveFilter } from "./data-table-filters";
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
  /** 0.48: the `defaultHidden` columns the user ticked back on — an entry that beats the
   *  default. Written only when non-empty, so a table without such columns stores what
   *  it always did. */
  shown?: string[];
}

/** The hidden set as drawn: the stored one plus every `defaultHidden` column the view
 *  holds no entry for (neither hidden nor `shown`). */
function withDefaultHidden(view: { hidden: Set<string>; shown: Set<string> }, defaults: string[]): Set<string> {
  const extra = defaults.filter((k) => !view.hidden.has(k) && !view.shown.has(k));
  return extra.length === 0 ? view.hidden : new Set([...view.hidden, ...extra]);
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

/** A stored page size as a table holds it — `"all"` is `Infinity` — or `fallback`. */
function storedPageSize(stored: Partial<PersistedState>, fallback: number): number {
  if (stored.pageSize === "all") return Infinity;
  if (typeof stored.pageSize === "number" && stored.pageSize > 0) return stored.pageSize;
  return fallback;
}

// ---------- URL sync helpers ----------

const URL_FILTER_PREFIX = "f.";
const URL_SORT_KEY = "sort";
const URL_PAGE_KEY = "p";
const URL_PAGE_SIZE_KEY = "ps";
/** The free-text search term — managed only by {@link useTableUrlState}, and only when
 *  it is asked to (`search: true`); a plain `urlSync` table leaves a `q` alone. */
const URL_SEARCH_KEY = "q";

/**
 * How a table is mirrored into the URL: `true`, or `{ prefix }` for a table that shares
 * its page with another URL-synced one. The prefix is put verbatim in front of EVERY key
 * the table writes and reads — `{ prefix: "inv." }` gives `inv.f.<column>`, `inv.sort`,
 * `inv.p`, `inv.ps` (and `inv.q`) — so two tables on one page stop sharing a sort and a
 * page. Without one the keys are unprefixed, as they always were.
 */
export type TableUrlSync = boolean | { prefix?: string };

/** The query keys of one table, with its prefix applied. */
interface UrlKeys {
  filter: string;
  sort: string;
  page: string;
  pageSize: string;
  search: string;
}

function urlKeys(prefix = ""): UrlKeys {
  return {
    filter: prefix + URL_FILTER_PREFIX,
    sort: prefix + URL_SORT_KEY,
    page: prefix + URL_PAGE_KEY,
    pageSize: prefix + URL_PAGE_SIZE_KEY,
    search: prefix + URL_SEARCH_KEY,
  };
}

/** What a table reads and writes the URL through: react-router's, or none. */
interface TableSearch {
  searchParams: URLSearchParams;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
  locationState: unknown;
}

function useRouterSearch(): TableSearch {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  return { searchParams, setSearchParams, locationState: location.state };
}

const NO_ROUTER_SEARCH: TableSearch = {
  searchParams: new URLSearchParams(),
  setSearchParams: () => {},
  locationState: null,
};
function useNoRouterSearch(): TableSearch {
  return NO_ROUTER_SEARCH;
}

/**
 * `useInRouterContext`, read off the namespace inside a `try` like
 * use-search-param-state's probe: a test's `vi.mock("react-router", () => ({ … }))`
 * without it throws on the read. Missing, a table assumes a Router, as before 0.49.
 */
function readInRouterContext(): () => boolean {
  try {
    return (ReactRouter as unknown as { useInRouterContext?: () => boolean }).useInRouterContext ?? (() => true);
  } catch {
    return () => true;
  }
}
const useInRouterContext = readInRouterContext();

/**
 * The URL access a table needs (0.49, KIT-3). Without `urlSync` a table needs no Router:
 * before 0.49 it called `useSearchParams()` unconditionally and threw outside one even
 * with URL sync off. With `urlSync` and no Router, a development build throws a message
 * that names the fix; a production build keeps the view in local state rather than
 * crash the page. Whether a Router is around does not change during a table's life, so
 * which hook runs is stable from render to render.
 */
function useTableSearch(urlSync: boolean, owner: string): TableSearch {
  const inRouter = useInRouterContext();
  if (!inRouter && urlSync && import.meta.env?.DEV) {
    throw new Error(
      `${owner} urlSync requires a Router: render it inside a react-router Router ` +
        "(BrowserRouter, a data router or a MemoryRouter), or leave urlSync off.",
    );
  }
  const useSearch = inRouter ? useRouterSearch : useNoRouterSearch;
  return useSearch();
}

/** `urlSync` split into "is it on" and "under which prefix". */
function resolveTableUrlSync(urlSync: TableUrlSync | undefined): { enabled: boolean; prefix: string } {
  if (!urlSync) return { enabled: false, prefix: "" };
  return { enabled: true, prefix: urlSync === true ? "" : (urlSync.prefix ?? "") };
}

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
 * Pass the ROUTER's query string — the one `setSearchParams` writes — and the table's
 * `prefix` when it has one (see {@link TableUrlSync}).
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
  prefix?: string,
): TableUrlState {
  const keys = urlKeys(prefix);
  const out: TableUrlState = {};

  const filters: FilterState = {};
  for (const col of columns) {
    const filter = resolveFilter(col);
    if (!filter) continue;
    const raw = sp.get(keys.filter + col.key);
    if (raw == null) continue;
    filters[col.key] = decodeFilterValue(filter, raw);
  }
  if (Object.keys(filters).length) out.filters = filters;

  const sortRaw = sp.get(keys.sort);
  if (sortRaw) {
    const decoded = decodeSorts(sortRaw, new Set(columns.map((c) => c.key)));
    if (decoded.length) out.sorts = decoded;
  }

  const psRaw = sp.get(keys.pageSize);
  if (psRaw === "all") out.pageSize = Infinity;
  else if (psRaw && Number(psRaw) > 0) out.pageSize = Number(psRaw);

  const pRaw = sp.get(keys.page);
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
  keys: UrlKeys,
): string {
  const parts: string[] = [];
  for (const col of columns) {
    const state = filters[col.key];
    if (!state || !isFilterActive(state)) continue;
    const enc = encodeFilterValue(state);
    if (enc != null) parts.push(`${keys.filter}${col.key}=${enc}`);
  }
  parts.push(`${keys.sort}=${encodeSorts(sorts)}`);
  parts.push(
    `${keys.pageSize}=${pageSize === Infinity ? "all" : pageSize === defaultPageSize ? "" : String(pageSize)}`,
  );
  parts.push(`${keys.page}=${page > 0 ? String(page + 1) : ""}`);
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
  keys: UrlKeys,
): void {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      // clear managed keys
      for (const col of columns) next.delete(keys.filter + col.key);
      next.delete(keys.sort);
      next.delete(keys.page);
      next.delete(keys.pageSize);
      if (search !== undefined) {
        next.delete(keys.search);
        if (search.trim()) next.set(keys.search, search);
      }
      // write filters
      for (const col of columns) {
        const state = filters[col.key];
        if (!state || !isFilterActive(state)) continue;
        const enc = encodeFilterValue(state);
        if (enc != null) next.set(keys.filter + col.key, enc);
      }
      // write sort
      const sortEnc = encodeSorts(sorts);
      if (sortEnc) next.set(keys.sort, sortEnc);
      // write page size if non-default
      if (pageSize === Infinity) next.set(keys.pageSize, "all");
      else if (pageSize !== defaultPageSize) next.set(keys.pageSize, String(pageSize));
      // write page if not first
      if (page > 0) next.set(keys.page, String(page + 1));
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
 * * **A controlled filter, sort or page size that changes sends the table back to page
 *   1.** See the note at the reset below.
 */
export function useTableState<T>({
  columns,
  storageKey,
  storageKeyPrefix,
  urlSync: urlSyncOption,
  defaultPageSize,
  sortsProp,
  filtersProp,
  pageSizeProp,
}: {
  columns: DataTableColumn<T>[];
  storageKey?: string;
  storageKeyPrefix: string;
  urlSync?: TableUrlSync;
  defaultPageSize: number;
  sortsProp?: SortState[];
  filtersProp?: FilterState;
  pageSizeProp?: number;
}) {
  const { enabled: urlSync, prefix: urlPrefix } = resolveTableUrlSync(urlSyncOption);
  const keys = useMemo(() => urlKeys(urlPrefix), [urlPrefix]);
  // The SAME pair is used to read and to write; see `readTableUrlState`. No Router is
  // needed without `urlSync` (0.49, KIT-3; see `useTableSearch`).
  const { searchParams, setSearchParams, locationState } = useTableSearch(urlSync, "DataTable");
  // Read URL once on mount so URL-encoded views (e.g. shared links, deep links from
  // other pages) populate initial state. After mount, state is local.
  const [urlInitial] = useState<TableUrlState>(() =>
    urlSync ? readTableUrlState(searchParams, columns, urlPrefix) : {},
  );
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
  // A controlled page size counts too: the groups of `TranslationReviewPanel` share one,
  // and a group paged deep into its rows starts over when another group's pager changes it.
  const controlledSig =
    sortsProp !== undefined || filtersProp !== undefined || pageSizeProp !== undefined
      ? JSON.stringify([sortsProp ?? null, filtersProp ?? null, String(pageSizeProp)])
      : null;
  const [seenControlledSig, setSeenControlledSig] = useState(controlledSig);
  if (seenControlledSig !== controlledSig) {
    setSeenControlledSig(controlledSig);
    setPage(0);
  }
  const [internalPageSize, setPageSize] = useState<number>(() =>
    urlInitial.pageSize !== undefined ? urlInitial.pageSize : storedPageSize(initial, defaultPageSize),
  );
  const pageSize = pageSizeProp ?? internalPageSize;
  const [widths, setWidths] = useState<Record<string, number>>(() => initial.widths ?? {});
  // Hidden columns (0.48, keksdose #617): what the user chose — `hidden`, and `shown`
  // for a `defaultHidden` column ticked back on — kept apart from the defaults, which
  // are applied on read and never stored. Keyed on the default keys as a string: every
  // call site builds `columns` inline, so the array is new on every render.
  const [view, setView] = useState(() => ({
    hidden: new Set<string>(initial.hidden ?? []),
    shown: new Set<string>(initial.shown ?? []),
  }));
  const defaultHiddenSig = columns
    .filter((c) => c.defaultHidden)
    .map((c) => c.key)
    .join("\u0000");
  const hiddenCols = useMemo(
    () => withDefaultHidden(view, defaultHiddenSig ? defaultHiddenSig.split("\u0000") : []),
    [view, defaultHiddenSig],
  );
  // The panel hands over the next DRAWN set; what changed is recorded as a choice.
  const setHiddenCols = useCallback(
    (action: SetStateAction<Set<string>>) =>
      setView((v) => {
        const defaults = defaultHiddenSig ? defaultHiddenSig.split("\u0000") : [];
        const prev = withDefaultHidden(v, defaults);
        const next = typeof action === "function" ? action(prev) : action;
        const hidden = new Set(v.hidden);
        const shown = new Set(v.shown);
        for (const k of next) {
          if (prev.has(k)) continue;
          hidden.add(k);
          shown.delete(k);
        }
        for (const k of prev) {
          if (next.has(k)) continue;
          hidden.delete(k);
          if (defaults.includes(k)) shown.add(k);
        }
        return { hidden, shown };
      }),
    [defaultHiddenSig],
  );
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
        hidden: Array.from(view.hidden),
        ...(view.shown.size > 0 ? { shown: Array.from(view.shown) } : {}),
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
  const urlSig = urlSync ? urlSignature(columns, sorts, filters, pageSize, page, defaultPageSize, keys) : "";
  useEffect(() => {
    if (!urlSync) return;
    if (lastUrl.current === urlSig) return;
    lastUrl.current = urlSig;
    // `columns` is deliberately not a dependency and does not need to be: the
    // signature above is computed from it, so a column set that would produce a
    // different address produces a different signature first.
    writeUrlState(
      setSearchParams,
      columns,
      sorts,
      filters,
      pageSize,
      page,
      defaultPageSize,
      undefined,
      locationState,
      keys,
    );
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

// ---------- One view over several tables ----------

/** What {@link useSharedTableView} keeps. */
export interface SharedTableView {
  sorts: SortState[];
  setSorts: (next: SortState[]) => void;
  /** `Infinity` for "all", as a table holds it. */
  pageSize: number;
  setPageSize: (next: number) => void;
}

/**
 * One table view — the sort and the page size — for an owner that draws it as SEVERAL
 * tables over one `storageKey`: `TranslationReviewPanel`'s groups, which sort and page
 * alike (0.35, Kurvenschmiede: its grouped review stored no view at all). Pass them to
 * each table as `sorts`/`onSortsChange` and `pageSize`/`onPageSizeChange`.
 *
 * Kept in the very blob a `DataTable` with that `storageKey` keeps, not in a format of
 * its own, so the single table and the groups read each other's view. What the blob
 * holds besides (filters, column widths, hidden columns) is carried over as stored, for
 * the single table to find as it left it. Read when `active` turns on — on mount, or
 * when the owner switches to this view — and written on a change, never on a read. The
 * prefix resolves as DataTable's does: prop > provider > the kit's.
 */
export function useSharedTableView({
  active,
  storageKey,
  storageKeyPrefix,
  defaultPageSize,
}: {
  active: boolean;
  storageKey?: string;
  storageKeyPrefix?: string;
  defaultPageSize: number;
}): SharedTableView {
  const providerPrefix = useKitTableStorageKeyPrefix();
  const prefix = storageKeyPrefix ?? providerPrefix ?? DEFAULT_PERSIST_PREFIX;
  const read = () => {
    const stored = active ? loadPersisted(storageKey, prefix) : {};
    return { sorts: normalizeSorts(stored.sort), pageSize: storedPageSize(stored, defaultPageSize) };
  };
  const [view, setView] = useState(read);
  // Adjusted during render when `active` turns on, so the first render of the groups
  // already has the view the single table left, not a frame of the default.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setView(read());
  }
  const change = (patch: Partial<typeof view>) => {
    const next = { ...view, ...patch };
    setView(next);
    if (!active || !storageKey) return;
    const stored = loadPersisted(storageKey, prefix);
    const blob: PersistedState = {
      sort: next.sorts,
      filters: stored.filters ?? {},
      pageSize: next.pageSize === Infinity ? "all" : next.pageSize,
      widths: stored.widths,
      hidden: stored.hidden,
    };
    writeStored(prefix + storageKey, serializePersisted(blob));
  };
  return {
    sorts: view.sorts,
    setSorts: (sorts) => change({ sorts }),
    pageSize: view.pageSize,
    setPageSize: (pageSize) => change({ pageSize }),
  };
}

// ---------- Owner-held table state, mirrored to the URL ----------

export interface UseTableUrlStateOptions<T> {
  /** The table's columns — read for their keys and filter types only. */
  columns: DataTableColumn<T>[];
  /** Default 25. A page size equal to it is left out of the URL. */
  defaultPageSize?: number;
  /** Mirror the state into the URL and seed it from there on mount. Default true.
   *  `{ prefix }` puts a prefix in front of every key, for a page with two URL-synced
   *  tables — see {@link TableUrlSync}. */
  urlSync?: TableUrlSync;
  /** Shorthand for `urlSync: { prefix }`; wins over a prefix given there. */
  urlPrefix?: string;
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
  urlSync: urlSyncOption = true,
  urlPrefix: urlPrefixOption,
  search: manageSearch = false,
}: UseTableUrlStateOptions<T>): UseTableUrlStateReturn {
  const resolved = resolveTableUrlSync(urlSyncOption);
  const urlSync = resolved.enabled;
  const urlPrefix = urlPrefixOption ?? resolved.prefix;
  const keys = useMemo(() => urlKeys(urlPrefix), [urlPrefix]);
  const { searchParams, setSearchParams, locationState } = useTableSearch(urlSync, "useTableUrlState");
  const [state, setState] = useState<OwnedState>(() => {
    const url = urlSync ? readTableUrlState(searchParams, columns, urlPrefix) : {};
    return {
      sorts: url.sorts ?? [],
      filters: url.filters ?? {},
      pageSize: url.pageSize ?? defaultPageSize,
      page: url.page ?? 0,
      search: urlSync && manageSearch ? (searchParams.get(keys.search) ?? "") : "",
    };
  });

  const lastUrl = useRef<string | null>(null);
  const urlSig = urlSync
    ? urlSignature(columns, state.sorts, state.filters, state.pageSize, state.page, defaultPageSize, keys) +
      (manageSearch ? `&${keys.search}=${state.search.trim() ? state.search : ""}` : "")
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
      locationState,
      keys,
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
