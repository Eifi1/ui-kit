import { useMemo, useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Check } from "lucide-react";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_INVALID, FIELD_FLOATING_PAD } from "./ui";
import { cn } from "../lib/cn";
import { DropdownPanel, DropdownSearchHeader, useDropdownSearch } from "./dropdown";
import {
  DEFAULT_COMMON_LABELS,
  DEFAULT_CURRENCY_LABELS,
  useKitLabels,
  useKitLocale,
} from "../i18n/kit-labels";

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  /** ISO 3166-1 alpha-2 country code (lowercase) used by flag-icons. */
  country: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "EUR", name: "Euro", symbol: "€", country: "eu" },
  { code: "USD", name: "US Dollar", symbol: "$", country: "us" },
  { code: "GBP", name: "British Pound", symbol: "£", country: "gb" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", country: "ch" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", country: "jp" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", country: "ca" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", country: "au" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", country: "nz" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", country: "se" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", country: "no" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", country: "dk" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", country: "pl" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", country: "cz" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", country: "hu" },
  { code: "RON", name: "Romanian Leu", symbol: "lei", country: "ro" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", country: "bg" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", country: "tr" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", country: "ru" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", country: "cn" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", country: "hk" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", country: "sg" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", country: "in" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", country: "br" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", country: "mx" },
  { code: "ZAR", name: "South African Rand", symbol: "R", country: "za" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", country: "il" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", country: "ae" },
];

export interface CurrencyFlagProps extends ComponentPropsWithoutRef<"span"> {
  /** ISO 3166-1 alpha-2, lowercase — the class flag-icons keys its sprite by. */
  country: string;
}

export function CurrencyFlag({ country, className, ...rest }: CurrencyFlagProps) {
  return (
    <span
      {...rest}
      // Stays `aria-hidden` whatever a caller passes: the flag is a picture of the
      // code printed next to it, and a reader that met both would hear the currency
      // twice.
      aria-hidden
      className={cn("fi inline-block w-5 h-[15px] rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)] shrink-0", `fi-${country}`, className)}
    />
  );
}

const CURRENCY_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string | null | undefined): CurrencyOption | undefined {
  return code ? CURRENCY_BY_CODE.get(code.toUpperCase()) : undefined;
}

/** The name to SHOW for a currency: the caller's translation if they have one for
 *  that code; else, when a `locale` is known, the name `Intl.DisplayNames` has for
 *  it in that locale; else the English name {@link CURRENCIES} carries. Shared with
 *  AmountInput, which renders the same list from the same data.
 *
 *  `Intl` only when a locale was actually GIVEN (by prop or `<UiKitProvider>`): an
 *  app that never set one keeps the shipped English names it has always shown,
 *  rather than whatever language the test runner or the browser happens to be in. */
export function currencyName(
  c: CurrencyOption,
  names?: Record<string, string>,
  locale?: string,
): string {
  const own = names?.[c.code];
  if (own !== undefined) return own;
  if (locale) {
    try {
      const shown = new Intl.DisplayNames([locale], { type: "currency" }).of(c.code);
      if (shown && shown !== c.code) return shown;
    } catch {
      // A malformed tag, or a runtime without `DisplayNames`: the shipped name.
    }
  }
  return c.name;
}

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
  labels,
  currencyNames,
  "aria-label": ariaLabel,
  ...rest
}: CurrencySelectProps) {
  const { open, setOpen, wrapperRef, query, setQuery, inputRef } = useDropdownSearch();
  // `labels` > `currency` from the provider > English.
  const text = useKitLabels("currency", DEFAULT_CURRENCY_LABELS, labels);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const locale = useKitLocale();

  const selected = getCurrency(value);
  const pool = useMemo(() => {
    if (!options) return CURRENCIES;
    // Keep the caller's order; drop codes we don't have a definition for.
    return options.map((code) => getCurrency(code)).filter((c): c is CurrencyOption => !!c);
  }, [options]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale);
    if (!q) return pool;
    return pool.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        currencyName(c, currencyNames, locale).toLocaleLowerCase(locale).includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [query, pool, currencyNames, locale]);

  const listboxId = `${useId()}-listbox`;

  // The trigger's NAME. A combobox does not take its name from its content, and the
  // floating label is a <span>, not a <label for> — so without `aria-label` from the
  // caller this trigger had no name at all (keksdose's test suite, 0.5.0). Composed the
  // way MultiSelect and the entity comboboxes compose theirs, "label: value", with the
  // `currency` word standing in for a missing label so it is never nameless.
  const fieldName = typeof label === "string" ? label : text.currency;
  const name = ariaLabel ?? common.fieldValue(fieldName, selected ? selected.code : (placeholder ?? text.currency));

  return (
    // The wrapper takes `rest`; the trigger takes the name. This field's label is a
    // floating <span> rather than a <label for>, so a caller who wants the control to
    // announce more than the code inside it has nowhere else to put it.
    <div {...rest} ref={wrapperRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      <button
        type="button"
        aria-label={name}
        onClick={() => setOpen((v) => !v)}
        // The implicit `button` role supports neither `aria-expanded` nor
        // `aria-invalid`, so this trigger previously wore a red border and announced
        // nothing about being invalid or about there being a list behind it. The role
        // that DESCRIBES it is the one that also supports the attributes — the same
        // treatment its siblings (MultiSelect, the entity comboboxes) now carry, so a
        // form row of pickers reads the same way throughout.
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        className={cn(FIELD_TRIGGER, "pr-9", label !== undefined && FIELD_FLOATING_PAD, invalid && FIELD_INVALID)}
      >
        {/* The trigger stays COMPACT — flag + code only — so it never clips in a
            narrow field; the full names live in the (wider) popup (feedback
            #308). */}
        <span className={cn("flex items-center gap-2 min-w-0", selected ? "text-[var(--text-primary)]" : "text-[var(--text-placeholder)]")}>
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
      {open && (
        <DropdownPanel
          // At least as wide as the trigger, but grows to fit the full currency
          // names and caps so it never runs off-screen. RIGHT-aligned so it grows
          // leftward instead of pushing the page width when there's content to the
          // right of the field (feedback #308).
          className="right-0 min-w-full w-max max-w-[min(20rem,calc(100vw-2rem))]"
          empty={filtered.length === 0}
          listProps={{ id: listboxId }}
          header={
            <DropdownSearchHeader
              query={query}
              onQueryChange={setQuery}
              inputRef={inputRef}
              placeholder={text.search}
            />
          }
        >
          {filtered.map((c) => {
              const active = c.code === selected?.code;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--bg-hover)]",
                      active && "bg-[var(--bg-active)]",
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <CurrencyFlag country={c.country} />
                      <span className="font-mono text-[var(--text-muted)] w-8 shrink-0">{c.symbol}</span>
                      <span className="font-medium text-[var(--text-primary)]">{c.code}</span>
                      <span className="text-[var(--text-muted)] truncate">{currencyName(c, currencyNames, locale)}</span>
                    </span>
                    {active && <Check className="size-4 text-[var(--text-secondary)] shrink-0" />}
                  </button>
                </li>
              );
            })}
        </DropdownPanel>
      )}
    </div>
  );
}
