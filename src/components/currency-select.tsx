import { useMemo } from "react";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { FieldChevron, FieldLabel, FIELD_TRIGGER, FIELD_FLOATING_PAD } from "./ui";
import { cn } from "../lib/cn";
import { DropdownPanel, DropdownSearchHeader, useDropdownSearch } from "./dropdown";

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

export function CurrencyFlag({ country, className }: { country: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("fi inline-block w-5 h-[15px] rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)] shrink-0", `fi-${country}`, className)}
    />
  );
}

const CURRENCY_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string | null | undefined): CurrencyOption | undefined {
  return code ? CURRENCY_BY_CODE.get(code.toUpperCase()) : undefined;
}

interface CurrencySelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  label?: ReactNode;
  /**
   * Restrict the pickable currencies to these ISO codes (e.g. only the
   * currencies actually present in a budget). Order is preserved. Defaults to
   * the full {@link CURRENCIES} list.
   */
  options?: string[];
}

export function CurrencySelect({ value, onChange, placeholder, className, label, options }: CurrencySelectProps) {
  const { open, setOpen, wrapperRef, query, setQuery, inputRef } = useDropdownSearch();

  const selected = getCurrency(value);
  const pool = useMemo(() => {
    if (!options) return CURRENCIES;
    // Keep the caller's order; drop codes we don't have a definition for.
    return options.map((code) => getCurrency(code)).filter((c): c is CurrencyOption => !!c);
  }, [options]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [query, pool]);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(FIELD_TRIGGER, "pr-9", label !== undefined && FIELD_FLOATING_PAD)}
      >
        {/* The trigger stays COMPACT — flag + code only — so it never clips in a
            narrow field; the full names live in the (wider) popup (feedback
            #308). */}
        <span className={cn("flex items-center gap-2 min-w-0", selected ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500")}>
          {selected ? (
            <>
              <CurrencyFlag country={selected.country} />
              <span className="font-medium">{selected.code}</span>
            </>
          ) : (
            placeholder ?? "Currency"
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
          header={
            <DropdownSearchHeader
              query={query}
              onQueryChange={setQuery}
              inputRef={inputRef}
              placeholder={placeholder ?? "Search currency"}
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
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800",
                      active && "bg-slate-100 dark:bg-slate-800",
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <CurrencyFlag country={c.country} />
                      <span className="font-mono text-slate-500 dark:text-slate-400 w-8 shrink-0">{c.symbol}</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{c.code}</span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">{c.name}</span>
                    </span>
                    {active && <Check className="size-4 text-slate-700 dark:text-slate-200 shrink-0" />}
                  </button>
                </li>
              );
            })}
        </DropdownPanel>
      )}
    </div>
  );
}
