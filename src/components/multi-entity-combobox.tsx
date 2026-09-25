import { useId, useMemo, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_FLOATING_PAD, FIELD_INVALID } from "./ui";
import {
  ComboboxPanel,
  useComboboxCore,
  useComboboxFieldError,
  type ComboOption,
} from "./combobox-core";
import {
  DEFAULT_COMBOBOX_LABELS,
  DEFAULT_COMMON_LABELS,
  useKitLabels,
  useKitLocale,
} from "../i18n/kit-labels";

/** `onChange` is the kit's — "a selection was made", carrying values — rather
 *  than the div's form event, so the DOM's spelling of it is omitted. */
export interface MultiEntityComboboxProps<V extends string | number>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  /** Selected ids. */
  value: V[];
  onChange: (value: V[]) => void;
  /** Already-loaded options (client-side filtered); also resolves selected labels. */
  options?: ComboOption<V>[];
  /** Async option source, debounced + race-safe; a rejection shows
   *  `loadErrorLabel`. When set, `options` resolves labels only. */
  loadOptions?: (query: string) => Promise<ComboOption<V>[]>;
  loading?: boolean;
  label?: ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Trigger summary when 1+ selected (default: the labels as a locale-formatted
   *  list, or `combobox.selectedCount` when a label can't be resolved). */
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
  searchPlaceholder,
  emptyLabel,
  itemLabel,
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
}: MultiEntityComboboxProps<V>) {
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

  const valueSet = useMemo(() => new Set(value), [value]);
  // A list of NAMES, not a sentence, so the narrow conjunction: English gets
  // "Food, Rent, Travel" (no "and" squeezed into a truncating trigger), German and
  // French still get their "und"/"et" where the language insists on it, and Japanese
  // and Chinese get the ideographic comma "、". The `unit` type looked like the
  // natural fit for a summary, but in ja/zh it concatenates the names with nothing
  // between them at all.
  const locale = useKitLocale();
  const listFormat = useMemo(
    () => new Intl.ListFormat(locale, { type: "conjunction", style: "narrow" }),
    [locale],
  );
  const summary = (() => {
    if (value.length === 0) return placeholder ?? "";
    if (itemLabel) return itemLabel(value.length);
    const chosen = value.map(resolve);
    return chosen.every(Boolean)
      ? listFormat.format(chosen.map((o) => o!.label))
      : labels.selectedCount(value.length);
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
          (typeof label === "string" ? common.fieldValue(label, summary) : undefined)
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
        <span
          className={cn(
            "min-w-0 truncate",
            // Inherit FIELD_BASE's ink for a value, keep the placeholder tone
            // (`--text-placeholder`) — the same rule every field on a form row
            // follows (Keksdose dev#477).
            !value.length && "text-[var(--text-placeholder)]",
          )}
        >
          {summary}
        </span>
        {showClear ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label={labels.clear}
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
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
        multi
        // On a phone the panel becomes a full-screen sheet, which needs the field's
        // own label to say what it is asking for (live #200).
        sheetTitle={label ?? placeholder}
        searchPlaceholder={labels.search}
        emptyLabel={labels.noResults}
        closeLabel={closeLabel}
        loadErrorLabel={loadErrorLabel}
        isSelected={(v) => valueSet.has(v)}
        onChoose={toggle}
        showCreate={showCreate}
        onCreate={() => {
          onCreate?.(q);
          core.setQuery("");
        }}
        createContent={labels.create(q)}
      />
      {field.errorEl}
    </div>
  );
}
