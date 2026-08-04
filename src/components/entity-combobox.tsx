import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_FLOATING_PAD } from "./ui";
import { ComboboxPanel, useComboboxCore, type ComboOption } from "./combobox-core";

export type { ComboOption } from "./combobox-core";

export interface EntityComboboxProps<V extends string | number> {
  /** Selected id, or null/undefined when nothing is selected. */
  value: V | null | undefined;
  /** Selecting an option emits its value; the clear button emits `null`. */
  onChange: (value: V | null) => void;
  /** Already-loaded options (client-side filtered). Also used to resolve the
   *  trigger label for the current `value`. */
  options?: ComboOption<V>[];
  /** Async option source, debounced and called on open + as the query changes.
   *  Stale responses are ignored. When set, `options` is used only for label
   *  resolution, not as the result list. */
  loadOptions?: (query: string) => Promise<ComboOption<V>[]>;
  /** External loading flag (OR-ed with the internal async state). */
  loading?: boolean;
  label?: ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  clearable?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  /** When set, a "create" row appears for a non-empty query with no exact match. */
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => string;
  className?: string;
}

/**
 * An id-keyed, searchable entity picker: a field-styled trigger showing the
 * selected item's label, and a portalled dropdown of `{label, sublabel, icon}`
 * options — loaded up front via `options` or lazily via `loadOptions`. Built on
 * the shared field/anchor/dismiss/search primitives (no cmdk/Radix). For picking
 * several entities use {@link MultiEntityCombobox}.
 */
export function EntityCombobox<V extends string | number>({
  value,
  onChange,
  options,
  loadOptions,
  loading,
  label,
  placeholder,
  searchPlaceholder = "Search",
  emptyLabel = "No results",
  clearable,
  clearLabel,
  disabled,
  onCreate,
  createLabel,
  className,
}: EntityComboboxProps<V>) {
  const core = useComboboxCore<V>({ options, loadOptions, loading });
  const { results, resolve, setOpen } = core;

  const selectedOption = value == null ? null : resolve(value);
  const q = core.query.trim();
  const showCreate =
    Boolean(onCreate) && q.length > 0 && !results.some((o) => o.label.toLowerCase() === q.toLowerCase());
  const showClear = Boolean(clearable && value != null && !disabled);

  const choose = (o: ComboOption<V>) => {
    core.cacheRef.current.set(o.value, o);
    onChange(o.value);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      <button
        ref={core.triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          FIELD_TRIGGER,
          "pr-9",
          label !== undefined && FIELD_FLOATING_PAD,
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span
            className={cn(
              "truncate",
              selectedOption ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500",
            )}
          >
            {selectedOption?.label ?? placeholder ?? ""}
          </span>
        </span>
        {showClear ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label={clearLabel ?? "Clear"}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <X className="size-4" />
          </span>
        ) : (
          <FieldChevron />
        )}
      </button>
      <ComboboxPanel
        core={core}
        searchPlaceholder={searchPlaceholder}
        emptyLabel={emptyLabel}
        isSelected={(v) => v === value}
        onChoose={choose}
        showCreate={showCreate}
        onCreate={() => {
          onCreate?.(q);
          setOpen(false);
        }}
        createContent={createLabel ? createLabel(q) : `Create “${q}”`}
      />
    </div>
  );
}
