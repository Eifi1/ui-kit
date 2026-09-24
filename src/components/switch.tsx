import { forwardRef, useId } from "react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { hasMessage, mergeDescribedBy } from "./choice-parts";

/**
 * An on/off switch that is still `<input type="checkbox">`, with `role="switch"`.
 *
 * Kastlan's was a Radix `<button>`; this keeps the native element for the reasons
 * `Checkbox` gives (form submission, `required`, reset, `<label for>`), and adds the
 * one thing a checkbox is not: `role="switch"`, which screen readers announce as
 * "on/off" rather than "checked/not checked". Use it for a setting that takes effect
 * the moment it is flipped; a choice that waits for a Save button is a checkbox.
 */

/** Geometry per size. The thumb sits `2px` in from each end of the track, so its
 *  checked offset is `track width − thumb − 2px`. `start-*`, never `left-*` or a
 *  `translate-x`: an inline-start offset follows the writing direction, so in a
 *  right-to-left form the thumb travels right-to-left with no `rtl:` override to
 *  keep in step. */
const SIZES = {
  // 28×16 track, 12px thumb: the dense setting rows in Kastlan's tables.
  sm: { track: "h-4 w-7", thumb: "size-3 peer-checked:start-[14px]" },
  // 36×20 track, 16px thumb.
  md: { track: "h-5 w-9", thumb: "size-4 peer-checked:start-[18px]" },
} as const;

export type SwitchSize = keyof typeof SIZES;

// The track IS the input — `appearance-none` and a pill — so its box is the pointer
// target and the focus ring lands around the whole control, not the thumb alone.
//
// Unchecked it takes `--border-strong`, not `--border`: a hairline-coloured track on
// a surface-coloured card is a switch you have to look for. Checked it takes the
// brand fill, which is the only difference in COLOUR; the thumb's position is the
// difference in SHAPE, so the state never rests on colour alone.
const TRACK =
  "peer block shrink-0 cursor-pointer appearance-none rounded-full bg-[var(--border-strong)] transition-colors " +
  "checked:bg-[var(--brand)] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] " +
  "disabled:cursor-not-allowed";

// The thumb, laid over the input and ignoring the pointer so every click still reaches
// the input. It swaps to `--brand-contrast` on the brand fill: the surface colour would
// match the fill in some presets, and the contrast token is the one guaranteed to read
// against --brand.
const THUMB =
  "pointer-events-none absolute start-0.5 top-1/2 -translate-y-1/2 rounded-full bg-[var(--bg-surface)] shadow-sm " +
  "transition-[inset-inline-start,background-color] motion-reduce:transition-none " +
  "peer-checked:bg-[var(--brand-contrast)]";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "role"> {
  /** `"md"` (36×20, default) or `"sm"` (28×16) — Kastlan's `default` and `sm`. */
  size?: SwitchSize;
  /** The words beside the switch, as a `<label for>` — see {@link Checkbox}'s
   *  `label` for why it does not wrap the input. Without it, give the switch an
   *  `aria-label`. */
  label?: ReactNode;
  /** Secondary text under the label, attached with `aria-describedby` (merged with
   *  any the caller passed). */
  description?: ReactNode;
  /** Which end of the row the switch sits at when there is a label. `"end"` (the
   *  default) is the settings-list shape Kastlan's profile page uses — the words at
   *  the start, the control at the far end; `"start"` puts it before the words, like
   *  a checkbox. Logical, so it follows the writing direction. */
  switchPosition?: "start" | "end";
  /** The new state as a boolean — Radix's `onCheckedChange`, so Kastlan's call sites
   *  move without unwrapping the event. Fires alongside `onChange`. */
  onCheckedChange?: (checked: boolean) => void;
  /** Classes for the `<input>` (the track). `className` styles the outermost element:
   *  the row when there is a label, the switch's own wrapper when there is not. */
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
 * A native checkbox drawn as a track and thumb, announced as a switch.
 *
 * Every other prop reaches the `<input>`, so it works controlled (`checked` +
 * `onChange`/`onCheckedChange`), uncontrolled (`defaultChecked`) and in a plain
 * `<form>` (`name`, `value`).
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    size = "md",
    label,
    description,
    switchPosition = "end",
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
  const showDescription = hasMessage(description);
  const bare = label === undefined && !showDescription;
  const geometry = SIZES[size];

  const control = (
    <span className={cn("relative inline-flex shrink-0", bare && className)}>
      <input
        ref={ref}
        id={bare ? id : inputId}
        disabled={disabled}
        required={required}
        {...rest}
        // After the spread: a caller's props object must not be able to turn this
        // back into a plain checkbox, or into a text field.
        type="checkbox"
        role="switch"
        aria-describedby={mergeDescribedBy(rest["aria-describedby"], showDescription && descriptionId)}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          onChange?.(e);
          onCheckedChange?.(e.target.checked);
        }}
        className={cn(TRACK, geometry.track, inputClassName)}
      />
      <span aria-hidden className={cn(THUMB, geometry.thumb)} />
    </span>
  );

  if (bare) return control;

  // The switch's cell is one label line tall (text-sm, 20px) so it centres on the
  // FIRST line of a label that wraps, and a description underneath does not drag it
  // down to the middle of the paragraph.
  const cell = <span className="flex h-5 shrink-0 items-center">{control}</span>;
  const words = (
    <span className="min-w-0 flex-1">
      {label !== undefined && (
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm leading-5 text-[var(--text-primary)]",
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
    </span>
  );

  return (
    <div className={cn("flex items-start gap-3", disabled && "opacity-60", className)}>
      {switchPosition === "end" ? (
        <>
          {words}
          {cell}
        </>
      ) : (
        <>
          {cell}
          {words}
        </>
      )}
    </div>
  );
});
Switch.displayName = "Switch";
