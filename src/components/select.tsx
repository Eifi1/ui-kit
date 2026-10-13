import { useId } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode, Ref, SelectHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import type { CommitScope } from "./write-lock";
import {
  LockedReason,
  mergeDescribedBy,
  type DisabledReasonDisplay,
  type FieldHelpProps,
  useFieldError,
  useFieldHint,
  useLockReason,
} from "./field-parts";
import {
  FIELD_BASE,
  FIELD_FLOATING_PAD,
  FIELD_INVALID,
  FieldChevron,
  FieldGroup,
  FloatingField,
  fieldBelow,
} from "./field-base";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">, FieldHelpProps {
  label?: ReactNode;
  /** See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** See {@link Input}'s `error`. */
  error?: ReactNode;
  /** A {@link FieldHint} for the label line — see {@link FloatingField}. Plain
   *  TEXT (a string or a number) is a caption instead, and goes UNDER the field
   *  like every other field's hint, attached through `aria-describedby`: the label
   *  line is 11px of strip shared with the label, and a sentence placed there was
   *  set in the value's type on top of both the label and the value. On an
   *  UNLABELLED Select (no label line) a FieldHint sits at the field's end edge,
   *  outside the box. Since 0.34 a FieldHint is the caption at Large and on a touch
   *  screen, as on Input (`useInlineHint`); a `HelpPopover` stays a "?". Beside a
   *  `help` (0.36) the hint is the caption at every size: the help's "?" is the only one. */
  hint?: ReactNode;
  /**
   * `"sm"`: a 28px, 12px-type select for a toolbar or a table header, where the
   * 36px field stands a head taller than the buttons beside it. `"md"` (default)
   * is the field every form uses. Unlabelled selects only — a floating label needs
   * the tall box to float in, so a labelled Select ignores `"sm"`.
   *
   * A NUMBER is still the native attribute (the rows of a list box) and is passed
   * straight through, so the one HTML meaning of `size` keeps working. Above 1 (as
   * with `multiple`) the browser draws a list box, and the Select drops its chevron
   * and the end padding reserved for it.
   */
  size?: "sm" | "md" | number;
  /** Classes for the `<select>` itself. `className` styles the WRAPPER — the box
   *  the chevron is positioned against — so it could set a width and nothing
   *  else; this is the way to the element. See {@link Input}'s `inputClassName`. */
  selectClassName?: string;
  /**
   * Why the choice cannot be changed — {@link Button}'s `disabledReason`, for a select
   * that SAVES on change (a role picker in a members table, a status in a row). keksdose
   * K3: those sat inside a hand-rolled `SaveGuard` that forced a native `disabled`, which
   * took the field out of the tab order so the reason never reached a keyboard.
   *
   * With a reason the select is `aria-disabled` instead — still focusable, still showing
   * its value — its list does not open (pointer and keys are swallowed, Tab and Escape
   * excepted), `onChange` is never called, and the reason is a line under the field at
   * Large and on a touch screen, else in the kit {@link Tooltip} (`disabledReasonDisplay`),
   * and on `aria-describedby`. It wears the settled look of a disabled field and drops
   * its chevron, as a disabled Select does (dev#474). It wins over `disabled`.
   *
   * Use it CONTROLLED (`value` + `onChange`): React puts a controlled value back after
   * the swallowed change. A touch platform's own picker may still open; nothing it picks
   * is kept or reported.
   */
  disabledReason?: ReactNode;
  /**
   * Where the reason shows — {@link Button}'s `disabledReasonDisplay`: by default a line
   * under the field at Large and on a touch screen, the tooltip otherwise (§4 "No fact
   * only in a tooltip"; DUP-3, refactor audit 2026-10).
   */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /**
   * This select COMMITS — choosing saves. Under a locked {@link WriteLockProvider} it is
   * locked the `disabledReason` way with the lock's reason (which wins over its own).
   * No provider, or an unlocked one: no effect. Button's `commit`, for keksdose K3; a
   * {@link CommitScope} since 0.33.
   */
  commit?: CommitScope;
  /** The `<select>`. A React 19 ref prop since 0.34 — see {@link InputProps.ref}. */
  ref?: Ref<HTMLSelectElement>;
}

// The compact select: the field's colours, a toolbar button's height. `py-0` and a
// fixed height rather than a smaller padding, so the box is 28px whatever line
// height the caller's type brings with it.
const SELECT_SM = "h-7 py-0 ps-2 pe-7 text-xs";

/** Keys a locked select still answers: leaving it, and dismissing its tooltip. Every
 *  other key would open the list or step the value. */
const LOCKED_SELECT_KEYS = new Set(["Tab", "Escape", "Shift"]);

/** FIELD_BASE's `disabled:` look, for a select that is locked without being `disabled`
 *  (the `:disabled` variants cannot match it). */
const FIELD_LOCKED = "cursor-not-allowed bg-surface-2 text-muted";

export function Select(props: SelectProps) {
  const {
    ref,
    className,
    label,
    id,
    children,
    invalid,
    error,
    hint: hintProp,
    help,
    size,
    selectClassName,
    disabledReason,
    disabledReasonDisplay,
    commit,
    onMouseDown,
    onKeyDown,
    onChange,
    ...rest
  } = props;
  // See Input's `reserve`.
  const reserve = "error" in props || "hint" in props || "showCount" in props;
  const generated = useId();
  const lock = useLockReason(commit, disabledReason);
  const locked = lock.locked;
  // Only a number reaches the DOM; the two words are this component's own.
  const nativeSize = typeof size === "number" ? size : undefined;
  // A numeric size above 1 (or `multiple`) makes the browser draw a LIST BOX — all
  // the rows in the field, no menu to drop. The dropdown dress did not fit it: the
  // chevron was centred on a box several rows tall, sat on top of the rows' text
  // at the end edge, and `pe-9` clipped every option nine units early. A list box
  // gets the plain field instead — its own native scroll, no chevron, even padding.
  const listBox = (nativeSize !== undefined && nativeSize > 1) || Boolean(rest.multiple);
  const small = size === "sm" && label === undefined;
  const fieldId = id ?? generated;
  // Text is a caption under the field; a FieldHint rides the label line — and at Large
  // and on a touch screen is its words, a caption like any text (§4; a HelpPopover stays
  // on the label line, §10.23). See `hint` above. Through useFieldHint since 0.34, not a
  // copy of its rule (DUP-2, refactor audit 2026-10).
  const hintParts = useFieldHint(hintProp, rest["aria-describedby"], { help, name: label ?? rest["aria-label"] });
  const hint = hintParts.labelHint;
  const { isInvalid, describedBy, errorEl } = useFieldError(
    error,
    invalid,
    // The caption goes in BEFORE the error — the standing advice first, the news
    // second, the order useFieldError keeps for a caller's own description. A lock's
    // reason sits between the two.
    mergeDescribedBy(hintParts.describedBy, locked && lock.reasonId),
    rest["aria-invalid"],
  );
  const below = fieldBelow(hintParts, null, errorEl);
  // Custom chevron (native arrow hidden via appearance-none) so it sits a touch
  // in from the end border and matches both themes — feedback #223. A DISABLED
  // select has no menu to drop, so it drops the chevron too: the arrow is the one
  // thing on the control that promises a choice (Keksdose dev#474, where the
  // account type became read-only and still looked exactly like a picker). A locked
  // one has no menu either.
  const chevron =
    rest.disabled || listBox || locked ? null : (
      <FieldChevron className={small ? "end-1.5 size-3.5" : undefined} />
    );
  // `pe-9` is the room the chevron takes; a list box has none to make room for.
  //
  // A list box's height is `size` rows plus its padding, but its rows are clipped at
  // the PADDING edge, not the content edge — so FIELD_BASE's `pb-2` showed the next
  // row through the bottom padding: `size={4}` drew four and a half. The vertical room
  // moves onto the rows instead (option padding counts toward the row height the
  // browser sizes the box by), and the box keeps no bottom padding: exactly `size`
  // whole rows, at any width.
  const dress = listBox ? "overflow-y-auto [&_option]:py-1" : "appearance-none pe-9";
  // Locked: focusable, but nothing opens the list or moves the value, and nothing is
  // reported. The no-op `onChange` keeps a controlled select's value where React put
  // it (and keeps React from warning about a `value` with no handler).
  const interaction = locked
    ? {
        disabled: undefined,
        "aria-disabled": true as const,
        onMouseDown: (e: MouseEvent<HTMLSelectElement>) => e.preventDefault(),
        onKeyDown: (e: KeyboardEvent<HTMLSelectElement>) => {
          if (!LOCKED_SELECT_KEYS.has(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
        },
        onChange: () => {},
      }
    : { onMouseDown, onKeyDown, onChange };
  // While locked the field sits in the reason's frame (the line, or the Tooltip), which
  // becomes the outermost box — so `className` (a width, a grid cell) moves onto it, and
  // the form keeps its layout. `block` so a full-width field stays full width inside it.
  const boxClass = locked ? undefined : className;
  const withReason = (box: ReactNode) =>
    locked ? (
      <LockedReason lock={lock} display={disabledReasonDisplay} className={cn("block", className)}>
        {box}
      </LockedReason>
    ) : (
      box
    );
  if (label === undefined) {
    const select = (
      <select
        ref={ref}
        // `id` is destructured out of the props to feed `fieldId`, and this branch
        // never put it back — so an UNLABELLED Select swallowed it and the
        // consumer's own `<label for="…">` pointed at nothing. The control stayed
        // in the tab order with no accessible name at all: reachable, and silent
        // when it was reached. Input and Textarea both forward it here; this is
        // the third one doing the same thing.
        id={id}
        size={nativeSize}
        {...rest}
        {...interaction}
        // OR-ed with the spread for the reason spelled out on Input's copy: this
        // branch wrote `invalid || undefined`, so passing `aria-invalid` by hand
        // to a Select — which is what a caller does when the validity is
        // `"grammar"` or `"spelling"`, or when the paint is not wanted — had the
        // attribute silently dropped. Input has never done that.
        aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
        aria-describedby={describedBy}
        className={cn(
          FIELD_BASE,
          dress,
          listBox && "py-0",
          small && SELECT_SM,
          locked && FIELD_LOCKED,
          selectClassName,
          isInvalid && FIELD_INVALID,
        )}
      >
        {children}
      </select>
    );
    // A FieldHint with no label line to ride (0.15.5 P8): an unlabelled Select — named
    // by `aria-label` or a `<label>` of the caller's — dropped a non-text `hint`
    // without a trace, so the "?" a caller passed never rendered and a test looking
    // for its button found none. It goes at the end of the field instead, outside the
    // box, as the label line's own hint goes at the end of the label.
    if (hint !== undefined) {
      return (
        <FieldGroup errorEl={below} reserve={reserve}>
          {withReason(
            <div className={cn("flex items-center gap-1.5", boxClass)}>
              <div className="relative min-w-0 flex-1">
                {select}
                {chevron}
              </div>
              <span className="flex shrink-0 items-center">{hint}</span>
            </div>,
          )}
        </FieldGroup>
      );
    }
    return (
      <FieldGroup errorEl={below} reserve={reserve}>
        {withReason(
          <div className={cn("relative", boxClass)}>
            {select}
            {chevron}
          </div>,
        )}
      </FieldGroup>
    );
  }
  return (
    <FieldGroup errorEl={below} reserve={reserve}>
      {withReason(
        <FloatingField
          className={boxClass}
          htmlFor={fieldId}
          label={label}
          staticLabel
          hint={hint}
        >
          <select
            ref={ref}
            id={fieldId}
            size={nativeSize}
            {...rest}
            {...interaction}
            aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
            aria-describedby={describedBy}
            className={cn(
              FIELD_BASE,
              // The floated label takes the top strip of a list box too, so its first
              // row starts under the label rather than behind it. No bottom padding — see
              // `dress`.
              // At Large the label stands above the field (§10.17): no strip.
              listBox ? "pt-5 pb-0 large:pt-2" : FIELD_FLOATING_PAD,
              "peer",
              dress,
              locked && FIELD_LOCKED,
              selectClassName,
              isInvalid && FIELD_INVALID,
            )}
          >
            {children}
          </select>
          {chevron}
        </FloatingField>,
      )}
    </FieldGroup>
  );
}
