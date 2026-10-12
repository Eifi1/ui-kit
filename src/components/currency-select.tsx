import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_INVALID, FIELD_FLOATING_PAD } from "./ui";
import { EndHintRow, useFieldMessages } from "./field-parts";
import { cn } from "../lib/cn";
import { useComboboxCore } from "./combobox-core";
import {
  CURRENCIES,
  CurrencyFlag,
  CurrencyOptionList,
  currencyName,
  getCurrency,
  type CurrencyFlagProps,
  type CurrencyOption,
} from "./currency-option-list";
import {
  DEFAULT_COMMON_LABELS,
  DEFAULT_CURRENCY_LABELS,
  useKitLabels,
  useKitLocale,
} from "../i18n/kit-labels";

// The data and the flag are declared beside the one list both currency pickers render
// (./currency-option-list, round 0.34 Wave 2, DUP-4) and are this module's exports, as
// they always were.
export { CURRENCIES, CurrencyFlag, currencyName, getCurrency };
export type { CurrencyFlagProps, CurrencyOption };

/** `onChange` is the kit's — "a currency was picked", carrying the code — rather
 *  than the div's form event. */
export interface CurrencySelectProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  label?: ReactNode;
  /**
   * Restrict the pickable currencies to these ISO codes (e.g. only the
   * currencies actually present in a budget). Order is preserved. Defaults to
   * the full {@link CURRENCIES} list.
   */
  options?: string[];
  /** Required and unanswered — {@link FIELD_INVALID}, the same rose border the
   *  native `Select` has worn since feedback #235. Every field-styled control in
   *  this package carries it now, so a form can mark any of its fields rather than
   *  only the one that happened to have it first. */
  invalid?: boolean;
  /**
   * What is wrong with the choice, in the caller's own words — {@link Input}'s `error`
   * (keksdose K4: of the kit's pickers this one had neither a message nor a caption, so
   * "the account is in EUR" sat in a loose `<p>` beside it that nothing pointed at).
   * Rendered under the field, after a text `hint`; merged into the trigger's
   * `aria-describedby`; implies `invalid`. `null`, `false` and `""` are no message.
   */
  error?: ReactNode;
  /**
   * {@link Select}'s `hint`, the same rule (keksdose K4). A {@link FieldHint} "?" rides
   * the label's line; on an unlabelled picker it sits at the field's end edge, outside
   * the box. Plain TEXT (a string or a number) is a caption UNDER the field, attached
   * to the trigger through `aria-describedby` — the label line has no room for a
   * sentence.
   */
  hint?: ReactNode;
  /** Every user-facing string this control owns, shaped like `AmountInput`'s
   *  `labels` so the two currency pickers in the kit are configured the same way.
   *
   *  `search` exists because `placeholder` used to do BOTH jobs: it named the empty
   *  field and, for want of anything else, it was also handed to the search box —
   *  so a caller who wrote "Currency" got "Currency" as the prompt for typing a
   *  filter, and a caller who wanted to name the filter had to rename the field.
   *  `placeholder` still wins for the trigger, so nothing moves for the callers
   *  that set it; what changes is that the search box no longer borrows it. */
  labels?: {
    /** The empty trigger, when `placeholder` is not given. */
    currency?: string;
    /** The filter box inside the open panel. */
    search?: string;
  };
  /**
   * Translated currency names, keyed by ISO code — `{ CHF: "Schweizer Franken" }`.
   *
   * {@link CURRENCIES} is data the package ships, so its 27 names were the one
   * string in the row a consumer could not translate: the code and the symbol are
   * language-neutral, and the name beside them stayed English in a German UI. This
   * is a sparse OVERRIDE rather than a replacement list, so an app translates the
   * eight currencies it actually uses and keeps the rest; forking `CURRENCIES` to
   * get there would also fork the flags and symbols, which nobody wants to maintain.
   *
   * The search matches what is SHOWN — type "Franken" and you find CHF — because a
   * filter that only matches the hidden English name is worse than no filter.
   */
  currencyNames?: Record<string, string>;
}

export function CurrencySelect({
  value,
  onChange,
  placeholder,
  className,
  label,
  options,
  invalid,
  error,
  hint,
  labels,
  currencyNames,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...rest
}: CurrencySelectProps) {
  // The picker family's foundation (round 0.34 Wave 2, DUP-4): open state, the query,
  // the highlighted row, portal anchoring, outside press, Escape on the kit's stack and
  // Back — what `useDropdownSearch` gave it, and the rest it did not. `filter: false`:
  // the list's own currency filter hands the panel its rows.
  const core = useComboboxCore<string>({ filter: false, backCloses: true });
  const { open, setOpen, triggerRef, closeToTrigger } = core;
  // `labels` > `currency` from the provider > English.
  const text = useKitLabels("currency", DEFAULT_CURRENCY_LABELS, labels);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const locale = useKitLocale();

  const selected = getCurrency(value);

  const listboxId = `${useId()}-listbox`;
  // Text is a caption under the field; anything else (a FieldHint) rides the label
  // line — and a FieldHint is that caption at Large and on touch (§4). See `hint`. On
  // the TRIGGER, which is the control with a role: a caller's description used to land
  // on the wrapper `<div>` through the spread, where nothing reads it. The caller's ids
  // first, then the caption, then the error — Select's order, through useFieldMessages
  // since 0.34 (DUP-2, DUP-8).
  const field = useFieldMessages({ hint, error, invalid, describedBy: ariaDescribedBy, ariaInvalid });
  const { labelHint, describedBy, isInvalid } = field;

  // The trigger's NAME. A combobox does not take its name from its content, and the
  // floating label is a <span>, not a <label for> — so without `aria-label` from the
  // caller this trigger had no name at all (keksdose's test suite, 0.5.0). Composed the
  // way MultiSelect and the entity comboboxes compose theirs, "label: value", with the
  // `currency` word standing in for a missing label so it is never nameless.
  const fieldName = typeof label === "string" ? label : text.currency;
  const name = ariaLabel ?? common.fieldValue(fieldName, selected ? selected.code : (placeholder ?? text.currency));

  const trigger = (
    <button
      // Where Escape on the open list hands focus back to (round 0.34 BUG-1).
      ref={triggerRef}
      type="button"
      aria-label={name}
      onClick={() => setOpen((v) => !v)}
      // Down/Up opens the list from the closed trigger, per the APG; Enter and Space
      // already do through the button's own click.
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      // The implicit `button` role supports neither `aria-expanded` nor
      // `aria-invalid`, so this trigger previously wore a red border and announced
      // nothing about being invalid or about there being a list behind it. The role
      // that DESCRIBES it is the one that also supports the attributes — the same
      // treatment its siblings (MultiSelect, the entity comboboxes) now carry, so a
      // form row of pickers reads the same way throughout. And since Wave 2 the popup
      // IS the listbox it promises, of options with the chosen one selected (BUG-12).
      role="combobox"
      aria-haspopup="listbox"
      aria-controls={listboxId}
      aria-expanded={open}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
      className={cn(FIELD_TRIGGER, "pe-9", label !== undefined && FIELD_FLOATING_PAD, isInvalid && FIELD_INVALID)}
    >
      {/* The trigger stays COMPACT — flag + code only — so it never clips in a
          narrow field; the full names live in the (wider) popup (feedback
          #308). */}
      <span className={cn("flex items-center gap-2 min-w-0", selected ? "text-primary" : "text-placeholder")}>
        {selected ? (
          <>
            <CurrencyFlag country={selected.country} />
            <span className="font-medium">{selected.code}</span>
          </>
        ) : (
          placeholder ?? text.currency
        )}
      </span>
      <FieldChevron />
    </button>
  );

  return (
    // The wrapper takes `rest`; the trigger takes the name. This field's label is a
    // floating <span> rather than a <label for>, so a caller who wants the control to
    // announce more than the code inside it has nowhere else to put it.
    <div {...rest} className={cn("relative", className)}>
      {label !== undefined &&
        (labelHint === undefined ? (
          <FieldLabel>{label}</FieldLabel>
        ) : (
          // The label and its "?" as one row on the label's line, as FloatingField lays
          // out a static label with a hint: the row places both, the label truncates
          // and the hint keeps its width. `z-10` like FieldLabel's own: the trigger is
          // `relative` and comes later, so it would paint over the strip.
          <div className="pointer-events-none absolute inset-x-3 top-1 z-10 flex items-center gap-1">
            <FieldLabel className="static z-auto min-w-0 max-w-none">{label}</FieldLabel>
            <span className="pointer-events-auto flex shrink-0 items-center">{labelHint}</span>
          </div>
        ))}
      {/* No label line to ride: at the field's end edge, outside the box, as an
          unlabelled Select places its FieldHint. */}
      <EndHintRow hint={label === undefined ? labelHint : undefined}>{trigger}</EndHintRow>
      {field.below}
      {/* Portalled to <body> and anchored to the trigger (dev#548), so where it stands
          in the flow no longer moves it. */}
      <CurrencyOptionList
        core={core}
        listboxId={listboxId}
        value={value}
        codes={options}
        currencyNames={currencyNames}
        locale={locale}
        searchPlaceholder={text.search}
        // On a phone the list is a full-screen sheet, which needs the field's own name
        // to say what it asks for (live #200).
        sheetTitle={label ?? text.currency}
        onChoose={(code) => {
          onChange(code);
          // Back to the trigger: the panel holding focus is about to unmount, and a
          // keyboard user who has answered the field should stand on it, ready to Tab on.
          closeToTrigger();
        }}
      />
    </div>
  );
}
