import { Children, createContext, useContext, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { THIN_SCROLLBAR_CLASS, useScrollOverflow } from "./scroll-area";

/** `none` (0.10.0): no cell padding at all — keksdose's VAT summary, a table set
 *  inside a card's own padding whose columns are spaced by hand (`pl-2` on exactly the
 *  columns that need it). Type stays at the body size, as `comfortable`. */
export type TableDensity = "comfortable" | "compact" | "none";
/** CSS `table-layout`. `auto` (the browser default) sizes columns to their content;
 *  `fixed` takes widths from the first row and ignores the rest — keksdose's VAT
 *  summary switches to it while editing so two inputs stop bidding against the
 *  figures for room. */
export type TableLayout = "auto" | "fixed";
export type TableAlign = "start" | "center" | "end";

interface TableContextValue {
  density: TableDensity;
  zebra: boolean;
  hover: boolean;
  captionId: string;
  registerCaption: () => () => void;
}

const TableContext = createContext<TableContextValue>({
  density: "comfortable",
  zebra: false,
  hover: false,
  captionId: "",
  registerCaption: () => () => {},
});

/** Which section a row sits in — zebra and hover apply to body rows only. */
const SectionContext = createContext<"head" | "body" | "foot">("body");

const CELL_PAD: Record<TableDensity, string> = {
  comfortable: "px-3 py-2",
  compact: "px-2 py-1",
  none: "p-0",
};

const ALIGN: Record<TableAlign, string> = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
};

/**
 * The alignment a figure column wants: end-aligned (so the units line up under each
 * other in either reading direction) with tabular digits (so they line up at all).
 * Exported for a cell the kit did not render — a DataTable column, a `<td>` of the
 * app's own.
 */
export const NUMERIC_CELL_CLASS = "text-end tabular-nums";

export interface TableProps extends ComponentPropsWithoutRef<"table"> {
  /** `compact` for a dense detail view (a ledger, a spec sheet). */
  density?: TableDensity;
  /** Tint every other body row. */
  zebra?: boolean;
  /** Tint the body row under the pointer. Off by default: a static table whose rows
   *  light up promises a click that does nothing. */
  hover?: boolean;
  /** Classes for the overflow wrapper around the `<table>` (a max-height, a border). */
  wrapperClassName?: string;
  /** See {@link TableLayout}. Unset leaves the browser's `auto` and adds no class. */
  layout?: TableLayout;
}

/**
 * A plain, static HTML table in the kit's tokens — for the detail views that need
 * rows and columns and none of {@link DataTable}'s sorting, filtering or paging.
 *
 * kastlan renders about twenty of these on shadcn's Table parts; the part names here
 * are the same idea (`TableHead` is the `<thead>`, `TableHeaderCell` the `<th>`), so
 * the move is a rename rather than a rewrite.
 *
 * The table sits in an overflow-x wrapper, because a table cannot shrink below its
 * content and on a phone it would otherwise widen the page. While it overflows that
 * wrapper becomes a tab stop and a `role="region"` named by the `TableCaption` (or the
 * table's own `aria-label`), so a keyboard user can scroll it and a reader can say
 * what it is — the same contract as {@link ScrollArea}.
 *
 * Alignment is logical throughout (`text-start` / `text-end`), so a right-to-left
 * page gets its first column on the right without a class changing.
 */
export function Table({
  density = "comfortable",
  zebra = false,
  hover = false,
  wrapperClassName,
  layout,
  className,
  "aria-label": ariaLabel,
  ...rest
}: TableProps) {
  const captionId = useId();
  const [captions, setCaptions] = useState(0);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const overflowing = useScrollOverflow(wrapper);

  const ctx = useMemo<TableContextValue>(
    () => ({
      density,
      zebra,
      hover,
      captionId,
      registerCaption: () => {
        setCaptions((n) => n + 1);
        return () => setCaptions((n) => n - 1);
      },
    }),
    [density, zebra, hover, captionId],
  );

  const regionName = captions > 0 ? { "aria-labelledby": captionId } : ariaLabel ? { "aria-label": ariaLabel } : null;

  return (
    <TableContext.Provider value={ctx}>
      <div
        ref={wrapper}
        // Only a region when it scrolls AND has a name: a landmark for every short
        // table on a page would bury the real ones.
        role={overflowing && regionName ? "region" : undefined}
        {...(overflowing ? regionName : null)}
        tabIndex={overflowing ? 0 : undefined}
        data-overflowing={overflowing || undefined}
        className={cn(
          // `relative`: the containing block for an `sr-only` caption.
          "relative w-full overflow-x-auto",
          THIN_SCROLLBAR_CLASS,
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand)]",
          wrapperClassName,
        )}
      >
        <table
          {...rest}
          aria-label={ariaLabel}
          className={cn(
            "w-full caption-bottom border-collapse text-sm text-[var(--text-primary)]",
            density === "compact" && "text-xs",
            layout === "fixed" && "table-fixed",
            layout === "auto" && "table-auto",
            className,
          )}
        />
      </div>
    </TableContext.Provider>
  );
}

export type TableHeadProps = ComponentPropsWithoutRef<"thead">;

export function TableHead({ className, ...rest }: TableHeadProps) {
  return (
    <SectionContext.Provider value="head">
      <thead {...rest} className={cn("border-b border-[var(--border)]", className)} />
    </SectionContext.Provider>
  );
}

export interface TableBodyProps extends ComponentPropsWithoutRef<"tbody"> {
  /**
   * Shown as ONE full-width row (a {@link TableEmpty}) when the body has no rows —
   * `children` that render nothing: an empty `.map`, a `false`, `null`. kastlan hand-
   * writes that row with a counted `colSpan` in unit-values-editor, the meeting agenda
   * and invitations tabs, the journal-entry and invoice detail pages, and a column
   * added later leaves every one of those counts one short.
   */
  empty?: ReactNode;
}

export function TableBody({ className, empty, children, ...rest }: TableBodyProps) {
  // `toArray` drops null/undefined/booleans and flattens arrays, so `[[], false]` —
  // an empty map beside a conditional row that is off — is no rows.
  const hasRows = Children.toArray(children).length > 0;
  return (
    <SectionContext.Provider value="body">
      <tbody {...rest} className={cn("[&>tr:last-child]:border-b-0", className)}>
        {hasRows || empty === undefined || empty === null || empty === false ? (
          children
        ) : (
          <TableEmpty>{empty}</TableEmpty>
        )}
      </tbody>
    </SectionContext.Provider>
  );
}

export interface TableEmptyProps extends Omit<ComponentPropsWithoutRef<"tr">, "children"> {
  children: ReactNode;
  /** Columns to span. Default: MEASURED — the widest row of the table it renders in,
   *  counted after mount, so the row stays full width when a column is added. */
  colSpan?: number;
  /** Classes for the `<td>`. */
  cellClassName?: string;
}

/**
 * The "nothing here" row: one cell across every column, centred, muted. What
 * {@link TableBodyProps.empty} renders, and usable on its own for a body whose rows
 * are not its direct children.
 */
export function TableEmpty({ children, colSpan, cellClassName, className, ...rest }: TableEmptyProps) {
  const { density } = useContext(TableContext);
  const cell = useRef<HTMLTableCellElement | null>(null);
  const [measured, setMeasured] = useState(1);
  // Every render, deliberately: a column can appear in the head without anything this
  // row depends on changing. It cannot loop — setting the same count is a bail-out.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (colSpan !== undefined) return;
    const row = cell.current?.parentElement;
    const table = cell.current?.closest("table");
    if (!row || !table) return;
    let widest = 1;
    for (const r of Array.from(table.rows)) {
      if (r === row) continue;
      let n = 0;
      for (const c of Array.from(r.cells)) n += c.colSpan || 1;
      widest = Math.max(widest, n);
    }
    setMeasured(widest);
  });
  return (
    <tr {...rest} data-table-empty="" className={className}>
      <td
        ref={cell}
        colSpan={colSpan ?? measured}
        className={cn(
          // `none` keeps the message off the edges regardless: it is text, not a figure.
          density === "none" ? "py-2" : CELL_PAD[density],
          "text-center text-[var(--text-muted)]",
          cellClassName,
        )}
      >
        {children}
      </td>
    </tr>
  );
}

export type TableFootProps = ComponentPropsWithoutRef<"tfoot">;

/** The totals row. Not in the brief, but every ledger view has one and a `<tfoot>`
 *  is what tells a reader it is a total rather than one more row. */
export function TableFoot({ className, ...rest }: TableFootProps) {
  return (
    <SectionContext.Provider value="foot">
      <tfoot {...rest} className={cn("border-t border-[var(--border-strong)] font-medium", className)} />
    </SectionContext.Provider>
  );
}

export type TableRowProps = ComponentPropsWithoutRef<"tr">;

export function TableRow({ className, ...rest }: TableRowProps) {
  const { zebra, hover } = useContext(TableContext);
  const section = useContext(SectionContext);
  const body = section === "body";
  return (
    <tr
      {...rest}
      className={cn(
        body && "border-b border-[var(--border)]",
        body && zebra && "even:bg-[var(--bg-surface-2)]",
        body && hover && "transition-colors hover:bg-[var(--bg-hover)]",
        className,
      )}
    />
  );
}

interface CellAlignProps {
  /** Shorthand for a figure column: end-aligned, tabular digits. */
  numeric?: boolean;
  /** Logical alignment. Default `start` (`end` when `numeric`). */
  align?: TableAlign;
}

/** The deprecated HTML `align` attribute is replaced by a logical one. */
export interface TableHeaderCellProps extends Omit<ComponentPropsWithoutRef<"th">, "align">, CellAlignProps {}

/**
 * A `<th>`. `scope` defaults to `col` in the head and `row` in the body — a header
 * cell in a body row is the row's label ("Net rent" in a key-value table), and a
 * reader needs the scope to read it with each cell beside it.
 */
export function TableHeaderCell({ numeric = false, align, scope, className, ...rest }: TableHeaderCellProps) {
  const { density } = useContext(TableContext);
  const section = useContext(SectionContext);
  return (
    <th
      {...rest}
      scope={scope ?? (section === "head" ? "col" : "row")}
      className={cn(
        CELL_PAD[density],
        ALIGN[align ?? (numeric ? "end" : "start")],
        numeric && "tabular-nums",
        "align-bottom font-medium",
        section === "head" ? "text-xs text-[var(--text-muted)]" : "align-top text-[var(--text-secondary)]",
        className,
      )}
    />
  );
}

export interface TableCellProps extends Omit<ComponentPropsWithoutRef<"td">, "align">, CellAlignProps {}

export function TableCell({ numeric = false, align, className, ...rest }: TableCellProps) {
  const { density } = useContext(TableContext);
  return (
    <td
      {...rest}
      className={cn(
        CELL_PAD[density],
        "align-top",
        ALIGN[align ?? (numeric ? "end" : "start")],
        numeric && "tabular-nums whitespace-nowrap",
        className,
      )}
    />
  );
}

export type TableCaptionProps = ComponentPropsWithoutRef<"caption">;

/**
 * The table's title. Beneath the table by default (`caption-bottom`, the shadcn
 * convention kastlan's views already follow); `className="caption-top"` moves it.
 * `className="sr-only"` keeps it for readers only — the wrapper is `relative`, so
 * the hidden caption stays inside it.
 *
 * It also names the scroll region when the table overflows: it registers itself
 * with the {@link Table} so the wrapper points at an id that exists, and never at
 * one that does not.
 */
export function TableCaption({ className, id, ...rest }: TableCaptionProps) {
  const { captionId, registerCaption } = useContext(TableContext);
  useLayoutEffect(() => (id ? undefined : registerCaption()), [id, registerCaption]);
  return (
    <caption
      {...rest}
      id={id ?? captionId}
      className={cn("mt-2 text-start text-sm text-[var(--text-muted)]", className)}
    />
  );
}
