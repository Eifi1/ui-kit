import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Checkbox } from "./checkbox";
import { hasMessage, mergeDescribedBy } from "./choice-parts";
import { useCommitReason } from "./write-lock";
import { RequiredStarOnLegend } from "./field-parts";

/** One box of a {@link CheckboxGroup}. */
export interface CheckboxGroupOption<T extends string = string> {
  value: T;
  /** The words beside the box — its accessible name. */
  label: ReactNode;
  /** A line under the label ("Imprint, Privacy Policy and Terms only"), attached to the
   *  box with `aria-describedby` — {@link Checkbox}'s `description`. */
  hint?: ReactNode;
  /** This box cannot be changed; the others can. */
  disabled?: boolean;
}

/** Whether the legend is drawn. `"sr-only"` keeps it as the group's name for a screen
 *  reader where the dialog's title already says it to the eye. */
export type CheckboxGroupLegendVisibility = "visible" | "sr-only";

export interface CheckboxGroupProps<T extends string = string> {
  /** The question the boxes answer — the fieldset's `<legend>`, which names the group.
   *  Without one, pass `aria-label`. */
  legend?: ReactNode;
  /** Default `"visible"`. */
  legendVisibility?: CheckboxGroupLegendVisibility;
  "aria-label"?: string;
  /** One box per option, in this order. */
  options: CheckboxGroupOption<T>[];
  /** The ticked values. Controlled. */
  value: T[];
  /**
   * The new set on every tick. In the ORDER OF `options`, not the order the boxes were
   * ticked, so a list saved from it does not change with the order someone clicked in
   * (ChoiceCardGroup's rule). A value in `value` that no option carries — a grant for a
   * locale the app no longer offers — is kept, after the known ones: a picker that
   * dropped what it could not show would delete it on the next unrelated tick.
   */
  onChange: (value: T[]) => void;
  /**
   * `"vertical"` (default): one box per line. `"horizontal"`: a wrapping row, for a few
   * short labels. With `columns`, vertical becomes a grid of that many columns from the
   * `sm` breakpoint up and stays one column on a phone — the reviewer dialog's shape.
   */
  layout?: "vertical" | "horizontal";
  /** Columns for a vertical group, from `sm` up (one on a phone). Default 1. */
  columns?: 1 | 2 | 3 | 4;
  /** Shared by every box — what a plain form submits the values under. */
  name?: string;
  /** Every box: the fieldset's own `disabled` (which disables them all natively), each
   *  box faded as a disabled Checkbox is, and the legend with them. */
  disabled?: boolean;
  /**
   * At least one box must be ticked. Draws the required star after the legend, and puts
   * the native `required` on every box while NONE is ticked — so a form refuses an
   * empty set — and on none once one is (ChoiceCardGroup's rule: checkboxes cannot say
   * "at least one" natively).
   */
  required?: boolean;
  /**
   * Standing advice for the group, under the boxes, attached to the fieldset with
   * `aria-describedby` before the error — the field anatomy every kit field keeps.
   */
  hint?: ReactNode;
  /** What is wrong with the set, in the caller's words. Under the boxes, on the
   *  fieldset's `aria-describedby`, and paints every box invalid. */
  error?: ReactNode;
  /** Paints every box invalid without a message (the message lives elsewhere). */
  invalid?: boolean;
  /**
   * The group SAVES on change — each tick is written straight away (a reviewer's
   * per-locale grants). Under a locked {@link WriteLockProvider} every box is locked
   * the focusable way with the lock's reason. See {@link Checkbox}'s `commit`.
   */
  commit?: boolean;
  /** Why no box can be changed — every box gets it, and it wins over `disabled` (the
   *  boxes stay focusable to say it). See {@link Checkbox}'s `disabledReason`. */
  disabledReason?: ReactNode;
  /** The fieldset's id. */
  id?: string;
  /** Classes for the fieldset — the outermost element, where layout belongs. */
  className?: string;
  /** Classes for the box list (the grid or the row). */
  listClassName?: string;
  /** Ids of something else on the page that describes the group; merged before the
   *  group's own hint and error. */
  "aria-describedby"?: string;
}

// Literal class strings so Tailwind's scanner sees each one.
const COLUMNS: Record<NonNullable<CheckboxGroupProps["columns"]>, string> = {
  1: "flex flex-col gap-2",
  2: "grid grid-cols-1 gap-2 sm:grid-cols-2",
  3: "grid grid-cols-1 gap-2 sm:grid-cols-3",
  4: "grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4",
};

/**
 * A set of kit {@link Checkbox}es answering one question, in a `<fieldset>`.
 *
 * Kurvenschmiede's reviewer dialog (features/admin/reviewer-dialog.tsx) builds this by
 * hand — a fieldset, an `sr-only` legend, a grid of checkboxes, a `toggle(code, on)`
 * that adds or filters a `string[]` — and keksdose's and kastlan's reviewer grants build
 * the same picker for the same per-locale grant. The hand-built ones differ in the parts
 * that are easy to get wrong: whether the legend names the group, whether a hint or an
 * error is attached to anything, what order the saved list comes out in, and whether a
 * value the picker cannot show survives a tick.
 *
 * Every box is a kit {@link Checkbox}, so the native checkbox semantics stay (each box
 * submits under `name` in a plain form). The legend is the group's name; the hint and
 * error describe the fieldset. For a choice of ONE, use radios ({@link ChoiceCardGroup},
 * {@link ToggleGroup}).
 */
export function CheckboxGroup<T extends string = string>({
  legend,
  legendVisibility = "visible",
  "aria-label": ariaLabel,
  options,
  value,
  onChange,
  layout = "vertical",
  columns = 1,
  name,
  disabled,
  required,
  hint,
  error,
  invalid,
  commit,
  disabledReason,
  id,
  className,
  listClassName,
  "aria-describedby": ariaDescribedBy,
}: CheckboxGroupProps<T>) {
  const generated = useId();
  const hintId = `${generated}-hint`;
  const errorId = `${generated}-error`;
  const showHint = hasMessage(hint);
  const showError = hasMessage(error);
  const isInvalid = Boolean(invalid) || showError;
  const ticked = new Set(value);
  // Resolved here rather than per box: a reason has to keep the fieldset from being
  // natively `disabled` too, or it would take every box out of the tab order — the
  // thing a reason exists to prevent.
  const reason = useCommitReason(commit, disabledReason);
  const locked = hasMessage(reason);

  const toggle = (v: T, on: boolean) => {
    const next = new Set(value);
    if (on) next.add(v);
    else next.delete(v);
    const known = new Set(options.map((o) => o.value));
    onChange([
      ...options.map((o) => o.value).filter((x) => next.has(x)),
      // Values no option carries, kept in their own order — see `onChange`.
      ...value.filter((x) => !known.has(x)),
    ]);
  };

  return (
    <fieldset
      id={id}
      aria-label={ariaLabel}
      aria-describedby={mergeDescribedBy(ariaDescribedBy, showHint && hintId, showError && errorId)}
      disabled={disabled && !locked}
      // `relative` holds an `sr-only` legend (sr-only-containment.test); `min-w-0`
      // undoes a fieldset's `min-width: min-content`, which would otherwise push a long
      // label past a phone's edge instead of wrapping it.
      className={cn("relative m-0 min-w-0 border-0 p-0", className)}
    >
      {legend !== undefined && (
        <legend
          className={
            legendVisibility === "sr-only"
              ? "sr-only"
              : cn("mb-2 p-0 text-sm font-medium text-[var(--text-primary)]", (disabled || locked) && "opacity-60")
          }
        >
          {legend}
          {required && (
            <span aria-hidden className="ms-0.5 text-[var(--danger)]">
              *
            </span>
          )}
        </legend>
      )}
      <RequiredStarOnLegend.Provider value={true}>
        <div
          className={cn(
            layout === "horizontal" ? "flex flex-wrap gap-x-4 gap-y-2" : COLUMNS[columns],
            listClassName,
          )}
        >
          {options.map((o) => (
            <Checkbox
              key={o.value}
              name={name}
              value={o.value}
              label={o.label}
              description={o.hint}
              checked={ticked.has(o.value)}
              onCheckedChange={(on) => toggle(o.value, on)}
              disabled={disabled || o.disabled}
              invalid={isInvalid || undefined}
              required={required && value.length === 0 ? true : undefined}
              disabledReason={reason}
            />
          ))}
        </div>
      </RequiredStarOnLegend.Provider>
      {showHint && (
        // A `div`, not a `p`: a hint may be a node with a link in it.
        <div id={hintId} className="mt-1.5 text-caption leading-tight text-[var(--text-muted)]">
          {hint}
        </div>
      )}
      {showError && (
        <p id={errorId} className="mt-1 text-caption leading-tight text-[var(--danger)]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
