import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { MiniCalendar } from "./mini-calendar";
import { dateRangePresets } from "../lib/dates";
import { resolveFilter } from "./data-table-filters";
import type { FilterValue } from "./data-table-filters";
import type { DataTableColumn } from "./data-table";
import { resolveDataTableLabels, type DataTableLabels } from "./data-table-labels";
import { useKitLabelOverrides, useKitLocale } from "../i18n/kit-labels";

interface FilterPopoverProps<T> {
  column: DataTableColumn<T>;
  state: FilterValue;
  onChange: (next: FilterValue) => void;
  onClear: () => void;
  selectOptions: { value: string; label: string }[];
  /** BCP-47 locale for the date picker / labels. Falls back to the provider's. */
  locale?: string;
  /** Already resolved by {@link DataTable}. Standalone (it is exported), omit it and
   *  the `dataTable` namespace of `<UiKitProvider labels>` is used. */
  labels?: DataTableLabels;
  /**
   * Focus the text filter's input on mount. True, because that is right for the one
   * place this component normally lives: a Popover opened by an explicit press on
   * "Filter", which exists in order to be typed into and which the user has just asked
   * for. It was hard-coded, which made it right there and wrong everywhere else — a
   * browser scrolls whatever takes focus into view, so embedding this control in an
   * ordinary page (the showcase documents it on one) landed the reader 25,000px down a
   * page they had not scrolled. An embedder that is not a popover passes `false`.
   */
  autoFocus?: boolean;
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
  locale: localeProp,
  labels: labelsProp,
  autoFocus = true,
}: FilterPopoverProps<T>) {
  // Both hooks run before the early return below, unconditionally.
  const overrides = useKitLabelOverrides("dataTable");
  const labels = labelsProp ?? resolveDataTableLabels(overrides);
  // No `"en"` fallback any more: that pinned the calendar to English in a table that
  // was never handed a locale, under a provider that had one.
  const locale = useKitLocale(localeProp);
  const filter = resolveFilter(column);
  if (!filter) return null;

  // `focus:outline-none` with only a 1px border tint to replace it is the same finding
  // the audit records against the numpad's keys: on a panel of four identical fields a
  // border going from --border to --border-strong is not a location. The ring is, and it
  // is the package's brand focus colour, as on every field in ui.tsx.
  const inputBase =
    "block w-full rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5 text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]";
  const buttonBase =
    "rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]";

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
          // A prop now, defaulting to what the popover needs; see `autoFocus` on the
          // props above. Deliberately NOT an eslint-disable: `jsx-a11y/no-autofocus` is
          // one of the config's ratcheted warnings and this is still one of the four it
          // counts, because the default here is still to take focus. Silencing it would
          // shrink the backlog without emptying it.
          autoFocus={autoFocus}
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
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
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
        <ul className="max-h-56 overflow-y-auto rounded border border-[var(--border)]">
          {selectOptions.map((o) => {
            const checked = v.values.includes(o.value);
            return (
              <li key={o.value}>
                <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-[var(--bg-hover)]">
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
            <li className="px-2 py-2 text-sm text-[var(--text-muted)]">—</li>
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
                      ? "bg-[var(--brand-bg)] text-[var(--brand-muted)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                  )}
                >
                  {labels.presets[p.key] ?? p.key}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="min-w-0 flex-1 space-y-2">
          {/* No `labels` here: the calendar reads `miniCalendar` from the provider
              itself, which is the only way a calendar nested this deep was ever going
              to be translated — the table has no prop to forward them through. */}
          <MiniCalendar from={v.from} to={v.to} locale={locale} onSelect={set} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-[var(--text-muted)]">
              {labels.dateFrom}
              <input
                type="date"
                value={v.from}
                onChange={(e) => set(e.target.value, v.to)}
                className={cn("mt-0.5", inputBase)}
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
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
        <label className="text-xs text-[var(--text-muted)]">
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
        <label className="text-xs text-[var(--text-muted)]">
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
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
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
