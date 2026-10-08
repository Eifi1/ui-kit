import { useId } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactElement, ReactNode } from "react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { FIELD_INVALID, FloatingField, Label } from "./ui";
import { Tooltip } from "./tooltip";
import { useCommitReason } from "./write-lock";
import {
  DISABLED_REASON_LINE_CLASS,
  FIELD_CAPTION_CLASS,
  hasContent,
  LabelStrip,
  useDisabledReasonLine,
  useInlineHint,
  type DisabledReasonDisplay,
} from "./field-parts";
import { FOCUS_RING_WIDTH } from "./focus-ring";

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
   * What happens when the options do not fit the group's width. `"truncate"`
   * (default): one row, and the labels that do not fit end in an ellipsis — the height
   * never changes. `"wrap"`: the segments flow onto a second row and every label stays
   * whole ("Bewegung", not "Beweg…"), at the price of a taller group on a narrow
   * screen (lenkbank L4: five signal types on a 390px control page). From the width
   * where they fit, both look the same.
   *
   * Since 0.32 a group in the field chrome (`label`, the default placement) with four or
   * more options wraps at Large and Extra large under `"truncate"` too, inside its frame:
   * the type is bigger there and the field would otherwise run past a phone's edge
   * (docs/text-size-harmonization.md §4). The keyboard is the same either way.
   */
  overflow?: "truncate" | "wrap";
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
   *
   * Honoured inside the field chrome and the strip too (keksdose K1): the 12px type
   * stays, and the field is still 42px — see `CHROME_PAD`.
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
   * `"strip"`: the 11px static label (and `hint`) in a strip OVER the bare group, for a
   * group that stands in a row of fields but is not one (keksdose K2 — the transaction
   * row's cleared-status picker, live #288 / #431 / dev#468). No field border: the group
   * keeps its own box, and its segments drop their vertical padding so a 16px strip
   * plus the 26px group is exactly a labelled {@link Input}'s 42px, the label on the
   * same line as theirs. `error` and `caption` go under the group, as in the other two.
   *
   * Inside a `Field`, pass no `label` at all and spread the render-prop instead —
   * `{(ids, { labelId }) => <ToggleGroup {...ids} aria-labelledby={labelId} … />}` —
   * so the Field's label names the group and its hint and error describe it.
   */
  labelPlacement?: "field" | "above" | "strip";
  /**
   * Classes for the field chrome's own box — the bordered, padded box round the
   * segments — merged last, so they win. `className` styles the wrapper the chrome sits
   * in; this reaches the box itself. Only with `label` in the `"field"` placement.
   *
   * For a field JOINED flush to a neighbour (keksdose K1): reports-filters.tsx joins its
   * "group by" field to the range select on its start edge from `md` up, and squares the
   * shared corners by hand chrome today — here that is
   * `chromeClassName="md:rounded-s-none"` with `className="md:-ms-px"` (the wrapper
   * overlaps the neighbour by the one border they share). A class rather than a
   * `joined="start"` because every such join keksdose has is responsive: on a phone the
   * two stack and both keep their corners.
   */
  chromeClassName?: string;
  /** A {@link FieldHint} on the label line, as on a labelled {@link Select}. Only with
   *  `label`. */
  hint?: ReactNode;
  /** The message under the field when it is wrong: paints the field's border with
   *  `--danger`, marks the group `aria-invalid` and describes it with the message, as
   *  {@link Select}'s `error` does. Only with `label`. */
  error?: ReactNode;
  /**
   * Why the group cannot be changed right now — {@link Button}'s `disabledReason`, for
   * a group that saves itself on change (keksdose K3: the last `SaveGuard` sites are
   * self-committing controls like this one, and SaveGuard's native `disabled` took
   * them out of the tab order so the reason never reached a keyboard).
   *
   * The group stays reachable — its segments are `aria-disabled`, not `disabled`, and
   * a radio group's arrow keys still walk them — but nothing reaches `onChange`, and
   * the reason shows in the kit {@link Tooltip} over the segments on hover or focus and
   * describes each segment. The chosen option keeps its fill, as under `disabled`.
   * Wins over `disabled`, as on Button: passing both keeps the group reachable.
   */
  disabledReason?: ReactNode;
  /**
   * Where `disabledReason` shows (0.32, §4 "No fact only in a tooltip"): by default, at
   * Large and on a touch screen, as a line under the group (where its caption goes), and
   * in the tooltip over the segments otherwise. See {@link DisabledReasonDisplay}.
   */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /**
   * This group COMMITS — choosing an option saves it. Under a locked
   * {@link WriteLockProvider} it takes the `disabledReason` path with the lock's
   * reason (which wins over a `disabledReason` of its own): *"everything renders; only
   * the commit is locked"* (keksdose dev#496/#497), and a control that is its own commit
   * must render refused, never live-and-discarding. No provider, or an unlocked one:
   * no effect.
   */
  commit?: boolean;
}

/**
 * The field chrome's vertical geometry — keksdose K1, the kit reintroducing feedback
 * #117 that keksdose's hand-built chrome had fixed.
 *
 * In px at Normal, as measured; since 0.32 every term but the two borders is rem
 * (§3.2), so the sum stays a labelled Select's at 125 and 150 % too — the Select's own
 * `pt-4 pb-1` and 1.25rem line grow by the same factor (52 px at Large, 62 at Extra
 * large). The md line was `leading-[18px]` and is `leading-[1.125rem]`.
 *
 * The label is the field's static label: `top-1` and 11px in a `leading-tight` line, so
 * its line box runs from 4px to 17.75px. Until 0.22 the chrome was `pt-4` over a 20px
 * (`leading-5`) segment, so the ACTIVE segment's fill — painted from the top of the
 * segment — started at 17px (1px border + 16px), 0.75px INSIDE the label's line box:
 * the highlight touched the word above it, exactly what #117's rework had measured and
 * cured with `pt-5`.
 *
 * Now the strip is `pt-5` and the fill starts at 21px, 3.25px clear, and the segment
 * gives the 4px back so the field stays a labelled Select's 42px: `md` sets its 14px
 * text in an 18px line with a 2px moat under it (the bare group's own `p-0.5` moat),
 * `sm` sets 12px text in a 16px line over `pb-1` — keksdose's measured chrome
 * (price-level-picker, reports-filters: `pt-5 pb-1`, `text-xs md:py-0`), byte for byte.
 * Before, `size="sm"` inside the chrome was overridden to the md 20px line.
 *
 *     md: 1 + 20 + 18 + 2 + 1 = 42        sm: 1 + 20 + 16 + 4 + 1 = 42
 */
const CHROME_PAD: Record<"sm" | "md", string> = { md: "pt-5 pb-0.5", sm: "pt-5 pb-1" };
const CHROME_SEGMENT: Record<"sm" | "md", string> = { md: "py-0 leading-[1.125rem]", sm: "py-0 leading-4" };

/**
 * A group at Large and Extra large (0.32,
 * docs/text-size-harmonization.md §4 "nothing truncates", §3.3): the segments flow onto a
 * second row inside the group's frame instead of overflowing it. At 125 % a 390 px phone
 * is 312 px of Normal type, and "Month / Quarter / Half-year / Year" in one row of the
 * field ran 7 px past it: a one-row flex group is as wide as all its labels end to end
 * when a grid or a stretched column asks how small it can get, however its segments
 * truncate. Wrapped, it is as wide as its longest label.
 *
 * Wrap, not a stacked select-like list: a wrapped radio group is the same radio group —
 * one Tab stop, and the arrow keys walk the options in reading order whichever row
 * they are on (←/↑ back, →/↓ on, Home/End) — so nothing about the keyboard changes with
 * the text size. A list in its place would be a second widget with its own keys.
 *
 * Only where it has to: `flex-wrap` breaks a row only when the segments do not fit, so
 * a wide field at Large stays one row, and a segment shares out what its row leaves
 * (`flex-1`); a label wider than the whole row still truncates as the last resort.
 * A `large:` class, so it costs no render and is right on the first paint.
 * `overflow="wrap"` wraps at every size already.
 *
 * 0.32.1 (Kurvenschmiede's 0.32 report): every count and every placement but the
 * strip, not only a field of four or more. Since a row breaks only where its labels do
 * not fit, a wrap only ever replaces a truncation — and three options in a card at
 * Extra large on a 360 px phone read "Syst… Li… D…". The strip keeps one row: its
 * 26 px group is what lines it up with the 42 px fields beside it (`STRIP_SEGMENT`).
 */
const WRAP_AT_LARGE = "large:flex-wrap";

/**
 * The strip placement's segments: a 26px group (1 + 2 + 20 + 2 + 1) under the 16px
 * strip — `md`'s 20px text-sm line with no padding, `sm`'s 16px line with 2px either
 * side. See `LABEL_STRIP_PAD` for why 16.
 */
const STRIP_SEGMENT: Record<"sm" | "md", string> = { md: "py-0", sm: "py-0.5" };

/**
 * A line under the group saying what the CHOSEN option means — lenkbank's ToggleField
 * `hint` (features/gear/common.tsx:97): not help behind a "?" but a caption, and one
 * that changes as the choice does. Pass a function of the value for that; it is
 * attached with `aria-describedby`, and a function caption is also a polite live
 * region, because a description is read when the group is entered and not again when
 * an arrow key changes the choice underneath it.
 *
 * In muted caption-size text under the field (or the bare group), above an `error`.
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
    overflow = "truncate",
    ariaLabel,
    disabled = false,
    size = "md",
    label,
    labelPlacement = "field",
    chromeClassName,
    hint,
    error,
    disabledReason: ownDisabledReason,
    disabledReasonDisplay,
    commit,
    "aria-label": ariaLabelAttr,
    ...restWithMode
  } = props;
  const labelId = useId();
  const errorId = useId();
  const reasonId = useId();
  const hintCaptionId = useId();
  // The lock's reason under a locked provider (with `commit`), else the group's own.
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  const locked = hasContent(disabledReason);
  // §4: at Large and on touch the reason is a line under the group, not a bubble.
  const reasonLine = useDisabledReasonLine(disabledReasonDisplay) && locked;
  // §4: likewise a FieldHint "?" on the label line becomes a caption under the group.
  const inlineHint = useInlineHint(hint);
  const hintAsCaption = inlineHint !== hint ? inlineHint : undefined;
  const labelHint = hintAsCaption === undefined ? hint : undefined;
  // Locked looks disabled — the dimmed group, the not-allowed cursor, no hover offer —
  // but stays focusable; `disabled` alone also takes the segments out of the tab order.
  const dimmed = disabled || locked;
  const labelled = hasContent(label);
  // `field` is the chrome; a label placed above or in a strip keeps the bare group's
  // own box.
  const field = labelled && labelPlacement === "field";
  const above = labelled && labelPlacement === "above";
  const strip = labelled && labelPlacement === "strip";
  // At Large and Extra large a truncating group wraps instead, the strip excepted (see
  // WRAP_AT_LARGE).
  const wrapAtLarge = overflow === "truncate" && !strip;
  const hasError = labelled && hasContent(error);
  // Taken off the rest so neither reaches the DOM; `props` keeps them paired, which is
  // what lets the `onChange` below be called with `null` only in the mode that allows it.
  const { allowEmpty: _allowEmpty, onChange: _onChange, caption, semantics: _semantics, ...rest } = restWithMode;
  // Invalid from outside too: a `Field` hands the bare group `aria-invalid`, and the
  // border has to say what the attribute says.
  const outsideInvalid = rest["aria-invalid"] === true || rest["aria-invalid"] === "true";
  const captionId = useId();
  const captionIsLive = typeof caption === "function";
  const captionNode = captionIsLive ? (caption as (v: T | null) => ReactNode)(value) : caption;
  const hasCaption = hasContent(captionNode);
  const choose = (next: T) => {
    // A locked group swallows the change: it saves on change, and a lock that let the
    // value move and then discarded it would show a state that was never stored.
    if (locked) return;
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
    // The segments' own parent: the group, or under a lock the tooltip's row inside it.
    const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(":scope > button");
    buttons?.[next]?.focus();
    // Locked: the focus walks (each segment says why on arrival), the choice does not.
    choose(options[next].value);
  };
  const segments = options.map((opt, index) => {
    const active = opt.value === value;
    return (
      <button
        key={opt.value}
        type="button"
        role={pressed ? undefined : "radio"}
        aria-checked={pressed ? undefined : active}
        aria-pressed={pressed ? active : undefined}
        // A reason wins over `disabled` (as on Button): reachable, and refusing.
        disabled={disabled && !locked}
        aria-disabled={locked || undefined}
        // On each segment rather than the group: the segment is what takes focus, and
        // a group's description is not read reliably when focus lands inside it.
        aria-describedby={locked ? reasonId : undefined}
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
          //
          // The ring is the kit's focus frame (0.32, §5): `--focus-ring-width` wide.
          overflow === "wrap" ? "whitespace-nowrap" : "min-w-0 truncate",
          "flex-1 basis-auto rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-inset focus-visible:ring-[var(--border-strong)]",
          FOCUS_RING_WIDTH,
          size === "sm" && "px-2 py-1 text-xs",
          // In the field chrome: no vertical padding, and the line that makes the
          // field 42px under a strip that clears the label — see CHROME_PAD. `sm`
          // keeps its 12px type here (it used to be overridden to the md line).
          field && CHROME_SEGMENT[size],
          // In the strip placement: a 26px group under a 16px strip — STRIP_SEGMENT.
          strip && STRIP_SEGMENT[size],
          active
            ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
          // No hover fill on a group that cannot be changed — a segment that
          // lights up under the pointer is an offer, and there is none here. Not on
          // the chosen segment: its fill IS its state, and its inverse text would
          // vanish on a transparent hover.
          dimmed && "cursor-not-allowed",
          dimmed && !active && "hover:bg-transparent dark:hover:bg-transparent",
          optionClassName,
          opt.className,
        )}
      >
        {opt.label}
      </button>
    );
  });
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
        [rest["aria-describedby"], hintAsCaption !== undefined && hintCaptionId, hasCaption && captionId, hasError && errorId]
          .filter(Boolean)
          .join(" ") || undefined
      }
      // `aria-disabled` on the group as well as on (or `disabled` on) each button: a
      // radio group is what the user is being refused, and a screen reader announcing
      // three separately-disabled radios does not say that.
      aria-disabled={dimmed || undefined}
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
        overflow === "wrap" && "flex-wrap",
        wrapAtLarge && WRAP_AT_LARGE,
        // The whole group fades, the way every other disabled control in this
        // package does; `cursor-not-allowed` is on the buttons, which is what a
        // pointer is actually over.
        dimmed && "opacity-60",
        // The bare group (no chrome to paint) wears the invalid border itself.
        !field && (outsideInvalid || ((above || strip) && hasError)) && FIELD_INVALID,
        // Inside the field's chrome the group is only a row of segments: no border, no
        // surface, no padding of its own, and the field (not the group) is what dims.
        field && "border-0 bg-transparent p-0 shadow-none opacity-100",
        !labelled && className,
      )}
    >
      {locked && !reasonLine ? (
        // The reason's bubble wraps the SEGMENTS, inside the group, not the group: a
        // wrapper outside it would become the flex or grid item in the caller's row in
        // the group's place, and a `w-full` / `md:w-auto` on the group would size the
        // wrong box. This row inherits the group's gap and wrap, so the segments lay out
        // exactly as they do unlocked, and `:scope > button` above still finds them. A
        // fragment child, so the Tooltip describes nothing itself — each segment points
        // at the hidden copy, the way a locked Button does.
        <Tooltip label={disabledReason} className="flex min-w-0 flex-1 gap-[inherit] [flex-wrap:inherit]">
          <>
            {segments}
            <span id={reasonId} hidden>
              {disabledReason}
            </span>
          </>
        </Tooltip>
      ) : (
        segments
      )}
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
        className={cn("text-caption leading-snug text-[var(--text-muted)]", hasCaption && "mt-1")}
      >
        {hasCaption ? captionNode : null}
      </p>
    ) : null;
  const errorEl = hasError ? (
    <p id={errorId} className="mt-1 text-caption leading-tight text-[var(--danger)]">
      {error}
    </p>
  ) : null;
  // §4: the FieldHint's words and the lock's reason, under the group, before the caption
  // (standing advice first) and the error (the news). The reason line IS what each
  // segment's `aria-describedby` names.
  const belowEl =
    hintAsCaption !== undefined || reasonLine ? (
      <>
        {hintAsCaption !== undefined && (
          <p id={hintCaptionId} className={FIELD_CAPTION_CLASS}>
            {hintAsCaption}
          </p>
        )}
        {reasonLine && (
          <p id={reasonId} className={DISABLED_REASON_LINE_CLASS}>
            {disabledReason}
          </p>
        )}
      </>
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
            disabled={dimmed}
            data-error={hasError || undefined}
            className="data-[error=true]:text-[var(--danger)]"
          >
            {label}
          </Label>
          {labelHint}
        </div>
        <div className="min-w-0">
          {group}
          {belowEl}
          {captionEl}
          {errorEl}
        </div>
      </div>
    );
  }
  if (strip) {
    return (
      <LabelStrip labelId={labelId} label={label} hint={labelHint} disabled={dimmed} pad="field" className={className}>
        {group}
        {belowEl}
        {captionEl}
        {errorEl}
      </LabelStrip>
    );
  }
  if (!field) {
    if (!captionEl && !belowEl) return group;
    // The group keeps its `className`, as without a caption; the wrapper only stacks.
    return (
      <div className="min-w-0">
        {group}
        {belowEl}
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
        hint={labelHint}
      >
        <div
          className={cn(
            "flex flex-1 flex-col justify-center rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-1 shadow-sm",
            CHROME_PAD[size],
            dimmed && "bg-[var(--bg-surface-2)] opacity-60",
            hasError && FIELD_INVALID,
            chromeClassName,
          )}
        >
          {group}
        </div>
      </FloatingField>
      {belowEl}
      {captionEl}
      {errorEl}
    </div>
  );
}
