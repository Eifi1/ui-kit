import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, KeyboardEvent, Key, ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { Button, IconButton } from "./ui";

/** The words {@link LineItems} renders on its own behalf. Row numbers are 1-based. */
export interface LineItemsLabels {
  /** The dashed add button. */
  add: string;
  /** The remove button's name for one row. */
  remove: (row: number) => string;
  /** Its name while it waits for the second press (`confirmRemove`). */
  confirmRemove: (row: number) => string;
  /** A row's group name, when the caller gives no `rowLabel`. */
  row: (row: number) => string;
  /** The name a cell's field should carry: the column, and which row. */
  cell: (column: string, row: number) => string;
  /** The totals row's label, and its group name. */
  totals: string;
}

export const DEFAULT_LINE_ITEMS_LABELS: LineItemsLabels = {
  add: "Add row",
  remove: (row) => `Remove row ${row}`,
  confirmRemove: (row) => `Remove row ${row}? Press again to confirm`,
  row: (row) => `Row ${row}`,
  cell: (column, row) => `${column}, row ${row}`,
  totals: "Total",
};

/** What a column's `render` receives for one row. */
export interface LineItemCellContext<T> {
  item: T;
  /** 0-based. */
  index: number;
  /** The accessible name for the cell's field — "Debit, row 2". The header is
   *  hidden from assistive tech (each row repeats it), so the field has to carry it:
   *  `<Input aria-label={label} … />`. */
  label: string;
  /** The column's own name ("Debit") for the field's VISIBLE label — set only when the
   *  cell's labels are `"floating"` (see {@link LineItemsProps.fieldLabels}), so one
   *  render serves both modes: `<Input label={fieldLabel} aria-label={label} … />`.
   *  Undefined there, the Input stays a bare compact control; set, it floats "Debit"
   *  while `aria-label` still says which row. */
  fieldLabel?: string;
}

/** How a cell's field is labelled. `aria`: the field is a bare control named by
 *  `aria-label`, under a header row (stacked: a small copy of the header over it).
 *  `floating`: the field shows its own floating label ({@link LineItemCellContext.fieldLabel}),
 *  so the list draws no header for it. */
export type LineItemsFieldLabels = "aria" | "floating";

/** The colour of a {@link LineItemsSummary}'s value. */
export type LineItemsSummaryTone = "neutral" | "success" | "danger" | "muted";

/**
 * A line under the lines that says where they stand — a split's remainder ("Left to
 * assign  CHF 0.00", green at zero, red otherwise, muted while the total is not known
 * yet), with an optional action that settles it ("Set amount to total").
 */
export interface LineItemsSummary {
  label: ReactNode;
  value?: ReactNode;
  /** The value's colour. Default `neutral`. The label stays neutral: the colour is a
   *  second signal, never the only one — the value and label carry the meaning. */
  tone?: LineItemsSummaryTone;
  /** A small button at the end of the line. Disabled along with the list's
   *  `disabled`. */
  action?: { label: ReactNode; onClick: () => void; disabled?: boolean };
}

export interface LineItemsColumn<T> {
  /** Stable id: the React key, and the key into `totals`. */
  key: string;
  /** The column header (and the small label over the cell once the rows stack). */
  header: ReactNode;
  /** The column's name for {@link LineItemCellContext.label}, when `header` is not a
   *  string. */
  label?: string;
  /** The grid track once the rows are wide enough to be a table. Default
   *  `minmax(0,1fr)`; `"7rem"` for an amount. */
  width?: string;
  /** `end` for figures: the header and the totals cell end-align with the field. */
  align?: "start" | "end";
  /** This column's labelling, over the list's {@link LineItemsProps.fieldLabels} — a
   *  read-only "Sum" cell in a floating list keeps its header with `"aria"`. */
  fieldLabels?: LineItemsFieldLabels;
  /** With {@link LineItemsProps.narrowColumns} `2`: `2` gives the cell a whole row of
   *  the stacked card (a description), where short fields pair up two to a row.
   *  Default `1`. No effect on the wide grid. */
  narrowSpan?: 1 | 2;
  render: (ctx: LineItemCellContext<T>) => ReactNode;
}

export interface LineItemsProps<T> extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  items: readonly T[];
  columns: readonly LineItemsColumn<T>[];
  /** The row's React key. Default: the item's `id` (react-hook-form's `useFieldArray`
   *  `fields` carry one), else its index. */
  getKey?: (item: T, index: number) => Key;
  /** Append a row. Omitted: no add button. The first field of the new row is focused. */
  onAdd?: () => void;
  /** Remove the row at `index`. Omitted: no remove buttons. */
  onRemove?: (index: number) => void;
  /** Remove is disabled at or below this many rows (a journal entry needs two).
   *  Default 0. */
  minItems?: number;
  /** Add is disabled at this many rows. */
  maxItems?: number;
  /**
   * Ask before a row goes:
   *  - `true`: the remove button asks for a second press — it fills red and its name
   *    becomes `lineItems.confirmRemove`; Escape, or leaving it, calls it off.
   *  - a function: called with the row, and the row goes only if it answers `true`
   *    (`(item, i) => confirm({ title: … , tone: "danger" })` with `useConfirm`).
   */
  confirmRemove?: boolean | ((item: T, index: number) => boolean | Promise<boolean>);
  /** The add button's text. Default `lineItems.add`. */
  addLabel?: ReactNode;
  /** A row's group name ("Line 2"). Default `lineItems.row`. */
  rowLabel?: (index: number, item: T) => string;
  /** A totals row under the lines, one entry per column `key`. The first column
   *  without an entry carries {@link totalsLabel}. Omitted: no totals row. */
  totals?: Partial<Record<string, ReactNode>>;
  /** Default `lineItems.totals`, "Total". */
  totalsLabel?: ReactNode;
  /** Shown in place of the rows when there are none. */
  empty?: ReactNode;
  /** A message about the list as a whole ("The entry does not balance"). */
  error?: ReactNode;
  /** A line under the lines and totals — the remainder of a split, say. See
   *  {@link LineItemsSummary}. */
  summary?: LineItemsSummary;
  /** How the cells' fields are labelled. Default `aria` (compact bare controls under a
   *  header row); `floating` hands each cell its column's name as
   *  {@link LineItemCellContext.fieldLabel} for a visible floating label, and drops the
   *  header for those columns. A column's own `fieldLabels` wins. */
  fieldLabels?: LineItemsFieldLabels;
  /** Stacked (a narrow pane), how many fields share a row of a line's card: `2` pairs
   *  them up (a column's `narrowSpan={2}` takes a whole row), once the pane is wide
   *  enough for two fields (18rem); narrower still, one. Default `1`. */
  narrowColumns?: 1 | 2;
  /** Disables add and remove (the fields are the caller's to disable). */
  disabled?: boolean;
  labels?: Partial<LineItemsLabels>;
}

const REMOVE_TRACK = "2.25rem";
const SUMMARY_TONE: Record<LineItemsSummaryTone, string> = {
  neutral: "text-[var(--text-primary)]",
  success: "text-[var(--success)]",
  danger: "text-[var(--danger)]",
  muted: "text-[var(--text-muted)]",
};
const FOCUSABLE =
  "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])";

function defaultKey(item: unknown, index: number): Key {
  if (typeof item === "object" && item !== null && "id" in item) {
    const id = (item as { id: unknown }).id;
    if (typeof id === "string" || typeof id === "number") return id;
  }
  return index;
}

function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

type PendingFocus = { kind: "added" } | { kind: "removed"; index: number };

/**
 * An editable list of lines — journal entry lines, lease components, invoice
 * positions, budget rows: column headers, a row of fields per item, a remove button
 * per row, a dashed "add" button under them, and an optional totals row.
 *
 * Presentation only: the rows are the caller's `items` and the fields are the
 * caller's, rendered per column. So it works over plain state —
 *
 * ```tsx
 * <LineItems items={lines} columns={cols} onAdd={() => setLines([...lines, blank()])}
 *   onRemove={(i) => setLines(lines.filter((_, j) => j !== i))} minItems={2} />
 * ```
 *
 * — and over react-hook-form's `useFieldArray` alike (`items={fields}`, `onAdd={() =>
 * append(blank())}`, `onRemove={remove}`), for which `@eifi1/ui-kit/rhf` has
 * `RhfLineItems`.
 *
 * On a wide pane the rows are a grid under the headers; on a narrow one (a container
 * query, so a dialog stacks where it is cramped) each row stacks its fields, each
 * under a small copy of its header. The headers are `aria-hidden`: every row is a
 * named group and every field is named by `render`'s `label` ("Debit, row 2"), which
 * is what a screen reader needs — a header row it would read once, out of context.
 *
 * Keyboard: after Add, focus lands in the new row's first field; after a remove, on
 * the row that took its place (else the add button). Ctrl/⌘+Enter in any row adds a
 * row.
 */
export function LineItems<T>({
  items,
  columns,
  getKey = defaultKey,
  onAdd,
  onRemove,
  minItems = 0,
  maxItems,
  confirmRemove,
  addLabel,
  rowLabel,
  totals,
  totalsLabel,
  empty,
  error,
  summary,
  fieldLabels = "aria",
  narrowColumns = 1,
  disabled = false,
  labels: labelsProp,
  className,
  style,
  ...rest
}: LineItemsProps<T>) {
  const labels = useKitLabels("lineItems", DEFAULT_LINE_ITEMS_LABELS, labelsProp);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const addRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<PendingFocus | null>(null);
  const [confirmingAt, setConfirming] = useState<number | null>(null);
  // A confirm waiting on a row that has since gone is void.
  const confirming = confirmingAt !== null && confirmingAt < items.length ? confirmingAt : null;

  const tracks = [...columns.map((c) => c.width ?? "minmax(0,1fr)"), ...(onRemove ? [REMOVE_TRACK] : [])];
  const gridStyle = { "--line-items-cols": tracks.join(" ") } as CSSProperties;
  const canAdd = Boolean(onAdd) && !disabled && (maxItems === undefined || items.length < maxItems);
  const canRemove = Boolean(onRemove) && !disabled && items.length > minItems;
  const hasError = hasContent(error);


  // Focus after the list has re-rendered with the new rows — a layout effect, so the
  // caret is where it belongs before paint.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    if (pending.kind === "added") {
      const row = rowRefs.current[items.length - 1];
      row?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      return;
    }
    const row = rowRefs.current[Math.min(pending.index, items.length - 1)];
    const target =
      row?.querySelector<HTMLElement>("[data-line-items-remove]:not([disabled])") ??
      row?.querySelector<HTMLElement>(FOCUSABLE) ??
      addRef.current;
    target?.focus();
  }, [items.length]);

  const add = useCallback(() => {
    if (!canAdd || !onAdd) return;
    pendingFocus.current = { kind: "added" };
    onAdd();
  }, [canAdd, onAdd]);

  const removeAt = async (index: number) => {
    if (!canRemove || !onRemove) return;
    if (confirmRemove === true && confirming !== index) {
      setConfirming(index);
      return;
    }
    if (typeof confirmRemove === "function") {
      const ok = await confirmRemove(items[index], index);
      if (!ok) return;
    }
    setConfirming(null);
    pendingFocus.current = { kind: "removed", index };
    onRemove(index);
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && canAdd) {
      e.preventDefault();
      add();
    }
  };

  const columnName = (column: LineItemsColumn<T>) =>
    column.label ?? (typeof column.header === "string" ? column.header : column.key);
  const floats = (column: LineItemsColumn<T>) => (column.fieldLabels ?? fieldLabels) === "floating";
  // A header row only for the columns that still need one: with every field floating
  // its own label, a row of headers would say each name twice.
  const showHeader = columns.some((c) => !floats(c));
  const pairs = narrowColumns === 2;

  const headerCell = (column: LineItemsColumn<T>) => (
    <span
      key={column.key}
      className={cn(
        "min-w-0 truncate text-xs font-medium text-[var(--text-muted)]",
        column.align === "end" && "text-end",
      )}
    >
      {floats(column) ? null : column.header}
    </span>
  );

  const showTotals = totals !== undefined;
  const labelColumn = showTotals ? columns.find((c) => !hasContent(totals[c.key]))?.key : undefined;

  return (
    <div
      data-slot="line-items"
      {...rest}
      style={{ ...gridStyle, ...style }}
      className={cn("@container space-y-2", className)}
    >
      {showHeader && (
        <div aria-hidden className="hidden gap-2 @lg:grid @lg:grid-cols-[var(--line-items-cols)]">
          {columns.map(headerCell)}
          {onRemove && <span />}
        </div>
      )}

      {items.length === 0 && hasContent(empty) && (
        <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-center text-sm text-[var(--text-muted)]">
          {empty}
        </div>
      )}

      {items.map((item, index) => {
        const row = index + 1;
        const isConfirming = confirming === index;
        return (
          // The row's Ctrl/⌘+Enter is a shortcut for the add button, which is itself
          // reachable by Tab; the group only listens for it bubbling from its fields.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <div
            key={getKey(item, index)}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            role="group"
            aria-label={rowLabel ? rowLabel(index, item) : labels.row(row)}
            data-line-items-row=""
            onKeyDown={onRowKeyDown}
            className={cn(
              "grid grid-cols-1 gap-2 @lg:grid-cols-[var(--line-items-cols)] @lg:items-start",
              // Two short fields to a row of the card — from 18rem, where two fields
              // still fit a figure each; on anything narrower they stack after all.
              pairs && "@2xs:grid-cols-2",
              // Stacked, each row is a card of its own so the rows stay apart.
              "@max-lg:rounded-md @max-lg:border @max-lg:border-[var(--border)] @max-lg:p-3",
            )}
          >
            {columns.map((column) => {
              const floating = floats(column);
              return (
                <div
                  key={column.key}
                  className={cn(
                    "min-w-0 space-y-1 @lg:space-y-0",
                    // The wide grid places every cell in its own track again.
                    pairs && column.narrowSpan === 2 && "@2xs:col-span-2 @lg:col-span-1",
                  )}
                >
                  {!floating && (
                    <span aria-hidden className="block text-xs font-medium text-[var(--text-muted)] @lg:hidden">
                      {column.header}
                    </span>
                  )}
                  {column.render({
                    item,
                    index,
                    label: labels.cell(columnName(column), row),
                    fieldLabel: floating ? columnName(column) : undefined,
                  })}
                </div>
              );
            })}
            {onRemove && (
              // Paired, the remove button keeps a row of its own at the card's end
              // rather than squeezing in beside the last field.
              <div className={cn("flex justify-end @lg:justify-center", pairs && "@2xs:col-span-2 @lg:col-span-1")}>
                <IconButton
                  type="button"
                  data-line-items-remove=""
                  variant={isConfirming ? "danger" : "ghost"}
                  tone={isConfirming ? undefined : "danger"}
                  label={isConfirming ? labels.confirmRemove(row) : labels.remove(row)}
                  disabled={!canRemove}
                  onClick={() => void removeAt(index)}
                  onBlur={() => {
                    if (isConfirming) setConfirming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && isConfirming) {
                      e.stopPropagation();
                      setConfirming(null);
                    }
                  }}
                >
                  <Trash2 />
                </IconButton>
              </div>
            )}
          </div>
        );
      })}

      {showTotals && (
        <div
          role="group"
          aria-label={typeof totalsLabel === "string" ? totalsLabel : labels.totals}
          data-line-items-totals=""
          className="grid grid-cols-1 gap-2 border-t border-[var(--border)] pt-2 text-sm font-semibold tabular-nums text-[var(--text-primary)] @lg:grid-cols-[var(--line-items-cols)]"
        >
          {columns.map((column) => {
            const value = totals[column.key];
            if (column.key === labelColumn) {
              return (
                <span key={column.key} className="min-w-0">
                  {totalsLabel ?? labels.totals}
                </span>
              );
            }
            return (
              <span
                key={column.key}
                className={cn(
                  "min-w-0",
                  column.align === "end" && "@lg:text-end",
                  // Stacked, a column with no total takes no line.
                  !hasContent(value) && "@max-lg:hidden",
                )}
              >
                {hasContent(value) && (
                  <span className="flex justify-between gap-2 @lg:block">
                    <span aria-hidden className="font-normal text-[var(--text-muted)] @lg:hidden">
                      {column.header}
                    </span>
                    {value}
                  </span>
                )}
              </span>
            );
          })}
          {onRemove && <span className="@max-lg:hidden" />}
        </div>
      )}

      {summary && (
        <div
          data-line-items-summary=""
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-primary)]"
        >
          <span className="min-w-0">{summary.label}</span>
          {hasContent(summary.value) && (
            <span
              data-tone={summary.tone ?? "neutral"}
              className={cn("font-semibold tabular-nums", SUMMARY_TONE[summary.tone ?? "neutral"])}
            >
              {summary.value}
            </span>
          )}
          {summary.action && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="ms-auto"
              disabled={disabled || summary.action.disabled}
              onClick={summary.action.onClick}
            >
              {summary.action.label}
            </Button>
          )}
        </div>
      )}

      {hasError && (
        <p className="text-[11px] leading-tight text-[var(--danger)]">
          {error}
        </p>
      )}

      {onAdd && (
        <Button
          ref={addRef}
          type="button"
          variant="secondary"
          className="w-full border-dashed"
          disabled={!canAdd}
          onClick={add}
        >
          <Plus aria-hidden className="size-4" />
          {addLabel ?? labels.add}
        </Button>
      )}
    </div>
  );
}
