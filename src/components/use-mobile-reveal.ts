import { useEffect, useRef, useState } from "react";

/**
 * The phone's endless scroll, in place of the desktop pager (feedback #232).
 *
 * A client-side table already holds every row, so there is nothing to fetch — it simply
 * reveals more of the sorted list as a sentinel scrolls into view. A SERVER-paginated
 * table keeps its pager instead, because the rest of the rows genuinely are not here.
 *
 * The reveal count only ever grows and self-caps at the (re-filtered) list length, which
 * is why nothing resets it: narrowing a filter cannot leave the limit pointing past the
 * end, and widening one does not have to re-reveal what the user already scrolled past.
 *
 * `paginated={false}` opts out entirely: a table that is short by construction (an
 * invoice's line items) renders every row on a phone too. It used to be chunked here
 * regardless, so a twelve-line invoice showed its first ten lines and a "Loading…"
 * sentinel for rows that were already in memory.
 *
 * Lifted out of `DataTable` with the rest of its state; the sentinel ref belongs to the
 * caller's `<li>`.
 */
export function useMobileReveal<T>({
  rows,
  slice,
  isServer,
  isMdUp,
  unpaged = false,
  defaultPageSize,
}: {
  /** The whole sorted list — what there is to reveal. */
  rows: T[];
  /** What a server-paginated table shows instead. */
  slice: T[];
  isServer: boolean;
  isMdUp: boolean;
  /** `paginated={false}` on a client-side table: show every row, reveal nothing. */
  unpaged?: boolean;
  defaultPageSize: number;
}) {
  const [mobileLimit, setMobileLimit] = useState(defaultPageSize);
  const mobileSlice = isServer ? slice : unpaged ? rows : rows.slice(0, mobileLimit);
  const canRevealMoreMobile = !isServer && !unpaged && !isMdUp && mobileLimit < rows.length;
  const loadMoreRef = useRef<HTMLLIElement | null>(null);

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

  return { mobileSlice, canRevealMoreMobile, loadMoreRef };
}
