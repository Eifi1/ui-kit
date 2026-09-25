import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_FLOATING_PAD, FIELD_INVALID } from "./ui";
import {
  ComboboxPanel,
  useComboboxCore,
  useComboboxFieldError,
  type ComboClearValue,
  type ComboOption,
} from "./combobox-core";
import { DEFAULT_COMBOBOX_LABELS, DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";

export type { ComboClearValue, ComboOption } from "./combobox-core";

/** `onChange` is the kit's — "a selection was made", carrying values — rather
 *  than the div's form event, so the DOM's spelling of it is omitted. */
export interface EntityComboboxProps<V extends string | number, C extends ComboClearValue = null>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  /** Selected id; `null`, `undefined` or `clearValue` when nothing is selected. */
  value: V | C | null | undefined;
  /** Selecting an option emits its value; the clear button emits `clearValue`. */
  onChange: (value: V | C) => void;
  /**
   * What the clear button emits. Default `null`. Pass `""` for a form whose schema
   * wants an empty string for "no choice" (a zod `z.string()` field), rather than
   * mapping `null` in every `onChange` — the type of `onChange` follows it, so the
   * mapping cannot be forgotten on one field and not another. The picker also reads
   * the value back as empty, so `value=""` shows the placeholder and no "×".
   * See {@link ComboClearValue} for why the choice is closed.
   */
  clearValue?: C;
  /** Already-loaded options (client-side filtered). Also used to resolve the
   *  trigger label for the current `value`. */
  options?: ComboOption<V>[];
  /** Async option source, debounced and called on open + as the query changes
   *  (at `minChars` and up). Stale responses are ignored; a rejection empties the
   *  list and says `loadErrorLabel` instead of leaving the last query's rows up. When set, `options` is used only for label
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
  /** Required and unanswered — {@link FIELD_INVALID}. See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** What is wrong with the value, as {@link Input}'s `error`: rendered under the
   *  field, on the trigger's `aria-describedby`, and implies `invalid`. */
  error?: ReactNode;
  /** Narrow `options` client-side by the query. Default `true`; `false` shows them
   *  as given (a server-ranked list). */
  filter?: boolean;
  /** Offer nothing, and call no `loadOptions`, below this many characters. Default
   *  `0`, i.e. the list loads as the panel opens. */
  minChars?: number;
  /** `loadOptions` debounce. Default 150 ms. */
  debounceMs?: number;
  /** Shown when `loadOptions` rejects. Default: `combobox.loadError`. */
  loadErrorLabel?: string;
}

/**
 * An id-keyed, searchable entity picker: a field-styled trigger showing the
 * selected item's label, and a portalled dropdown of `{label, sublabel, icon}`
 * options — loaded up front via `options` or lazily via `loadOptions`. Built on
 * the shared field/anchor/dismiss/search primitives (no cmdk/Radix). For picking
 * several entities use {@link MultiEntityCombobox}.
 */
export function EntityCombobox<V extends string | number, C extends ComboClearValue = null>({
  value,
  onChange,
  clearValue = null as C,
  options,
  loadOptions,
  loading,
  label,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  clearable,
  clearLabel,
  closeLabel,
  disabled,
  onCreate,
  createLabel,
  className,
  invalid,
  error,
  filter,
  minChars,
  debounceMs,
  loadErrorLabel,
  "aria-label": ariaLabel,
  ...rest
}: EntityComboboxProps<V, C>) {
  const core = useComboboxCore<V>({
    options,
    loadOptions,
    loading,
    filter,
    minChars,
    debounceMs,
  });
  const field = useComboboxFieldError(error, invalid);
  // The props are the per-instance overrides, the provider the app-wide ones; a
  // prop left `undefined` falls through to the provider rather than masking it.
  const labels = useKitLabels("combobox", DEFAULT_COMBOBOX_LABELS, {
    search: searchPlaceholder,
    noResults: emptyLabel,
    clear: clearLabel,
    create: createLabel,
  });
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const { open, results, resolve, setOpen } = core;
  // One id per instance, generated here rather than in the core: `aria-controls` on
  // the trigger has to name the list while the list is still closed, so the id
  // belongs to whoever renders both ends of it.
  const listboxId = useId();

  // The clear value is "nothing selected" too, whichever one the caller picked.
  const chosen: V | null = value == null || value === clearValue ? null : (value as V);
  const selectedOption = chosen == null ? null : resolve(chosen);
  const q = core.query.trim();
  const showCreate =
    Boolean(onCreate) && q.length > 0 && !results.some((o) => o.label.toLowerCase() === q.toLowerCase());
  const showClear = Boolean(clearable && chosen != null && !disabled);
  /** What the closed control is showing — the second half of its accessible name. */
  const triggerText = selectedOption?.label ?? placeholder ?? "";

  const choose = (o: ComboOption<V>) => {
    core.cacheRef.current.set(o.value, o);
    onChange(o.value);
    // Back to the trigger, not to <body>: the panel that held focus is about to
    // unmount, and a keyboard user who just answered this field should be standing
    // on it, ready to Tab to the next one.
    core.closeToTrigger();
  };

  return (
    // `rest` dresses the wrapper, which has no role; the accessible NAME goes on
    // the trigger, which has one. Spread FIRST so the trigger's ARIA and the
    // handlers that open the panel cannot be clobbered from outside.
    <div {...rest} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      <button
        ref={core.triggerRef}
        type="button"
        // A combobox, not a button. The distinction is not pedantry: this control
        // carried `aria-invalid`, which `button` does not support, so a required
        // field left empty painted a rose border and told a reader nothing at all —
        // and ESLint flagged it as exactly that (`role-supports-aria-props`). The
        // fix the audit asked for is the role that describes what this IS: a closed
        // choice that expands into the list named below. `combobox` supports
        // `aria-invalid`, so the border and the announcement finally agree.
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        // The label is a floating <span>, not a <label for>, so without this the
        // trigger's accessible name is whatever value happens to be selected —
        // "Checking" with nothing saying it is the account. The label AND the
        // value, because `aria-label` replaces the content rather than adding to
        // it, and a control that announces only its name has lost the answer.
        // A caller's own name wins over the composition: two fields labelled
        // "Account" on a transfer form are the from and the to, and only the
        // caller knows which is which.
        aria-label={
          ariaLabel ??
          (typeof label === "string" ? common.fieldValue(label, triggerText) : undefined)
        }
        disabled={disabled}
        aria-invalid={field.isInvalid || undefined}
        aria-describedby={field.describedBy}
        onClick={() => !disabled && setOpen((o) => !o)}
        // Down/Up opens the list from the closed trigger, per the APG. Enter and
        // Space already do it through the button's own click.
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          FIELD_TRIGGER,
          "pe-9",
          label !== undefined && FIELD_FLOATING_PAD,
          disabled && "cursor-not-allowed opacity-50",
          field.isInvalid && FIELD_INVALID,
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
              // placeholder tone (`--text-placeholder`), which every field here
              // agrees on.
              !selectedOption && "text-[var(--text-placeholder)]",
            )}
          >
            {selectedOption?.label ?? placeholder ?? ""}
          </span>
        </span>
        {showClear ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label={labels.clear}
            onClick={(e) => {
              e.stopPropagation();
              onChange(clearValue);
            }}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-placeholder)] hover:text-[var(--text-secondary)]"
          >
            <X className="size-4" />
          </span>
        ) : (
          <FieldChevron />
        )}
      </button>
      <ComboboxPanel
        core={core}
        listboxId={listboxId}
        // On a phone the panel becomes a full-screen sheet, which needs the field's
        // own label to say what it is asking for (live #200).
        sheetTitle={label ?? placeholder}
        searchPlaceholder={labels.search}
        emptyLabel={labels.noResults}
        closeLabel={closeLabel}
        loadErrorLabel={loadErrorLabel}
        isSelected={(v) => v === value}
        onChoose={choose}
        showCreate={showCreate}
        onCreate={() => {
          onCreate?.(q);
          core.closeToTrigger();
        }}
        createContent={labels.create(q)}
      />
      {field.errorEl}
    </div>
  );
}
