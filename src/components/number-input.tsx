import { useId, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { CalculatorButton } from "./calculator";
import { MathKeys } from "./math-keys";
import { FIELD_BASE, FLOATING_INPUT_CLASS, FloatingField } from "./ui";
import { cn } from "../lib/cn";
import { commitExpression, sanitizeLive } from "../lib/calc";
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
  placeholder,
  disabled,
  autoFocus,
  className,
  inputClassName,
  id,
  calculator = true,
}: NumberInputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const labelled = label !== undefined;
  // On phones the native numeric keypad already covers entry, so the calculator
  // trigger is hidden to declutter the field (feedback #334).
  const isMobile = useMediaQuery("(max-width: 767px)", false);
  const showCalc = calculator && !disabled && !isMobile;
  const [focused, setFocused] = useState(false);
  // Mobile keypads lack operators, so show an inline math bar on focus (#334).
  const showMathBar = isMobile && !disabled && focused;

  const commit = () => {
    const next = commitExpression(value);
    if (next !== value) onChange(next);
    onCommit?.(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
  };

  return (
    <FloatingField className={cn("w-full", className)} htmlFor={fieldId} label={label}>
      <input
        id={fieldId}
        aria-label={ariaLabel}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={labelled ? " " : placeholder}
        value={value}
        onChange={(e) => onChange(sanitizeLive(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          commit();
          setFocused(false);
        }}
        onKeyDown={onKeyDown}
        // `pr-9` sits last so it always wins the right-padding that makes room
        // for the calculator icon, even when inputClassName sets its own px.
        className={cn(labelled ? FLOATING_INPUT_CLASS : FIELD_BASE, inputClassName, showCalc && "pr-9")}
      />
      {showCalc && (
        <CalculatorButton value={value} onChange={onChange} className="absolute inset-y-0 right-0 px-2.5" />
      )}
      {showMathBar && (
        <MathKeys
          className="mt-1"
          onInsert={(ch) => onChange(sanitizeLive(value + ch))}
          onBackspace={() => onChange(value.slice(0, -1))}
        />
      )}
    </FloatingField>
  );
}
