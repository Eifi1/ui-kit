import { useMemo } from "react";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_FLOATING_PAD } from "./ui";
import { cn } from "../lib/cn";
import { DropdownPanel, DropdownSearchHeader, useDropdownSearch } from "./dropdown";

export interface MultiSelectOption {
  value: string | number;
  label: string;
  hint?: string;
}

interface Props {
  options: MultiSelectOption[];
  values: (string | number)[];
  onChange: (next: (string | number)[]) => void;
  /** Displayed when no value is selected (i.e. "all"). Defaults to "All"; pass a
   * translated string for i18n. */
  allLabel?: string;
  /** Singular/plural countable label, used when 1+ items are selected. */
  itemLabel?: (count: number) => string;
  placeholder?: string;
  /** Embedded top-boundary label, matching the native Input/Select fields. */
  label?: ReactNode;
  /** Search-box placeholder (default "Search"). */
  searchLabel?: string;
  /** "Select all" action label (default "Select all"). */
  selectAllLabel?: string;
  /** "Clear" action label (default "Clear"). */
  clearLabel?: string;
  className?: string;
  /** Extra classes for the open dropdown PANEL — the way to widen it past its
   *  16rem default when the rows carry more than a label (Keksdose feedback #147). */
  panelClassName?: string;
}

export function MultiSelect({
  options,
  values,
  onChange,
  allLabel,
  itemLabel,
  placeholder,
  label,
  searchLabel = "Search",
  selectAllLabel = "Select all",
  clearLabel = "Clear",
  className,
  panelClassName,
}: Props) {
  const { open, setOpen, wrapperRef, query, setQuery, inputRef } = useDropdownSearch();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  const valueSet = useMemo(() => new Set(values), [values]);
  const allChecked = options.length > 0 && options.every((o) => valueSet.has(o.value));
  const anyChecked = values.length > 0;
  const selectedSummary = (() => {
    if (!anyChecked) return allLabel ?? placeholder ?? "All";
    if (allChecked) return allLabel ?? placeholder ?? "All";
    return itemLabel ? itemLabel(values.length) : `${values.length}`;
  })();

  const toggle = (val: string | number) => {
    if (valueSet.has(val)) onChange(values.filter((v) => v !== val));
    else onChange([...values, val]);
  };

  const selectAll = () => onChange(options.map((o) => o.value));
  const clearAll = () => onChange([]);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(FIELD_TRIGGER, "pr-9", label !== undefined && FIELD_FLOATING_PAD)}
      >
        {/* The summary IS the field's value, so it inherits FIELD_BASE's ink rather
            than restating a lighter one (Keksdose dev#477). */}
        <span className="truncate">{selectedSummary}</span>
        <FieldChevron />
      </button>
      {open && (
        <DropdownPanel
          // 16rem by default; `panelClassName` is how a caller widens it (Keksdose
          // feedback #147: the market picker's rows carry a postcode, a town, a
          // distance and a receipt count, all of which were being truncated). The
          // override used to be applied from the OUTSIDE with a
          // `[&>div]:w-full` descendant selector, which worked and was a hack —
          // "change the package" was the right call.
          className={cn("w-64", panelClassName)}
          empty={filtered.length === 0}
          header={
            <>
              <DropdownSearchHeader
                query={query}
                onQueryChange={setQuery}
                inputRef={inputRef}
                placeholder={searchLabel}
              />
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allChecked}
                  className="rounded px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {selectAllLabel}
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={!anyChecked}
                  className="rounded px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {clearLabel}
                </button>
              </div>
            </>
          }
        >
          {filtered.map((o) => {
              const checked = valueSet.has(o.value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800",
                      checked && "bg-slate-100/60 dark:bg-slate-800/60",
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
                        )}
                      >
                        {checked && <Check className="size-3" />}
                      </span>
                      <span className="truncate text-slate-900 dark:text-slate-100">{o.label}</span>
                      {o.hint && (
                        <span className="truncate text-xs text-slate-400 dark:text-slate-500">
                          {o.hint}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
        </DropdownPanel>
      )}
    </div>
  );
}
