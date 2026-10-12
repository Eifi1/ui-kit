import { useId, useMemo, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { CurrencyOptionList, getCurrency } from "./currency-option-list";
import { useComboboxCore } from "./combobox-core";
import {
  FIELD_BASE,
  FIELD_DISPLAY,
  FIELD_INVALID,
  FLOATING_INPUT_CLASS,
  FloatingField,
} from "./field-base";
import { cn } from "../lib/cn";
import { currencyMinorDigits } from "../lib/format";
import { roundHalfAway } from "../lib/round";
import { CalculatorButton, type CalculatorButtonLabels } from "./calculator";
import { NumberPadSheet, type NumberPadSheetLabels } from "./numpad-sheet";
import {
  DEFAULT_COMMON_LABELS,
  DEFAULT_CURRENCY_LABELS,
  useKitLabels,
  useKitLocale,
  type CurrencyLabels,
} from "../i18n/kit-labels";
import {
  commitExpression,
  evaluateExpression,
  formatResult,
  isBareAmount,
  looksLikeExpression,
  sanitizeLive,
  splitLeadingSign,
} from "../lib/calc";
import {
  FieldCaption,
  LockedReason,
  mergeRefs,
  type DisabledReasonDisplay,
  type LockReason,
} from "./field-parts";
import { useEndWidth, useNumericField } from "./numeric-field";
import type { CommitScope } from "./write-lock";

/** {@link AmountInput}'s props — exported since 0.34 (refactor audit 2026-10, API-9): a
 *  wrapper typed itself off `ComponentProps<typeof AmountInput>` until then. */
export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  onCurrencyChange?: (code: string) => void;
  placeholder?: string;
  label?: ReactNode;
  disabled?: boolean;
  /** Required and unanswered — {@link FIELD_INVALID}. See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /**
   * What is wrong with the amount, in the caller's own words — {@link Input}'s `error`
   * (keksdose K4: "exceeds the outstanding balance" was a loose `<p>` beside the field
   * that nothing pointed at). Rendered under the field, after a text `hint`; merged into
   * `aria-describedby` after the caller's ids and the hint's; implies `invalid`, so the
   * field paints as well as announces. `null`, `false` and `""` are no message.
   * {@link MoneyField} takes it too.
   */
  error?: ReactNode;
  /**
   * Show the desktop calculator trigger (default `true`). `false` for an amount in an
   * ephemeral close-on-blur editor — a budget's assigned cell, a VAT cell (keksdose K6)
   * — where a click on the icon blurs the field and tears the editor down before the
   * popover can open. Typing a calculation ("200+50", then Enter) still evaluates, and
   * a phone keeps its numpad, exactly as {@link NumberInput}'s `calculator={false}`.
   */
  calculator?: boolean;
  /** The field's WRAPPER — width, a margin, a flex share. The `<input>` is
   *  `inputClassName`'s. */
  className?: string;
  /**
   * Classes for the `<input>` itself — {@link NumberInput}'s and {@link Input}'s prop of
   * the same name, merged the same way: after everything the field sets for LOOKS — the
   * base classes, the plain end padding, the display shape's centring and the `tone`
   * colour — so it can restyle the figure (`text-end` for a money column whose decimal
   * points line up, `font-medium`, a tighter `py-1` or a symmetric `px-2` in a table
   * cell, `text-transparent` while a figure is being re-fetched), and before what the
   * field needs to WORK: the end padding the calculator and the currency chip reserve,
   * and the invalid border. Neither of those can be taken away by accident — a caller's
   * `px-2` keeps its start edge and the digits still stop short of the chip, and a
   * borderless cell's `border-transparent` still turns red when the value is wrong.
   *
   * keksdose G7: the invoice's VAT cell right-aligns its figure, and with only
   * `className` (the wrapper) it reached the element through `[&_input]:text-end` — a
   * descendant selector that depends on the field's inner markup, which the kit is free
   * to change, and that a reader of the call site has to decode. {@link MoneyField}
   * passes it through, and `RhfMoneyField` takes it too.
   *
   * keksdose 0.24: until then it sat BEFORE the plain end padding (`pe-3`) and the tone,
   * so the budget's assigned cell could not make its padding symmetric (`px-2` came out
   * `px-2 pe-3`) and the holdings price could not hide an outflow-toned figure while
   * re-fetching — both were back on `[&_input]:` selectors on the wrapper.
   */
  inputClassName?: string;
  id?: string;
  /** Names the field when it has no visible `label` (a table cell, the display shape). */
  "aria-label"?: string;
  /** @deprecated 0.34 — use `aria-label`; removed in 0.35 (refactor audit 2026-10, API-1).
   *  Names the field only when `aria-label` is absent. */
  ariaLabel?: string;
  /**
   * Set on the `<input>`, with `id` above. Declared so `Field`'s render-prop spread —
   * `{(ids) => <AmountInput {...ids} … />}` — is typed and reaches the input: the
   * hint and error are described, a required amount is announced as required, and
   * `aria-invalid` paints {@link FIELD_INVALID} the way `invalid` does.
   */
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
  /**
   * BCP 47 tag for this field — {@link NumberInput}'s `locale` (0.34, DUP-10): the decimal
   * mark the field SHOWS and reads typing in ("1,5" for fr-CH, "1.5" for de-CH, as `Intl`
   * decides), and the language of the currency picker's search. Default the
   * `<UiKitProvider locale>`, else the runtime's. `value` and `onChange` stay
   * dot-decimal.
   */
  locale?: string;
  /** {@link NumberInput}'s `hint`, the same rule: a {@link FieldHint} "?" rides the
   *  label's own line, beside the label (not at the far end, where the calculator and
   *  the currency chip live); plain TEXT (a string or a number) is a caption UNDER
   *  the field, attached through `aria-describedby` after the caller's own. A phone's
   *  `variant="display"` has no visible label, so a FieldHint is dropped there; a
   *  caption still shows.
   *
   *  Since 0.34 a FieldHint is that caption at Large and on a touch screen, as on
   *  NumberInput since 0.32 (`useInlineHint`, docs/text-size-harmonization.md §4: a fact
   *  a finger cannot hover open is printed). A `HelpPopover` — help, not a fact (§10.23)
   *  — stays on the label line at every size. */
  hint?: ReactNode;
  /** Every user-facing string this component and the two it composes own, so a
   *  translating host can supply its own. Each key optional, and each a per-field
   *  override of the kit-wide translation in `<UiKitProvider labels>`: `currency`
   *  and `currencySearch` of its `currency` namespace, the rest of `calculator`.
   *  `currency` names the picker chip, composed with the selected code through
   *  `common.fieldValue`; the rest are pass-through. */
  labels?: {
    currency?: string;
    currencySearch?: string;
    /** Names the calculator TRIGGER this component renders. `calculator` below
     *  names the controls inside the popover it opens. */
    calculatorTrigger?: string;
    pad?: NumberPadSheetLabels;
    calculator?: CalculatorButtonLabels;
  };
  /** Translated currency names for the chip's picker, keyed by ISO code. The same
   *  sparse override `CurrencySelect` takes, and for the same reason: the names in
   *  `CURRENCIES` are shipped data, so without this they are the one English word
   *  left in a translated row. Not part of `labels` because it is keyed by DATA
   *  rather than by a fixed set of slots, and an app passes the same map to both
   *  pickers. */
  currencyNames?: Record<string, string>;
  /** Offer only these ISO codes in the chip's list, in this order — `CurrencySelect`'s
   *  `options`, since the chip renders CurrencySelect's list (round 0.34 Wave 2, DUP-4).
   *  Default every currency the kit knows. */
  currencyOptions?: string[];
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
   *
   * Since 0.15.5 it is drawn on its own too, for a read-only or disabled signed figure
   * (an "Items total" of −5.18): no `onNegativeChange` needed just to show the minus.
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
  /**
   * Decimals the committed amount is rounded to (kastlan 0.12: "12.345" and a
   * calculator's "100/3" reached a `Numeric(10,2)` column unrounded and failed with a
   * 422). Default: the currency's minor unit, from `Intl` (CHF and EUR 2, JPY 0). With
   * no `currency`, nothing is rounded unless this is set. Rounding is half away from
   * zero (12.345 → 12.35, -12.345 → -12.35) and happens when the figure settles: on
   * blur, on Enter, and on every result the calculator writes back. Keystrokes are left
   * alone, so "12.3" can still become "12.34".
   *
   * ⚠️ **A unit price or a rate needs `digits`.** The default is right for an amount of
   * money and silently wrong for a price per unit: a fund's NAV of 123.4567 or fuel at
   * 1.789 €/l is stored as 123.46 / 1.79, and no test fails (keksdose G2, a
   * `Numeric(18,6)` holding price and a `Numeric(18,4)` unit price). Pass the column's
   * scale: `digits={4}`, `digits={6}`.
   *
   * **Set `digits` for any sub-currency scale** — not only a price: any field whose
   * column holds more decimals than the currency's minor unit. A split line stored at
   * the ledger's 4dp (`Numeric(18,4)`) and loaded as 12.3456 is SHOWN as 12.35, and
   * committed as 12.35 as soon as the user tabs through it (blur settles) — so the form
   * no longer equals what the server holds: the lines stop summing to the 4dp total,
   * and Save is held (keksdose live #240). With a `currency`, every commit rounds to that currency's
   * minor unit unless `digits` says otherwise: pass the column's scale (`digits={4}`).
   */
  digits?: number;
  /** The smallest amount the field settles on. A lower figure is raised to it when it
   *  settles, like `digits`. Compared with the signed figure. */
  min?: number;
  /** The largest amount the field settles on (a deposit release capped at the
   *  balance). A higher figure is lowered to it when it settles. */
  max?: number;
  /**
   * The SETTLED figure, dot-decimal, sign included — fired on blur, on Enter, on the
   * numpad's "=" and on every result the calculator writes back, never on a keystroke
   * ("1200+" is not a figure yet). `onChange` still reports every keystroke; this is
   * for a host that stores a number and must not see drafts (kastlan 52; see
   * {@link MoneyField}, which is built on it).
   */
  onCommit?: (value: string) => void;
  /**
   * Why the amount cannot be changed — {@link NumberInput}'s `disabledReason` (0.34,
   * round 0.34 C2), for an amount that SAVES itself: a budget row's assigned cell, a
   * price committed on blur. `disabled` takes the field out of the tab order, so the
   * reason never reached a keyboard.
   *
   * With a reason the field stays in the tab order and shows its figure, `readOnly` (the
   * settled grey FIELD_BASE gives a `[readonly]` field) and `aria-disabled`. Nothing
   * changes the amount: the calculator and the phone's numpad are not offered, the
   * currency chip is a read-out rather than a picker, and neither blur nor Enter
   * settles — so `onChange`, `onCommit`, `onNegativeChange` and `onCurrencyChange` are
   * never called. Enter is swallowed, so the field does not submit the form around it.
   * The reason is a line under the field at Large and on a touch screen, else in the kit
   * {@link Tooltip} (`disabledReasonDisplay`), and on the input's `aria-describedby`,
   * between the caption and the error. Wins over `disabled`. {@link MoneyField} and
   * `RhfMoneyField` take it too.
   */
  disabledReason?: ReactNode;
  /**
   * Where the reason shows — {@link Button}'s `disabledReasonDisplay`: by default a line
   * under the field at Large and on a touch screen, the tooltip otherwise (§4 "No fact
   * only in a tooltip"; DUP-3, refactor audit 2026-10).
   */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /**
   * This amount COMMITS — {@link Button}'s `commit`, NumberInput's: under a locked
   * {@link WriteLockProvider} it is locked the `disabledReason` way with the lock's reason
   * (which wins over its own). An amount that only reaches the server through its form's
   * Save leaves this off and stays editable under the lock; the Save takes `commit`. No
   * provider, or an unlocked one: no effect.
   */
  commit?: CommitScope;
  /** The `<input>`. A React 19 ref prop since 0.34 (MOD-4, refactor audit 2026-10); it
   *  was `forwardRef`. */
  ref?: Ref<HTMLInputElement>;
}


/**
 * A settled figure, rounded to `digits` (half away from zero) and clamped to
 * `min`/`max`. Only a plain number is touched. A half-typed draft or an expression
 * comes back as it was. Rounding is `lib/round.ts`'s, shared with `roundToCurrency`
 * (BUG-11: this copy blanked "0.0000001" and a 22-digit figure on blur).
 */
function settleAmount(text: string, digits: number | undefined, min?: number, max?: number): string {
  const t = text.trim();
  if (!/^-?\d*\.?\d*$/.test(t) || !/\d/.test(t)) return text;
  let n = Number(t);
  if (!Number.isFinite(n)) return text;
  if (digits !== undefined) n = roundHalfAway(n, digits);
  if (min !== undefined && n < min) n = min;
  if (max !== undefined && n > max) n = max;
  const out = formatResult(n);
  // Unchanged figures keep their own spelling ("12.50" stays "12.50").
  return Number(out) === Number(t) ? text : out;
}

// The locale's decimal mark and the grouping parse (kastlan 40, keksdose G1) live in
// `lib/decimal-marks.ts`, read through the engine NumberInput and this field share
// (`numeric-field.ts`, DUP-10).

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
function isResultOf(previous: string, text: string, settle: (text: string) => string): boolean {
  const n = evaluateExpression(previous);
  // Compared settled, since the field rounds what the calculator hands it.
  return n !== null && settle(formatResult(n)) === text.trim();
}

export function AmountInput(props: AmountInputProps) {
  const { ref, value, onChange, currency, onCurrencyChange, placeholder, label, className, inputClassName, id, "aria-label": ariaLabelAttr, ariaLabel: ariaLabelProp, "aria-required": ariaRequired, autoFocus, tone = "neutral", negative = false, onNegativeChange, align = "start", labels, currencyNames, currencyOptions, digits: digitsProp, min, max, onCommit, disabledReasonDisplay } = props;
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  // The sign is DISPLAYED, not stored (live #201 rework). `value` is the
  // magnitude; the minus is glued on here and taken off again in handleText, so
  // the two can never disagree and the caller can never double-apply it. Only in
  // front of a bare amount: an expression being typed ("12-30") owns its own
  // minus and has to survive keystroke-for-keystroke.
  const signOwned = onNegativeChange !== undefined;
  // The sign is DRAWN whenever `negative` says so, handler or not (keksdose live #366):
  // a read-only or disabled total ("−5.18") used to need a dummy `onNegativeChange`
  // just to show its minus. Without the handler there is nothing to toggle — a typed
  // minus simply stays in the text, as in any field without a direction control.
  const shown = negative && isBareAmount(value) ? `-${value}` : value;
  // What the user SEES is `shown` with the locale's decimal mark (kastlan 40: a
  // fr-CH user typed "1,5" and watched it turn into "1.5" under their fingers). Display only — `value`, `onChange`, the sign split and the settle all
  // stay dot-decimal, because that string is the contract: RhfMoneyField's
  // `parseAmount`, every app's `Number(value)` and the calculator's evaluator read
  // it. The way back is free: {@link sanitizeLive} already folds a typed "," into
  // ".", so a comma typed, pasted or tapped on the numpad lands as a dot.
  //
  // One character for one character, and no digit grouping: the caret stays where
  // the typist put it, and "1.000" cannot be read back as a thousand in one locale
  // and as one in the other. de-CH and it-CH are "." — CLDR says so, and this
  // follows `Intl` rather than a guess about a country. The field's own `locale`,
  // else the provider's (0.34, DUP-10).
  const locale = useKitLocale(props.locale);
  // Decimals the figure settles to: `digits`, else the currency's minor unit.
  const digits = digitsProp ?? currencyMinorDigits(currency);
  const settle = (text: string) => settleAmount(text, digits, min, max);
  // The engine NumberInput shares (DUP-10): the lock (focusable, `readOnly`, nothing
  // changes or settles — see `disabledReason`), the hint — a FieldHint is its words at
  // Large and on touch, §4 — the error, the description's order, the typist's draft
  // in the locale's mark, the calculator and the numpad. On a phone the OS keyboard
  // is suppressed for the numpad sheet (feedback #334), and the display shape keys off
  // the SAME phone layout, so the two can never drift apart on the breakpoint.
  //
  // A value the HOST set (not one typed here) is shown at the currency's minor unit
  // while the field is not being edited: an FX estimate of 93.4213 showed four
  // decimals (keksdose live #356). Display only — `value` is the host's, untouched.
  const numeric = useNumericField(props, {
    settle,
    display: (focused) => (focused ? shown : settleAmount(shown, digits)),
  });
  const { lock, locked, off, isMobile, asDisplay, showCalc, showNumpad, setFocused, mark, draft, setDraft, derived } =
    numeric;
  const invalid = numeric.isInvalid;
  // A locked chip is a read-out: picking a currency is a change too.
  const editable = !!onCurrencyChange && !locked;
  // Room for the trailing controls — the calculator and the currency chip — once
  // measured, as NumberInput reserves its own (keksdose live #367, DUP-10): their
  // width, the track's `end-1` inset in the boxed shape, and NumberInput's 4px gap.
  // Before that (the first paint, and wherever there is no layout) the classes below
  // stand in. showCalc is always false on a phone, so the display shape only has to
  // clear the chip, by its own width rather than the boxed shape's room (feedback #430
  // rework: on a 375px screen 16px decide between a readable figure and a clipped one).
  const hasEnd = showCalc || Boolean(currency);
  const [endRef, endWidth] = useEndWidth(hasEnd);
  const trailingRoom = asDisplay
    ? currency ? (editable ? "pe-16" : "pe-12") : undefined
    : showCalc
      ? currency ? (editable ? "pe-24" : "pe-16") : "pe-10"
      : currency ? (editable ? "pe-20" : "pe-14") : undefined;
  const innerRef = useRef<HTMLInputElement>(null);
  const setRefs = useMemo(() => mergeRefs(innerRef, ref), [ref]);
  // While the typist is typing, the field shows THEIR text ("1.234,5" stays exactly
  // that), not the value re-spelt: re-spelling turned a grouping "." into a "," under
  // their fingers, after which no rule could tell the two apart (keksdose G1). The
  // draft only while it says what the field holds AND holds nothing the live
  // sanitising would drop — a letter, a second decimal point (see `showsTyped`); a
  // value set from outside, a calculator result or a commit shows the derived spelling.
  const display =
    draft === null
      ? derived
      : (numeric.typedFor(shown) ??
        // The caller owns the sign: the typed "12" is shown as the "-12" it is.
        (signOwned && negative && shown.startsWith("-") && numeric.typedFor(shown.slice(1)) !== null
          ? `-${draft}`
          : derived));
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
    } else if (looksLikeExpression(previous) && isBareAmount(text) && isResultOf(previous, text, settle)) {
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
  const commit = () => {
    setDraft(null);
    const settled = settle(commitExpression(shown));
    handleText(settled);
    onCommit?.(settled);
  };
  const typed = (raw: string) => handleText(numeric.read(raw));
  // The currency list is CurrencySelect's (round 0.34 Wave 2, DUP-4) on the picker
  // family's core: the chip was a hand copy of it and had drifted (no wrap at Large, no
  // `options` subset, no check mark, no listbox id, no #308 width), and both were plain
  // buttons under a listbox promise. `filter: false`: the list filters its own rows.
  const core = useComboboxCore<string>({ filter: false, backCloses: true });
  // `chipRef`: the chip the currency list hangs off (Keksdose dev#548: portalled, so the
  // panel needs a real trigger rect rather than a relative parent). It is also where
  // Escape and a pick hand focus back (round 0.34 BUG-1): Safari does not focus a
  // clicked button, so "whatever held focus" is not the chip.
  const { open, setOpen, closeToTrigger, triggerRef: chipRef } = core;
  const listboxId = `${generatedId}-currencies`;
  // A lock arriving while the list is up closes it, as on CountrySelect — adjusted
  // while rendering, so no frame shows a list that can no longer be used.
  if (!editable && open) setOpen(false);

  // The currency chip's strings are the `currency` namespace — the same two
  // `CurrencySelect` resolves, under this component's older key names. The
  // calculator and the numpad resolve `calculator` themselves; `labels.calculator`
  // and `labels.pad` are handed straight through to them as overrides.
  // The two strings read out first, so the memo depends on them and not on the
  // caller's `labels` object (a new one every render) — what the React Compiler infers.
  const currencyLabel = labels?.currency;
  const currencySearchLabel = labels?.currencySearch;
  const currencyOverrides = useMemo(() => {
    const out: Partial<CurrencyLabels> = {};
    if (currencyLabel !== undefined) out.currency = currencyLabel;
    if (currencySearchLabel !== undefined) out.search = currencySearchLabel;
    return out;
  }, [currencyLabel, currencySearchLabel]);
  const currencyText = useKitLabels("currency", DEFAULT_CURRENCY_LABELS, currencyOverrides);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);

  const selected = getCurrency(currency);

  return (
    <div className={cn("w-full", className)}>
      {/* Inner relative box holds the input + its absolutely-positioned
          trailing controls (calculator / currency), so those stay anchored to
          the INPUT even when the mobile math bar is rendered below (#334). It is
          the kit's FloatingField, which draws the label — floating, or sr-only in
          the display shape — and puts a FieldHint on the label's line, as it does
          for NumberInput. */}
      {/* Locked, the field sits in the reason's frame (LockedReason: the line, or the
          Tooltip), as NumberInput does; the root above keeps `className`, so nothing
          reflows. */}
      <LockedOrNot lock={lock} display={disabledReasonDisplay}>
      <FloatingField
        className="w-full"
        htmlFor={fieldId}
        label={label}
        srOnlyLabel={asDisplay}
        hint={numeric.hint.labelHint}
      >
      <input
        ref={setRefs}
        id={fieldId}
        // The DOM spelling wins; `ariaLabel` is the fallback for call sites not moved yet.
        aria-label={ariaLabelAttr ?? ariaLabelProp}
        type="text"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- opt-in per call site (feedback #70)
        autoFocus={autoFocus}
        // On mobile suppress the OS keyboard so our numpad sheet owns entry; the
        // field keeps focus/caret. Desktop keeps the native decimal keypad.
        inputMode={isMobile ? "none" : "decimal"}
        autoComplete="off"
        disabled={off}
        // Locked: focusable, `readOnly`, `aria-disabled` — see `disabledReason`.
        readOnly={locked || undefined}
        aria-disabled={locked || undefined}
        // The floating-label pattern needs a blank placeholder for its
        // peer-placeholder-shown trick. The display shape has no floating label,
        // so it spends the placeholder on what an empty borderless form actually
        // needs: a zero to aim at, at full size. The caller supplies it because
        // only the app knows the locale's decimal separator.
        placeholder={asDisplay ? (placeholder ?? "0") : label !== undefined ? " " : placeholder}
        value={display}
        onChange={(e) => {
          if (!locked) typed(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Nothing settles under the lock — not even a draft typed before it arrived,
          // which stays in the field for when it lifts.
          if (!locked) commit();
          setFocused(false);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          // Locked: Enter submits no form and settles nothing.
          if (locked) e.preventDefault();
          else commit();
        }}
        className={cn(
          // With a label, use the floating-input padding (pt-4 pb-1) like every
          // other labelled field so the value sits BELOW the floated label rather
          // than vertically centred where it overlaps the resting label
          // (feedback #314). FLOATING_INPUT_CLASS already bundles the peer +
          // transparent-placeholder bits.
          asDisplay ? DISPLAY_INPUT_CLASS : label !== undefined ? FLOATING_INPUT_CLASS : FIELD_BASE,
          // The plain end padding, with nothing trailing: cosmetic, so the caller's
          // to change (keksdose 0.24 — a symmetric `px-2` in a budget cell).
          !trailingRoom && (asDisplay ? "pe-0" : "pe-3"),
          // Centred display shape: centre in what is LEFT of the currency chip.
          // `text-center` alone would centre the figure in the whole box, i.e.
          // partly underneath the chip; the padding below is what takes the chip
          // out of the centring, and nothing is added at the start because a
          // mirrored reservation would spend the width twice (see `align`).
          asDisplay && align === "center" && "text-center",
          // Over the base class's own text colour.
          TONE_CLASS[tone],
          // The caller's, over all of the above — base, plain padding, alignment and
          // tone — and under only what the field needs to work (see `inputClassName`).
          inputClassName,
          // Room for the trailing controls, after the caller's so a `px-2` cannot run
          // the digits under the chip (NumberInput's order, which reserves its unit
          // and calculator the same way).
          trailingRoom,
          invalid && FIELD_INVALID,
          locked && "cursor-not-allowed",
        )}
        // The classes above are the fallback; once measured the field reserves exactly
        // its trailing controls' width, inline so it wins over every class (see
        // `trailingRoom`).
        style={hasEnd && endWidth != null ? { paddingInlineEnd: endWidth + (asDisplay ? 4 : 8) } : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={numeric.describedBy}
        aria-required={ariaRequired}
      />
      {/* The label is FloatingField's, after these children (the floating trick
          reads the input through `peer-*`). The display shape drops it VISUALLY,
          not from the accessibility tree: a 36px tinted figure at the top of a
          transaction form is legibly the amount, but a screen reader still needs
          the name, and callers that pass `label` without `aria-label` would
          otherwise be left with none. */}
      {/* Trailing controls share one flex track so the calculator icon and the
          currency suffix/picker sit side by side without overlapping. */}
      {/* The display shape has no box to inset from, so the controls align to the
          figure's own end edge and its baseline strip (`bottom-1`, matching the
          input's pb-1) instead of floating inside a field. */}
      <div
        // Measured for the input's end padding (see `trailingRoom`).
        ref={endRef}
        className={cn(
          "absolute flex items-center gap-0.5",
          // Logical `end-*`: the chip and the calculator are the figure's trailing
          // controls, so a right-to-left form carries them on the left.
          asDisplay ? "bottom-1 end-0" : "inset-y-1 end-1",
        )}
      >
        {showCalc && (
          <CalculatorButton
            // The mark the field shows but not the typist's grouping: the evaluator
            // reads either mark, and "1.234,5" is two of them. The result comes back
            // dot-decimal.
            value={derived}
            onChange={(result, expression) => {
              setDraft(null);
              const settled = settle(result);
              handleText(settled, expression);
              onCommit?.(settled);
            }}
            className="px-1.5"
            aria-label={labels?.calculatorTrigger}
            labels={labels?.calculator}
          />
        )}
        {currency && !editable && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none px-1 font-medium text-muted",
              // A text-xs chip next to a 36px figure reads as a stray footnote.
              asDisplay ? "text-sm" : "text-xs",
            )}
          >
            {currency}
          </span>
        )}
        {currency && editable && (
          <button
            ref={chipRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            // A button that opens a listbox, and says so: the chip is a control inside
            // a text field, not a field of its own, so not a combobox.
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-label={
              // "Currency: EUR" through `common.fieldValue`, not a template literal:
              // the colon-and-space is punctuation a translation has to own.
              selected ? common.fieldValue(currencyText.currency, selected.code) : currencyText.currency
            }
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 font-medium text-secondary hover:bg-hover",
              asDisplay ? "text-sm" : "text-xs",
            )}
          >
            {currency}
            <ChevronDown className="size-3" />
          </button>
        )}
      </div>
      {editable && (
        <CurrencyOptionList
          core={core}
          listboxId={listboxId}
          value={currency}
          codes={currencyOptions}
          currencyNames={currencyNames}
          locale={locale}
          searchPlaceholder={currencyText.search}
          // The phone sheet's title: what the chip is for.
          sheetTitle={currencyText.currency}
          onChoose={(code) => {
            onCurrencyChange?.(code);
            closeToTrigger();
          }}
        />
      )}
      </FloatingField>
      </LockedOrNot>
      {/* Outside the relative box, as NumberInput's caption is: the trailing
          controls are `inset-y-1` in it and would stretch down over a second line. */}
      <FieldCaption parts={numeric.hint} />
      {/* The news after the standing advice, as Select orders them. The root is
          already a steady box, so the message coming and going remounts nothing. */}
      {numeric.errorEl}
      {showNumpad && (
        <NumberPadSheet
          // Localised like the field it mirrors. Keys are typing, read by the
          // locale's marks like the keyboard's; "=" is a result, dot-decimal.
          value={display}
          onChange={typed}
          onResult={(result) => {
            setDraft(null);
            const settled = settle(result);
            handleText(settled);
            onCommit?.(settled);
          }}
          onDone={() => innerRef.current?.blur()}
          label={label}
          labels={labels?.pad}
          decimalMark={mark}
        />
      )}
    </div>
  );
}

/** The field in its lock's {@link LockedReason} while locked, as it is otherwise. A
 *  component rather than a ternary so the field's JSX is written once. `block w-full`:
 *  the frame's box stands where the field's own did. */
function LockedOrNot({
  lock,
  display,
  children,
}: {
  lock: LockReason;
  display: DisabledReasonDisplay | undefined;
  children: ReactNode;
}) {
  if (!lock.locked) return <>{children}</>;
  return (
    <LockedReason lock={lock} display={display} className="block w-full">
      {children}
    </LockedReason>
  );
}
