import { useCallback, useId, useMemo, type ComponentPropsWithoutRef, type ReactNode, type Ref } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_FLOATING_PAD, FIELD_INVALID } from "./ui";
import {
  ComboboxPanel,
  endHintRowProps,
  offersCreate,
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
import {
  EndHintRow,
  FieldCaption,
  LABEL_IN_ROW,
  LockedReason,
  StaticLabelRow,
  useFieldHint,
  useLockReason,
} from "./field-parts";
import { assignRef, mergeDescribedBy } from "./choice-parts";
import { useCommitReason, type CommitScope } from "./write-lock";

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
  /** Offer a clear "×" while anything is chosen; it emits `[]`. A pointer shortcut out
   *  of the tab order — the keyboard's way is Delete or Backspace on the CLOSED trigger,
   *  or unticking rows in the open list. Not offered while `disabled` or locked. */
  clearable?: boolean;
  clearLabel?: string;
  /** The phone sheet's close button. Its own prop rather than a reuse of
   *  `clearLabel`: "clear the selection" and "close this screen" are different
   *  actions, and on a full-screen sheet the close button is the only way out —
   *  so it is the one control here that MUST be in the reader's language. */
  closeLabel?: string;
  disabled?: boolean;
  /** Why the selection cannot be changed — {@link EntityCombobox}'s `disabledReason`:
   *  focusable and `aria-disabled`, no list, no clear, no `onChange`, the reason in the
   *  kit {@link Tooltip}. Wins over `disabled`. */
  disabledReason?: ReactNode;
  /** This picker COMMITS — toggling saves. Locked the `disabledReason` way under a
   *  locked {@link WriteLockProvider}. See {@link EntityCombobox}'s `commit`. */
  commit?: CommitScope;
  /** When set, a "create" row appears for a non-empty query with no exact match.
   *  The panel stays open (adding the new entity to `value` is the caller's job). */
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => string;
  /** Offer the create row with nothing typed too, worded as this. See
   *  {@link EntityCombobox}'s `createEmptyLabel`. */
  createEmptyLabel?: string;
  /** The create row is a write while toggling is not: locked on its own under a locked
   *  {@link WriteLockProvider}. See {@link EntityCombobox}'s `createCommit`. */
  createCommit?: CommitScope;
  /** Required and unanswered — {@link FIELD_INVALID}. See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** What is wrong with the value, as {@link Input}'s `error`: rendered under the
   *  field, on the trigger's `aria-describedby`, and implies `invalid`. */
  error?: ReactNode;
  /**
   * Standing advice — the rest of the Combobox family's `hint` since 0.22, which this
   * one was left without (keksdose K4): plain TEXT is a caption under the field on the
   * trigger's `aria-describedby`, before any error; a {@link FieldHint} "?" rides the
   * label line, or with no label sits at the trigger's end edge, outside the box.
   * Passed at all — even `undefined` — the field keeps one box, so a hint coming and
   * going never rebuilds the trigger under the cursor (the 0.22 rule).
   */
  hint?: ReactNode;
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
  /** The TRIGGER — the focusable `<button>` — as a React 19 ref prop, as on
   *  {@link EntityCombobox} and {@link CountrySelect} (0.24, kastlan: react-hook-form's
   *  focus-on-error focuses whatever `field.ref` is handed). Not the wrapper. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Multi-value sibling of {@link EntityCombobox}: pick several entities by search,
 * with the same async `loadOptions`/`onCreate` support. Rows show a checkbox and
 * toggle without closing the panel; the trigger summarises the selection.
 */
export function MultiEntityCombobox<V extends string | number>(props: MultiEntityComboboxProps<V>) {
  const {
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
    disabledReason,
    commit,
    onCreate,
    createLabel,
    createEmptyLabel,
    createCommit,
    className,
    invalid,
    error,
    hint,
    filter,
    minChars,
    debounceMs,
    loadErrorLabel,
    ref,
    "aria-label": ariaLabel,
    // The control's own wiring, taken off `rest` so it lands on the TRIGGER rather than
    // the wrapper: `Field`'s render-prop spreads `{ id, aria-describedby, aria-invalid,
    // aria-required }`, and on the role-less wrapper div the label's `htmlFor` named
    // nothing and the hint and required state described nothing — kastlan's
    // communication-page To/Cc/Bcc and lease-tenants-step.tsx read as unnamed pickers.
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-required": ariaRequired,
    ...rest
  } = props;
  const core = useComboboxCore<V>({
    options,
    loadOptions,
    loading,
    filter,
    minChars,
    debounceMs,
  });
  const hintParts = useFieldHint(hint, ariaDescribedBy);
  const field = useComboboxFieldError(
    error,
    invalid || ariaInvalid === true || ariaInvalid === "true",
    hintParts.describedBy,
  );
  // The props are the per-instance overrides, the provider the app-wide ones; a
  // prop left `undefined` falls through to the provider rather than masking it.
  const labels = useKitLabels("combobox", DEFAULT_COMBOBOX_LABELS, {
    search: searchPlaceholder,
    noResults: emptyLabel,
    clear: clearLabel,
    create: createLabel,
  });
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const { open, results, resolve, setOpen, query, triggerRef } = core;
  // The core's trigger ref and the caller's, fed by one callback — see EntityCombobox.
  const setTrigger = useCallback(
    (el: HTMLButtonElement | null) => {
      triggerRef.current = el;
      assignRef(ref, el);
    },
    [ref, triggerRef],
  );
  // The lock — see EntityCombobox: the trigger stays reachable and says why.
  const lock = useLockReason(commit, disabledReason);
  const inert = lock.locked || Boolean(disabled);
  if (lock.locked && open) setOpen(false);
  const createReason = useCommitReason(createCommit, undefined);
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

  // While locked the trigger sits in the reason's Tooltip, as on EntityCombobox.
  const withLock = (trigger: ReactNode) =>
    lock.locked ? (
      <LockedReason lock={lock} className="block">
        {trigger}
      </LockedReason>
    ) : (
      trigger
    );

  const q = query.trim();
  const showCreate = offersCreate(
    onCreate,
    q,
    results.map((o) => o.label),
    createEmptyLabel,
  );
  const showClear = Boolean(clearable && value.length > 0 && !inert);

  const toggle = (o: ComboOption<V>) => {
    if (lock.locked) return;
    core.rememberOption(o);
    if (valueSet.has(o.value)) onChange(value.filter((v) => v !== o.value));
    else onChange([...value, o.value]);
    // Stay open — multi-select keeps adding.
  };

  return (
    // `rest` dresses the wrapper, which has no role; the accessible NAME — and the
    // id, description, invalid and required state above — go on the trigger, which
    // has one. Spread FIRST so the trigger's ARIA and the
    // handlers that open the panel cannot be clobbered from outside.
    <div {...rest} className={cn("relative", className)}>
      {label !== undefined && hintParts.labelHint === undefined && <FieldLabel>{label}</FieldLabel>}
      <EndHintRow {...endHintRowProps("hint" in props, label !== undefined, hintParts.labelHint)}>
        {withLock(
          <button
            ref={setTrigger}
            id={id}
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
            // Focusable while locked — see EntityCombobox.
            disabled={lock.locked ? undefined : disabled}
            aria-disabled={lock.locked || undefined}
            aria-invalid={field.isInvalid || undefined}
            aria-describedby={mergeDescribedBy(field.describedBy, lock.locked && lock.reasonId)}
            aria-required={ariaRequired}
            onClick={() => !inert && setOpen((o) => !o)}
            // Down/Up opens the list from the closed trigger, per the APG. Enter and
            // Space already do it through the button's own click.
            onKeyDown={(e) => {
              if (inert) return;
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setOpen(true);
              } else if (showClear && !open && (e.key === "Delete" || e.key === "Backspace")) {
                // The keyboard's clear: the "×" is a pointer shortcut out of the tab
                // order, so without this a cleared-by-mouse field was set-only from the
                // keyboard. The closed trigger only — CountrySelect's rule (0.23).
                e.preventDefault();
                onChange([]);
              }
            }}
            className={cn(
              FIELD_TRIGGER,
              "pe-9",
              label !== undefined && FIELD_FLOATING_PAD,
              inert && "cursor-not-allowed opacity-50",
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
              /* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- tabIndex -1 inside
                  the trigger <button>, so it never holds focus and a key handler here could
                  never fire. A pointer shortcut; the keyboard paths are Delete on the closed
                  trigger and unticking the options in the open list. */
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
          </button>,
        )}
      </EndHintRow>
      {/* With a "?" the label shares the top strip with it — after the trigger, so the
          "?" follows the control in the tab order, as on EntityCombobox. */}
      {label !== undefined && hintParts.labelHint !== undefined && (
        <StaticLabelRow hint={hintParts.labelHint}>
          <FieldLabel className={LABEL_IN_ROW}>{label}</FieldLabel>
        </StaticLabelRow>
      )}
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
          if (lock.locked) return;
          onCreate?.(q);
          core.setQuery("");
        }}
        createContent={q ? labels.create(q) : createEmptyLabel}
        createDisabledReason={createReason}
      />
      <FieldCaption parts={hintParts} />
      {field.errorEl}
    </div>
  );
}
