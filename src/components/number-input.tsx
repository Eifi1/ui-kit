import { useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { CalculatorButton, type CalculatorButtonLabels } from "./calculator";
import { NumberPadSheet, type NumberPadSheetLabels } from "./numpad-sheet";
import { FIELD_BASE, FIELD_DISPLAY, FIELD_INVALID, FLOATING_INPUT_CLASS, FloatingField, PHONE_QUERY } from "./ui";
import { cn } from "../lib/cn";
import { commitExpression, formatResult, sanitizeLive } from "../lib/calc";
import { useMediaQuery } from "../hooks/use-media-query";

interface NumberInputProps {
  value: string;
  /** Fired on every keystroke with the raw text (comma → dot, operators kept so
   * a typed expression survives). */
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
   *  feedback #48). */
  hint?: ReactNode;
  /** Required and unanswered — {@link FIELD_INVALID}. See {@link Input}'s `invalid`. */
  invalid?: boolean;
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

/**
 * A numeric text field with a built-in calculator: type a calculation straight
 * in (e.g. "12+5", evaluated on blur/Enter) or click the trailing calculator
 * icon for a keypad. String `value`/`onChange` contract, mirroring
 * {@link AmountInput} — the currency-free counterpart for budgets, goals,
 * invoice totals and split lines.
 */
export function NumberInput({
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
  invalid,
  suffix,
  step,
  min,
  max,
}: NumberInputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const labelled = label !== undefined;
  // On phones we suppress the OS keyboard (inputMode="none" below) for our own
  // calculator numpad, so the desktop popover trigger is hidden (feedback #334).
  const isMobile = useMediaQuery(PHONE_QUERY, false);
  const asDisplay = isMobile && variant === "display";
  const showCalc = calculator && !disabled && !isMobile;
  const [focused, setFocused] = useState(false);
  // On mobile, focusing opens the numpad bottom sheet instead of the native
  // keyboard (#334); the ref lets its "Done" blur → commit + close.
  const showNumpad = isMobile && !disabled && focused;
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const next = commitExpression(value);
    if (next !== value) onChange(next);
    onCommit?.(next);
  };

  const stepBy = (count: number) => {
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

  return (
    <FloatingField
      className={cn("w-full", className)}
      htmlFor={fieldId}
      label={label}
      srOnlyLabel={asDisplay}
      hint={hint}
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
        autoFocus={autoFocus}
        disabled={disabled}
        // Display mode has no floating label to feed the blank-placeholder trick,
        // and an empty borderless figure shows nothing — so it keeps whatever
        // placeholder the caller gave, falling back to a zero to aim at.
        placeholder={asDisplay ? (placeholder ?? "0") : labelled ? " " : placeholder}
        value={value}
        onChange={(e) => onChange(sanitizeLive(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          commit();
          setFocused(false);
        }}
        onKeyDown={onKeyDown}
        aria-invalid={invalid || undefined}
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
      />
      {(showCalc || suffix !== undefined) && (
        // One flex track for both, so the unit and the calculator sit side by side
        // instead of stacking on the same corner — AmountInput's arrangement, which
        // has carried a chip and a calculator together since #430.
        <div className="absolute inset-y-0 end-0 flex items-center">
          {showCalc && (
            <CalculatorButton
              value={value}
              onChange={onChange}
              className="self-stretch px-2.5"
              ariaLabel={labels?.calculatorTrigger}
              labels={labels?.calculator}
            />
          )}
          {suffix !== undefined && (
            <span
              aria-hidden
              className="pointer-events-none pe-3 text-xs font-medium text-[var(--text-muted)]"
            >
              {suffix}
            </span>
          )}
        </div>
      )}
      {showNumpad && (
        <NumberPadSheet
          value={value}
          onChange={onChange}
          onDone={() => inputRef.current?.blur()}
          label={label}
          labels={labels?.pad}
        />
      )}
    </FloatingField>
  );
}
