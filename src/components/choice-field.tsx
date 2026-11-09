import { useCallback } from "react";
import type { AriaAttributes, FocusEventHandler, ReactElement, ReactNode, Ref } from "react";
import { Select } from "./select";
import { ToggleGroup } from "./toggle-group";
import type { DisabledReasonDisplay, FieldHelpProps } from "./field-parts";
import type { CommitScope } from "./write-lock";
import { useBreakpoint, type Breakpoint } from "../hooks/use-breakpoint";
import type { DataAttributes } from "../lib/data-attributes";
import { hasContent } from "../lib/presence";
import { assignRef } from "../lib/refs";

/** One answer a {@link ChoiceField} offers. */
export interface ChoiceFieldOption<T extends string> {
  value: T;
  /** Text, because the select form lists it in a native `<option>`, which holds nothing
   *  else. It is the option's name in both forms. */
  label: string;
  /** Drawn before the label in the segmented form ({@link ToggleOption}'s `icon`); the
   *  select form shows the label alone. Hidden from assistive tech in either. */
  icon?: ReactNode;
}

/**
 * Which form a {@link ChoiceField} takes:
 *
 *  - `"auto"` (default): the segmented group from `breakpoint` up, the select below it;
 *  - `"segmented"`: the group at every width — a phone screen with room for two short
 *    answers, or a test of the group;
 *  - `"select"`: the select at every width — a narrow pane on a wide screen, or a test of
 *    the select.
 */
export type ChoiceFieldLayout = "auto" | "segmented" | "select";

export interface ChoiceFieldProps<T extends string>
  extends
    FieldHelpProps,
    DataAttributes,
    Pick<AriaAttributes, "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid" | "aria-required"> {
  /** The answers, in the order both forms list them. */
  options: readonly ChoiceFieldOption<T>[];
  /** The chosen option's `value`. One that matches no option shows nothing chosen in
   *  either form: no segment pressed, an empty select. */
  value: T;
  /** The chosen value — from a segment pressed (or arrowed to), or an option picked. */
  onChange: (value: T) => void;
  /**
   * The visible label: in the field chrome's strip over the segments
   * ({@link ToggleGroup}'s `label`), floating static in the select's box ({@link Select}'s)
   * — both a labelled Select's 42 px, so the field keeps its height and its row when it
   * changes form. It names the control in both. Without one, name it with `aria-label`.
   */
  label?: ReactNode;
  /** As on {@link ToggleGroup} and {@link Select}: text is a caption under the field, a
   *  `FieldHint` a "?" on the label line (its words at Large and on touch, §4). */
  hint?: ReactNode;
  /** The message under the field when it is wrong; it paints the field and describes the
   *  control. The segmented form shows it only with a `label`, as ToggleGroup does. */
  error?: ReactNode;
  /** Shows the choice and refuses a change, in both forms. */
  disabled?: boolean;
  /** Why the choice cannot be changed: reachable, refusing, saying why — ToggleGroup's
   *  and Select's `disabledReason`, which win over `disabled`. */
  disabledReason?: ReactNode;
  /** Where `disabledReason` shows — see {@link DisabledReasonDisplay}. */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /** The field SAVES on change: under a locked {@link WriteLockProvider} it refuses with
   *  the lock's reason, as ToggleGroup's and Select's `commit` do. */
  commit?: CommitScope;
  /**
   * `"sm"`: the group's 12 px segments, and an unlabelled select's 28 px toolbar size.
   * With a label both forms stay the field's 42 px — ToggleGroup keeps its 12 px type
   * inside the chrome, a labelled Select ignores `"sm"`. `"md"` (default) is a form's.
   */
  size?: "sm" | "md";
  /** See {@link ChoiceFieldLayout}. Default `"auto"`. */
  layout?: ChoiceFieldLayout;
  /**
   * Where `"auto"` turns from the select into the segmented group: the group from this
   * breakpoint up, at the text size in force (`useBreakpoint`, so `md` is 960 px at
   * Large). Default `"md"`: below it is `usePhoneLayout()`, the phone layout every other
   * kit and app phone treatment follows (§10.4).
   */
  breakpoint?: Breakpoint;
  /** The field's root — a width, a grid cell — in both forms. */
  className?: string;
  /** On the control: the group, or the `<select>` (which a `<label htmlFor>` can name). */
  id?: string;
  onFocus?: FocusEventHandler<HTMLElement>;
  /** React's: on the group it bubbles from each segment, so it fires on every move
   *  between them. Check `relatedTarget` for leaving the field (RhfChoiceField does). */
  onBlur?: FocusEventHandler<HTMLElement>;
  /** The control — the group, whose `focus()` lands on its chosen segment (ToggleGroup's
   *  `ref`), or the `<select>`. It follows the form: the new element after a switch. */
  ref?: Ref<HTMLElement>;
}

/**
 * One answer from a few, in the shape the screen can afford: a segmented
 * {@link ToggleGroup} from `md` up, every answer one click away, and a {@link Select} on
 * a phone, where a row of segments is wider than the screen or wraps into rows of its
 * own. keksdose hand-rolled exactly this twice — the price tab's `HeaderChoice` (live
 * #409: three full-width rows of segments on a phone became two selects a row) and the
 * shopping lists' breakdown `Choice` (SL-18) — and any app with a filter bar needs it.
 *
 * ```tsx
 * <ChoiceField label="Group by" value={grain} onChange={setGrain} options={GRAINS} size="sm" />
 * ```
 *
 * **One control, never both.** The form is chosen in JS (`useBreakpoint`), not by two
 * trees toggled with `md:hidden`: both would mount, and two controls with one label are
 * two fields to a screen reader and to a test. The default breakpoint is
 * `usePhoneLayout()`'s, so it switches with the CSS `md:` and the rest of the phone
 * layout at every text size — a tablet at 150 % gets the select.
 *
 * **The same field in both forms.** The label (or `aria-label`) names the radiogroup and
 * the select alike; the chosen option is the checked radio and the select's value, by
 * the same `label` text — so a screen reader hears "Group by, Month" either way. `hint`,
 * `help`, `error`, `disabled`, `disabledReason` and `commit` go to whichever form is on
 * screen, and attributes (`data-tour`, `id`, `aria-*`) to its control. The value is the
 * caller's (`value` + `onChange`), so a switch — a window resized, a phone turned, the
 * text size changed — keeps it; focus inside the field at that moment is not carried
 * over to the new control.
 *
 * Keyboard: the group's (one Tab stop, arrows move the choice), or the select's own.
 */
export function ChoiceField<T extends string>(props: ChoiceFieldProps<T>): ReactElement {
  const { options, value, onChange, label, layout = "auto", breakpoint = "md", ref, ...field } = props;
  // Asked whatever `layout` says: a hook is not skipped.
  const narrow = useBreakpoint(`max-${breakpoint}` as const);
  // The control changes element with the form, and the caller's ref follows it. A
  // callback rather than the ref itself: ToggleGroup's is a div's and Select's a select's.
  const setControl = useCallback((element: HTMLElement | null) => assignRef(ref, element), [ref]);
  // Select tests `label === undefined`, ToggleGroup `hasContent`: one rule for both, so an
  // empty label is no label in either form.
  const named = hasContent(label) ? label : undefined;
  // `field` is spread whole, never rebuilt: Select keeps the box under its field while the
  // caller PASSES `error` or `hint` (`"error" in props`), so a key it did not pass must not
  // appear, or the field would change its box (and its grid cell) between the two forms.
  if (layout === "select" || (layout === "auto" && narrow)) {
    // A value no option has: React would show the FIRST option as chosen and the reader
    // would hear it, while the group shows none — and picking that first option would
    // change nothing, so it could not be chosen. An empty, unpickable stand-in holds the
    // value instead, as no segment pressed does.
    const listed = options.some((option) => option.value === value);
    return (
      <Select {...field} ref={setControl} label={named} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {!listed && <option value={value} disabled hidden />}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <ToggleGroup {...field} ref={setControl} label={named} value={value} onChange={onChange} options={[...options]} />
  );
}
