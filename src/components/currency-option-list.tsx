import { useMemo } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { foldForSearch } from "../lib/text-match";
import { ComboboxPanel, type ComboboxCore, type ComboOption } from "./combobox-core";
import { CURRENCIES, type CurrencyOption } from "../currencies";

// The one list both currency pickers render (round 0.34 Wave 2, DUP-4). CurrencySelect
// re-exports the data under its own name, as it always has; the list is package-private.
// Its own module, so AmountInput can render the list without a cycle through
// currency-select. The data itself is ../currencies since 0.35: an entry of its own that
// imports nothing, which an app's build can read in Node (keksdose's flag subset).
export { CURRENCIES };
export type { CurrencyOption };

export interface CurrencyFlagProps extends ComponentPropsWithRef<"span"> {
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
      className={cn("fi inline-block w-5 h-[0.9375rem] rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)] shrink-0", `fi-${country}`, className)}
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

export interface CurrencyOptionListProps {
  /** The host's `useComboboxCore`: its trigger, its open state, its query. */
  core: ComboboxCore<string>;
  /** What the host's trigger names in `aria-controls`. */
  listboxId: string;
  /** The chosen code, if any — selected and checked in the list. */
  value: string | null | undefined;
  /** A currency was picked. The host closes the list. */
  onChoose: (code: string) => void;
  /** Only these ISO codes, in this order; codes the kit has no definition for are
   *  dropped. Default every one of {@link CURRENCIES}. */
  codes?: readonly string[];
  /** Translated names by code — see {@link currencyName}. */
  currencyNames?: Record<string, string>;
  locale?: string;
  searchPlaceholder: string;
  /** The phone sheet's title — the field's name. */
  sheetTitle: ReactNode;
}

/**
 * The currency list — its filter and its rows — that CurrencySelect and AmountInput's
 * currency chip both render, on the picker family's `ComboboxPanel` (round 0.34 Wave 2,
 * DUP-4 + BUG-12).
 *
 * The chip's list was a hand copy of CurrencySelect's, and it had drifted: the name kept a
 * plain `truncate` where T1 made CurrencySelect's wrap from Large up, it took no `options`
 * subset, it had no check mark and no listbox id, and it was a fixed 16rem where #308 had
 * given CurrencySelect a panel that grows to the full names. And both were lists of plain
 * buttons under a trigger that promised a listbox. On the shared panel they are a listbox
 * of options, the chosen one selected, with the arrow keys, the live result count, the
 * phone sheet (live #200) and portal anchoring (dev#548: an `overflow` ancestor clipped
 * the absolute panel's first third away).
 *
 * The panel hangs from the trigger's END edge and grows toward the start, as wide as the
 * names need up to 20rem and the glass (feedback #308: a field with content after it is
 * not pushed past the page).
 */
export function CurrencyOptionList({
  core,
  listboxId,
  value,
  onChoose,
  codes,
  currencyNames,
  locale,
  searchPlaceholder,
  sheetTitle,
}: CurrencyOptionListProps) {
  // Keyed on the codes' CONTENTS: an inline `options={["EUR", "CHF"]}` is a new array
  // every render.
  const codesKey = codes?.join(",");
  const pool = useMemo(
    () =>
      codesKey === undefined
        ? CURRENCIES
        : // The caller's order; codes the kit has no definition for are dropped.
          codesKey
            .split(",")
            .map((code) => getCurrency(code))
            .filter((c): c is CurrencyOption => c !== undefined),
    [codesKey],
  );
  const named = useMemo(
    () => pool.map((c) => ({ c, name: currencyName(c, currencyNames, locale) })),
    [pool, currencyNames, locale],
  );
  const byCode = useMemo(() => new Map(named.map((n) => [n.c.code, n])), [named]);

  // The code, the name the row SHOWS (so a translated list is searchable in the language
  // it is written in) and the symbol — folded as every kit list folds (DUP-5).
  const query = core.query;
  const results = useMemo(() => {
    const q = foldForSearch(query.trim(), locale);
    const hits = q
      ? named.filter(({ c, name }) => [c.code, name, c.symbol].some((s) => foldForSearch(s, locale).includes(q)))
      : named;
    return hits.map(
      ({ c, name }): ComboOption<string> => ({
        value: c.code,
        label: name,
        icon: <CurrencyFlag country={c.country} />,
      }),
    );
  }, [named, query, locale]);

  const chosen = getCurrency(value)?.code;
  return (
    <ComboboxPanel
      // The core with the currency filter's rows in place of its own.
      core={{ ...core, results }}
      listboxId={listboxId}
      searchPlaceholder={searchPlaceholder}
      sheetTitle={sheetTitle}
      isSelected={(code) => code === chosen}
      onChoose={(o) => onChoose(o.value)}
      showCreate={false}
      onCreate={() => {}}
      createContent={null}
      width={{ fit: true, maxRem: 20 }}
      align="end"
      renderOption={(o) => {
        const row = byCode.get(o.value);
        if (!row) return o.label;
        return (
          <>
            <span className="w-8 shrink-0 font-mono text-muted">{row.c.symbol}</span>{" "}
            <span className="shrink-0 font-medium text-primary">{row.c.code}</span>{" "}
            {/* The name wraps from Large up (round 0.34 T1); the code beside it is what a
                reader scans for, and it never shrinks. */}
            <span className="min-w-0 truncate-until-large text-muted">{row.name}</span>
          </>
        );
      }}
    />
  );
}
