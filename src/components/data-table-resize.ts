import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { isRtl } from "../lib/direction";
import type { DataTableColumn } from "./data-table";

// DataTable's column resize and auto-size. Moved out of data-table.tsx whole (refactor
// audit 2026-10, MOD-3 step 2): what it needs from the table is the header cells, the
// widths and their setter, and which columns are shown — nothing else.

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

/**
 * The resize handles' pointer handlers, and the column panel's "Auto-size".
 *
 * Pointer events with capture, rather than a `mousemove`/`mouseup` pair on `window`.
 * Three defects in one eleven-line handler (audit 2026-09-22):
 *
 *  * a `setWidths` per `mousemove` re-rendered every row of the table on every pixel
 *    of the drag — on a 500-row table that is the whole body, sixty times a second;
 *  * the two `window` listeners were added from inside an event handler, so nothing
 *    removed them if the table unmounted mid-drag (the row beneath opens a route),
 *    and `document.body.style` stayed at `user-select: none; cursor: col-resize` for
 *    the rest of the session — the whole page unselectable, with the wrong cursor;
 *  * `mousedown` is a mouse. Under a finger the handle did nothing at all.
 *
 * `setPointerCapture` answers all three: the handle itself receives every move and
 * the terminating `pointerup`/`pointercancel` wherever the pointer travels, so there
 * is nothing global to leak, and a touch drag works because a finger is a pointer.
 * The live width is written straight onto the column's own cells — the same three
 * properties the render sets, so the drag and the commit cannot disagree — and
 * `setWidths` is called once, when the drag ends.
 */
export function useColumnResize<T>({
  headRefs,
  widths,
  setWidths,
  columns,
  hiddenCols,
}: {
  /** The header cells by column key, as the `<th>`s' ref callbacks fill it. */
  headRefs: Map<string, HTMLTableCellElement>;
  /** The widths React renders the columns at. */
  widths: Record<string, number>;
  setWidths: Dispatch<SetStateAction<Record<string, number>>>;
  columns: DataTableColumn<T>[];
  hiddenCols: Set<string>;
}) {
  const resizing = useRef<Resize | null>(null);

  /** Every cell in one column, header first, totals row included. `data-col` rather than a cell index:
   *  an expanded row holds a single `colSpan` cell, so the nth `<td>` of a row is
   *  not reliably the nth column. */
  const columnCells = (key: string): HTMLElement[] => {
    const th = headRefs.get(key);
    if (!th) return [];
    const table = th.closest("table");
    if (!table) return [th];
    return [
      th,
      ...Array.from(table.querySelectorAll<HTMLElement>("tbody [data-col], tfoot [data-col]")).filter(
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
        // A `grow` column takes the rest by design: pinning it would undo that (0.48).
        if (idx === cols.length - 1 || col.grow) return;
        const th = headRefs.get(col.key);
        if (th) next[col.key] = Math.ceil(th.getBoundingClientRect().width);
      });
      setWidths(next);
    });
  };

  return { startResize, moveResize, finishResize, autoSizeAll };
}
