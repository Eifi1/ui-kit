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

/**
 * The second argument of a `Field`'s render-prop children: what a GROUP needs that
 * a single control does not. `htmlFor` names an `<input>`, but a `<label>` pointing
 * at a `role="radiogroup"` div names nothing — so a group (a {@link ToggleGroup})
 * takes `aria-labelledby={labelId}` instead. Kept out of {@link FieldControlProps}
 * so the spread every existing control takes is unchanged.
 */
export interface FieldRenderMeta {
  /** The label element's id, or `undefined` when the field has no label. */
  labelId: string | undefined;
}

/**
 * Where the label is visible. `"visible"` (default); `"sr-only"`: never drawn, still
 * the control's name; `"below-sm"` / `"below-md"` / `"below-lg"`: drawn only under
 * that breakpoint and screen-reader-only from it up.
 *
 * For table-like editors — kastlan's journal entry lines
 * (accounting/components/wizard/journal-entry-lines-step.tsx) — where a desktop
 * row sits under column headers that already say "Account" and "Amount", but the
 * phone layout stacks each line as a card and needs the labels back. The name stays
 * on the control at every width; only the ink changes.
 */
export type FieldLabelVisibility = "visible" | "sr-only" | "below-sm" | "below-md" | "below-lg";

// Literal class strings so Tailwind's scanner sees each one.
const LABEL_VISIBILITY: Record<FieldLabelVisibility, string | undefined> = {
  visible: undefined,
  "sr-only": "sr-only",
  "below-sm": "sm:sr-only",
  "below-md": "md:sr-only",
  "below-lg": "lg:sr-only",
};

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
  /** See {@link FieldLabelVisibility}. */
  labelVisibility?: FieldLabelVisibility;
  /** Wrapper className. */
  className?: string;
  /** The control. A function receives {@link FieldControlProps} to spread on it, and
   *  {@link FieldRenderMeta} (the label's id, for a group). */
  children: ReactNode | ((control: FieldControlProps, meta: FieldRenderMeta) => ReactNode);
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
  labelVisibility = "visible",
  className,
  children,
}: FieldProps) {
  const generated = useId();
  const id = htmlFor ?? `${generated}-control`;
  const hintId = `${generated}-hint`;
  const errorId = `${generated}-error`;
  const labelId = `${generated}-label`;
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
    <div
      data-slot="field"
      className={cn(
        // `content-start`: in a grid row next to a taller item (one with a hint), a
        // stretched Field would hand the extra height to its rows — the label grew,
        // and the control sat lower than its neighbour's (showcase audit, #/forms).
        "grid content-start gap-1.5",
        // A hidden label is `position: absolute`; `relative` keeps its containing
        // block here rather than the page's (see sr-only-containment.test).
        labelVisibility !== "visible" && "relative",
        className,
      )}
    >
      {label !== undefined && (
        <Label
          id={labelId}
          htmlFor={id}
          required={required}
          disabled={disabled}
          size={labelSize}
          data-error={hasError || undefined}
          className={cn("data-[error=true]:text-[var(--danger)]", LABEL_VISIBILITY[labelVisibility])}
        >
          {label}
        </Label>
      )}
      {typeof children === "function"
        ? children(control, { labelId: label !== undefined ? labelId : undefined })
        : children}
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
