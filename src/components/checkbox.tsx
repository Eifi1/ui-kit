import { forwardRef, useCallback, useEffect, useId, useRef } from "react";
import { Check, Minus } from "lucide-react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { assignRef, hasMessage, mergeDescribedBy } from "./choice-parts";

/**
 * A checkbox that is still `<input type="checkbox">`.
 *
 * The three consuming apps had three answers: ~30 raw inputs in Keksdose leaning on
 * `tokens.css`'s `accent-color`, a label-plus-box `CheckboxField` in Lenkbank, and a
 * Radix `<button role="checkbox">` in Kastlan. The native element is the one that
 * needs no ARIA to be a checkbox — it submits with its form, answers to `required`,
 * resets with the form and takes a `<label for>` click — so it stays underneath, and
 * only its paint is replaced (`appearance-none`, a token-coloured box, and a glyph
 * laid over it that ignores the pointer so the click still lands on the input).
 *
 * `accent-color` alone was not enough: it tints the native box but cannot change its
 * border, so an INVALID checkbox had no way to say so, and the unchecked box kept the
 * browser's own grey outline in both themes.
 */

// The box. 16px, like every raw checkbox it replaces, so a migration moves nothing.
//
// `focus-visible`, with an offset in the surface colour: a --brand ring touching a
// --brand-filled (checked) box would be a ring painted in the colour it sits on —
// present in the DOM and invisible on screen. The offset is what separates the two.
const BOX =
  "peer size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-sm transition-colors " +
  "checked:border-[var(--brand)] checked:bg-[var(--brand)] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)] " +
  "disabled:cursor-not-allowed";

// A mixed box wears the checked fill whether or not the underlying input is checked:
// `indeterminate` is a property the browser keeps separately from `checked`, and the
// dash means "some", which is neither answer.
const BOX_MIXED = "border-[var(--brand)] bg-[var(--brand)]";

// The same geometry as FIELD_INVALID — a border plus a 1px ring, so the highlight
// survives fractional display scaling on every edge (see the note in ui.tsx). The
// focus ring turns danger too, so focusing a wrong box does not repaint it as fine.
const BOX_INVALID =
  "border-[var(--danger-border)] ring-1 ring-[var(--danger-border)] checked:border-[var(--danger-border)] focus-visible:ring-[var(--danger)]";

const ERROR_CLASS = "mt-1 text-[11px] leading-tight text-[var(--danger)]";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /**
   * The words beside the box. Rendered as a `<label for>` rather than a label that
   * wraps the input, so `description` and `error` can sit under it without becoming
   * part of the accessible NAME — a wrapping label would have the screen reader read
   * the whole paragraph as the checkbox's name.
   */
  label?: ReactNode;
  /** Secondary text under the label ("Used when no account is chosen"). Pointed at by
   *  `aria-describedby`, merged with any the caller passed. Kastlan's
   *  `CheckboxField` `description` variant. */
  description?: ReactNode;
  /**
   * "Some but not all" — the header box of a list whose rows are partly selected.
   * A DOM property with no HTML attribute, so it is set on the element after every
   * render; it does not touch `checked`, and a click clears it (the browser's rule,
   * and the caller's `onChange` decides what the click means).
   */
  indeterminate?: boolean;
  /** See {@link Input}'s `invalid`: paints the box and sets `aria-invalid` together,
   *  so the two cannot be spelled separately. */
  invalid?: boolean;
  /** What is wrong, in the caller's words ("Accept the terms to continue"). Rendered
   *  under the label, attached with `aria-describedby`, and implies `invalid`. */
  error?: ReactNode;
  /** The checked state as a boolean — the `(next) => …` shape Lenkbank's
   *  `CheckboxField` and Radix's `onCheckedChange` both used, so a migration does not
   *  have to unwrap `event.target.checked` at every call site. Fires alongside
   *  `onChange`, never instead of it. */
  onCheckedChange?: (checked: boolean) => void;
  /** Classes for the `<input>` itself. `className` styles the OUTERMOST element —
   *  the row when there is a label, the box's own wrapper when there is not — which
   *  is where layout (`self-end pb-2` to sit on a field's baseline) belongs. */
  inputClassName?: string;
  /**
   * Must be ticked to submit — a consent, an acceptance before paying. Reaches the
   * `<input>` as the native `required` (so a `<form>` refuses to submit without it and a
   * screen reader announces "required"), and draws the kit's required mark after the
   * label, the same `aria-hidden` star as {@link Label}'s: the word is announced from
   * the control, so a star inside the name would only be read out as noise. Write the
   * label WITHOUT a literal "*". No mark without a label.
   */
  required?: boolean;
}

/**
 * A native checkbox in the kit's tokens, with an optional label, description and
 * error.
 *
 * Without `label`, `description` or `error` it renders the box and nothing else, so
 * it drops into a table cell or a caller's own `<label>` exactly as the raw input
 * did — give it an `aria-label` there. Every other prop reaches the `<input>`
 * (`checked`, `defaultChecked`, `name`, `required`, `data-*`, `aria-*`), so it works
 * controlled, uncontrolled, and inside a plain `<form>`.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    indeterminate = false,
    invalid,
    error,
    onCheckedChange,
    onChange,
    className,
    inputClassName,
    id,
    disabled,
    required,
    ...rest
  },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const showError = hasMessage(error);
  const showDescription = hasMessage(description);
  const isInvalid = Boolean(invalid) || showError;
  // Nothing to lay out beside the box: render the box alone, as the raw input was.
  const bare = label === undefined && !showDescription && !showError;

  const local = useRef<HTMLInputElement | null>(null);
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      local.current = node;
      assignRef(ref, node);
    },
    [ref],
  );
  // After EVERY render, not only when the prop changes: a click clears the property
  // in the DOM, and a controlled caller that keeps `indeterminate` true expects the
  // dash back on the next render even though the prop never changed.
  useEffect(() => {
    if (local.current) local.current.indeterminate = indeterminate;
  });

  const box = (
    <span className={cn("relative inline-flex shrink-0", bare && className)}>
      <input
        ref={setRef}
        id={bare ? id : inputId}
        disabled={disabled}
        required={required}
        {...rest}
        // After the spread, like Switch: a props object spread at a checkbox must not
        // be able to turn it into something else.
        type="checkbox"
        // OR-ed with the spread so a caller's own `aria-invalid` survives — Input's rule.
        aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
        aria-describedby={mergeDescribedBy(
          rest["aria-describedby"],
          showDescription && descriptionId,
          showError && errorId,
        )}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          onChange?.(e);
          onCheckedChange?.(e.target.checked);
        }}
        className={cn(BOX, indeterminate && BOX_MIXED, isInvalid && BOX_INVALID, inputClassName)}
      />
      {/* The glyph is drawn over the box, not inside it (an input has no children),
          and ignores the pointer so a click on the tick still toggles the input. The
          tick is shown by `peer-checked`, so an UNCONTROLLED box shows it too; the
          dash replaces it outright while `indeterminate` holds. */}
      {indeterminate ? (
        <Minus
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none absolute inset-0 m-auto size-3 text-[var(--brand-contrast)]"
        />
      ) : (
        <Check
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none invisible absolute inset-0 m-auto size-3 text-[var(--brand-contrast)] peer-checked:visible"
        />
      )}
    </span>
  );

  if (bare) return box;

  return (
    <div
      className={cn(
        // `items-start` + a 20px cell for the box: the box centres on the label's FIRST
        // line (text-sm is 20px tall), so a label that wraps keeps the box at the top
        // rather than floating to the middle of a paragraph.
        "flex items-start gap-2",
        // The whole row fades, the way ToggleGroup and the fields do, so the label does
        // not stay at full strength beside a box you cannot change.
        disabled && "opacity-60",
        className,
      )}
    >
      <span className="flex h-5 shrink-0 items-center">{box}</span>
      <span className="min-w-0">
        {label !== undefined && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-sm leading-5 text-[var(--text-primary)]",
              // `select-none`: a double-click to toggle twice would otherwise select the
              // words, and a drag that starts on them starts a native text drag.
              disabled ? "cursor-not-allowed" : "cursor-pointer select-none",
            )}
          >
            {label}
            {required && (
              <span aria-hidden className="ms-0.5 text-[var(--danger)]">
                *
              </span>
            )}
          </label>
        )}
        {showDescription && (
          <span id={descriptionId} className="mt-0.5 block text-xs text-[var(--text-muted)]">
            {description}
          </span>
        )}
        {showError && (
          <span id={errorId} className={cn("block", ERROR_CLASS)}>
            {error}
          </span>
        )}
      </span>
    </div>
  );
});
Checkbox.displayName = "Checkbox";
