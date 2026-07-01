import { useId } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { CalculatorButton } from "./calculator";
import { FIELD_BASE, FLOATING_INPUT_CLASS, FloatingField } from "./ui";
import { cn } from "../lib/cn";
import { commitExpression, sanitizeLive } from "../lib/calc";

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
  const showCalc = calculator && !disabled;

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
        onBlur={commit}
        onKeyDown={onKeyDown}
        // `pr-9` sits last so it always wins the right-padding that makes room
        // for the calculator icon, even when inputClassName sets its own px.
        className={cn(labelled ? FLOATING_INPUT_CLASS : FIELD_BASE, inputClassName, showCalc && "pr-9")}
      />
      {showCalc && (
        <CalculatorButton value={value} onChange={onChange} className="absolute inset-y-0 right-0 px-2.5" />
      )}
    </FloatingField>
  );
}
