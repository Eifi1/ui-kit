import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from "react";
import { ClipboardPaste, Eraser, Plus, Trash2 } from "lucide-react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
// The cell pair reads ONE cell, where a comma has no columns to separate and so is
// always a decimal mark; `splitRow` and `parseRows` read a pasted table, where it may
// be either and the line decides. See the three named rules at the top of table-text.
import { cellNumber, isCellNumber, parseRows, splitRow } from "../lib/table-text";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { useWindowedRows } from "../hooks/use-windowed-rows";
import { ToggleGroup } from "./toggle-group";
import { Button, FIELD_INVALID, Textarea } from "./ui";

/**
 * A measured table: a fixed set of numeric columns, typed cell by cell or pasted as a
 * block out of a spreadsheet — and the hook that holds it as a draft.
 *
 * Moved from Lenkbank (`shared/ui/measured-grid.tsx`), where four gear editors and a
 * setpoint dialog type rig measurements into it. Nothing in it knows what a column
 * holds: the caller passes `{ label, unit }[]`, and the vocabulary of this file is
 * cells, rows, a caret and a paste. The lexing under it is `@eifi1/ui-kit/table-text`.
 *
 * What it is NOT: a `DataTable` mode (that one finds rows among many; this one types
 * numbers into columns), a spreadsheet (no formulas, no multi-cell selection, no undo
 * beyond the browser's per-input one), or typed columns — every cell is a string that
 * should read as a number.
 */

/**
 * Every string the grid can speak — the `measuredGrid` namespace of
 * `<UiKitProvider labels>`, overridable per instance through the `labels` prop. The
 * ones that carry a number are functions of it, for the reason `DataTableLabels` gives:
 * the grammar around a count moves with it in most languages.
 */
export interface MeasuredGridLabels {
  /** Accessible name of the cells/text toggle. */
  view: string;
  cellsView: string;
  textView: string;
  addRow: string;
  /** The row's remove button, given its 1-based number. */
  removeRow: (row: number) => string;
  /** Empties the whole table. */
  clear: string;
  /** The footer's standing note that a block can be pasted into any cell. */
  pasteHint: string;
  /**
   * Accessible name of one cell's input, given its column's label and 1-based row.
   * A screen reader in a grid announces the headers on its own when the caret crosses
   * one; this is what it reads when the caret lands on an input with no crossing — and
   * what a voice-control user says to reach it.
   */
  cell: (column: string, row: number) => string;
  /** The row-number column's header, which shows only "#". */
  rowNumber: string;
  /** The remove-button column's header, which shows nothing. */
  rowActions: string;
  /** The grid's description: how its keyboard works. Read once, on entry. */
  keyboardHint: string;
  /** The text view could not read this 1-based line of what was typed or pasted. */
  lineError: (line: number) => string;
  /** How many filled rows (measured points) the table holds. */
  points: (count: number) => string;
  /** How many cells are typed but are not numbers. */
  problems: (count: number) => string;
}

/** English defaults. Exported as the `measuredGrid` namespace of `UiKitLabels`
 *  (src/i18n), the complete reference a translation is written against. */
export const DEFAULT_MEASURED_GRID_LABELS: MeasuredGridLabels = {
  view: "Table view",
  cellsView: "Cells",
  textView: "Text",
  addRow: "Add row",
  removeRow: (row) => `Remove row ${row}`,
  clear: "Clear table",
  pasteHint: "Paste a block from a spreadsheet into any cell",
  cell: (column, row) => `${column}, row ${row}`,
  rowNumber: "Row",
  rowActions: "Row actions",
  keyboardHint:
    "Arrow keys move between cells. Type to replace a cell, F2 to edit it, Escape to undo the edit. Enter moves down and adds a row at the end.",
  lineError: (line) => `Line ${line} could not be read`,
  points: (count) => (count === 1 ? "1 point" : `${count} points`),
  problems: (count) => (count === 1 ? "1 cell is not a number" : `${count} cells are not numbers`),
};

/** One column of a measured table: what it holds and what it is measured in. The unit
 *  is separate from the name because the header shows it small and underneath, and
 *  because a column with no unit (a count, an index) should not render empty brackets. */
export interface MeasuredGridColumn {
  label: string;
  unit?: string;
}

/** The two ways to look at the same table. */
export type MeasuredGridView = "cells" | "text";

/** A cell that has not been typed into yet. Distinguished from `"0"` on purpose: an
 *  empty cell is a hole in the measurement, and a table with a hole is not one to save. */
const BLANK = "";

/** Height of one grid row, in pixels. Fixed, which is what lets the windowing be
 *  arithmetic rather than measurement. */
const DEFAULT_ROW_HEIGHT = 28;

const ALL_VIEWS: readonly MeasuredGridView[] = ["cells", "text"];

/** The locale's decimal mark, as far as a cell can hold it: "," or ".". A mark outside
 *  those two (Arabic's "٫") is not one `cellNumber` reads, so those locales keep the
 *  dot. The same answer `NumberField` gives, for the same reason. */
function decimalMark(locale: string | undefined): "," | "." {
  try {
    const part = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal");
    return part?.value === "," ? "," : ".";
  } catch {
    // An invalid tag throws a RangeError; a typo in a locale must not take the grid down.
    return ".";
  }
}

/** A number-shaped cell written with the locale's mark. The lexer hands back points;
 *  a German user typed commas and should read commas back. Anything that is not a
 *  number is left exactly as it was, so the mistake stays visible where it was made. */
const withMark = (cell: string, mark: "," | ".") =>
  mark === "," && isCellNumber(cell) ? cell.replace(".", ",") : cell;

/** A computed number as a draft cell: rounded to `digits`, with no trailing zeros. */
const formatCell = (value: number, digits: number, mark: "," | ".") =>
  withMark(String(Number(value.toFixed(digits))), mark);

const hasContent = (row: readonly string[]) => row.some((cell) => cell.trim() !== "");

export interface UseMeasuredRowsOptions {
  /** Decimals a computed number is rounded to on its way into a cell. Default 4. */
  digits?: number;
  /** BCP 47 tag whose decimal mark the cells are written with, else the
   *  `<UiKitProvider locale>`, else the runtime's. */
  locale?: string;
}

export interface MeasuredRows {
  /** The draft, as text — what the grid shows and edits. */
  cells: string[][];
  setCells: (next: string[][]) => void;
  /** The filled rows as numbers — EMPTY until the table is `ready`. */
  rows: number[][];
  /** Replace the whole table with computed numbers (a generated shape, say). */
  setRows: (next: number[][]) => void;
  /** At least two filled rows, and every cell in them is a number. */
  ready: boolean;
  /** How many cells are typed but are not numbers — what the grid marks invalid. */
  problems: number;
  /** Everything `MeasuredGrid` needs, so a caller spreads it in one line. */
  props: { cells: string[][]; onCells: (next: string[][]) => void };
}

/**
 * The draft a measured table is edited as.
 *
 * **Strings, not numbers.** A cell is text while it is being typed — `"-"`, `"1."` and
 * `"1e"` are all states a number passes through on its way to being one, and a grid
 * that parses on every keystroke turns each of them into a `NaN` and then into a `0`.
 * So the draft is text, and the numbers are what falls out when every cell is one.
 *
 * **"Whole" is a question this answers**, because every editor asks it before it
 * offers to save: `ready` wants at least two filled rows with a number in every cell.
 * An empty cell is a hole in the measurement, not a zero; a wholly empty row is not a
 * row at all (it is what walking off the bottom of the grid leaves behind).
 *
 * `initial` is read once, like `useState`'s.
 */
export function useMeasuredRows(
  initial: number[][] | (() => number[][]),
  options: UseMeasuredRowsOptions = {},
): MeasuredRows {
  const { digits = 4 } = options;
  const mark = decimalMark(useKitLocale(options.locale));
  const [cells, setCells] = useState<string[][]>(() =>
    (typeof initial === "function" ? initial() : initial).map((row) =>
      row.map((value) => formatCell(value, digits, mark)),
    ),
  );

  const { rows, ready, problems } = useMemo(() => {
    const filled = cells.filter(hasContent);
    const whole = filled.length >= 2 && filled.every((row) => row.every(isCellNumber));
    return {
      rows: whole ? filled.map((row) => row.map(cellNumber)) : [],
      ready: whole,
      problems: filled.flat().filter((cell) => cell.trim() !== "" && !isCellNumber(cell)).length,
    };
  }, [cells]);

  const setRows = useCallback(
    (next: number[][]) => setCells(next.map((row) => row.map((value) => formatCell(value, digits, mark)))),
    [digits, mark],
  );
  const props = useMemo(() => ({ cells, onCells: setCells }), [cells]);

  return { cells, setCells, rows, setRows, ready, problems, props };
}

export interface MeasuredGridProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onChange"> {
  /** What the table is — shown above it, and the grid's accessible name. */
  label: string;
  /** A note under the table (which columns a layout expects, say). Also the grid's
   *  description. */
  hint?: ReactNode;
  columns: MeasuredGridColumn[];
  /** The draft — typically `useMeasuredRows().props`. */
  cells: string[][];
  onCells: (next: string[][]) => void;
  /** Read-only: the cells can still be walked and read, nothing can be changed. */
  disabled?: boolean;
  /** Which views the toggle offers, the first being where it opens. Default both;
   *  one view hides the toggle. */
  views?: ReadonlyArray<MeasuredGridView>;
  /** Row height in pixels, for the windowing. Fixed on purpose. Default 28. */
  rowHeight?: number;
  /** BCP 47 tag for the decimal mark of cells written by a paste or the text view,
   *  and for the row numbers; else the `<UiKitProvider locale>`. */
  locale?: string;
  labels?: Partial<MeasuredGridLabels>;
}

/**
 * A measured table as a grid of cells, one number each, with a text view beside it.
 *
 * The grid is the primary form because a linkage typed off a drawing arrives as
 * numbers somebody reads out loud, and a textarea made that an exercise in counting
 * tab characters. The paste still works: a block pasted into any cell fills from that
 * cell outwards, growing the table to fit. The text view is kept for what a grid is
 * worst at — reading a thousand-row export back in one piece.
 *
 * **It is a grid in the APG sense**, which the Lenkbank original was not (a `<table>`
 * of inputs, fifteen tab stops per row). One tab stop — the roving tabindex — and the
 * keyboard inside it, as a spreadsheet has it:
 *
 *   - **Arrows** move between cells. Left/Right flip under `dir="rtl"`.
 *   - **Home/End** go to the first/last column; with Ctrl (or ⌘), to the first/last
 *     cell of the table. **PageUp/PageDown** move a screenful.
 *   - **Enter** (and ArrowDown) move down a column, and past the last row ADD one —
 *     typing down a column is how measured data is entered, and stopping at the last
 *     row to reach for a button is what makes people paste instead. Shift+Enter moves up.
 *   - **Typing** replaces the cell: arriving by keyboard selects its text, so the first
 *     key overwrites it. That is the edit mode data entry wants, entered without a key.
 *     **F2** edits in place instead (caret at the end). Either way the cell is then
 *     *editing*: Left/Right move the caret, and cross to the next cell only at the edge
 *     of the text; Home/End stay in the text. **Escape** puts back what the cell held
 *     when the caret arrived, and leaves editing.
 *
 * APG's grid pattern pairs Enter with F2 as the keys that start editing. Enter is
 * spent on "next row" here on purpose — it is the one key a person typing a column of
 * numbers presses between every one of them, and every spreadsheet spends it the same
 * way — and typing-to-replace makes an explicit "start editing" key unnecessary for
 * the common case. F2 remains for the uncommon one.
 */
export function MeasuredGrid({
  label,
  hint,
  columns,
  cells,
  onCells,
  disabled,
  views = ALL_VIEWS,
  rowHeight = DEFAULT_ROW_HEIGHT,
  locale: localeProp,
  labels: labelsProp,
  className,
  ...rest
}: MeasuredGridProps) {
  const labels = useKitLabels("measuredGrid", DEFAULT_MEASURED_GRID_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  const mark = decimalMark(locale);
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const keysId = `${id}-keys`;
  const offered = views.length ? views : ALL_VIEWS;
  const [chosen, setChosen] = useState<MeasuredGridView>(offered[0]);
  const view = offered.includes(chosen) ? chosen : offered[0];

  return (
    // `relative` so the keyboard description below can be `sr-only` without escaping
    // to the initial containing block (see sr-only-containment.test).
    <div {...rest} className={cn("relative", className)}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span id={labelId} className="text-[11px] font-medium text-[var(--text-muted)]">
          {label}
        </span>
        {offered.length > 1 && (
          <ToggleGroup
            className="w-auto"
            aria-label={labels.view}
            value={view}
            onChange={setChosen}
            options={offered.map((value) => ({
              value,
              label: value === "cells" ? labels.cellsView : labels.textView,
            }))}
          />
        )}
      </div>
      {view === "cells" ? (
        <CellGrid
          columns={columns}
          cells={cells}
          onCells={onCells}
          disabled={disabled}
          rowHeight={rowHeight}
          locale={locale}
          mark={mark}
          labels={labels}
          labelledBy={labelId}
          describedBy={hint ? `${keysId} ${hintId}` : keysId}
        />
      ) : (
        <TextView
          columns={columns}
          cells={cells}
          onCells={onCells}
          disabled={disabled}
          mark={mark}
          labels={labels}
          labelledBy={labelId}
          describedBy={hint ? hintId : undefined}
        />
      )}
      {hint && (
        <p id={hintId} className="mt-1 px-1 text-[11px] text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {view === "cells" && (
        <span id={keysId} className="sr-only">
          {labels.keyboardHint}
        </span>
      )}
    </div>
  );
}

/** Where the caret is. Held in state rather than read off `document`, because a
 *  windowed grid unmounts the cell being walked towards: the move is decided first and
 *  focused after the row it lands on has been rendered. */
interface Caret {
  row: number;
  column: number;
}

interface ViewProps {
  columns: MeasuredGridColumn[];
  cells: string[][];
  onCells: (next: string[][]) => void;
  disabled?: boolean;
  mark: "," | ".";
  labels: MeasuredGridLabels;
  labelledBy: string;
  describedBy?: string;
}

function CellGrid({
  columns,
  cells,
  onCells,
  disabled,
  rowHeight,
  locale,
  mark,
  labels,
  labelledBy,
  describedBy,
}: ViewProps & { rowHeight: number; locale: string | undefined }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const width = columns.length;
  const blankRow = () => columns.map(() => BLANK);
  // At least one row to type into: a grid with nothing in it has nowhere to put the
  // first number, and "add a row" is not the first thing to ask of someone who has
  // just opened an empty table. It is not written back until something is typed.
  const grid = cells.length ? cells : [blankRow()];
  const { first, last, totalHeight } = useWindowedRows(grid.length, rowHeight, scrollRef);
  const rowNumber = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  // The remove buttons are the last column of the grid, reachable by the arrows like
  // any cell — except where they are disabled (a read-only grid, or the placeholder
  // row of an empty one), because a disabled button cannot hold the tab stop.
  const removable = !disabled && cells.length > 0;
  const lastColumn = removable ? width : width - 1;

  const [caret, setCaret] = useState<Caret>({ row: 0, column: 0 });
  // Clamped on read, not corrected in an effect: rows removed or columns changed from
  // outside must never leave the tab stop on a cell that is not there.
  const at = { row: Math.min(caret.row, grid.length - 1), column: Math.min(caret.column, lastColumn) };
  /** Whether the caret cell is being edited in place (see the component note). */
  const [editing, setEditing] = useState(false);
  /** A cell that has to take focus once it exists — one commit away when the move
   *  crossed the edge of the window. `select` is arrival by keyboard. */
  const pending = useRef<(Caret & { select: boolean }) | null>(null);
  /** What the caret cell held when the caret arrived: what Escape puts back. */
  const origin = useRef(BLANK);
  /** The next focus was a pointer's: place the caret where it was clicked, edit. */
  const pointer = useRef(false);

  useEffect(() => {
    const target = pending.current;
    if (!target) return;
    const element = scrollRef.current?.querySelector<HTMLElement>(
      `[data-cell="${target.row}:${target.column}"]`,
    );
    if (!element) return;
    pending.current = null;
    // `preventScroll`: `reveal` already scrolled the row clear of the sticky header,
    // which the browser's own scroll-into-view does not know is there.
    element.focus({ preventScroll: true });
    if (target.select && element instanceof HTMLInputElement) element.select();
  });

  const pad = (row: readonly string[] | undefined) =>
    Array.from({ length: width }, (_, index) => row?.[index] ?? BLANK);

  const setCell = (row: number, column: number, value: string) => {
    const next = grid.map(pad);
    next[row][column] = value;
    onCells(next);
  };

  /** Scroll `row` into the band below the sticky header. */
  const reveal = (row: number) => {
    const element = scrollRef.current;
    if (!element) return;
    const room = element.clientHeight - (headRef.current?.offsetHeight ?? 0);
    if (room <= 0) return;
    const top = row * rowHeight;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (top + rowHeight > element.scrollTop + room) element.scrollTop = top + rowHeight - room;
  };

  const focusCell = (row: number, column: number) => {
    reveal(row);
    pending.current = { row, column, select: true };
    setCaret({ row, column });
    setEditing(false);
  };

  const go = (row: number, column: number) => {
    const target = {
      row: Math.max(0, Math.min(row, grid.length - 1)),
      column: Math.max(0, Math.min(column, lastColumn)),
    };
    if (target.row === at.row && target.column === at.column) return;
    focusCell(target.row, target.column);
  };

  /** Down a column — and off the bottom, a new row, unless the last one is still
   *  empty: holding ArrowDown should not leave a trail of blank rows behind it. */
  const down = (row: number, column: number) => {
    if (row + 1 < grid.length) return go(row + 1, column);
    if (disabled || !hasContent(grid[row])) return;
    onCells([...grid.map(pad), blankRow()]);
    focusCell(row + 1, Math.min(column, width - 1));
  };

  const page = () => {
    const element = scrollRef.current;
    const room = element ? element.clientHeight - (headRef.current?.offsetHeight ?? 0) : 0;
    // No layout (a hidden pane, jsdom): a fixed ten rather than one row at a time.
    return room > 0 ? Math.max(1, Math.floor(room / rowHeight) - 1) : 10;
  };

  /**
   * On each cell rather than once on the grid, for the reason `MiniCalendar` gives:
   * the cell is where focus is, and a container listening for keys it cannot receive
   * is the shape `jsx-a11y/interactive-supports-focus` objects to.
   */
  const onCellKeyDown = (event: KeyboardEvent<HTMLElement>, row: number, column: number) => {
    const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : null;
    const inText = Boolean(input) && editing;
    const modified = event.ctrlKey || event.metaKey;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        return go(row - 1, column);
      case "ArrowDown":
        event.preventDefault();
        return down(row, column);
      case "Enter":
        // On the remove button Enter is the button's own.
        if (!input) return;
        event.preventDefault();
        return event.shiftKey ? go(row - 1, column) : down(row, column);
      case "ArrowLeft":
      case "ArrowRight": {
        // Along the reading direction: ArrowLeft is "next column" in RTL.
        const forward = horizontalStep(event.key, event.currentTarget) === 1;
        if (inText && input) {
          const edge = forward ? input.value.length : 0;
          // Inside the text the caret moves; only at its edge does it leave the cell.
          if (input.selectionStart !== edge || input.selectionEnd !== edge) return;
        }
        event.preventDefault();
        return go(row, column + (forward ? 1 : -1));
      }
      case "Home":
      case "End": {
        if (inText && !modified) return;
        event.preventDefault();
        const home = event.key === "Home";
        if (modified) return go(home ? 0 : grid.length - 1, home ? 0 : width - 1);
        return go(row, home ? 0 : width - 1);
      }
      case "PageUp":
        event.preventDefault();
        return go(row - page(), column);
      case "PageDown":
        event.preventDefault();
        return go(row + page(), column);
      case "F2":
        if (!input || disabled) return;
        event.preventDefault();
        setEditing(true);
        input.setSelectionRange(input.value.length, input.value.length);
        return;
      case "Escape":
        // Not editing: nothing of ours to undo, so the key belongs to whatever the
        // grid sits in — the dialog it is in closes, as it should.
        if (!input || !editing) return;
        event.preventDefault();
        event.stopPropagation();
        if (input.value !== origin.current) setCell(row, column, origin.current);
        pending.current = { row, column, select: true };
        setEditing(false);
        return;
    }
  };

  /**
   * A pasted block, written in from the cell it was pasted into.
   *
   * Rows past the end grow the table; columns past the last are dropped, because a
   * paste wider than the measurement is a paste with a trailing timestamp column and
   * not an error worth refusing. One header line is skipped — pasted data almost
   * always has one. Each line is read on its own evidence (`splitRow`, the per-line
   * comma rule), so one line cannot change what another means.
   */
  const paste = (row: number, column: number, text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (!lines.length) return;
    const block = lines.map(splitRow);
    if (block.length > 1 && block[0].some((cell) => !isCellNumber(cell))) block.shift();

    const height = Math.max(grid.length, row + block.length);
    const next = Array.from({ length: height }, (_, index) => pad(grid[index]));
    block.forEach((line, downwards) => {
      line.forEach((cell, across) => {
        const target = column + across;
        if (target < width) next[row + downwards][target] = withMark(cell.trim(), mark);
      });
    });
    onCells(next);
    pending.current = { row, column, select: true };
    setEditing(false);
  };

  const template = `2.5rem repeat(${width}, minmax(5.5rem, 1fr)) 2rem`;
  // The caret's row is mounted even when it has been scrolled out of the window: it
  // holds the grid's only tab stop, and a tab stop that is not in the DOM is a grid
  // Tab walks straight past.
  const mounted: number[] = [];
  for (let index = first; index < last; index += 1) mounted.push(index);
  if (at.row < first || at.row >= last) mounted.push(at.row);

  const filled = cells.filter(hasContent);
  const problems = filled.flat().filter((cell) => cell.trim() !== "" && !isCellNumber(cell)).length;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)]">
      <div ref={scrollRef} className="max-h-72 overflow-auto">
        <div
          role="grid"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          // The true size, not the mounted one: a screen reader otherwise reports the
          // thirty rows in the window as the whole table.
          aria-rowcount={grid.length + 1}
          aria-colcount={width + 2}
          aria-readonly={disabled || undefined}
          className="text-xs"
          style={{ minWidth: `calc(4.5rem + ${width} * 5.5rem)` }}
        >
          {/* The header stays put vertically and scrolls sideways with the body, so a
              fifteen-column linkage can be read without losing which column is which. */}
          <div ref={headRef} role="rowgroup" className="sticky top-0 z-10 bg-[var(--bg-surface-2)]">
            <div
              role="row"
              aria-rowindex={1}
              className="grid border-b border-[var(--border)]"
              style={{ gridTemplateColumns: template }}
            >
              <div
                role="columnheader"
                aria-label={labels.rowNumber}
                className="flex items-end justify-end px-1 py-1 text-[10px] text-[var(--text-placeholder)]"
              >
                #
              </div>
              {columns.map((column, index) => (
                <div
                  key={index}
                  role="columnheader"
                  className="min-w-0 border-s border-[var(--border)] px-2 py-1 text-end"
                >
                  <span className="block truncate font-medium text-[var(--text-primary)]">
                    {column.label}
                  </span>
                  {column.unit && (
                    <span className="block truncate text-[10px] text-[var(--text-muted)]">
                      {column.unit}
                    </span>
                  )}
                </div>
              ))}
              <div
                role="columnheader"
                aria-label={labels.rowActions}
                className="border-s border-[var(--border)]"
              />
            </div>
          </div>
          {/* Only the rows in the window are mounted — a swept linkage is thousands of
              them across fifteen inputs — each placed at its own offset, so mounting
              one more (the caret's) costs nothing in the arithmetic. */}
          <div role="rowgroup" className="relative" style={{ height: totalHeight }}>
            {mounted.map((index) => {
              const row = grid[index];
              return (
                <div
                  key={index}
                  role="row"
                  aria-rowindex={index + 2}
                  className="absolute inset-x-0 grid hover:bg-[var(--bg-hover)]"
                  style={{ top: index * rowHeight, height: rowHeight, gridTemplateColumns: template }}
                >
                  <div
                    role="rowheader"
                    className="flex items-center justify-end px-1 text-[10px] tabular-nums text-[var(--text-placeholder)]"
                  >
                    {rowNumber.format(index + 1)}
                  </div>
                  {columns.map((column, columnIndex) => {
                    const value = row[columnIndex] ?? BLANK;
                    const bad = value.trim() !== "" && !isCellNumber(value);
                    const isCaret = at.row === index && at.column === columnIndex;
                    return (
                      <div key={columnIndex} role="gridcell" className="min-w-0 border-s border-[var(--border)]">
                        <input
                          data-cell={`${index}:${columnIndex}`}
                          value={value}
                          // `readOnly`, not `disabled`: a disabled input cannot take
                          // focus, and a read-only table should still be walkable.
                          readOnly={disabled}
                          tabIndex={isCaret ? 0 : -1}
                          inputMode="decimal"
                          spellCheck={false}
                          autoComplete="off"
                          aria-label={labels.cell(column.label, index + 1)}
                          // Said, not only painted: the ring is what a sighted user
                          // sees, `aria-invalid` is what a screen reader reads.
                          aria-invalid={bad || undefined}
                          className={cn(
                            "block size-full bg-transparent px-2 text-end tabular-nums text-[var(--text-primary)] outline-none",
                            // Arriving selects the text (typing replaces it); editing
                            // in place is the plain surface with a caret in it.
                            "focus:bg-[var(--brand-bg)] focus:ring-2 focus:ring-inset focus:ring-[var(--brand)]",
                            isCaret && editing && "focus:bg-[var(--bg-surface)]",
                            disabled && "text-[var(--text-muted)]",
                            bad && cn(FIELD_INVALID, "ring-inset"),
                          )}
                          onMouseDown={(event) => {
                            // A click places a caret, which is editing. On the cell
                            // already focused there is no focus event to say so.
                            if (document.activeElement === event.currentTarget) setEditing(!disabled);
                            else pointer.current = true;
                          }}
                          onFocus={(event) => {
                            origin.current = event.currentTarget.value;
                            if (!isCaret) setCaret({ row: index, column: columnIndex });
                            const byPointer = pointer.current;
                            pointer.current = false;
                            setEditing(byPointer && !disabled);
                            if (!byPointer) event.currentTarget.select();
                          }}
                          onBlur={() => setEditing(false)}
                          onChange={(event) => {
                            setCell(index, columnIndex, event.target.value);
                            setEditing(true);
                          }}
                          onPaste={(event) => {
                            if (disabled) return;
                            const text = event.clipboardData.getData("text/plain");
                            // One cell's worth of text is an ordinary paste, and the
                            // browser does it better than this would; only a block is
                            // the grid's business.
                            if (!/[\t\n;]/.test(text)) return;
                            event.preventDefault();
                            paste(index, columnIndex, text);
                          }}
                          onKeyDown={(event) => onCellKeyDown(event, index, columnIndex)}
                        />
                      </div>
                    );
                  })}
                  <div
                    role="gridcell"
                    className="flex items-center justify-center border-s border-[var(--border)]"
                  >
                    <button
                      type="button"
                      data-cell={`${index}:${width}`}
                      disabled={!removable}
                      tabIndex={at.row === index && at.column === width ? 0 : -1}
                      aria-label={labels.removeRow(index + 1)}
                      className="rounded p-1 text-[var(--text-placeholder)] outline-none hover:text-[var(--danger)] focus-visible:ring-2 focus-visible:ring-[var(--brand)] disabled:cursor-default disabled:hover:text-[var(--text-placeholder)]"
                      onKeyDown={(event) => onCellKeyDown(event, index, width)}
                      onFocus={() => {
                        if (at.row !== index || at.column !== width) setCaret({ row: index, column: width });
                      }}
                      onClick={() => {
                        const next = grid.filter((_, other) => other !== index);
                        onCells(next);
                        // Focus stays in the column, on the row that moved up into
                        // this one; an emptied table sends it to the first cell.
                        if (next.length) focusCell(Math.min(index, next.length - 1), width);
                        else focusCell(0, 0);
                      }}
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--border)] px-2 py-1.5">
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs"
          disabled={disabled}
          onClick={() => {
            onCells([...grid.map(pad), blankRow()]);
            focusCell(grid.length, 0);
          }}
        >
          <Plus aria-hidden className="size-3.5" /> {labels.addRow}
        </Button>
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs text-[var(--text-muted)]"
          disabled={disabled || !cells.length}
          onClick={() => {
            onCells([]);
            // The button is about to disable itself; focus must not go down with it.
            focusCell(0, 0);
          }}
        >
          <Eraser aria-hidden className="size-3.5" /> {labels.clear}
        </Button>
        <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
          {labels.points(filled.length)}
        </span>
        {problems > 0 && (
          <span className="text-[11px] text-[var(--danger)]">{labels.problems(problems)}</span>
        )}
        <span className="ms-auto flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
          <ClipboardPaste aria-hidden className="size-3.5" /> {labels.pasteHint}
        </span>
      </div>
    </div>
  );
}

const textOf = (cells: string[][]) => cells.map((row) => row.join("\t")).join("\n");

/**
 * The same table as text.
 *
 * Kept because the grid is worst at exactly what a textarea is best at: reading a long
 * export back in one piece. It commits on blur — through `parseRows`, the paste door —
 * and a line it cannot read is NAMED rather than dropped: half a sweep saved as a
 * measurement is worse than a refusal.
 */
function TextView({ columns, cells, onCells, disabled, mark, labels, labelledBy, describedBy }: ViewProps) {
  const text = textOf(cells);
  const [draft, setDraft] = useState(text);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  // Follow the table when it changes from outside (a generated shape, a cleared form).
  // Compared as text, so a caller that rebuilds the same cells every render does not
  // wipe what is being typed.
  const [seen, setSeen] = useState(text);
  if (seen !== text) {
    setSeen(text);
    setDraft(text);
    setErrorLine(null);
  }

  const commit = () => {
    // Untouched: nothing to read back, and re-reading would rewrite every cell in the
    // lexer's spelling of it.
    if (draft === text) return;
    if (!draft.trim()) {
      setErrorLine(null);
      onCells([]);
      return;
    }
    const parsed = parseRows(draft, columns.length);
    if ("error" in parsed) {
      setErrorLine(parsed.error);
      return;
    }
    setErrorLine(null);
    onCells(parsed.rows.map((row) => row.map((value) => withMark(String(value), mark))));
  };

  const lines = draft.split("\n").filter((line) => line.trim()).length;

  return (
    <div>
      <Textarea
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        rows={10}
        value={draft}
        readOnly={disabled}
        spellCheck={false}
        className="font-mono text-xs"
        error={errorLine !== null ? labels.lineError(errorLine) : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
      />
      <p className="mt-1 px-1 text-[11px] text-[var(--text-muted)]">
        {columns.map((column) => column.label).join(" · ")}
        {" — "}
        {labels.points(lines)}
      </p>
    </div>
  );
}
