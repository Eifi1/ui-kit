import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import {
  FieldCaption,
  FLOATING_LABEL_STATIC,
  LABEL_ABOVE_AT_LARGE,
  LABEL_ABOVE_BOX,
  STATIC_LABEL_TYPE,
  type FieldHintParts,
} from "./field-parts";
import { DEFAULT_CHARACTER_COUNT_LABELS, DEFAULT_PASSWORD_REVEAL_LABELS } from "./ui-labels";

/**
 * The field base: what Input, Select and Textarea — and every kit field built on the same
 * look — share (0.34, MOD-2, refactor audit 2026-10). The `FIELD_*` classes, the floating
 * label and its `FloatingField` box, `Label`, the chevron, and the words of the password
 * reveal and the character counter. The message under a wrong field is field-parts'
 * `useFieldError`, every field's.
 *
 * Public through ./ui by name. `FieldGroup`, the counter and the placeholder helpers are
 * the three fields' shared parts (`@internal`).
 */

/**
 * The 16 px floor on touch (docs/text-size-harmonization.md §10.1). iOS zooms the page
 * when a field under 16 px takes focus, and keksdose's `maximum-scale=1` — which stopped
 * it — goes so pinch zoom works again (WCAG 1.4.4). A zoomed page drops the keyboard
 * inset to 0 (§10.2), so the zoom would put a pinned editor footer behind the keyboard
 * (keksdose #154). So on a coarse pointer a field is at least 16 px, at every text size:
 * `max()` leaves Large and Extra large alone, where `text-sm` is already 17.5 / 21 px.
 *
 * In px on purpose: the threshold is the browser's, in CSS px, whatever the root size.
 * Font size only — the line height keeps `text-sm`'s ratio. Part of {@link FIELD_BASE};
 * add it to any other text-entry control whose type is below 16 px.
 */
export const FIELD_TOUCH_TEXT = "pointer-coarse:text-[length:max(0.875rem,16px)]";

export const FIELD_BASE =
  "block w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-primary shadow-sm placeholder:text-placeholder focus:border-brand " +
  // The focus line, whole at fractional display scaling (K5 follow-up, keksdose run 78):
  // at 125 % a 1px border covers 1.25 device pixels, and the sides that fall across a
  // pixel boundary read half-strength. A 1px INSET ring in the focus colour beside it
  // doubles the line inward — FIELD_INVALID's border-plus-ring (live #295), and the
  // DatePicker stepper's fix (0.34) — so every side keeps one fully covered device
  // pixel. Inset: nothing outside the field moves or is covered.
  "focus:ring-1 focus:ring-inset focus:ring-brand " +
  // §10.1: at least 16 px on a touch screen, or iOS zooms the page on focus.
  FIELD_TOUCH_TEXT +
  " " +
  // A field the user cannot change has to LOOK settled. Without this, `disabled`
  // dimmed the floating label and nothing else — FIELD_BASE's own
  // `text-primary` overrides the browser's grey — so a read-only value
  // sat there at full body-text strength, indistinguishable from one you could retype
  // (Keksdose dev#455/#474).
  "disabled:cursor-default disabled:bg-surface-2 disabled:text-muted " +
  // Same for a field that takes focus but refuses keys: `readOnly` is not
  // `disabled`, and a value that cannot be edited should not claim it can be. Opt
  // OUT with {@link FIELD_WRITABLE_LOOK} in the one case where `readOnly` does not
  // mean that — see the two-factor code field, which uses it to block an autofill
  // and drops it the moment you focus the field.
  //
  // ⚠️ The ATTRIBUTE, never the `:read-only` pseudo-class (Keksdose dev#477).
  // `:read-only` does not mean "was marked readonly" — per Selectors 4 it matches
  // everything that is not `:read-write`, and only editable inputs/textareas and
  // contenteditable elements are `:read-write`. So `read-only:` matched every
  // `<select>` in the app and every field-styled `<button>` built on this base —
  // the native selects, the date trigger, the entity/currency/multi pickers — and
  // painted them all in the "you may not edit this" grey. On one transaction form
  // that made three different-looking families out of one field style: plain
  // inputs, grey selects, grey trigger buttons.
  "[&[readonly]]:bg-surface-2 [&[readonly]]:text-muted";

/** Cancels FIELD_BASE's read-only treatment for a field that is `readOnly` for a
 *  reason other than "you may not edit this". Attribute-scoped for the same reason
 *  FIELD_BASE is — the two have to cancel on the identical selector or twMerge
 *  cannot make the later one win. */
export const FIELD_WRITABLE_LOOK =
  "[&[readonly]]:bg-surface [&[readonly]]:text-primary";

// Extra top padding leaves room for a label that floats INSIDE the field (the
// "filled" pattern) — the label sits in the top strip, the value below it. Used by
// every labelled field (native + custom-dropdown triggers). twMerge lets pt/pb win
// over FIELD_BASE's py-2. At Large the label stands above the field (0.33, §10.17,
// LABEL_ABOVE_AT_LARGE), so the strip goes and the field is FIELD_BASE's `py-2` again.
export const FIELD_FLOATING_PAD = "pt-4 pb-1 large:py-2";

// Error/required highlight for a field that is missing a value — a `--danger`
// border and matching focus ring so the control itself shows what's wrong, not just
// a note beside it (feedback #235). Layered after FIELD_BASE so twMerge wins.
//
// The `ring-1` is not decoration; it is what makes the highlight SURVIVE display
// scaling (Keksdose live #295 — *"Account select boundary. It is not highlighted on
// the sides."*). At 125%, the browser's usual setting on a 2560px screen, a 1px CSS
// border is 1.25 device pixels: the horizontal edges land on whole rows and paint
// solid, while one of the two VERTICAL edges lands across a pixel boundary and is
// spread over two columns at partial coverage. Measured on the receipt's required
// account field, dark theme, back when this was a hard-coded rose (full =
// rgb(208,30,78)): left/top/bottom all 208, right 160 then 115 — the side that is
// supposed to shout, at 55–77% of the others. A border plus a ring is 2 CSS px, so
// whatever the fraction there is always one fully covered device pixel on every side
// (re-measured: worst side 241). It is the GEOMETRY that carries that, not the hue,
// so the fix survives a consumer re-pointing `--danger-border`.
//
// A ring rather than `border-2`: a box-shadow adds no layout, so an invalid field
// stays exactly the size of a valid one and nothing beside it moves when the value
// arrives.
export const FIELD_INVALID =
  "border-danger-strong ring-1 ring-danger-strong focus:border-[var(--danger)] focus:ring-[var(--danger)]";

export const FLOATING_INPUT_CLASS = cn(FIELD_BASE, FIELD_FLOATING_PAD, "peer placeholder:text-transparent");

/**
 * The PHONE display treatment (Keksdose feedback #176, carried across the entry
 * forms by #179): the field chrome removed so the ONE input a form is actually
 * about reads as the thing itself, not as another boxed row in a stack.
 *
 * Every control that takes `variant="display"` — {@link Input}, `NumberInput`,
 * `AmountInput` — means exactly the same thing by it: the treatment applies in the
 * phone layout (`usePhoneLayout()`, `max-md:` at the text size in force) and the field
 * is untouched above it, so a caller never has
 * to ask the viewport, and a form can't end up half-treated across breakpoints.
 *
 * What stays, deliberately:
 *  - A hairline baseline. With the box gone something still has to say "you can
 *    type here"; it takes the brand colour on focus, where a bordered field would
 *    light its whole outline. Each edge is set exactly once (`border-x-0
 *    border-t-0 border-b`) so the rule can't hinge on utility order. On focus the
 *    line is doubled inward by an inset shadow on that edge alone — FIELD_BASE's
 *    inset ring, for the same reason (K5 follow-up: a 1px line reads half-strength at
 *    125 %) — where a ring would draw a box round the figure.
 *  - The muted placeholder colour, because a display field is usually empty at
 *    the moment it matters most and has nothing else to show.
 *  - The label, moved to `sr-only` rather than dropped: display type is legible
 *    to the eye, not to a screen reader.
 *
 * Size and weight are NOT here — an amount wants display type, a subject line
 * wants a heading — so each control adds its own on top.
 */
export const FIELD_DISPLAY =
  "block w-full border-x-0 border-t-0 border-b border-subtle bg-transparent px-0 pt-0 pb-1 text-primary shadow-none placeholder:text-placeholder focus:border-brand focus:shadow-[inset_0_-1px_0_var(--brand)] focus:outline-none focus:ring-0 disabled:opacity-60";

// A field-styled button trigger for the custom dropdown controls (MultiSelect,
// CurrencySelect) — the field look (border/bg) as a flex row for the value + chevron,
// so they don't hand-copy the field classes. Add FIELD_FLOATING_PAD only when the
// trigger carries a label (unlabelled triggers stay normal height to match buttons /
// adjacent controls). Pair the labelled case with a static FieldLabel.
// `relative` so the trigger can host an absolutely-centred FieldChevron / clear
// button the way the native Select does.
//
// `[&>:first-child]:min-h-[1lh]` holds one line box open whatever the value is. A
// trigger with nothing chosen and no placeholder renders an EMPTY value span, an
// empty span has no line box, and the trigger collapsed to its padding — 18px
// tall in a stack of 38px fields (an RhfCombobox without a placeholder; DatePicker
// and MonthPicker had met the same thing as Keksdose live #294 and patched their
// own span with a U+00A0). Here, on the shared class, it covers every trigger
// built on it, including a `renderTrigger` one. `1lh` rather than a fixed height
// so it tracks whatever type the trigger is set in; the first child is the value
// in every trigger here (the chevron and the clear button are absolute).
export const FIELD_TRIGGER = cn(
  FIELD_BASE,
  "relative flex items-center justify-between gap-2 text-start hover:bg-hover",
  "[&>:first-child]:min-h-[1lh]",
);

/** An alias rather than an interface: the chevron adds nothing of its own to an
 *  `<svg>`'s props, and an interface declaring no members is the same type wearing a
 *  name that suggests otherwise. */
export type FieldChevronProps = Omit<ComponentPropsWithRef<"svg">, "children">;

/** The dropdown chevron, shared by the native {@link Select} and every custom
 * {@link FIELD_TRIGGER} control.
 *
 * Absolutely positioned and centred on the FIELD box. As an ordinary flex child
 * it centres on the *content* box instead, and `FIELD_FLOATING_PAD` (pt-4 pb-1)
 * pushes that box's midline down — so a labelled currency/multi-select chevron
 * sat visibly lower than the native select's right beside it (feedback #400).
 * Pair it with `pe-9` on the trigger so the value can't run underneath. At the
 * inline END, not the right: a right-to-left form reads the value from the right,
 * and a chevron parked on top of its first word hid exactly the part that says
 * what was picked. */
export function FieldChevron({ className, ...rest }: FieldChevronProps) {
  return (
    <ChevronDown
      {...rest}
      // After the spread: the chevron is decoration beside a control that already has
      // a name, and an `aria-hidden` a caller could switch off by accident is a second
      // announcement of the same field.
      aria-hidden
      className={cn(
        "pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-placeholder",
        className,
      )}
    />
  );
}

// Animated label that starts centred (as a placeholder) in an empty field and
// floats up INSIDE the top strip on focus or once the field has a value. Sits on
// the field's own surface, so no background chip and nothing to mismatch the card.
//
// At Large it is a static label ABOVE the field instead (0.33, §10.17): in flow, so it
// wraps; always in its floated look, since there is no strip to float into and no
// placeholder to stand in for; no transition, since it never moves.
const LABEL_FLOATED_AT_LARGE =
  "large:text-caption large:leading-tight large:text-secondary large:transition-none";

export const FLOATING_LABEL_CLASS = cn(
  "pointer-events-none absolute start-3 top-2.5 text-sm text-placeholder transition-all",
  "max-w-[calc(100%-1.5rem)] truncate-until-large",
  "peer-focus:top-1 peer-focus:text-caption peer-focus:leading-tight peer-focus:text-secondary",
  "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-caption peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-secondary",
  "peer-disabled:opacity-50",
  LABEL_ABOVE_AT_LARGE,
  "large:block",
  LABEL_FLOATED_AT_LARGE,
);

// The animated label again, as a ROW that the label and its "?" share — same
// placement, same float, same type, but with the type on the row so the label
// INHERITS it. It has to be that way round: `peer-focus:` compiles to a sibling
// selector, so the classes have to sit on the element that is actually a sibling
// of the input, and a label nested inside a wrapper is not one.
//
// Wider end clearance than the label alone takes (`3rem` rather than `1.5rem`),
// because the controls that carry an animated label are the ones with something
// at the end edge of the field — NumberInput's calculator is the case this was
// written for. The label truncates a little sooner; the alternative was the "?"
// sitting on top of a button (steering-design feedback #48). At Large the row stands
// above the field, as the label alone does, and nothing at the end edge is under it.
const FLOATING_ROW_CLASS = cn(
  "pointer-events-none absolute start-3 top-2.5 flex items-center gap-1 transition-all",
  "max-w-[calc(100%-3rem)] text-sm text-placeholder",
  "peer-focus:top-1 peer-focus:text-caption peer-focus:leading-tight peer-focus:text-secondary",
  "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-caption peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-secondary",
  "peer-disabled:opacity-50",
  LABEL_ABOVE_AT_LARGE,
  LABEL_FLOATED_AT_LARGE,
);

/** The static label's row with its "?" at the field's end, in the top strip — and at
 *  Large above the field (LABEL_ABOVE_AT_LARGE). */
const STATIC_ROW_CLASS = cn("pointer-events-none absolute inset-x-3 top-1 flex items-center gap-1", LABEL_ABOVE_AT_LARGE);

/**
 * The one place that assembles a labelled field: a `relative` wrapper around the
 * control (`children`) plus a floating label inside the top strip. Pass `staticLabel`
 * for controls that always have a value (selects); omit it for free-text fields whose
 * label animates from centred→up. Used by Input/Select/Textarea/NumberInput; the
 * dropdown controls that need a ref + menu keep their own wrapper but the same label
 * (via {@link FieldLabel}) and trigger ({@link FIELD_TRIGGER}) styles.
 */
export interface FloatingFieldProps extends ComponentPropsWithRef<"div"> {
  htmlFor?: string;
  label?: ReactNode;
  staticLabel?: boolean;
  /** Keep the label in the accessibility tree but out of the layout — what
   *  {@link FIELD_DISPLAY} needs, since a floating label inside a field with no
   *  field left would have nothing to float in. */
  srOnlyLabel?: boolean;
  /** Something interactive that belongs to the LABEL rather than to the value —
   *  in practice a {@link FieldHint} "?" (dev#468). It is rendered in a flex row
   *  with the label, so it is centred on the label's line by the layout instead
   *  of by a hand-tuned `top-…`, and it can never drift when the type changes.
   *
   *  It rides an ANIMATED label too, and the two cases place it differently on
   *  purpose. A static label has a field-wide strip to itself, so the hint sits
   *  at the far end of it and a long label truncates into the gap. An animated
   *  one belongs to a control with something at the end edge of the field — a
   *  calculator, a stepper — so the hint follows the label instead, and it is
   *  the label that gives way (steering-design feedback #48). */
  hint?: ReactNode;
  children: ReactNode;
}

export function FloatingField({
  className,
  htmlFor,
  label,
  staticLabel,
  srOnlyLabel,
  hint,
  children,
  ...rest
}: FloatingFieldProps) {
  const withHint = hint !== undefined && !srOnlyLabel;
  const atEnd = withHint && staticLabel;
  // A label drawn over the field: at Large it stands above it instead (0.33, §10.17),
  // in the first row of this box (LABEL_ABOVE_BOX), though it FOLLOWS the control in
  // the DOM — `peer-*` reads the input before it.
  const above = label !== undefined && !srOnlyLabel;
  const labelEl = label !== undefined && (
    <label
      htmlFor={htmlFor}
      // In the first row at Large, out of LABEL_ABOVE_BOX's rule for the field's parts.
      data-field-label={above && !withHint ? "" : undefined}
      className={
        srOnlyLabel
          ? "sr-only"
          : atEnd
            ? cn("pointer-events-none min-w-0 truncate-until-large", STATIC_LABEL_TYPE)
            : withHint
              ? "pointer-events-none min-w-0 truncate-until-large"
              : staticLabel
                ? FLOATING_LABEL_STATIC
                : FLOATING_LABEL_CLASS
      }
    >
      {label}
    </label>
  );
  return (
    // `relative` is the whole contract of this wrapper — the floating label and every
    // control that hangs off it (a reveal toggle, a chevron) are positioned against
    // this box — so it is merged through `cn` after the spread rather than left where
    // a caller's stray `className` or `style` could unset it. At Large, with a label
    // above, a grid: the label's row over the field's, the field's parts in the latter.
    <div {...rest} className={cn("relative", above && LABEL_ABOVE_BOX, className)}>
      {children}
      {withHint ? (
        // Static: `inset-x-3` rather than `start-3`, so a long label truncates at
        // the field's own end padding instead of running under the chevron.
        // Animated: the row floats with the label and is only as wide as it needs
        // to be. Either way the hint keeps its width (`shrink-0`) and the label
        // is the one that gives way.
        <div data-field-label="" className={atEnd ? STATIC_ROW_CLASS : FLOATING_ROW_CLASS}>
          {labelEl}
          <span className="pointer-events-auto flex shrink-0 items-center">{hint}</span>
        </div>
      ) : (
        labelEl
      )}
    </div>
  );
}

export interface LabelProps extends ComponentPropsWithRef<"label"> {
  /** Draw the required mark after the text. The mark is `aria-hidden`: what a
   *  screen reader hears is the control's own `required` / `aria-required`, which
   *  the caller still sets — a "star" read out as the last word of every name is
   *  noise, and a control that is not marked required is not required however its
   *  label looks. */
  required?: boolean;
  /** `sm` for a toolbar or a dense filter row (12px), `md` otherwise (14px). */
  size?: "sm" | "md";
  /** Dim the label with its control. A label ABOVE its field is not the field's
   *  `peer`, so `peer-disabled:` cannot reach it the way it reaches a floating one. */
  disabled?: boolean;
}

/**
 * The label ABOVE a field, for the places a floating label does not fit: a control
 * the kit did not render (a third-party picker, a range slider, a group of radios),
 * a filter bar whose fields are unlabelled {@link Select}s, a form that sets labels
 * above its fields throughout.
 *
 * A new component rather than a mode of {@link FieldLabel}, because the two share
 * nothing but the word. `FieldLabel` is an absolutely positioned `<span>` inside a
 * trigger's `relative` box and has to stay exactly that for every dropdown that
 * already lines up with it; this is a real `<label>` in normal flow, with `htmlFor`,
 * that a click focuses the control through. Spacing below it belongs to the caller's
 * layout (`space-y-1.5` on the pair, typically), as it would for any block.
 */
export function Label({ required, size = "md", disabled, className, children, ...rest }: LabelProps) {
  return (
    <label
      {...rest}
      className={cn(
        "inline-flex items-center gap-0.5 font-medium leading-none text-primary",
        size === "sm" ? "text-xs" : "text-sm",
        disabled && "cursor-default opacity-50",
        className,
      )}
    >
      {children}
      {required && (
        <span aria-hidden className="text-danger">
          *
        </span>
      )}
    </label>
  );
}

// The message under a field that is wrong, and the wiring that attaches it — `useFieldError`
// — lives in field-parts since 0.34, every field's (DUP-8, refactor audit 2026-10).

/**
 * @internal A field and its message as one box.
 *
 * The message cannot go INSIDE the field's own `relative` box. The password reveal
 * toggle is `inset-y-0` and the select chevron is `top-1/2`, so both centre on
 * whatever that box contains — put two lines of message in it and the chevron drifts
 * down out of the field, between the value and the text. So the field keeps its box
 * and this wraps the pair.
 *
 * WHEN IT WRAPS. A field that never takes `error` renders nothing of its own here,
 * which is what keeps the prop additive: it is exactly the DOM it was before the prop
 * existed, down to the bare `<input>` an unlabelled {@link Input} drops straight into a
 * caller's flex row. A field that DOES take `error` — the key is passed, whatever its
 * value — is wrapped for as long as it is mounted, message or not (`reserve`).
 *
 * It used to wrap only while a message showed, and that cost the control its
 * identity: a fragment and a `<div>` are different elements at the same spot in the
 * tree, so React threw the `<input>` away and mounted a new one every time the message
 * came or went. Focus fell to `<body>`, the caret went with it, and an uncontrolled
 * field lost what had been typed — Kurvenschmiede's confirm-password dialog clears its
 * "Wrong password" on change, so the first keystroke of the retry dropped the user out
 * of the field. Keeping the box stops that; the field is never reparented.
 *
 * The other ways to keep it stable were worse. A box on EVERY field changes what every
 * flex row and grid in three apps lays out (`flex-1`, `w-56`, `col-span-2` on the
 * field would land on a child of the item instead of the item). A `display: contents`
 * box would keep the flex/grid item, but a contents box takes no margin, so a parent's
 * `space-y-*` stops spacing the field — the shape of Kurvenschmiede's reset-password
 * form and gear wizard, both `space-y-*` stacks of fields with `error` — and it moves
 * `first:`/`last:`/`> *` matches. A field passing `error` already took this plain box
 * whenever its message showed, so what changes is only that it keeps it while none
 * does; every such call site in the three apps sits in a block or a `space-y`/grid
 * stack where a full-width block box is the field's own size. The case it does change
 * is a field passing `error` whose `className` sizes it as a flex item (`flex-1` in a
 * row): that caller already lost the sizing while a message showed, and now sees the
 * same box without one. Pass `error` only where a message can actually appear.
 *
 * `className` is NOT moved out here, for the same reason — it goes on the field, as it
 * always has, so the box cannot silently change what that prop styles.
 */
export function FieldGroup({
  errorEl,
  reserve = false,
  children,
}: {
  errorEl: ReactNode;
  /** The caller passed `error`: keep the box even while there is no message. */
  reserve?: boolean;
  children: ReactNode;
}) {
  if (errorEl === null && !reserve) return <>{children}</>;
  return (
    <div>
      {children}
      {errorEl}
    </div>
  );
}

/** The two names the password reveal toggle can wear. See {@link Input}. */
export interface PasswordRevealLabels {
  /** While the value is hidden — activating the toggle will show it. */
  show: string;
  /** While the value is shown. */
  hide: string;
}

// Defined in ./ui-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_PASSWORD_REVEAL_LABELS };

/** @deprecated 0.34 — `useKitLabels("passwordReveal", DEFAULT_PASSWORD_REVEAL_LABELS, labels)`,
 *  which the provider reaches too, or Input's own `passwordLabels`; removed in 0.35
 *  (refactor audit 2026-10, API-6a). A merge from before the provider, which no kit
 *  component calls. */
export function resolvePasswordRevealLabels(
  partial?: Partial<PasswordRevealLabels>,
): PasswordRevealLabels {
  if (!partial) return DEFAULT_PASSWORD_REVEAL_LABELS;
  return { ...DEFAULT_PASSWORD_REVEAL_LABELS, ...partial };
}

/**
 * What the character counter of {@link Input} and {@link Textarea} (`showCount`) says.
 * The visible "12/80" is digits and a slash and is not translated; these are the words
 * a screen reader gets instead of it.
 */
export interface CharacterCountLabels {
  /** The counter as part of the field's description, read when focus reaches the
   *  field: "12 of 80 characters". */
  count: (used: number, max: number) => string;
  /** Said once, politely, on entering the last stretch before the limit: "8
   *  characters left". */
  remaining: (left: number) => string;
  /** Said once, politely, on reaching the limit. */
  limitReached: string;
}

// Defined in ./ui-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_CHARACTER_COUNT_LABELS };

/** The length the browser's own `maxLength` counts — UTF-16 code units — so the counter
 *  and the limit can never disagree about whether a field is full. */
function textLength(value: unknown): number {
  return value === undefined || value === null ? 0 : String(value).length;
}

/** @internal The counter's length: the controlled `value`'s, else what the field has been typed
 *  to (from `defaultValue` on). `track` is called from the field's change handler. */
export function useTypedLength(value: unknown, defaultValue: unknown) {
  const [typed, setTyped] = useState(() => textLength(defaultValue));
  return { used: value !== undefined ? textLength(value) : typed, track: (text: string) => setTyped(text.length) };
}

type CountZone = "ok" | "near" | "limit";

/** The last stretch before the limit: a tenth of it, at least 1 and at most 20 — "8
 *  left" of 80, and 20 of 2,000 rather than 200, which is not "near" in any sense a
 *  person typing means. */
function nearLimitAt(max: number): number {
  return Math.min(20, Math.max(1, Math.ceil(max * 0.1)));
}

function countZone(used: number, max: number): CountZone {
  if (used >= max) return "limit";
  return max - used <= nearLimitAt(max) ? "near" : "ok";
}

/**
 * @internal The live "12/80" under a field with `showCount` (keksdose K11: the admin broadcast,
 * support replies, canned replies and the handoff note each counted by hand, and one
 * announced every keystroke).
 *
 * Three channels, each saying only what it should:
 *  - the digits, `aria-hidden` — "12 slash 80" is not a sentence;
 *  - a `hidden` "12 of 80 characters" on the field's `aria-describedby`, so the count is
 *    read with the field when focus reaches it, and never while typing;
 *  - a polite live region that speaks ONCE per stretch: on entering the last tenth
 *    ("8 characters left") and on reaching the limit. A region that changed on every
 *    keystroke would talk over the user's own typing echo for the whole message.
 *    Nothing is said on mount: a stored note already near its limit is not news.
 */
export function CharacterCount({
  id,
  used,
  max,
  labels,
  caption,
}: {
  id: string;
  used: number;
  max: number;
  labels: CharacterCountLabels;
  caption: ReactNode;
}) {
  const zone = countZone(used, max);
  // What the live region holds, re-set only when the stretch changes — the previous
  // render's zone kept in state, the pattern React documents for "adjusting state when
  // a prop changes", so the region's text (and so the announcement) changes at most
  // once per crossing.
  const [said, setSaid] = useState<{ zone: CountZone; text: string }>({ zone, text: "" });
  if (said.zone !== zone) {
    setSaid({
      zone,
      text: zone === "near" ? labels.remaining(max - used) : zone === "limit" ? labels.limitReached : "",
    });
  }
  return (
    // `relative` holds the sr-only region (see sr-only-containment.test).
    <div className="relative mt-1 flex items-start gap-2">
      <div className="min-w-0 flex-1">{caption}</div>
      <span
        aria-hidden
        className={cn(
          "shrink-0 text-caption leading-tight tabular-nums",
          zone === "limit"
            ? "text-danger"
            : zone === "near"
              ? "text-warning"
              : "text-muted",
        )}
      >
        {used}/{max}
      </span>
      <span id={id} hidden>
        {labels.count(used, max)}
      </span>
      <span role="status" className="sr-only">
        {said.text}
      </span>
    </div>
  );
}

/** @internal What goes under a text field: the caption (beside the counter, when there is one),
 *  then the error. `null` when there is nothing, so a field with none keeps exactly the
 *  DOM it had (see {@link FieldGroup}). */
export function fieldBelow(hint: FieldHintParts, counter: ReactNode, errorEl: ReactNode): ReactNode {
  if (counter === null && hint.captionText === undefined && errorEl === null) return null;
  return (
    <>
      {counter ?? <FieldCaption parts={hint} />}
      {errorEl}
    </>
  );
}

/**
 * @internal kastlan 8: a caller's placeholder on a LABELLED field, shown once the label has
 * floated out of its way — on focus — and transparent until then, while the label sits
 * where the placeholder would be. Without it the field forced `placeholder=" "` for the
 * float trick and dropped the caller's text without a word (kastlan's "note" field lost
 * its hint). `:placeholder-shown` still drives the float: it matches an empty field
 * whatever the placeholder's text is.
 */
export const FLOATING_PLACEHOLDER_ON_FOCUS = "focus:placeholder:text-placeholder";

/** @internal A placeholder with something to show. `""` and blanks are the float trick's own
 *  `" "`, never the caller's hint. */
export const hasPlaceholderText = (placeholder: string | undefined): placeholder is string =>
  placeholder !== undefined && placeholder.trim() !== "";

/** @internal The counter's words: the `characterCount` namespace — prop > `<UiKitProvider
 *  labels>` > English. One place, so the namespace is named once. */
export function useCharacterCountLabels(prop: Partial<CharacterCountLabels> | undefined): CharacterCountLabels {
  return useKitLabels("characterCount", DEFAULT_CHARACTER_COUNT_LABELS, prop);
}
