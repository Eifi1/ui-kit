import { forwardRef, useCallback, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { CURRENCIES, CurrencyFlag, getCurrency } from "./currency-select";
import { FIELD_BASE, FIELD_DISPLAY, FLOATING_INPUT_CLASS, FLOATING_LABEL_CLASS, PHONE_QUERY } from "./ui";
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
  /** Focus the field on mount — on mobile this also opens the numpad sheet, so a
   *  new-transaction form can jump straight to amount entry (feedback #70). */
  autoFocus?: boolean;
  /**
   * Tint the typed figure by what it will DO (Keksdose feedback #167).
   *
   * The field is deliberately unitless — no sign, no symbol — because the direction
   * is chosen with a toggle beside it, not typed. That leaves the number itself
   * saying nothing about which way the money goes, on the one screen where getting
   * that backwards is the expensive mistake. Colour is the cheapest way to say it
   * continuously, and it costs no layout.
   *
   * Never the ONLY signal: the toggle it mirrors is right there, labelled, so this
   * is reinforcement rather than the sole carrier of the meaning.
   */
  tone?: "neutral" | "outflow" | "inflow";
  /**
   * How the field presents itself ON A PHONE (Keksdose feedback #176).
   *
   * `"field"` (default) is the labelled, bordered input used everywhere else.
   *
   * `"display"` keeps every mechanic — the same `<input>`, the same numpad sheet,
   * the same currency picker, the same commit/blur contract — and only drops the
   * chrome: no border, no fill, no floating label, the figure set at display size.
   * On a form whose whole point is one number, a bordered `text-sm` box draws the
   * amount at the same weight as the memo beside it; this makes it the headline
   * instead. It stays fully editable — the underline and the caret are what say so.
   *
   * Phone-only by construction: it keys off the same breakpoint as the numpad, so
   * from `md` up the field is byte-for-byte the normal one and a desktop grid keeps
   * its column rhythm.
   */
  variant?: "field" | "display";
  /**
   * Where the figure sits in its row, for `variant="display"` only (Keksdose
   * feedback #176 rework).
   *
   * `"start"` (default) keeps it flush left, in the reading column the fields
   * below it share — and it is what the entry forms use, because a figure that
   * starts at a known edge is legible at any width: when the value outgrows the
   * field, the digits that scroll out of sight are the trailing ones, not the
   * magnitude (Keksdose feedback #430 rework).
   *
   * `"center"` makes it a centred headline. It centres in the width that REMAINS
   * after the trailing currency control, not in the whole box: the control is
   * pinned to the right edge, so a plain `text-center` would centre the figure
   * under it and the last digits would sit behind the chip. This used to mirror
   * the control's reservation onto the left instead, which centred correctly but
   * spent twice the control's width on padding — fatal on a 375px screen, where
   * it left a 36px figure 16px to live in.
   */
  align?: "start" | "center";
}

const TONE_CLASS: Record<"neutral" | "outflow" | "inflow", string> = {
  neutral: "",
  outflow: "text-rose-600 dark:text-rose-400",
  inflow: "text-emerald-600 dark:text-emerald-400",
};

// The shared chrome-less treatment at money size. `tabular-nums` so digits don't
// reflow the figure as they are typed; FIELD_DISPLAY's own muted placeholder
// colour is what keeps an EMPTY form from painting its zero in the direction tint
// (`tone` is computed from 0, which reads as an inflow).
const DISPLAY_INPUT_CLASS = cn(
  FIELD_DISPLAY,
  "text-4xl font-semibold leading-tight tracking-tight tabular-nums",
);

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, currency, onCurrencyChange, placeholder, label, disabled, className, id, ariaLabel, autoFocus, tone = "neutral", variant = "field", align = "start" }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const editable = !!onCurrencyChange;
    // On phones we suppress the OS keyboard (inputMode="none" below) and show our
    // own calculator numpad, so the desktop popover trigger is hidden. The
    // right-padding keys off showCalc, so it tightens up automatically.
    const isMobile = useMediaQuery(PHONE_QUERY, false);
    const showCalc = !disabled && !isMobile;
    const [focused, setFocused] = useState(false);
    // On mobile, focusing the field opens the numpad bottom sheet in place of the
    // native keyboard (feedback #334) — a full calculator keypad, not just the old
    // operator bar. An internal ref lets the sheet's "Done" blur the input, which
    // commits + closes via the existing onBlur handler.
    const showNumpad = isMobile && !disabled && focused;
    // Gate the display treatment on the SAME `isMobile` the numpad uses rather than
    // on `max-md:` classes, so the two can never drift apart on the breakpoint —
    // and so the two shapes are separate class strings instead of one string
    // fighting itself through responsive overrides. `useMediaQuery` reads
    // synchronously on mount, so there is no field→figure flash.
    const asDisplay = variant === "display" && isMobile;
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
          // eslint-disable-next-line jsx-a11y/no-autofocus -- opt-in per call site (feedback #70)
          autoFocus={autoFocus}
          // On mobile suppress the OS keyboard so our numpad sheet owns entry; the
          // field keeps focus/caret. Desktop keeps the native decimal keypad.
          inputMode={isMobile ? "none" : "decimal"}
          autoComplete="off"
          disabled={disabled}
          // The floating-label pattern needs a blank placeholder for its
          // peer-placeholder-shown trick. The display shape has no floating label,
          // so it spends the placeholder on what an empty borderless form actually
          // needs: a zero to aim at, at full size. The caller supplies it because
          // only the app knows the locale's decimal separator.
          placeholder={asDisplay ? (placeholder ?? "0") : label !== undefined ? " " : placeholder}
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
            asDisplay ? DISPLAY_INPUT_CLASS : label !== undefined ? FLOATING_INPUT_CLASS : FIELD_BASE,
            // Room for the trailing controls. showCalc is always false on a phone,
            // so the display shape only ever has to clear the currency chip — and
            // it clears it by the chip's actual width (a text-sm code plus a
            // chevron, ~58px) rather than the 5rem the boxed shape reserves. On a
            // 375px screen those 16px are the difference between a readable figure
            // and a clipped one (feedback #430 rework).
            asDisplay
              ? currency ? (editable ? "pr-16" : "pr-12") : "pr-0"
              : showCalc
                ? currency ? (editable ? "pr-24" : "pr-16") : "pr-10"
                : currency ? (editable ? "pr-20" : "pr-14") : "pr-3",
            // Centred display shape: centre in what is LEFT of the currency chip.
            // `text-center` alone would centre the figure in the whole box, i.e.
            // partly underneath the chip; the padding above is what takes the chip
            // out of the centring, and nothing is added on the left because a
            // mirrored reservation would spend the width twice (see `align`).
            asDisplay && align === "center" && "text-center",
            // Last, so it wins over the base class's own text colour.
            TONE_CLASS[tone],
          )}
        />
        {label !== undefined && (
          // The display shape drops the label VISUALLY, not from the accessibility
          // tree: a 36px tinted figure at the top of a transaction form is legibly
          // the amount, but a screen reader still needs the name, and callers that
          // pass `label` without `ariaLabel` would otherwise be left with none.
          <label htmlFor={fieldId} className={asDisplay ? "sr-only" : FLOATING_LABEL_CLASS}>
            {label}
          </label>
        )}
        {/* Trailing controls share one flex track so the calculator icon and the
            currency suffix/picker sit side by side without overlapping. */}
        {/* The display shape has no box to inset from, so the controls align to the
            figure's own right edge and its baseline strip (`bottom-1`, matching the
            input's pb-1) instead of floating inside a field. */}
        <div
          className={cn(
            "absolute flex items-center gap-0.5",
            asDisplay ? "bottom-1 right-0" : "inset-y-1 right-1",
          )}
        >
          {showCalc && <CalculatorButton value={value} onChange={onChange} className="px-1.5" />}
          {currency && !editable && (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none px-1 font-medium text-slate-500 dark:text-slate-400",
                // A text-xs chip next to a 36px figure reads as a stray footnote.
                asDisplay ? "text-sm" : "text-xs",
              )}
            >
              {currency}
            </span>
          )}
          {currency && editable && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={selected ? `Currency: ${selected.code}` : "Currency"}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                asDisplay ? "text-sm" : "text-xs",
              )}
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
