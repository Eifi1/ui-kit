import { createContext, isValidElement, useContext, useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "../lib/cn";
import { useInlineFacts } from "../hooks/use-large-text";
import { FOCUS_RING } from "./focus-ring";
import { Tooltip, type TooltipSide } from "./tooltip";
import { useCommitReason, type CommitScope } from "./write-lock";
import { hasMessage, mergeDescribedBy } from "./choice-parts";

/**
 * The pieces of a field's anatomy the kit's fields share — the static label, the hint
 * (caption or "?"), the caption and the error under a field, the label strip over a
 * bare group, the write lock on a control that saves itself. Private to the package —
 * not re-exported from the barrel, except `FieldLabel` and `FLOATING_LABEL_STATIC`,
 * which ui.tsx re-exports as it always has.
 *
 * One file since 0.23: until then the pickers' half (`field-anatomy.tsx`: the date and
 * month pickers, whose trigger is a button in a wrapper of their own, and the groups
 * with no field box) sat beside this one with its own copies of `isTextHint` and the
 * caption class (keksdose K4: "uniform field anatomy … today it is a patchwork").
 *
 * Nothing here imports `ui.tsx`: `ui.tsx` imports this, and so do the combobox family,
 * the pickers and the native choice controls — the lint's no-cycle rule holds it.
 */

/* ── the static label ─────────────────────────────────────────────────────── */

// The TYPE of the small static label, without any placement. Split out so the
// label and anything sharing its line (see `hint` on {@link FloatingField}) are
// laid out by one flex row instead of by two absolute offsets guessing at the
// same baseline — which is what put dev#468's "?" three pixels above the word it
// belongs to.
export const STATIC_LABEL_TYPE =
  "text-caption leading-tight text-[var(--text-muted)] peer-disabled:opacity-50";

/**
 * A field's label at Large and Extra large (0.33, docs/text-size-harmonization.md
 * §10.17): a static label ABOVE the field — the phone card's "label above value" (§4) —
 * not a label squeezed into the field's top strip, where a long one ended in "…". It
 * stops being absolute, so it wraps like any text (`truncate-until-large` beside it); it
 * takes the pointer, since nothing of the field lies under it any more; and the field
 * no longer reserves the strip for it (`FIELD_FLOATING_PAD`). In the first row of a box
 * that is a grid at Large ({@link LABEL_ABOVE_BOX}), wherever it sits in the DOM — a
 * floating label FOLLOWS its input, for `peer-*`. `large:` classes, so it costs no
 * render and is right on the first paint; Normal keeps the floating label.
 *
 * The placement only: a label element adds `large:block` (a `<span>` or `<label>` in
 * flow), a label ROW keeps its `flex`.
 */
export const LABEL_ABOVE_AT_LARGE =
  "large:static large:row-start-1 large:mb-1 large:max-w-none large:pointer-events-auto";

/**
 * The box a field's label is positioned in — {@link FloatingField}'s `relative` wrapper,
 * a date or month picker's root — at Large, while it holds a label above
 * ({@link LABEL_ABOVE_AT_LARGE}): one column, the label's row over the field's. The
 * field's own absolute parts in the box (a chevron, a clear ×, a reveal toggle, a
 * calculator) are placed in the second row, so their `top-1/2` and `inset-y-*` still
 * measure the FIELD and not label and field together; the label's own elements carry
 * `data-field-label` and stay in the first. Only on a box with a visible label: without
 * one the second row would be empty.
 */
export const LABEL_ABOVE_BOX =
  "large:grid large:grid-cols-[minmax(0,1fr)] large:[&>.absolute:not([data-field-label])]:row-start-2";

// A field that always has a value (select / dropdown trigger) keeps the label
// permanently in the floated position — small, in the top strip, value below. At Large,
// a label above the field (LABEL_ABOVE_AT_LARGE).
export const FLOATING_LABEL_STATIC = cn(
  "pointer-events-none absolute start-3 top-1",
  STATIC_LABEL_TYPE,
  "max-w-[calc(100%-1.5rem)] truncate-until-large",
  LABEL_ABOVE_AT_LARGE,
  "large:block",
);

/**
 * The floating label for a custom-dropdown trigger (a `<span>`, since the trigger is a
 * button not a labelable input). Same placement as {@link FloatingField}'s static label,
 * so every labelled field lines up. Render inside a `relative` wrapper, before the trigger.
 */
export interface FieldLabelProps extends ComponentPropsWithoutRef<"span"> {
  children: ReactNode;
}

export function FieldLabel({ children, className, ...rest }: FieldLabelProps) {
  return (
    // `data-field-label`: a label of the box it stands in, kept in the first row at Large
    // (LABEL_ABOVE_BOX).
    <span data-field-label="" {...rest} className={cn(FLOATING_LABEL_STATIC, "z-10", className)}>
      {children}
    </span>
  );
}

/* ── hint ─────────────────────────────────────────────────────────────────── */

/**
 * The "?" that explains a field, on the field's own label line (dev#468).
 *
 * Pass it to a labelled `Select` / `Input` as `hint`. It exists as a
 * component rather than as a snippet each form repeats because the previous
 * version was exactly that snippet — an absolutely-positioned button whose
 * `top-1.5` was one guess at where an 11px label sits — and the reporter's
 * follow-up was *"question mark is not centered. Is it part of the hoc?
 * positioning problems seem quite frequently."* It was not part of the HOC. Now
 * it is, and there is one place left where the answer can be wrong.
 *
 * A `<button>` rather than a bare icon: hover alone puts the explanation out of
 * reach of a keyboard and of every touch device, and the tooltip shows on focus
 * too. The text is also its accessible name, so a screen reader gets it without
 * the bubble ever opening.
 */
export interface FieldHintProps extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  /** The explanation. It is both the tooltip's text and, by default, the button's
   *  accessible name, so a screen reader gets it without the bubble ever opening. */
  label: string;
  /** Default `"start"`: before the hint in the reading direction (the left in LTR, the
   *  right in RTL). `left` / `right` stay physical. */
  side?: TooltipSide;
}

export function FieldHint({
  label,
  side = "start",
  className,
  "aria-label": ariaLabel,
  ...rest
}: FieldHintProps) {
  return (
    // `tap="toggle"` (0.25): the "?" exists only to explain, so a tap on a phone shows
    // the bubble and the next tap hides it — the touch rule (no bubble left behind by a
    // tap) would otherwise make it show nothing at all.
    <Tooltip label={label} side={side} portal tap="toggle">
      <button
        {...rest}
        // `type` after the spread, not before. These render inside forms — that is the
        // only place a field has a label line — and a hint that defaulted to `submit`
        // because a caller spread a props object at it would save the form on a click
        // meant to explain a field.
        type="button"
        // The explanation names the button unless the caller says otherwise; passing
        // `aria-label` is how you shorten it for a screen reader without shortening
        // what the bubble shows.
        aria-label={ariaLabel ?? label}
        // Nothing to activate: the tooltip opens on hover and on focus, and a
        // click that did something as well would be a second, undiscoverable
        // behaviour on the same target.
        onClick={(e) => e.preventDefault()}
        // The kit's focus frame (0.32, §5): the "?" is a tab stop, and had no ring at all.
        className={cn(
          "flex rounded-full text-[var(--text-placeholder)] transition-colors hover:text-[var(--text-secondary)]",
          FOCUS_RING,
          className,
        )}
      >
        <HelpCircle className="size-3.5" />
      </button>
    </Tooltip>
  );
}

/**
 * A field's `hint` as the field should draw it here (0.32, docs/text-size-harmonization.md
 * §4 "No fact only in a tooltip"): at Large and Extra large, and on a touch screen, a
 * {@link FieldHint} becomes its own words — so the field shows them as its CAPTION under
 * the box, where they are read without hovering or tapping a 14 px "?". Anywhere else,
 * and for any other hint, the hint unchanged.
 *
 * The kit's fields call it through {@link useFieldHint} / {@link useFieldMessages}; a
 * field that resolves its own `hint` (an app's, or one of the kit's own outside this
 * file) calls it first and then treats the result as it treated a text hint.
 */
export function useInlineHint(hint: ReactNode): ReactNode {
  const inline = useInlineFacts();
  if (inline && isValidElement(hint) && hint.type === FieldHint) {
    const words = (hint.props as FieldHintProps).label;
    if (words) return words;
  }
  return hint;
}


/**
 * Whether a `hint` is a CAPTION (plain text: a non-empty string or a number) or
 * something for the label line (a {@link FieldHint} "?", or any other node).
 *
 * The rule {@link Select} and `NumberInput` already keep: the label line is 11px of
 * strip shared with the label, and a sentence placed there ran over the label and into
 * the value; a "?" under the field would be a button floating free of the label it
 * explains.
 */
export function isTextHint(hint: ReactNode): hint is string | number {
  return (typeof hint === "string" && hint !== "") || typeof hint === "number";
}

/** The caption under a field — Select's and NumberInput's type, so every field's
 *  standing advice reads alike. */
export const FIELD_CAPTION_CLASS = "mt-1 text-caption leading-tight text-[var(--text-muted)]";

export interface FieldHintParts {
  /** The caller's `aria-describedby` with the caption's id appended — standing
   *  advice first; the error (the news) is appended after this by the field. */
  describedBy: string | undefined;
  /** The caption's id while there is one. */
  captionId: string | undefined;
  /** The caption itself, or `undefined` for a hint that is not text. */
  captionText: string | number | undefined;
  /** A non-text hint (a FieldHint) for the label line — or, on a field with no label
   *  line, the end edge outside the box. `undefined` when there is none. */
  labelHint: ReactNode | undefined;
}

/**
 * Split a field's `hint` into the caption under it (attached with `aria-describedby`)
 * or the "?" on its label line. See {@link isTextHint}.
 */
export function useFieldHint(hintProp: ReactNode, describedBy: string | undefined): FieldHintParts {
  const hint = useInlineHint(hintProp);
  const captionId = useId();
  const text = isTextHint(hint);
  return {
    describedBy: text ? mergeDescribedBy(describedBy, captionId) : describedBy,
    captionId: text ? captionId : undefined,
    captionText: text ? hint : undefined,
    labelHint: !text && hasMessage(hint) ? hint : undefined,
  };
}

/** The caption under a field, as {@link Select} draws its own. */
export function FieldCaption({ parts, className }: { parts: FieldHintParts; className?: string }) {
  if (parts.captionText === undefined) return null;
  return (
    <p id={parts.captionId} className={cn(FIELD_CAPTION_CLASS, className)}>
      {parts.captionText}
    </p>
  );
}

/**
 * Classes that take a static floating label (`FLOATING_LABEL_STATIC`: `FieldLabel`,
 * `ComboboxFieldLabel`) out of its own absolute slot and into a {@link StaticLabelRow}.
 * `static` wins over `absolute` through `cn`'s merge; `min-w-0` lets it truncate in
 * the row. At Large the ROW stands above the field, so the label inside it drops the
 * margin a label above takes alone (`large:mb-0`), and stays level with its "?".
 */
export const LABEL_IN_ROW = "static min-w-0 large:mb-0";

/**
 * A static label and its "?" on one line, in the top strip of a field that lays out its
 * own label — the combobox family, which cannot use {@link FloatingField} because the
 * trigger, the anchored panel and the label hang off a box of their own.
 *
 * FloatingField's static row, with one difference: it stops at `end-9`, the column the
 * chevron (or the clear "×") takes, so a long label truncates before it rather than
 * putting the "?" on top of the chevron. The hint keeps its width; the label gives way.
 */
export function StaticLabelRow({ hint, children }: { hint: ReactNode; children: ReactNode }) {
  return (
    <div
      data-field-label=""
      className={cn("pointer-events-none absolute start-3 end-9 top-1 z-10 flex items-center gap-1", LABEL_ABOVE_AT_LARGE)}
    >
      {children}
      <span className="pointer-events-auto flex shrink-0 items-center">{hint}</span>
    </div>
  );
}

/**
 * A field with no label line and a FieldHint "?": the hint at the end edge, OUTSIDE the
 * box, as an unlabelled {@link Select} has placed it since 0.15.5. Without a hint the
 * field is returned exactly as it was, so the wrapper costs nothing where it does not
 * apply.
 */
export function EndHintRow({
  hint,
  className,
  children,
}: {
  hint: ReactNode | undefined;
  className?: string;
  children: ReactNode;
}) {
  if (hint === undefined) return <>{children}</>;
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <span className="flex shrink-0 items-center">{hint}</span>
    </div>
  );
}

/* ── the write lock on a control that saves itself (keksdose K3) ───────────── */

export interface LockReason {
  /** The reason in force — the lock's (with `commit` under a locked
   *  `WriteLockProvider`), else the control's own `disabledReason`. */
  reason: ReactNode;
  /** There is a reason: the control is locked the focusable way. */
  locked: boolean;
  /** The id of the reason's hidden copy, for the control's `aria-describedby`. */
  reasonId: string;
}

/**
 * {@link Button}'s `commit` + `disabledReason`, for a control that IS its own commit — a
 * switch, a checkbox or a select that saves on change, a list row whose click writes.
 * The lock's reason wins over the control's own (`useCommitReason`).
 */
export function useLockReason(commit: CommitScope | undefined, disabledReason: ReactNode): LockReason {
  const reason = useCommitReason(commit, disabledReason);
  const reasonId = useId();
  return { reason, locked: hasMessage(reason), reasonId };
}

/**
 * The kit {@link Tooltip} around a locked control, with a `hidden` copy of the reason for
 * the control's `aria-describedby` — Button's anatomy. The control goes in a FRAGMENT so
 * the Tooltip does not also clone its bubble's id into the description: the hidden copy
 * already describes it, and the same sentence twice would be read on every focus.
 *
 * `className` is the wrapper's, which becomes the outermost element while locked — a
 * control moves its own layout classes here so a lock does not reflow the form.
 */
export function LockedReason({
  lock,
  line = false,
  className,
  children,
}: {
  lock: LockReason;
  /** Draw the reason as a line under the control instead (0.32, §4) — see
   *  {@link DisabledReasonLine}; the caller decides with {@link useDisabledReasonLine}. */
  line?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (line) {
    return (
      <DisabledReasonLine id={lock.reasonId} reason={lock.reason} className={className}>
        {children}
      </DisabledReasonLine>
    );
  }
  return (
    <Tooltip label={lock.reason} className={className}>
      <>
        {children}
        <span id={lock.reasonId} hidden>
          {lock.reason}
        </span>
      </>
    </Tooltip>
  );
}

/* ── no fact only in a tooltip (0.32, docs/text-size-harmonization.md §4, §10.8) ── */

/**
 * Where a control's `disabledReason` is shown (§4 "No fact only in a tooltip"):
 *
 * - `"auto"` (default): as a LINE under the control at Large and Extra large and on a
 *   touch screen (`useInlineFacts`) — the reader asked for bigger type, or cannot hover
 *   — and in the kit {@link Tooltip} otherwise, where a pointer can hover it open and
 *   the form keeps its rhythm. Inside {@link CompactControls} (a top bar, a dense row's
 *   inline actions) it stays the tooltip at every size: there is no room for a line.
 * - `"line"`: always the line — a form whose locked submit should say why at once.
 * - `"tooltip"`: always the tooltip — a place the caller knows has no room, and where
 *   the reason is also said elsewhere on the screen (a banner over the form).
 *
 * Either way the reason is the control's `aria-describedby`, so a screen reader hears
 * it on focus; the line IS that description (one copy), the tooltip keeps its hidden
 * copy as before.
 */
export type DisabledReasonDisplay = "auto" | "line" | "tooltip";

/**
 * Marks a region where the controls must stay compact at every text size (§4, §10.8):
 * an IconButton keeps its icon alone (its `label` stays the name and the tooltip) and a
 * `disabledReason` stays in the tooltip rather than a line. AppShell puts its top bar
 * in one ("the top bar keeps its essential icons"); `RowActions` its inline icons.
 *
 * For a toolbar that has no room, not for a whole page: the contract asks that the icon
 * alone be rare. A dense row's actions belong in `RowActions`, which collapses them
 * into a "⋯" menu at Large instead.
 */
export const CompactControlsContext = createContext(false);

export function CompactControls({ children, compact = true }: { children: ReactNode; compact?: boolean }) {
  return <CompactControlsContext.Provider value={compact}>{children}</CompactControlsContext.Provider>;
}

/** Whether a control's `disabledReason` is drawn as a line here — see
 *  {@link DisabledReasonDisplay}. For the kit's own controls (Button, IconButton, Chip,
 *  ToggleGroup) and an app's control that has a reason to give. */
export function useDisabledReasonLine(display: DisabledReasonDisplay = "auto"): boolean {
  const compact = useContext(CompactControlsContext);
  const inline = useInlineFacts();
  if (display === "line") return true;
  if (display === "tooltip") return false;
  return inline && !compact;
}

/** The reason line's type: a field caption's ({@link FIELD_CAPTION_CLASS}), so a locked
 *  control's "why" reads like a field's standing advice. Capped, so a long reason under
 *  a small control wraps rather than widening its row without end. */
export const DISABLED_REASON_LINE_CLASS =
  "mt-1 block max-w-[20rem] text-caption leading-tight text-[var(--text-muted)]";

/**
 * A control and its `disabledReason` as a line under it — the `"line"` form of
 * {@link DisabledReasonDisplay}. The wrapper is the flex item now (`className`: the
 * control's own layout, e.g. `self-stretch`); `items-start` keeps the control its own
 * width, and a column parent still stretches the wrapper (FormActions' phone stack).
 * The line carries `id`, which the control's `aria-describedby` names.
 */
export function DisabledReasonLine({
  id,
  reason,
  className,
  children,
}: {
  id: string;
  reason: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span data-slot="disabled-reason" className={cn("inline-flex max-w-full flex-col items-start", className)}>
      {children}
      <span id={id} className={DISABLED_REASON_LINE_CLASS}>
        {reason}
      </span>
    </span>
  );
}

/* ── groups ───────────────────────────────────────────────────────────────── */

/**
 * Set by {@link CheckboxGroup}: its legend carries the one required star, so a box
 * inside it keeps the native `required` (a form still refuses an empty set) but draws no
 * star of its own — four stars on four languages would read as four separate demands.
 * ChoiceCardGroup's `InGroupContext`, for the plain checkbox.
 */
export const RequiredStarOnLegend = createContext(false);

/* ── fields not built on FloatingField: pickers and bare groups ──────────── */

/** `undefined`, `null`, `false` and `""` are what a caller's `cond && "…"` evaluates to
 *  when there is nothing to say; none of them is content. A numeric `0` is. */
export function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

const FIELD_ERROR_CLASS = "mt-1 text-caption leading-tight text-[var(--danger)]";

export interface FieldMessages {
  /** `invalid`, a message, or an `aria-invalid` from outside (a form library). */
  isInvalid: boolean;
  /** The caller's description, then the caption, then the error — the standing
   *  advice before the news, as `useFieldError` in ui.tsx orders them. */
  describedBy: string | undefined;
  /** The caption and the error, for under the field; `null` when there is neither. */
  below: ReactNode;
  /** The hint for the LABEL line (a `FieldHint`), or `undefined` when the hint is a
   *  caption or there is none. */
  labelHint: ReactNode;
}

/** `hint` / `error` / `invalid` resolved the way `Select` resolves them. */
export function useFieldMessages({
  hint: hintProp,
  error,
  invalid,
  describedBy,
  ariaInvalid,
}: {
  hint?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
  describedBy?: string;
  ariaInvalid?: unknown;
}): FieldMessages {
  const hint = useInlineHint(hintProp);
  const hintId = useId();
  const errorId = useId();
  const textHint = isTextHint(hint);
  const hasError = hasContent(error);
  return {
    isInvalid: Boolean(invalid) || hasError || ariaInvalid === true || ariaInvalid === "true",
    describedBy:
      [describedBy, textHint && hintId, hasError && errorId].filter(Boolean).join(" ") || undefined,
    below:
      textHint || hasError ? (
        <>
          {textHint && (
            <p id={hintId} className={FIELD_CAPTION_CLASS}>
              {hint}
            </p>
          )}
          {hasError && (
            <p id={errorId} className={FIELD_ERROR_CLASS}>
              {error}
            </p>
          )}
        </>
      ) : null,
    labelHint: !textHint && hasContent(hint) ? hint : undefined,
  };
}

/**
 * The field and what is under it, as one box — `FieldGroup` in ui.tsx, for the same
 * reasons written there. Nothing of its own while there is nothing under the field and
 * the caller passed no `error` key (the DOM is exactly what it was before these props);
 * once `error` is passed the box is kept even with no message, so the trigger is never
 * reparented — and remounted, losing focus — as the message comes and goes.
 */
export function FieldBox({
  below,
  reserve,
  children,
}: {
  below: ReactNode;
  reserve: boolean;
  children: ReactNode;
}) {
  if (below === null && !reserve) return <>{children}</>;
  return (
    <div>
      {children}
      {below}
    </div>
  );
}

/**
 * The static label in a trigger field's top strip — a {@link FieldLabel}, or, with a
 * `FieldHint`, the label and its "?" laid out on ONE flex row (dev#468: two absolute
 * offsets guessing at the same baseline put the "?" three pixels above its word).
 * `FloatingField`'s static-label row, except that it stops at `end-9`: the date and
 * month triggers keep that column (`pe-9`) for the calendar glyph or the clear ×, and a
 * long label truncates before it rather than putting the "?" on top of it.
 */
export function FieldLabelLine({ label, hint }: { label: ReactNode; hint?: ReactNode }) {
  if (!hasContent(hint)) return <FieldLabel>{label}</FieldLabel>;
  return (
    // `z-10` as FieldLabel has it: the trigger after it is `relative` and would paint
    // over the row (and take the "?"'s hover) otherwise. Above the field at Large.
    <div
      data-field-label=""
      className={cn("pointer-events-none absolute start-3 end-9 top-1 z-10 flex items-center gap-1", LABEL_ABOVE_AT_LARGE)}
    >
      <FieldLabel className={cn(LABEL_IN_ROW, "max-w-full")}>{label}</FieldLabel>
      <span className="pointer-events-auto flex shrink-0 items-center">{hint}</span>
    </div>
  );
}

/**
 * How tall the strip over a bare group is — the values {@link FieldStrip}'s `pad` takes,
 * public since 0.23 (keksdose G8), so the names say what the CONTENT needs rather than
 * which kit group first needed it (until 0.23 they were `toggle` and `tiles`).
 *
 *  - `"field"` — 16px. keksdose's `ClearedStatusPicker` (live #288 rework, #431,
 *    measured): *"16px of label strip plus a 26px group is exactly a labelled Input"*,
 *    so a status group in a row of 42px fields ends where they end. The label's line
 *    box runs into the group's top hairline, but the ACTIVE fill — the thing feedback
 *    #117 was about — starts at 19px, below the label's 17.75px. For content with a
 *    border and an inset of its own; ToggleGroup's `labelPlacement="strip"`.
 *  - `"clear"` — 20px, keksdose's `FlagPicker` and location field (`pt-5`). A tile has
 *    no inset fill: its selection IS its frame, a 2px dark border-and-ring from the
 *    tile's top edge, so the tile has to start below the whole label line — and so does
 *    anything else with no inset: a map, a row of buttons, a line of text. SwatchPicker,
 *    IconPicker, and FieldStrip's default.
 */
export const LABEL_STRIP_PAD = { field: "pt-4", clear: "pt-5" } as const;

/**
 * The 11px label (and its `FieldHint`) over a group that is NOT a field — keksdose K2:
 * a segmented control or a row of swatches standing in a form row beside labelled
 * inputs, whose label must sit on the same line as theirs (`top-1`, `inset-x-3`, the
 * type of a field's static label) without the group growing a field's border round
 * it. `id` goes on the label so the group can be `aria-labelledby` it.
 *
 * `relative` is load-bearing twice over: the row is positioned against it, and a
 * caller's `sr-only` label cannot escape it (sr-only-containment).
 *
 * Any other attribute (`rest`) lands on the wrapper — {@link FieldStrip} makes it the
 * `role="group"` its label names. The kit's own groups pass none, so their wrapper is
 * the bare box it was in 0.22.
 */
export function LabelStrip({
  labelId,
  label,
  hint,
  disabled,
  pad,
  className,
  children,
  ...rest
}: Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  labelId: string;
  label: ReactNode;
  hint?: ReactNode;
  /** Dim the label with its group, as `peer-disabled:` dims a field's own. */
  disabled?: boolean;
  pad: keyof typeof LABEL_STRIP_PAD;
  children: ReactNode;
}) {
  return (
    // At Large the row is a label above the group, in flow (0.33, §10.17), and the
    // strip's padding goes: nothing lies under it any more.
    <div {...rest} className={cn("relative min-w-0", LABEL_STRIP_PAD[pad], "large:pt-0", className)}>
      <div
        data-field-label=""
        className={cn("pointer-events-none absolute inset-x-3 top-1 flex items-center gap-1", LABEL_ABOVE_AT_LARGE)}
      >
        {/* `static`: FieldLabel positions itself absolutely; here the ROW is
            positioned, so the label and its "?" are centred on one line by the flex
            layout (dev#468). */}
        <FieldLabel id={labelId} className={cn(LABEL_IN_ROW, "max-w-full", disabled && "opacity-50")}>
          {label}
        </FieldLabel>
        {hasContent(hint) && <span className="pointer-events-auto flex shrink-0 items-center">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
