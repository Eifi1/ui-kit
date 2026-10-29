import { useId } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLink } from "../i18n/kit-labels";
import type { KitLinkComponent, KitLinkProps } from "../i18n/kit-labels";
import { pickLinkRenderer, replacingClick, routerLinkNavigation } from "./text-link";
import { useCommitReason } from "./write-lock";
import type { CommitScope } from "./write-lock";
import { hasContent } from "../lib/presence";
import { LockedReason, type DisabledReasonDisplay } from "./field-parts";
import { Spinner } from "./spinner";
import { BUTTON_LINK_PRESSED, ICON_BUTTON_PRESSED, RenderedButtonLink, buttonLook } from "./button-look";
import type { ButtonSize, ButtonTone, ButtonVariant } from "./button-look";

// The kit's text button, and `<Button href>`, the link that looks like one. Its look —
// the variant, size and tone maps, and `buttonClasses` — is ./button-look, which
// IconButton shares (0.34, MOD-2, refactor audit 2026-10).

/**
 * ⚠️ No default `type`: like a native `<button>`, a `Button` inside a `<form>` SUBMITS
 * it unless you pass `type="button"`. Kept native on purpose — a form's own submit
 * button relies on it, and changing the default would silently stop those forms from
 * submitting. Pass `type="button"` for every other action in a form (keksdose had six
 * link buttons submitting their form).
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `default` (the quiet action, what a Button without `variant` draws), `accent` (the
   *  strong call to action, solid brand), `secondary`, `ghost`, `danger` or `link`.
   *  `primary` / `brand` are deprecated aliases of `default` / `accent`. See {@link ButtonVariant}. */
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
   *  outlined destructive button and `default` a soft one; ignored by the other
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
   * unlocked one: no effect. See {@link WriteLockProvider}; a {@link CommitScope} since
   * 0.33 (`COMMIT_EXCEPT_BILLING`: every lock but a lapsed plan's).
   */
  commit?: CommitScope;
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

// Declared link-first so `<Button href>` picks the link props; the LAST signature is
// what `ComponentProps<typeof Button>` reads, so wrappers (FileButton) still see the
// `<button>` props they always did.
export function Button(props: ButtonLinkProps): ReactElement;
export function Button(props: ButtonProps): ReactElement;
export function Button(props: ButtonProps | ButtonLinkProps): ReactElement {
  if (props.href !== undefined) return <ButtonLink {...(props as ButtonLinkProps)} />;
  return <ButtonElement {...(props as ButtonProps)} />;
}

function ButtonLink({
  href,
  renderLink,
  external,
  replace,
  reloadDocument,
  disabled,
  variant = "default",
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
  variant = "default",
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
          <Spinner label={null} className="absolute inset-0 m-auto size-4 border-current/30 border-t-current" />
        </>
      ) : (
        children
      )}
    </button>
  );
  if (!locked) return button;
  return (
    <LockedReason
      lock={{ reason: disabledReason, reasonId }}
      display={disabledReasonDisplay}
      className={stretch ? "self-stretch" : undefined}
    >
      {button}
    </LockedReason>
  );
}
