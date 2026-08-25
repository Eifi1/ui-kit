import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Select } from "../components/ui";

interface WizardFieldProps {
  label?: ReactNode;
  /** Appends a literal " *" to the label. */
  required?: boolean;
  /** Error text — pass `wizard.fieldErrors[name]`, or a step-local error. */
  error?: string;
  /** Muted helper text below the control. */
  hint?: ReactNode;
  /** Associates the label with a control (checkbox/label pairs). */
  htmlFor?: string;
  /** Wrapper className (default "space-y-2"). */
  className?: string;
  children: ReactNode;
}

/**
 * A labelled field group for wizard steps: label, control, hint, error.
 *
 * Deliberately decoupled from BOTH the wizard object and react-hook-form — it
 * takes an explicit `error` string — so the same render layer serves a step that
 * gates on its own state and one that feeds RHF errors into it. That is what
 * lets an app move a step between the two without the field markup changing.
 */
export function WizardField({
  label,
  required,
  error,
  hint,
  htmlFor,
  className,
  children,
}: WizardFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label !== undefined && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-[var(--text-primary)]"
        >
          {label}
          {required ? " *" : ""}
        </label>
      )}
      {children}
      {hint && <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

interface WizardSelectFieldProps extends Omit<WizardFieldProps, "children"> {
  value: string | number;
  /** Receives the raw string value; callers wrap: `v => updateData({ x: v as T })`. */
  onChange: (value: string) => void;
  disabled?: boolean;
  /** className on the `<Select>` (default "w-full"). */
  selectClassName?: string;
  options?: { value: string | number; label: ReactNode; disabled?: boolean }[];
  /** Raw `<option>`/`<optgroup>` children, when `options` doesn't fit. */
  children?: ReactNode;
}

/** The controlled-`<Select>` shape folded into a {@link WizardField}, since a
 *  select is what most wizard steps are mostly made of. */
export function WizardSelectField({
  value,
  onChange,
  disabled,
  selectClassName,
  options,
  children,
  ...fieldProps
}: WizardSelectFieldProps) {
  return (
    <WizardField {...fieldProps}>
      <Select
        className={selectClassName ?? "w-full"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))
          : children}
      </Select>
    </WizardField>
  );
}
