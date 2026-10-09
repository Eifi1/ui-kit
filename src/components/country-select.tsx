import { useCallback, useId, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { COUNTRY_CODES, countryName, normalizeCountryCode } from "../lib/countries";
import { FieldChevron, FIELD_FLOATING_PAD, FIELD_INVALID, FIELD_TRIGGER, FloatingField } from "./ui";
import { Tooltip } from "./tooltip";
import { CurrencyFlag } from "./currency-select";
import {
  ComboboxPanel,
  useComboboxCore,
  useComboboxFieldError,
  type ComboOption,
} from "./combobox-core";
import { assignRef, hasMessage, mergeDescribedBy } from "./choice-parts";
import { useCommitReason, type CommitScope } from "./write-lock";
import {
  DEFAULT_COMBOBOX_LABELS,
  DEFAULT_COMMON_LABELS,
  useKitLabels,
  useKitLocale,
} from "../i18n/kit-labels";

// ── Labels ────────────────────────────────────────────────────────────────────

/** The words {@link CountrySelect} renders on its own behalf. The list's "no results",
 *  "loading" and result-count announcements are the shared `combobox` namespace's,
 *  as on every other searchable picker. */
export interface CountrySelectLabels {
  /** What the field is, when the caller gives no `label`: the first half of the
   *  trigger's accessible name, the phone sheet's title, and the empty trigger's
   *  text. */
  country: string;
  /** The search box in the open list. */
  search: string;
  /** The heading between the `preferred` countries and all the others. Shown only
   *  when `preferred` puts something above it. */
  others: string;
}

export const DEFAULT_COUNTRY_SELECT_LABELS: CountrySelectLabels = {
  country: "Country",
  search: "Search country",
  others: "Other countries",
};

// ── Props ─────────────────────────────────────────────────────────────────────

/**
 * `onChange` is the kit's — "a country was picked", carrying its code — rather than
 * the div's form event. `id` and the `aria-*` wiring below go to the TRIGGER, which is
 * the control a reader meets; everything else in `rest` dresses the wrapper.
 *
 * `Clearable` follows `clearable`, the way {@link EntityCombobox}'s `C` follows its
 * `clearValue`: it is inferred from the prop, so `onChange` is `(code: string) => void`
 * for the field as it always was (`onChange={setCountry}` over a `string` state still
 * type-checks), and `(code: string | null) => void` once `clearable` is set — the
 * `null` of a clear cannot reach a handler that was never told about it.
 */
export interface CountrySelectProps<Clearable extends boolean = false>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "defaultValue"> {
  /** The chosen country as an ISO 3166-1 alpha-2 code ("CH"), in either case;
   *  `null`, `undefined` or `""` when none is. A code outside the list still shows
   *  its name — the list restricts what can be PICKED, not what can be shown. */
  value: string | null | undefined;
  /** A country was picked: its alpha-2 code, always upper-case. With `clearable`,
   *  also `null`: the "×" (or Delete on the trigger) emptied the field. */
  onChange: (code: Clearable extends true ? string | null : string) => void;
  /**
   * Offer a clear "×" in place of the chevron while a country is chosen; it hands
   * `onChange` `null` (the kit's later list: an optional country — a contact's
   * nationality, a bank filter's "any country" — could be set but never unset again).
   *
   * The combobox family's clear, as {@link EntityCombobox} draws it: a pointer
   * shortcut inside the trigger, out of the tab order so it is not a second stop
   * between this field and the next, named by `clearLabel` (default: the
   * `combobox.clear` label every picker in the family shares). The keyboard way is
   * Delete or Backspace on the closed trigger. Not offered while `disabled` or locked
   * (`commit` / `disabledReason`): a clear is a change like any other.
   */
  clearable?: Clearable;
  /** The clear "×"'s accessible name. Wins over `combobox.clear` from the
   *  {@link UiKitProvider}, as {@link EntityCombobox}'s `clearLabel` does. */
  clearLabel?: string;
  /**
   * The TRIGGER — the focusable `<button>` a reader meets — as a React 19 ref prop,
   * the way {@link MoneyField} takes its input's (kastlan: react-hook-form's
   * focus-on-error calls `focus()` on whatever `field.ref` was handed, and without a
   * ref the first field in error on an address form was never focused). See
   * `RhfCountrySelect`, which passes it.
   */
  ref?: Ref<HTMLButtonElement>;
  /**
   * Offer only these codes (any case; duplicates and malformed entries dropped).
   * Default: every ISO 3166-1 country, {@link COUNTRY_CODES}. Sorted by name either
   * way — the order given is not kept, because the reader looks a country up by its
   * name in their own language, and any other order is one they cannot predict.
   *
   * keksdose's bank picker offers the fifteen countries its banks are in
   * (DE AT CH FR IT ES NL BE PT PL SE DK FI GB IE). A code that is not in ISO's list
   * is allowed here on purpose: `XK` (Kosovo) is the app's decision, not the kit's.
   */
  countries?: readonly string[];
  /**
   * A short group shown FIRST, in the order given, above the alphabetical rest —
   * kastlan's CH, LI, DE, AT, FR, IT, the six countries most of its customers live
   * in, out of a list of 249. Each code appears once: a preferred country is not
   * repeated in the rest. The rest gets a heading (`labels.others`) so the boundary
   * is visible. Search keeps the split: matching preferred countries stay on top.
   * Codes not in `countries` are ignored — `countries` decides what can be picked.
   */
  preferred?: readonly string[];
  /**
   * Draw each country's flag as a flag-icons span (`fi fi-ch`), in the rows and on
   * the trigger. Default `false`, because the kit ships no flag stylesheet — the same
   * convention as `LanguageMenu`'s `country` and `CurrencySelect`: the host imports
   * `flag-icons/css/flag-icons.min.css`, and without it a flag is an empty box.
   */
  flags?: boolean;
  /** The floating label, as on every field. A string also names the trigger
   *  ("Country: Switzerland"). */
  label?: ReactNode;
  /** As {@link Select}'s `hint`: plain TEXT is a caption under the field, attached
   *  through `aria-describedby`; a {@link FieldHint} rides the label line (or the
   *  field's end, when there is no label). */
  hint?: ReactNode;
  /** As {@link Input}'s `error`: rendered under the field, on the trigger's
   *  `aria-describedby`, and implies `invalid`. */
  error?: ReactNode;
  /** Required and unanswered — {@link FIELD_INVALID}, as on every field. */
  invalid?: boolean;
  /** The empty trigger's text. Default: nothing when the field has a `label` or an
   *  `aria-labelledby` (the label already says what goes here), else `labels.country`. */
  placeholder?: string;
  /** As on the other pickers: no focus, no list, the settled look. */
  disabled?: boolean;
  /**
   * Why the country cannot be changed — {@link Button}'s `disabledReason`, for a field
   * that saves itself. The trigger stays focusable and `aria-disabled`, the list does
   * not open and `onChange` never fires; the reason is in the kit {@link Tooltip} and
   * on the trigger's `aria-describedby`. Wins over `disabled`.
   */
  disabledReason?: ReactNode;
  /**
   * This select SAVES on change (a settings row with no Save button). Under a locked
   * {@link WriteLockProvider} it is locked the `disabledReason` way, with the lock's
   * reason. A country field inside a form that has its own Save stays editable under
   * the lock — leave this off there, and put `commit` on the Save.
   */
  commit?: CommitScope;
  /** The language the names are in. Default: the `<UiKitProvider locale>`, else
   *  English (see {@link countryName}). */
  locale?: string;
  /** Per-instance overrides of {@link CountrySelectLabels}, over the provider's
   *  `countrySelect` namespace, over English. */
  labels?: Partial<CountrySelectLabels>;
  /**
   * Name the trigger by an element of the caller's — a form's own label above the
   * field, which is how `RhfCountrySelect` names it. The trigger is then named by
   * that element AND the chosen country (two references, as {@link DatePicker}'s
   * trigger is named, so "Country Switzerland" needs no punctuation to translate),
   * instead of the composed "label: country". An `aria-label` still wins. Before
   * 0.23 this landed on the wrapper `<div>`, which has no role to be named.
   */
  "aria-labelledby"?: string;
}

/** Fold a name for search: no case, no accents — "osterreich" finds Österreich, "cote"
 *  finds Côte d'Ivoire. A keyboard without the letter must still reach the country. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

interface Entry {
  code: string;
  name: string;
  folded: string;
}

/** How well `e` answers `q` (already folded): the code itself (a two-letter query
 *  "ch" means Switzerland before it means Chad), then the start of the name, then
 *  anywhere in it. `-1` for no match. */
function rank(e: Entry, q: string): number {
  if (e.code.toLowerCase() === q) return 0;
  if (e.folded.startsWith(q)) return 1;
  return e.folded.includes(q) ? 2 : -1;
}

/** Best rank first; a stable sort, so equal ranks keep the collated (or preferred)
 *  order they came in. */
function search(entries: Entry[], q: string): Entry[] {
  return entries
    .map((e) => ({ e, r: rank(e, q) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .map((x) => x.e);
}

function toOption(e: Entry, flags: boolean, group?: string): ComboOption<string> {
  return {
    value: e.code,
    label: e.name,
    icon: flags ? <CurrencyFlag country={e.code.toLowerCase()} /> : undefined,
    group,
  };
}

function collator(locale: string): Intl.Collator {
  try {
    return new Intl.Collator(locale);
  } catch {
    return new Intl.Collator();
  }
}

/**
 * A country picker: the value is the ISO 3166-1 alpha-2 code ("CH"), the names are the
 * runtime's own (`Intl.DisplayNames`) in the provider's locale, sorted by that
 * locale's collation. Requested by kastlan (customer and handover addresses, with its
 * six neighbours on top) and keksdose (the bank picker's fifteen countries) — both
 * apps carried a hand-written list of names in two languages.
 *
 * ## Built on the kit's searchable combobox
 *
 * 249 countries is not a menu, it is a lookup, and the list has to work on a phone. So
 * this is the entity pickers' machinery — `useComboboxCore` and `ComboboxPanel`, which
 * {@link EntityCombobox} is also made of — not a native `<select>`: the anchored panel
 * with a search box on a pointer device, the full-screen sheet with its own search box
 * on a phone (live #200), the same keyboard (APG listbox), the same announcements, the
 * same group headings. Only the trigger is this component's own, because the trigger
 * is where the write lock lives: `EntityCombobox`'s is a native `disabled` button,
 * and a locked field has to stay focusable to say why.
 *
 * The search is this component's own too: it folds accents and case ("osterreich"
 * finds Österreich), matches the code ("ch" ranks Switzerland first), and ranks
 * name-starts above name-contains. The panel is handed those rows in place of the
 * core's plain substring filter.
 *
 * Field anatomy as on every field: floating `label`, `hint`, `error`, `invalid`; the
 * trigger is named "label: value" as the other trigger pickers are.
 *
 * Since 0.23 it takes a `ref` to the trigger (react-hook-form's focus-on-error, kastlan)
 * and `clearable`, which hands `onChange` `null`.
 */
export function CountrySelect<Clearable extends boolean = false>({
  value,
  onChange,
  countries,
  preferred,
  flags = false,
  label,
  hint,
  error,
  invalid,
  placeholder,
  disabled,
  disabledReason: ownReason,
  commit,
  clearable,
  clearLabel,
  locale: localeProp,
  labels: labelsProp,
  className,
  id,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  ...rest
}: CountrySelectProps<Clearable>) {
  const text = useKitLabels("countrySelect", DEFAULT_COUNTRY_SELECT_LABELS, labelsProp);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  // The clear's name is the family's (`combobox.clear`), as on EntityCombobox; a prop
  // left `undefined` falls through to the provider rather than masking it.
  const comboText = useKitLabels("combobox", DEFAULT_COMBOBOX_LABELS, { clear: clearLabel });
  // English without a locale — see `countryName`.
  const locale = useKitLocale(localeProp) ?? "en";

  // ── The list ──────────────────────────────────────────────────────────────
  // Keyed on the arrays' CONTENTS: `countries={["DE", "AT"]}` written inline is a new
  // array every render, and resorting 249 names on every keystroke elsewhere in the
  // form is work for nothing.
  const countriesKey = countries?.join(",");
  const preferredKey = preferred?.join(",");
  const { top, rest: others } = useMemo(() => {
    const seen = new Set<string>();
    const pool: string[] = [];
    for (const raw of countriesKey !== undefined ? countriesKey.split(",") : COUNTRY_CODES) {
      const code = normalizeCountryCode(raw);
      if (code && !seen.has(code)) {
        seen.add(code);
        pool.push(code);
      }
    }
    const entry = (code: string): Entry => {
      const name = countryName(code, locale);
      return { code, name, folded: fold(name) };
    };
    const firsts: Entry[] = [];
    const picked = new Set<string>();
    for (const raw of preferredKey ? preferredKey.split(",") : []) {
      const code = normalizeCountryCode(raw);
      if (code && seen.has(code) && !picked.has(code)) {
        picked.add(code);
        firsts.push(entry(code));
      }
    }
    const compare = collator(locale).compare;
    const sorted = pool
      .filter((c) => !picked.has(c))
      .map(entry)
      .sort((a, b) => compare(a.name, b.name));
    return { top: firsts, rest: sorted };
  }, [countriesKey, preferredKey, locale]);

  // `filter: false` — the panel is handed the rows `search` ranks below instead of
  // the core's substring filter; the core still owns open, query, the highlighted row,
  // anchoring and dismissal.
  const allOptions = useMemo(
    () => [...top, ...others].map((e) => toOption(e, flags)),
    [top, others, flags],
  );
  const core = useComboboxCore<string>({ options: allOptions, filter: false });
  const { open, setOpen, query, triggerRef, closeToTrigger } = core;
  // The core anchors the panel to the trigger and hands focus back to it; the caller's
  // `ref` wants the same element. One callback feeds both.
  const setTrigger = useCallback(
    (el: HTMLButtonElement | null) => {
      triggerRef.current = el;
      assignRef(ref, el);
    },
    [ref, triggerRef],
  );

  const q = fold(query.trim());
  const results = useMemo(() => {
    const firsts = q ? search(top, q) : top;
    const below = q ? search(others, q) : others;
    // The heading only where it separates something: with no preferred country in
    // view it would head the whole list and divide nothing.
    const heading = firsts.length > 0 ? text.others : undefined;
    return [...firsts.map((e) => toOption(e, flags)), ...below.map((e) => toOption(e, flags, heading))];
  }, [top, others, q, text.others, flags]);

  // ── The lock ──────────────────────────────────────────────────────────────
  const reason = useCommitReason(commit, ownReason);
  const locked = hasMessage(reason);
  const inert = locked || Boolean(disabled);
  // A lock (or `disabled`) arriving while the list is up closes it — adjusted while
  // rendering, as the core adjusts its own query, so no frame shows a list that can
  // no longer be used.
  if (inert && open) setOpen(false);

  // ── The field ─────────────────────────────────────────────────────────────
  const generated = useId();
  const triggerId = id ?? generated;
  const listboxId = `${generated}-listbox`;
  const hintId = useId();
  const reasonId = useId();
  // Text is a caption under the field; a FieldHint rides the label line. See `hint`.
  const textHint = (typeof hint === "string" && hint !== "") || typeof hint === "number";
  const field = useComboboxFieldError(
    error,
    invalid || ariaInvalid === true || ariaInvalid === "true",
    // The caller's, then the standing advice, then (inside) the error — the order every
    // field keeps — and the lock's reason last, while there is one.
    mergeDescribedBy(ariaDescribedBy, textHint && hintId),
  );

  const code = normalizeCountryCode(value);
  const selectedName = code ? countryName(code, locale) : undefined;
  // A field named by a label of the caller's (`aria-labelledby`) is a labelled field too:
  // the label already says what goes here.
  const emptyText = placeholder ?? (label === undefined && !ariaLabelledBy ? text.country : "");
  const fieldName = typeof label === "string" ? label : text.country;
  const valueId = `${generated}-value`;
  // Named by the caller's element (a form's label) — then the shown text is the second
  // reference, as the composed name below has the value second; but only when it IS a
  // value or the caller's placeholder, never the `country` fallback word.
  const labelledBy =
    ariaLabel === undefined && ariaLabelledBy
      ? mergeDescribedBy(ariaLabelledBy, (selectedName !== undefined || Boolean(placeholder)) && valueId)
      : undefined;
  const name =
    labelledBy !== undefined
      ? undefined
      : (ariaLabel ??
        (selectedName !== undefined
          ? common.fieldValue(fieldName, selectedName)
          : placeholder
            ? common.fieldValue(fieldName, placeholder)
            : fieldName));

  const showClear = Boolean(clearable && code && !inert);
  // `onChange` widened to take the clear's `null` — its type says so once `clearable`
  // is set, and the clear is only ever offered then.
  const emit = onChange as (code: string | null) => void;
  const clear = () => {
    if (!showClear) return;
    emit(null);
  };

  const choose = (o: ComboOption<string>) => {
    if (inert) return;
    emit(o.value);
    // Back to the trigger: the panel holding focus is about to unmount, and a keyboard
    // user who has answered this field should stand on it, ready to Tab on.
    closeToTrigger();
  };

  const trigger = (
    <button
      ref={setTrigger}
      id={triggerId}
      type="button"
      // A closed choice that expands into the list below — the role every trigger
      // picker in the kit wears (see EntityCombobox), and the one that supports
      // `aria-invalid`.
      role="combobox"
      aria-haspopup="listbox"
      aria-controls={listboxId}
      aria-expanded={open}
      aria-label={name}
      aria-labelledby={labelledBy}
      aria-invalid={field.isInvalid || undefined}
      aria-required={ariaRequired}
      aria-describedby={mergeDescribedBy(field.describedBy, locked && reasonId)}
      // The focusable kind of disabled while locked (Button's rule): native `disabled`
      // would take the field out of the tab order, and the reason with it.
      disabled={locked ? undefined : disabled}
      aria-disabled={locked || undefined}
      onClick={(e) => {
        if (inert) {
          e.preventDefault();
          return;
        }
        setOpen((o) => !o);
      }}
      // Down/Up opens the list from the closed trigger, per the APG; Enter and Space
      // already do through the button's own click.
      onKeyDown={(e) => {
        if (inert) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setOpen(true);
        } else if (showClear && !open && (e.key === "Delete" || e.key === "Backspace")) {
          // The keyboard's clear: the "×" is out of the tab order (see `clearable`).
          e.preventDefault();
          clear();
        }
      }}
      className={cn(
        FIELD_TRIGGER,
        // `peer` dims the floating label with a natively disabled trigger, as Select's.
        "peer pe-9",
        label !== undefined && FIELD_FLOATING_PAD,
        inert && "cursor-not-allowed opacity-50",
        field.isInvalid && FIELD_INVALID,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {flags && code && <CurrencyFlag country={code.toLowerCase()} />}
        {/* A long name ("Saint Vincent and the Grenadines") truncates rather than
            widening the field: the kit is checked at 390px. */}
        <span
          id={valueId}
          className={cn("truncate", selectedName === undefined && "text-[var(--text-placeholder)]")}
        >
          {selectedName ?? emptyText}
        </span>
      </span>
      {showClear ? (
        /* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- tabIndex -1 inside
            the trigger <button>, so it never holds focus and a key handler here could never
            fire; the keys go to the trigger, where Delete and Backspace clear. A pointer
            shortcut, as on EntityCombobox. */
        <span
          role="button"
          tabIndex={-1}
          aria-label={comboText.clear}
          onClick={(e) => {
            e.stopPropagation();
            clear();
          }}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-placeholder)] hover:text-[var(--text-secondary)]"
        >
          <X aria-hidden className="size-4" />
        </span>
      ) : (
        <FieldChevron />
      )}
    </button>
  );

  const control = locked ? (
    // In a FRAGMENT, as Button does, so the Tooltip does not clone its bubble into the
    // description as well — the hidden copy is what `aria-describedby` points at.
    <Tooltip label={reason} className="flex w-full">
      <>
        {trigger}
        <span id={reasonId} hidden>
          {reason}
        </span>
      </>
    </Tooltip>
  ) : (
    trigger
  );

  const labelHint = textHint ? undefined : hasMessage(hint) ? hint : undefined;
  const box =
    label !== undefined ? (
      <FloatingField htmlFor={triggerId} label={label} staticLabel hint={labelHint}>
        {control}
      </FloatingField>
    ) : labelHint !== undefined ? (
      // No label line to ride: the "?" goes at the field's end, outside the box, as on
      // an unlabelled Select.
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">{control}</div>
        <span className="flex shrink-0 items-center">{labelHint}</span>
      </div>
    ) : (
      <div className="relative">{control}</div>
    );

  return (
    // `rest` dresses the wrapper — a `data-tour` anchor, a test id. The name, the
    // description and the invalid state are on the trigger above.
    <div {...rest} className={className}>
      {box}
      {textHint && (
        <p id={hintId} className="mt-1 text-caption leading-tight text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {field.errorEl}
      <ComboboxPanel
        // The core with the rows ranked above in place of its own filter's.
        core={{ ...core, results }}
        listboxId={listboxId}
        // On a phone the list is a full-screen sheet, which needs the field's own
        // name to say what it is asking for (live #200).
        sheetTitle={label ?? text.country}
        searchPlaceholder={text.search}
        isSelected={(v) => v === code}
        onChoose={choose}
        showCreate={false}
        onCreate={() => {}}
        createContent={null}
      />
    </div>
  );
}
