import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "./data-table";

// DataTable's fit to its own width (0.48, keksdose live #451: "On expanded sidebar for
// desktop the table scrolls horizontally. On collapsed sidebar it fits […] Compute the
// width selectively"). Two column options, both opt-in:
//
// - `grow`: the column takes what the others leave and ellipsises (`w-full max-w-0` on
//   its cells: in an auto table layout that is "the rest of the row", never its content's
//   width), so one long title can no longer widen the table.
// - `fitPriority`: while the table is wider than its scroller — or, with a `grow` column,
//   while that column would get less than {@link GROW_MIN_REM} — the table leaves out
//   its `fitPriority` columns, the LOWEST number first (ties: the later column first),
//   and brings them back in the reverse order once the scroller is as wide as the table
//   needed with them. The scroller's own width, through a ResizeObserver: a sidebar, a
//   narrower window, the Columns drawer and Large text all count the same.

/** The least a `grow` column keeps before the table starts leaving columns out: about
 *  a sentence of a title. In rem, so Large text asks for more. */
export const GROW_MIN_REM = 15;

/** The `<th>`/`<td>` classes of a `grow` column. `truncate-until-large`: one line and an
 *  ellipsis at Normal, a wrap from Large up (text size §10.17), as every kit title. */
export const GROW_HEAD_CLASS = "w-full max-w-0";
export const GROW_CELL_CLASS = "w-full max-w-0 truncate-until-large";

/** The auto-hide order: lowest `fitPriority` first, the later column first on a tie. */
export function fitHideOrder<T>(columns: DataTableColumn<T>[]): DataTableColumn<T>[] {
  return columns
    .map((col, index) => ({ col, index }))
    .filter(({ col }) => col.fitPriority != null)
    .sort((a, b) => a.col.fitPriority! - b.col.fitPriority! || b.index - a.index)
    .map(({ col }) => col);
}

/**
 * Which columns the table leaves out for width, and the Columns panel's "keep it".
 *
 * A column the user TICKS in the Columns panel is theirs: it is never left out for width
 * again while the table is mounted (`keep`): the table makes room by leaving out the next
 * candidate, and scrolls sideways once none is left — what they asked for. Unticking it hides it as before (the persisted `hiddenCols`) and
 * drops the keep. Keeps are not persisted: on the next visit the table fits again.
 */
export function useColumnFit<T>({
  columns,
  hiddenCols,
  headRefs,
  scroller,
  enabled,
}: {
  columns: DataTableColumn<T>[];
  /** The user's hidden columns: never candidates (they are out already). */
  hiddenCols: Set<string>;
  headRefs: Map<string, HTMLTableCellElement>;
  /** The desktop scroller, read after render (it is declared below the call). */
  scroller: () => HTMLElement | null;
  /** The wide layout. On a phone (the card list) nothing is left out for width. */
  enabled: boolean;
}): {
  /** The columns left out for width now — empty while off. */
  autoHidden: Set<string>;
  /** The user's choice in the Columns panel: `true` keeps the column in whatever the width. */
  keep: (key: string, on: boolean) => void;
} {
  const [kept, setKept] = useState<ReadonlySet<string>>(() => new Set());
  const [hidden, setHidden] = useState<string[]>([]);
  // The width the table needed WITH a column, written when it is left out: it comes
  // back once the scroller is at least that wide.
  const showAt = useRef(new Map<string, number>());

  const hasFit = columns.some((c) => c.fitPriority != null);
  const active = enabled && hasFit;
  const order = useMemo(
    () => fitHideOrder(columns).filter((c) => !hiddenCols.has(c.key) && !kept.has(c.key)),
    [columns, hiddenCols, kept],
  );
  // Only the candidates still in play, in hide order — a column the user hid or kept
  // since, or one the app dropped, is no longer "hidden for width".
  const current = useMemo(
    () => (active ? order.filter((c) => hidden.includes(c.key)).map((c) => c.key) : []),
    [active, order, hidden],
  );
  const growKey = columns.find((c) => c.grow && !hiddenCols.has(c.key))?.key;

  // What `measure` reads, refreshed after each render (before the measure below runs):
  // the ResizeObserver's callback is set up once and must see the current columns.
  const latest = useRef({ order, current, growKey, active, scroller });
  useLayoutEffect(() => {
    latest.current = { order, current, growKey, active, scroller };
  });

  const measure = useCallback(() => {
    const { order, current, growKey, active, scroller } = latest.current;
    const el = scroller();
    if (!active || !el) return;
    const table = el.querySelector("table");
    const avail = el.clientWidth;
    // Not laid out (display:none, jsdom): nothing to fit to.
    if (!table || avail <= 0) return;
    const growTh = growKey ? headRefs.get(growKey) : undefined;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    let need = growTh
      ? table.offsetWidth - growTh.offsetWidth + GROW_MIN_REM * rem
      : table.offsetWidth;
    if (need > avail + 0.5) {
      // Leave out, in order, until the rest fits: each column saves its header's width
      // (the others are at their content's width while a `grow` column takes the rest).
      const next = [...current];
      for (const col of order) {
        if (need <= avail + 0.5) break;
        if (next.includes(col.key)) continue;
        const th = headRefs.get(col.key);
        showAt.current.set(col.key, need);
        need -= th?.offsetWidth ?? 0;
        next.push(col.key);
      }
      if (next.length !== current.length) setHidden(next);
      return;
    }
    // Bring back, the last left out first, while the scroller is as wide as they needed.
    let n = current.length;
    while (n > 0 && avail + 0.5 >= (showAt.current.get(current[n - 1]) ?? Infinity)) n--;
    if (n !== current.length) setHidden(current.slice(0, n));
  }, [headRefs]);

  // After every render: rows, a filter or a page can widen a column as much as a resize.
  // Before paint, so a column the table cannot hold is never drawn first.
  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const el = latest.current.scroller();
    if (!active || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [active, measure]);

  const keep = useCallback((key: string, on: boolean) => {
    setKept((s) => {
      if (s.has(key) === on) return s;
      const next = new Set(s);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const autoHidden = useMemo(() => new Set(current), [current]);
  return { autoHidden, keep };
}
