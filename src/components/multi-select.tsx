import { useCallback, useId, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { FieldChevron, FIELD_TRIGGER, FIELD_INVALID, FIELD_FLOATING_PAD } from "./field-base";
import { FieldLabel } from "./field-parts";
import { cn } from "../lib/cn";
import { ComboboxPanel, useComboboxCore, type ComboOption } from "./combobox-core";
import {
  assignRef,
  EndHintRow,
  LABEL_IN_ROW,
  LockedReason,
  StaticLabelRow,
  useFieldMessages,
  useLockReason,
  type DisabledReasonDisplay,
  type FieldHelpProps,
} from "./field-parts";
import type { CommitScope } from "./write-lock";
import {
  DEFAULT_COMMON_LABELS,
  DEFAULT_MULTI_SELECT_LABELS,
  useKitLabels,
  type MultiSelectLabels,
  type LabelOverride,
} from "../i18n/kit-labels";

/**
 * One row of a {@link MultiSelect}. Generic over its value since 0.34 (API-4), so a list of
 * number ids hands `onChange` numbers — `MultiSelectOption` alone is the old
 * `string | number` row.
 */
export interface MultiSelectOption<V extends string | number = string | number> {
  value: V;
  label: string;
  /** A second line under the label — a postcode, a count (keksdose #147). Searchable. */
  hint?: string;
  /**
   * Shown but not takeable — {@link ComboOption.disabled}: dimmed, `aria-disabled`, passed
   * over by the arrow keys, and a press does nothing. A chosen disabled row stays chosen:
   * "Select all" and "Clear" leave it as it is. Say why in `hint`.
   */
  disabled?: boolean;
}

/** `onChange` is the kit's — "the selection changed", carrying the new values —
 *  rather than the div's form event. Generic over the option value (API-4): `V` is
 *  inferred from `options` and `value`, so `onChange` hands back `number[]` for number
 *  ids and `string[]` for string ones, and no call site casts. */
export interface MultiSelectProps<V extends string | number = string | number>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange">, FieldHelpProps {
  options: readonly MultiSelectOption<V>[];
  /** The chosen values — the select family's `value` (API-4). */
  value?: readonly V[];
  onChange: (next: V[]) => void;
  /** Singular/plural countable label, used when 1+ items are selected. Default:
   *  `labels.selectedCount`, else `multiSelect.selectedCount` from the provider — the
   *  bare count in English. */
  itemLabel?: (count: number) => string;
  /** Shown when nothing is picked, unless `labels.all` says otherwise — it has always
   *  doubled as the "nothing picked" text. */
  placeholder?: string;
  /** Embedded top-boundary label, matching the native Input/Select fields. */
  label?: ReactNode;
  /**
   * Per-instance overrides of the provider's `multiSelect` namespace, over English — the
   * kit's `labels` shape, where this took four string props until 0.35 (API-4: `allLabel`,
   * `searchLabel`, `selectAllLabel`, `clearLabel`). `all` is the trigger when nothing is
   * picked: `labels.all`, then `placeholder`, then the provider's.
   */
  labels?: LabelOverride<MultiSelectLabels>;
  /**
   * Extra classes for the open PANEL. The panel is portalled now (dev#548) and sizes
   * itself: as wide as the trigger and at least 16rem, growing with its rows up to 32rem
   * (or the trigger) — what this prop was asked for (keksdose feedback #147: the market
   * picker's postcode, distance and receipt-count hints were cut at 16rem). A `w-*` class
   * here no longer sets the width.
   */
  panelClassName?: string;
  /** Required and unanswered — {@link FIELD_INVALID}, the same rose border the
   *  native `Select` has worn since feedback #235. Every field-styled control in
   *  this package carries it now, so a form can mark any of its fields rather than
   *  only the one that happened to have it first. */
  invalid?: boolean;
  /** What is wrong with the selection, in the caller's words. Rendered under the
   *  field, pointed at by the trigger's `aria-describedby` (merged with any the
   *  caller passed) and implies `invalid` — {@link Input}'s `error`, on the same
   *  rules. */
  error?: ReactNode;
  /**
   * Standing advice for the field — {@link Combobox}'s `hint` (keksdose K4): plain TEXT
   * is a caption under the field on the trigger's `aria-describedby`, before any error;
   * a {@link FieldHint} "?" rides the label line, or with no label sits at the trigger's
   * end edge, outside the box. Not an option's `hint`, which stays on its row.
   */
  hint?: ReactNode;
  /** The trigger cannot be opened: FIELD_BASE's settled grey, no chevron (as a
   *  disabled {@link Select} drops its own), and a dimmed label. */
  disabled?: boolean;
  /**
   * Why the selection cannot be changed — {@link EntityCombobox}'s `disabledReason`: the
   * trigger stays focusable and `aria-disabled`, the list does not open and `onChange`
   * never fires; the reason is a line under the field at Large and on a touch screen,
   * else in the kit {@link Tooltip} (`disabledReasonDisplay`), and on the trigger's
   * `aria-describedby`. Wins over `disabled`.
   */
  disabledReason?: ReactNode;
  /** Where the reason shows — {@link Button}'s `disabledReasonDisplay`: a line under the
   *  field at Large and on a touch screen by default, the tooltip otherwise. */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /** This picker COMMITS — toggling saves (a filter persisted per user, a settings row).
   *  Locked the `disabledReason` way under a locked {@link WriteLockProvider}, with the
   *  lock's reason. Leave it off inside a form that has its own Save. */
  commit?: CommitScope;
  /** The TRIGGER — the focusable `<button>` — as a React 19 ref prop, as on
   *  {@link MultiEntityCombobox} (react-hook-form's focus-on-error). Not the wrapper. */
  ref?: Ref<HTMLButtonElement>;
}

/** "Select all" and "Clear": dimmed, with no hover, while there is nothing for them to do. */
const TOOLBAR_BUTTON =
  "rounded px-2 py-0.5 text-secondary hover:bg-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent";

/**
 * Pick several of a fixed list — a filter's accounts, a comparison's data sets — with a
 * search box, "Select all" and "Clear"; nothing picked reads as "all".
 *
 * Built on the picker family's foundation since round 0.34 (Wave 2, DUP-4):
 * `useComboboxCore` + `ComboboxPanel`, as {@link MultiEntityCombobox} is. It was an
 * absolute `DropdownPanel`, which an `overflow` ancestor clipped (dev#548) and which on a
 * phone was a 16rem panel between the field and the keyboard; it now has the full-screen
 * sheet (live #200), the portal, the live result count, disabled rows and the search
 * that folds accents ("zurich" finds Zürich, DUP-5).
 */
export function MultiSelect<V extends string | number = string | number>(props: MultiSelectProps<V>) {
  const {
    options,
    value: valueProp,
    onChange,
    itemLabel,
    placeholder,
    label,
    labels: labelsProp,
    className,
    panelClassName,
    invalid,
    error,
    hint,
    help,
    disabled,
    disabledReason,
    disabledReasonDisplay,
    commit,
    ref,
    id,
    "aria-label": ariaLabel,
    // Off `rest` and onto the trigger, which is the combobox a reader meets: `Field`'s
    // render-prop spreads `{ id, aria-describedby, aria-invalid, aria-required }`, and on
    // the wrapper div the label named nothing and the required state described nothing
    // (DUP-8, refactor audit 2026-10 — Combobox's rule).
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-required": ariaRequired,
    ...rest
  } = props;
  const value = useMemo<readonly V[]>(() => valueProp ?? [], [valueProp]);
  // The rows as the family's options — the hint is the sublabel, searched like the label.
  const comboOptions = useMemo(
    () =>
      options.map((o): ComboOption<V> => ({ value: o.value, label: o.label, sublabel: o.hint, disabled: o.disabled })),
    [options],
  );
  // Back closes the open list, as it did on `useDropdown` (keksdose live #309).
  const core = useComboboxCore<V>({ options: comboOptions, backCloses: true });
  const { open, setOpen, triggerRef } = core;
  // The core anchors the panel to the trigger and hands focus back to it; the caller's
  // `ref` wants the same element. One callback feeds both.
  const setTrigger = useCallback(
    (el: HTMLButtonElement | null) => {
      triggerRef.current = el;
      assignRef(ref, el);
    },
    [ref, triggerRef],
  );
  // `labels` > the provider's `multiSelect` > English. `all` is resolved apart below:
  // between the instance's and the provider's sits `placeholder`, which has always
  // doubled as the "nothing picked" text, and a caller who set it must keep seeing it.
  const text = useKitLabels("multiSelect", DEFAULT_MULTI_SELECT_LABELS, {
    search: labelsProp?.search,
    selectAll: labelsProp?.selectAll,
    clear: labelsProp?.clear,
    selectedCount: labelsProp?.selectedCount ?? itemLabel,
  });
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);

  // The lock — EntityCombobox's: the trigger stays reachable and says why.
  const lock = useLockReason(commit, disabledReason);
  const inert = lock.locked || Boolean(disabled);
  // A lock (or `disabled`) arriving while the list is up closes it — adjusted while
  // rendering, as CountrySelect does, so no frame shows a list that can no longer be used.
  if (inert && open) setOpen(false);

  // The caller's ids, the caption, a lock's reason, the error — Select's order.
  const field = useFieldMessages({
    hint,
    help,
    name: label ?? ariaLabel,
    error,
    invalid,
    describedBy: ariaDescribedBy,
    ariaInvalid,
    reasonId: lock.locked && lock.reasonId,
  });
  // One id per instance: `aria-controls` on the trigger names the list while the
  // list is still closed.
  const listboxId = `${useId()}-listbox`;

  const valueSet = useMemo(() => new Set<V>(value), [value]);
  const allChecked = options.length > 0 && options.every((o) => valueSet.has(o.value));
  const selectedSummary =
    value.length === 0 || allChecked ? (labelsProp?.all ?? placeholder ?? text.all) : text.selectedCount(value.length);

  const toggle = (o: ComboOption<V>) => {
    if (lock.locked) return;
    if (valueSet.has(o.value)) onChange(value.filter((v) => v !== o.value));
    else onChange([...value, o.value]);
    // Stays open, as a pressed row always has: this control answers "which of these",
    // which is rarely one of them.
  };
  // A chosen disabled row stays chosen, an unchosen one stays out — the row refuses to be
  // toggled, by a press or by the two actions.
  const selectAll = () => onChange(options.filter((o) => !o.disabled || valueSet.has(o.value)).map((o) => o.value));
  const clearAll = () => onChange(options.filter((o) => o.disabled && valueSet.has(o.value)).map((o) => o.value));
  const canSelectAll = options.some((o) => !o.disabled && !valueSet.has(o.value));
  const canClear = options.some((o) => !o.disabled && valueSet.has(o.value));

  const trigger = (
    <button
      ref={setTrigger}
      id={id}
      type="button"
      // The focusable kind of disabled while locked (Button's rule): native `disabled`
      // would take the field out of the tab order, and the reason with it.
      disabled={lock.locked ? undefined : disabled}
      aria-disabled={lock.locked || undefined}
      // A combobox, not a bare button: this trigger carried `aria-invalid`, which
      // `button` does not support, so a required-and-empty filter painted its rose
      // border and announced nothing (ESLint's `role-supports-aria-props`, the
      // audit's §a11y). The role that describes it is the one that also supports
      // the attribute.
      role="combobox"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-haspopup="listbox"
      // The label is a floating <span>, not a <label for>, so without this the
      // trigger announces only its summary — "3 selected", with nothing saying
      // three of WHAT. The label AND the summary, because `aria-label` replaces
      // the content rather than adding to it; the same composition its two
      // siblings use, so a form row of pickers reads the same way throughout.
      // A caller's own name wins: two filters labelled "Accounts" on one screen have
      // to be told apart, and only the caller knows by what.
      aria-label={ariaLabel ?? (typeof label === "string" ? common.fieldValue(label, selectedSummary) : undefined)}
      onClick={() => {
        if (!inert) setOpen((v) => !v);
      }}
      // Down/Up opens the list from the closed trigger, per the APG; Enter and
      // Space already do through the button's own click.
      onKeyDown={(e) => {
        if (inert) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      aria-invalid={field.isInvalid || undefined}
      aria-required={ariaRequired}
      // On the TRIGGER, where focus lands — the `aria-describedby` a caller put on
      // the component is taken off the wrapper for the same reason.
      aria-describedby={field.describedBy}
      className={cn(
        FIELD_TRIGGER,
        "pe-9",
        label !== undefined && FIELD_FLOATING_PAD,
        // FIELD_TRIGGER's hover would still light a trigger nothing can open.
        "disabled:hover:bg-surface-2",
        // Dimmed like EntityCombobox's and MultiEntityCombobox's disabled triggers;
        // only the label was, so a disabled MultiSelect read as live (showcase audit).
        "disabled:cursor-not-allowed disabled:opacity-50",
        lock.locked && "cursor-not-allowed opacity-50",
        field.isInvalid && FIELD_INVALID,
      )}
    >
      {/* The summary IS the field's value, so it inherits FIELD_BASE's ink rather
          than restating a lighter one (Keksdose dev#477). An ellipsis at Normal; from
          Large up it wraps and the trigger grows, as DatePicker's value does (text
          size §10.17, round 0.34 T1). */}
      <span className="truncate-until-large">{selectedSummary}</span>
      {!inert && <FieldChevron />}
    </button>
  );

  return (
    // `rest` dresses the wrapper; the name belongs to the trigger below it, which is
    // the thing with a role. Spread FIRST so the ARIA the trigger composes, and the
    // handlers that open the list, cannot be replaced by accident from outside.
    <div {...rest} className={cn("relative", className)}>
      {label !== undefined && field.labelHint === undefined && (
        <FieldLabel className={inert ? "opacity-50" : undefined}>{label}</FieldLabel>
      )}
      <EndHintRow hint={label === undefined ? field.labelHint : undefined}>
        {lock.locked ? (
          // Button's frame: the line under the trigger, or the Tooltip with a hidden copy
          // for `aria-describedby`.
          <LockedReason lock={lock} display={disabledReasonDisplay} className="block">
            {trigger}
          </LockedReason>
        ) : (
          trigger
        )}
      </EndHintRow>
      {/* With a "?" the label shares the top strip with it — after the trigger, so the
          "?" follows the control in the tab order, as on Input and Select. */}
      {label !== undefined && field.labelHint !== undefined && (
        <StaticLabelRow hint={field.labelHint}>
          <FieldLabel className={cn(LABEL_IN_ROW, inert && "opacity-50")}>{label}</FieldLabel>
        </StaticLabelRow>
      )}
      {field.below}
      <ComboboxPanel
        core={core}
        listboxId={listboxId}
        multi
        // On a phone the list is a full-screen sheet, which needs the field's own name
        // to say what it asks for (live #200).
        sheetTitle={label ?? placeholder}
        searchPlaceholder={text.search}
        isSelected={(v) => valueSet.has(v)}
        onChoose={toggle}
        showCreate={false}
        onCreate={() => {}}
        createContent={null}
        // At least the trigger's width and 16rem, growing with the rows to 32rem: the
        // hints are why it was widened at all (keksdose #147).
        width={{ minRem: 16, fit: true, maxRem: 32 }}
        className={panelClassName}
        // Reached by Tab from the search box (the panel's rows are not tab stops), and
        // `aria-disabled` with a guarded click rather than `disabled`: a pressed "Clear"
        // with nothing left to clear disabled itself under the focus, which dropped it to
        // <body> — JumpCalendar's arrows are the rule (refactor audit 2026-10-30, INP-9).
        toolbar={
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                if (canSelectAll) selectAll();
              }}
              aria-disabled={!canSelectAll || undefined}
              className={TOOLBAR_BUTTON}
            >
              {text.selectAll}
            </button>
            <button
              type="button"
              onClick={() => {
                if (canClear) clearAll();
              }}
              aria-disabled={!canClear || undefined}
              className={TOOLBAR_BUTTON}
            >
              {text.clear}
            </button>
          </div>
        }
      />
    </div>
  );
}
