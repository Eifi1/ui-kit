import { useCallback, useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_FLOATING_PAD, FIELD_INVALID } from "./ui";
import {
  ComboboxPanel,
  endHintRowProps,
  offersCreate,
  useComboboxCore,
  useComboboxFieldError,
  type ComboClearValue,
  type ComboOption,
} from "./combobox-core";
import { DEFAULT_COMBOBOX_LABELS, DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";
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
  /** Offer a clear "×" in place of the chevron while something is chosen; it emits
   *  `clearValue`. A pointer shortcut inside the trigger, out of the tab order — the
   *  keyboard's way is Delete or Backspace on the CLOSED trigger (0.23, as
   *  {@link CountrySelect}). Not offered while `disabled` or locked. */
  clearable?: boolean;
  clearLabel?: string;
  /** The phone sheet's close button. Its own prop rather than a reuse of
   *  `clearLabel`: "clear the selection" and "close this screen" are different
   *  actions, and on a full-screen sheet the close button is the only way out —
   *  so it is the one control here that MUST be in the reader's language. */
  closeLabel?: string;
  /** The phone sheet's heading (and, as a string, its accessible name) for a picker
   *  whose label is drawn by someone else — a form's `FormLabel`; `RhfCombobox`
   *  hands its label over here (0.24). Default: `label`, then `placeholder`. */
  sheetTitle?: ReactNode;
  disabled?: boolean;
  /**
   * Why the choice cannot be changed — {@link Button}'s `disabledReason`, for a picker
   * that SAVES on change (keksdose G2: the statement's account, where picking IS the
   * write). The trigger stays focusable and `aria-disabled`, the list does not open,
   * the clear "×" is gone and `onChange` never fires; the reason is in the kit
   * {@link Tooltip} and on the trigger's `aria-describedby`. Wins over `disabled`.
   * {@link CountrySelect}'s lock, which is built on the same core.
   */
  disabledReason?: ReactNode;
  /**
   * This picker COMMITS — choosing saves. Under a locked {@link WriteLockProvider} it is
   * locked the `disabledReason` way with the lock's reason (which wins over its own).
   * A picker inside a form with its own Save stays editable under the lock: leave this
   * off there and put `commit` on the Save. No provider, or an unlocked one: no effect.
   */
  commit?: CommitScope;
  /** When set, a "create" row appears for a non-empty query with no exact match. */
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => string;
  /**
   * Offer the create row with NOTHING typed too, worded as this — keksdose G9's
   * "Create cash account", which mints a record under a default name and so needs no
   * query. `onCreate` then receives `""`. Left out, the row needs a query, as before.
   * See {@link InlineEntityCombobox}'s `createEmptyLabel`.
   */
  createEmptyLabel?: string;
  /**
   * The create row WRITES (it mints the record on the server) while picking does not.
   * Under a locked {@link WriteLockProvider} the row stays in the list but cannot be
   * taken, with the lock's reason as its second line — the picker itself stays live.
   * keksdose dev#496: on the read-only demo choosing is draft state, minting is not.
   */
  createCommit?: CommitScope;
  /** Required and unanswered — {@link FIELD_INVALID}. See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** What is wrong with the value, as {@link Input}'s `error`: rendered under the
   *  field, on the trigger's `aria-describedby`, and implies `invalid`. */
  error?: ReactNode;
  /**
   * Standing advice — {@link Combobox}'s `hint`, so the pickers read like every other
   * field (keksdose K4): plain TEXT is a caption under the field on the trigger's
   * `aria-describedby`, before any error; a {@link FieldHint} "?" rides the label line,
   * or with no label sits at the trigger's end edge, outside the box.
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
  /**
   * The TRIGGER — the focusable `<button>` a reader meets — as a React 19 ref prop, as
   * on {@link CountrySelect}, which is built on the same core (0.24, kastlan: react-hook-
   * form's focus-on-error calls `focus()` on whatever `field.ref` is handed, and a
   * picker with no ref gave it nothing to focus). Not the wrapper: focus belongs on the
   * trigger, which is also where the panel hands it back after a pick.
   */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * An id-keyed, searchable entity picker: a field-styled trigger showing the
 * selected item's label, and a portalled dropdown of `{label, sublabel, icon}`
 * options — loaded up front via `options` or lazily via `loadOptions`. Built on
 * the shared field/anchor/dismiss/search primitives (no cmdk/Radix). For picking
 * several entities use {@link MultiEntityCombobox}.
 */
export function EntityCombobox<V extends string | number, C extends ComboClearValue = null>(
  props: EntityComboboxProps<V, C>,
) {
  const {
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
    sheetTitle,
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
    // the wrapper — see MultiEntityCombobox: `Field`'s render-prop spreads `{ id,
    // aria-describedby, aria-invalid, aria-required }`, and on the role-less wrapper
    // div the label's `htmlFor` named nothing and the hint described nothing.
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
  const { open, results, resolve, setOpen, rememberOption, query, triggerRef } = core;
  // The core anchors the panel to the trigger and hands focus back to it; the caller's
  // `ref` wants the same element. One callback feeds both — CountrySelect's.
  const setTrigger = useCallback(
    (el: HTMLButtonElement | null) => {
      triggerRef.current = el;
      assignRef(ref, el);
    },
    [ref, triggerRef],
  );
  // The lock: this picker's own reason, or the provider's under `commit`.
  const lock = useLockReason(commit, disabledReason);
  const inert = lock.locked || Boolean(disabled);
  // A lock arriving while the list is up closes it — adjusted while
  // rendering, as the core adjusts its own query, so no frame offers a pick that would
  // be thrown away.
  if (lock.locked && open) setOpen(false);
  // The create row's own lock, for a picker whose choosing is draft and whose create
  // is the write (`createCommit`).
  const createReason = useCommitReason(createCommit, undefined);
  // One id per instance, generated here rather than in the core: `aria-controls` on
  // the trigger has to name the list while the list is still closed, so the id
  // belongs to whoever renders both ends of it.
  const listboxId = useId();

  // The clear value is "nothing selected" too, whichever one the caller picked.
  const chosen: V | null = value == null || value === clearValue ? null : (value as V);
  const selectedOption = chosen == null ? null : resolve(chosen);
  const q = query.trim();
  const showCreate = offersCreate(
    onCreate,
    q,
    results.map((o) => o.label),
    createEmptyLabel,
  );
  const showClear = Boolean(clearable && chosen != null && !inert);
  /** What the closed control is showing — the second half of its accessible name. */
  const triggerText = selectedOption?.label ?? placeholder ?? "";
  // While locked the trigger sits in the reason's Tooltip — in a fragment with a hidden
  // copy of the reason, Button's anatomy — `block` so a full-width field stays full width.
  const withLock = (trigger: ReactNode) =>
    lock.locked ? (
      <LockedReason lock={lock} className="block">
        {trigger}
      </LockedReason>
    ) : (
      trigger
    );

  const choose = (o: ComboOption<V>) => {
    if (lock.locked) return;
    rememberOption(o);
    onChange(o.value);
    // Back to the trigger, not to <body>: the panel that held focus is about to
    // unmount, and a keyboard user who just answered this field should be standing
    // on it, ready to Tab to the next one.
    core.closeToTrigger();
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
              (typeof label === "string" ? common.fieldValue(label, triggerText) : undefined)
            }
            // The focusable kind of disabled while locked (Button's rule): a native
            // `disabled` would take the field out of the tab order, and the reason with it.
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
                onChange(clearValue);
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
              /* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- tabIndex -1 inside
                  the trigger <button>, so it never holds focus and a key handler here could
                  never fire; the keys go to the trigger, where Delete and Backspace clear. */
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
          </button>,
        )}
      </EndHintRow>
      {/* With a "?" the label shares the top strip with it — after the trigger, so the
          "?" follows the control in the tab order, as on Input and Select. */}
      {label !== undefined && hintParts.labelHint !== undefined && (
        <StaticLabelRow hint={hintParts.labelHint}>
          <FieldLabel className={LABEL_IN_ROW}>{label}</FieldLabel>
        </StaticLabelRow>
      )}
      <ComboboxPanel
        core={core}
        listboxId={listboxId}
        // On a phone the panel becomes a full-screen sheet, which needs the field's
        // own label to say what it is asking for (live #200).
        sheetTitle={sheetTitle ?? label ?? placeholder}
        searchPlaceholder={labels.search}
        emptyLabel={labels.noResults}
        closeLabel={closeLabel}
        loadErrorLabel={loadErrorLabel}
        isSelected={(v) => v === value}
        onChoose={choose}
        showCreate={showCreate}
        onCreate={() => {
          if (lock.locked) return;
          onCreate?.(q);
          core.closeToTrigger();
        }}
        createContent={q ? labels.create(q) : createEmptyLabel}
        createDisabledReason={createReason}
      />
      <FieldCaption parts={hintParts} />
      {field.errorEl}
    </div>
  );
}
