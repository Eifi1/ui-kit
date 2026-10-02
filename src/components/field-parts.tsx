import { createContext, useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Tooltip } from "./tooltip";
import { useCommitReason } from "./write-lock";
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
  "text-[11px] leading-tight text-[var(--text-muted)] peer-disabled:opacity-50";

// A field that always has a value (select / dropdown trigger) keeps the label
// permanently in the floated position — small, in the top strip, value below.
export const FLOATING_LABEL_STATIC = cn(
  "pointer-events-none absolute start-3 top-1",
  STATIC_LABEL_TYPE,
  "max-w-[calc(100%-1.5rem)] truncate",
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
    <span {...rest} className={cn(FLOATING_LABEL_STATIC, "z-10", className)}>
      {children}
    </span>
  );
}

/* ── hint ─────────────────────────────────────────────────────────────────── */

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
export const FIELD_CAPTION_CLASS = "mt-1 text-[11px] leading-tight text-[var(--text-muted)]";

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
export function useFieldHint(hint: ReactNode, describedBy: string | undefined): FieldHintParts {
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
 * the row.
 */
export const LABEL_IN_ROW = "static min-w-0";

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
    <div className="pointer-events-none absolute start-3 end-9 top-1 z-10 flex items-center gap-1">
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
export function useLockReason(commit: boolean | undefined, disabledReason: ReactNode): LockReason {
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
  className,
  children,
}: {
  lock: LockReason;
  className?: string;
  children: ReactNode;
}) {
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

const FIELD_ERROR_CLASS = "mt-1 text-[11px] leading-tight text-[var(--danger)]";

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
  hint,
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
    // over the row (and take the "?"'s hover) otherwise.
    <div className="pointer-events-none absolute start-3 end-9 top-1 z-10 flex items-center gap-1">
      <FieldLabel className="static min-w-0 max-w-full">{label}</FieldLabel>
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
    <div {...rest} className={cn("relative min-w-0", LABEL_STRIP_PAD[pad], className)}>
      <div className="pointer-events-none absolute inset-x-3 top-1 flex items-center gap-1">
        {/* `static`: FieldLabel positions itself absolutely; here the ROW is
            positioned, so the label and its "?" are centred on one line by the flex
            layout (dev#468). */}
        <FieldLabel id={labelId} className={cn("static min-w-0 max-w-full", disabled && "opacity-50")}>
          {label}
        </FieldLabel>
        {hasContent(hint) && <span className="pointer-events-auto flex shrink-0 items-center">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
