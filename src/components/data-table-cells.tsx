import type { ReactNode } from "react";
import { Check, Minus, X } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { DEFAULT_DATA_TABLE_LABELS, type DataTableLabels } from "./data-table-labels";
import type { DataTableColumn } from "./data-table";

export interface BooleanMarkProps {
  /** `true` → a check, `false` → a cross (or a dash, see `falseAs`), `null` /
   *  `undefined` → a dash. */
  value: boolean | null | undefined;
  /**
   * How `false` is drawn. `"cross"` (default) when "no" is news worth seeing — a
   * failed check, a missing document. `"dash"` for a column that is mostly `false` and
   * reads as a list of the `true` ones (kastlan's BoolCell): a column of crosses is
   * noise. The screen-reader text says "No" either way.
   */
  falseAs?: "cross" | "dash";
  /** The spoken words, over `dataTable.booleanTrue` / `booleanFalse` / `booleanUnset`
   *  from `<UiKitProvider labels>`. */
  labels?: Partial<Pick<DataTableLabels, "booleanTrue" | "booleanFalse" | "booleanUnset">>;
  className?: string;
}

/**
 * A yes/no value in a table cell: a green check, a muted cross, or a faint dash for
 * "not set" — with the word for a screen reader, since a glyph alone is announced as
 * nothing at all (or as "image").
 *
 * kastlan's `BoolCell` (shared/components/data-table/bool-cell.tsx) drew the icons with
 * no text, so a reader walking the table heard an empty cell for every row; the apps'
 * Yes/No chips were the other answer, and too loud for a column of them.
 */
export function BooleanMark({ value, falseAs = "cross", labels: labelsProp, className }: BooleanMarkProps) {
  const labels = useKitLabels("dataTable", DEFAULT_DATA_TABLE_LABELS, labelsProp);
  const state = value === true ? "true" : value === false ? "false" : "unset";
  const text =
    state === "true" ? labels.booleanTrue : state === "false" ? labels.booleanFalse : labels.booleanUnset;
  const Icon = state === "true" ? Check : state === "false" && falseAs === "cross" ? X : Minus;
  return (
    <span data-value={state} className={cn("inline-flex items-center align-middle", className)}>
      <Icon
        aria-hidden
        className={cn(
          "size-4",
          state === "true"
            ? "text-[var(--success)]"
            : state === "false" && falseAs === "cross"
              ? "text-[var(--text-muted)]"
              : "text-[var(--text-placeholder)]",
        )}
      />
      <span className="sr-only">{text}</span>
    </span>
  );
}

export interface BooleanColumnOptions<T> {
  key: string;
  header: ReactNode;
  /** The value of this row. */
  value: (row: T) => boolean | null | undefined;
  /** See {@link BooleanMarkProps.falseAs}. */
  falseAs?: "cross" | "dash";
  /** Sortable, `true` first on the first click (a column is sorted to find the yes
   *  rows). Default true. */
  sortable?: boolean;
  /**
   * A select filter over the column, with these option labels — pass them translated.
   * Omitted: no filter. The option values are `"true"` / `"false"` (and `"unset"` when
   * `unset` is given), which is also what `filterHref` takes for this column.
   */
  filterOptions?: { true: string; false: string; unset?: string };
  /** Further column settings (`mobileHidden`, `headClassName`, …), merged over. */
  column?: Partial<DataTableColumn<T>>;
}

/**
 * A {@link DataTableColumn} for a yes/no field: {@link BooleanMark} cells,
 * sortable with `true` first, and optionally a Yes/No select filter.
 */
export function booleanColumn<T>({
  key,
  header,
  value,
  falseAs,
  sortable = true,
  filterOptions,
  column,
}: BooleanColumnOptions<T>): DataTableColumn<T> {
  const asKey = (row: T) => {
    const v = value(row);
    return v === true ? "true" : v === false ? "false" : "unset";
  };
  return {
    key,
    header,
    cell: (row) => <BooleanMark value={value(row)} falseAs={falseAs} />,
    // 0 for yes, 1 for no, null for unset (which the table sorts last either way).
    sortBy: sortable
      ? (row) => {
          const v = value(row);
          return v == null ? null : v ? 0 : 1;
        }
      : undefined,
    filter: filterOptions
      ? {
          type: "select",
          getValue: asKey,
          options: [
            { value: "true", label: filterOptions.true },
            { value: "false", label: filterOptions.false },
            ...(filterOptions.unset !== undefined ? [{ value: "unset", label: filterOptions.unset }] : []),
          ],
        }
      : undefined,
    ...column,
  };
}
