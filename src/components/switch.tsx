import { forwardRef, useId } from "react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { hasMessage, mergeDescribedBy } from "./choice-parts";
import {
  DISABLED_REASON_LINE_CLASS,
  LockedReason,
  useDisabledReasonLine,
  useLockReason,
  type DisabledReasonDisplay,
} from "./field-parts";
import { FOCUS_RING } from "./focus-ring";

/**
 * An on/off switch that is still `<input type="checkbox">`, with `role="switch"`.
 *
 * Kastlan's was a Radix `<button>`; this keeps the native element for the reasons
 * `Checkbox` gives (form submission, `required`, reset, `<label for>`), and adds the
 * one thing a checkbox is not: `role="switch"`, which screen readers announce as
 * "on/off" rather than "checked/not checked". Use it for a setting that takes effect
 * the moment it is flipped; a choice that waits for a Save button is a checkbox.
 */

/** Geometry per size. The thumb sits `start-0.5` (0.125rem, 2 px at Normal) in from
 *  each end of the track, so its checked offset is `track width − thumb − 0.125rem`.
 *  All of it in rem since 0.32 (docs/text-size-harmonization.md §3.2, §4): the track
 *  and thumb already grew with the text, and a checked offset left in px (14 / 18) put
 *  the thumb short of the end at 125 % and in the middle at 150 %. `start-*`, never
 *  `left-*` or a `translate-x`: an inline-start offset follows the writing direction,
 *  so in a right-to-left form the thumb travels right-to-left with no `rtl:` override
 *  to keep in step. */
const SIZES = {
  // 1.75 × 1rem track, 0.75rem thumb (28×16 / 12 at Normal): the dense setting rows in
  // Kastlan's tables. Checked: 1.75 − 0.75 − 0.125 = 0.875rem.
  sm: { track: "h-4 w-7", thumb: "size-3 peer-checked:start-3.5" },
  // 2.25 × 1.25rem track, 1rem thumb (36×20 / 16). Checked: 2.25 − 1 − 0.125 = 1.125rem.
  md: { track: "h-5 w-9", thumb: "size-4 peer-checked:start-4.5" },
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
  // The kit's focus frame (§5), stood off the track so it never merges with the fill.
  `focus:outline-none ${FOCUS_RING} focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] ` +
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
  /**
   * Why the switch cannot be flipped — {@link Button}'s `disabledReason`. A switch is
   * the control that "takes effect the moment it is flipped", so it is the first one
   * keksdose K3 names: its settings rows sat behind a `SaveGuard` that forced a native
   * `disabled`, out of the tab order, so the reason never reached a keyboard.
   *
   * With a reason the switch is `aria-disabled` instead: still focusable, a click or
   * Space flips nothing and fires no `onChange` / `onCheckedChange`, the reason is in
   * the kit {@link Tooltip} on the track and on its `aria-describedby`, and the row
   * fades as a disabled one does. It wins over `disabled`. Changing the lock mounts the
   * switch anew (it moves in or out of the Tooltip), as a locked Button is.
   */
  disabledReason?: ReactNode;
  /**
   * Where `disabledReason` shows (0.32, §4 "No fact only in a tooltip"): by default, at
   * Large and on a touch screen, as a line in the words column under the description (a
   * bare switch: under the track), and in the tooltip otherwise. See
   * {@link DisabledReasonDisplay}.
   */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /**
   * This switch COMMITS — flipping it saves. Under a locked {@link WriteLockProvider} it
   * is locked the `disabledReason` way with the lock's reason (which wins over its
   * own). No provider, or an unlocked one: no effect. Button's `commit`, for K3.
   */
  commit?: boolean;
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
    disabledReason,
    disabledReasonDisplay,
    commit,
    onClick,
    ...rest
  },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const lock = useLockReason(commit, disabledReason);
  const locked = lock.locked;
  const reasonLine = useDisabledReasonLine(disabledReasonDisplay);
  // Locked is disabled the focusable way — the row fades and the words stop inviting a
  // click, as for `disabled`.
  const looksDisabled = Boolean(disabled) || locked;
  const descriptionId = `${inputId}-description`;
  const showDescription = hasMessage(description);
  const bare = label === undefined && !showDescription;
  const geometry = SIZES[size];

  const track = (
    <span className={cn("relative inline-flex shrink-0", bare && !locked && className)}>
      <input
        ref={ref}
        id={bare ? id : inputId}
        // A reason wins over `disabled`, as on Button: the switch stays reachable.
        disabled={locked ? undefined : disabled}
        required={required}
        {...rest}
        // After the spread: a caller's props object must not be able to turn this
        // back into a plain checkbox, or into a text field.
        type="checkbox"
        role="switch"
        aria-disabled={locked || rest["aria-disabled"] || undefined}
        aria-describedby={mergeDescribedBy(
          rest["aria-describedby"],
          showDescription && descriptionId,
          locked && lock.reasonId,
        )}
        // A locked switch's click is swallowed, as a locked Button's is.
        onClick={locked ? undefined : onClick}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (locked) {
            // Put the thumb back and report nothing — see Checkbox for why here and not
            // by cancelling the click. Label clicks and Space arrive as clicks too.
            e.currentTarget.checked = !e.currentTarget.checked;
            return;
          }
          onChange?.(e);
          onCheckedChange?.(e.target.checked);
        }}
        className={cn(TRACK, geometry.track, locked && "cursor-not-allowed", inputClassName)}
      />
      <span aria-hidden className={cn(THUMB, geometry.thumb)} />
    </span>
  );
  // The Tooltip goes round the track, not the row — the row is the caller's layout. A
  // bare switch hands its `className` to the wrapper, then the outermost element. With
  // words beside it, the reason LINE goes under them instead (below), so the track
  // stays where the row puts it.
  const lineInWords = locked && reasonLine && !bare;
  const control =
    locked && !lineInWords ? (
      <LockedReason lock={lock} line={reasonLine} className={cn("shrink-0", bare && className)}>
        {track}
      </LockedReason>
    ) : (
      track
    );

  if (bare) return control;

  // The switch's cell is one label line tall (text-sm, 1.25rem) so it centres on the
  // FIRST line of a label that wraps, and a description underneath does not drag it
  // down to the middle of the paragraph.
  // With the reason line in the words, the row's fade moves onto its parts: the line is
  // the one thing on the row still to be read, and at 60 % it would not be.
  const dimParts = lineInWords;
  const cell = <span className={cn("flex h-5 shrink-0 items-center", dimParts && "opacity-60")}>{control}</span>;
  const words = (
    <span className="min-w-0 flex-1">
      {label !== undefined && (
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm leading-5 text-[var(--text-primary)]",
            looksDisabled ? "cursor-not-allowed" : "cursor-pointer select-none",
            dimParts && "opacity-60",
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
        <span id={descriptionId} className={cn("mt-0.5 block text-xs text-[var(--text-muted)]", dimParts && "opacity-60")}>
          {description}
        </span>
      )}
      {lineInWords && (
        <span id={lock.reasonId} className={DISABLED_REASON_LINE_CLASS}>
          {lock.reason}
        </span>
      )}
    </span>
  );

  return (
    <div className={cn("flex items-start gap-3", looksDisabled && !dimParts && "opacity-60", className)}>
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
