import { Fragment, memo } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { RowLink, cleanAttrs, fromOutside, fromOwnControl, logicalAlign, splitCellProps } from "./data-table-shared";
import { GROW_CELL_CLASS, GROW_PEER_CELL_CLASS } from "./data-table-fit";
import { MobileRow, type MobileRowProps } from "./data-table-mobile";
import { Checkbox } from "./checkbox";
import type { DataTableColumn, MobileSwipeActions } from "./data-table";
import { cn } from "../lib/cn";

// DataTable's rows as memoised components (0.48.2, keksdose K-052-2, dev #632 — Marcel:
// "The table is extremely slow. Is it virtualised or is everytime the whole table
// rendered?"). The owner's selection, expansion and the roving focus all live ABOVE the
// rows, so every tick re-rendered the whole table: on keksdose's register one checkbox
// cost 430–1200 ms of INP at 271 rows. A row now bails out unless one of its own inputs
// changed.
//
// What a row compares, and so the contract a call site keeps:
//  * the row object, its index and its key;
//  * what the table derived for it from the caller's functions, as PRIMITIVES — selected,
//    selectable, expanded, its tab stop, its `rowClassName` string, its `rowHref`, and
//    its `rowAttributes` compared key by key. The functions themselves may be inline;
//  * the column definitions BY IDENTITY: a cell is the caller's render function, and
//    what it reads is the caller's to say. A page that memoises its columns (keksdose's
//    `useTransactionColumns`) gets the bail-out; one that writes them inline gets a new
//    array every render and the full re-render it always had — never a stale cell;
//  * an OPEN row's detail (`expandedRow`) is called on every render, so it re-renders
//    with the table as before, and an editor inside it keeps its live inputs.
// The handlers do not take part: they read the table's latest props through `ctx`, a
// ref the table refreshes each commit, so a row that bailed out still acts on the
// current selection and the current `onRowClick`.

/** What a row's handlers read at event time — DataTable's latest props and helpers. */
export interface DataTableRowCtx<T> {
  onRowClick: ((row: T) => void) | undefined;
  onToggle: ((row: T, checked: boolean) => void) | undefined;
  isSelected: (row: T) => boolean;
  canSelect: (row: T) => boolean;
  selectRange: (toIndex: number) => boolean;
  /** Anchor the next Shift+click range on this row's key. */
  setAnchor: (key: string | number) => void;
  /** Remember the checkbox click that drew a range… */
  markRangeClick: (e: Event) => void;
  /** …and drop that click's own change event (true once for it). */
  takeRangeClick: (e: Event) => boolean;
  setFocusRowKey: (key: string | number) => void;
  /** The phone card's long press: enter selection mode with this row selected. */
  onLongPress: (row: T) => void;
  /** Under `virtualize` (0.48.2): Arrow/Home/End over every row, rendered or not. True
   *  when the key was one of them. Without it the roving walks the rendered rows. */
  moveFocus?: (fromIndex: number, key: string) => boolean;
  /** The focus came into this row — the row, a control in it, its open detail, or a
   *  portal one of them opened: where the table puts the focus if the row leaves
   *  (refactor audit 2026-10-30, DSP-4). */
  noteFocus: (key: string | number) => void;
}

/** `rowAttributes`' result compared key by key: a call site returns a fresh object (or
 *  `undefined`) per call, and its values are strings. */
function sameAttrs(
  a: Record<string, string | undefined> | undefined,
  b: Record<string, string | undefined> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

function sameProps<P extends { attrs?: Record<string, string | undefined> }>(prev: P, next: P): boolean {
  for (const k of Object.keys(next) as (keyof P)[]) {
    if (k === "attrs") continue;
    if (!Object.is(prev[k], next[k])) return false;
  }
  return sameAttrs(prev.attrs, next.attrs);
}

/** Arrow/Home/End between the focusable rows of the table's bodies — the roving half of
 *  the keyboard-activatable rows (see the row's `onKeyDown`). */
function moveRowFocus(from: HTMLElement, key: string): boolean {
  if (!(key in ROW_NAV_KEYS)) return false;
  // Every body of the table: a grouped table (`groupBy`, 0.48) has one per group.
  const table = from.closest("table");
  if (!table) return false;
  const rows = Array.from(table.tBodies).flatMap((body) =>
    Array.from(body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute("data-row-nav"),
    ),
  );
  const i = rows.indexOf(from);
  const target =
    key === "ArrowDown"
      ? rows[i + 1]
      : key === "ArrowUp"
        ? rows[i - 1]
        : key === "Home"
          ? rows[0]
          : key === "End"
            ? rows[rows.length - 1]
            : undefined;
  // At either end the key is still consumed, or ArrowDown on the last row would
  // scroll the page out from under a focused row.
  target?.focus();
  return true;
}
const ROW_NAV_KEYS = { ArrowDown: 1, ArrowUp: 1, Home: 1, End: 1 } as const;

// ---------- Desktop row ----------

export interface DataTableRowProps<T> {
  row: T;
  rowIndex: number;
  rowKey: string | number;
  ctx: RefObject<DataTableRowCtx<T>>;
  columns: DataTableColumn<T>[];
  widths: Record<string, number>;
  growDrawn: boolean;
  linkColumn: DataTableColumn<T> | undefined;
  href: string | undefined;
  /** The selection column is drawn (DataTable's `selection`). */
  selectionColumn: boolean;
  selectable: boolean;
  selected: boolean;
  expanded: boolean;
  /** The open row's detail; `null` on a closed row. */
  expansion: ReactNode;
  /** The row carries the visually hidden disclosure button (focusable rows that expand). */
  disclosure: boolean;
  detailId: string;
  rowsFocusable: boolean;
  rowInteractive: boolean;
  tabbable: boolean;
  className: string | undefined;
  attrs: Record<string, string | undefined> | undefined;
  compact: boolean;
  totalColSpan: number;
  rowDetailsLabel: string;
  selectRowLabel: string;
  /** Under `virtualize` (0.48.2): the row's `aria-rowindex` (its open detail row is the
   *  next), and its detail row is marked with the row's index for the window's measuring. */
  ariaRowIndex?: number;
}

function DataTableRowImpl<T>({
  row,
  rowIndex,
  rowKey: key,
  ctx,
  columns,
  widths,
  growDrawn,
  linkColumn,
  href,
  selectionColumn,
  selectable,
  selected,
  expanded,
  expansion,
  disclosure: hasDisclosure,
  detailId,
  rowsFocusable,
  rowInteractive,
  tabbable,
  className,
  attrs,
  compact,
  totalColSpan,
  rowDetailsLabel,
  selectRowLabel,
  ariaRowIndex,
}: DataTableRowProps<T>) {
  const windowed = ariaRowIndex !== undefined;
  // Whether the row is open, said where ARIA allows it (round 0.34, the
  // showcase's axe check): `aria-expanded` belongs to a treegrid's row, not a
  // table's, and the <tr> wore it. A disclosure button in the first cell carries
  // it now, with `aria-controls` on the detail row while that is there.
  // Visually hidden and not a tab stop: the row stays the one roving stop, with
  // Enter/Space and the whole-row click — this is the screen reader cursor's
  // way in, and where it hears the state. Named by `aria-label`, so the cell's
  // text stays the cell's own.
  const disclosure = hasDisclosure ? (
    <button
      type="button"
      tabIndex={-1}
      className="sr-only-fixed"
      aria-label={rowDetailsLabel}
      aria-expanded={expanded}
      aria-controls={expansion ? detailId : undefined}
      // The row's own handler leaves a click on a control inside it alone.
      onClick={() => ctx.current.onRowClick!(row)}
    />
  ) : null;
  return (
    <Fragment>
      <tr
        {...cleanAttrs(attrs)}
        aria-rowindex={ariaRowIndex}
        // Every row, windowed or not: the window measures by it (0.48.2), and the table
        // finds by it the row that takes the focus when a focused one leaves (DSP-4).
        data-row-index={rowIndex}
        data-row-nav={rowsFocusable ? "" : undefined}
        tabIndex={rowsFocusable ? (tabbable ? 0 : -1) : undefined}
        onFocus={(e) => {
          if (rowsFocusable && e.target === e.currentTarget) ctx.current.setFocusRowKey(key);
          ctx.current.noteFocus(key);
        }}
        onKeyDown={
          rowsFocusable
            ? (e) => {
                // Only the row's own key presses: Enter on a nested button
                // or link is that control's, and Space in a nested input
                // is a space.
                if (e.target !== e.currentTarget) return;
                if (e.altKey || e.ctrlKey || e.metaKey) return;
                if (e.key === "Enter" || e.key === " ") {
                  // Space would otherwise scroll the table.
                  e.preventDefault();
                  ctx.current.onRowClick!(row);
                  return;
                }
                if (e.shiftKey) return;
                const move = ctx.current.moveFocus;
                if (move ? move(rowIndex, e.key) : moveRowFocus(e.currentTarget, e.key)) e.preventDefault();
              }
            : undefined
        }
        className={cn(
          "border-t border-subtle",
          rowInteractive && "cursor-pointer hover:bg-hover",
          // The kit's focus frame width (§5, `--focus-ring-width`), drawn as an
          // OUTLINE rather than FOCUS_RING's box-shadow: a shadow on a `<tr>`
          // is not painted by every engine, an outline is.
          rowsFocusable &&
            "focus-visible:bg-hover focus-visible:outline-focus focus-visible:-outline-offset-2 focus-visible:outline-brand",
          className,
        )}
        onClick={
          rowInteractive
            ? (e: ReactMouseEvent<HTMLTableRowElement>) => {
                const c = ctx.current;
                // A click on a control inside the row (a button, a link,
                // an input the cell renders) is that control's — it must
                // not also open the row. Cells no longer have to
                // `stopPropagation` to get that.
                if (fromOwnControl(e.target, e.currentTarget)) return;
                if (fromOutside(e.target, e.currentTarget)) return;
                // Modifier-clicks anywhere in the row drive
                // selection instead of expanding it (feedback #289):
                // Ctrl/Cmd toggles a single row, Shift selects the
                // range from the last-toggled row (inclusive of this
                // one) — the same as the checkbox, but for the whole
                // row, which is what the checkbox-only version was
                // missing.
                if (c.onToggle && c.canSelect(row)) {
                  if (e.shiftKey) {
                    // Drop the text selection a shift-click would
                    // otherwise smear across the rows.
                    window.getSelection?.()?.removeAllRanges();
                    if (c.selectRange(rowIndex)) return;
                    // No anchor yet: treat it as the first pick.
                    c.setAnchor(key);
                    c.onToggle(row, !c.isSelected(row));
                    return;
                  }
                  if (e.metaKey || e.ctrlKey) {
                    c.setAnchor(key);
                    c.onToggle(row, !c.isSelected(row));
                    return;
                  }
                }
                c.onRowClick?.(row);
              }
            : undefined
        }
      >
        {selectionColumn && (
          <td
            className={cn("align-top", compact ? "w-8 px-2 py-1" : "w-10 px-3 py-2")}
            // Don't let selecting a row also trigger the row click
            // (which expands/edits it).
            onClick={(e) => e.stopPropagation()}
          >
            {selectable && (
              // The kit's Checkbox, as the phone card's, not an indigo native box (DSP-14;
              // see the header's).
              <Checkbox
                inputClassName={compact ? "size-3.5" : undefined}
                checked={selected}
                // Shift+click selects the range from the last toggled
                // row. `preventDefault` puts the box back, but it does NOT
                // stop React's `onChange`: React derives a checkbox's
                // change from the `click` itself, after the browser has
                // already flipped `checked` and before the cancellation
                // reverts it — so the same click also reported itself as
                // a single toggle, and the owner got `onToggleMany` and
                // then `onToggle` for the clicked row. The click is
                // remembered by identity and its change is dropped; a
                // boolean flag would outlive a click whose change never
                // came and swallow the user's next real one.
                onClick={(e) => {
                  if (e.shiftKey && ctx.current.selectRange(rowIndex)) {
                    e.preventDefault();
                    ctx.current.markRangeClick(e.nativeEvent);
                  }
                }}
                onChange={(e) => {
                  const c = ctx.current;
                  if (c.takeRangeClick(e.nativeEvent)) return;
                  c.setAnchor(key);
                  c.onToggle?.(row, e.target.checked);
                }}
                aria-label={selectRowLabel}
              />
            )}
          </td>
        )}
        {columns.map((col, colIndex) => {
          const width = widths[col.key];
          // The caller's first, the table's over it — see `cellProps`.
          const own = splitCellProps(col.cellProps?.(row));
          const pinned = width ? { width, minWidth: width, maxWidth: width } : undefined;
          return (
            <td
              {...own.attrs}
              key={col.key}
              data-col={col.key}
              style={own.style || pinned ? { ...own.style, ...pinned } : undefined}
              className={cn(
                "align-top",
                compact ? "px-2 py-1" : "px-3 py-2",
                width && "overflow-hidden text-ellipsis",
                col.grow ? GROW_CELL_CLASS : growDrawn && GROW_PEER_CELL_CLASS,
                logicalAlign(own.className),
                logicalAlign(col.className),
              )}
            >
              {colIndex === 0 && disclosure}
              {col === linkColumn && href ? (
                // No `onActivate`: the click is left to bubble to the
                // <tr> handler above, which already owns expand-vs-select.
                // Calling it here as well would toggle the row twice. Without
                // `onRowClick` (the row is not focusable then) nothing opens it in
                // place, and the link is followed (DSP-23 b).
                <RowLink href={href} navigate={!rowsFocusable} className="block" data-row-link="">
                  {col.cell(row)}
                </RowLink>
              ) : (
                col.cell(row)
              )}
            </td>
          );
        })}
      </tr>
      {expansion && (
        <tr
          id={hasDisclosure ? detailId : undefined}
          aria-rowindex={windowed ? ariaRowIndex + 1 : undefined}
          data-row-detail={windowed ? rowIndex : undefined}
          // An inline editor's field is the row's focus too (DSP-4).
          onFocus={() => ctx.current.noteFocus(key)}
          className="bg-surface-2 border-t border-subtle"
        >
          {/* The detail panel spans every column. In an `auto` table
              layout (the default here — columns only get fixed style
              widths once the user resizes/auto-sizes them) the cell's
              content preferred-width is redistributed across the
              spanned columns, so a long expansion visibly re-sizes the
              columns above it — and one-line content does not, since
              its preferred width is small (feedback #104). Wrapping the
              content in `w-0 min-w-full` pins the cell's preferred
              width to ~0 (the explicit width:0 child), so it can never
              perturb the columns; the div then fills to the full row
              width only at paint time, and long text wraps within it.
              Inside it the content is pinned to what the scroller SHOWS
              (0.47, keksdose S4): on a table wider than its scroller a
              table-wide panel put an inline editor's Save/Cancel off-screen.
              `sticky start-0` holds it at the scroller's start edge (the
              right one in RTL) as the row scrolls sideways, and
              `--dt-visible-w` (the scroller's clientWidth, measured above)
              sizes it; before the first measure, and in a table no wider
              than its scroller, it is the full width as before. */}
          <td colSpan={totalColSpan} className="p-0">
            <div className="w-0 min-w-full">
              <div
                className={cn(
                  "sticky start-0 w-[var(--dt-visible-w,100%)] max-w-full",
                  compact ? "px-2 py-2" : "px-3 py-3",
                )}
              >
                {expansion}
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

/** One desktop row (its `<tr>` and, while open, its detail row), memoised — see the
 *  file's note for what it compares. */
export const DataTableRow = memo(DataTableRowImpl, sameProps) as <T>(
  props: DataTableRowProps<T> & { key?: string | number },
) => ReactNode;

// ---------- Phone card ----------

export interface DataTableMobileRowProps<T> extends Pick<
  MobileRowProps<T>,
  | "row"
  | "rowIndex"
  | "opensRow"
  | "mobileDir"
  | "mobileCardLinkable"
  | "mobileCardStretched"
  | "mobileCard"
  | "mobilePrimaryCol"
  | "mobileStatusColumns"
  | "mobileSecondaryColumns"
  | "mobileActionColumns"
  | "mobileExpandAsDialog"
  | "compact"
  | "large"
> {
  ctx: RefObject<DataTableRowCtx<T>>;
  rowKey: string | number;
  expanded: boolean;
  /** The opened row's content (`openedRowContent`); `null` on a closed card. */
  expansion: ReactNode;
  className: string | undefined;
  attrs: Record<string, string | undefined> | undefined;
  /** The table has `onRowClick`. */
  interactive: boolean;
  href: string | undefined;
  /** `mobileSwipeActions`, or the swipes derived from `rowActions` — by identity. */
  swipeActionsFor: ((row: T) => MobileSwipeActions | null) | undefined;
  /** The table has `selection`. */
  selectionOn: boolean;
  selectActive: boolean;
  selectable: boolean;
  selected: boolean;
}

const yes = () => true;

function DataTableMobileRowImpl<T>({
  ctx,
  rowKey: key,
  expanded,
  expansion,
  className,
  attrs,
  interactive,
  href,
  selectionOn,
  selectActive,
  selectable,
  selected,
  ...rest
}: DataTableMobileRowProps<T>) {
  const { row } = rest;
  // `MobileRow` keeps its own shape (functions of the row); these hand it the values the
  // table derived, and the handlers read the latest props through `ctx`.
  return (
    <MobileRow
      {...rest}
      isExpanded={expanded ? yes : undefined}
      openedRowContent={() => expansion}
      rowClassName={() => className}
      rowAttributes={() => attrs}
      onRowClick={interactive ? (r) => ctx.current.onRowClick!(r) : undefined}
      rowHref={href !== undefined ? () => href : undefined}
      onFocusIn={() => ctx.current.noteFocus(key)}
      select={
        selectionOn
          ? {
              active: selectActive,
              selectable,
              selected,
              onToggle: (checked) => {
                ctx.current.setAnchor(key);
                ctx.current.onToggle?.(row, checked);
              },
              onLongPress: () => ctx.current.onLongPress(row),
            }
          : null
      }
    />
  );
}

/** One phone card, memoised like {@link DataTableRow}. */
export const DataTableMobileRow = memo(DataTableMobileRowImpl, sameProps) as <T>(
  props: DataTableMobileRowProps<T> & { key?: string | number },
) => ReactNode;
