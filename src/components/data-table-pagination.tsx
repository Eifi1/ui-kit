import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { DEFAULT_DATA_TABLE_LABELS, type DataTableLabels } from "./data-table-labels";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { useLargeText } from "../hooks/use-large-text";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;

/** The page-size steps, with the current size slotted in when it is not one of them. */
function sizeOptions(pageSize: number): number[] {
  const steps: number[] = [...PAGE_SIZE_OPTIONS];
  if (!Number.isFinite(pageSize) || steps.includes(pageSize)) return steps;
  return [...steps, pageSize].sort((a, b) => a - b);
}

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

/**
 * How many page numbers flank the current one on the strip: ±2, and ±1 on a phone at
 * Large and Extra large (0.32.1, the 360 px Extra-large sweep; docs/text-size-
 * harmonization.md §4). At 150 % a number button is 42 px, and "‹ 1 2 3 … 494 ›" was
 * 312 px on a 360 px phone's 262; one neighbour fewer on each side saves two buttons.
 */
const PAGE_WINDOW = 2;
const PAGE_WINDOW_LARGE_PHONE = 1;

/**
 * The strip's two parts (0.32.1, same sweep, §4 "nothing overflows"). The arrows keep
 * the ends; the numbers between them wrap, centred, when even the narrower window does
 * not fit — a middle page of a long list ("1 … 249 250 251 … 494") at Extra large, or at
 * Normal on a narrow phone, where the one-row strip ran past the screen. Where the
 * strip fits it is one row, as before.
 */
const PAGE_STRIP = "flex min-w-0 max-w-full items-center gap-1";
const PAGE_NUMBERS = "flex min-w-0 flex-wrap items-center justify-center gap-1";

/** Footer for {@link DataTable}: range summary, page-size select, and a
 *  windowed page-number strip (first/last + ±2 around the current page, ±1 on a phone
 *  at Large — see {@link PAGE_WINDOW}). */
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
  const large = useLargeText();
  const phone = usePhoneLayout();
  const radius = large && phone ? PAGE_WINDOW_LARGE_PHONE : PAGE_WINDOW;
  const visible = useMemo(() => {
    // Every page when that is no longer than the window would be (first, last, the
    // current one, its neighbours and two ellipses).
    if (totalPages <= 2 * radius + 3) return Array.from({ length: totalPages }, (_, i) => i);
    const set = new Set<number>([0, totalPages - 1, page]);
    for (let d = 1; d <= radius; d++) {
      if (page - d >= 0) set.add(page - d);
      if (page + d <= totalPages - 1) set.add(page + d);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [page, totalPages, radius]);

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
            {/* A `defaultPageSize` that is not one of the steps (keksdose's 5) is offered
                too — a select whose value has no option shows its first one ("10"). */}
            {sizeOptions(pageSize).map((n) => (
              <option key={n} value={n}>
                {num.format(n)}
              </option>
            ))}
            <option value="all">{labels.pageSizeAll}</option>
          </select>
        )}
      </div>
      {pageSize !== Infinity && totalPages > 1 && (
        <div data-slot="page-strip" className={PAGE_STRIP}>
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
          <div data-slot="page-numbers" className={PAGE_NUMBERS}>
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
          </div>
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
