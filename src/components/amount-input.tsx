import { forwardRef, useCallback, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { CURRENCIES, CurrencyFlag, getCurrency } from "./currency-select";
import { FIELD_BASE, FLOATING_INPUT_CLASS, FLOATING_LABEL_CLASS } from "./ui";
import { cn } from "../lib/cn";
import { useMediaQuery } from "../hooks/use-media-query";
import { CalculatorButton } from "./calculator";
import { NumberPadSheet } from "./numpad-sheet";
import { DropdownPanel, DropdownSearchHeader, useDropdownSearch } from "./dropdown";
import { commitExpression, sanitizeLive } from "../lib/calc";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  onCurrencyChange?: (code: string) => void;
  placeholder?: string;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, currency, onCurrencyChange, placeholder, label, disabled, className, id, ariaLabel }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const editable = !!onCurrencyChange;
    // On phones we suppress the OS keyboard (inputMode="none" below) and show our
    // own calculator numpad, so the desktop popover trigger is hidden. The
    // right-padding keys off showCalc, so it tightens up automatically.
    const isMobile = useMediaQuery("(max-width: 767px)", false);
    const showCalc = !disabled && !isMobile;
    const [focused, setFocused] = useState(false);
    // On mobile, focusing the field opens the numpad bottom sheet in place of the
    // native keyboard (feedback #334) — a full calculator keypad, not just the old
    // operator bar. An internal ref lets the sheet's "Done" blur the input, which
    // commits + closes via the existing onBlur handler.
    const showNumpad = isMobile && !disabled && focused;
    const innerRef = useRef<HTMLInputElement>(null);
    const setRefs = useCallback(
      (el: HTMLInputElement | null) => {
        innerRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [ref],
    );
    const commit = () => onChange(commitExpression(value));
    const { open, setOpen, wrapperRef, query, setQuery, inputRef } = useDropdownSearch();

    const selected = getCurrency(currency);
    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return CURRENCIES;
      return CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q),
      );
    }, [query]);

    return (
      <div ref={wrapperRef} className={cn("w-full", className)}>
        {/* Inner relative box holds the input + its absolutely-positioned
            trailing controls (calculator / currency), so those stay anchored to
            the INPUT even when the mobile math bar is rendered below (#334). */}
        <div className="relative w-full">
        <input
          ref={setRefs}
          id={fieldId}
          aria-label={ariaLabel}
          type="text"
          // On mobile suppress the OS keyboard so our numpad sheet owns entry; the
          // field keeps focus/caret. Desktop keeps the native decimal keypad.
          inputMode={isMobile ? "none" : "decimal"}
          autoComplete="off"
          disabled={disabled}
          placeholder={label !== undefined ? " " : placeholder}
          value={value}
          onChange={(e) => onChange(sanitizeLive(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            commit();
            setFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          className={cn(
            // With a label, use the floating-input padding (pt-4 pb-1) like every
            // other labelled field so the value sits BELOW the floated label rather
            // than vertically centred where it overlaps the resting label
            // (feedback #314). FLOATING_INPUT_CLASS already bundles the peer +
            // transparent-placeholder bits.
            label !== undefined ? FLOATING_INPUT_CLASS : FIELD_BASE,
            showCalc
              ? currency ? (editable ? "pr-24" : "pr-16") : "pr-10"
              : currency ? (editable ? "pr-20" : "pr-14") : "pr-3",
          )}
        />
        {label !== undefined && (
          <label htmlFor={fieldId} className={FLOATING_LABEL_CLASS}>
            {label}
          </label>
        )}
        {/* Trailing controls share one flex track so the calculator icon and the
            currency suffix/picker sit side by side without overlapping. */}
        <div className="absolute inset-y-1 right-1 flex items-center gap-0.5">
          {showCalc && <CalculatorButton value={value} onChange={onChange} className="px-1.5" />}
          {currency && !editable && (
            <span aria-hidden className="pointer-events-none px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {currency}
            </span>
          )}
          {currency && editable && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={selected ? `Currency: ${selected.code}` : "Currency"}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {currency}
              <ChevronDown className="size-3" />
            </button>
          )}
        </div>
        {editable && open && (
          <DropdownPanel
            className="right-0 top-full w-64"
            empty={filtered.length === 0}
            header={
              <DropdownSearchHeader
                query={query}
                onQueryChange={setQuery}
                inputRef={inputRef}
                placeholder="Search currency"
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
                        onCurrencyChange?.(c.code);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800",
                        active && "bg-slate-100 dark:bg-slate-800",
                      )}
                    >
                      <CurrencyFlag country={c.country} />
                      <span className="font-mono text-slate-500 dark:text-slate-400 w-8 shrink-0 text-xs">
                        {c.symbol}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{c.code}</span>
                      <span className="text-slate-500 dark:text-slate-400 truncate text-xs">{c.name}</span>
                    </button>
                  </li>
                );
              })}
          </DropdownPanel>
        )}
        </div>
        {showNumpad && (
          <NumberPadSheet value={value} onChange={onChange} onDone={() => innerRef.current?.blur()} label={label} />
        )}
      </div>
    );
  },
);

AmountInput.displayName = "AmountInput";
