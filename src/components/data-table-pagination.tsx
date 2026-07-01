import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { DEFAULT_DATA_TABLE_LABELS, type DataTableLabels } from "./data-table-labels";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;

interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  labels?: DataTableLabels;
}

/** Footer for {@link DataTable}: range summary, page-size select, and a
 *  windowed page-number strip (first/last + ±2 around the current page). */
export function Pagination({
  page,
  totalPages,
  pageSize,
  total,
  onPage,
  onPageSize,
  labels = DEFAULT_DATA_TABLE_LABELS,
}: PaginationProps) {
  const visible = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const set = new Set<number>([0, totalPages - 1, page]);
    for (let d = 1; d <= 2; d++) {
      if (page - d >= 0) set.add(page - d);
      if (page + d <= totalPages - 1) set.add(page + d);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [page, totalPages]);

  const items: (number | "ellipsis")[] = [];
  visible.forEach((p, idx) => {
    if (idx > 0 && p - visible[idx - 1] > 1) items.push("ellipsis");
    items.push(p);
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
      <div className="flex items-center gap-2">
        <span>
          {pageSize === Infinity
            ? `${total}`
            : `${page * pageSize + 1}–${Math.min(total, (page + 1) * pageSize)} / ${total}`}
        </span>
        <select
          value={pageSize === Infinity ? "all" : pageSize}
          onChange={(e) => onPageSize(e.target.value === "all" ? Infinity : Number(e.target.value))}
          className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900"
          aria-label={labels.pageSize}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="all">{labels.pageSizeAll}</option>
        </select>
      </div>
      {pageSize !== Infinity && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded p-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            aria-label={labels.prevPage}
          >
            <ChevronLeft className="size-4" />
          </button>
          {items.map((it, i) =>
            it === "ellipsis" ? (
              <span key={`e${i}`} className="px-1 text-slate-400 dark:text-slate-500">
                …
              </span>
            ) : (
              <button
                key={it}
                type="button"
                onClick={() => onPage(it)}
                className={cn(
                  "min-w-7 rounded px-2 py-0.5",
                  it === page
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
              >
                {it + 1}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="rounded p-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            aria-label={labels.nextPage}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
