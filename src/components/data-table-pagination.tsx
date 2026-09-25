import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { DEFAULT_DATA_TABLE_LABELS, type DataTableLabels } from "./data-table-labels";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;

interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  /** Omit when the page size is not the user's to change (a server that fixes it):
   *  the select is then not rendered at all, rather than rendered and inert. */
  onPageSize?: (n: number) => void;
  /** Over `dataTable` from `<UiKitProvider labels>`, over the English defaults. */
  labels?: Partial<DataTableLabels>;
  /** For the page numbers and page-size options; falls back to the provider's. */
  locale?: string;
  /** `"compact"` for a pager under a compact {@link DataTable} (lenkbank's in-card
   *  tables): a slimmer footer and page buttons, so the pager is not the tallest row
   *  of a table that was made compact on purpose. */
  density?: "comfortable" | "compact";
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
  labels: labelsProp,
  locale: localeProp,
  density = "comfortable",
}: PaginationProps) {
  const compact = density === "compact";
  // prop > provider > English, like every other kit component. This defaulted straight
  // to the English object, so a standalone pager under a translated provider still
  // said "Rows per page" — only the pager INSIDE a DataTable was translated, because
  // the table resolved the provider's labels and handed them down.
  const labels = useKitLabels("dataTable", DEFAULT_DATA_TABLE_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  // The bare numbers on the strip and in the select are text too: `String(n)` is
  // always ASCII digits, which is wrong for a locale that writes its own. The range
  // summary is not formatted here — `pageRange` / `rowCount` take NUMBERS so the
  // translation can format them itself, alongside the words around them.
  const num = useMemo(() => new Intl.NumberFormat(locale), [locale]);
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
    <div
      data-density={density}
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]",
        compact ? "px-2 py-1" : "px-3 py-2",
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          {pageSize === Infinity
            ? labels.rowCount(total)
            : labels.pageRange(page * pageSize + 1, Math.min(total, (page + 1) * pageSize), total)}
        </span>
        {onPageSize && (
          <select
            value={pageSize === Infinity ? "all" : pageSize}
            onChange={(e) =>
              onPageSize(e.target.value === "all" ? Infinity : Number(e.target.value))
            }
            className="rounded border border-[var(--border)] bg-[var(--bg-surface)] px-1 py-0.5 text-xs"
            aria-label={labels.pageSize}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {num.format(n)}
              </option>
            ))}
            <option value="all">{labels.pageSizeAll}</option>
          </select>
        )}
      </div>
      {pageSize !== Infinity && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className={cn("rounded hover:bg-[var(--bg-hover)] disabled:opacity-40", compact ? "p-0.5" : "p-1")}
            aria-label={labels.prevPage}
          >
            {/* "Previous" points back along the line — left in LTR, right in RTL. */}
            <ChevronLeft className={cn("rtl:-scale-x-100", compact ? "size-3.5" : "size-4")} />
          </button>
          {items.map((it, i) =>
            it === "ellipsis" ? (
              <span key={`e${i}`} className="px-1 text-[var(--text-placeholder)]">
                …
              </span>
            ) : (
              <button
                key={it}
                type="button"
                onClick={() => onPage(it)}
                // Which page you are on is carried only by a background colour
                // otherwise, and the strip is a row of bare numbers with nothing
                // else to tell them apart.
                aria-current={it === page ? "page" : undefined}
                className={cn(
                  "rounded",
                  compact ? "min-w-6 px-1.5 py-0" : "min-w-7 px-2 py-0.5",
                  it === page
                    ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                    : "hover:bg-[var(--bg-hover)]",
                )}
              >
                {num.format(it + 1)}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className={cn("rounded hover:bg-[var(--bg-hover)] disabled:opacity-40", compact ? "p-0.5" : "p-1")}
            aria-label={labels.nextPage}
          >
            <ChevronRight className={cn("rtl:-scale-x-100", compact ? "size-3.5" : "size-4")} />
          </button>
        </div>
      )}
    </div>
  );
}
