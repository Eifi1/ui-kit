// Internal — not re-exported from the barrel. The pieces of a field's anatomy (its
// label line, the caption and the error under it, the label STRIP over a bare group)
// for the controls that are not built on `FloatingField`: the date and month pickers,
// whose trigger is a button in a wrapper of their own, and the groups (ToggleGroup,
// SwatchPicker, IconPicker), which have no field box at all.
//
// `Input` and `Select` keep their own copies in ui.tsx; these follow them class for
// class, so a DatePicker's caption and a Select's caption are the same 11px line in
// the same place (keksdose K4: "uniform field anatomy … today it is a patchwork").

import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { FieldLabel } from "./ui";

/** `undefined`, `null`, `false` and `""` are what a caller's `cond && "…"` evaluates to
 *  when there is nothing to say; none of them is content. A numeric `0` is. */
export function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

/**
 * A `hint` that is plain TEXT is a caption under the field; anything else (a
 * `FieldHint` "?") rides the label line — the rule `Select` set in 0.15: the label
 * line is 11px of strip shared with the label, and a sentence placed there was set on
 * top of both the label and the value.
 */
export function isTextHint(hint: ReactNode): boolean {
  return (typeof hint === "string" && hint !== "") || typeof hint === "number";
}

const FIELD_CAPTION_CLASS = "mt-1 text-[11px] leading-tight text-[var(--text-muted)]";
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
