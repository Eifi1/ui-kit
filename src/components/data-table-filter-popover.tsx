import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { MiniCalendar } from "./mini-calendar";
import { dateRangePresets } from "../lib/dates";
import { resolveFilter } from "./data-table-filters";
import type { FilterValue } from "./data-table-filters";
import type { DataTableColumn } from "./data-table";
import { DEFAULT_DATA_TABLE_LABELS, type DataTableLabels } from "./data-table-labels";

interface FilterPopoverProps<T> {
  column: DataTableColumn<T>;
  state: FilterValue;
  onChange: (next: FilterValue) => void;
  onClear: () => void;
  selectOptions: { value: string; label: string }[];
  /** BCP-47 locale for the date picker / labels. */
  locale?: string;
  labels?: DataTableLabels;
}

/**
 * The contents of a column's filter Popover. Renders the right control set for
 * the column's filter type — text search, select checklist, date range (presets
 * + {@link MiniCalendar} + from/to inputs), or numeric min/max with an abs
 * toggle — driving the shared {@link FilterValue} state.
 */
export function FilterPopover<T>({
  column,
  state,
  onChange,
  onClear,
  selectOptions,
  locale,
  labels = DEFAULT_DATA_TABLE_LABELS,
}: FilterPopoverProps<T>) {
  const filter = resolveFilter(column);
  if (!filter) return null;

  const inputBase =
    "block w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500";
  const buttonBase =
    "rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

  const clearRow = (
    <div className="flex justify-end pt-1">
      <button type="button" onClick={onClear} className={cn(buttonBase, "flex items-center gap-1")}>
        <X className="size-3" /> {labels.clearFilter}
      </button>
    </div>
  );

  if (filter.type === "text") {
    const v = state.type === "text" ? state : { type: "text" as const, q: "" };
    return (
      <div className="space-y-2">
        <input
          type="text"
          autoFocus
          value={v.q}
          onChange={(e) => onChange({ type: "text", q: e.target.value })}
          placeholder={labels.filterPlaceholder}
          className={inputBase}
        />
        {clearRow}
      </div>
    );
  }

  if (filter.type === "select") {
    const v = state.type === "select" ? state : { type: "select" as const, values: [] };
    const toggle = (val: string) => {
      const set = new Set(v.values);
      if (set.has(val)) set.delete(val);
      else set.add(val);
      onChange({ type: "select", values: Array.from(set) });
    };
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{labels.selectFilter}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onChange({ type: "select", values: selectOptions.map((o) => o.value) })}
              className={buttonBase}
            >
              {labels.selectAll}
            </button>
            <button
              type="button"
              onClick={() => onChange({ type: "select", values: [] })}
              className={buttonBase}
            >
              {labels.selectNone}
            </button>
          </div>
        </div>
        <ul className="max-h-56 overflow-y-auto rounded border border-slate-100 dark:border-slate-800">
          {selectOptions.map((o) => {
            const checked = v.values.includes(o.value);
            return (
              <li key={o.value}>
                <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.value)}
                    className="size-3.5"
                  />
                  <span className="truncate">{o.label}</span>
                </label>
              </li>
            );
          })}
          {selectOptions.length === 0 && (
            <li className="px-2 py-2 text-sm text-slate-500 dark:text-slate-400">—</li>
          )}
        </ul>
        {clearRow}
      </div>
    );
  }

  if (filter.type === "date") {
    const v = state.type === "date" ? state : { type: "date" as const, from: "", to: "" };
    const set = (from: string, to: string) => onChange({ type: "date", from, to });
    const presets = dateRangePresets();
    const isActivePreset = (p: { from: string; to: string }) => v.from === p.from && v.to === p.to;
    return (
      <div className="flex gap-3">
        <ul className="flex w-28 shrink-0 flex-col gap-0.5 text-xs">
          {presets.map((p) => {
            const active = isActivePreset(p);
            return (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => set(p.from, p.to)}
                  className={cn(
                    "block w-full rounded px-2 py-1 text-left transition-colors",
                    active
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                >
                  {labels.presets[p.key] ?? p.key}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="min-w-0 flex-1 space-y-2">
          <MiniCalendar from={v.from} to={v.to} locale={locale ?? "en"} onSelect={set} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              {labels.dateFrom}
              <input
                type="date"
                value={v.from}
                onChange={(e) => set(e.target.value, v.to)}
                className={cn("mt-0.5", inputBase)}
              />
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              {labels.dateTo}
              <input
                type="date"
                value={v.to}
                onChange={(e) => set(v.from, e.target.value)}
                className={cn("mt-0.5", inputBase)}
              />
            </label>
          </div>
          {clearRow}
        </div>
      </div>
    );
  }

  // number
  const v = state.type === "number" ? state : { type: "number" as const, min: "", max: "", abs: false };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-500 dark:text-slate-400">
          {labels.numberMin} (≥)
          <input
            type="number"
            inputMode="decimal"
            value={v.min}
            onChange={(e) => onChange({ type: "number", min: e.target.value, max: v.max, abs: v.abs })}
            onWheel={(e) => e.currentTarget.blur()}
            className={cn("mt-0.5", inputBase)}
          />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          {labels.numberMax} (≤)
          <input
            type="number"
            inputMode="decimal"
            value={v.max}
            onChange={(e) => onChange({ type: "number", min: v.min, max: e.target.value, abs: v.abs })}
            onWheel={(e) => e.currentTarget.blur()}
            className={cn("mt-0.5", inputBase)}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={v.abs}
          onChange={(e) => onChange({ type: "number", min: v.min, max: v.max, abs: e.target.checked })}
          className="size-3.5"
        />
        {labels.numberAbs}
      </label>
      {clearRow}
    </div>
  );
}
