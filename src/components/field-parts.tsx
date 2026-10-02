import { createContext, useId } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Tooltip } from "./tooltip";
import { useCommitReason } from "./write-lock";
import { hasMessage, mergeDescribedBy } from "./choice-parts";

/**
 * Small pieces the fields share for the 0.22.0 anatomy round (keksdose K3/K4, kastlan
 * 8). Private to the package — not re-exported from the barrel — like `choice-parts`.
 *
 * Nothing here imports `ui.tsx`: `ui.tsx` imports this, and so do the combobox family
 * and the native choice controls, which is the point of keeping the rules in one place.
 */

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
