import { createContext, forwardRef, useContext, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, Eye, EyeOff, Plus, X } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ChangeEvent, ComponentPropsWithoutRef, CSSProperties, InputHTMLAttributes, KeyboardEvent, MouseEvent, ReactElement, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { FOCUS_RING, FOCUS_RING_WIDTH } from "./focus-ring";
import { scrollIntoStrip, useStripFade } from "../lib/strip-fade";
import { horizontalStep } from "../lib/direction";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { useLargeText } from "../hooks/use-large-text";
import { Tooltip, type TooltipSide } from "./tooltip";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLink } from "../i18n/kit-labels";
import type { KitLinkComponent, KitLinkProps } from "../i18n/kit-labels";
import { pickLinkRenderer, replacingClick, routerLinkNavigation } from "./text-link";
import { useCommitReason } from "./write-lock";
import { mergeDescribedBy } from "./choice-parts";
import {
  CompactControlsContext,
  DisabledReasonLine,
  EndHintRow,
  FieldCaption,
  LockedReason,
  useDisabledReasonLine,
  type DisabledReasonDisplay,
  useFieldHint,
  useLockReason,
  FLOATING_LABEL_STATIC,
  STATIC_LABEL_TYPE,
  type FieldHintParts,
} from "./field-parts";

// The static label lives in field-parts since 0.23 (it is what the field anatomy
// there draws, and field-parts must not import this file); public from here as before.
export { FieldLabel, FLOATING_LABEL_STATIC, FieldHint } from "./field-parts";
export type { FieldLabelProps, FieldHintProps } from "./field-parts";

// The kit's focus frame (§5) lives in its own module so the parts ui.tsx itself imports
// (field-parts, the choice controls) can draw it too; public from here as before.
export { FOCUS_RING, FOCUS_RING_WIDTH } from "./focus-ring";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "brand" | "link";

// Shared base ring for every button-styled element. Kept as a named const so the
// <Button> component and the {@link buttonClasses} helper draw from one source and
// can never drift apart.
//
// The ring is the kit's focus frame (§5): {@link FOCUS_RING_WIDTH} wide, on keyboard focus
// (`focus-visible`) — a tap or a click no longer leaves a ring on the button — in each
// variant's own colour below.
const BUTTON_BASE = cn(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  FOCUS_RING_WIDTH,
);

/**
 * The touch target at Large and Extra large (docs/text-size-harmonization.md §4): at
 * least 48 px, the size a finger needs whatever the type. In px on purpose, like the
 * field floor ({@link FIELD_TOUCH_TEXT}): it is a physical threshold, not a size that
 * follows the text. Normal keeps the kit's own heights; a `large:` variant, so it costs
 * no render and is right on the first paint.
 */
export const TOUCH_TARGET_LARGE = "large:min-h-[48px] large:min-w-[48px]";

export type ButtonSize = "sm" | "md";

// Box geometry per size, split out of the base so the two cannot be merged into one
// string that a size then has to fight. `md` is the pre-0.8.0 look, unchanged. `sm` is
// the compact secondary action keksdose repeats by hand as `px-2 py-1 text-xs` (and
// `px-2 py-0.5 text-xs`) on the buttons in a toolbar or a table header; one rung is
// enough, so the two spellings meet at `py-1`. There is no `lg`: no app has asked for
// a bigger text button (IconButton's `lg` is a touch target, not a text size). The
// variant map comes AFTER the size, so `link`'s `p-0` still wins at either size.
//
// At Large and above (§4) `sm` grows to `md`'s height — the padding that makes its
// 1rem line as tall as `md`'s 1.25rem one — and both reach the 48 px touch target. The
// type stays `sm`'s: the compact button is still the quieter one. Not on `link`, which
// is a word in a sentence and has no box to grow (see `buttonLook`).
const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "gap-2 px-3 py-2 text-sm",
  sm: "gap-1.5 px-2 py-1 text-xs",
};
const BUTTON_SIZES_LARGE: Record<ButtonSize, string> = {
  md: "large:min-h-[48px]",
  sm: "large:min-h-[48px] large:py-2.5",
};

// Warm, palette-token-driven so buttons blend with the fields + cards in every theme.
// Actions default to a warm bordered look (primary = filled warm chip, secondary =
// outline); `brand` stays the solid accent for the rare strong CTA; `danger` takes the
// semantic `--danger` family (destructive semantics), so a consumer can re-point the
// destructive hue instead of inheriting a hard-coded red. Focus rings follow each
// variant's own accent: brand for the four neutral ones, danger for `danger`.
const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)] focus-visible:ring-[var(--brand)]",
  secondary:
    "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] focus-visible:ring-[var(--brand)]",
  ghost:
    "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] focus-visible:ring-[var(--brand)]",
  danger:
    "bg-[var(--danger)] text-[var(--danger-contrast)] hover:bg-[var(--danger-hover)] focus-visible:ring-[var(--danger-border-strong)]",
  brand:
    "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)] focus-visible:ring-[var(--brand)]",
  // A text link that is still a `<button>` — keksdose's six hand-rolled
  // `<button className="text-brand underline">` sites ("Resend code", "Show all",
  // "Undo" in a toast…), which act rather than navigate and so must not be anchors.
  // The box padding goes (`p-0`) so it sits in a sentence at the text's own size, but
  // the base's focus ring stays: those copies had `outline-none` and no ring, so
  // a keyboard user tabbing onto them saw nothing at all. `rounded-sm` keeps that
  // ring hugging the word instead of drawing a pill round it.
  link:
    "rounded-sm p-0 bg-transparent text-[var(--brand)] underline-offset-4 hover:underline focus-visible:ring-[var(--brand)]",
};

/**
 * The text colour of a `link` or `ghost` button, over the variant's own.
 *
 * `muted` is the QUIET link keksdose hand-rolls in six places (tours-page:321's "Mark
 * undone", transaction-fields:176/215's "Add line" / "Fill total",
 * invoice-lines-table:376, invoice-review:464): secondary text that darkens to the
 * body colour under the pointer, for an action that must be findable but not compete
 * with the brand-coloured one beside it. `danger` is the same quiet look turning
 * `--danger` on hover — transaction-editor:401's "Remove split", which is a text
 * action that destroys something.
 *
 * A `tone` rather than a `link-muted` variant, because it is the axis IconButton
 * already has (`tone="muted"`, `tone="danger"`, same quiet-until-hover meaning), and
 * because the same two looks are wanted on `ghost`.
 *
 * `danger` also reaches the two NEUTRAL boxed variants, where the box carries it:
 * `secondary` becomes an outlined destructive button (`--danger` text and a
 * `--danger-border` outline, the quiet danger fill on hover) and `primary` a soft one
 * (the quiet fill at rest, solid `--danger` on hover). kastlan's meeting-invitations-
 * tab.tsx "Remove all" is `variant="secondary" className="text-destructive"` — a
 * destructive action that must sit in a row of secondary buttons without shouting
 * like the solid `variant="danger"` would, and whose red text alone left the border
 * and hover saying "neutral". `muted` stays a text look and does nothing on a box, and
 * `danger`, `brand` and `link`'s own colours are left alone: a tone that recoloured a
 * solid danger or brand button would be a second variant under another name.
 */
export type ButtonTone = "default" | "muted" | "danger";

const BUTTON_TONES: Record<Exclude<ButtonTone, "default">, string> = {
  muted:
    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:hover:text-[var(--text-secondary)]",
  danger:
    "text-[var(--text-secondary)] hover:text-[var(--danger)] focus-visible:ring-[var(--danger-border-strong)] disabled:hover:text-[var(--text-secondary)]",
};

/** Only the two transparent variants take every tone; see {@link ButtonTone}. */
const TONED_VARIANTS = new Set<ButtonVariant>(["link", "ghost"]);

// `tone="danger"` on the neutral boxed variants — see {@link ButtonTone}. Each string
// restates every colour the variant sets (border, fill, text, hover, ring) so none of
// the neutral ones survives the merge.
const BUTTON_BOXED_DANGER: Partial<Record<ButtonVariant, string>> = {
  secondary:
    "border-[var(--danger-border)] bg-transparent text-[var(--danger)] hover:bg-[var(--danger-bg)] focus-visible:ring-[var(--danger-border-strong)]",
  primary:
    "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger)] hover:text-[var(--danger-contrast)] focus-visible:ring-[var(--danger-border-strong)] disabled:hover:border-[var(--danger-border)] disabled:hover:bg-[var(--danger-bg)] disabled:hover:text-[var(--danger)]",
};

// `pressed` on a `link`: the brand colour and a heavier weight, which is exactly what
// lenkbank's "All speeds" toggle paints by hand (gear/hysteresis-charts.tsx:482). After
// the tone, so a pressed muted link is brand, and an unpressed one is quiet grey.
const BUTTON_LINK_PRESSED =
  "font-medium text-[var(--brand)] hover:text-[var(--brand)] disabled:hover:text-[var(--brand)]";

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
  return cn(
    BUTTON_BASE,
    BUTTON_SIZES[size],
    variant !== "link" && BUTTON_SIZES_LARGE[size],
    buttonVariantClasses[variant],
    className,
  );
}

/**
 * ⚠️ No default `type`: like a native `<button>`, a `Button` inside a `<form>` SUBMITS
 * it unless you pass `type="button"`. Kept native on purpose — a form's own submit
 * button relies on it, and changing the default would silently stop those forms from
 * submitting. Pass `type="button"` for every other action in a form (keksdose had six
 * link buttons submitting their form).
 */
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
  /** Text colour for `link` and `ghost`: `muted` (quiet, body colour on hover) or
   *  `danger` (quiet, `--danger` on hover). `danger` also makes `secondary` an
   *  outlined destructive button and `primary` a soft one; ignored by the other
   *  variants. See {@link ButtonTone}. */
  tone?: ButtonTone;
  /**
   * Make it a toggle button, as {@link IconButton}'s `pressed` does. `true` sets
   * `aria-pressed="true"` and draws the "on" look — on a `link`, the brand colour and a
   * medium weight; on the boxed variants, the quiet brand fill IconButton uses — and
   * `false` sets `aria-pressed="false"` with the ordinary look. Left out, no
   * `aria-pressed` (or the caller's own). For lenkbank's "All speeds" text toggle
   * (gear/hysteresis-charts.tsx:482), which is a hand-rolled `<button aria-pressed>`
   * swapping two class strings; with `variant="link" tone="muted"` it is this.
   */
  pressed?: boolean;
  /**
   * Why the action is not available — the button's half of DangerConfirm's
   * `lockedReason` (kastlan handover-detail-page.tsx:197 locks a signed handover).
   *
   * A disabled button that cannot say why is a dead end: the native `disabled` takes it
   * out of the tab order, so a keyboard user never lands on it, and a pointer gets a
   * `not-allowed` cursor and nothing else. With a reason the button is `aria-disabled`
   * instead — still focusable, still hoverable — clicks (and the Enter/Space and form
   * submission they stand for) do nothing, and the reason is shown in the kit
   * {@link Tooltip} and attached with `aria-describedby`, so a screen reader hears it
   * on focus. It wins over `disabled`: passing both keeps the button reachable, which is
   * the point of giving a reason.
   *
   * The description is a `hidden` copy of the reason rather than the bubble itself: the
   * bubble exists only while hovered or focused once it is portalled, and a description
   * that comes and goes is read inconsistently. The bubble is kept visual, the way
   * DangerConfirm keeps its own.
   */
  disabledReason?: ReactNode;
  /**
   * Where `disabledReason` shows (0.32, §4 "No fact only in a tooltip"): by default a
   * line under the button at Large and on a touch screen, the tooltip otherwise. See
   * {@link DisabledReasonDisplay}.
   */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /**
   * This button COMMITS — it saves, creates, deletes. Under a locked
   * {@link WriteLockProvider} it is disabled the `disabledReason` way, with the lock's
   * reason (which wins over a `disabledReason` of its own). No provider, or an
   * unlocked one: no effect. See {@link WriteLockProvider}.
   */
  commit?: boolean;
  /**
   * Busy — the save is in flight: a spinner, `aria-busy`, and no second submit.
   *
   * kastlan's FormActions (form-actions.tsx:50) disables its submit and swaps in a
   * `submittingLabel`, so the button jumps width mid-click and a screen reader hears
   * the name change instead of "busy". Here the label STAYS — it is still the
   * accessible name and still holds the button's width — and the spinner is drawn over
   * it in the text colour, so nothing beside the button moves.
   *
   * The same prop {@link FileButton} has (`pending`), with one difference: this one is
   * `aria-disabled`, not `disabled`. The button being pressed is the one that has focus,
   * and a native `disabled` drops that focus to `<body>` the moment the save starts;
   * clicks, and the Enter that submits a form through it, are swallowed instead.
   */
  pending?: boolean;
  /** Only on the link form — see {@link ButtonLinkProps}. */
  href?: never;
  renderLink?: never;
  external?: never;
  replace?: never;
  reloadDocument?: never;
}

/**
 * `<Button href>`: a link that looks like a button — for an action that NAVIGATES.
 *
 * kastlan paints `buttonClasses(…)` onto router Links by hand in six places (the
 * invoice / lease / unit preview dialogs' "Open" at invoice-preview-dialog.tsx:36,
 * platform-companies-page.tsx:111, verify-email-page.tsx:86's "Log in",
 * billing-history-page.tsx:85's PDF download), and has 26 `<Button onClick={() =>
 * navigate(…)}>` that are links in all but markup: no middle-click, no "open in new
 * tab", no URL on hover, and a screen reader announces a button that then changes the
 * page. With `href` it is an `<a>`: the provider's router link
 * ({@link UiKitProvider}'s `linkComponent`), or `renderLink` if given, else a plain one.
 *
 * `type` and `form` are typed out: they are a `<button>`'s, and a link never submits.
 */
export interface ButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "type" | "href"> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  stretch?: boolean;
  tone?: ButtonTone;
  /** The in-app router link, over the provider's `linkComponent` (see
   *  {@link KitLinkComponent}). Ignored when `external`. */
  renderLink?: KitLinkComponent;
  /** Leaves the app: a plain `<a target="_blank" rel="noopener noreferrer">`, never the
   *  router link, and "(opens in a new tab)" read after the label — billing-history's
   *  Stripe PDF. A `target="_blank"` of your own is announced the same way. */
  external?: boolean;
  /**
   * Navigate by replacing the current history entry, so Back does not return here —
   * keksdose F1: the "Continue" out of a one-shot page (an emailed confirmation link, a
   * payment return URL) that must not be landed on again. Handed to the router link as
   * `replace` (see `KitLinkProps.replace` for mapping it); on a plain `<a>` a plain click
   * becomes `location.replace(href)`. Ignored when `external`.
   */
  replace?: boolean;
  /**
   * A plain `<a>` for an in-app `href`, so the browser loads the whole document instead
   * of the router swapping the view — keksdose F1: a route the SPA does not own (a
   * server-rendered export, a logout that must drop every in-memory cache). Wins over
   * `renderLink` and the provider's `linkComponent`.
   */
  reloadDocument?: boolean;
  /** A link cannot be `disabled`, so this renders an `<a>` with NO `href` —
   *  `role="link"` and `aria-disabled`, out of the tab order like a disabled button,
   *  with the disabled look. The router link is not used: it needs somewhere to go. */
  disabled?: boolean;
  ref?: Ref<HTMLAnchorElement>;
  type?: never;
  form?: never;
  pending?: never;
  pressed?: never;
  disabledReason?: never;
  disabledReasonDisplay?: never;
  commit?: never;
}

function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

// No fact only in a tooltip (§4): the reason line and the compact region live in
// field-parts, where the self-saving controls (Switch, Checkbox) reach them too.
export {
  CompactControls,
  DisabledReasonLine,
  DISABLED_REASON_LINE_CLASS,
  useDisabledReasonLine,
} from "./field-parts";
export type { DisabledReasonDisplay } from "./field-parts";

/** The button look shared by the `<button>` and the `<a>` form. */
function buttonLook(variant: ButtonVariant, size: ButtonSize, stretch: boolean | undefined, tone: ButtonTone) {
  return cn(
    BUTTON_BASE,
    BUTTON_SIZES[size],
    // §4: `sm` at `md`'s height and the 48 px target at Large — not on a `link`. In the
    // order `buttonClasses` has it, so the two strings stay identical.
    variant !== "link" && BUTTON_SIZES_LARGE[size],
    // In a flex row next to a taller labelled field, `stretch` makes the button
    // fill the field's height so the two line up (self-stretch overrides the row's
    // align-items). No effect outside a flex row / when it's already the tallest.
    stretch && "self-stretch",
    buttonVariantClasses[variant],
    tone !== "default" && TONED_VARIANTS.has(variant) && BUTTON_TONES[tone],
    tone === "danger" && BUTTON_BOXED_DANGER[variant],
  );
}

// Declared link-first so `<Button href>` picks the link props; the LAST signature is
// what `ComponentProps<typeof Button>` reads, so wrappers (FileButton) still see the
// `<button>` props they always did.
export function Button(props: ButtonLinkProps): ReactElement;
export function Button(props: ButtonProps): ReactElement;
export function Button(props: ButtonProps | ButtonLinkProps): ReactElement {
  if (props.href !== undefined) return <ButtonLink {...(props as ButtonLinkProps)} />;
  return <ButtonElement {...(props as ButtonProps)} />;
}

/** Calls a `renderLink` / provider link as a function, as ListItem and Chip do — an
 *  inline `renderLink` arrow would otherwise be a new component type every render. */
function RenderedButtonLink({ render, ...props }: KitLinkProps & { render: KitLinkComponent }) {
  return render(props);
}

function ButtonLink({
  href,
  renderLink,
  external,
  replace,
  reloadDocument,
  disabled,
  variant = "primary",
  size = "md",
  stretch,
  tone = "default",
  className,
  children,
  target,
  rel,
  onClick,
  ...rest
}: ButtonLinkProps) {
  const kitLink = useKitLink();
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  // The same rule as every kit link (`pickLinkRenderer`): an external `href` or an
  // in-page `#anchor` is never handed to the provider's router link, even without
  // `external`.
  // `reloadDocument` is the caller saying "not the router" for this one link.
  const Link = reloadDocument ? undefined : pickLinkRenderer<KitLinkProps>(renderLink, kitLink, href);
  const newTab = !disabled && (external || target === "_blank");
  const cls = cn(
    buttonLook(variant, size, stretch, tone),
    // `relative` holds the sr-only note (see sr-only-containment.test).
    newTab && "relative",
    // BUTTON_BASE's `disabled:` classes never match an `<a>`; no pointer events also
    // keeps the hover fill from lighting up on something that refuses the click.
    disabled && "pointer-events-none cursor-not-allowed opacity-50",
    className,
  );
  const body = (
    <>
      {children}
      {/* The space OUTSIDE the sr-only span: a name computation trims each child's
          text, so one inside it was lost ("Download(opens…"). In a flex box a bare
          space draws nothing. */}
      {newTab && " "}
      {newTab && <span className="sr-only">({common.opensInNewTab})</span>}
    </>
  );
  if (disabled) {
    return (
      <a {...rest} role="link" aria-disabled="true" className={cls}>
        {body}
      </a>
    );
  }
  if (external || !Link) {
    return (
      <a
        {...rest}
        href={href}
        target={external ? "_blank" : target}
        rel={external ? (rel ?? "noopener noreferrer") : rel}
        onClick={external ? onClick : replacingClick(onClick, href, replace, target)}
        className={cls}
      >
        {body}
      </a>
    );
  }
  return (
    <RenderedButtonLink
      render={Link}
      {...rest}
      {...routerLinkNavigation(replace)}
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      className={cls}
    >
      {body}
    </RenderedButtonLink>
  );
}

function ButtonElement({
  variant = "primary",
  size = "md",
  stretch,
  tone = "default",
  pressed,
  disabledReason: ownDisabledReason,
  disabledReasonDisplay,
  commit,
  pending,
  className,
  onClick,
  children,
  href: _href,
  renderLink: _renderLink,
  external: _external,
  replace: _replace,
  reloadDocument: _reloadDocument,
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  const locked = hasContent(disabledReason);
  const inert = locked || Boolean(pending);
  const ownDescribedBy = rest["aria-describedby"];
  const button = (
    <button
      {...rest}
      disabled={inert ? undefined : rest.disabled}
      aria-disabled={inert || rest["aria-disabled"]}
      aria-busy={pending || rest["aria-busy"]}
      aria-describedby={locked ? (ownDescribedBy ? `${ownDescribedBy} ${reasonId}` : reasonId) : ownDescribedBy}
      aria-pressed={pressed ?? rest["aria-pressed"]}
      onClick={(e) => {
        // `preventDefault` as well as not calling through: a locked submit button must
        // not submit its form, and the browser does that after this handler returns.
        if (inert) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      className={cn(
        buttonLook(variant, size, stretch, tone),
        pressed && (variant === "link" ? BUTTON_LINK_PRESSED : ICON_BUTTON_PRESSED),
        // The disabled look for the focusable kind of disabled.
        locked && "cursor-not-allowed opacity-50",
        // No dimming while pending: the spinner IS the state, and at half opacity it
        // would be the faintest thing on the button. `relative` anchors it.
        pending && "relative cursor-progress",
        className,
      )}
    >
      {pending ? (
        <>
          {/* Transparent, not hidden: it keeps the width AND stays the accessible
              name (`visibility: hidden` would drop it from the name). `gap-[inherit]`
              keeps an icon + text spaced as the button spaces them. */}
          <span className="inline-flex items-center justify-center gap-[inherit] opacity-0">{children}</span>
          {/* Decorative: `aria-busy` says it, as on FileButton. */}
          <Spinner
            label={null}
            className="absolute inset-0 m-auto size-4 border-current/30 border-t-current"
          />
        </>
      ) : (
        children
      )}
    </button>
  );
  if (!locked) return button;
  return (
    <ReasonFrame
      reason={disabledReason}
      reasonId={reasonId}
      display={disabledReasonDisplay}
      className={stretch ? "self-stretch" : undefined}
    >
      {button}
    </ReasonFrame>
  );
}

/**
 * A locked control and its reason: the line under it, or the kit {@link Tooltip} with a
 * hidden copy for `aria-describedby` — see {@link DisabledReasonDisplay}. A component of
 * its own so only a LOCKED control asks the text size and the pointer; the hundreds of
 * unlocked buttons on a page subscribe to nothing.
 *
 * Tooltip form: the control in a FRAGMENT so Tooltip does not clone its bubble into the
 * description as well — the hidden copy already describes it, and the same sentence
 * twice would be read on every focus. Line form: the line is the description, and no
 * bubble repeats what is on screen. Either way `className` (the control's `stretch`)
 * moves to the wrapper, which is now the flex item.
 */
function ReasonFrame({
  reason,
  reasonId,
  display,
  className,
  side,
  portal,
  children,
}: {
  reason: ReactNode;
  reasonId: string;
  display: DisabledReasonDisplay | undefined;
  className?: string;
  side?: TooltipSide;
  portal?: boolean;
  children: ReactNode;
}) {
  const line = useDisabledReasonLine(display);
  if (line) {
    return (
      <DisabledReasonLine id={reasonId} reason={reason} className={className}>
        {children}
      </DisabledReasonLine>
    );
  }
  return (
    <Tooltip label={reason} side={side} portal={portal} className={className}>
      <>
        {children}
        <span id={reasonId} hidden>
          {reason}
        </span>
      </>
    </Tooltip>
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
const ICON_BUTTON_BASE = cn(
  "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  FOCUS_RING_WIDTH,
);

export type IconButtonSize = "2xl" | "xl" | "lg" | "md" | "sm" | "xs" | "2xs";

// Box and glyph together, so a 24px chip action cannot end up holding a 20px icon
// that touches its edges. The two small steps are lenkbank's list-row (28px) and
// chip (24px) actions, which it had hand-rolled beside the kit's 32/36px ones.
const ICON_BUTTON_SIZES: Record<IconButtonSize, string> = {
  // 64px with a 28px glyph: a camera's shutter (keksdose invoices/camera-capture.tsx:248,
  // `size-16` by hand) — the one control of a full-screen capture view, thumb-sized.
  "2xl": "size-16 [&_svg]:size-7",
  // 48px with a 24px glyph: the one primary action of a phone screen or sheet, a step
  // past the 44px minimum rather than on it.
  xl: "size-12 [&_svg]:size-6",
  // The 44px touch target (WCAG 2.5.5's size) with the same 20px glyph — keksdose's
  // bulk-action bars write `size-11` by hand over an `md` button to get it on phones.
  lg: "size-11 [&_svg]:size-5",
  md: "size-9 [&_svg]:size-5",
  sm: "size-8 [&_svg]:size-5",
  xs: "size-7 rounded [&_svg]:size-4",
  "2xs": "size-6 rounded [&_svg]:size-3.5",
};

// `stretch`: the same WIDTH and glyph, and a height taken from the row instead of
// stated — `size-*` sets a height that `self-stretch` cannot override, so the box is
// written as a width plus a minimum height (the square it would otherwise be).
const ICON_BUTTON_STRETCH_SIZES: Record<IconButtonSize, string> = {
  "2xl": "w-16 min-h-16 self-stretch [&_svg]:size-7",
  xl: "w-12 min-h-12 self-stretch [&_svg]:size-6",
  lg: "w-11 min-h-11 self-stretch [&_svg]:size-5",
  md: "w-9 min-h-9 self-stretch [&_svg]:size-5",
  sm: "w-8 min-h-8 self-stretch [&_svg]:size-5",
  xs: "w-7 min-h-7 self-stretch rounded [&_svg]:size-4",
  "2xs": "w-6 min-h-6 self-stretch rounded [&_svg]:size-3.5",
};

// The label as visible text beside the glyph (0.32, §4: at Large "IconButton shows its
// label"): the same height and glyph as the square, a width taken from the words. A
// map of its own rather than `w-auto` over `size-*`, which tailwind-merge cannot undo
// in one direction.
const ICON_BUTTON_TEXT_SIZES: Record<IconButtonSize, string> = {
  "2xl": "h-16 gap-2 px-4 text-base [&_svg]:size-7",
  xl: "h-12 gap-2 px-3.5 text-sm [&_svg]:size-6",
  lg: "h-11 gap-2 px-3 text-sm [&_svg]:size-5",
  md: "h-9 gap-1.5 px-2.5 text-sm [&_svg]:size-5",
  sm: "h-8 gap-1.5 px-2 text-sm [&_svg]:size-5",
  xs: "h-7 gap-1 rounded px-1.5 text-xs [&_svg]:size-4",
  "2xs": "h-6 gap-1 rounded px-1.5 text-xs [&_svg]:size-3.5",
};
const ICON_BUTTON_TEXT_STRETCH_SIZES: Record<IconButtonSize, string> = {
  "2xl": "min-h-16 self-stretch gap-2 px-4 text-base [&_svg]:size-7",
  xl: "min-h-12 self-stretch gap-2 px-3.5 text-sm [&_svg]:size-6",
  lg: "min-h-11 self-stretch gap-2 px-3 text-sm [&_svg]:size-5",
  md: "min-h-9 self-stretch gap-1.5 px-2.5 text-sm [&_svg]:size-5",
  sm: "min-h-8 self-stretch gap-1.5 px-2 text-sm [&_svg]:size-5",
  xs: "min-h-7 self-stretch gap-1 rounded px-1.5 text-xs [&_svg]:size-4",
  "2xs": "min-h-6 self-stretch gap-1 rounded px-1.5 text-xs [&_svg]:size-3.5",
};

// The 48 px touch target at Large (§4), per size. `lg` and up are past it already
// (2.75rem is 55 px at Large). `md` … `xs` grow their box to it. `2xs` is the action ON
// a chip or a tab, whose box cannot grow without growing the chip: it keeps its box and
// gets a 48 px hit area instead — an invisible `::after` centred on it, which takes the
// taps a finger lands round the glyph.
const ICON_BUTTON_TOUCH_LARGE: Record<IconButtonSize, string> = {
  "2xl": "",
  xl: "",
  lg: "",
  md: TOUCH_TARGET_LARGE,
  sm: TOUCH_TARGET_LARGE,
  xs: TOUCH_TARGET_LARGE,
  "2xs":
    "relative large:after:absolute large:after:inset-[calc((100%-48px)/2)] large:after:content-['']",
};

// A tone re-colours the glyph without changing what the variant draws around it.
// Each coloured tone comes in two resting looks, picked by `quiet` (see the prop):
// QUIET is placeholder grey until the pointer or focus arrives, then the tone's
// family; TONED wears the tone's colour at rest. The defaults are the looks each tone
// had before `quiet` existed: `danger` is quiet — an action in every row of a list
// must not shout from every row, so the red arrives only on the one row you are about
// to act on — while `warning` and `info` are toned, because they mark the ONE thing
// on the row to notice (keksdose's "needs review" flag, its reconcile action at
// accounts-page:867), and quiet grey would hide the very thing they point out.
// `muted` is quiet by definition and has no toned look; `default` has no tone.
//
// `success` is toned at rest too: the green is the news (keksdose's "in sync" chip).
// `custom` paints from `--icon-button-tone`, which `toneColor` sets — for a glyph whose
// colour FOLLOWS STATE across tones (keksdose's sync chip: rose, amber, sky, green as
// the sync moves), where swapping `tone` would do but the colour is one variable.
export type IconButtonTone = "default" | "muted" | "danger" | "warning" | "info" | "success" | "custom";

type ColouredTone = "danger" | "warning" | "info" | "success" | "custom";

const ICON_BUTTON_TONES: Record<ColouredTone, { quiet: string; toned: string }> = {
  danger: {
    quiet:
      "text-[var(--text-placeholder)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] focus-visible:ring-[var(--danger-border-strong)]",
    toned: "text-[var(--danger)] hover:bg-[var(--danger-bg)] focus-visible:ring-[var(--danger-border-strong)]",
  },
  warning: {
    quiet:
      "text-[var(--text-placeholder)] hover:bg-[var(--warning-bg)] hover:text-[var(--warning)] focus-visible:ring-[var(--warning-border)]",
    toned: "text-[var(--warning)] hover:bg-[var(--warning-bg)] focus-visible:ring-[var(--warning-border)]",
  },
  info: {
    quiet:
      "text-[var(--text-placeholder)] hover:bg-[var(--info-bg)] hover:text-[var(--info)] focus-visible:ring-[var(--info-border)]",
    toned: "text-[var(--info)] hover:bg-[var(--info-bg)] focus-visible:ring-[var(--info-border)]",
  },
  success: {
    quiet:
      "text-[var(--text-placeholder)] hover:bg-[var(--success-bg)] hover:text-[var(--success)] focus-visible:ring-[var(--success-border)]",
    toned: "text-[var(--success)] hover:bg-[var(--success-bg)] focus-visible:ring-[var(--success-border)]",
  },
  // The hover fill and the ring are MIXED from the one colour, since a custom tone
  // brings no `-bg` / `-border` pair of its own. The fallback is the body colour, so a
  // `custom` tone with no colour set is the default look rather than invisible.
  custom: {
    quiet:
      "text-[var(--text-placeholder)] hover:bg-[color-mix(in_srgb,var(--icon-button-tone,var(--text-primary))_12%,transparent)] hover:text-[var(--icon-button-tone,var(--text-primary))] focus-visible:ring-[color-mix(in_srgb,var(--icon-button-tone,var(--text-primary))_40%,transparent)]",
    toned:
      "text-[var(--icon-button-tone,var(--text-primary))] hover:bg-[color-mix(in_srgb,var(--icon-button-tone,var(--text-primary))_12%,transparent)] focus-visible:ring-[color-mix(in_srgb,var(--icon-button-tone,var(--text-primary))_40%,transparent)]",
  },
};

const ICON_BUTTON_MUTED =
  "text-[var(--text-placeholder)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]";

/** Which tones sit quiet at rest when `quiet` is left out. */
const QUIET_BY_DEFAULT: Record<ColouredTone, boolean> = {
  danger: true,
  warning: false,
  info: false,
  success: false,
  custom: false,
};

function iconButtonToneClass(tone: IconButtonTone, quiet: boolean | undefined): string {
  if (tone === "default") return "";
  if (tone === "muted") return cn(ICON_BUTTON_MUTED, ICON_BUTTON_QUIET_DISABLED_REST);
  const isQuiet = quiet ?? QUIET_BY_DEFAULT[tone];
  const look = ICON_BUTTON_TONES[tone];
  return isQuiet ? cn(look.quiet, ICON_BUTTON_QUIET_DISABLED_REST) : look.toned;
}

// A disabled button must not answer the pointer. The hover classes above are plain
// `hover:` (so a caller's `className="hover:…"` still replaces them through
// tailwind-merge), which means they fire on a disabled button too — the old grey
// icon lit up on hover while refusing the click. Rather than rewrite every hover as
// `enabled:hover:` (which never matches the `<a>` that `buttonClasses` also styles,
// and would out-rank a caller's plain `hover:` override), each variant pins its
// RESTING look under `disabled:hover:`, which out-ranks any `hover:` by specificity
// and only ever matches a disabled button.
const ICON_BUTTON_DISABLED_REST: Record<IconButtonVariant, string> = {
  primary: "disabled:hover:bg-[var(--bg-surface-2)]",
  secondary: "disabled:hover:bg-transparent",
  ghost: "disabled:hover:bg-transparent",
  danger: "disabled:hover:bg-[var(--danger)]",
  brand: "disabled:hover:bg-[var(--brand)]",
  link: "disabled:hover:bg-transparent disabled:hover:no-underline",
  overlay: "disabled:hover:bg-[color-mix(in_srgb,var(--bg-inverse)_60%,transparent)]",
  shutter: "disabled:hover:bg-[var(--media-scrim)]",
};

// The quiet looks change the glyph on hover, so they pin their resting glyph the
// same way. A toned look keeps its glyph on hover and needs no pin.
const ICON_BUTTON_QUIET_DISABLED_REST = "disabled:hover:text-[var(--text-placeholder)]";

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
  "rounded-full bg-[color-mix(in_srgb,var(--bg-inverse)_60%,transparent)] text-[var(--text-inverse)] backdrop-blur-sm hover:bg-[color-mix(in_srgb,var(--bg-inverse)_75%,transparent)] focus-visible:ring-[var(--text-inverse)]";

// `variant="shutter"`: the camera's release — keksdose's camera-capture.tsx:248 draws
// it by hand as a 64px circle with a thick white ring round a translucent fill. It sits
// on a live camera picture, which is dark whatever the theme, so it uses the MEDIA
// tokens (tokens.css), white ink on a dark scrim in both themes — the inverse pair
// `overlay` uses would give a dark ring on a dark viewfinder in dark mode. The focus ring stands off by 2px, or it would
// merge into the ring that is part of the look.
const ICON_BUTTON_SHUTTER =
  "rounded-full border-4 border-[var(--media-ink)] bg-[var(--media-scrim)] text-[var(--media-ink)] backdrop-blur-sm hover:bg-[var(--media-scrim-hover)] focus-visible:ring-[var(--media-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--media-scrim-hover)]";

export type IconButtonVariant = ButtonVariant | "overlay" | "shutter";

/**
 * The glyph's size in px, over the one the box size implies — see
 * {@link IconButtonProps.glyphSize}.
 */
export type IconButtonGlyphSize = 12 | 14 | 16 | 20 | 24 | 28;

const ICON_BUTTON_GLYPH_SIZES: Record<IconButtonGlyphSize, string> = {
  12: "[&_svg]:size-3",
  14: "[&_svg]:size-3.5",
  16: "[&_svg]:size-4",
  20: "[&_svg]:size-5",
  24: "[&_svg]:size-6",
  28: "[&_svg]:size-7",
};

// `pending`'s spinner, the size of the glyph it replaces (the `[&_svg]` rules above
// size only an svg, and the spinner is a bordered span).
const ICON_BUTTON_SPINNER: Record<IconButtonSize, string> = {
  "2xl": "size-7",
  xl: "size-6",
  lg: "size-5",
  md: "size-5",
  sm: "size-5",
  xs: "size-4",
  "2xs": "size-3.5",
};
const ICON_BUTTON_SPINNER_GLYPH: Record<IconButtonGlyphSize, string> = {
  12: "size-3",
  14: "size-3.5",
  16: "size-4",
  20: "size-5",
  24: "size-6",
  28: "size-7",
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Any {@link ButtonVariant}; `overlay` — a round translucent disc for use over
   *  an image (see `ICON_BUTTON_OVERLAY`); or `shutter` — a camera's release, a ringed
   *  disc over the viewfinder (see `ICON_BUTTON_SHUTTER`; pair it with `size="2xl"`). */
  variant?: IconButtonVariant;
  /** Box size: 2xl = 64px with a 28px icon (a camera shutter), xl = 48px with a 24px
   *  icon, lg = 44px (a phone's touch target), md = 36px (matches the top bar),
   *  sm = 32px — all three with a 20px icon;
   *  xs = 28px with a 16px icon (an action in a list row), 2xs = 24px with a 14px
   *  icon (an action on a chip or a tab). `glyphSize` overrides the icon. */
  size?: IconButtonSize;
  /**
   * The icon's size in px, when the box's own is not the one wanted. keksdose's sync
   * chip (app/sync-status-indicator.tsx:142) is a 24px round chip round a 20px cloud —
   * `size="2xs" glyphSize={20} shape="round"` — where `2xs` alone draws 14px. A number
   * over a new size step because the box and the glyph are two independent choices; a
   * step per combination (`"sm-lg"`) would have to be named for every one.
   */
  glyphSize?: IconButtonGlyphSize;
  /**
   * A small mark on the button's corner — the sync chip's 12px check over its cloud
   * ("all good", feedback #67). Rendered OUTSIDE the `<button>`, in a wrapper beside
   * it, so the box's `[&_svg]:size-*` rule that sizes the glyph does not blow the badge
   * up to the glyph's size; a bare `<Check />` comes out 12px, on a
   * `--bg-surface` disc that keeps it legible over the glyph. Decorative
   * (`aria-hidden`): the name (`label` / `aria-label`) must already carry the state.
   * With a badge, `className` still lands on the button; the wrapper is the flex item.
   */
  badge?: ReactNode;
  /**
   * `keep`: a disabled button keeps its full colour (no 50% drop) and an ordinary
   * cursor. For a STATUS that is also an action — the sync chip shows "in sync" in
   * green and refreshes on click, and is disabled while offline or syncing, when the
   * state it shows matters most; dimmed it read as broken (keksdose wrote
   * `disabled:cursor-default` by hand and left out the dimming). Default `dim`.
   */
  disabledStyle?: "dim" | "keep";
  /**
   * Fill the height of the flex row it stands in, keeping its width — the delete at
   * the end of keksdose's split line (transaction-fields:162), level with the labelled
   * fields beside it rather than floating at half their height. {@link Button}'s
   * `stretch`; no effect outside a flex row. With a `label`, the tooltip's wrapper is
   * what stretches.
   */
  stretch?: boolean;
  /** `round`: a circle instead of the rounded square — a compact status chip in a top
   *  bar (keksdose's sync indicator). `overlay` is always round. */
  shape?: "square" | "round";
  /**
   * The colour of `tone="custom"`, as any CSS colour — a token (`var(--warning)`),
   * ideally. Sets `--icon-button-tone` on the button, so passing a different one per
   * state re-colours the glyph, its hover fill and its focus ring together. Passing it
   * implies `tone="custom"`. Or leave it out and set the variable yourself from a class
   * (`className="[--icon-button-tone:var(--success)]"`).
   *
   * Or a `{ light, dark }` pair, one colour per theme — keksdose: a raw colour that reads
   * on the light surface (`#be123c`) is too dark on the dark one, and an inline style
   * cannot say "in dark mode". See {@link IconButtonToneColor}.
   */
  toneColor?: IconButtonToneColor;
  /** Glyph colour over the variant. `muted`: placeholder grey, full text colour on
   *  hover. `danger`: the same grey at rest, `--danger` on hover and focus — for a
   *  remove/delete that repeats down a list. `warning`: amber at rest — a flag that
   *  wants attention. `info`: sky at rest — a notice-worthy but harmless action
   *  (keksdose's reconcile). `success`: green at rest — a good state worth seeing.
   *  `custom`: the colour of `toneColor` (see there). Default: the variant's own colours. See `quiet` for
   *  turning a coloured tone's resting look the other way. */
  tone?: IconButtonTone;
  /**
   * Whether a coloured tone (`danger`, `warning`, `info`) waits for the pointer:
   * `true` is placeholder grey at rest and the tone's colour on hover and focus;
   * `false` wears the tone's colour at rest. Left out, each tone keeps its own
   * default — `danger` quiet, `warning` and `info` not. Ignored for `muted` (quiet by
   * definition) and `default` (no tone).
   *
   * `quiet={false}` on `danger` is for a destructive action that stands ALONE, where
   * hover-to-reveal hides it: keksdose's phone bulk bar (mobile-bulk-bar.tsx) has one
   * "delete all" and a touch screen that never hovers, so it painted rose by hand.
   * `quiet` on `warning`/`info` is the same switch the other way, for a flag repeated
   * down a list. A boolean over the tone rather than a new tone (`danger-solid`) or an
   * `emphasis` scale: there are exactly two resting looks, every coloured tone has
   * both, and which one fits is a question about the SITE (alone or repeated, touch or
   * pointer), not about the tone — so it is one switch the family shares.
   */
  quiet?: boolean;
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
  /**
   * The button's name, said once: it becomes the `aria-label` AND the text of a kit
   * {@link Tooltip} round the button.
   *
   * Every app writes the pair by hand. lenkbank's nine icon actions all carry
   * `aria-label={t(x)} title={t(x)}` (shared/lib/table-columns.tsx:103,
   * projects-page.tsx:83, setpoint/segment-list.tsx:198/207, profile-bar.tsx:128/142,
   * shortcut-dialog.tsx:815/857/1007) — and `title` is the browser's own tooltip,
   * which shows late, never on focus and never on touch, and looks like no other
   * label in the kit. kastlan's RowAction (shared/components/data-table/row-action.tsx)
   * and keksdose's icon wrappers each exist to put a Tooltip round an IconButton.
   *
   * A caller's own `aria-label` still wins, for the rare name that should be longer
   * than the bubble. The bubble is visual only: it would otherwise describe the button
   * with its own name, and a screen reader would read the same word twice. Tooltip's
   * default placement applies — in place, or portalled inside a scroll container —
   * unless `tooltipPortal` says otherwise.
   */
  label?: string;
  /**
   * Show `label` as visible text beside the icon at Large and Extra large (0.32,
   * docs/text-size-harmonization.md §4, §10.8). A reader who asked for bigger type is
   * the one an unlabelled glyph fails, and on touch the tooltip never opens. Then there
   * is no tooltip: the words are on the button.
   *
   * Default `true` — except for `variant="overlay"` and `"shutter"`, which sit ON a
   * picture, and inside {@link CompactControls} (AppShell's top bar, `RowActions`'
   * inline icons). `false`: the icon alone at every size, for an icon on content — a
   * receipt overlay, a map's zoom, a viewfinder, a photo thumbnail. That must be rare;
   * a dense row's actions belong in `RowActions`, which collapses them into a "⋯" menu
   * at Large instead (§10.8). Normal never shows it. `tooltip={false}` (a universally
   * read glyph, a dialog's ✕) keeps the icon alone too.
   */
  labelVisible?: boolean;
  /** Show `label` as a tooltip. Default `true`; `false` keeps `label` as the
   *  accessible name only — for a button whose glyph is universally read (a close ✕ in
   *  a dialog header) or that already sits under a tooltip of its own. It also keeps the
   *  label from showing as text at Large (see `labelVisible`). */
  tooltip?: boolean;
  /** Where the `label` tooltip opens. See {@link Tooltip}'s `side`. */
  tooltipSide?: TooltipSide;
  /** Passed to the `label` tooltip's `portal`. Left out, Tooltip decides (see there). */
  tooltipPortal?: boolean;
  /**
   * Mount the `label` bubble only while it is up — {@link Tooltip}'s `lazy`. Default
   * `true` since 0.16.0; `false` is the always-mounted in-place bubble of before.
   *
   * Why the label bubble can be lazy when Tooltip's default is not: this bubble
   * describes nothing. It is wrapped round the button in a fragment precisely so that
   * it is NOT the button's `aria-describedby` (it would repeat the button's own name),
   * so there is no description for a lazy mount to take away — the name is the
   * `aria-label` either way, read in browse mode and on focus alike. What the
   * always-mounted bubble did do was sit in the DOM as a `role="tooltip"` node full of
   * text: every IconButton in a row added one to `getAllByRole("tooltip")` and its label
   * to the row's `textContent`, and two keksdose tests tripped over that (0.15.5 P6).
   * The cost is the one {@link Tooltip}'s "Lazy in place" note names — a test that
   * looked the bubble up without hovering now has to hover (or focus) first; pass
   * `false` while it is migrated. A `disabledReason` bubble is unaffected: that one
   * stays mounted as it was.
   */
  tooltipLazy?: boolean;
  /**
   * Busy — the action is in flight: the glyph is swapped for a spinner of the same
   * size, the button is `aria-busy`, and clicks (and the Enter/Space and form
   * submission they stand for) are swallowed, so a second press cannot start the
   * action twice. {@link Button}'s `pending`, with the same contract: `aria-disabled`
   * rather than `disabled`, so the button that was pressed keeps its focus. The name
   * (`label` / `aria-label`) stays — `aria-busy` is what says it is working. A SWAP
   * rather than Button's overlay: the box is square and fixed, so there is no width
   * for the glyph to hold, and a spinner drawn over a glyph would be two marks in one
   * 20px square.
   */
  pending?: boolean;
  /**
   * Why the action is not available — {@link Button}'s `disabledReason`, on the icon
   * button: keksdose's accounts page cannot hide an account with a balance or delete
   * one with bookings (accounts-page:879/913 — "hide requires zero", "delete blocked"),
   * nor its budgets page delete the only budget (budgets-page:330), and each wrapped a
   * natively disabled IconButton in a Tooltip that swaps its label for the reason — a
   * bubble a keyboard never opens, since `disabled` leaves the tab order, and a reason
   * a screen reader never hears.
   *
   * The same contract as Button's: `aria-disabled` instead of `disabled`, so it stays
   * focusable and hoverable; clicks (and the Enter/Space they stand for) are swallowed
   * — `stopPropagation` still applies, so a locked action in a clickable row does not
   * open the row either; the reason shows in the kit {@link Tooltip} and is attached
   * through `aria-describedby` as a `hidden` copy. The NAME stays `aria-label` /
   * `label` — "Delete", described by "The active budget cannot be deleted" — and the
   * bubble shows the reason in place of the label, since the glyph already says what
   * the button is and the reason is the news. Shown even with `tooltip={false}`: a
   * reason nobody can see is not one. Wins over `disabled`, as on Button.
   *
   * 0.32: at Large and on a touch screen the reason is a line under the button rather
   * than a bubble — see `disabledReasonDisplay`.
   */
  disabledReason?: ReactNode;
  /** Where `disabledReason` shows — {@link Button}'s `disabledReasonDisplay`. */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /** This action COMMITS — {@link Button}'s `commit`: under a locked
   *  {@link WriteLockProvider} it takes the `disabledReason` path with the lock's
   *  reason. No effect without a lock. */
  commit?: boolean;
  /** The `<button>` element — a prop in React 19, as on {@link Button}. */
  ref?: Ref<HTMLButtonElement>;
  /** Only on the link form — see {@link IconButtonLinkProps}. */
  href?: never;
  renderLink?: never;
  external?: never;
  replace?: never;
  reloadDocument?: never;
}

/**
 * `<IconButton href>`: an icon-only LINK — keksdose F2 and kastlan 45, whose icon
 * actions that navigate (a row's "open", a card's "edit" that goes to the edit page, a
 * top bar's settings cog) were `<IconButton onClick={() => navigate(…)}>`: a button that
 * changes the page, with no middle click, no "open in new tab" and no URL on hover.
 *
 * The same rule as {@link Button}'s `href` (see {@link ButtonLinkProps}): an in-app
 * `href` goes through `renderLink`, else the provider's `linkComponent`; an external one
 * or an in-page `#anchor` stays a plain `<a>`; `external` opens a new tab and says so to
 * a screen reader; `replace` and `reloadDocument` as on Button. The look, the `label` →
 * `aria-label` + Tooltip, the badge, `toneColor` and `stopPropagation` are the button's.
 *
 * `disabled` renders an inert `<a>` with no `href` — `role="link"`, `aria-disabled`, out
 * of the tab order, dimmed — like Button's disabled link. `pressed`, `disabledReason` and
 * `disabledStyle` are a button's and are typed out: a link is not a toggle, and a link
 * that explains why it cannot be followed is a job for a disabled BUTTON.
 */
export interface IconButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "type" | "href">,
    Pick<
      IconButtonProps,
      | "variant"
      | "size"
      | "glyphSize"
      | "badge"
      | "stretch"
      | "shape"
      | "toneColor"
      | "tone"
      | "quiet"
      | "stopPropagation"
      | "label"
      | "labelVisible"
      | "tooltip"
      | "tooltipSide"
      | "tooltipPortal"
      | "tooltipLazy"
    > {
  href: string;
  /** See {@link ButtonLinkProps.renderLink}. */
  renderLink?: KitLinkComponent;
  /** See {@link ButtonLinkProps.external}. */
  external?: boolean;
  /** See {@link ButtonLinkProps.replace}. */
  replace?: boolean;
  /** See {@link ButtonLinkProps.reloadDocument}. */
  reloadDocument?: boolean;
  /** See {@link ButtonLinkProps.disabled}. */
  disabled?: boolean;
  ref?: Ref<HTMLAnchorElement>;
  type?: never;
  form?: never;
  pressed?: never;
  disabledReason?: never;
  disabledReasonDisplay?: never;
  commit?: never;
  disabledStyle?: never;
  pending?: never;
}

/**
 * Whether an IconButton draws its `label` as text (see `labelVisible`): at Large and
 * above, with a label to draw, not switched off by the caller, the variant (`overlay`,
 * `shutter`), `tooltip={false}` or a {@link CompactControls} region.
 */
function useIconButtonText(
  label: string | undefined,
  labelVisible: boolean | undefined,
  variant: IconButtonVariant,
  tooltip: boolean,
): boolean {
  const large = useLargeText();
  const compact = useContext(CompactControlsContext);
  if (!large || label === undefined || label === "" || !tooltip) return false;
  const visible = labelVisible ?? (!compact && variant !== "overlay" && variant !== "shutter");
  return visible;
}

/** The visible label (see `labelVisible`). */
function IconButtonText({ label }: { label: string }) {
  return <span data-slot="icon-button-label">{label}</span>;
}

/**
 * `toneColor`: one CSS colour, or one per theme.
 *
 * The pair is two custom properties on the element — `--icon-button-tone-light` and
 * `--icon-button-tone-dark` — and a class that points `--icon-button-tone` at one or the
 * other by the kit's `dark` variant (`.dark` on an ancestor, tokens.css), so the colour
 * follows a theme switch in CSS alone, with no re-render and no JS reading the theme.
 * Both values are any CSS colour; a token that already flips (`var(--warning)`) needs no
 * pair.
 */
export type IconButtonToneColor = string | { light: string; dark: string };

const ICON_BUTTON_TONE_PAIR =
  "[--icon-button-tone:var(--icon-button-tone-light)] dark:[--icon-button-tone:var(--icon-button-tone-dark)]";

/** The inline custom properties `toneColor` sets over the caller's `style`. */
function toneColorStyle(toneColor: IconButtonToneColor | undefined, style: CSSProperties | undefined) {
  if (toneColor === undefined) return style;
  const vars: Record<string, string> =
    typeof toneColor === "string"
      ? { "--icon-button-tone": toneColor }
      : { "--icon-button-tone-light": toneColor.light, "--icon-button-tone-dark": toneColor.dark };
  return { ...style, ...vars } as CSSProperties;
}

/** Everything but the element: the look both forms of IconButton share. */
function iconButtonLook({
  variant,
  size,
  stretch,
  glyphSize,
  shape,
  tone,
  quiet,
  toneColor,
  withText = false,
}: {
  variant: IconButtonVariant;
  size: IconButtonSize;
  stretch: boolean | undefined;
  glyphSize: IconButtonGlyphSize | undefined;
  shape: "square" | "round";
  tone: IconButtonTone;
  quiet: boolean | undefined;
  toneColor: IconButtonToneColor | undefined;
  /** The label is drawn beside the glyph (see `labelVisible`). */
  withText?: boolean;
}) {
  return cn(
    ICON_BUTTON_BASE,
    withText
      ? cn("font-medium whitespace-nowrap", stretch ? ICON_BUTTON_TEXT_STRETCH_SIZES[size] : ICON_BUTTON_TEXT_SIZES[size])
      : stretch
        ? ICON_BUTTON_STRETCH_SIZES[size]
        : ICON_BUTTON_SIZES[size],
    // With text the pill is a 48 px target at any size; the square follows its size.
    withText ? TOUCH_TARGET_LARGE : ICON_BUTTON_TOUCH_LARGE[size],
    glyphSize !== undefined && ICON_BUTTON_GLYPH_SIZES[glyphSize],
    // After the size, so the overlay's `rounded-full` beats the small sizes' `rounded`.
    variant === "overlay"
      ? ICON_BUTTON_OVERLAY
      : variant === "shutter"
        ? ICON_BUTTON_SHUTTER
        : buttonVariantClasses[variant],
    shape === "round" && "rounded-full",
    ICON_BUTTON_DISABLED_REST[variant],
    iconButtonToneClass(tone, quiet),
    toneColor !== undefined && typeof toneColor !== "string" && ICON_BUTTON_TONE_PAIR,
  );
}

/** The badge beside the control, not in it — see `badge`. The wrapper is only a
 *  positioning box: the control inside it keeps its own focus ring and hit area. */
function withIconButtonBadge(control: ReactElement, badge: ReactNode, stretch: boolean | undefined) {
  if (!hasContent(badge)) return control;
  return (
    <span className={cn("relative inline-flex shrink-0", stretch && "self-stretch")}>
      {control}
      <span
        aria-hidden
        data-slot="icon-button-badge"
        className="pointer-events-none absolute -end-0.5 -bottom-0.5 inline-flex rounded-full bg-[var(--bg-surface)] [&_svg]:size-3"
      >
        {badge}
      </span>
    </span>
  );
}

// Declared link-first, as Button is, so `<IconButton href>` picks the link props and
// `ComponentProps<typeof IconButton>` (the LAST signature) is still the button's.
export function IconButton(props: IconButtonLinkProps): ReactElement;
export function IconButton(props: IconButtonProps): ReactElement;
export function IconButton(props: IconButtonProps | IconButtonLinkProps): ReactElement {
  if (props.href !== undefined) return <IconButtonLink {...(props as IconButtonLinkProps)} />;
  return <IconButtonElement {...(props as IconButtonProps)} />;
}
IconButton.displayName = "IconButton";

function IconButtonLink({
  href,
  renderLink,
  external,
  replace,
  reloadDocument,
  disabled,
  variant = "ghost",
  size = "md",
  tone: toneProp,
  quiet,
  stopPropagation,
  stretch,
  shape = "square",
  toneColor,
  label,
  labelVisible,
  tooltip = true,
  tooltipSide,
  tooltipPortal,
  tooltipLazy = true,
  glyphSize,
  badge,
  className,
  style,
  target,
  rel,
  onClick,
  onKeyDown,
  children: glyph,
  ref,
  ...rest
}: IconButtonLinkProps) {
  const withText = useIconButtonText(label, labelVisible, variant, tooltip);
  const children = withText ? (
    <>
      {glyph}
      <IconButtonText label={label!} />
    </>
  ) : (
    glyph
  );
  const kitLink = useKitLink();
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const tone = toneProp ?? (toneColor !== undefined ? "custom" : "default");
  // Button's rule, word for word: `reloadDocument` bypasses the router, an external
  // href or an in-page `#anchor` never reaches it.
  const Link = reloadDocument ? undefined : pickLinkRenderer<KitLinkProps>(renderLink, kitLink, href);
  const newTab = !disabled && (external || target === "_blank");
  const name = rest["aria-label"] ?? label;
  // "(opens in a new tab)" joins the NAME here, not the body: an icon link has no text
  // for an sr-only span to follow, and `aria-label` would override one anyway.
  const ariaLabel = name !== undefined && newTab ? `${name} (${common.opensInNewTab})` : name;
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (stopPropagation) e.stopPropagation();
    onClick?.(e);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
    // A link activates on Enter only; that key still bubbles to a clickable row.
    if (stopPropagation && e.key === "Enter") e.stopPropagation();
    onKeyDown?.(e);
  };
  const cls = cn(
    iconButtonLook({ variant, size, stretch, glyphSize, shape, tone, quiet, toneColor, withText }),
    // BASE's `disabled:` classes never match an `<a>` — Button's disabled link look.
    disabled && "pointer-events-none cursor-not-allowed opacity-50",
    className,
  );
  const look = { style: toneColorStyle(toneColor, style), className: cls };
  let control: ReactElement;
  if (disabled) {
    control = (
      <a {...rest} {...look} ref={ref} role="link" aria-disabled="true" aria-label={ariaLabel}>
        {children}
      </a>
    );
  } else if (external || !Link) {
    control = (
      <a
        {...rest}
        {...look}
        ref={ref}
        href={href}
        aria-label={ariaLabel}
        target={external ? "_blank" : target}
        rel={external ? (rel ?? "noopener noreferrer") : rel}
        onClick={external ? handleClick : replacingClick(handleClick, href, replace, target)}
        onKeyDown={handleKeyDown}
      >
        {children}
      </a>
    );
  } else {
    control = (
      <RenderedButtonLink
        render={Link}
        {...rest}
        {...look}
        {...routerLinkNavigation(replace)}
        ref={ref}
        href={href}
        aria-label={ariaLabel}
        target={target}
        rel={rel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {children}
      </RenderedButtonLink>
    );
  }
  control = withIconButtonBadge(control, badge, stretch);
  // The words are on the link at Large: a bubble would only repeat them.
  if (!tooltip || withText || label === undefined || label === "") return control;
  return (
    // A fragment, as on the button: the bubble says what `aria-label` already does.
    <Tooltip
      label={label}
      side={tooltipSide}
      portal={tooltipPortal}
      lazy={tooltipLazy}
      className={stretch ? "self-stretch" : undefined}
    >
      <>{control}</>
    </Tooltip>
  );
}

function IconButtonElement(
  {
    variant = "ghost",
    size = "md",
    tone: toneProp,
    quiet,
    pressed,
    stopPropagation,
    stretch,
    shape = "square",
    toneColor,
    label,
    labelVisible,
    tooltip = true,
    tooltipSide,
    tooltipPortal,
    tooltipLazy = true,
    disabledReason: ownDisabledReason,
    disabledReasonDisplay,
    commit,
    pending,
    glyphSize,
    badge,
    disabledStyle = "dim",
    className,
    style,
    onClick,
    onKeyDown,
    children,
    href: _href,
    renderLink: _renderLink,
    external: _external,
    replace: _replace,
    reloadDocument: _reloadDocument,
    ref,
    ...rest
  }: IconButtonProps,
) {
  const tone = toneProp ?? (toneColor !== undefined ? "custom" : "default");
  const keep = disabledStyle === "keep";
  const withText = useIconButtonText(label, labelVisible, variant, tooltip);
  const reasonId = useId();
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  const locked = hasContent(disabledReason);
  // Pending is inert like a locked button — focusable, every activation swallowed —
  // without the locked look: the spinner is the state.
  const inert = locked || Boolean(pending);
  const ownDescribedBy = rest["aria-describedby"];
  const button = (
    <button
      ref={ref}
      {...rest}
      disabled={inert ? undefined : rest.disabled}
      aria-disabled={inert || rest["aria-disabled"]}
      aria-busy={pending || rest["aria-busy"]}
      aria-describedby={locked ? (ownDescribedBy ? `${ownDescribedBy} ${reasonId}` : reasonId) : ownDescribedBy}
      aria-label={rest["aria-label"] ?? label}
      aria-pressed={pressed ?? rest["aria-pressed"]}
      style={toneColorStyle(toneColor, style)}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        // `preventDefault` too: a locked (or pending) submit must not submit its form.
        if (inert) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        // A button turns Enter/Space into a click of its own, but the KEY still
        // bubbles — and a clickable row listening for Enter would act on it too.
        if (stopPropagation && (e.key === "Enter" || e.key === " ")) e.stopPropagation();
        onKeyDown?.(e);
      }}
      className={cn(
        iconButtonLook({ variant, size, stretch, glyphSize, shape, tone, quiet, toneColor, withText }),
        pressed && ICON_BUTTON_PRESSED,
        // The disabled look for the focusable kind of disabled, as on Button.
        locked && (keep ? "cursor-default" : "cursor-not-allowed opacity-50"),
        keep && "disabled:cursor-default disabled:opacity-100",
        pending && "cursor-progress",
        className,
      )}
    >
      {pending ? (
        // Decorative, as on Button: `aria-busy` says it. Sized to the glyph it stands
        // in for, in the glyph's colour, so the swap does not change the button's look.
        <Spinner
          label={null}
          className={cn(
            "border-current/30 border-t-current",
            glyphSize !== undefined ? ICON_BUTTON_SPINNER_GLYPH[glyphSize] : ICON_BUTTON_SPINNER[size],
          )}
        />
      ) : (
        children
      )}
      {withText && <IconButtonText label={label!} />}
    </button>
  );
  const control = withIconButtonBadge(button, badge, stretch);
  if (locked) {
    return (
      // Button's shape: the reason as a line under it, or the bubble with a hidden copy
      // for the description (see ReasonFrame).
      <ReasonFrame
        reason={disabledReason}
        reasonId={reasonId}
        display={disabledReasonDisplay}
        side={tooltipSide}
        portal={tooltipPortal}
        className={stretch ? "self-stretch" : undefined}
      >
        {control}
      </ReasonFrame>
    );
  }
  // The words are on the button at Large: a bubble would only repeat them.
  if (!tooltip || withText || label === undefined || label === "") return control;
  return (
    // A fragment, so Tooltip leaves the button's description alone: the bubble says
    // exactly what `aria-label` already does. Lazy by default — see `tooltipLazy`.
    <Tooltip
      label={label}
      side={tooltipSide}
      portal={tooltipPortal}
      lazy={tooltipLazy}
      className={stretch ? "self-stretch" : undefined}
    >
      <>{control}</>
    </Tooltip>
  );
}

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
  "block w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm placeholder:text-[var(--text-placeholder)] focus:border-[var(--brand)] focus:ring-[var(--brand)] " +
  // §10.1: at least 16 px on a touch screen, or iOS zooms the page on focus.
  FIELD_TOUCH_TEXT +
  " " +
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
  "border-[var(--danger-border-strong)] ring-1 ring-[var(--danger-border-strong)] focus:border-[var(--danger)] focus:ring-[var(--danger)]";

export const FLOATING_INPUT_CLASS = cn(FIELD_BASE, FIELD_FLOATING_PAD, "peer placeholder:text-transparent");

/** The phone breakpoint at Normal text size, as a media query.
 *
 *  @deprecated since 0.32 — it does not follow the text size (§3.3): at Large the CSS
 *  `max-md:` reaches 959 px and this still stops at 767. Use `usePhoneLayout()`, which
 *  agrees with `max-md:` at every size, or `breakpointQuery("max-md", scale)` where a
 *  query string is needed. Kept exported, unchanged, for the apps that import it. */
export const PHONE_QUERY = "(max-width: 767px)";

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
  "relative flex items-center justify-between gap-2 text-start hover:bg-[var(--bg-hover)]",
  "[&>:first-child]:min-h-[1lh]",
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
  "peer-focus:top-1 peer-focus:text-caption peer-focus:leading-tight peer-focus:text-[var(--text-secondary)]",
  "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-caption peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-[var(--text-secondary)]",
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
  "peer-focus:top-1 peer-focus:text-caption peer-focus:leading-tight peer-focus:text-[var(--text-secondary)]",
  "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-caption peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-[var(--text-secondary)]",
  "peer-disabled:opacity-50",
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
const FIELD_ERROR_CLASS = "mt-1 text-caption leading-tight text-[var(--danger)]";

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
function FieldGroup({
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

export const DEFAULT_CHARACTER_COUNT_LABELS: CharacterCountLabels = {
  count: (used, max) => `${used} of ${max} characters`,
  remaining: (left) => (left === 1 ? "1 character left" : `${left} characters left`),
  limitReached: "Character limit reached",
};

/** The length the browser's own `maxLength` counts — UTF-16 code units — so the counter
 *  and the limit can never disagree about whether a field is full. */
function textLength(value: unknown): number {
  return value === undefined || value === null ? 0 : String(value).length;
}

/** The counter's length: the controlled `value`'s, else what the field has been typed
 *  to (from `defaultValue` on). `track` is called from the field's change handler. */
function useTypedLength(value: unknown, defaultValue: unknown) {
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
 * The live "12/80" under a field with `showCount` (keksdose K11: the admin broadcast,
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
function CharacterCount({
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
            ? "text-[var(--danger)]"
            : zone === "near"
              ? "text-[var(--warning)]"
              : "text-[var(--text-muted)]",
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

/** What goes under a text field: the caption (beside the counter, when there is one),
 *  then the error. `null` when there is nothing, so a field with none keeps exactly the
 *  DOM it had (see {@link FieldGroup}). */
function fieldBelow(hint: FieldHintParts, counter: ReactNode, errorEl: ReactNode): ReactNode {
  if (counter === null && hint.captionText === undefined && errorEl === null) return null;
  return (
    <>
      {counter ?? <FieldCaption parts={hint} />}
      {errorEl}
    </>
  );
}

/**
 * kastlan 8: a caller's placeholder on a LABELLED field, shown once the label has
 * floated out of its way — on focus — and transparent until then, while the label sits
 * where the placeholder would be. Without it the field forced `placeholder=" "` for the
 * float trick and dropped the caller's text without a word (kastlan's "note" field lost
 * its hint). `:placeholder-shown` still drives the float: it matches an empty field
 * whatever the placeholder's text is.
 */
const FLOATING_PLACEHOLDER_ON_FOCUS = "focus:placeholder:text-[var(--text-placeholder)]";

/** A placeholder with something to show. `""` and blanks are the float trick's own
 *  `" "`, never the caller's hint. */
const hasPlaceholderText = (placeholder: string | undefined): placeholder is string =>
  placeholder !== undefined && placeholder.trim() !== "";

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
  /**
   * Standing advice for the field (keksdose K4: Input had `error` but no `hint`, so the
   * app built the caption by hand under each field, and half of those never reached a
   * screen reader). The {@link Select} rule, so every field reads alike:
   *  - plain TEXT (a string or a number) is a caption UNDER the field, attached with
   *    `aria-describedby` — after the caller's own ids, before the error's;
   *  - anything else (a {@link FieldHint} "?") rides the label line beside the
   *    animated label, as NumberInput's does — or, on a field with no label, sits at the
   *    field's end edge outside the box, and `className` then styles that row.
   */
  hint?: ReactNode;
  /**
   * A live "12/80" under the field, with `maxLength` (keksdose K11 — the broadcast,
   * support and handoff-note fields counted by hand). Read with the field as "12 of 80
   * characters", and announced politely only on entering the last stretch and on
   * reaching the limit — never on every keystroke. See {@link CharacterCount}. Ignored
   * without a `maxLength`: a count with no limit is not what this answers. Counts
   * UTF-16 code units, as `maxLength` itself does. Controlled, it counts `value`;
   * uncontrolled, `defaultValue` and then every change event — a value written from
   * outside without one (a form library's `reset`) shows from the next keystroke.
   */
  showCount?: boolean;
  /** The counter's words. See {@link CharacterCountLabels}. */
  countLabels?: Partial<CharacterCountLabels>;
  /** Names for the password reveal toggle, English by default — it is the one
   *  string this component renders on its own behalf, and a German form was
   *  reading it out in English. See {@link PasswordRevealLabels}. */
  passwordLabels?: Partial<PasswordRevealLabels>;
}

/** The counter's words: the `characterCount` namespace — prop > `<UiKitProvider
 *  labels>` > English. One place, so the namespace is named once. */
function useCharacterCountLabels(prop: Partial<CharacterCountLabels> | undefined): CharacterCountLabels {
  return useKitLabels("characterCount", DEFAULT_CHARACTER_COUNT_LABELS, prop);
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  const {
    className,
    inputClassName,
    label,
    id,
    placeholder,
    type,
    variant = "field",
    invalid,
    error,
    hint,
    showCount,
    countLabels,
    passwordLabels,
    ...rest
  } = props;
  // Passed at all — even as `undefined` — the field keeps its box; see FieldGroup. The
  // same for `hint` and `showCount` (keksdose, 0.22): a caption coming and going under
  // the control must not rebuild it, or focus and the caret are lost mid-edit.
  const reserve = "error" in props || "hint" in props || "showCount" in props;
  const generated = useId();
  const fieldId = id ?? generated;
  const countId = useId();
  const hintParts = useFieldHint(hint, rest["aria-describedby"]);
  const maxLength = rest.maxLength;
  const counting = Boolean(showCount) && typeof maxLength === "number" && maxLength > 0;
  const length = useTypedLength(rest.value, rest.defaultValue);
  const countText = useCharacterCountLabels(countLabels);
  const { isInvalid, describedBy, errorEl } = useFieldError(
    error,
    invalid,
    // Caller's, caption, count — then the error, appended by the hook.
    mergeDescribedBy(hintParts.describedBy, counting && countId),
    rest["aria-invalid"],
  );
  const counter = counting ? (
    <CharacterCount
      id={countId}
      used={length.used}
      max={maxLength}
      labels={countText}
      caption={<FieldCaption parts={hintParts} className="mt-0" />}
    />
  ) : null;
  const below = fieldBelow(hintParts, counter, errorEl);
  const onChange = counting
    ? (e: ChangeEvent<HTMLInputElement>) => {
        length.track(e.target.value);
        rest.onChange?.(e);
      }
    : rest.onChange;
  const asDisplay = usePhoneLayout() && variant === "display";
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
      className={cn(
        "absolute inset-y-0 end-0 flex items-center rounded-e-md px-2.5 text-[var(--text-placeholder)] transition-colors hover:text-[var(--text-secondary)] focus:outline-none disabled:cursor-default disabled:opacity-50",
        FOCUS_RING,
      )}
    >
      {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  ) : null;
  if (label === undefined) {
    // A "?" with no label line to ride goes at the end edge, outside the box, and
    // `className` moves to that row (see `hint`); without one nothing moves.
    const endHint = hintParts.labelHint;
    const ownClass = endHint === undefined ? className : undefined;
    if (!isPassword) {
      return (
        <FieldGroup errorEl={below} reserve={reserve}>
          <EndHintRow hint={endHint} className={className}>
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
              onChange={onChange}
              className={cn(FIELD_BASE, ownClass, inputClassName, isInvalid && FIELD_INVALID)}
            />
          </EndHintRow>
        </FieldGroup>
      );
    }
    return (
      <FieldGroup errorEl={below} reserve={reserve}>
        <EndHintRow hint={endHint} className={className}>
          <div className={cn("relative", ownClass)}>
            <input
              ref={ref}
              id={id}
              type={effectiveType}
              placeholder={placeholder}
              {...rest}
              aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
              aria-describedby={describedBy}
              onChange={onChange}
              className={cn(FIELD_BASE, "pe-9", inputClassName, isInvalid && FIELD_INVALID)}
            />
            {revealToggle}
          </div>
        </EndHintRow>
      </FieldGroup>
    );
  }
  const ownPlaceholder = hasPlaceholderText(placeholder);
  return (
    <FieldGroup errorEl={below} reserve={reserve}>
      <FloatingField
        className={className}
        htmlFor={fieldId}
        label={label}
        srOnlyLabel={asDisplay}
        hint={hintParts.labelHint}
      >
        <input
          ref={ref}
          id={fieldId}
          type={effectiveType}
          // A labelled field with no placeholder of its own gets a single space, which
          // feeds the floating label's peer-placeholder-shown trick. A caller's own is
          // kept and shown on focus, once the label has floated out of its way (kastlan
          // 8) — see FLOATING_PLACEHOLDER_ON_FOCUS. With the label sr-only there is no
          // float left to drive, and an empty borderless line would say nothing at all
          // — so there the label text is the placeholder when the caller gave none.
          placeholder={
            asDisplay
              ? (placeholder ?? (typeof label === "string" ? label : " "))
              : ownPlaceholder
                ? placeholder
                : " "
          }
          {...rest}
          aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          onClick={handleClick}
          onChange={onChange}
          className={cn(
            asDisplay
              ? cn(FIELD_DISPLAY, "text-xl font-semibold leading-snug")
              : cn(FLOATING_INPUT_CLASS, ownPlaceholder && FLOATING_PLACEHOLDER_ON_FOCUS),
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
  /** A {@link FieldHint} for the label line — see {@link FloatingField}. Plain
   *  TEXT (a string or a number) is a caption instead, and goes UNDER the field
   *  like every other field's hint, attached through `aria-describedby`: the label
   *  line is 11px of strip shared with the label, and a sentence placed there was
   *  set in the value's type on top of both the label and the value. On an
   *  UNLABELLED Select (no label line) a FieldHint sits at the field's end edge,
   *  outside the box. */
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
   * excepted), `onChange` is never called, and the reason is in the kit {@link Tooltip}
   * and on `aria-describedby`. It wears the settled look of a disabled field and drops
   * its chevron, as a disabled Select does (dev#474). It wins over `disabled`.
   *
   * Use it CONTROLLED (`value` + `onChange`): React puts a controlled value back after
   * the swallowed change. A touch platform's own picker may still open; nothing it picks
   * is kept or reported.
   */
  disabledReason?: ReactNode;
  /**
   * This select COMMITS — choosing saves. Under a locked {@link WriteLockProvider} it is
   * locked the `disabledReason` way with the lock's reason (which wins over its own).
   * No provider, or an unlocked one: no effect. Button's `commit`, for keksdose K3.
   */
  commit?: boolean;
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
const FIELD_LOCKED = "cursor-not-allowed bg-[var(--bg-surface-2)] text-[var(--text-muted)]";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(props, ref) {
  const {
    className,
    label,
    id,
    children,
    invalid,
    error,
    hint,
    size,
    selectClassName,
    disabledReason,
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
  const hintId = useId();
  // Text is a caption under the field; anything else (a FieldHint) rides the label
  // line. See `hint` above. An empty string is no caption at all.
  const textHint = (typeof hint === "string" && hint !== "") || typeof hint === "number";
  const { isInvalid, describedBy, errorEl } = useFieldError(
    error,
    invalid,
    // The caption goes in BEFORE the error — the standing advice first, the news
    // second, the order useFieldError keeps for a caller's own description. A lock's
    // reason sits between the two.
    mergeDescribedBy(rest["aria-describedby"], textHint && hintId, locked && lock.reasonId),
    rest["aria-invalid"],
  );
  const below =
    textHint || errorEl !== null ? (
      <>
        {textHint && (
          <p id={hintId} className="mt-1 text-caption leading-tight text-[var(--text-muted)]">
            {hint}
          </p>
        )}
        {errorEl}
      </>
    ) : null;
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
  // While locked the field sits in the reason's Tooltip, which becomes the outermost
  // box — so `className` (a width, a grid cell) moves onto it, and the form keeps its
  // layout. `block` so a full-width field stays full width inside it.
  const boxClass = locked ? undefined : className;
  const withReason = (box: ReactNode) =>
    locked ? (
      <LockedReason lock={lock} className={cn("block", className)}>
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
    if (hasContent(hint) && !textHint) {
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
          hint={textHint ? undefined : hint}
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
              listBox ? "pt-5 pb-0" : FIELD_FLOATING_PAD,
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
});
Select.displayName = "Select";

/**
 * The lower edge of {@link TEXTAREA_LABEL_STRIP} (0.25, Kurvenschmiede).
 *
 * The 0.24 strip ends on a hard line, and a line of text scrolled most of the way under
 * it left its lower edge showing below that line: in a pasted table, a row of comma
 * tails between the strip and the first whole line (`0,5;1,9` cut above its baseline is
 * `, ,`). This layer, hung under the strip, closes that gap. What it draws depends on
 * how much of the line on its way out is still below the strip ({@link labelEdge}):
 *
 * - **Half a line or less** — its descenders, the feet of its letters: covered, solid,
 *   down to exactly where that line's box ends. The strip's bottom snaps to the line
 *   box, so the row of tails is gone and the next line, which starts there, is not
 *   touched.
 * - **More than half** — a line you can still read: a soft edge, the strip's surface
 *   fading into it over {@link LABEL_EDGE_SOFT_PX}, where 0.24 cut it hard. Never taller
 *   than the part of that line already gone, so it grows from nothing as a line starts
 *   to move and never reaches the next one.
 * - **Nothing to cover** — at rest, or a line boundary right on the strip's edge:
 *   nothing drawn. An unscrolled first line is never covered (at rest the strip covers
 *   the top padding and nothing else, as in 0.24), and neither is any whole line.
 *
 * Why not one of the two alone. A plain fade under the strip, as tall as the tails,
 * dims the top of the first WHOLE line whenever it sits right under the strip (its
 * capitals start about 4px into a 20px line), and only half-hides the tails, which sit
 * in its fading part. A plain snap to the line box would hide a whole line the moment
 * one starts to scroll. The half-line threshold keeps what is shown legible: a line is
 * either hidden or shown with most of its letters, never as a row of stray marks.
 *
 * Its height and solid part are `--label-strip-edge` / `--label-strip-edge-solid`,
 * written by {@link TextareaLabelStrip} from the textarea's `scrollTop` and line height
 * on every scroll; unset (no layout, no script yet) the height is 0 and nothing shows.
 * A pseudo-element of the strip, so it inherits everything the strip already gets
 * right: shown only while the label is floated, the same horizontal insets (stopped
 * short of a classic scrollbar, on either side — RTL included), painted under the
 * label. Its colour is INHERITED from the strip (`bg-inherit`): `--bg-surface`, and the
 * disabled / `[readonly]` `--bg-surface-2`, in both themes, with no second copy of
 * those selectors to keep in step. The soft part is a mask over that colour (alpha
 * only — the `#000` is the mask's opacity, not a colour on screen).
 */
const TEXTAREA_LABEL_EDGE = cn(
  "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-[var(--label-strip-edge,0px)] after:content-['']",
  "after:bg-inherit after:[mask-image:linear-gradient(#000_var(--label-strip-edge-solid,0px),transparent)]",
);

/** The soft edge over a line still more than half in view, in px: "a few pixels" —
 *  enough to take the cut off its letters, little enough to leave them legible. */
const LABEL_EDGE_SOFT_PX = 3;

/**
 * {@link TEXTAREA_LABEL_EDGE}'s height and solid part, in px, for a field scrolled
 * `scrollTop` with lines `lineHeight` tall.
 *
 * The strip covers the top padding exactly, so line boxes meet its lower edge whenever
 * `scrollTop` is a whole number of lines; `gone` is how far the line now on its way out
 * has passed under it, `left` how much of it is still below. A line height that is not
 * a length (`normal`) gives no line boxes to snap to: only the soft edge then.
 */
function labelEdge(scrollTop: number, lineHeight: number): { height: number; solid: number } {
  if (!(scrollTop > 0)) return { height: 0, solid: 0 };
  if (!(lineHeight > 0)) return { height: Math.min(scrollTop, LABEL_EDGE_SOFT_PX), solid: 0 };
  const gone = scrollTop % lineHeight;
  const left = gone === 0 ? 0 : lineHeight - gone;
  if (left > 0 && left <= lineHeight / 2) return { height: left, solid: left };
  return { height: Math.min(gone, LABEL_EDGE_SOFT_PX), solid: 0 };
}

/**
 * The backdrop of a labelled {@link Textarea}'s label strip (Kurvenschmiede, 0.24).
 *
 * The report: paste a long table into ColumnMapper, the field scrolls, and the floated
 * "Paste a table" / "Tabelle einfügen" sits ON the first visible line of text — on
 * desktop and on a phone. Not a ColumnMapper bug: every labelled textarea that scrolls
 * did it. An `<input>` has one line that never moves, so the strip FIELD_FLOATING_PAD
 * leaves for the label is always empty there; a textarea's top padding is part of its
 * SCROLLING area, and once the content scrolls the lines travel up through the strip
 * and under the label.
 *
 * The fix makes that padding stay put: this layer is a later sibling of the textarea
 * (so `peer-*` reaches it, and as a positioned box it paints above the textarea's
 * text), the label paints above it in turn, and it covers exactly the top padding —
 * `top-px` / `inset-x-px` inside the 1px border, `h-4` = `pt-4`. At rest it covers
 * padding and nothing else, so no pixel of an unscrolled line is ever hidden; scrolled
 * text slides out of sight under it instead of through the label.
 *
 * Why a layer and not "start the scrolling area below the strip" (a wrapper that draws
 * the border and background, the textarea transparent inside it): the box would stop
 * being the textarea. Its focus outline, its brand border on focus, the invalid ring,
 * the disabled and read-only greys and every caller's `[&_textarea]:…` would all have
 * to be rebuilt on the wrapper with `focus-within:` / `has-[…]:`, and a caller's
 * `style={{ height }}` would size the scroller rather than the field. The layer leaves
 * all of that exactly where it was.
 *
 * What it has to match, it matches from the same tokens the field uses: the surface is
 * FIELD_BASE's `--bg-surface`, and `--bg-surface-2` for `disabled` and `[readonly]` —
 * on the same ATTRIBUTE selector FIELD_BASE uses, for the reason given there. Focus and
 * `invalid` change only the border and the ring, which are outside the layer, so they
 * need nothing. Both themes come with the variables. The inner corners are the field's
 * radius (`rounded-md`, 0.375rem) less the 1px border, so the rounded border is never
 * cut into — `calc(0.375rem - 1px)` rather than `var(--radius-md)`, which Tailwind emits
 * only where a utility uses it and the kit's token check refuses (token-vars-declared).
 * Since 0.32 in rem (§3.2): the field's own corner grows with the text, so a fixed 5px
 * left the strip's corner square of the border's at 125 %.
 *
 * Hidden (`display: none`) until the label floats: an empty, unfocused field has
 * nothing that could scroll, and it renders exactly as it did before 0.24. Pointer
 * events pass through, so a click on the strip still lands in the field.
 *
 * The one thing CSS cannot know is a classic scrollbar's width, and a strip across the
 * whole inner width would hide the scrollbar's top arrow — see {@link TextareaLabelStrip}.
 *
 * Its lower edge, where a line scrolled half under it used to leave its tails showing,
 * is {@link TEXTAREA_LABEL_EDGE} (0.25).
 */
const TEXTAREA_LABEL_STRIP = cn(
  "pointer-events-none absolute inset-x-px top-px hidden h-4 rounded-t-[calc(0.375rem-1px)] bg-[var(--bg-surface)]",
  "peer-focus:block peer-[:not(:placeholder-shown)]:block",
  "peer-disabled:bg-[var(--bg-surface-2)] peer-[[readonly]]:bg-[var(--bg-surface-2)]",
  TEXTAREA_LABEL_EDGE,
);

/**
 * {@link TEXTAREA_LABEL_STRIP}, stopped short of a classic scrollbar.
 *
 * A Windows / Linux desktop draws a textarea's vertical scrollbar INSIDE the border, in
 * a gutter it takes from the content box (15px in Chromium); a strip across the full
 * inner width would sit on top of the scrollbar's up arrow. So the gutter is measured —
 * border box less client width less the borders — and the strip ends where it begins.
 * On whichever side it is: `clientLeft` includes a gutter on the LEFT, which is where
 * Chromium and Firefox put it in a right-to-left field. The side is applied as an
 * inline-start / inline-end inset, so when `dir` flips afterwards and the scrollbar
 * follows it to the other edge, the strip does too without a re-measure. That corner
 * also loses its rounding, since it no longer meets the border.
 *
 * Overlay scrollbars (macOS, phones) take no gutter: the measurement is zero and the
 * strip spans the field. A ResizeObserver on the textarea re-measures when the
 * scrollbar comes or goes (it takes the content box with it) and when the field is
 * resized by hand. Not laid out — hidden in a closed panel, or jsdom — the CSS insets
 * stand until it is.
 *
 * It also writes the strip's lower edge (0.25, {@link TEXTAREA_LABEL_EDGE}) from the
 * textarea's scroll position: a passive `scroll` listener, plus the same observer, since
 * a resize can move the scroll without the user scrolling.
 */
function TextareaLabelStrip() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const strip = ref.current;
    const field = strip?.previousElementSibling;
    if (!strip || !(field instanceof HTMLTextAreaElement)) return;
    const fit = () => {
      if (field.offsetWidth === 0) return;
      const style = getComputedStyle(field);
      const borderLeft = parseFloat(style.borderLeftWidth) || 0;
      const borderRight = parseFloat(style.borderRightWidth) || 0;
      const gutter = field.offsetWidth - field.clientWidth - borderLeft - borderRight;
      // offsetWidth and clientWidth are whole pixels, so a field with no scrollbar can
      // read ±1 here; no scrollbar is that thin.
      const bar = gutter > 1.5;
      const onLeft = field.clientLeft - borderLeft > 1.5;
      // Kept as a LOGICAL side: a `dir` flipped later (a language switch) moves the
      // scrollbar across without resizing anything, so nothing would re-measure —
      // but it stays at the inline end, and so does an inline-end inset.
      const rtl = style.direction === "rtl";
      const atEnd = onLeft === rtl;
      const border = (end: boolean) => (end === rtl ? borderLeft : borderRight);
      strip.style.insetInlineEnd = bar && atEnd ? `${border(true) + gutter}px` : "";
      strip.style.insetInlineStart = bar && !atEnd ? `${border(false) + gutter}px` : "";
      strip.style.borderStartEndRadius = bar && atEnd ? "0" : "";
      strip.style.borderStartStartRadius = bar && !atEnd ? "0" : "";
    };
    // The edge under the strip follows the scroll — see TEXTAREA_LABEL_EDGE. The line
    // height is read each time, since a caller's class can change the type. Nothing to
    // draw is no property at all (the CSS default is a 0px edge), so a field at rest
    // carries exactly the strip it did in 0.24.
    const follow = () => {
      const edge = labelEdge(field.scrollTop, parseFloat(getComputedStyle(field).lineHeight));
      if (edge.height > 0) {
        strip.style.setProperty("--label-strip-edge", `${edge.height}px`);
        strip.style.setProperty("--label-strip-edge-solid", `${edge.solid}px`);
      } else {
        strip.style.removeProperty("--label-strip-edge");
        strip.style.removeProperty("--label-strip-edge-solid");
      }
    };
    fit();
    follow();
    field.addEventListener("scroll", follow, { passive: true });
    if (typeof ResizeObserver === "undefined") return () => field.removeEventListener("scroll", follow);
    // A resize can move the scroll too (a taller field clamps it).
    const observer = new ResizeObserver(() => {
      fit();
      follow();
    });
    observer.observe(field);
    return () => {
      field.removeEventListener("scroll", follow);
      observer.disconnect();
    };
  }, []);
  return <span ref={ref} aria-hidden data-slot="label-strip" className={TEXTAREA_LABEL_STRIP} />;
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  /** See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** See {@link Input}'s `error`. */
  error?: ReactNode;
  /** See {@link Input}'s `hint` (keksdose K4): text is a caption under the field, a
   *  {@link FieldHint} rides the label line (or, unlabelled, the end edge). */
  hint?: ReactNode;
  /** See {@link Input}'s `showCount` (keksdose K11): a live "12/80" under the field,
   *  with `maxLength`, announced only near and at the limit. */
  showCount?: boolean;
  /** The counter's words. See {@link CharacterCountLabels}. */
  countLabels?: Partial<CharacterCountLabels>;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(props, ref) {
  const { className, label, id, placeholder, invalid, error, hint, showCount, countLabels, ...rest } = props;
  // See Input's `reserve`.
  const reserve = "error" in props || "hint" in props || "showCount" in props;
  const generated = useId();
  const fieldId = id ?? generated;
  const countId = useId();
  const hintParts = useFieldHint(hint, rest["aria-describedby"]);
  const maxLength = rest.maxLength;
  const counting = Boolean(showCount) && typeof maxLength === "number" && maxLength > 0;
  const length = useTypedLength(rest.value, rest.defaultValue);
  const countText = useCharacterCountLabels(countLabels);
  const { isInvalid, describedBy, errorEl } = useFieldError(
    error,
    invalid,
    mergeDescribedBy(hintParts.describedBy, counting && countId),
    rest["aria-invalid"],
  );
  const counter = counting ? (
    <CharacterCount
      id={countId}
      used={length.used}
      max={maxLength}
      labels={countText}
      caption={<FieldCaption parts={hintParts} className="mt-0" />}
    />
  ) : null;
  const below = fieldBelow(hintParts, counter, errorEl);
  const onChange = counting
    ? (e: ChangeEvent<HTMLTextAreaElement>) => {
        length.track(e.target.value);
        rest.onChange?.(e);
      }
    : rest.onChange;
  if (label === undefined) {
    const endHint = hintParts.labelHint;
    return (
      <FieldGroup errorEl={below} reserve={reserve}>
        <EndHintRow hint={endHint} className={className}>
          <textarea
            ref={ref}
            id={id}
            placeholder={placeholder}
            {...rest}
            aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
            aria-describedby={describedBy}
            onChange={onChange}
            className={cn(FIELD_BASE, endHint === undefined && className, isInvalid && FIELD_INVALID)}
          />
        </EndHintRow>
      </FieldGroup>
    );
  }
  const ownPlaceholder = hasPlaceholderText(placeholder);
  return (
    <FieldGroup errorEl={below} reserve={reserve}>
      <FloatingField className={className} htmlFor={fieldId} label={label} hint={hintParts.labelHint}>
        <textarea
          ref={ref}
          id={fieldId}
          // The float trick's single space, unless the caller has a placeholder of its
          // own — then that, shown on focus once the label is out of its way (kastlan
          // 8, see FLOATING_PLACEHOLDER_ON_FOCUS).
          placeholder={ownPlaceholder ? placeholder : " "}
          {...rest}
          aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          onChange={onChange}
          className={cn(
            FLOATING_INPUT_CLASS,
            ownPlaceholder && FLOATING_PLACEHOLDER_ON_FOCUS,
            isInvalid && FIELD_INVALID,
          )}
        />
        {/* Between the textarea and the label, on purpose: after the textarea so it
            is its `peer` and paints over its text, before the label so the label
            paints over it. See TEXTAREA_LABEL_STRIP. */}
        <TextareaLabelStrip />
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
  variant?: "default" | "inset" | "outline";
  /**
   * The card's own padding: `none`, `sm` (`p-3`) or `md` (`p-4`).
   *
   * `outline` is the bordered box with no shadow — a row or a block INSIDE a section
   * rather than a card on the page: kastlan's rent breakdown rows
   * (tenancy/components/breakdown-row.tsx, `rounded-lg border p-4`) and the meters
   * list's inline add row (meters/components/meter-add-row.tsx). It takes `md` by
   * default, as every one of those copies does; `sm` is the dense row.
   *
   * Left out, the default card keeps no padding (its CardHeader / CardContent own the
   * rhythm) and `inset` keeps its `p-3`; passing it sets theirs too. A caller's `p-*`
   * in `className` still wins.
   *
   * Whenever the card carries a padding — this prop, or the `inset` / `outline` one —
   * CardHeader, CardContent and CardFooter drop their own `px-6` / `pt-6` / `pb-6`, so
   * the card's padding is the only one. Before 0.16 they kept it regardless and a
   * `padding="md"` card with parts was padded twice (40px a side); keksdose's settings
   * cards zeroed all three parts by hand (`<CardHeader className="p-0">`). A padding set
   * only through `className` cannot be seen from the parts: use the prop.
   */
  padding?: "none" | "sm" | "md";
  /**
   * A card that is a WARNING (or other status) as a whole: the border in the tone's
   * `-border` colour and the {@link CardTitle} in the tone's text colour. kastlan's
   * dunning summary (invoice-detail-page.tsx:231-235) writes both by hand —
   * `border-[var(--warning-border)]` on the Card, `text-[var(--warning)]` on the title
   * — and the next status card would copy the pair (`outline` takes it the same way).
   * An `inset` panel has no border, so it takes the tone's quiet `-bg` fill instead.
   * `data-tone` is set for a caller's own
   * selectors.
   */
  tone?: CardTone;
  /**
   * How loud the `tone` frame is. `"strong"`: a 2px border in the tone's strong
   * colour — `--danger-border-strong` for `danger`, the tone's own text colour
   * (`--warning`, `--info`, `--success`) for the others, which have no
   * `-border-strong` token of their own. For the one tile on a page that guards
   * something destructive or security-relevant: keksdose's password / delete-account
   * tile (shared/components/password-danger-card.tsx) wrote `toneFrameClass(tone)` over
   * the Card by hand for the 2px rule, and `p-[15px]` under it so the content did not
   * move. Here the extra pixel comes off the padding the same way (`padding` or the
   * variant's own), so a strong card's content sits exactly where a soft one's does.
   *
   * Default `"soft"`: the 1px `-border` it has always been. No effect without `tone`,
   * nor on `inset`, which has no border to make louder (its tone is a fill).
   */
  toneStrength?: "soft" | "strong";
  /**
   * Wash the card in the tone's quiet `-bg` surface as well as framing it. A toned
   * card is a border and a title colour, at either strength — the wash belongs to
   * `AlertBanner`, the message, not to a card that holds a form — so it stays
   * off by default. Some tiles want both: keksdose's password / delete-account tile
   * was `toneFrameClass(tone)` (border AND wash) before 0.16, and after moving to
   * `toneStrength="strong"` it re-added `bg-[var(--danger-bg)]` by hand. The wash is
   * layered OVER the card's own `--bg-surface` (as AlertBanner's `elevated` does), so
   * the dark theme's translucent tints stay a card, not a hole to the page below.
   *
   * No effect without `tone`, nor on `inset`, whose tone is already the fill.
   */
  toneFill?: boolean;
  /**
   * The parts' type scale. `"compact"`: CardTitle `text-sm font-medium`,
   * CardDescription `text-xs` and the CardHeader's title-to-description gap
   * `gap-0.5` — the small settings / admin card. keksdose wrote those three classes by
   * hand on ~25 cards. Set here, they reach the parts through context; a class on a
   * part still wins, and a Card nested inside starts again from its own density.
   *
   * Default `"comfortable"`: the parts as they have always been.
   */
  density?: CardDensity;
}

export type CardDensity = "comfortable" | "compact";

export type CardTone = "warning" | "danger" | "info" | "success";

// The title is reached through its `data-slot`, so the tone needs no context and a
// caller's `className` on CardTitle still wins (it is on the element itself).
const CARD_TONES: Record<CardTone, { border: string; fill: string; title: string }> = {
  warning: {
    border: "border-[var(--warning-border)]",
    fill: "bg-[var(--warning-bg)]",
    title: "[&_[data-slot=card-title]]:text-[var(--warning)]",
  },
  danger: {
    border: "border-[var(--danger-border)]",
    fill: "bg-[var(--danger-bg)]",
    title: "[&_[data-slot=card-title]]:text-[var(--danger)]",
  },
  info: {
    border: "border-[var(--info-border)]",
    fill: "bg-[var(--info-bg)]",
    title: "[&_[data-slot=card-title]]:text-[var(--info)]",
  },
  success: {
    border: "border-[var(--success-border)]",
    fill: "bg-[var(--success-bg)]",
    title: "[&_[data-slot=card-title]]:text-[var(--success)]",
  },
};

const CARD_PADDING: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
};

// The same padding one pixel short, for a 2px `toneStrength="strong"` frame: the
// border grows inwards by that pixel, so the content stays where the 1px card had it.
// `calc(rem − 1px)` (0.32, §3.2): the padding grows with the text like `p-3` / `p-4`,
// the border does not — a fixed 11 / 15 px stopped matching them at 125 %, and toggling
// the tone shifted the content.
const CARD_PADDING_STRONG: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-[calc(0.75rem-1px)]",
  md: "p-[calc(1rem-1px)]",
};

// The wash as a background IMAGE over the card's opaque `--bg-surface` — see
// `toneFill`. A plain `bg-[var(--danger-bg)]` would REPLACE the surface, and the dark
// theme's washes are a translucent tint.
const CARD_TONE_WASH: Record<CardTone, string> = {
  warning: "bg-[image:linear-gradient(var(--warning-bg),var(--warning-bg))]",
  danger: "bg-[image:linear-gradient(var(--danger-bg),var(--danger-bg))]",
  info: "bg-[image:linear-gradient(var(--info-bg),var(--info-bg))]",
  success: "bg-[image:linear-gradient(var(--success-bg),var(--success-bg))]",
};

const CARD_TONES_STRONG: Record<CardTone, string> = {
  warning: "border-2 border-[var(--warning)]",
  danger: "border-2 border-[var(--danger-border-strong)]",
  info: "border-2 border-[var(--info)]",
  success: "border-2 border-[var(--success)]",
};

/**
 * Whether the {@link Card} round the parts carries the padding itself — so CardHeader,
 * CardContent and CardFooter must not add theirs on top. `false` (no Card, or a default
 * card with no `padding`) keeps the parts' own `px-6` rhythm, as it always was.
 */
const CardPaddedContext = createContext(false);

/** The {@link CardProps.density} of the nearest Card — the parts' type scale. */
const CardDensityContext = createContext<CardDensity>("comfortable");

export function Card({
  className,
  children,
  flush,
  variant = "default",
  tone,
  toneStrength = "soft",
  toneFill = false,
  density = "comfortable",
  padding,
  ...rest
}: CardProps) {
  const toned = tone ? CARD_TONES[tone] : undefined;
  // An outline card is bordered like the default one, so a tone recolours its border.
  const bordered = variant !== "inset";
  const strong = toned !== undefined && bordered && toneStrength === "strong";
  // The padding the card itself carries: the prop, else the variant's own (`inset`
  // p-3, `outline` p-4). A default card with no prop carries none — its parts do.
  const ownPadding = padding ?? (variant === "inset" ? "sm" : variant === "outline" ? "md" : undefined);
  return (
    <div
      data-tone={tone}
      data-tone-strength={strong ? "strong" : undefined}
      data-density={density === "compact" ? "compact" : undefined}
      {...rest}
      className={cn(
        variant === "inset"
          ? "rounded-md bg-[var(--bg-surface-2)] p-3"
          : variant === "outline"
            ? // No shadow and no `flush`: it sits on a surface that already has both.
              "rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4"
            : cn(
              // Surface + border are theme tokens so the palette switcher (feedback
              // #307) can re-skin every card; a caller's own bg-*/border-* override
              // still wins via tailwind-merge.
              "bg-[var(--bg-surface)]",
              flush
                ? "border-y border-[var(--border)] md:rounded-lg md:border md:shadow-sm"
                : "rounded-lg border border-[var(--border)] shadow-sm",
            ),
        toned && (bordered ? toned.border : toned.fill),
        strong && tone && CARD_TONES_STRONG[tone],
        toneFill && bordered && tone && CARD_TONE_WASH[tone],
        toned?.title,
        ownPadding && (strong ? CARD_PADDING_STRONG : CARD_PADDING)[ownPadding],
        className,
      )}
    >
      <CardPaddedContext.Provider value={ownPadding !== undefined}>
        <CardDensityContext.Provider value={density}>{children}</CardDensityContext.Provider>
      </CardPaddedContext.Provider>
    </div>
  );
}

// Composed shadcn-style Card sub-parts. A default `Card` with no `padding` stays
// padding-less, so these own the padding/rhythm (`px-6`, the header's `pt-6`, the
// last part's `pb-6`). A Card that carries a padding of its own — the `padding` prop,
// or `inset` / `outline`, which have one built in — tells them so through context and
// they add none on top (see CardPaddedContext). Token-driven so they re-skin with the
// palette. Use CardHeader → CardTitle/CardDescription (+ optional CardAction,
// top-right) → CardContent → CardFooter.
/** The sub-parts add nothing to a `<div>`'s props — they are the SAME element with a
 *  `data-slot` and a padding rhythm — so most names are aliases rather than an empty
 *  interface pretending to be more. They exist so a consumer's own wrapper can say
 *  `CardHeaderProps` instead of `ComponentProps<typeof CardHeader>`. */
export interface CardHeaderProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Below the `sm` breakpoint, put the {@link CardAction} UNDER the title and
   * description instead of beside them. For an action that is wider than an icon —
   * a "Set up two-factor" button, a checkbox and a filter — which, kept in the
   * top-end column on a 390px phone, squeezed the title into a ribbon two words wide
   * (keksdose's settings cards). Off by default: an icon action (the wizard summary's
   * pencil) is narrow enough to stay beside the title at every width.
   */
  stackAction?: boolean;
}
export type CardTitleLevel = "div" | "h2" | "h3" | "h4";
export interface CardTitleProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The element the title is: `"div"` (default) or a heading level. Five of keksdose's
   * settings cards nested their own `<h2>` / `<h3>` INSIDE CardTitle to put the card in
   * the page's outline — a heading in a div that looks like a heading. The heading
   * takes the title's look unchanged (the reset leaves `h2`–`h4` at inherited size and
   * weight), so only the outline changes.
   */
  as?: CardTitleLevel;
}
export type CardDescriptionProps = ComponentPropsWithoutRef<"div">;
export type CardActionProps = ComponentPropsWithoutRef<"div">;
export type CardContentProps = ComponentPropsWithoutRef<"div">;
export type CardFooterProps = ComponentPropsWithoutRef<"div">;

export function CardHeader({ className, stackAction = false, ...props }: CardHeaderProps) {
  const padded = useContext(CardPaddedContext);
  const compact = useContext(CardDensityContext) === "compact";
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Grid (not flex) so CardAction can occupy a top-right column; with no
        // action it collapses to one column and title/description stack.
        //
        // The two-column switch sets a VARIABLE, not `grid-template-columns`. As
        // `has-data-[slot=card-action]:grid-cols-[1fr_auto]` it was two classes of
        // specificity (the class plus the attribute inside `:has()`), and a caller's
        // `max-sm:grid-cols-1` — one class inside a media query — lost to it at every
        // width, so the action could never be stacked on a phone from outside. Now the
        // property itself is set by a plain one-class utility that any `grid-cols-*`
        // variant of the caller's outranks by coming later in the sheet; the `:has()`
        // rule only picks the value. The base `1fr` resets the variable so a header
        // never inherits an ancestor header's two columns.
        "grid auto-rows-min items-start gap-1.5 [--card-header-cols:1fr] has-data-[slot=card-action]:[--card-header-cols:1fr_auto] grid-cols-[var(--card-header-cols,1fr)]",
        padded ? "px-0 pt-0" : "px-6 pt-6",
        compact && "gap-0.5",
        // One column under `sm`, and the action back into the flow (DOM order, so
        // after the description when it is written after it), at the start edge.
        // The descendant selector outranks CardAction's own placement classes.
        stackAction &&
          "max-sm:grid-cols-1 max-sm:[&>[data-slot=card-action]]:col-start-1 max-sm:[&>[data-slot=card-action]]:row-span-1 max-sm:[&>[data-slot=card-action]]:row-start-auto max-sm:[&>[data-slot=card-action]]:justify-self-start",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, as: Tag = "div", ...props }: CardTitleProps) {
  const compact = useContext(CardDensityContext) === "compact";
  return (
    <Tag
      data-slot="card-title"
      // Compact is `leading-snug`, not `leading-none`: there the title sits on a
      // 12px description `gap-0.5` below, and a line box exactly the cap height left
      // the hint hugging the title's descenders (every keksdose admin card added
      // `leading-normal` by hand). Comfortable keeps `leading-none` — its 14px
      // description is `gap-1.5` away and has always read right.
      className={cn(compact ? "text-sm font-medium leading-snug" : "font-semibold leading-none", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  const compact = useContext(CardDensityContext) === "compact";
  return (
    <div
      data-slot="card-description"
      // `--text-muted`, the kit's secondary-line colour (StatTile's description, the
      // field captions). It was `--money-neutral`, a MONEY token that happened to be
      // a similar grey — and a palette that re-tunes the money colours moved every
      // card's description with them.
      className={cn(compact ? "text-xs" : "text-sm", "text-[var(--text-muted)]", className)}
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
  const padded = useContext(CardPaddedContext);
  // `last:pb-6`, not a plain `pb-6`: CardHeader owns the top padding and CardFooter
  // owns the bottom one, so a card WITHOUT a footer had nothing closing it off and
  // its last field sat flush against the card edge (kastlan feedback: the language
  // input touching the card bottom on /profile). Scoping to `:last-child` fixes that
  // case and leaves a footered card's rhythm exactly as it was. Inside a padded Card
  // the card closes itself off, so there is nothing to add.
  return <div data-slot="card-content" className={cn(!padded && "px-6 last:pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  const padded = useContext(CardPaddedContext);
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center", !padded && "px-6 pb-6", className)}
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
  /**
   * Show the label as TEXT beside the ring, not only to a screen reader. kastlan's
   * LoadingState (feedback/loading-state.tsx:14) builds exactly this by hand — a
   * `role="status"` wrapper, the spinner at `label={null}`, a `<p>` of text — so it
   * has to get the three-part aria arrangement right itself. Here the visible text IS
   * the live region's content (the label stays the accessible name, said once), and
   * the ring is decorative. `className` still sizes the ring; the other props go on
   * the wrapper. Ignored with `label={null}`: there are no words to show.
   */
  showLabel?: boolean;
  /** Where the shown label sits: `end` (default) — beside the ring, for a row or a
   *  button; `below` — under it, centred, for a panel's loading state. */
  labelPosition?: "end" | "below";
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
export function Spinner({ className, label, showLabel, labelPosition = "end", ...rest }: SpinnerProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS, {
    loading: label ?? undefined,
  });
  const ring = cn(
    "relative inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--text-primary)]",
    className,
  );
  if (label === null) return <span aria-hidden {...rest} className={ring} />;
  if (showLabel) {
    return (
      <span
        role="status"
        {...rest}
        className={cn(
          "inline-flex items-center text-sm text-[var(--text-secondary)]",
          labelPosition === "below" ? "flex-col gap-2 text-center" : "gap-2",
        )}
      >
        <span aria-hidden className={ring} />
        <span>{common.loading}</span>
      </span>
    );
  }
  return (
    <span role="status" {...rest} className={ring}>
      {/* The trailing space is a separator for the case the caller forgot `label={null}`
          inside a button: a name is the concatenation of its text, and without it the
          spinner's word ran straight into the button's — "Loadingconfirm". */}
      <span className="sr-only">{common.loading} </span>
    </span>
  );
}

export interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  /** The box renders `title` and `hint` in its own two-line rhythm, which is what makes
   *  every empty state in three apps look like the same thing — so there is no
   *  `children` slot to put arbitrary content in. The two slots below are the only
   *  other things an empty state has turned out to need, and each has a fixed place. */
  /** Nodes rather than strings, so a title can carry a code, a link or an emphasised
   *  word — keksdose's error boundary shows the error's name in `<code>` — while the
   *  box still sets the type. */
  title: ReactNode;
  hint?: ReactNode;
  /**
   * Render the title as a heading of this level. Left out it is a `<div>`, as before:
   * most empty states are a message inside a section that already has its heading.
   * keksdose's error boundary IS the page when it trips, and its `<h2>` went missing
   * when it moved onto EmptyState — so the page's heading outline lost the one line
   * that says what happened. Only the element changes; the look is the box's.
   */
  headingAs?: "h2" | "h3" | "h4" | "h5" | "h6";
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
  /**
   * `box` (default): the dashed, padded card that stands in for a whole section.
   * `inline`: one quiet line with no box — for the empty state INSIDE something that
   * already has its own frame, where a dashed card would be a box in a box. keksdose
   * writes that line by hand five times as a muted `<p className="py-6 text-center">`:
   * the notification inbox (notification-inbox:140), a support thread
   * (support-thread:144), the assistant (assistant-page:321), the admin support panel
   * (support-panel:265) and the funding dialog (funding-dialog:89). The icon shrinks
   * to the text's size and sits before the title, the hint follows on the same line,
   * and the row wraps only when it must. Centred like the box; `className="justify-start"`
   * for a list that reads from the start edge (funding-dialog).
   */
  variant?: "box" | "inline";
  /**
   * Colour the icon and the title: `danger` for an error standing where the content
   * should be — kastlan's ErrorState (shared/components/feedback/error-state.tsx) and
   * its error boundary's fallback (error-boundary.tsx:16), both a red triangle over a
   * message — and `success` for an empty state that is GOOD news, kastlan's "No defects
   * recorded for this room" (handover defects-step.tsx:142, a green check). Left out,
   * both stay muted. The hint stays muted either way: it is the explanation, not the
   * verdict.
   */
  tone?: "danger" | "success";
  /**
   * `inline` only (0.11.0). `sm`: 12px, start-aligned and tight (`py-1`) — the empty
   * line INSIDE a detail panel, under a panel heading and among `text-xs` rows, where
   * the default's 14px centred line with `py-4` read as a section of its own.
   * keksdose's holdings panel (holdings-panel:563), asset-loan panel
   * (asset-loan-panel:108) and loan-payment panel (loan-payment-panel:191) each wrote
   * `className="justify-start py-1"` over it and still got body-size text. Default `md`,
   * the look it had. Ignored by the box.
   */
  size?: "sm" | "md";
}

const EMPTY_STATE_TONE: Record<"danger" | "success", string> = {
  danger: "text-[var(--danger)]",
  success: "text-[var(--success)]",
};

export function EmptyState({
  title,
  hint,
  icon,
  action,
  headingAs,
  variant = "box",
  tone,
  size = "md",
  className,
  ...rest
}: EmptyStateProps) {
  const Title = headingAs ?? "div";
  const toneClass = tone ? EMPTY_STATE_TONE[tone] : undefined;
  const hasHint = hint != null && hint !== false && hint !== "";
  if (variant === "inline") {
    const sm = size === "sm";
    return (
      <div
        {...rest}
        className={cn(
          "flex flex-wrap items-center text-[var(--text-muted)]",
          sm
            ? "justify-start gap-x-1.5 gap-y-0.5 py-1 text-start text-xs"
            : "justify-center gap-x-2 gap-y-1 py-4 text-center text-sm",
          className,
        )}
      >
        {icon != null && (
          <span
            aria-hidden
            className={cn("flex text-[var(--text-placeholder)]", sm ? "[&_svg]:size-3.5" : "[&_svg]:size-4", toneClass)}
          >
            {icon}
          </span>
        )}
        {/* No weight of its own: one muted line is what these sites were, and a
            bold title would turn a quiet "nothing here" into a heading. */}
        <Title className={cn(sm ? "text-xs" : "text-sm", toneClass)}>{title}</Title>
        {hasHint && <span className="text-xs">{hint}</span>}
        {action != null && <span className="flex flex-wrap items-center gap-2">{action}</span>}
      </div>
    );
  }
  return (
    <div
      {...rest}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-2)] px-4 py-10 text-center text-sm text-[var(--text-muted)]",
        className,
      )}
    >
      {icon != null && (
        <div aria-hidden className={cn("mb-3 text-[var(--text-placeholder)] [&_svg]:size-8", toneClass)}>
          {icon}
        </div>
      )}
      {/* `text-sm`: a heading keeps the box's size, not whatever a stylesheet gives h2. */}
      <Title className={cn("text-sm font-medium text-[var(--text-secondary)]", toneClass)}>{title}</Title>
      {hasHint && <div className="mt-1 text-xs">{hint}</div>}
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
   * **On a phone (`usePhoneLayout()`) it becomes the horizontal strip**, `wrap` and
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
  FOCUS_RING_WIDTH +
  " flex w-full items-center rounded-md px-3 py-2 text-start text-sm font-medium transition-colors focus:outline-none focus-visible:ring-[var(--border-strong)]";
const TAB_VERTICAL_ACTIVE_CLASSES = "bg-[var(--bg-active)] text-[var(--text-primary)]";
const TAB_VERTICAL_INACTIVE_CLASSES =
  "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]";

const TABLIST_WRAP_CLASSES =
  "flex flex-wrap gap-1.5 md:flex-nowrap md:gap-1 md:overflow-x-auto md:overflow-y-hidden md:border-b md:border-[var(--border)]";

// `max-w-full`: no tab outgrows its strip. A sheet's `detail` line ("Spurstangenkraft
// links · … · 31 Punkte") made one tab 448px wide in a 390px strip, and a tab wider
// than the strip cannot be scrolled into view — its end was simply off screen
// (lenkbank L3). The label and detail truncate inside it instead; see `inner`.
const TAB_CLASSES =
  FOCUS_RING_WIDTH +
  " max-w-full whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none focus-visible:ring-[var(--border-strong)]";
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
  FOCUS_RING_WIDTH +
  " max-w-full whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-[var(--border-strong)] md:rounded-none md:border-b-2 md:-mb-px md:bg-transparent md:px-3 md:py-2 md:text-sm";
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
  FOCUS_RING_WIDTH +
  " inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4";
const TAB_ADD_WRAP_CLASSES = "px-2.5 text-xs md:px-3 md:text-sm";
// `relative`: the phone's visually hidden label needs a positioned ancestor (see the
// sr-only rule in CONTRIBUTING); `max-md:px-2` squares the lone "+".
const TAB_ADD_PHONE_CLASSES = "relative max-md:px-2";


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
  const phone = usePhoneLayout();
  const vertical = orientation === "vertical" && !phone;
  const stripRef = useRef<HTMLDivElement>(null);
  const fade = useStripFade(stripRef);
  // The OPEN tab is scrolled into the strip whenever it changes — on mount too, for a
  // deep link to the seventh report. A selection behind the cut edge was the worst
  // case of the overflow above: the one tab the panel below belongs to, sliced to
  // "80 km," under the add button. Only the strip scrolls (`scrollBy` on it, not
  // `scrollIntoView`, which would scroll the page as well), and only as far as needed
  // to clear the fade.
  useLayoutEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (strip && tab) scrollIntoStrip(strip, tab);
  }, [active]);
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
      // Merged over a caller's own style rather than replacing it; see useStripFade.
      // `data-overflow` names the cut ends in reading-direction terms, for a caller's
      // own affordance (a scroll button) and for tests, which cannot read the mask.
      style={fade.mask ? { ...rest.style, maskImage: fade.mask, WebkitMaskImage: fade.mask } : rest.style}
      data-overflow={fade.overflow}
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
              vertical ? "flex min-w-0 flex-1 items-center gap-1.5" : "inline-flex max-w-full min-w-0 items-center gap-1.5",
              tab.empty && TAB_EMPTY_CLASSES,
            )}
          >
            {tab.icon != null && (
              <span aria-hidden className="inline-flex shrink-0 items-center gap-0.5">
                {tab.icon}
              </span>
            )}
            {tab.detail != null ? (
              // `min-w-0` + `truncate` on each line: capped by the tab's `max-w-full`, a
              // long detail ends in an ellipsis. The whole text stays the tab's name.
              <span className="flex min-w-0 flex-col items-start text-start">
                <span className="max-w-full truncate">{tab.label}</span>
                {/* A separator for the NAME only — whitespace between flex items is
                    not drawn, and without it the two lines ran together into one
                    word for a screen reader ("80 km/hloop 2"). */}{" "}
                <span
                  className={cn(
                    "max-w-full truncate text-caption font-normal leading-tight text-[var(--text-muted)]",
                    // On a wrapped strip's filled chip (below `md`) the muted grey
                    // was dark text on the brand fill — "loop 2" all but vanished
                    // under the one label that most needed reading. It takes the
                    // chip's own ink instead, as the label and the × already do.
                    wrap && isActive && !vertical && "text-[var(--brand-contrast)] md:text-[var(--text-muted)]",
                  )}
                >
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
          <div key={tab.id} className={cn("relative flex max-w-full", !vertical && "shrink-0")}>
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
          className={cn(TAB_ADD_CLASSES, wrap ? TAB_ADD_WRAP_CLASSES : TAB_ADD_PHONE_CLASSES)}
        >
          <Plus aria-hidden />
          {/* Below md a scrolling strip keeps the room for tabs: the label is visually
              hidden and the "+" carries it as its name. Beside "+ Add loop" a 390px strip
              showed the open tab and a sliver of the next (showcase audit). A wrapping
              strip has its own row there, so it keeps the label. */}
          <span className={wrap ? undefined : "max-md:sr-only"}>{addLabel ?? text.add}</span>
        </button>
      </div>
    </div>
  );
}
