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
  /** The phone sheet's close button. Its own prop rather than a reuse of
   *  `clearLabel`: "clear the selection" and "close this screen" are different
   *  actions, and on a full-screen sheet the close button is the only way out —
   *  so it is the one control here that MUST be in the reader's language. */
  closeLabel?: string;
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
  closeLabel,
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
  /** What the closed control is showing — the second half of its accessible name. */
  const triggerText = selectedOption?.label ?? placeholder ?? "";

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
        // The label is a floating <span>, not a <label for>, so without this the
        // trigger's accessible name is whatever value happens to be selected —
        // "Checking" with nothing saying it is the account. The label AND the
        // value, because `aria-label` replaces the content rather than adding to
        // it, and a control that announces only its name has lost the answer.
        aria-label={
          typeof label === "string" ? `${label}: ${triggerText}` : undefined
        }
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
              // A chosen value is the field's VALUE, so it is set in the same ink an
              // <input>'s value is — FIELD_BASE's own text colour, inherited rather
              // than restated (Keksdose dev#477). It used to be one notch lighter
              // than the typeahead fields beside it, which is visible when a picker
              // and a text field share a form row. Nothing selected keeps the
              // placeholder grey, which every field here agrees on.
              !selectedOption && "text-slate-400 dark:text-slate-500",
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
        // On a phone the panel becomes a full-screen sheet, which needs the field's
        // own label to say what it is asking for (live #200).
        sheetTitle={label ?? placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyLabel={emptyLabel}
        closeLabel={closeLabel}
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
