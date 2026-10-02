import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { CalculatorButton, type CalculatorButtonLabels } from "./calculator";
import { NumberPadSheet, type NumberPadSheetLabels } from "./numpad-sheet";
import { FIELD_BASE, FIELD_DISPLAY, FIELD_INVALID, FLOATING_INPUT_CLASS, FloatingField, PHONE_QUERY } from "./ui";
import { CURRENCIES } from "./currency-select";
import { hasMessage, mergeDescribedBy } from "./choice-parts";
import { cn } from "../lib/cn";
import { commitExpression, formatResult } from "../lib/calc";
import { decimalMark, localizeMark, readTyped, showsTyped } from "../lib/decimal-marks";
import { useMediaQuery } from "../hooks/use-media-query";
import { useKitLocale } from "../i18n/kit-labels";

interface NumberInputProps {
  /** The text, DOT-decimal ("1234.5", or a calculation being typed: "12+5"), as
   *  `onChange` reports it — so a caller's `Number(value)` reads it. The field SHOWS it
   *  in the locale's mark (see `locale`). A comma here is read as the decimal mark too,
   *  never as grouping. */
  value: string;
  /** Fired on every keystroke with the text as a number reads it: grouping marks read
   *  off ("1.234,56" → "1234.56" for a German typist, keksdose K5), the decimal mark
   *  folded to a dot, operators kept so a typed expression survives. */
  onChange: (value: string) => void;
  /** Fired on blur/Enter with the *evaluated* value — use this for save-on-blur
   * fields so the save always sees the resolved number, never "10+5". */
  onCommit?: (value: string) => void;
  label?: ReactNode;
  ariaLabel?: string;
  /** Names for the calculator this field renders — its trigger, and the controls
   *  inside the popover — and for the numpad sheet it opens on a phone. Overrides
   *  for THIS field only: both resolve the `calculator` namespace of
   *  `<UiKitProvider labels>` themselves, then fall back to English.
   *
   *  `pad` is not optional plumbing: this field renders a {@link NumberPadSheet}
   *  exactly as {@link AmountInput} does, but had no way to pass it anything, so
   *  the SAME keypad announced itself in German when a money field opened it and in
   *  English when a goal target did. */
  labels?: {
    calculatorTrigger?: string;
    calculator?: CalculatorButtonLabels;
    pad?: NumberPadSheetLabels;
  };
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Wrapper class. */
  className?: string;
  /** Overrides the input's own styling (merged after the field base). */
  inputClassName?: string;
  id?: string;
  /** Show the calculator-popover trigger (default true). Set false for fields in
   * an ephemeral close-on-blur editor, where clicking the icon would blur away
   * and tear the editor down before the popover could open — inline typing
   * (e.g. "200+50" → Enter) still evaluates there. */
  calculator?: boolean;
  /** {@link FIELD_DISPLAY} — on a phone, the figure at display size with the field
   *  chrome dropped. The currency-free half of the same treatment `AmountInput`
   *  carries, for a dialog whose whole point is the one number (a budget goal's
   *  target); not for a field among many, and never for the compact inline
   *  editors this control also serves. */
  variant?: "field" | "display";
  /** A {@link FieldHint} "?" on the label's own line, beside the label rather
   *  than at the far end of the strip — the far end is where the calculator
   *  lives, and a hint placed there landed on top of it (steering-design
   *  feedback #48). Plain TEXT (a string or a number) is a caption instead, UNDER
   *  the field and attached through `aria-describedby` after the caller's own —
   *  the same rule as {@link Select}'s `hint`: the label line has no room for a
   *  sentence, and one placed there ran over the label and into the value. */
  hint?: ReactNode;
  /** Required and unanswered — {@link FIELD_INVALID}. See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /**
   * What is wrong with the value, in the caller's own words — {@link Input}'s `error`,
   * the same anatomy (keksdose K5/K4: of the kit's fields only `Input` and
   * `NumberField` had one, so a goal target or a rate field wrote its message as a
   * loose `<p>` that nothing pointed at). Rendered under the field, after a text
   * `hint`; merged into `aria-describedby` after the caller's ids and the hint's; and
   * it implies `invalid`, so the field paints as well as announces. `null`, `false`
   * and `""` — a `touched && errors.x` on the happy path — are no message.
   *
   * Passing the key at all (even `undefined`) keeps the field in a steady wrapper,
   * message or not, so the message coming and going never remounts the `<input>` and
   * takes the caret with it — see `Input`'s `FieldGroup`. A field that never passes
   * `error` renders exactly the DOM it did before the prop existed.
   */
  error?: ReactNode;
  /**
   * BCP 47 tag that decides the decimal mark the field SHOWS; default the
   * `<UiKitProvider locale>`, else the runtime's (keksdose K5). A French or Italian
   * reader sees "3,5", a German one too, de-CH and en-US see "3.5" — `Intl`
   * decides, not a guess about a country. Display only: `value` and `onChange` stay
   * dot-decimal. {@link NumberField} passes its own `locale` through here.
   */
  locale?: string;
  /**
   * Set on the `<input>`, with `id` above. Declared so `Field`'s render-prop spread —
   * `{(ids) => <NumberInput {...ids} … />}` — is typed and reaches the input: the hint
   * and error are described, a required number is announced as required, and
   * `aria-invalid` paints {@link FIELD_INVALID} the way `invalid` does.
   */
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
  /**
   * A static unit shown at the field's right edge — "%", "kg", "km/h".
   *
   * The read-out half of {@link AmountInput}'s currency chip, and it exists for the
   * same reason that one does: a unit belongs to the FIELD, not to the text, so
   * typing it is a way to get it into the value. Keksdose had a percentage spelled
   * three different ways across three screens — `<Input type="number" step="0.01">`
   * for a loan rate, `step="0.1"` for a tax rate, `inputMode="decimal"` for a VAT
   * rate — and none of the three showed a "%" anywhere near the box, so what the
   * digits meant was a question the label alone had to answer.
   *
   * `aria-hidden`, like the currency read-out: it is a property of the field that
   * the label already names ("Interest rate (%)"), and announcing it again after
   * every value reads as part of the number.
   */
  suffix?: ReactNode;
  /**
   * Turns on the step keys: ArrowUp / ArrowDown add or subtract `step`, PageUp /
   * PageDown ten of them. The result lands on the grid `min + k × step` (or `0 + k ×
   * step` without a `min`), so 3.1 with `step={0.25}` goes up to 3.25, not 3.35 —
   * what a native number input does. Decimal-exact: `0.1 + 0.2` steps to "0.3".
   *
   * A step changes the text through `onChange` like a keystroke would; `onCommit`
   * still fires on blur/Enter. Without `step` the arrow keys move the caret as before.
   */
  step?: number;
  /** Bounds for the step keys only — a step never leaves `[min, max]`. This field's
   *  value is a STRING, so typed text is not clamped: {@link NumberField} is the
   *  numeric field that clamps what is typed as well. */
  min?: number;
  max?: number;
}

/** Decimal places of `n` as written ("0.25" → 2, "1e-7" → 7), for decimal-exact
 *  stepping. */
function decimalsOf(n: number): number {
  const text = formatResult(n);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * `current` moved by `count` steps (negative = down), on the grid `origin + k × step`
 * and clamped into `[min, max]`. An off-grid value moves to the NEXT grid point in
 * that direction first, so one press is never more than one step.
 *
 * The grid index is found by division and the result rebuilt as `origin + k × step`,
 * then cut to the decimals `step` and `origin` are written with — which is where
 * binary noise goes: `0.1 × 3` is 0.30000000000000004, and `toFixed(1)` of it is
 * "0.3". Summing steps would accumulate that noise press by press instead.
 */
export function stepNumber(
  current: number | null,
  count: number,
  step: number,
  min?: number,
  max?: number,
): number {
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  // Nothing to step from: land on the value nearest zero the bounds allow, rather
  // than on ±step — a room count with `min={1}` goes to 1, a rate to 0.
  if (current === null || !Number.isFinite(current)) return clamp(0);
  const origin = min !== undefined && Number.isFinite(min) ? min : 0;
  const raw = (current - origin) / step;
  const nearest = Math.round(raw);
  // "On the grid" within float tolerance: (0.3 - 0) / 0.1 is 2.9999999999999996.
  const onGrid = Math.abs(raw - nearest) < 1e-9;
  const k = onGrid
    ? nearest + count
    : count > 0
      ? Math.ceil(raw) + count - 1
      : Math.floor(raw) + count + 1;
  const places = Math.min(Math.max(decimalsOf(step), decimalsOf(origin)), 20);
  return clamp(Number((origin + k * step).toFixed(places)));
}

// The error line under a field — the type of `ui.tsx`'s (module-private) one, so a
// NumberInput's message is indistinguishable from an Input's.
const FIELD_ERROR_CLASS = "mt-1 text-[11px] leading-tight text-[var(--danger)]";

// ── The money guard (kastlan 5, Kurvenschmiede) ─────────────────────────────────

// The codes the kit's own currency pickers offer, as whole words: "Amount (CHF)",
// "EUR", "Kosten CHF". Not every ISO 4217 code — "ALL", "TOP" and "PEN" are codes too,
// and an upper-case label would trip on them.
const CURRENCY_CODE = new RegExp(`(?:^|[^A-Za-z])(?:${CURRENCIES.map((c) => c.code).join("|")})(?![A-Za-z])`);
// Symbols no unit of measure is written with. Not "kr", "R" or "Fr": those are words
// and units as often as they are money.
const CURRENCY_SYMBOL = /[€$£¥₹₺₽₪₩₫฿₴₦₱]/;

/** Text that names a currency and no unit to go with it. A slash makes it a rate or
 *  a unit price ("CHF/m²", "€/kWh") — a figure whose decimals are its column's
 *  business, not the currency's — and that is not what the guard is for. */
function namesMoney(node: ReactNode): boolean {
  if (typeof node !== "string" && typeof node !== "number") return false;
  const text = String(node);
  return (CURRENCY_CODE.test(text) || CURRENCY_SYMBOL.test(text)) && !text.includes("/") && !text.includes("%");
}

/**
 * Is this field being used for MONEY? A currency in the unit (`suffix="CHF"`), or in
 * the label, `ariaLabel` or placeholder of a field with no unit at all ("Estimated
 * cost (CHF)"). Any other suffix is a unit — "%", "mm", "N·m" — and says what the
 * digits are, whatever the label says. `digits` plays no part: NumberInput has none,
 * and Kurvenschmiede's engineering fields at 2 and 3 decimals are exactly what this
 * must stay quiet about.
 */
function looksLikeMoney(suffix: ReactNode, texts: ReactNode[]): boolean {
  if (suffix !== undefined && suffix !== null && suffix !== "") return namesMoney(suffix);
  return texts.some(namesMoney);
}

/**
 * The kit's dev switch, as `lib/logger.ts` reads it: a development build, never a
 * production one — the consumer's bundler replaces `import.meta.env.DEV` with `false`
 * there, and this branch is dead code — and never under vitest, where every consumer
 * suite would print it once per render of every field it has not migrated yet. Read
 * per call rather than once per module, so a test can switch it on with `vi.stubEnv`.
 * Optional-chained: `import.meta.env` is a Vite injection, absent under plain Node.
 */
function devWarnings(): boolean {
  return Boolean(import.meta.env?.DEV) && !import.meta.env?.VITEST;
}

/**
 * A numeric text field with a built-in calculator: type a calculation straight
 * in (e.g. "12+5", evaluated on blur/Enter) or click the trailing calculator
 * icon for a keypad. String `value`/`onChange` contract, mirroring
 * {@link AmountInput} — the currency-free counterpart for quantities, rates,
 * percentages and measurements.
 *
 * NOT FOR MONEY. This field never rounds: "12.345", or a calculator's "100/3", is
 * reported exactly as typed. kastlan's journal lines, a payment allocation and a
 * defect's estimated cost were NumberInputs, and a 3-decimal amount reached a
 * 2-decimal Money column and failed the save with a 422 — in one wizard after the
 * record before it had already been created (kastlan 5). Money goes in
 * {@link AmountInput} (string value, like this one) or {@link MoneyField} (number
 * value): both settle to the currency's minor unit on blur, Enter and every calculator
 * result, and take `digits` for a unit price at a finer scale. In development a
 * NumberInput that looks like money — a currency as its unit, or a currency in the
 * label of a field with no unit — says so on the console, once per field. A unit of
 * measure ("mm", "N·m", "%") keeps it quiet, as does any number of decimals.
 *
 * THE LOCALE'S MARK (keksdose K5). The field shows the `locale`'s decimal mark — "3,5"
 * to a French, Italian or German reader — and reads what is typed the way
 * {@link AmountInput} does (keksdose G1): "1.234,56" from a German typist is 1234.56,
 * "1,234.56" from an English one too, and a lone mark that cannot be grouping is the
 * decimal, whichever key typed it. Before, it always showed "3.5" and folded
 * "1.234,56" into 1.23456. `value` and `onChange` stay dot-decimal, which is the
 * contract every caller's `Number(value)` reads.
 *
 * While a figure is being typed the field shows the typist's OWN text — "1.234,5"
 * stays exactly that — rather than the value re-spelt: re-spelling turned a grouping
 * "." into a "," under their fingers, after which no rule could tell the two apart, and
 * a text that changes length under the caret moves it to the end. It is re-spelt in the
 * locale's mark, without grouping, once the figure settles (blur, Enter, a step or a
 * calculator result) or when the value changes from outside.
 */
export function NumberInput(props: NumberInputProps) {
  const {
    value,
    onChange,
    onCommit,
    label,
    ariaLabel,
    labels,
    placeholder,
    disabled,
    autoFocus,
    className,
    inputClassName,
    id,
    calculator = true,
    variant = "field",
    hint,
    invalid: invalidProp,
    error,
    locale: localeProp,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-required": ariaRequired,
    suffix,
    step,
    min,
    max,
  } = props;
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = useId();
  const errorId = useId();
  // Text is a caption under the field; a FieldHint rides the label line. See `hint`.
  const textHint = (typeof hint === "string" && hint !== "") || typeof hint === "number";
  const hasError = hasMessage(error);
  // Passed at all — even as `undefined` — the field keeps its box; see `error`.
  const reserve = "error" in props || "hint" in props;
  // The standing advice first, the news second: the caller's ids, the caption, the error.
  const describedBy = mergeDescribedBy(ariaDescribedBy, textHint && hintId, hasError && errorId);
  const invalid = Boolean(invalidProp) || hasError || ariaInvalid === true || ariaInvalid === "true";
  const labelled = label !== undefined;
  // On phones we suppress the OS keyboard (inputMode="none" below) for our own
  // calculator numpad, so the desktop popover trigger is hidden (feedback #334).
  const isMobile = useMediaQuery(PHONE_QUERY, false);
  const asDisplay = isMobile && variant === "display";
  const showCalc = calculator && !disabled && !isMobile;
  const [focused, setFocused] = useState(false);
  // The unit and the calculator's measured width, reserved as the field's end padding.
  const endRef = useRef<HTMLDivElement>(null);
  const [endWidth, setEndWidth] = useState<number | null>(null);
  const hasEnd = showCalc || suffix !== undefined;
  // Before the first measurement (and wherever there is no layout), a TEXT unit
  // reserves an estimate from its length — one `ch` a character, in the input's own
  // (larger) font, so it errs wide — plus the span's `pe-2` and the 4px gap, and the
  // calculator's 36px. The class fallback's flat pe-8 gave a "%" 32px for a frame and
  // "km/h" too little.
  const suffixChars = typeof suffix === "string" || typeof suffix === "number" ? String(suffix).length : null;
  const estimatedEnd =
    suffixChars !== null ? `calc(${suffixChars}ch + 0.75rem${showCalc ? " + 2.25rem" : ""})` : undefined;
  useLayoutEffect(() => {
    const el = endRef.current;
    if (!hasEnd || !el || typeof ResizeObserver === "undefined") return;
    // The first callback fires on `observe`; no layout (jsdom) keeps the class fallback.
    const observer = new ResizeObserver(() => {
      const width = el.getBoundingClientRect().width;
      setEndWidth(width > 0 ? Math.ceil(width) : null);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEnd]);
  // On mobile, focusing opens the numpad bottom sheet instead of the native
  // keyboard (#334); the ref lets its "Done" blur → commit + close.
  const showNumpad = isMobile && !disabled && focused;
  const inputRef = useRef<HTMLInputElement>(null);

  // The mark is the locale's; see the component's note. `derived` is the value in that
  // mark — one character for one, no grouping — and `draft` the typist's own text,
  // shown only while it still says what the value says (see `showsTyped`).
  const mark = decimalMark(useKitLocale(localeProp));
  const [draft, setDraft] = useState<string | null>(null);
  const derived = localizeMark(value, mark);
  const display = draft !== null && showsTyped(draft, mark, value) ? draft : derived;

  // A keystroke, a paste or a numpad key: the typist's text is kept, the value is what
  // a number reads it as.
  const typed = (raw: string) => {
    setDraft(raw);
    onChange(readTyped(raw, mark));
  };
  // A RESULT — the calculator's, the numpad's "=" — is dot-decimal already. It does not
  // go through `typed`: "1.234" out of `100/81.03…` is never a thousand.
  const result = (next: string) => {
    setDraft(null);
    onChange(next);
  };

  // The money guard: once per field, development only. See `looksLikeMoney`.
  const warnedMoney = useRef(false);
  useEffect(() => {
    if (warnedMoney.current || !devWarnings()) return;
    if (!looksLikeMoney(suffix, [label, ariaLabel, placeholder])) return;
    warnedMoney.current = true;
    const name = [label, ariaLabel, suffix].find((t) => typeof t === "string" || typeof t === "number");
    console.warn(
      `[ui-kit] NumberInput${name === undefined ? "" : ` "${String(name)}"`} looks like a money field: a ` +
        `currency, and no unit. NumberInput never rounds, so "12.345" or a calculator's "100/3" is sent with ` +
        `three or more decimals (kastlan 5: a 422 from a 2-decimal Money column). Use AmountInput (string ` +
        `value) or MoneyField (number value) — both settle to the currency's minor unit. ` +
        `(Development builds only; once per field.)`,
    );
  }, [suffix, label, ariaLabel, placeholder]);

  const commit = () => {
    setDraft(null);
    const next = commitExpression(value);
    if (next !== value) onChange(next);
    onCommit?.(next);
  };

  const stepBy = (count: number) => {
    setDraft(null);
    // The step starts from the text as a commit would read it, so "12+5" steps from 17.
    const resolved = commitExpression(value).trim();
    const n = resolved === "" ? NaN : Number(resolved);
    const next = formatResult(stepNumber(Number.isFinite(n) ? n : null, count, step as number, min, max));
    if (next !== value) onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") return commit();
    // A zero, negative or non-finite step is no step: the keys stay the caret's.
    if (!step || !(step > 0) || !Number.isFinite(step) || e.altKey || e.ctrlKey || e.metaKey) return;
    const count =
      e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : e.key === "PageUp" ? 10 : e.key === "PageDown" ? -10 : 0;
    if (count === 0) return;
    // Otherwise ArrowUp/Down also jump the caret to the start/end of the text.
    e.preventDefault();
    stepBy(count);
  };

  const field = (
    <FloatingField
      className={cn("w-full", className)}
      htmlFor={fieldId}
      label={label}
      srOnlyLabel={asDisplay}
      hint={textHint ? undefined : hint}
    >
      <input
        ref={inputRef}
        id={fieldId}
        aria-label={ariaLabel}
        type="text"
        // Mobile: suppress the OS keyboard so the numpad sheet owns entry (field
        // keeps focus/caret); desktop keeps the native decimal keypad.
        inputMode={isMobile ? "none" : "decimal"}
        autoComplete="off"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- a documented prop the caller opts into (off by default); the field never takes focus on its own.
        autoFocus={autoFocus}
        disabled={disabled}
        // Display mode has no floating label to feed the blank-placeholder trick,
        // and an empty borderless figure shows nothing — so it keeps whatever
        // placeholder the caller gave, falling back to a zero to aim at.
        placeholder={asDisplay ? (placeholder ?? "0") : labelled ? " " : placeholder}
        value={display}
        onChange={(e) => typed(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          commit();
          setFocused(false);
        }}
        onKeyDown={onKeyDown}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-required={ariaRequired}
        // The end padding sits last so it always wins over an inputClassName that
        // sets its own px. Both trailing controls can be on at once, so the room
        // they need is reserved together rather than by whichever happens to render:
        // the calculator is ~36px and a short unit ~24px, and a field that reserved
        // only one of them would let the digits run under the other.
        className={cn(
          asDisplay
            ? cn(FIELD_DISPLAY, "text-4xl font-semibold leading-tight tracking-tight tabular-nums")
            : labelled
              ? FLOATING_INPUT_CLASS
              : FIELD_BASE,
          inputClassName,
          showCalc && suffix !== undefined ? "pe-16" : showCalc ? "pe-9" : suffix !== undefined ? "pe-8" : undefined,
          invalid && FIELD_INVALID,
        )}
        // The classes above are the fallback; once the end controls are measured the
        // field reserves exactly their width (+4px). A fixed pe-8 for any unit left a
        // "%" in a ~78px table cell 32px of padding and the digits ~32px of room
        // (keksdose live #367); a long unit ("km/h") got too little.
        style={
          hasEnd && endWidth != null
            ? { paddingInlineEnd: endWidth + 4 }
            : estimatedEnd !== undefined
              ? { paddingInlineEnd: estimatedEnd }
              : undefined
        }
      />
      {(showCalc || suffix !== undefined) && (
        // One flex track for both, so the unit and the calculator sit side by side
        // instead of stacking on the same corner — AmountInput's arrangement, which
        // has carried a chip and a calculator together since #430.
        <div ref={endRef} className="absolute inset-y-0 end-0 flex items-center">
          {showCalc && (
            <CalculatorButton
              // Seeded with the value in the field's mark but WITHOUT the typist's
              // grouping: the evaluator reads either mark, but "1.234,5" is two of them.
              value={derived}
              onChange={result}
              className="self-stretch px-2.5"
              ariaLabel={labels?.calculatorTrigger}
              labels={labels?.calculator}
            />
          )}
          {suffix !== undefined && (
            <span
              aria-hidden
              // pe-2, not the input's px-3: the unit is chrome at the box's edge, and
              // with pe-3 plus the 4px gap it took ~26px of a narrow table cell.
              className="pointer-events-none pe-2 text-xs font-medium text-[var(--text-muted)]"
            >
              {suffix}
            </span>
          )}
        </div>
      )}
      {showNumpad && (
        <NumberPadSheet
          // Localised like the field it mirrors, as AmountInput's is: its keys are
          // typing, read by the locale's marks like the keyboard's; "=" is a result.
          value={display}
          onChange={typed}
          onResult={result}
          onDone={() => inputRef.current?.blur()}
          label={label}
          labels={labels?.pad}
          decimalMark={mark}
        />
      )}
    </FloatingField>
  );
  if (!textHint && !hasError && !reserve) return field;
  // Outside the field's own `relative` box, as Select's caption is: the calculator
  // and the unit are `inset-y-0` in it and would stretch down over a second line.
  // `className` stays on the field, so adding a caption cannot change what it styles.
  return (
    <div>
      {field}
      {textHint && (
        <p id={hintId} className="mt-1 text-[11px] leading-tight text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {hasError && (
        <p id={errorId} className={FIELD_ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}
