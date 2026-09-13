import { forwardRef, useId, useState } from "react";
import { ChevronDown, Eye, EyeOff, HelpCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, InputHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { useMediaQuery } from "../hooks/use-media-query";
import { Tooltip } from "./tooltip";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "brand";

// Shared base ring for every button-styled element. Kept as a named const so the
// <Button> component and the {@link buttonClasses} helper draw from one source and
// can never drift apart.
const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

// Warm, palette-token-driven so buttons blend with the fields + cards in every theme.
// Actions default to a warm bordered look (primary = filled warm chip, secondary =
// outline); `brand` stays the solid accent for the rare strong CTA; danger stays red
// (destructive semantics). All focus rings use the brand accent.
const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)] focus:ring-[var(--brand)]",
  secondary:
    "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] focus:ring-[var(--brand)]",
  ghost:
    "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] focus:ring-[var(--brand)]",
  danger: "bg-red-600 text-white hover:bg-red-500 focus:ring-red-300",
  brand:
    "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)] focus:ring-[var(--brand)]",
};

/**
 * Button classes for the rare case where the styling must land on a non-`<button>`
 * element that {@link Button} can't render — e.g. a router `<Link>` or a Radix
 * AlertDialog Action/Cancel (which must stay the Radix element). Everywhere a real
 * button works, prefer `<Button>`. Draws from the same base + variant maps as
 * `<Button>`, so the two stay in lockstep.
 */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string): string {
  return cn(BUTTON_BASE, buttonVariantClasses[variant], className);
}

export function Button({
  variant = "primary",
  stretch,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; stretch?: boolean }) {
  return (
    <button
      {...rest}
      className={cn(
        BUTTON_BASE,
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
// child icon to 20px via `[&_svg]:size-5` so a caller cannot under-size it. Use
// it wherever an action is a bare icon (edit/delete/tools) so they all match the
// top-bar icon buttons and can never drift apart again.
//
// Draws its colours from the same `buttonVariantClasses` map as <Button>, so the
// two re-skin together with the palette.
const ICON_BUTTON_BASE =
  "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-5";

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    /** Box size: md = 36px (matches the top bar), sm = 32px. The icon stays 20px. */
    size?: "sm" | "md";
  }
>(function IconButton({ variant = "ghost", size = "md", className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      {...rest}
      className={cn(
        ICON_BUTTON_BASE,
        size === "sm" ? "size-8" : "size-9",
        buttonVariantClasses[variant],
        className,
      )}
    />
  );
});
IconButton.displayName = "IconButton";

export const FIELD_BASE =
  "block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[var(--brand)] focus:ring-[var(--brand)] dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 " +
  // A field the user cannot change has to LOOK settled. Without this, `disabled`
  // dimmed the floating label and nothing else — FIELD_BASE's own `text-slate-900`
  // overrides the browser's grey — so a read-only value sat there in full-strength
  // black, indistinguishable from one you could retype (Keksdose dev#455/#474).
  "disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-400 " +
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
  // that made three different-looking families out of one field style: white
  // inputs, grey selects, grey trigger buttons.
  "[&[readonly]]:bg-slate-50 [&[readonly]]:text-slate-500 dark:[&[readonly]]:bg-slate-800/60 dark:[&[readonly]]:text-slate-400";

/** Cancels FIELD_BASE's read-only treatment for a field that is `readOnly` for a
 *  reason other than "you may not edit this". Attribute-scoped for the same reason
 *  FIELD_BASE is — the two have to cancel on the identical selector or twMerge
 *  cannot make the later one win. */
export const FIELD_WRITABLE_LOOK =
  "[&[readonly]]:bg-white [&[readonly]]:text-slate-900 dark:[&[readonly]]:bg-slate-900 dark:[&[readonly]]:text-slate-100";

// Extra top padding leaves room for a label that floats INSIDE the field (the
// "filled" pattern) — the label sits in the top strip, the value below it. Used by
// every labelled field (native + custom-dropdown triggers). twMerge lets pt/pb win
// over FIELD_BASE's py-2.
export const FIELD_FLOATING_PAD = "pt-4 pb-1";

// Error/required highlight for a field that is missing a value — a rose border
// and matching focus ring so the control itself shows what's wrong, not just a
// note beside it (feedback #235). Layered after FIELD_BASE so twMerge wins.
//
// The `ring-1` is not decoration; it is what makes the highlight SURVIVE display
// scaling (Keksdose live #295 — *"Account select boundary. It is not highlighted on
// the sides."*). At 125%, the browser's usual setting on a 2560px screen, a 1px CSS
// border is 1.25 device pixels: the horizontal edges land on whole rows and paint
// solid, while one of the two VERTICAL edges lands across a pixel boundary and is
// spread over two columns at partial coverage. Measured on the receipt's required
// account field, dark theme, full rose = rgb(208,30,78): left/top/bottom all 208,
// right 160 then 115 — the side that is supposed to shout, at 55–77% of the others.
// A border plus a ring is 2 CSS px, so whatever the fraction there is always one
// fully covered device pixel on every side (re-measured: worst side 241).
//
// A ring rather than `border-2`: a box-shadow adds no layout, so an invalid field
// stays exactly the size of a valid one and nothing beside it moves when the value
// arrives.
export const FIELD_INVALID =
  "border-rose-400 ring-1 ring-rose-400 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500/80 dark:ring-rose-500/80 dark:focus:border-rose-400";

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
  "block w-full border-x-0 border-t-0 border-b border-[var(--border)] bg-transparent px-0 pt-0 pb-1 text-[var(--text-primary)] shadow-none placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-0 disabled:opacity-60 dark:placeholder:text-slate-500";

// A field-styled button trigger for the custom dropdown controls (MultiSelect,
// CurrencySelect) — the field look (border/bg) as a flex row for the value + chevron,
// so they don't hand-copy the field classes. Add FIELD_FLOATING_PAD only when the
// trigger carries a label (unlabelled triggers stay normal height to match buttons /
// adjacent controls). Pair the labelled case with a static FieldLabel.
// `relative` so the trigger can host an absolutely-centred FieldChevron / clear
// button the way the native Select does.
export const FIELD_TRIGGER = cn(
  FIELD_BASE,
  "relative flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800",
);

/** The dropdown chevron, shared by the native {@link Select} and every custom
 * {@link FIELD_TRIGGER} control.
 *
 * Absolutely positioned and centred on the FIELD box. As an ordinary flex child
 * it centres on the *content* box instead, and `FIELD_FLOATING_PAD` (pt-4 pb-1)
 * pushes that box's midline down — so a labelled currency/multi-select chevron
 * sat visibly lower than the native select's right beside it (feedback #400).
 * Pair it with `pr-9` on the trigger so the value can't run underneath. */
export function FieldChevron({ className }: { className?: string }) {
  return (
    <ChevronDown
      aria-hidden
      className={cn(
        "pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500",
        className,
      )}
    />
  );
}

// Animated label that starts centred (as a placeholder) in an empty field and
// floats up INSIDE the top strip on focus or once the field has a value. Sits on
// the white field, so no background chip and nothing to mismatch the card.
export const FLOATING_LABEL_CLASS = cn(
  "pointer-events-none absolute left-3 top-2.5 text-sm text-slate-400 transition-all",
  "max-w-[calc(100%-1.5rem)] truncate",
  "peer-focus:top-1 peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-slate-600",
  "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-slate-600",
  "dark:text-slate-500 dark:peer-focus:text-slate-300 dark:peer-[:not(:placeholder-shown)]:text-slate-300",
  "peer-disabled:opacity-50",
);

// The animated label again, as a ROW that the label and its "?" share — same
// placement, same float, same type, but with the type on the row so the label
// INHERITS it. It has to be that way round: `peer-focus:` compiles to a sibling
// selector, so the classes have to sit on the element that is actually a sibling
// of the input, and a label nested inside a wrapper is not one.
//
// Wider right clearance than the label alone takes (`3rem` rather than `1.5rem`),
// because the controls that carry an animated label are the ones with something
// at the right edge of the field — NumberInput's calculator is the case this was
// written for. The label truncates a little sooner; the alternative was the "?"
// sitting on top of a button (steering-design feedback #48).
const FLOATING_ROW_CLASS = cn(
  "pointer-events-none absolute left-3 top-2.5 flex items-center gap-1 transition-all",
  "max-w-[calc(100%-3rem)] text-sm text-slate-400",
  "peer-focus:top-1 peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-slate-600",
  "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-slate-600",
  "dark:text-slate-500 dark:peer-focus:text-slate-300 dark:peer-[:not(:placeholder-shown)]:text-slate-300",
  "peer-disabled:opacity-50",
);

// The TYPE of the small static label, without any placement. Split out so the
// label and anything sharing its line (see `hint` on {@link FloatingField}) are
// laid out by one flex row instead of by two absolute offsets guessing at the
// same baseline — which is what put dev#468's "?" three pixels above the word it
// belongs to.
const STATIC_LABEL_TYPE =
  "text-[11px] leading-tight text-slate-500 dark:text-slate-400 peer-disabled:opacity-50";

// A field that always has a value (select / dropdown trigger) keeps the label
// permanently in the floated position — small, in the top strip, value below.
export const FLOATING_LABEL_STATIC = cn(
  "pointer-events-none absolute left-3 top-1",
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
export function FloatingField({
  className,
  htmlFor,
  label,
  staticLabel,
  srOnlyLabel,
  hint,
  children,
}: {
  className?: string;
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
   *  one belongs to a control with something at the right edge of the field — a
   *  calculator, a stepper — so the hint follows the label instead, and it is
   *  the label that gives way (steering-design feedback #48). */
  hint?: ReactNode;
  children: ReactNode;
}) {
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
    <div className={cn("relative", className)}>
      {children}
      {withHint ? (
        // Static: `inset-x-3` rather than `left-3`, so a long label truncates at
        // the field's own right padding instead of running under the chevron.
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
export function FieldHint({ label, side = "left" }: { label: string; side?: "left" | "right" | "top" | "bottom" }) {
  return (
    <Tooltip label={label} side={side} portal>
      <button
        type="button"
        aria-label={label}
        // Nothing to activate: the tooltip opens on hover and on focus, and a
        // click that did something as well would be a second, undiscoverable
        // behaviour on the same target.
        onClick={(e) => e.preventDefault()}
        className="flex text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
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
export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn(FLOATING_LABEL_STATIC, "z-10", className)}>
      {children}
    </span>
  );
}

// Native date/time inputs only reveal the calendar via the tiny trailing icon;
// open the picker on a click anywhere in the field instead (feedback #224).
const PICKER_TYPES = new Set(["date", "datetime-local", "month", "time", "week"]);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
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
  }
>(function Input(
  { className, inputClassName, label, id, placeholder, type, variant = "field", invalid, ...rest },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
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
  const revealToggle = isPassword ? (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => setRevealed((v) => !v)}
      aria-label={revealed ? "Hide password" : "Show password"}
      aria-pressed={revealed}
      className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
    >
      {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  ) : null;
  if (label === undefined) {
    if (!isPassword) {
      return (
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
          aria-invalid={invalid || rest["aria-invalid"] || undefined}
          onClick={handleClick}
          className={cn(FIELD_BASE, className, inputClassName, invalid && FIELD_INVALID)}
        />
      );
    }
    return (
      <div className={cn("relative", className)}>
        <input
          ref={ref}
          id={id}
          type={effectiveType}
          placeholder={placeholder}
          {...rest}
          aria-invalid={invalid || rest["aria-invalid"] || undefined}
          className={cn(FIELD_BASE, "pr-9", inputClassName, invalid && FIELD_INVALID)}
        />
        {revealToggle}
      </div>
    );
  }
  return (
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
        aria-invalid={invalid || rest["aria-invalid"] || undefined}
        onClick={handleClick}
        className={cn(
          asDisplay
            ? cn(FIELD_DISPLAY, "text-xl font-semibold leading-snug")
            : FLOATING_INPUT_CLASS,
          isPassword && "pr-9",
          inputClassName,
          invalid && FIELD_INVALID,
        )}
      />
      {revealToggle}
    </FloatingField>
  );
});
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & {
    label?: ReactNode;
    invalid?: boolean;
    /** A {@link FieldHint} for the label line — see {@link FloatingField}. */
    hint?: ReactNode;
  }
>(function Select({ className, label, id, children, invalid, hint, ...rest }, ref) {
  const generated = useId();
  const fieldId = id ?? generated;
  // Custom chevron (native arrow hidden via appearance-none) so it sits a touch
  // in from the right border and matches both themes — feedback #223. A DISABLED
  // select has no menu to drop, so it drops the chevron too: the arrow is the one
  // thing on the control that promises a choice (Keksdose dev#474, where the
  // account type became read-only and still looked exactly like a picker).
  const chevron = rest.disabled ? null : <FieldChevron />;
  if (label === undefined) {
    return (
      <div className={cn("relative", className)}>
        <select
          ref={ref}
          {...rest}
          aria-invalid={invalid || undefined}
          className={cn(FIELD_BASE, "appearance-none pr-9", invalid && FIELD_INVALID)}
        >
          {children}
        </select>
        {chevron}
      </div>
    );
  }
  return (
    <FloatingField className={className} htmlFor={fieldId} label={label} staticLabel hint={hint}>
      <select
        ref={ref}
        id={fieldId}
        {...rest}
        aria-invalid={invalid || undefined}
        className={cn(
          FIELD_BASE,
          FIELD_FLOATING_PAD,
          "peer appearance-none pr-9",
          invalid && FIELD_INVALID,
        )}
      >
        {children}
      </select>
      {chevron}
    </FloatingField>
  );
});
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: ReactNode;
    /** See {@link Input}'s `invalid`. */
    invalid?: boolean;
  }
>(function Textarea({ className, label, id, placeholder, invalid, ...rest }, ref) {
  const generated = useId();
  const fieldId = id ?? generated;
  if (label === undefined) {
    return (
      <textarea
        ref={ref}
        id={id}
        placeholder={placeholder}
        {...rest}
        aria-invalid={invalid || rest["aria-invalid"] || undefined}
        className={cn(FIELD_BASE, className, invalid && FIELD_INVALID)}
      />
    );
  }
  return (
    <FloatingField className={className} htmlFor={fieldId} label={label}>
      <textarea
        ref={ref}
        id={fieldId}
        placeholder=" "
        {...rest}
        aria-invalid={invalid || rest["aria-invalid"] || undefined}
        className={cn(FLOATING_INPUT_CLASS, invalid && FIELD_INVALID)}
      />
    </FloatingField>
  );
});
Textarea.displayName = "Textarea";

export function Card({
  className,
  children,
  flush,
}: {
  className?: string;
  children: ReactNode;
  /**
   * When true, drop the card chrome (border, rounded corners, shadow) on mobile so the
   * card spans edge-to-edge. Chrome reappears at the `md` breakpoint. Use for primary
   * content cards on data pages; leave off for centered dialog/panel cards.
   */
  flush?: boolean;
}) {
  return (
    <div
      className={cn(
        // Surface + border are theme tokens so the palette switcher (feedback
        // #307) can re-skin every card; a caller's own bg-*/border-* override
        // still wins via tailwind-merge.
        "bg-[var(--bg-surface)]",
        flush
          ? "border-y border-[var(--border)] md:rounded-lg md:border md:shadow-sm"
          : "rounded-lg border border-[var(--border)] shadow-sm",
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
export function CardHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
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

export function CardTitle({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-semibold leading-none", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-[var(--money-neutral)]", className)}
      {...props}
    />
  );
}

export function CardAction({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-start-1 row-span-2 self-start justify-self-end", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  // `last:pb-6`, not a plain `pb-6`: CardHeader owns the top padding and CardFooter
  // owns the bottom one, so a card WITHOUT a footer had nothing closing it off and
  // its last field sat flush against the card edge (kastlan feedback: the language
  // input touching the card bottom on /profile). Scoping to `:last-child` fixes that
  // case and leaves a footered card's rhythm exactly as it was.
  return <div data-slot="card-content" className={cn("px-6 last:pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6", className)}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-slate-200",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  hint,
  className,
}: {
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400",
        className,
      )}
    >
      <div className="font-medium text-slate-700 dark:text-slate-200">{title}</div>
      {hint && <div className="mt-1 text-xs">{hint}</div>}
    </div>
  );
}

export interface TabsProps<T extends string> {
  /** `label` is a ReactNode so tabs can pair an icon with text; `badge` is an
   *  optional trailing node (e.g. a count pill). `href` marks a tab that IS a route:
   *  it renders as an anchor so it can be middle-/⌘-clicked into a new tab (Keksdose
   *  feedback #451), while a plain click still goes through `onChange` and stays
   *  client-side. Tabs that only flip local state leave it unset — a link to a URL
   *  that does not select the tab would be worse than no link. */
  tabs: { id: T; label: ReactNode; badge?: ReactNode; href?: string }[];
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
  /** Accessible name for the `role="tablist"` container. Every tab carries its own
   *  text, so this names the GROUP, not the tabs; leave it unset where a visible
   *  heading immediately above already does that job. */
  label?: string;
}

// The two shapes are written out as whole strings rather than as one base plus a
// pile of `md:` overrides. The unwrapped pair is character-for-character what this
// component has always emitted, so the strips that do not opt in cannot drift; the
// wrapped pair is authored from scratch, so no unprefixed utility has to be beaten
// by its own `md:` twin through tailwind-merge. The only ordering this relies on is
// Tailwind's own: unprefixed utilities are emitted first, then `md:`, then
// `md:dark:` — so from 768px up the wrapped strip resolves to exactly the paint of
// the default one, in both themes.
const TABLIST_CLASSES =
  "flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 dark:border-slate-800";
const TABLIST_WRAP_CLASSES =
  "flex flex-wrap gap-1.5 md:flex-nowrap md:gap-1 md:overflow-x-auto md:overflow-y-hidden md:border-b md:border-slate-200 md:dark:border-slate-800";

const TAB_CLASSES =
  "whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none focus:ring-2 focus:ring-slate-300";
const TAB_ACTIVE_CLASSES = "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100";
const TAB_INACTIVE_CLASSES =
  "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200";

// Below `md`, a chip: `py-2` on `text-xs` is exactly 32px tall, and ten German
// report labels then land in three rows on a 406px screen (four at `text-sm`). The
// active fill is the app's own selected pair, `--brand` / `--brand-contrast`: the
// palette store writes both halves of it together for every preset and both themes,
// so the contrast holds everywhere (5.1:1 at its worst preset) without a hard-coded
// colour. Inactive chips take the raised card surface with full-strength body text —
// all ten have to stay readable; it is the FILL, not the text weight, that says
// which one is open.
const TAB_WRAP_CLASSES =
  "whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 md:rounded-none md:border-b-2 md:-mb-px md:bg-transparent md:px-3 md:py-2 md:text-sm";
const TAB_WRAP_ACTIVE_CLASSES =
  "bg-[var(--brand)] text-[var(--brand-contrast)] md:border-slate-900 md:text-slate-900 md:dark:border-slate-100 md:dark:text-slate-100";
const TAB_WRAP_INACTIVE_CLASSES =
  "bg-[var(--bg-surface)] text-[var(--text-primary)] md:border-transparent md:text-slate-500 md:hover:border-slate-300 md:hover:text-slate-700 md:dark:text-slate-400 md:dark:hover:text-slate-200";

export function Tabs<T extends string>({ tabs, active, onChange, className, wrap = false, label }: TabsProps<T>) {
  // Arrow keys walk the strip in DOM order (ARIA tabs pattern), which is what keeps
  // a WRAPPED strip navigable: the rows flow in DOM order too, so Right off the end
  // of row one lands on the first chip of row two rather than nowhere. Home/End jump
  // to the ends. Focus only — activation stays on click/Enter/Space, because a tab
  // here can be a real route and moving focus must not navigate.
  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0 && e.key !== "Home" && e.key !== "End") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    const from = items.indexOf(document.activeElement as HTMLElement);
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
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onListKeyDown}
      className={cn(wrap ? TABLIST_WRAP_CLASSES : TABLIST_CLASSES, className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        // Written once and worn by either tag below, so a routed tab and a
        // state-only tab stay indistinguishable to the eye and to a screen reader.
        const shared = {
          role: "tab" as const,
          "aria-selected": isActive,
          className: cn(
            wrap ? TAB_WRAP_CLASSES : TAB_CLASSES,
            wrap
              ? isActive
                ? TAB_WRAP_ACTIVE_CLASSES
                : TAB_WRAP_INACTIVE_CLASSES
              : isActive
                ? TAB_ACTIVE_CLASSES
                : TAB_INACTIVE_CLASSES,
          ),
        };
        const inner = (
          <span className="inline-flex items-center gap-1.5">
            {tab.label}
            {tab.badge != null ? tab.badge : null}
          </span>
        );
        return tab.href ? (
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
            onKeyDown={(e) => {
              if (e.key !== " ") return;
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
      })}
    </div>
  );
}
