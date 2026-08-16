import { useMemo, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_FLOATING_PAD } from "./ui";
import { ComboboxPanel, useComboboxCore, type ComboOption } from "./combobox-core";

export interface MultiEntityComboboxProps<V extends string | number> {
  /** Selected ids. */
  value: V[];
  onChange: (value: V[]) => void;
  /** Already-loaded options (client-side filtered); also resolves selected labels. */
  options?: ComboOption<V>[];
  /** Async option source, debounced + race-safe. When set, `options` resolves
   *  labels only. */
  loadOptions?: (query: string) => Promise<ComboOption<V>[]>;
  loading?: boolean;
  label?: ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Trigger summary when 1+ selected (default: the labels joined by ", ", or
   *  "N selected" when a label can't be resolved). */
  itemLabel?: (count: number) => string;
  clearable?: boolean;
  clearLabel?: string;
  /** The phone sheet's close button. Its own prop rather than a reuse of
   *  `clearLabel`: "clear the selection" and "close this screen" are different
   *  actions, and on a full-screen sheet the close button is the only way out —
   *  so it is the one control here that MUST be in the reader's language. */
  closeLabel?: string;
  disabled?: boolean;
  /** When set, a "create" row appears for a non-empty query with no exact match.
   *  The panel stays open (adding the new entity to `value` is the caller's job). */
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => string;
  className?: string;
}

/**
 * Multi-value sibling of {@link EntityCombobox}: pick several entities by search,
 * with the same async `loadOptions`/`onCreate` support. Rows show a checkbox and
 * toggle without closing the panel; the trigger summarises the selection.
 */
export function MultiEntityCombobox<V extends string | number>({
  value,
  onChange,
  options,
  loadOptions,
  loading,
  label,
  placeholder,
  searchPlaceholder = "Search",
  emptyLabel = "No results",
  itemLabel,
  clearable,
  clearLabel,
  closeLabel,
  disabled,
  onCreate,
  createLabel,
  className,
}: MultiEntityComboboxProps<V>) {
  const core = useComboboxCore<V>({ options, loadOptions, loading });
  const { results, resolve, setOpen } = core;

  const valueSet = useMemo(() => new Set(value), [value]);
  const summary = (() => {
    if (value.length === 0) return placeholder ?? "";
    if (itemLabel) return itemLabel(value.length);
    const chosen = value.map(resolve);
    return chosen.every(Boolean)
      ? chosen.map((o) => o!.label).join(", ")
      : `${value.length} selected`;
  })();

  const q = core.query.trim();
  const showCreate =
    Boolean(onCreate) && q.length > 0 && !results.some((o) => o.label.toLowerCase() === q.toLowerCase());
  const showClear = Boolean(clearable && value.length > 0 && !disabled);

  const toggle = (o: ComboOption<V>) => {
    core.cacheRef.current.set(o.value, o);
    if (valueSet.has(o.value)) onChange(value.filter((v) => v !== o.value));
    else onChange([...value, o.value]);
    // Stay open — multi-select keeps adding.
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
          typeof label === "string" ? `${label}: ${summary}` : undefined
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
        <span
          className={cn(
            "min-w-0 truncate",
            // Inherit FIELD_BASE's ink for a value, keep the placeholder grey — the
            // same rule every field on a form row follows (Keksdose dev#477).
            !value.length && "text-slate-400 dark:text-slate-500",
          )}
        >
          {summary}
        </span>
        {showClear ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label={clearLabel ?? "Clear"}
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
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
        multi
        // On a phone the panel becomes a full-screen sheet, which needs the field's
        // own label to say what it is asking for (live #200).
        sheetTitle={label ?? placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyLabel={emptyLabel}
        closeLabel={closeLabel}
        isSelected={(v) => valueSet.has(v)}
        onChoose={toggle}
        showCreate={showCreate}
        onCreate={() => {
          onCreate?.(q);
          core.setQuery("");
        }}
        createContent={createLabel ? createLabel(q) : `Create “${q}”`}
      />
    </div>
  );
}
