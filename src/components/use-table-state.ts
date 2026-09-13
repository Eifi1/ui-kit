import { useEffect, useMemo, useState } from "react";
import type { useSearchParams } from "react-router";
import { readStored, writeStored } from "../lib/safe-storage";
import {
  decodeFilterValue,
  encodeFilterValue,
  isFilterActive,
  resolveFilter,
} from "./data-table-filters";
import { decodeSorts, encodeSorts, normalizeSorts, type SortState } from "./data-table-sort";
import type { DataTableColumn, FilterState } from "./data-table";

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
 */
export function useTableState<T>({
  columns,
  storageKey,
  storageKeyPrefix,
  urlSync,
  setSearchParams,
  defaultPageSize,
  sortsProp,
  filtersProp,
}: {
  columns: DataTableColumn<T>[];
  storageKey?: string;
  storageKeyPrefix: string;
  urlSync?: boolean;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
  defaultPageSize: number;
  sortsProp?: SortState[];
  filtersProp?: FilterState;
}) {
  // Read URL once on mount so URL-encoded views (e.g. shared links, deep links from
  // other pages) populate initial state. After mount, state is local.
  const [urlInitial] = useState<UrlState>(() => (urlSync ? readUrlState(columns) : {}));
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
    savePersisted(
      storageKey,
      {
        sort: sorts,
        filters,
        pageSize: pageSize === Infinity ? "all" : pageSize,
        widths,
        hidden: Array.from(hiddenCols),
      },
      storageKeyPrefix,
    );
  }, [storageKey, storageKeyPrefix, sorts, filters, pageSize, widths, hiddenCols]);

  useEffect(() => {
    if (!urlSync) return;
    writeUrlState(setSearchParams, columns, sorts, filters, pageSize, page, defaultPageSize);
    // columns identity changes per render but URL output only depends on column keys;
    // including columns would re-run on every render. We rely on data state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSync, sorts, filters, pageSize, page, defaultPageSize]);

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
