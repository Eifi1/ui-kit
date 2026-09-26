/**
 * A field group with its label ABOVE the control: label, control, hint, error.
 *
 * ```tsx
 * <Field label="IBAN" required hint="22 characters" error={errors.iban}>
 *   {(ids) => <Input {...ids} value={iban} onChange={…} />}
 * </Field>
 * ```
 *
 * The kit's `Input` and `Select` float their label inside the field, and the pickers
 * draw theirs the same way. That is the wrong shape for a control the kit did not
 * render, a radio group, a range slider, or a form that sets its labels above the
 * fields throughout — which is what kastlan's wizards are, and why it kept its own
 * `WizardField` after the kit dropped the one it had never rendered. This is that
 * group, with the wiring the old one left to the caller: the label names the control
 * through `htmlFor`, and the control is described by the hint and the error that are
 * actually on screen.
 *
 * ## Wiring
 *
 * Pass a function as `children` and it receives {@link FieldControlProps} — `id`,
 * `aria-describedby`, `aria-invalid` and `aria-required` — to spread on the control.
 * Plain children render as they are, for a control that wires itself (a checkbox that
 * carries its own label, a group with `aria-labelledby`); `htmlFor` then points the
 * label at the control's own id, and the hint and error are on screen but describe
 * nothing — the same as the `WizardField` this replaces.
 *
 * ## Decoupled
 *
 * Deliberately knows neither the wizard nor react-hook-form: `error` is a plain
 * value. Pass `wizard.fieldErrors.iban`, a step-local error, or
 * `fieldState.error?.message` from a `FormField` render — the markup is the same
 * whichever of them gates the step, so a step can move between them without its
 * fields changing. (Inside a react-hook-form form, `FormItem` + `FormLabel` from
 * `@eifi1/ui-kit/rhf` do the same job with the ids taken from the form.)
 *
 * The error is NOT `role="alert"`, for the reason the kit's `error` prop gives (see
 * `useFieldError` in components/ui.tsx): it is read when focus reaches the control.
 */
import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Label } from "./ui";

/** What a `Field` hands its render-prop children, to spread on the control. */
export interface FieldControlProps {
  /** The id the label's `htmlFor` points at. */
  id: string;
  /** The ids of the hint and the error that are rendered, or `undefined` when
   *  neither is. */
  "aria-describedby": string | undefined;
  /** `true` while the field has an error, `undefined` otherwise. */
  "aria-invalid": true | undefined;
  /** `true` when the field is `required`. The label's star is `aria-hidden`; this
   *  is what a screen reader hears instead. */
  "aria-required": true | undefined;
}

export interface FieldProps {
  /** The label above the control. Omit it for a group whose control is labelled
   *  some other way; the hint and error still render. */
  label?: ReactNode;
  /** Draws the kit's required mark after the label, and sets `aria-required` on the
   *  render-prop control. */
  required?: boolean;
  /** Muted helper text below the control. */
  hint?: ReactNode;
  /** The error below the control. `null`, `false` and `""` are no error — what a
   *  `touched && errors.x` evaluates to on the happy path. */
  error?: ReactNode;
  /** The control's id. Defaults to a generated one; set it when the control carries
   *  its own id (plain children). */
  htmlFor?: string;
  /** Dims the label with its control. */
  disabled?: boolean;
  /** The label's size: `sm` for a dense row, `md` otherwise. */
  labelSize?: "sm" | "md";
  /** Wrapper className. */
  className?: string;
  /** The control. A function receives {@link FieldControlProps} to spread on it. */
  children: ReactNode | ((control: FieldControlProps) => ReactNode);
}

const isShown = (node: ReactNode) =>
  node !== undefined && node !== null && node !== false && node !== "";

export function Field({
  label,
  required,
  hint,
  error,
  htmlFor,
  disabled,
  labelSize,
  className,
  children,
}: FieldProps) {
  const generated = useId();
  const id = htmlFor ?? `${generated}-control`;
  const hintId = `${generated}-hint`;
  const errorId = `${generated}-error`;
  const hasHint = isShown(hint);
  const hasError = isShown(error);
  const describedBy = [hasHint && hintId, hasError && errorId].filter(Boolean).join(" ");
  const control: FieldControlProps = {
    id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": hasError || undefined,
    "aria-required": required || undefined,
  };
  return (
    <div data-slot="field" className={cn("grid gap-1.5", className)}>
      {label !== undefined && (
        <Label
          htmlFor={id}
          required={required}
          disabled={disabled}
          size={labelSize}
          data-error={hasError || undefined}
          className="data-[error=true]:text-[var(--danger)]"
        >
          {label}
        </Label>
      )}
      {typeof children === "function" ? children(control) : children}
      {hasHint && (
        <p id={hintId} className="text-[11px] leading-tight text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {hasError && (
        <p id={errorId} className="text-[11px] leading-tight text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
