import { forwardRef, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, Eye, EyeOff, HelpCircle, Plus, X } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, InputHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { useMediaQuery } from "../hooks/use-media-query";
import { Tooltip, type TooltipSide } from "./tooltip";
import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "brand" | "link";

// Shared base ring for every button-styled element. Kept as a named const so the
// <Button> component and the {@link buttonClasses} helper draw from one source and
// can never drift apart.
const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

export type ButtonSize = "sm" | "md";

// Box geometry per size, split out of the base so the two cannot be merged into one
// string that a size then has to fight. `md` is the pre-0.8.0 look, unchanged. `sm` is
// the compact secondary action keksdose repeats by hand as `px-2 py-1 text-xs` (and
// `px-2 py-0.5 text-xs`) on the buttons in a toolbar or a table header; one rung is
// enough, so the two spellings meet at `py-1`. There is no `lg`: no app has asked for
// a bigger text button (IconButton's `lg` is a touch target, not a text size). The
// variant map comes AFTER the size, so `link`'s `p-0` still wins at either size.
const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "gap-2 px-3 py-2 text-sm",
  sm: "gap-1.5 px-2 py-1 text-xs",
};

// Warm, palette-token-driven so buttons blend with the fields + cards in every theme.
// Actions default to a warm bordered look (primary = filled warm chip, secondary =
// outline); `brand` stays the solid accent for the rare strong CTA; `danger` takes the
// semantic `--danger` family (destructive semantics), so a consumer can re-point the
// destructive hue instead of inheriting a hard-coded red. Focus rings follow each
// variant's own accent: brand for the four neutral ones, danger for `danger`.
const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)] focus:ring-[var(--brand)]",
  secondary:
    "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] focus:ring-[var(--brand)]",
  ghost:
    "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] focus:ring-[var(--brand)]",
  danger:
    "bg-[var(--danger)] text-[var(--danger-contrast)] hover:bg-[var(--danger-hover)] focus:ring-[var(--danger-border)]",
  brand:
    "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)] focus:ring-[var(--brand)]",
  // A text link that is still a `<button>` — keksdose's six hand-rolled
  // `<button className="text-brand underline">` sites ("Resend code", "Show all",
  // "Undo" in a toast…), which act rather than navigate and so must not be anchors.
  // The box padding goes (`p-0`) so it sits in a sentence at the text's own size, but
  // the base's `focus:ring-2` stays: those copies had `outline-none` and no ring, so
  // a keyboard user tabbing onto them saw nothing at all. `rounded-sm` keeps that
  // ring hugging the word instead of drawing a pill round it.
  link:
    "rounded-sm p-0 bg-transparent text-[var(--brand)] underline-offset-4 hover:underline focus:ring-[var(--brand)]",
};

/** The second argument of {@link buttonClasses} in its options form. */
export interface ButtonClassesOptions {
  /** See {@link ButtonProps.size}. */
  size?: ButtonSize;
  className?: string;
}

/**
 * Button classes for the rare case where the styling must land on a non-`<button>`
 * element that {@link Button} can't render — e.g. a router `<Link>` or a Radix
 * AlertDialog Action/Cancel (which must stay the Radix element). Everywhere a real
 * button works, prefer `<Button>`. Draws from the same base, size and variant maps as
 * `<Button>`, so the two stay in lockstep.
 *
 * The second argument is either the extra classes (the pre-0.8.0 form) or
 * `{ size, className }` — `buttonClasses("secondary", { size: "sm" })` for keksdose's
 * compact toolbar links.
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  classNameOrOptions?: string | ButtonClassesOptions,
): string {
  const { size = "md", className } =
    typeof classNameOrOptions === "object" ? classNameOrOptions : { className: classNameOrOptions };
  return cn(BUTTON_BASE, BUTTON_SIZES[size], buttonVariantClasses[variant], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** `md` (default) is the page's action button. `sm` is the compact one — 12px text
   *  and `px-2 py-1` — for the secondary actions in a toolbar, a card header or a
   *  table's header row (keksdose writes `px-2 py-1 text-xs` over `secondary` by hand
   *  there). Every variant takes either size. */
  size?: ButtonSize;
  /** In a flex row next to a taller labelled field, fill the field's height so the
   *  two line up. No effect outside a flex row. */
  stretch?: boolean;
  /** The `<button>` element. React 19 passes `ref` to a function component as an
   *  ordinary prop, so it rides `...rest` onto the element with no `forwardRef` —
   *  declared here only because `ButtonHTMLAttributes` does not carry it. */
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant = "primary", size = "md", stretch, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        BUTTON_BASE,
        BUTTON_SIZES[size],
        // In a flex row next to a taller labelled field, `stretch` makes the button
        // fill the field's height so the two line up (self-stretch overrides the row's
        // align-items). No effect outside a flex row / when it's already the tallest.
        stretch && "self-stretch",
        buttonVariantClasses[variant],
        className,
      )}
    />
  );
}

// Canonical square icon-only button. <Button> carries TEXT geometry — px-3 py-2
// gap-2 — so rendering a bare glyph through it gives a small icon in a wide,
// text-shaped box. This fixes a square box instead and, crucially, forces the
// child icon to a size set by the BOX (20px at md/sm) via `[&_svg]:size-*` so a
// caller cannot under-size it. Use it wherever an action is a bare icon
// (edit/delete/tools) so they all match the top-bar icon buttons and can never
// drift apart again.
//
// Draws its colours from the same `buttonVariantClasses` map as <Button>, so the
// two re-skin together with the palette.
const ICON_BUTTON_BASE =
  "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

export type IconButtonSize = "lg" | "md" | "sm" | "xs" | "2xs";

// Box and glyph together, so a 24px chip action cannot end up holding a 20px icon
// that touches its edges. The two small steps are lenkbank's list-row (28px) and
// chip (24px) actions, which it had hand-rolled beside the kit's 32/36px ones.
const ICON_BUTTON_SIZES: Record<IconButtonSize, string> = {
  // The 44px touch target (WCAG 2.5.5's size) with the same 20px glyph — keksdose's
  // bulk-action bars write `size-11` by hand over an `md` button to get it on phones.
  lg: "size-11 [&_svg]:size-5",
  md: "size-9 [&_svg]:size-5",
  sm: "size-8 [&_svg]:size-5",
  xs: "size-7 rounded [&_svg]:size-4",
  "2xs": "size-6 rounded [&_svg]:size-3.5",
};

// A tone re-colours the glyph without changing what the variant draws around it.
// `muted` and `danger` both sit quiet at rest — an action in every row of a list
// must not shout from every row — and `danger` answers the pointer in the
// destructive family, so the red arrives only on the one row you are about to
// act on.
const ICON_BUTTON_TONES = {
  default: "",
  muted:
    "text-[var(--text-placeholder)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]",
  danger:
    "text-[var(--text-placeholder)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] focus:ring-[var(--danger-border)]",
  // Amber AT REST, unlike `danger`: a warning icon button is the one on the row that
  // needs attention (keksdose's "needs review" flag on a transaction, the stale-rate
  // marker), not an action repeated down a list — quiet grey would hide the very
  // thing it is there to point out.
  warning:
    "text-[var(--warning)] hover:bg-[var(--warning-bg)] focus:ring-[var(--warning-border)]",
  // Sky at rest, for the same reason as `warning`: keksdose's reconcile action on an
  // account row (accounts-page:867) is the one on the row to notice, and it is
  // informational rather than a problem, so it takes the `--info` family.
  info: "text-[var(--info)] hover:bg-[var(--info-bg)] focus:ring-[var(--info-border)]",
} as const;

// A disabled button must not answer the pointer. The hover classes above are plain
// `hover:` (so a caller's `className="hover:…"` still replaces them through
// tailwind-merge), which means they fire on a disabled button too — the old grey
// icon lit up on hover while refusing the click. Rather than rewrite every hover as
// `enabled:hover:` (which never matches the `<a>` that `buttonClasses` also styles,
// and would out-rank a caller's plain `hover:` override), each variant pins its
// RESTING look under `disabled:hover:`, which out-ranks any `hover:` by specificity
// and only ever matches a disabled button.
const ICON_BUTTON_DISABLED_REST: Record<ButtonVariant | "overlay", string> = {
  primary: "disabled:hover:bg-[var(--bg-surface-2)]",
  secondary: "disabled:hover:bg-transparent",
  ghost: "disabled:hover:bg-transparent",
  danger: "disabled:hover:bg-[var(--danger)]",
  brand: "disabled:hover:bg-[var(--brand)]",
  link: "disabled:hover:bg-transparent disabled:hover:no-underline",
  overlay: "disabled:hover:bg-[color-mix(in_srgb,var(--bg-inverse)_60%,transparent)]",
};

// The tones that change the glyph on hover pin their resting glyph the same way.
const ICON_BUTTON_TONES_DISABLED_REST: Partial<Record<keyof typeof ICON_BUTTON_TONES, string>> = {
  muted: "disabled:hover:text-[var(--text-placeholder)]",
  danger: "disabled:hover:text-[var(--text-placeholder)]",
};

// `pressed`: a toggle that is on. The brand glyph on the quiet brand fill — the
// "selected" look of a Chip or a SegmentedControl option, so an on toggle reads as on
// beside them. After the tone, so a pressed `muted` button is brand, not grey.
const ICON_BUTTON_PRESSED =
  "bg-[var(--brand-bg)] text-[var(--brand)] hover:bg-[var(--brand-bg-hover)] hover:text-[var(--brand)] disabled:hover:bg-[var(--brand-bg)] disabled:hover:text-[var(--brand)]";

// `variant="overlay"`: a round, translucent disc for a control that sits ON a photo
// (keksdose's receipt-scan preview: close, rotate, retake over the camera image).
// The inverse pair, not the surface one: what has to hold is the contrast between the
// disc and its glyph, whatever the picture underneath is, and `--bg-inverse` /
// `--text-inverse` are the one token pair defined as each other's opposite in both
// themes. The disc is the inverse at 60% (`color-mix`, so it stays a token a palette
// can re-point); the blur keeps a busy background from breaking the glyph's edge.
const ICON_BUTTON_OVERLAY =
  "rounded-full bg-[color-mix(in_srgb,var(--bg-inverse)_60%,transparent)] text-[var(--text-inverse)] backdrop-blur-sm hover:bg-[color-mix(in_srgb,var(--bg-inverse)_75%,transparent)] focus:ring-[var(--text-inverse)]";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Any {@link ButtonVariant}, or `overlay` — a round translucent disc for use over
   *  an image (see `ICON_BUTTON_OVERLAY`). */
  variant?: ButtonVariant | "overlay";
  /** Box size: lg = 44px (a phone's touch target), md = 36px (matches the top bar),
   *  sm = 32px — all three with a 20px icon;
   *  xs = 28px with a 16px icon (an action in a list row), 2xs = 24px with a 14px
   *  icon (an action on a chip or a tab). */
  size?: IconButtonSize;
  /** Glyph colour over the variant. `muted`: placeholder grey, full text colour on
   *  hover. `danger`: the same grey at rest, `--danger` on hover and focus — for a
   *  remove/delete that repeats down a list. `warning`: amber at rest — a flag that
   *  wants attention. `info`: sky at rest — a notice-worthy but harmless action
   *  (keksdose's reconcile). Default: the variant's own colours. */
  tone?: keyof typeof ICON_BUTTON_TONES;
  /**
   * Make it a toggle button. `true` sets `aria-pressed="true"` and draws the "on" look
   * (brand glyph on the quiet brand fill); `false` sets `aria-pressed="false"` with the
   * normal look, so a screen reader still hears a toggle that is off. Left out, it is
   * an ordinary button with no `aria-pressed` — or whatever `aria-pressed` the caller
   * passes. For keksdose's budget share toggle (budgets-page:291), which paints its own
   * brand colour over a ghost button today. Keep the `aria-label` the same in both
   * states ("Share budget"): the pressed state already says whether it is on.
   */
  pressed?: boolean;
  /** Keep the click (and the Enter/Space that produces it) from reaching an
   *  ancestor's handler — for an action inside a clickable table row or card.
   *
   *  **Not a licence to put this inside another `<button>`.** HTML forbids any
   *  interactive content, and any element with a `tabindex`, inside a button — so
   *  the `<span role="button" tabIndex={0}>` workaround is invalid too — and ARIA
   *  makes a button's children presentational, so a screen reader flattens the
   *  inner one into the outer one's name and it cannot be reached at all. Make the
   *  row's main action a button that fills the row and put this one BESIDE it, on
   *  top:
   *
   *  ```tsx
   *  <div className="relative">
   *    <button className="w-full pe-16 …" onClick={open}>…row…</button>
   *    <div className="absolute inset-y-0 end-2 flex items-center gap-0.5">
   *      <IconButton size="xs" tone="danger" aria-label="Delete" onClick={remove}>
   *        <Trash2 />
   *      </IconButton>
   *    </div>
   *  </div>
   *  ```
   *
   *  The pair look exactly like the nested version, click exactly like it, and
   *  are two tab stops a screen reader can tell apart. */
  stopPropagation?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", tone = "default", pressed, stopPropagation, className, onClick, onKeyDown, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      aria-pressed={pressed ?? rest["aria-pressed"]}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        // A button turns Enter/Space into a click of its own, but the KEY still
        // bubbles — and a clickable row listening for Enter would act on it too.
        if (stopPropagation && (e.key === "Enter" || e.key === " ")) e.stopPropagation();
        onKeyDown?.(e);
      }}
      className={cn(
        ICON_BUTTON_BASE,
        ICON_BUTTON_SIZES[size],
        // After the size, so the overlay's `rounded-full` beats the small sizes' `rounded`.
        variant === "overlay" ? ICON_BUTTON_OVERLAY : buttonVariantClasses[variant],
        ICON_BUTTON_DISABLED_REST[variant],
        ICON_BUTTON_TONES[tone],
        ICON_BUTTON_TONES_DISABLED_REST[tone],
        pressed && ICON_BUTTON_PRESSED,
        className,
      )}
    />
  );
});
IconButton.displayName = "IconButton";

export const FIELD_BASE =
  "block w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm placeholder:text-[var(--text-placeholder)] focus:border-[var(--brand)] focus:ring-[var(--brand)] " +
  // A field the user cannot change has to LOOK settled. Without this, `disabled`
  // dimmed the floating label and nothing else — FIELD_BASE's own
  // `text-[var(--text-primary)]` overrides the browser's grey — so a read-only value
  // sat there at full body-text strength, indistinguishable from one you could retype
  // (Keksdose dev#455/#474).
  "disabled:cursor-default disabled:bg-[var(--bg-surface-2)] disabled:text-[var(--text-muted)] " +
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
  "[&[readonly]]:bg-[var(--bg-surface-2)] [&[readonly]]:text-[var(--text-muted)]";

/** Cancels FIELD_BASE's read-only treatment for a field that is `readOnly` for a
 *  reason other than "you may not edit this". Attribute-scoped for the same reason
 *  FIELD_BASE is — the two have to cancel on the identical selector or twMerge
 *  cannot make the later one win. */
export const FIELD_WRITABLE_LOOK =
  "[&[readonly]]:bg-[var(--bg-surface)] [&[readonly]]:text-[var(--text-primary)]";

// Extra top padding leaves room for a label that floats INSIDE the field (the
// "filled" pattern) — the label sits in the top strip, the value below it. Used by
// every labelled field (native + custom-dropdown triggers). twMerge lets pt/pb win
// over FIELD_BASE's py-2.
export const FIELD_FLOATING_PAD = "pt-4 pb-1";

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
  "border-[var(--danger-border)] ring-1 ring-[var(--danger-border)] focus:border-[var(--danger)] focus:ring-[var(--danger)]";

export const FLOATING_INPUT_CLASS = cn(FIELD_BASE, FIELD_FLOATING_PAD, "peer placeholder:text-transparent");

/** The phone breakpoint the display treatment below keys off — the same one the
 *  numpad sheet uses, kept in one place so the two can't drift apart. */
export const PHONE_QUERY = "(max-width: 767px)";

/**
 * The PHONE display treatment (Keksdose feedback #176, carried across the entry
 * forms by #179): the field chrome removed so the ONE input a form is actually
 * about reads as the thing itself, not as another boxed row in a stack.
 *
 * Every control that takes `variant="display"` — {@link Input}, `NumberInput`,
 * `AmountInput` — means exactly the same thing by it: the treatment applies below
 * {@link PHONE_QUERY} and the field is untouched above it, so a caller never has
 * to ask the viewport, and a form can't end up half-treated across breakpoints.
 *
 * What stays, deliberately:
 *  - A hairline baseline. With the box gone something still has to say "you can
 *    type here"; it takes the brand colour on focus, where a bordered field would
 *    light its whole outline. Each edge is set exactly once (`border-x-0
 *    border-t-0 border-b`) so the rule can't hinge on utility order.
 *  - The muted placeholder colour, because a display field is usually empty at
 *    the moment it matters most and has nothing else to show.
 *  - The label, moved to `sr-only` rather than dropped: display type is legible
 *    to the eye, not to a screen reader.
 *
 * Size and weight are NOT here — an amount wants display type, a subject line
 * wants a heading — so each control adds its own on top.
 */
export const FIELD_DISPLAY =
  "block w-full border-x-0 border-t-0 border-b border-[var(--border)] bg-transparent px-0 pt-0 pb-1 text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-placeholder)] focus:border-[var(--brand)] focus:outline-none focus:ring-0 disabled:opacity-60";

// A field-styled button trigger for the custom dropdown controls (MultiSelect,
// CurrencySelect) — the field look (border/bg) as a flex row for the value + chevron,
// so they don't hand-copy the field classes. Add FIELD_FLOATING_PAD only when the
// trigger carries a label (unlabelled triggers stay normal height to match buttons /
// adjacent controls). Pair the labelled case with a static FieldLabel.
// `relative` so the trigger can host an absolutely-centred FieldChevron / clear
// button the way the native Select does.
export const FIELD_TRIGGER = cn(
  FIELD_BASE,
  "relative flex items-center justify-between gap-2 text-start hover:bg-[var(--bg-hover)]",
);

/** An alias rather than an interface: the chevron adds nothing of its own to an
 *  `<svg>`'s props, and an interface declaring no members is the same type wearing a
 *  name that suggests otherwise. */
export type FieldChevronProps = Omit<ComponentPropsWithoutRef<"svg">, "children">;

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
        "pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-placeholder)]",
        className,
      )}
    />
  );
}

// Animated label that starts centred (as a placeholder) in an empty field and
// floats up INSIDE the top strip on focus or once the field has a value. Sits on
// the field's own surface, so no background chip and nothing to mismatch the card.
export const FLOATING_LABEL_CLASS = cn(
  "pointer-events-none absolute start-3 top-2.5 text-sm text-[var(--text-placeholder)] transition-all",
  "max-w-[calc(100%-1.5rem)] truncate",
  "peer-focus:top-1 peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-[var(--text-secondary)]",
  "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-[var(--text-secondary)]",
  "peer-disabled:opacity-50",
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
// sitting on top of a button (steering-design feedback #48).
const FLOATING_ROW_CLASS = cn(
  "pointer-events-none absolute start-3 top-2.5 flex items-center gap-1 transition-all",
  "max-w-[calc(100%-3rem)] text-sm text-[var(--text-placeholder)]",
  "peer-focus:top-1 peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-[var(--text-secondary)]",
  "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-[var(--text-secondary)]",
  "peer-disabled:opacity-50",
);

// The TYPE of the small static label, without any placement. Split out so the
// label and anything sharing its line (see `hint` on {@link FloatingField}) are
// laid out by one flex row instead of by two absolute offsets guessing at the
// same baseline — which is what put dev#468's "?" three pixels above the word it
// belongs to.
const STATIC_LABEL_TYPE =
  "text-[11px] leading-tight text-[var(--text-muted)] peer-disabled:opacity-50";

// A field that always has a value (select / dropdown trigger) keeps the label
// permanently in the floated position — small, in the top strip, value below.
export const FLOATING_LABEL_STATIC = cn(
  "pointer-events-none absolute start-3 top-1",
  STATIC_LABEL_TYPE,
  "max-w-[calc(100%-1.5rem)] truncate",
);

/**
 * The one place that assembles a labelled field: a `relative` wrapper around the
 * control (`children`) plus a floating label inside the top strip. Pass `staticLabel`
 * for controls that always have a value (selects); omit it for free-text fields whose
 * label animates from centred→up. Used by Input/Select/Textarea/NumberInput; the
 * dropdown controls that need a ref + menu keep their own wrapper but the same label
 * (via {@link FieldLabel}) and trigger ({@link FIELD_TRIGGER}) styles.
 */
export interface FloatingFieldProps extends ComponentPropsWithoutRef<"div"> {
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
  const labelEl = label !== undefined && (
    <label
      htmlFor={htmlFor}
      className={
        srOnlyLabel
          ? "sr-only"
          : atEnd
            ? cn("pointer-events-none min-w-0 truncate", STATIC_LABEL_TYPE)
            : withHint
              ? "pointer-events-none min-w-0 truncate"
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
    // a caller's stray `className` or `style` could unset it.
    <div {...rest} className={cn("relative", className)}>
      {children}
      {withHint ? (
        // Static: `inset-x-3` rather than `start-3`, so a long label truncates at
        // the field's own end padding instead of running under the chevron.
        // Animated: the row floats with the label and is only as wide as it needs
        // to be. Either way the hint keeps its width (`shrink-0`) and the label
        // is the one that gives way.
        <div
          className={
            atEnd
              ? "pointer-events-none absolute inset-x-3 top-1 flex items-center gap-1"
              : FLOATING_ROW_CLASS
          }
        >
          {labelEl}
          <span className="pointer-events-auto flex shrink-0 items-center">{hint}</span>
        </div>
      ) : (
        labelEl
      )}
    </div>
  );
}

/**
 * The "?" that explains a field, on the field's own label line (dev#468).
 *
 * Pass it to a labelled {@link Select} / {@link Input} as `hint`. It exists as a
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
    <Tooltip label={label} side={side} portal>
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
        className={cn(
          "flex text-[var(--text-placeholder)] transition-colors hover:text-[var(--text-secondary)]",
          className,
        )}
      >
        <HelpCircle className="size-3.5" />
      </button>
    </Tooltip>
  );
}

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

export interface LabelProps extends ComponentPropsWithoutRef<"label"> {
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
        "inline-flex items-center gap-0.5 font-medium leading-none text-[var(--text-primary)]",
        size === "sm" ? "text-xs" : "text-sm",
        disabled && "cursor-default opacity-50",
        className,
      )}
    >
      {children}
      {required && (
        <span aria-hidden className="text-[var(--danger)]">
          *
        </span>
      )}
    </label>
  );
}

/**
 * The message under a field that is wrong, and the wiring that attaches it.
 *
 * `invalid` paints the field ({@link FIELD_INVALID}) and sets `aria-invalid`, and
 * there it stopped: a field that announces "invalid" and nothing else has told a
 * screen-reader user only that they are stuck. The message was always on screen —
 * a sibling `<p>` beside the field — and never in the accessibility tree, because
 * attaching it needs an id on the message and an `aria-describedby` on the control,
 * and no caller was going to mint one by hand for every field on a form.
 *
 * Two rules the wiring has to keep:
 *
 *  - **Merge, never replace.** A field may already point at a hint ("at least twelve
 *    characters"). Overwriting that reference to say the field is wrong trades one
 *    half of the answer for the other — and it keeps the half the user has already
 *    read. The hint stays first: it is the standing advice, the error is the news.
 *  - **`invalid` keeps working alone**, for the forms whose message lives somewhere
 *    else entirely (a summary at the top of a dialog). There is nothing to point at
 *    then, and a dangling id describes the field as nothing at all.
 *
 * Deliberately NOT `role="alert"`. `aria-describedby` is read when focus reaches the
 * control, which is where a field's own error is wanted; an alert would also interrupt
 * whatever is being read at the time, on every keystroke of a form that re-validates
 * as you type.
 */
const FIELD_ERROR_CLASS = "mt-1 text-[11px] leading-tight text-[var(--danger)]";

function useFieldError(
  error: ReactNode,
  invalid: boolean | undefined,
  describedBy: string | undefined,
  /** The caller's own `aria-invalid`. A form library sets THIS (see `@eifi1/ui-kit/rhf`
   *  `FormControl`), not our `invalid` prop — and a field that announces invalid should
   *  look it too, as NumberField and the pickers already did. */
  ariaInvalid?: unknown,
) {
  const errorId = useId();
  // `null`, `false` and `""` are what a caller's `touched && errors.iban` evaluates to
  // on the happy path. None of them is a message, and pointing the control at one
  // would describe it with an empty node.
  const hasError = error !== undefined && error !== null && error !== false && error !== "";
  return {
    /** A field carrying a message that says what is wrong with it IS wrong. */
    isInvalid: Boolean(invalid) || hasError || ariaInvalid === true || ariaInvalid === "true",
    describedBy: hasError ? (describedBy ? `${describedBy} ${errorId}` : errorId) : describedBy,
    errorEl: hasError ? (
      <p id={errorId} className={FIELD_ERROR_CLASS}>
        {error}
      </p>
    ) : null,
  };
}

/**
 * A field and its message as one box.
 *
 * The message cannot go INSIDE the field's own `relative` box. The password reveal
 * toggle is `inset-y-0` and the select chevron is `top-1/2`, so both centre on
 * whatever that box contains — put two lines of message in it and the chevron drifts
 * down out of the field, between the value and the text. So the field keeps its box
 * and this wraps the pair.
 *
 * It renders nothing of its own when there is no message, which is what keeps `error`
 * additive: a field without one is exactly the DOM it was before the prop existed,
 * down to the bare `<input>` an unlabelled {@link Input} drops straight into a
 * caller's flex row. For the same reason `className` is NOT moved out here — it goes
 * on the field, as it always has, so adding a message cannot silently change what
 * that prop styles.
 */
function FieldGroup({ errorEl, children }: { errorEl: ReactNode; children: ReactNode }) {
  if (errorEl === null) return <>{children}</>;
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

export const DEFAULT_PASSWORD_REVEAL_LABELS: PasswordRevealLabels = {
  show: "Show password",
  hide: "Hide password",
};

/** Caller's labels over the English defaults — the same shape as
 *  `resolveDataTableLabels`, so a consumer translates every kit string one way. */
export function resolvePasswordRevealLabels(
  partial?: Partial<PasswordRevealLabels>,
): PasswordRevealLabels {
  if (!partial) return DEFAULT_PASSWORD_REVEAL_LABELS;
  return { ...DEFAULT_PASSWORD_REVEAL_LABELS, ...partial };
}

// Native date/time inputs only reveal the calendar via the tiny trailing icon;
// open the picker on a click anywhere in the field instead (feedback #224).
const PICKER_TYPES = new Set(["date", "datetime-local", "month", "time", "week"]);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  /** Classes for the `<input>` itself, as distinct from `className`, which
   *  styles the field WRAPPER once a `label` turns this into a FloatingField.
   *  Without it a labelled Input had no way to reach its own element — so
   *  `tabular-nums` on a numeric text field, which NumberInput has supported
   *  all along through the identically named prop, was simply unavailable. */
  inputClassName?: string;
  /** {@link FIELD_DISPLAY} — on a phone, drop the chrome and set the value as a
   *  heading. For the one field a form is about (a feedback subject, an account
   *  name), never for a stack of them. Labelled fields only: the label is what
   *  the placeholder falls back to once it goes `sr-only`. */
  variant?: "field" | "display";
  /** The field is required and unanswered, or holds something that cannot be
   *  saved — {@link FIELD_INVALID}, the same rose border/ring `Select` has worn
   *  since feedback #235.
   *
   *  It exists here because writing `aria-invalid` by hand did NOT do this. The
   *  attribute spreads onto the element and nothing styles it — there is no
   *  `[aria-invalid]` rule in this package or in either consumer's stylesheet —
   *  so three Keksdose dialogs flagged a mismatched passphrase to a screen reader
   *  and painted the field exactly as if it were fine. Setting the prop sets the
   *  attribute too, so the two can no longer be spelled separately. */
  invalid?: boolean;
  /** What is wrong with the value, in the caller's own words ("That IBAN has 21
   *  digits"). Rendered under the field, pointed at by the control's
   *  `aria-describedby` — MERGED with any the caller already passed — and implies
   *  `invalid`, so the field paints as well as announces. `invalid` alone still
   *  covers the case where the message lives elsewhere. See {@link useFieldError}. */
  error?: ReactNode;
  /** Names for the password reveal toggle, English by default — it is the one
   *  string this component renders on its own behalf, and a German form was
   *  reading it out in English. See {@link PasswordRevealLabels}. */
  passwordLabels?: Partial<PasswordRevealLabels>;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    inputClassName,
    label,
    id,
    placeholder,
    type,
    variant = "field",
    invalid,
    error,
    passwordLabels,
    ...rest
  },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const { isInvalid, describedBy, errorEl } = useFieldError(
    error,
    invalid,
    rest["aria-describedby"],
    rest["aria-invalid"],
  );
  const asDisplay = useMediaQuery(PHONE_QUERY, false) && variant === "display";
  // Password fields get a reveal toggle so users can check what they typed.
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  const effectiveType = isPassword && revealed ? "text" : type;
  const handleClick = PICKER_TYPES.has(type ?? "")
    ? (e: MouseEvent<HTMLInputElement>) => {
        rest.onClick?.(e);
        try {
          // showPicker throws if unsupported or not user-activated — a click is
          // a valid activation, so this is safe; guard for older browsers.
          (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
        } catch {
          /* ignore */
        }
      }
    : rest.onClick;
  const passwordText = useKitLabels("passwordReveal", DEFAULT_PASSWORD_REVEAL_LABELS, passwordLabels);
  const revealToggle = isPassword ? (
    <button
      type="button"
      // `tabIndex={-1}` sat here, which made this a painted, clickable control that
      // Tab stepped straight over — on the one field whose value cannot be checked by
      // looking at it. There is no mouse-only case for a reveal toggle; the people who
      // cannot see what they typed are exactly who it is for. It is a tab stop now,
      // and it needs a focus ring of its own, because FIELD_BASE's ring belongs to the
      // input underneath and stays put while focus moves onto the button on top of it.
      onClick={() => setRevealed((v) => !v)}
      // …and since it is a tab stop, a field the user may not edit must not hand the
      // keyboard a control that shows what is in it.
      disabled={rest.disabled}
      aria-label={revealed ? passwordText.hide : passwordText.show}
      aria-pressed={revealed}
      className="absolute inset-y-0 end-0 flex items-center rounded-e-md px-2.5 text-[var(--text-placeholder)] transition-colors hover:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:cursor-default disabled:opacity-50"
    >
      {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  ) : null;
  if (label === undefined) {
    if (!isPassword) {
      return (
        <FieldGroup errorEl={errorEl}>
          <input
            ref={ref}
            id={id}
            type={type}
            placeholder={placeholder}
            {...rest}
            // AFTER the spread, so the prop wins — but OR-ed with whatever the spread
            // carried, or setting `invalid` would have quietly deleted a caller's own
            // `aria-invalid`. The prop is the one that also paints; a bare attribute
            // still announces, which is all it ever did.
            aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
            // Likewise merged rather than replaced — see {@link useFieldError}.
            aria-describedby={describedBy}
            onClick={handleClick}
            className={cn(FIELD_BASE, className, inputClassName, isInvalid && FIELD_INVALID)}
          />
        </FieldGroup>
      );
    }
    return (
      <FieldGroup errorEl={errorEl}>
        <div className={cn("relative", className)}>
          <input
            ref={ref}
            id={id}
            type={effectiveType}
            placeholder={placeholder}
            {...rest}
            aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
            aria-describedby={describedBy}
            className={cn(FIELD_BASE, "pe-9", inputClassName, isInvalid && FIELD_INVALID)}
          />
          {revealToggle}
        </div>
      </FieldGroup>
    );
  }
  return (
    <FieldGroup errorEl={errorEl}>
      <FloatingField className={className} htmlFor={fieldId} label={label} srOnlyLabel={asDisplay}>
        <input
          ref={ref}
          id={fieldId}
          type={effectiveType}
          // A labelled field's placeholder is normally a single space, feeding the
          // floating label's peer-placeholder-shown trick. With the label sr-only
          // there is no float left to drive, and an empty borderless line would say
          // nothing at all — so the label text becomes the placeholder.
          placeholder={asDisplay ? (placeholder ?? (typeof label === "string" ? label : " ")) : " "}
          {...rest}
          aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          onClick={handleClick}
          className={cn(
            asDisplay
              ? cn(FIELD_DISPLAY, "text-xl font-semibold leading-snug")
              : FLOATING_INPUT_CLASS,
            isPassword && "pe-9",
            inputClassName,
            isInvalid && FIELD_INVALID,
          )}
        />
        {revealToggle}
      </FloatingField>
    </FieldGroup>
  );
});
Input.displayName = "Input";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: ReactNode;
  /** See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** See {@link Input}'s `error`. */
  error?: ReactNode;
  /** A {@link FieldHint} for the label line — see {@link FloatingField}. */
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
}

// The compact select: the field's colours, a toolbar button's height. `py-0` and a
// fixed height rather than a smaller padding, so the box is 28px whatever line
// height the caller's type brings with it.
const SELECT_SM = "h-7 py-0 ps-2 pe-7 text-xs";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, id, children, invalid, error, hint, size, selectClassName, ...rest },
  ref,
) {
  const generated = useId();
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
  const { isInvalid, describedBy, errorEl } = useFieldError(
    error,
    invalid,
    rest["aria-describedby"],
    rest["aria-invalid"],
  );
  // Custom chevron (native arrow hidden via appearance-none) so it sits a touch
  // in from the end border and matches both themes — feedback #223. A DISABLED
  // select has no menu to drop, so it drops the chevron too: the arrow is the one
  // thing on the control that promises a choice (Keksdose dev#474, where the
  // account type became read-only and still looked exactly like a picker).
  const chevron =
    rest.disabled || listBox ? null : (
      <FieldChevron className={small ? "end-1.5 size-3.5" : undefined} />
    );
  // `pe-9` is the room the chevron takes; a list box has none to make room for.
  const dress = listBox ? "overflow-y-auto" : "appearance-none pe-9";
  if (label === undefined) {
    return (
      <FieldGroup errorEl={errorEl}>
        <div className={cn("relative", className)}>
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
              small && SELECT_SM,
              selectClassName,
              isInvalid && FIELD_INVALID,
            )}
          >
            {children}
          </select>
          {chevron}
        </div>
      </FieldGroup>
    );
  }
  return (
    <FieldGroup errorEl={errorEl}>
      <FloatingField className={className} htmlFor={fieldId} label={label} staticLabel hint={hint}>
        <select
          ref={ref}
          id={fieldId}
          size={nativeSize}
          {...rest}
          aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          className={cn(
            FIELD_BASE,
            // The floated label takes the top strip of a list box too, so its first
            // row starts under the label rather than behind it.
            listBox ? "pt-5 pb-1" : FIELD_FLOATING_PAD,
            "peer",
            dress,
            selectClassName,
            isInvalid && FIELD_INVALID,
          )}
        >
          {children}
        </select>
        {chevron}
      </FloatingField>
    </FieldGroup>
  );
});
Select.displayName = "Select";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  /** See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** See {@link Input}'s `error`. */
  error?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, id, placeholder, invalid, error, ...rest },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const { isInvalid, describedBy, errorEl } = useFieldError(
    error,
    invalid,
    rest["aria-describedby"],
    rest["aria-invalid"],
  );
  if (label === undefined) {
    return (
      <FieldGroup errorEl={errorEl}>
        <textarea
          ref={ref}
          id={id}
          placeholder={placeholder}
          {...rest}
          aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          className={cn(FIELD_BASE, className, isInvalid && FIELD_INVALID)}
        />
      </FieldGroup>
    );
  }
  return (
    <FieldGroup errorEl={errorEl}>
      <FloatingField className={className} htmlFor={fieldId} label={label}>
        <textarea
          ref={ref}
          id={fieldId}
          placeholder=" "
          {...rest}
          aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          className={cn(FLOATING_INPUT_CLASS, isInvalid && FIELD_INVALID)}
        />
      </FloatingField>
    </FieldGroup>
  );
});
Textarea.displayName = "Textarea";

export interface CardProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  /**
   * When true, drop the card chrome (border, rounded corners, shadow) on mobile so the
   * card spans edge-to-edge. Chrome reappears at the `md` breakpoint. Use for primary
   * content cards on data pages; leave off for centered dialog/panel cards.
   */
  flush?: boolean;
  /**
   * `inset`: a panel INSIDE a card rather than a card on the page — the raised
   * `--bg-surface-2`, a small radius, `p-3` of its own and no border or shadow, since
   * it is already sitting on the card that has them. Lenkbank's results blocks and
   * corner panels write this by hand (`rounded-md bg-surface-2 p-3`) under a Card of
   * their own. Unlike the default card it carries its padding, because every one of
   * those copies wanted the same one; a caller's `p-*` still wins. `flush` is ignored:
   * an inset panel never runs edge to edge.
   */
  variant?: "default" | "inset";
}

export function Card({ className, children, flush, variant = "default", ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        variant === "inset"
          ? "rounded-md bg-[var(--bg-surface-2)] p-3"
          : cn(
              // Surface + border are theme tokens so the palette switcher (feedback
              // #307) can re-skin every card; a caller's own bg-*/border-* override
              // still wins via tailwind-merge.
              "bg-[var(--bg-surface)]",
              flush
                ? "border-y border-[var(--border)] md:rounded-lg md:border md:shadow-sm"
                : "rounded-lg border border-[var(--border)] shadow-sm",
            ),
        className,
      )}
    >
      {children}
    </div>
  );
}

// Composed shadcn-style Card sub-parts. `Card` stays padding-less (callers set
// their own padding via className), so these own the padding/rhythm. Token-driven
// so they re-skin with the palette. Use CardHeader → CardTitle/CardDescription
// (+ optional CardAction, top-right) → CardContent → CardFooter.
/** The sub-parts add nothing to a `<div>`'s props — they are the SAME element with a
 *  `data-slot` and a padding rhythm — so each name is an alias rather than an empty
 *  interface pretending to be more. They exist so a consumer's own wrapper can say
 *  `CardHeaderProps` instead of `ComponentProps<typeof CardHeader>`. */
export type CardHeaderProps = ComponentPropsWithoutRef<"div">;
export type CardTitleProps = ComponentPropsWithoutRef<"div">;
export type CardDescriptionProps = ComponentPropsWithoutRef<"div">;
export type CardActionProps = ComponentPropsWithoutRef<"div">;
export type CardContentProps = ComponentPropsWithoutRef<"div">;
export type CardFooterProps = ComponentPropsWithoutRef<"div">;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Grid (not flex) so CardAction can occupy a top-right column; with no
        // action it collapses to one column and title/description stack.
        "grid auto-rows-min items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-semibold leading-none", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-[var(--money-neutral)]", className)}
      {...props}
    />
  );
}

export function CardAction({ className, ...props }: CardActionProps) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-start-1 row-span-2 self-start justify-self-end", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardContentProps) {
  // `last:pb-6`, not a plain `pb-6`: CardHeader owns the top padding and CardFooter
  // owns the bottom one, so a card WITHOUT a footer had nothing closing it off and
  // its last field sat flush against the card edge (kastlan feedback: the language
  // input touching the card bottom on /profile). Scoping to `:last-child` fixes that
  // case and leaves a footered card's rhythm exactly as it was.
  return <div data-slot="card-content" className={cn("px-6 last:pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6", className)}
      {...props}
    />
  );
}

/** A `<span>`'s props plus the words a reader hears — see {@link CardHeaderProps}.
 *  The ring is drawn with a border, so there is nothing inside it to put children in. */
export interface SpinnerProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  /**
   * What the spinner means, for a screen reader. Default: `common.loading` from the
   * {@link UiKitProvider}, else "Loading…".
   *
   * `null` makes it DECORATIVE — no role, no text, hidden from assistive tech. Use it
   * whenever words are already there: beside visible "Loading…" text (otherwise it is
   * announced twice), inside a labelled button (otherwise its text joins the button's
   * name), or inside a live region of the app's own (otherwise that region and this
   * one both announce).
   */
  label?: string | null;
}

/**
 * A spinning ring that also SAYS it is loading.
 *
 * It used to be a bordered span and nothing else, so a reader met no element at all
 * where a sighted user saw the page working — or, beside an emptied list, met the
 * empty list and concluded there was nothing there. `role="status"` makes it a polite
 * live region, and the text inside is what that region announces. Text rather than
 * `aria-label`: a live region's announcement is its CONTENT, and several readers
 * ignore a name on one.
 *
 * `relative` so the `sr-only` text has a local containing block (see
 * sr-only-containment.test). Where the words are already on screen, pass
 * `label={null}`: announcing is right for a spinner standing alone and wrong for one
 * beside text, inside a button, or inside the app's own live region.
 */
export function Spinner({ className, label, ...rest }: SpinnerProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS, {
    loading: label ?? undefined,
  });
  const ring = cn(
    "relative inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--text-primary)]",
    className,
  );
  if (label === null) return <span aria-hidden {...rest} className={ring} />;
  return (
    <span role="status" {...rest} className={ring}>
      {/* The trailing space is a separator for the case the caller forgot `label={null}`
          inside a button: a name is the concatenation of its text, and without it the
          spinner's word ran straight into the button's — "Loadingconfirm". */}
      <span className="sr-only">{common.loading} </span>
    </span>
  );
}

export interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** The box renders `title` and `hint` in its own two-line rhythm, which is what makes
   *  every empty state in three apps look like the same thing — so there is no
   *  `children` slot to put arbitrary content in. The two slots below are the only
   *  other things an empty state has turned out to need, and each has a fixed place. */
  title: string;
  hint?: string;
  /** A glyph ABOVE the title — kastlan's InboxEmptyState (an inbox), keksdose's
   *  offline card (a cloud with a slash). Sized by the box (`[&_svg]:size-8`) and
   *  muted, so five call sites cannot pick five sizes; hidden from assistive tech,
   *  because the title already says what it shows. */
  icon?: ReactNode;
  /** What to do about it, BELOW the hint: keksdose's query-state cards (Retry), its
   *  error boundary (Retry / Reload / Go home — pass all three in a fragment, they
   *  wrap and centre as one row), kastlan's "Create a rule". Buttons or links the
   *  caller renders; the box only places them. */
  action?: ReactNode;
}

export function EmptyState({ title, hint, icon, action, className, ...rest }: EmptyStateProps) {
  return (
    <div
      {...rest}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-2)] px-4 py-10 text-center text-sm text-[var(--text-muted)]",
        className,
      )}
    >
      {icon != null && (
        <div aria-hidden className="mb-3 text-[var(--text-placeholder)] [&_svg]:size-8">
          {icon}
        </div>
      )}
      <div className="font-medium text-[var(--text-secondary)]">{title}</div>
      {hint && <div className="mt-1 text-xs">{hint}</div>}
      {action != null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>
      )}
    </div>
  );
}

/** One tab of a {@link Tabs} strip. */
export interface TabItem<T extends string> {
  id: T;
  /** A ReactNode so a tab can pair an icon with text. */
  label: ReactNode;
  /** Optional trailing node (e.g. a count pill). */
  badge?: ReactNode;
  /** Marks a tab that IS a route — see {@link TabsProps}. */
  href?: string;
  /** Leading decoration: an icon, or the colour swatches of the lines this tab
   *  draws in a chart above the strip. Hidden from assistive tech — it repeats
   *  what the label says, or it says something the label must say instead. */
  icon?: ReactNode;
  /** A second, smaller line under the label — the one fact that tells two tabs
   *  with similar labels apart ("80 km/h", "Level 3"). Part of the tab's name. */
  detail?: ReactNode;
  /** A tab that exists as a slot with nothing in it yet, drawn with a dashed
   *  outline so a gap in a sequence looks like a gap. Visual only: say "empty" in
   *  the label or `detail` if a screen reader needs to know. */
  empty?: boolean;
  /** `false` keeps this one tab when the strip has `onRemove` — the one sheet a
   *  workbook cannot be without. Default: removable. */
  removable?: boolean;
  /** Plain-text name for the labels the strip composes about this tab ("Remove
   *  …"), for when `label` is not a string. Default: `label` if it is a string,
   *  else the id. */
  name?: string;
}

/** The strings the strip renders on its own behalf — only when it can add or
 *  remove tabs. */
export interface TabsLabels {
  /** The "add" button's visible text when the caller gives no `addLabel`. */
  add: string;
  /** Accessible name of a tab's × — "Remove <tab>". */
  remove: (tab: string) => string;
}

export const DEFAULT_TABS_LABELS: TabsLabels = {
  add: "Add tab",
  remove: (tab) => `Remove ${tab}`,
};

/**
 * The strip's own props sit on a `<div>`: the tablist IS the root element, so anything
 * a caller hangs on it — a `data-tour` anchor for the kit's guided tour, a test id, an
 * `aria-describedby` — lands there. `onChange` is omitted from the div's props because
 * this component's `onChange` hands over the chosen TAB ID, not a DOM event, and
 * `children` because the strip renders `tabs` — a caller who wants a PANEL wires it up
 * through `panelId`, which is the whole point of that prop.
 */
export interface TabsProps<T extends string>
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "children"> {
  /** `label` is a ReactNode so tabs can pair an icon with text; `badge` is an
   *  optional trailing node (e.g. a count pill). `href` marks a tab that IS a route:
   *  it renders as an anchor so it can be middle-/⌘-clicked into a new tab (Keksdose
   *  feedback #451), while a plain click still goes through `onChange` and stays
   *  client-side. Tabs that only flip local state leave it unset — a link to a URL
   *  that does not select the tab would be worse than no link. */
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
  /** Let the strip WRAP onto as many rows as it needs below `md`, instead of
   *  scrolling sideways — for a strip carrying more tabs than fit on a phone row.
   *  Keksdose live #262: ten reports on a 406px screen showed about three, and the
   *  round-2 answer (a <select> below `md`) cost a tap to open and a tap to choose.
   *  *"I would rather keep the tabs but have multirow tabs depending on the screen
   *  size, I will not loose the function to see all reports at once and navigate by
   *  single click rather by double click."*
   *
   *  The active MARKER has to change with the layout, which is why this cannot be
   *  done from a call site with a `className`: the default marker is a `border-b-2`
   *  underline riding the container's own bottom rule, and a tab sitting in a row
   *  that does not touch that rule cannot wear it — every row but the last would
   *  show a stray line floating mid-strip, and `-mb-px` would pull each chip a
   *  pixel into the row beneath it. A wrapped strip marks the active tab with a
   *  filled brand chip instead, which is also the only thing findable at a glance
   *  among ten same-weight labels on three rows.
   *
   *  From `md` up NOTHING changes: same single-line underline strip, same paddings,
   *  same colours as every other strip in the app.
   *
   *  Opt-in on purpose. The three-tab strips (invoices, statements, bank imports)
   *  already fit a phone row, and turning those into chips would be an unrequested
   *  redesign of three other pages. */
  wrap?: boolean;
  /**
   * Accessible name for the `role="tablist"` container. Every tab carries its own
   * text, so this names the GROUP, not the tabs; leave it unset where a visible
   * heading immediately above already does that job.
   *
   * @deprecated Pass `aria-label` instead. This kit had three spellings for one idea
   * — `ariaLabel`, `aria-label` and this `label` — and settled on the DOM one, which
   * is also the one that arrives for free now that the strip spreads its rest props.
   * `label` still works and is unchanged; it names the strip only when `aria-label`
   * is absent.
   */
  label?: string;
  /**
   * `id` of the element the caller renders the open tab's content into — the missing
   * half of `role="tab"`. A tab that controls nothing is a tab in name only: a screen
   * reader announces "tab, 2 of 5" and then has no way to take the user to what it
   * opened, and no way back.
   *
   * **This component does not render the panel, on purpose.** `Tabs` is the STRIP; the
   * content lives wherever the caller put it — three Keksdose pages render it in a
   * sibling `<Card>`, one renders it through a router outlet, and a tab can BE a route
   * (`href`), in which case the panel is a whole page this component never sees.
   * Wrapping `children` here would mean either moving that content into the strip's
   * subtree — a layout change on every page that uses tabs — or shipping a wrapper
   * that only some callers could use. So the two halves are joined by an id instead.
   *
   * Wire the other end yourself:
   *
   * ```tsx
   * <Tabs tabs={tabs} active={active} onChange={setActive} panelId="report-panel" />
   * <div id="report-panel" role="tabpanel" aria-labelledby="report-panel-tab" tabIndex={-1}>
   * ```
   *
   * `aria-controls` goes on the OPEN tab only, and `${panelId}-tab` is its id — the
   * closed tabs' panels are not in the document, and a dangling `aria-controls`
   * describes a tab as opening something that is not there.
   */
  panelId?: string;
  /**
   * Makes the tabs removable: an × on the OPEN tab, and Delete on a focused tab
   * (only on the open one with `removeOn="active"`).
   *
   * The × is on the open tab only — a row of tabs each carrying one is a row of
   * things to hit by accident, and the tab you can remove should be the one you
   * are looking at — but its room is reserved on every removable tab, so opening a
   * tab never widens it and never pushes the rest of the strip along (lenkbank
   * feedback #72). It is named "Remove <tab>" and is not a tab stop of its own: the
   * strip stays one stop, and the keyboard path is Delete (announced through
   * `aria-keyshortcuts`), which removes whichever tab has focus (see `removeOn`).
   *
   * The strip only ASKS: it calls this, and the tab goes when the caller drops it
   * from `tabs` — after a confirmation, a request, whatever it needs. When it does,
   * focus that was on the removed tab (or its ×) moves to the open tab if the
   * removed one was open, else to its neighbour, instead of falling to the page.
   */
  onRemove?: (id: T) => void;
  /**
   * Which tabs the Delete key removes.
   *
   * - `"every"` (default): any focused removable tab — the ARIA pattern's reading.
   * - `"active"`: only the OPEN tab, the same one that wears the ×. For a strip whose
   *   remove is immediate and unconfirmed (lenkbank's sheet tabs delete a measurement
   *   sheet at once), so arrowing across the strip and pressing Delete cannot take
   *   out a sheet the user is not looking at. Delete on a closed tab does nothing,
   *   and only the open tab announces the shortcut (`aria-keyshortcuts`).
   *
   * Either way the × is drawn on the open tab only and its room stays reserved on
   * every removable tab, so the strip never relayouts when the selection moves.
   */
  removeOn?: "every" | "active";
  /** Renders an "add" button after the last tab, outside the tablist — it is an
   *  action, not a tab, and a tablist may own only tabs. */
  onAdd?: () => void;
  /** The add button's text. Say what is added — "Add loop", "Add report" says
   *  more than "Add". Default: `tabs.add` from the {@link UiKitProvider}. */
  addLabel?: string;
  /** Overrides for this strip's strings. See {@link TabsLabels}. */
  labels?: Partial<TabsLabels>;
  /** An add or a remove is in flight: the × and the add button are disabled and
   *  Delete is ignored, so a double click cannot remove two tabs. Nothing moves. */
  busy?: boolean;
  /**
   * `"vertical"`: the same strip as a SIDE NAV — one item per row, the open one
   * filled, ↑/↓ walking it (Home/End as before) and `aria-orientation="vertical"` on
   * the tablist. For keksdose's admin page and settings page, which each hand-built
   * the identical sidebar with none of this strip's keyboard, roving tab stop or
   * routed-`href` handling. Everything else — `href` tabs, `badge`, `panelId`,
   * `onRemove`, `onAdd` — means exactly what it means on the horizontal strip; the
   * badge moves to the row's end.
   *
   * **On a phone ({@link PHONE_QUERY}) it becomes the horizontal strip**, `wrap` and
   * all, rather than staying a column. A side nav only works beside its content; on
   * a phone it has to go ABOVE it, and eight full-width rows there push the panel
   * the user picked below the fold on every visit — the two keksdose pages both
   * collapsed theirs into a scrolling row by hand for exactly that reason. The
   * orientation is switched in JavaScript, not with `md:` classes, so the
   * `aria-orientation` a screen reader hears and the arrow keys that work always
   * match the layout on screen. The caller's own two-column layout has to stack at
   * the same breakpoint (`md:grid-cols-[14rem_1fr]`).
   */
  orientation?: "horizontal" | "vertical";
}

// The two shapes are written out as whole strings rather than as one base plus a
// pile of `md:` overrides. The unwrapped pair is character-for-character what the
// three strips that do not opt in get, so those cannot drift; the wrapped pair is
// authored from scratch, so no unprefixed utility has to be beaten by its own `md:`
// twin through tailwind-merge. The only ordering this relies on is Tailwind's own:
// unprefixed utilities are emitted first, then `md:` — so from 768px up the wrapped
// strip resolves to exactly the paint of the default one. Both themes come free now
// that the colours are tokens: there is no `md:dark:` tier left to keep in step.
const TABLIST_CLASSES =
  "flex gap-1 overflow-x-auto overflow-y-hidden border-b border-[var(--border)]";
// The side nav. A column of full-width rows with the open one FILLED rather than
// underlined: an underline under one row of a list reads as a separator, not as a
// selection. `--bg-active` is the kit's own selected-row fill (the sidebar's), so the
// admin page's nav and the app's own sidebar mark "you are here" the same way.
const TABLIST_VERTICAL_CLASSES = "flex flex-col gap-0.5";
const TAB_VERTICAL_CLASSES =
  "flex w-full items-center rounded-md px-3 py-2 text-start text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-strong)]";
const TAB_VERTICAL_ACTIVE_CLASSES = "bg-[var(--bg-active)] text-[var(--text-primary)]";
const TAB_VERTICAL_INACTIVE_CLASSES =
  "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]";

const TABLIST_WRAP_CLASSES =
  "flex flex-wrap gap-1.5 md:flex-nowrap md:gap-1 md:overflow-x-auto md:overflow-y-hidden md:border-b md:border-[var(--border)]";

const TAB_CLASSES =
  "whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none focus:ring-2 focus:ring-[var(--border-strong)]";
const TAB_ACTIVE_CLASSES = "border-[var(--text-primary)] text-[var(--text-primary)]";
const TAB_INACTIVE_CLASSES =
  "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)]";

// Below `md`, a chip: `py-2` on `text-xs` is exactly 32px tall, and ten German
// report labels then land in three rows on a 406px screen (four at `text-sm`). The
// active fill is the app's own selected pair, `--brand` / `--brand-contrast`: the
// palette store writes both halves of it together for every preset and both themes,
// so the contrast holds everywhere (5.1:1 at its worst preset) without a hard-coded
// colour. Inactive chips take the raised card surface with full-strength body text —
// all ten have to stay readable; it is the FILL, not the text weight, that says
// which one is open.
const TAB_WRAP_CLASSES =
  "whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-strong)] md:rounded-none md:border-b-2 md:-mb-px md:bg-transparent md:px-3 md:py-2 md:text-sm";
const TAB_WRAP_ACTIVE_CLASSES =
  "bg-[var(--brand)] text-[var(--brand-contrast)] md:border-[var(--text-primary)] md:text-[var(--text-primary)]";
const TAB_WRAP_INACTIVE_CLASSES =
  "bg-[var(--bg-surface)] text-[var(--text-primary)] md:border-transparent md:text-[var(--text-muted)] md:hover:border-[var(--border-strong)] md:hover:text-[var(--text-secondary)]";

// The add/remove chrome. The × reserves its gutter on every removable tab (see
// `onRemove`); `md:pe-8` is spelled out because the wrapped chip's `md:px-3` would
// otherwise hand the gutter back from 768px up.
const TAB_REMOVABLE_CLASSES = "pe-8 md:pe-8";
const TAB_EMPTY_CLASSES = "-mx-1.5 rounded border border-dashed border-[var(--border-strong)] px-1.5";
const TAB_ADD_CLASSES =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4";
const TAB_ADD_WRAP_CLASSES = "px-2.5 text-xs md:px-3 md:text-sm";

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
  wrap = false,
  label,
  panelId,
  onRemove,
  removeOn = "every",
  onAdd,
  addLabel,
  labels,
  busy = false,
  orientation = "horizontal",
  "aria-label": ariaLabel,
  ...rest
}: TabsProps<T>) {
  const text = useKitLabels("tabs", DEFAULT_TABS_LABELS, labels);
  // See `orientation`: a vertical strip is the horizontal one on a phone.
  const phone = useMediaQuery(PHONE_QUERY, false);
  const vertical = orientation === "vertical" && !phone;
  const stripRef = useRef<HTMLDivElement>(null);
  const isRemovable = (tab: TabItem<T>) => onRemove !== undefined && tab.removable !== false;
  // Whether Delete reaches this tab: every removable tab, or only the open one.
  const deletesOnKey = (tab: TabItem<T>) =>
    isRemovable(tab) && (removeOn === "every" || tab.id === active);
  const nameOf = (tab: TabItem<T>) =>
    tab.name ?? (typeof tab.label === "string" ? tab.label : tab.id);

  // Where focus goes once a removal the strip asked for has happened. The caller
  // owns `tabs` and may take its time (a confirmation, a request), so this waits
  // for the id to actually leave the list rather than guessing at the moment.
  const pendingFocus = useRef<{ removed: T; wasActive: boolean; neighbour?: T } | null>(null);
  const requestRemove = (id: T) => {
    const index = tabs.findIndex((t) => t.id === id);
    pendingFocus.current = {
      removed: id,
      wasActive: id === active,
      neighbour: (tabs[index + 1] ?? tabs[index - 1])?.id,
    };
    onRemove?.(id);
  };
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending || tabs.some((t) => t.id === pending.removed)) return;
    pendingFocus.current = null;
    const strip = stripRef.current;
    if (!strip) return;
    // Only focus that fell out of the strip with the removed tab is ours to place.
    // If the user has moved on — into the panel, into a dialog — leave it there.
    const focused = document.activeElement;
    if (focused && focused !== document.body && !strip.contains(focused)) return;
    // The removed tab was open: focus follows the caller's new selection, which is
    // also the strip's tab stop. It was not: its neighbour, as the ARIA pattern has it.
    const target =
      !pending.wasActive && tabs.some((t) => t.id === pending.neighbour)
        ? pending.neighbour
        : active;
    const index = tabs.findIndex((t) => t.id === target);
    strip.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus();
  }, [tabs, active]);

  // Arrow keys walk the strip in DOM order (ARIA tabs pattern), which is what keeps
  // a WRAPPED strip navigable: the rows flow in DOM order too, so Right off the end
  // of row one lands on the first chip of row two rather than nowhere. Home/End jump
  // to the ends. Focus only — activation stays on click/Enter/Space, because a tab
  // here can be a real route and moving focus must not navigate.
  //
  // On the TABS, not on the tablist. The container carried it, which left a `<div>`
  // wearing an interactive role and a key handler while being unfocusable —
  // `jsx-a11y/interactive-supports-focus`, and the only instance of it left in `src/`.
  // The fix that rule wants is `tabIndex` on the div; the fix the pattern wants is
  // the handler on the elements that are natively focusable and actually receive the
  // keystroke. Those are the tabs, so the warning goes away by being right rather
  // than by being satisfied.
  const onTabKeyDown = (e: KeyboardEvent<HTMLElement>, tab: TabItem<T>) => {
    // Delete removes the FOCUSED tab (the ARIA pattern's optional key for deletable
    // tabs) — the keyboard's way to the × that is not a tab stop. `busy` swallows it
    // rather than letting it fall through to the page. With `removeOn="active"` only
    // the open tab answers; a closed one lets the key pass untouched.
    if (e.key === "Delete" && deletesOnKey(tab)) {
      e.preventDefault();
      if (!busy) requestRemove(tab.id);
      return;
    }
    // Along the reading direction: the strip is a flex row, so in RTL the NEXT tab sits
    // to the left, and ArrowLeft has to reach it. A vertical strip answers ↑/↓ instead
    // — and ONLY those, as the pattern has it: ←/→ are left to the page, where a side
    // nav's neighbour (the panel) may well want them.
    const step: 1 | -1 | 0 = vertical
      ? e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowUp"
          ? -1
          : 0
      : horizontalStep(e.key, e.currentTarget);
    if (step === 0 && e.key !== "Home" && e.key !== "End") return;
    const strip = e.currentTarget.closest('[role="tablist"]');
    if (!strip) return;
    const items = Array.from(strip.querySelectorAll<HTMLElement>('[role="tab"]'));
    const from = items.indexOf(e.currentTarget);
    if (from === -1) return;
    e.preventDefault();
    const to =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? items.length - 1
          : (from + step + items.length) % items.length;
    items[to]?.focus();
  };
  const tablist = (
    <div
      // Before the role and the name: a caller's arbitrary attribute is welcome on the
      // strip, but a `role` or an `aria-label` arriving through a spread props object
      // must not be able to unmake the tablist the tabs below are registered against.
      {...rest}
      ref={stripRef}
      role="tablist"
      // The DOM spelling wins over the deprecated `label`; see {@link TabsProps}.
      aria-label={ariaLabel ?? label}
      // Only when vertical: `horizontal` is the tablist's implicit value, and the
      // attribute on every existing strip would be noise in every snapshot of them.
      aria-orientation={vertical ? "vertical" : undefined}
      // With an add button the strip gains an outer box, and `className` goes there
      // — it is the box a caller's margin or width is meant for.
      className={cn(
        vertical ? TABLIST_VERTICAL_CLASSES : wrap ? TABLIST_WRAP_CLASSES : TABLIST_CLASSES,
        onAdd ? "min-w-0" : className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const removable = isRemovable(tab);
        // Written once and worn by either tag below, so a routed tab and a
        // state-only tab stay indistinguishable to the eye and to a screen reader.
        const shared = {
          role: "tab" as const,
          "aria-selected": isActive,
          // Roving tabindex: the whole strip is ONE stop in the page's tab order, and
          // it is the open tab. Ten report tabs otherwise cost ten Tab presses to step
          // over on the way to the table below them (live #262's strip is the extreme
          // case, but every strip in the app paid it).
          //
          // The stop follows the SELECTION, not the focus. Arrowing is a look around —
          // activation here is manual, because a tab can be a real route — so re-
          // pointing the stop at a report the user only arrowed past would hand the
          // strip back on the next visit in a state they never chose. The cost is that
          // Tab out and back returns to the open tab rather than to the last one
          // looked at; the ARIA pattern allows either, and this one needs no second
          // piece of state shadowing `active`.
          tabIndex: isActive ? 0 : -1,
          // Only the open tab: see `panelId`.
          "aria-controls": isActive ? panelId : undefined,
          id: isActive && panelId ? `${panelId}-tab` : undefined,
          "aria-keyshortcuts": deletesOnKey(tab) ? "Delete" : undefined,
          onKeyDown: (e: KeyboardEvent<HTMLElement>) => onTabKeyDown(e, tab),
          className: vertical
            ? cn(
                TAB_VERTICAL_CLASSES,
                isActive ? TAB_VERTICAL_ACTIVE_CLASSES : TAB_VERTICAL_INACTIVE_CLASSES,
                removable && "pe-8",
              )
            : cn(
                wrap ? TAB_WRAP_CLASSES : TAB_CLASSES,
                wrap
                  ? isActive
                    ? TAB_WRAP_ACTIVE_CLASSES
                    : TAB_WRAP_INACTIVE_CLASSES
                  : isActive
                    ? TAB_ACTIVE_CLASSES
                    : TAB_INACTIVE_CLASSES,
                removable && TAB_REMOVABLE_CLASSES,
              ),
        };
        const inner = (
          <span
            className={cn(
              // In a side nav the row is the full width, so the label takes it and a
              // badge lands at the row's end, where a column of counts lines up.
              vertical ? "flex min-w-0 flex-1 items-center gap-1.5" : "inline-flex items-center gap-1.5",
              tab.empty && TAB_EMPTY_CLASSES,
            )}
          >
            {tab.icon != null && (
              <span aria-hidden className="inline-flex shrink-0 items-center gap-0.5">
                {tab.icon}
              </span>
            )}
            {tab.detail != null ? (
              <span className="flex flex-col items-start text-start">
                <span>{tab.label}</span>
                {/* A separator for the NAME only — whitespace between flex items is
                    not drawn, and without it the two lines ran together into one
                    word for a screen reader ("80 km/hloop 2"). */}{" "}
                <span className="text-[11px] font-normal leading-tight text-[var(--text-muted)]">
                  {tab.detail}
                </span>
              </span>
            ) : (
              tab.label
            )}
            {tab.badge != null ? (
              vertical ? <span className="ms-auto flex shrink-0 items-center">{tab.badge}</span> : tab.badge
            ) : null}
          </span>
        );
        const element = tab.href ? (
          <a
            key={tab.id}
            {...shared}
            href={tab.href}
            draggable={false}
            onClick={(e) => {
              // Middle-, ⌘/Ctrl-, Shift- and Alt-click belong to the browser
              // (feedback #451); only the plain left click is ours to cancel and
              // route through `onChange`, which keeps the switch client-side.
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onChange(tab.id);
            }}
            // A <button> tab activated on Space; an anchor does not, so becoming a
            // link (feedback #451) would have quietly cost keyboard users the tab
            // strip. Enter is deliberately untouched — it is the anchor's own
            // default and already arrives at `onChange` through the click handler
            // above, so handling it here too would switch tabs twice. Same three
            // lines the mobile row card carries, for the same reason; the rejected
            // alternative — keeping a button and faking the middle click with
            // window.open — is what the whole item is moving away from.
            //
            // Composed with the strip's arrow-key walk rather than replacing it: this
            // prop overrides the one in `shared`, and an anchor tab that lost the
            // arrows would be a strip that is navigable only where it is not a link.
            onKeyDown={(e) => {
              onTabKeyDown(e, tab);
              if (e.defaultPrevented || e.key !== " ") return;
              e.preventDefault();
              onChange(tab.id);
            }}
          >
            {inner}
          </a>
        ) : (
          <button key={tab.id} {...shared} onClick={() => onChange(tab.id)}>
            {inner}
          </button>
        );
        if (!removable) return element;
        return (
          // The × cannot go INSIDE the tab: a button in a button is invalid HTML, and
          // a tab's children are presentational, so a reader would flatten it into the
          // tab's name. It sits beside the tab, over the gutter the tab reserves.
          <div key={tab.id} className={cn("relative flex", !vertical && "shrink-0")}>
            {element}
            {isActive && (
              <IconButton
                size="2xs"
                tone="danger"
                // Not a tab stop: the strip is one, and Delete is the keyboard's path.
                // Still a named button, so a screen reader's cursor and a touch
                // reader's swipe both reach it.
                tabIndex={-1}
                type="button"
                aria-label={text.remove(nameOf(tab))}
                disabled={busy}
                onClick={() => requestRemove(tab.id)}
                className={cn(
                  "absolute inset-y-0 end-1 my-auto",
                  // On a wrapped strip's filled chip the quiet grey would vanish into
                  // the brand fill below `md`.
                  wrap && "text-[var(--brand-contrast)] md:text-[var(--text-placeholder)]",
                )}
              >
                <X />
              </IconButton>
            )}
          </div>
        );
      })}
    </div>
  );
  if (!onAdd) return tablist;
  if (vertical) {
    // Under the column, not beside it, and with no rule to carry on: a side nav has none.
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        {tablist}
        <button type="button" onClick={onAdd} disabled={busy} className={TAB_ADD_CLASSES}>
          <Plus aria-hidden />
          {addLabel ?? text.add}
        </button>
      </div>
    );
  }
  return (
    <div
      className={cn(
        wrap ? "flex flex-wrap items-end gap-1.5 md:flex-nowrap md:gap-0" : "flex items-end",
        className,
      )}
    >
      {tablist}
      {/* Outside the tablist: an action, not a tab — and a tablist may own only
          tabs. The rule under the strip carries on beneath it. */}
      <div
        className={cn(
          "flex flex-1 items-center",
          wrap
            ? "md:self-stretch md:border-b md:border-[var(--border)]"
            : "self-stretch border-b border-[var(--border)]",
        )}
      >
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          className={cn(TAB_ADD_CLASSES, wrap && TAB_ADD_WRAP_CLASSES)}
        >
          <Plus aria-hidden />
          {addLabel ?? text.add}
        </button>
      </div>
    </div>
  );
}
