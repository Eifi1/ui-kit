import { useId } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { IconButton } from "./icon-button";
import { Select } from "./select";
import { DEFAULT_DATA_TABLE_LABELS } from "./data-table-labels";
import type { DataTableSortLabels } from "./data-table";
import type { SortDir } from "./data-table-sort";

/** One choice in a {@link SortStrip}: what the select holds, and what it shows. */
export interface SortStripOption {
  value: string;
  label: string;
}

export interface SortStripProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onChange" | "dir"> {
  options: readonly SortStripOption[];
  /** The picked option's `value`; `null` is the rows' own order. */
  value: string | null;
  dir: SortDir;
  /** Offer "Default order" (`null`) in the select. Default `false`: a list that is always
   *  ranked by something. While `value` is `null` it is offered anyway, so the select
   *  never claims a choice that is not made. */
  offerDefault?: boolean;
  /** The smaller select and button, as a compact table's. */
  compact?: boolean;
  /** Over the provider's `dataTable` words: `sortBy`, `sortDefault`, `sortAscending`,
   *  `sortDescending`. */
  labels?: LabelOverride<DataTableSortLabels>;
  onPick: (value: string | null) => void;
  /** The direction button: the caller turns `dir` round. */
  onFlip: () => void;
}

/**
 * A "Sort by" select and a direction button — the sort a header row carries, where there
 * is none: a phone's card list, a list of cards. DataTable's `mobileSort` is this row on
 * the table's own sort; keksdose's budget page (dev #679) copied it over a hand-built
 * `Table`, so it stands alone. The caller holds the sort; the strip reports a pick and a
 * flip.
 *
 * The select's label is a real `<label>` beside it, and the button sits outside that
 * label: a click inside a label is forwarded to the control it names, so a nested button
 * would flip AND open the select. The direction button is off while nothing is picked.
 */
export function SortStrip({
  options,
  value,
  dir,
  offerDefault = false,
  compact = false,
  labels: labelsProp,
  onPick,
  onFlip,
  className,
  ...rest
}: SortStripProps) {
  const selectId = useId();
  const labels = useKitLabels("dataTable", DEFAULT_DATA_TABLE_LABELS, labelsProp);
  const desc = dir === "desc";
  return (
    <div
      {...rest}
      // At Large the direction button shows its words (IconButton's label, §4); the row
      // wraps so the select keeps a usable width on a 240 px card.
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <label htmlFor={selectId} className="shrink-0 text-xs text-muted">
        {labels.sortBy}
      </label>
      <Select
        id={selectId}
        size={compact ? "sm" : "md"}
        className="min-w-0 flex-1 large:basis-40"
        value={value ?? ""}
        onChange={(e) => onPick(e.target.value || null)}
      >
        {(offerDefault || value === null) && <option value="">{labels.sortDefault}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <IconButton
        size={compact ? "xs" : "md"}
        variant="secondary"
        label={desc ? labels.sortDescending : labels.sortAscending}
        disabled={value === null}
        onClick={onFlip}
      >
        {desc ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
      </IconButton>
    </div>
  );
}
