import { forwardRef, useCallback, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { CURRENCIES, CurrencyFlag, getCurrency } from "./currency-select";
import { FIELD_BASE, FIELD_DISPLAY, FLOATING_INPUT_CLASS, FLOATING_LABEL_CLASS, PHONE_QUERY } from "./ui";
import { cn } from "../lib/cn";
import { useMediaQuery } from "../hooks/use-media-query";
import { CalculatorButton, type CalculatorButtonLabels } from "./calculator";
import { NumberPadSheet, type NumberPadSheetLabels } from "./numpad-sheet";
import { DropdownPanel, DropdownSearchHeader, useDropdownSearch } from "./dropdown";
import {
  commitExpression,
  evaluateExpression,
  formatResult,
  isBareAmount,
  looksLikeExpression,
  sanitizeLive,
  splitLeadingSign,
} from "../lib/calc";

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
  /** Every user-facing string this component and the two it composes own, so a
   *  translating host can supply its own. The package carries no translation
   *  catalog (see the README) — English defaults, each key optional, so the other
   *  consumer apps are unaffected. `currency` names the picker chip and is
   *  suffixed with the selected code; the rest are pass-through. */
  labels?: {
    currency?: string;
    currencySearch?: string;
    /** Names the calculator TRIGGER this component renders. `calculator` below
     *  names the controls inside the popover it opens. */
    calculatorTrigger?: string;
    pad?: NumberPadSheetLabels;
    calculator?: CalculatorButtonLabels;
  };
  /** Focus the field on mount — on mobile this also opens the numpad sheet, so a
   *  new-transaction form can jump straight to amount entry (feedback #70). */
  autoFocus?: boolean;
  /**
   * Tint the typed figure by what it will DO (Keksdose feedback #167).
   *
   * The direction is chosen with a toggle beside the field rather than typed, so
   * the digits alone say nothing about which way the money goes — on the one screen
   * where getting that backwards is the expensive mistake. Colour says it
   * continuously, and it costs no layout. It stays the MAIN indication (live #201
   * rework: *"The main indication shall still be the color"*); {@link negative}
   * renders the sign as a second, quieter signal in front of the figure.
   *
   * Never the ONLY signal: the toggle it mirrors is right there, labelled, so this
   * is reinforcement rather than the sole carrier of the meaning.
   */
  tone?: "neutral" | "outflow" | "inflow";
  /**
   * The SIGN of the figure, owned by the caller's direction control (Keksdose live
   * #201 rework: *"Outflow should be negative and inflow positive … the sign shall
   * be displayed but not necessarily be typed in"*).
   *
   * `value` stays the MAGNITUDE. The minus is glued on at render time and stripped
   * off again before anything is reported back, so the caller never sees its own
   * prefix echoed and no code path can end up applying it twice. That is the whole
   * cure: there is exactly ONE place the sign lives, and it is not the text.
   *
   * Because it is rendered rather than stored it cannot be deleted (the next render
   * puts it back), a select-all-and-retype keeps the direction, and the caret needs
   * no minding.
   */
  negative?: boolean;
  /**
   * A sign the user TYPED, or a calculation that resolved to a signed number.
   *
   * SET, never flip. A "-" means *"this is an outflow"*, so typing it twice says the
   * same thing twice — which is exactly what the rework asks for (*"Subtracting
   * values twice resulting in inflow -> outflow and back to inflow seems not
   * reasonable"*). "+" says the other direction.
   *
   * Its presence is what ARMS the whole sign behaviour. A field with no direction
   * control — an account's starting balance, a loan payment, a holding's cost —
   * passes neither prop and keeps a text that is the whole truth, minus included.
   */
  onNegativeChange?: (negative: boolean) => void;
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

// The consuming app's ONE money palette (`--money-expense` / `--money-income`),
// not a bespoke rose/emerald pairing: a figure being typed has to wear the same
// colour the same figure will wear once it is a row in the table behind the form
// (Keksdose dev#434). The utilities are unlayered and theme-aware, so no `dark:`
// variant is needed and they win over the field's own text colour regardless of
// where `cn` puts them.
const TONE_CLASS: Record<"neutral" | "outflow" | "inflow", string> = {
  neutral: "",
  outflow: "text-money-neg",
  inflow: "text-money-pos",
};

// The shared chrome-less treatment at money size. `tabular-nums` so digits don't
// reflow the figure as they are typed; FIELD_DISPLAY's own muted placeholder
// colour is what keeps an EMPTY form from painting its zero in the direction tint
// (`tone` is computed from 0, which reads as an inflow).
const DISPLAY_INPUT_CLASS = cn(
  FIELD_DISPLAY,
  "text-4xl font-semibold leading-tight tracking-tight tabular-nums",
);

/**
 * Is `text` the ANSWER to `previous`, or something typed OVER it?
 *
 * "The old text was a sum and the new one is bare" cannot tell those apart, and both
 * gestures are ordinary: select-all-and-retype after a typo, or backspacing "-20+"
 * back down to a fresh figure. Read as an answer, they move the direction chip — so
 * an outflow of 7 quietly booked +7.00 (live #201 rework).
 *
 * The question that does separate them is arithmetic, not shape: evaluate what the
 * text replaced and see whether this IS that number. "-12+30" → "18" still is, so a
 * sum that comes out positive still takes the chip with it; "-20+50" → "7" is not,
 * and "-20+" evaluates to nothing at all.
 */
function isResultOf(previous: string, text: string): boolean {
  const n = evaluateExpression(previous);
  return n !== null && formatResult(n) === text.trim();
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, currency, onCurrencyChange, placeholder, label, disabled, className, id, ariaLabel, autoFocus, tone = "neutral", negative = false, onNegativeChange, variant = "field", align = "start", labels }, ref) => {
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
    // The sign is DISPLAYED, not stored (live #201 rework). `value` is the
    // magnitude; the minus is glued on here and taken off again in handleText, so
    // the two can never disagree and the caller can never double-apply it. Only in
    // front of a bare amount: an expression being typed ("12-30") owns its own
    // minus and has to survive keystroke-for-keystroke.
    const signOwned = onNegativeChange !== undefined;
    const shown = signOwned && negative && isBareAmount(value) ? `-${value}` : value;
    // Every route into the field — typing, the numpad sheet, the desktop
    // calculator, the blur/Enter commit — funnels through here, so the split is
    // written once and the four entry paths cannot drift.
    //
    // `previous` is the text this one REPLACES, and it is what says whether a bare
    // figure arriving here is an answer or a magnitude. For the three paths that
    // edit the field's own text that is simply what the field was showing; the
    // desktop calculator keeps its expression in a popover the field never sees,
    // so it passes it in (see `CalculatorButton`'s `onChange`).
    const handleText = (raw: string, previous: string = shown) => {
      const text = sanitizeLive(raw);
      if (!signOwned) {
        onChange(text);
        return;
      }
      const { sign, rest } = splitLeadingSign(text);
      if (sign) {
        // SET, not flip: re-reporting the same sign on every keystroke is a no-op.
        onNegativeChange(sign === "-");
      } else if (looksLikeExpression(previous) && isBareAmount(text) && isResultOf(previous, text)) {
        // A calculation that just RESOLVED states its sign in both directions. The
        // figure it ran on is the SIGNED one the user could see — "-12+30" is +18 —
        // so a positive result has to move the chip too, or the field would answer
        // that sum with "-18" and contradict the arithmetic it just showed.
        //
        // Only when it really resolved, though: see {@link isResultOf}. A bare figure
        // arriving on top of an expression is far more often a replacement than an
        // answer, and reading it as an answer flips the direction of money.
        onNegativeChange(false);
      }
      onChange(sign ? rest : text);
    };
    const commit = () => handleText(commitExpression(shown));
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
          value={shown}
          onChange={(e) => handleText(e.target.value)}
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
          {showCalc && (
            <CalculatorButton
              value={shown}
              onChange={handleText}
              className="px-1.5"
              ariaLabel={labels?.calculatorTrigger}
              labels={labels?.calculator}
            />
          )}
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
              aria-label={
                selected ? `${labels?.currency ?? "Currency"}: ${selected.code}` : (labels?.currency ?? "Currency")
              }
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
                placeholder={labels?.currencySearch ?? "Search currency"}
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
          <NumberPadSheet
            value={shown}
            onChange={handleText}
            onDone={() => innerRef.current?.blur()}
            label={label}
            labels={labels?.pad}
          />
        )}
      </div>
    );
  },
);

AmountInput.displayName = "AmountInput";
