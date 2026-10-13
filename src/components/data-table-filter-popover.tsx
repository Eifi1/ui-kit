import { useCallback, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { decimalMark, localizeMark, readTyped, showsTyped } from "../lib/decimal-marks";
import { FIELD_TOUCH_TEXT } from "./field-base";
import { FOCUS_RING } from "./focus-ring";
import { MiniCalendar } from "./mini-calendar";
import { dateRangePresets } from "../lib/dates";
import { resolveFilter } from "./data-table-filters";
import type { FilterValue } from "./data-table-filters";
import type { DataTableColumn } from "./data-table";
import type { DataTableLabels } from "./data-table-labels";
import { resolveDataTableLabels } from "./data-table-shared";
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
  // What `autoFocus` did, done by hand: a callback ref runs in the same commit phase
  // React's own autofocus does, once when the input mounts (it is stable across
  // renders, so a re-render does not re-take focus).
  const focusOnMount = useCallback(
    (el: HTMLInputElement | null) => {
      if (el && autoFocus) el.focus();
    },
    [autoFocus],
  );
  // The number bounds' marks, and what the typist wrote in each box — see the number
  // section below (BUG-10).
  const mark = decimalMark(locale);
  const [typed, setTyped] = useState<{ min: string | null; max: string | null }>({ min: null, max: null });
  const filter = resolveFilter(column);
  if (!filter) return null;

  // `focus:outline-none` with only a 1px border tint to replace it is the same finding
  // the audit records against the numpad's keys: on a panel of four identical fields a
  // border going from --border to --border-strong is not a location. The ring is, and it
  // is the package's brand focus colour, as on every field (field-base.tsx).
  const inputBase =
    "block w-full rounded border border-subtle bg-surface px-2 py-1.5 text-sm text-secondary placeholder:text-placeholder focus:border-strong focus:outline-none " +
    FOCUS_RING +
    " " +
    // §10.1: a filter field is a field — 16 px on touch, or iOS zooms on focus.
    FIELD_TOUCH_TEXT;
  const buttonBase =
    "rounded border border-subtle bg-surface px-2 py-1 text-xs text-secondary hover:bg-hover";

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
          // props above. Focused by `focusOnMount` rather than the `autoFocus`
          // attribute, because here taking focus is the default, not an opt-in.
          ref={focusOnMount}
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
        <div className="flex items-center justify-between text-xs text-muted">
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
        <ul className="max-h-56 overflow-y-auto rounded border border-subtle">
          {selectOptions.map((o) => {
            const checked = v.values.includes(o.value);
            return (
              <li key={o.value}>
                <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-hover">
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
            <li className="px-2 py-2 text-sm text-muted">—</li>
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
    // Side by side, the 7rem preset column leaves a phone's calendar and its two
    // native date inputs ~180px, which clips "mm/dd/yyyy" mid-placeholder. Below `sm`
    // the presets wrap as a row above the calendar, which then gets the panel's width.
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <ul className="flex flex-wrap gap-0.5 text-xs sm:w-28 sm:shrink-0 sm:flex-col sm:flex-nowrap">
          {presets.map((p) => {
            const active = isActivePreset(p);
            return (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => set(p.from, p.to)}
                  className={cn(
                    "block rounded px-2 py-1 text-start transition-colors sm:w-full",
                    active
                      ? "bg-brand-soft text-brand-muted"
                      : "text-secondary hover:bg-hover",
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
            <label className="text-xs text-muted">
              {labels.dateFrom}
              <input
                type="date"
                value={v.from}
                onChange={(e) => set(e.target.value, v.to)}
                className={cn("mt-0.5", inputBase)}
              />
            </label>
            <label className="text-xs text-muted">
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
  // The bounds were native `type="number"` inputs, the one numeric entry in the kit that
  // bypassed decimal-marks (BUG-10, refactor audit 2026-10): where the browser refuses a
  // comma, a German "12,50" read as empty and the filter silently stayed off while the box
  // showed the text. A text box with the decimal keyboard now, read as NumberInput reads
  // (`readTyped`): the state holds the dot-decimal figure, and the box keeps the typist's
  // own text while it says the same (`showsTyped`), else the bound in the locale's mark.
  const shown = (bound: "min" | "max") => {
    const own = typed[bound];
    return own !== null && showsTyped(own, mark, v[bound]) ? own : localizeMark(v[bound], mark);
  };
  const setBound = (bound: "min" | "max", raw: string) => {
    setTyped((t) => ({ ...t, [bound]: raw }));
    const read = readTyped(raw, mark);
    onChange({
      type: "number",
      min: bound === "min" ? read : v.min,
      max: bound === "max" ? read : v.max,
      abs: v.abs,
    });
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          {labels.numberMin} (≥)
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={shown("min")}
            onChange={(e) => setBound("min", e.target.value)}
            className={cn("mt-0.5", inputBase)}
          />
        </label>
        <label className="text-xs text-muted">
          {labels.numberMax} (≤)
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={shown("max")}
            onChange={(e) => setBound("max", e.target.value)}
            className={cn("mt-0.5", inputBase)}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-secondary">
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
