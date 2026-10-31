import { useRef } from "react";
import type { DataTableProps } from "./data-table";

// DataTable's Shift+click range selection (feedback #289). Moved out of data-table.tsx
// whole (refactor audit 2026-10, MOD-3 step 3).

/**
 * The anchor a Shift+click draws its range from, and the range itself.
 *
 * `selectionAnchor` is set by every single-row toggle (the checkbox, a Ctrl/⌘-click or
 * a first Shift-click on a row); `selectRange(i)` then selects from the anchor to the
 * `i`th row of `slice`, and answers false when there is no range on screen to draw.
 * `rangeClick` remembers the checkbox click that drew one, so that click's own
 * `onChange` can be told apart and dropped.
 */
export function useRangeSelection<T>({
  selection,
  slice,
  rowKey,
}: {
  selection: DataTableProps<T>["selection"];
  /** The rows on screen, in the order shown. */
  slice: readonly T[];
  rowKey: (row: T) => string | number;
}) {
  // The row whose selection was last toggled, so Shift+click can select the range up
  // to it (feedback #289). Held as its KEY, not as an index into `slice`: the slice is
  // re-derived from the current sort, filter and page, so an index taken before a
  // header was clicked addresses a different row afterwards — and the range then ran
  // from a row the user had never touched.
  const selectionAnchor = useRef<string | number | null>(null);
  /** The checkbox click that drew a range, so its `onChange` can be told apart. */
  const rangeClick = useRef<Event | null>(null);
  const canSelect = (row: T) => !!selection && (selection.isSelectable?.(row) ?? true);
  const selectRange = (toIndex: number) => {
    if (!selection || selectionAnchor.current === null) return false;
    const fromIndex = slice.findIndex((r) => rowKey(r) === selectionAnchor.current);
    // The anchor has been filtered, sorted or paged off the screen: there is no range
    // on display to draw, so the click falls through to the plain single-row toggle.
    if (fromIndex < 0) return false;
    const [lo, hi] = [fromIndex, toIndex].sort((a, b) => a - b);
    const range: T[] = [];
    for (let i = lo; i <= hi; i++) {
      const r = slice[i];
      if (r && canSelect(r)) range.push(r);
    }
    // One call where the owner can take one. See `selection.onToggleMany`: the row-by-
    // row loop below is the fallback for an owner that has not adopted it, not the
    // shape this should be in.
    if (selection.onToggleMany) selection.onToggleMany(range, true);
    else for (const r of range) selection.onToggle(r, true);
    return true;
  };
  // The ref writes as functions (0.48.2): the memoised rows (data-table-row.tsx) reach
  // them through DataTable's row context rather than holding the refs themselves.
  /** Every single-row toggle anchors the next Shift+click's range on its row. */
  const setAnchor = (key: string | number) => {
    selectionAnchor.current = key;
  };
  /** Remember the checkbox click that drew a range. */
  const markRangeClick = (e: Event) => {
    rangeClick.current = e;
  };
  /** True — once — for the change event of the click that drew a range. */
  const takeRangeClick = (e: Event) => {
    if (!rangeClick.current || rangeClick.current !== e) return false;
    rangeClick.current = null;
    return true;
  };
  return { selectionAnchor, rangeClick, canSelect, selectRange, setAnchor, markRangeClick, takeRangeClick };
}
