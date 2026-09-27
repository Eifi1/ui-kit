import { useId } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactElement, ReactNode } from "react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { FIELD_INVALID, FloatingField, Label } from "./ui";

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  className?: string;
}

/**
 * `onChange` is the group's own — the chosen VALUE, not a DOM event — so the div's
 * `onChange` is omitted rather than shadowed: leaving both in scope would give the
 * prop two incompatible meanings depending on which overload TypeScript picked.
 *
 * `children` is omitted too: this renders its `options` and nothing else, so a `children` the type
 * accepted and the component ignored would be a prop that silently does nothing —
 * worse than one that does not compile.
 */
export interface ToggleGroupBaseProps<T extends string>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "children"> {
  options: ToggleOption<T>[];
  className?: string;
  /** Applied to every option button (e.g. to tune height/rounding to match
   *  adjacent fields). Per-option `className` still wins over this. */
  optionClassName?: string;
  /**
   * @deprecated Pass `aria-label` instead — the DOM spelling, which every other
   * control in this kit now answers to. Kept working because three applications ship
   * this one today; it names the group only when `aria-label` is absent.
   */
  ariaLabel?: string;
  /**
   * Show, refuse the change (Keksdose live #288: a payment dated in the future has no
   * state to set).
   *
   * Whatever `value` says stays pressed and keeps its own fill rather than going grey
   * with the rest — a reader who cannot see WHICH option is chosen has been told less
   * than before it was disabled. A caller with nothing to show passes no value, and
   * the group renders dimmed with nothing pressed, which is the shape Keksdose's
   * status picker uses for a row whose status does not exist yet.
   *
   * On the whole GROUP, not per option: a segmented control where some segments are
   * live and others are not is a menu with holes in it, and no caller here wants one.
   */
  disabled?: boolean;
  /**
   * `sm`: 12px options with `px-2 py-1` — the compact group keksdose's rule editor
   * (rule-editor:204) writes as `optionClassName="px-2 py-1 text-xs"` beside a small
   * caption. `md` (default) is the size every other group has.
   */
  size?: "sm" | "md";
  /**
   * Stand in a form row as a FIELD: with a label the group wears the field's chrome —
   * border, surface, the top strip with a small static label in it, a labelled
   * {@link Select}'s height — so beside an Input or a Select it reads as one of them
   * rather than as a control with a caption over it. lenkbank builds exactly this by
   * hand as `ToggleField` (features/gear/common.tsx:97, feedback #69), and its notes
   * are why the chrome STRETCHES to its row as well as matching the select's padding:
   * a native select's height is the browser's, so a toggle a few pixels short of it
   * is levelled up by the row rather than by arithmetic.
   *
   * The label names the group (`aria-labelledby`), so `aria-label` is not needed. With
   * a label, `className` styles the field's wrapper — as on {@link Select} — and the
   * group's own box is dropped: two nested borders read as a control in a control.
   */
  label?: ReactNode;
  /**
   * Where `label` goes. `"field"` (default): the field chrome described under `label`.
   * `"above"`: the kit's {@link Label} over the bare group — the shape of a {@link Field}
   * — with `hint` beside the label and `error` under the group, for a form that sets
   * its labels above its fields (kastlan's international-rent-calculator.tsx, whose DE
   * cap pair sits in a `Field` column between two labelled-above inputs, where the
   * chrome's inner label would be the only one of its kind).
   *
   * Inside a `Field`, pass no `label` at all and spread the render-prop instead —
   * `{(ids, { labelId }) => <ToggleGroup {...ids} aria-labelledby={labelId} … />}` —
   * so the Field's label names the group and its hint and error describe it.
   */
  labelPlacement?: "field" | "above";
  /** A {@link FieldHint} on the label line, as on a labelled {@link Select}. Only with
   *  `label`. */
  hint?: ReactNode;
  /** The message under the field when it is wrong: paints the field's border with
   *  `--danger`, marks the group `aria-invalid` and describes it with the message, as
   *  {@link Select}'s `error` does. Only with `label`. */
  error?: ReactNode;
}

/**
 * A line under the group saying what the CHOSEN option means — lenkbank's ToggleField
 * `hint` (features/gear/common.tsx:97): not help behind a "?" but a caption, and one
 * that changes as the choice does. Pass a function of the value for that; it is
 * attached with `aria-describedby`, and a function caption is also a polite live
 * region, because a description is read when the group is entered and not again when
 * an arrow key changes the choice underneath it.
 *
 * In muted 11px text under the field (or the bare group), above an `error`.
 */
type ToggleGroupCaption<V> = ReactNode | ((value: V) => ReactNode);

/** The group as it has always been: one option is always the answer. */
export interface ToggleGroupRequiredProps<T extends string> extends ToggleGroupBaseProps<T> {
  allowEmpty?: false;
  /**
   * What the options ARE to a screen reader, separately from whether the group can be
   * emptied (kastlan feedback #47).
   *
   *  - `"radio"` (default) — a `radiogroup` of radios: one Tab stop, arrow keys MOVE the
   *    choice. Right for a choice between answers ("Monthly / Yearly").
   *  - `"pressed"` — a `group` of toggle buttons (`aria-pressed`), each its own Tab stop,
   *    Space/Enter to press; still one option always pressed. Right for a row that reads
   *    as a set of switches — a view mode, a toolbar-like filter — where arrows moving the
   *    selection on focus would be a surprise.
   *
   * Before this the only way to `aria-pressed` was `allowEmpty`, which also let a second
   * press clear the choice — so kastlan took the clearable shape and threw the `null`
   * away in `onChange` (`(v) => v && setMode(v)`), a group announcing that a press would
   * unpress what it would not. Here a press on the pressed option re-sends its value, as
   * the radio shape does, and nothing is ever unpressed. A clearable group
   * (`allowEmpty`) is always `"pressed"`: a radio cannot be unchecked by activating it.
   */
  semantics?: "radio" | "pressed";
  value: T;
  onChange: (value: T) => void;
  /** See {@link ToggleGroupCaption}. */
  caption?: ToggleGroupCaption<T>;
}

/**
 * A group that can be emptied: clicking the active option clears it, and `onChange`
 * receives `null` (Keksdose's support-panel filters, where "no filter" is reached by
 * clicking the filter that is on).
 *
 * The options become TOGGLE BUTTONS (`aria-pressed`, in a `role="group"`) rather than
 * radios. A radio cannot be unchecked by activating it — no screen reader user expects
 * a second press on "Open, radio, checked" to leave nothing checked, and nothing would
 * tell them it had. "Open, toggle button, pressed" says exactly what a press will do.
 */
export interface ToggleGroupClearableProps<T extends string> extends ToggleGroupBaseProps<T> {
  allowEmpty: true;
  /** Always toggle buttons — see {@link ToggleGroupRequiredProps.semantics}. Accepted so
   *  a wrapper can forward one `semantics` to either shape. */
  semantics?: "pressed";
  value: T | null;
  onChange: (value: T | null) => void;
  /** See {@link ToggleGroupCaption}. `null` while nothing is chosen. */
  caption?: ToggleGroupCaption<T | null>;
}

/** `allowEmpty` picks the shape, so `onChange` is typed `(T) => void` unless the group
 *  can actually emit `null` — no existing caller has a `null` to handle. */
export type ToggleGroupProps<T extends string> =
  | ToggleGroupRequiredProps<T>
  | ToggleGroupClearableProps<T>;

/**
 * Overloaded rather than typed by the union alone (keksdose, "Gaps found adopting
 * 0.6.0" #7). Inferring `T` through a union of prop shapes let TypeScript settle on
 * `string`, so `<ToggleGroup allowEmpty value={filter} onChange={setFilter} />` over a
 * `useState<Status | null>` did not compile unless the caller spelled
 * `<ToggleGroup<Status>>`. One signature per mode lets each infer `T` from its own
 * `value`/`onChange`/`options`; the third keeps a caller that forwards a
 * {@link ToggleGroupProps} union (a wrapper component) compiling.
 */
export function ToggleGroup<T extends string>(props: ToggleGroupClearableProps<T>): ReactElement;
export function ToggleGroup<T extends string>(props: ToggleGroupRequiredProps<T>): ReactElement;
export function ToggleGroup<T extends string>(props: ToggleGroupProps<T>): ReactElement;
export function ToggleGroup<T extends string>(props: ToggleGroupProps<T>): ReactElement {
  const {
    value,
    options,
    className,
    optionClassName,
    ariaLabel,
    disabled = false,
    size = "md",
    label,
    labelPlacement = "field",
    hint,
    error,
    "aria-label": ariaLabelAttr,
    ...restWithMode
  } = props;
  const labelId = useId();
  const errorId = useId();
  const labelled = label !== undefined && label !== null && label !== false && label !== "";
  // `field` is the chrome; a label placed above keeps the bare group's own box.
  const field = labelled && labelPlacement === "field";
  const above = labelled && labelPlacement === "above";
  const hasError = labelled && error !== undefined && error !== null && error !== false && error !== "";
  // Taken off the rest so neither reaches the DOM; `props` keeps them paired, which is
  // what lets the `onChange` below be called with `null` only in the mode that allows it.
  const { allowEmpty: _allowEmpty, onChange: _onChange, caption, semantics: _semantics, ...rest } = restWithMode;
  // Invalid from outside too: a `Field` hands the bare group `aria-invalid`, and the
  // border has to say what the attribute says.
  const outsideInvalid = rest["aria-invalid"] === true || rest["aria-invalid"] === "true";
  const captionId = useId();
  const captionIsLive = typeof caption === "function";
  const captionNode = captionIsLive ? (caption as (v: T | null) => ReactNode)(value) : caption;
  const hasCaption = captionNode !== undefined && captionNode !== null && captionNode !== false && captionNode !== "";
  const choose = (next: T) => {
    if (props.allowEmpty) props.onChange(next === value ? null : next);
    else props.onChange(next);
  };
  // `pressed`: toggle buttons. Every clearable group is; a required one is when it asks
  // (kastlan #47) — the role, and not whether a second press clears, is what this flag
  // decides from here on, so `choose` above still keys off `allowEmpty` alone.
  const pressed = props.allowEmpty === true || props.semantics === "pressed";
  // A radio group is ONE tab stop (the checked radio, else the first) and arrows move
  // the choice — the pattern `role="radiogroup"` promises a screen-reader user. Before
  // 0.7.0 each segment was its own tab stop with no arrow keys. The toggle-button shape
  // is a row of buttons, where separate tab stops are the pattern.
  const tabStop = options.some((o) => o.value === value) ? value : options[0]?.value;
  const onRadioKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1;
    let next: number | null = null;
    const step = horizontalStep(e.key, e.currentTarget);
    if (step !== 0) next = index + step;
    else if (e.key === "ArrowDown") next = index + 1;
    else if (e.key === "ArrowUp") next = index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    next = next < 0 ? last : next > last ? 0 : next;
    const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(":scope > button");
    buttons?.[next]?.focus();
    choose(options[next].value);
  };
  const group = (
    <div
      // The audit's named example of a closed prop list (§"Public API design"): the
      // tour locates a step by CSS SELECTOR, so a component that drops every attribute
      // it was not expecting cannot be spotlighted at all — and Keksdose's rule editor
      // carries a comment explaining that it wraps this group in a bare <div> for
      // exactly that reason.
      //
      // `...rest` first, then the attributes the group cannot do without: a caller
      // hanging an anchor or a test id on the group must not be able to overwrite the
      // radiogroup role or the disabled state by accident. `className` is destructured
      // out entirely and merged through `cn`, so it is never in here.
      {...rest}
      role={pressed ? "group" : "radiogroup"}
      // The DOM spelling wins; `ariaLabel` is the fallback for the call sites that
      // have not moved yet.
      aria-label={ariaLabelAttr ?? ariaLabel}
      aria-labelledby={labelled && ariaLabelAttr === undefined && ariaLabel === undefined ? labelId : rest["aria-labelledby"]}
      aria-invalid={hasError || rest["aria-invalid"] || undefined}
      aria-describedby={
        [rest["aria-describedby"], hasCaption && captionId, hasError && errorId].filter(Boolean).join(" ") || undefined
      }
      // `aria-disabled` on the group as well as `disabled` on each button: a radio
      // group is what the user is being refused, and a screen reader announcing
      // three separately-disabled radios does not say that.
      aria-disabled={disabled || undefined}
      className={cn(
        // `gap-0.5` — the same 2px as the container's own padding, so EVERY segment
        // sits in a uniform 2px moat and no two fills ever touch. Flush segments were
        // Keksdose live #268's rework: the pressed segment wears a saturated fill and
        // an unpressed neighbour wears a pale hover fill, and with a shared edge the
        // two rectangles read as one smeared shape — *"the boundary of the selected
        // option and hovering next to it overlays the boundary of the selected
        // button"*. A gap is what makes each segment its own chip; it cannot be
        // undone by a caller's per-option colour, which a hover-only fix could.
        //
        // (The hover fill is the DESKTOP half of that report: Tailwind v4 wraps every
        // `hover:` in `@media (hover: hover)`, so a phone never paints it. The half a
        // phone does see is the focus ring — see the segment's own note below.)
        "inline-flex w-full gap-0.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] p-0.5 shadow-sm",
        // The whole group fades, the way every other disabled control in this
        // package does; `cursor-not-allowed` is on the buttons, which is what a
        // pointer is actually over.
        disabled && "opacity-60",
        // The bare group (no chrome to paint) wears the invalid border itself.
        !field && (outsideInvalid || (above && hasError)) && FIELD_INVALID,
        // Inside the field's chrome the group is only a row of segments: no border, no
        // surface, no padding of its own, and the field (not the group) is what dims.
        field && "border-0 bg-transparent p-0 shadow-none opacity-100",
        !labelled && className,
      )}
    >
      {options.map((opt, index) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role={pressed ? undefined : "radio"}
            aria-checked={pressed ? undefined : active}
            aria-pressed={pressed ? active : undefined}
            disabled={disabled}
            tabIndex={pressed ? undefined : opt.value === tabStop ? 0 : -1}
            onKeyDown={pressed ? undefined : (e) => onRadioKey(e, index)}
            onClick={() => choose(opt.value)}
            className={cn(
              // `truncate` (which carries whitespace-nowrap) rather than letting a
              // label wrap: a segmented control sizes its whole row to the tallest
              // option, so one two-word option — Keksdose feedback #147's "Where I
              // am" — silently doubles the height of every segment beside it.
              //
              // `basis-auto` is what keeps that ellipsis a LAST resort rather than
              // the normal state (Keksdose dev#475). With flex-1's `basis-0`, a
              // shrink-to-fit group (`w-auto`) still resolves to the sum of the
              // labels' widths — and then splits it EQUALLY, so the short option
              // got 66px it did not need and "Where I am" got 66 of the 81 it did:
              // truncated at 1778px of free screen. Basing each segment on its own
              // content and sharing only the LEFTOVER space keeps a full-width
              // group's segments near-equal and an auto-width group's exact.
              //
              // `focus-visible` + `ring-inset`, not `focus` + an outset ring. A ring
              // is a box-shadow that spreads OUTWARD, so on a flush group it painted
              // 2px of ring over both neighbours and over the container's own border
              // — and on a phone it appeared on every TAP, because a tap focuses the
              // button. That is the other half of what live #268's rework saw
              // overlaying the selected segment's boundary. Inset keeps the ring
              // inside the segment it belongs to; focus-visible keeps it for the
              // keyboard, which is the only input that needs it.
              "min-w-0 flex-1 basis-auto truncate rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-strong)]",
              size === "sm" && "px-2 py-1 text-xs",
              // In a field: no vertical padding and a 20px line — a `text-sm` line, the
              // same line a labelled Select holds under its label strip — so the field's
              // own `pt-4 pb-1` decides the height, as it does for the select.
              field && "py-0 leading-5",
              active
                ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
              // No hover fill on a group that cannot be changed — a segment that
              // lights up under the pointer is an offer, and there is none here.
              disabled && "cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent",
              optionClassName,
              opt.className,
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
  // Rendered whenever the caption is — `aria-live` must be on the element BEFORE its
  // text changes, or the change is not announced — but empty (no height, no margin)
  // when there is nothing to say, so a function caption that returns null for some
  // options leaves no gap. Empty rather than `hidden`: some readers do not announce
  // text that appears inside an element coming back from `display: none`.
  const captionEl =
    hasCaption || captionIsLive ? (
      <p
        id={captionId}
        aria-live={captionIsLive ? "polite" : undefined}
        className={cn("text-[11px] leading-snug text-[var(--text-muted)]", hasCaption && "mt-1")}
      >
        {hasCaption ? captionNode : null}
      </p>
    ) : null;
  const errorEl = hasError ? (
    <p id={errorId} className="mt-1 text-[11px] leading-tight text-[var(--danger)]">
      {error}
    </p>
  ) : null;
  if (above) {
    // `relative` so a caller's `sr-only` label cannot escape (sr-only-containment).
    return (
      <div className={cn("relative grid min-w-0 gap-1.5", className)}>
        <div className="flex items-center gap-1">
          {/* A `<label>` with no `htmlFor`: a group is not labelable, so it is named
              by `aria-labelledby` on the group; the element keeps the Field look. */}
          <Label
            id={labelId}
            disabled={disabled}
            data-error={hasError || undefined}
            className="data-[error=true]:text-[var(--danger)]"
          >
            {label}
          </Label>
          {hint}
        </div>
        <div className="min-w-0">
          {group}
          {captionEl}
          {errorEl}
        </div>
      </div>
    );
  }
  if (!field) {
    if (!captionEl) return group;
    // The group keeps its `className`, as without a caption; the wrapper only stacks.
    return (
      <div className="min-w-0">
        {group}
        {captionEl}
      </div>
    );
  }
  return (
    // `h-full` + `flex-1`: the chrome fills a grid or stretched flex row, which is what
    // levels it with a select beside it whatever the browser makes of the select.
    <div className={cn("flex h-full flex-col", className)}>
      <FloatingField
        className="flex flex-1 flex-col"
        label={<span id={labelId}>{label}</span>}
        staticLabel
        hint={hint}
      >
        <div
          className={cn(
            "flex flex-1 flex-col justify-center rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-1 pt-4 pb-1 shadow-sm",
            disabled && "bg-[var(--bg-surface-2)] opacity-60",
            hasError && FIELD_INVALID,
          )}
        >
          {group}
        </div>
      </FloatingField>
      {captionEl}
      {errorEl}
    </div>
  );
}
