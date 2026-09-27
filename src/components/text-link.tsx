import type { ComponentPropsWithoutRef, KeyboardEvent, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLink } from "../i18n/kit-labels";
import type { KitLinkComponent } from "../i18n/kit-labels";
import { documentNavigation } from "../lib/document-navigation";

/* ── Choosing what draws a link ──────────────────────────────────────────── */

/**
 * An `href` that leaves the app: a scheme (`https:`, `mailto:`, `tel:`) or a
 * protocol-relative `//host`. A router's link is for paths inside the app, so the
 * provider's `linkComponent` is never handed one of these — they stay a plain `<a>`.
 *
 * NOT external, and so handed to the router link: a path (`/x`, `x`, `?q=1`) and the
 * hash-router form `#/x` — that IS a route in a `HashRouter` app, which maps it to
 * `to="/x"`. A plain in-page anchor (`#section`) is not external either, but it is not
 * a route: see {@link isInPageAnchor}.
 */
export function isExternalHref(href: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href);
}

/**
 * An `href` that only scrolls the current page: `#section` (or a bare `#`). The
 * hash-router form `#/x` is a ROUTE, not an anchor, and is not one of these. A router
 * link must not get an anchor — under a `HashRouter` `#section` would navigate to the
 * path `/section` — so every kit link draws it as a plain `<a>`.
 */
export function isInPageAnchor(href: string): boolean {
  return href.startsWith("#") && !href.startsWith("#/");
}

/**
 * Whether the provider's `linkComponent` (or a kit component's router fallback) draws
 * `href`: an in-app path, `#/x` included — not an external `href`
 * ({@link isExternalHref}) and not an in-page `#anchor` ({@link isInPageAnchor}).
 */
export function isRoutableHref(href: string): boolean {
  return !isExternalHref(href) && !isInPageAnchor(href);
}

/**
 * What draws a kit link to `href`: the component's own `renderLink` when it was given
 * one (it always wins — the caller asked for it by name), else the
 * `<UiKitProvider linkComponent>` for a routable `href` ({@link isRoutableHref}), else
 * `undefined` — a plain `<a>`. The one rule every kit link follows: `https:` /
 * `mailto:` / `//host` and `#section` stay plain anchors; `/x`, `x` and a hash-router
 * `#/x` go to the router link. Every kit link props type is a subset of the anchor
 * attributes `KitLinkProps` describes, which is what makes the cast sound.
 * @internal Shared by the kit's link-bearing components; not part of the barrel.
 */
export function pickLinkRenderer<P>(
  own: ((props: P) => ReactElement) | undefined,
  kitLink: KitLinkComponent | undefined,
  href: string | undefined,
): ((props: P) => ReactElement) | undefined {
  if (own) return own;
  if (!kitLink || href === undefined || !isRoutableHref(href)) return undefined;
  return kitLink as unknown as (props: P) => ReactElement;
}

/** The plain primary click a page navigates on — not a middle click, not ⌘ / Ctrl /
 *  Shift / Alt (new tab, new window, download), and not one a handler already took. */
function isPlainNavigationClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * The `onClick` of a PLAIN `<a>` whose kit link was asked to `replace` (keksdose F1).
 *
 * A router link replaces the history entry itself (it is handed `replace`, see
 * {@link routerLinkNavigation}); a plain `<a>` has no attribute that says so, and the
 * browser's own navigation always pushes. So a plain click is taken over — the caller's
 * `onClick` runs first and may still `preventDefault` — and becomes
 * `location.replace(href)`: the same document load, with Back skipping the one-shot URL.
 * That is the case of `replace` together with `reloadDocument`, or an app with no
 * `linkComponent`. A modified click (new tab) and a `target` other than `_self` are left
 * to the browser: they do not navigate THIS history. Without `replace`, `onClick` comes
 * back untouched.
 * @internal
 */
export function replacingClick(
  onClick: ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined,
  href: string,
  replace: boolean | undefined,
  target?: string,
): ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined {
  if (!replace || (target !== undefined && target !== "" && target !== "_self")) return onClick;
  return (event) => {
    onClick?.(event);
    if (!isPlainNavigationClick(event)) return;
    event.preventDefault();
    documentNavigation.replace(href);
  };
}

/**
 * What a ROUTER link is handed for `replace`: `{ replace: true }` when asked, else
 * nothing at all — so a provider link that spreads its props onto a DOM `<a>` never
 * receives an unknown attribute from a link that did not ask (see `KitLinkProps.replace`).
 * @internal
 */
export function routerLinkNavigation(replace: boolean | undefined): { replace?: true } {
  return replace ? { replace: true } : {};
}

/**
 * Draws `props` through `render` as a component of its own, so a router link's hooks
 * belong to it and not to the kit component calling it — for the kit components that
 * call their own `renderLink` inline and reach the provider's link through here.
 * @internal
 */
export function RenderedKitLink<P>({ render, props }: { render: (props: P) => ReactElement; props: P }) {
  return render(props);
}

/* ── TextLink ─────────────────────────────────────────────────────────────── */

/**
 * `brand` (default) for a link in running text, `muted` for footer and meta links
 * that should not compete with the content, `danger` for a destructive one ("Leave
 * group"), `inherit` for a link that takes its surroundings' colour.
 *
 * `primary` and `secondary` are the body and the secondary text colour, UNDERLINED
 * (keksdose F3): a link that must read as part of the text around it — a name in a
 * list row, a reference in a card's meta line — where `brand` repaints it in the accent
 * and `muted` is a step too light to read as content. `secondary` darkens to the body
 * colour under the pointer, as `muted` does; `primary` has nowhere darker to go, so its
 * underline thickens instead.
 *
 * `warning` is the kit's `--warning` text colour, underlined (kastlan 46): a link inside
 * a `<Tone tone="warning">` sentence or a warning banner, which `brand` would paint in a
 * second hue and `inherit` would leave indistinguishable from the sentence. Like
 * `primary`, it keeps its colour on hover and thickens the underline.
 *
 * The three colours that sit IN the text default to `underline="always"`: with the
 * colour of their surroundings, the underline is the only thing that says "link"
 * (WCAG 1.4.1). An explicit `underline` still wins.
 */
export type TextLinkTone = "brand" | "muted" | "danger" | "inherit" | "primary" | "secondary" | "warning";

/** `hover` (the default for `brand`, `muted`, `danger`, `inherit`): underlined under
 *  the pointer — the idiom all three apps draw. `always` (the default for `primary`,
 *  `secondary`, `warning`) for a link inside prose, where colour alone must not be the
 *  only mark (WCAG 1.4.1). `none` where the context already says "link" (a footer nav). */
export type TextLinkUnderline = "hover" | "always" | "none";

/** The `aria-current` token. `true` on {@link TextLinkProps.current} means `page`. */
export type TextLinkCurrent = "page" | "step" | "location" | "date" | "time" | "true";

/** What {@link TextLinkProps.renderLink} (and the provider's `linkComponent`) is
 *  handed. Spread it onto your router's link — `({ href, ...p }) => <Link to={href} {...p} />`. */
export interface TextLinkRenderProps {
  href: string;
  /** The link's look — keep it, or the tone, underline and focus ring go. */
  className: string;
  children: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLAnchorElement>) => void;
  "aria-current"?: TextLinkCurrent;
  id?: string;
  title?: string;
  /** Present, as `true`, only when the link was given `replace` — see
   *  `KitLinkProps.replace`. Map it to your router's replace; never onto a DOM `<a>`. */
  replace?: boolean;
  [key: `aria-${string}`]: string | boolean | number | undefined;
  [key: `data-${string}`]: unknown;
}

export interface TextLinkProps
  extends Omit<ComponentPropsWithoutRef<"a">, "href" | "children" | "aria-current" | "onClick" | "onKeyDown"> {
  href: string;
  children: ReactNode;
  /** Default `brand`. */
  tone?: TextLinkTone;
  /** Default `always` for `primary`, `secondary` and `warning`, else `hover`. */
  underline?: TextLinkUnderline;
  /**
   * Navigate by replacing the current history entry, so Back does not return to this
   * URL — keksdose F1, a one-shot URL (a confirmation landing, a `?done=1` hop). Handed
   * to the router link as `replace` (see `KitLinkProps.replace` for mapping it); on a
   * plain `<a>` (no `linkComponent`, or `reloadDocument`) a plain click becomes
   * `location.replace(href)`. Ignored on an `external` link, which opens a new tab.
   */
  replace?: boolean;
  /**
   * A plain `<a>` for an in-app `href`: the browser loads the whole document instead of
   * the router swapping the view — keksdose F1, a route served outside the SPA (a file
   * download, a server-rendered page, a logout that must drop every in-memory cache).
   * Wins over `renderLink` and the provider's `linkComponent`: it is the caller saying
   * "not the router" for this one link.
   */
  reloadDocument?: boolean;
  /**
   * The link leaves the app: a plain `<a target="_blank" rel="noopener noreferrer">`
   * (never the router's), an external-link mark after the text (mirrored in RTL), and
   * "opens in a new tab" (`common.opensInNewTab`) read after it — the mark says it
   * only to the eye. kastlan's BWO / BFS source links (rent-increase-calculator-page).
   */
  external?: boolean;
  /**
   * Keep the click (and the Enter that activates the link) from reaching an ancestor —
   * a link in a DataTable row with `onRowClick` goes to its own target instead of
   * running the row's action. kastlan's `CellLink` did this by hand.
   */
  stopPropagation?: boolean;
  /** Mark the link as the current one of a set — `true` is `aria-current="page"`, the
   *  legal footer's link to the page you are on. Drawn in semibold. */
  current?: boolean | TextLinkCurrent;
  /** A Lucide icon before the text, at the text's size — kastlan's "← Back" link. */
  icon?: LucideIcon;
  /** Your router's link for an in-app `href`. Default: the `<UiKitProvider
   *  linkComponent>`, then a plain `<a>`. Ignored on an `external` link. */
  renderLink?: (props: TextLinkRenderProps) => ReactElement;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLAnchorElement>) => void;
  ref?: Ref<HTMLAnchorElement>;
}

const TONE: Record<TextLinkTone, string> = {
  brand: "text-[var(--brand)] hover:text-[var(--brand-hover)]",
  muted: "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
  danger: "text-[var(--danger)] hover:text-[var(--danger-hover)]",
  inherit: "",
  primary: "text-[var(--text-primary)] hover:decoration-2",
  secondary: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
  warning: "text-[var(--warning)] hover:decoration-2",
};

/** The tones whose colour is their surroundings' — underlined by default; see
 *  {@link TextLinkTone}. */
const UNDERLINED_BY_DEFAULT = new Set<TextLinkTone>(["primary", "secondary", "warning"]);

const UNDERLINE: Record<TextLinkUnderline, string> = {
  hover: "no-underline hover:underline",
  always: "underline",
  none: "no-underline",
};

/**
 * The one inline link: a real `<a href>` (middle click, "open in new tab", link
 * semantics) through the app's router for an in-app path, in one of four tones.
 *
 * kastlan draws this link a dozen ways by hand — `EntityLink` and `CellLink` (text-primary,
 * hover underline, one stopping the row click), the legal pages' back link and footer,
 * the feedback page's URL links, the calculator's external sources with a hand-placed
 * ↗ and no word for a screen reader — and the lease wizard's unit step (lease-unit-step)
 * used a raw `<a>` to an in-app route, which reloads the whole app. Here the router
 * link comes from `<UiKitProvider linkComponent>`, set once.
 *
 * Inline, not `inline-flex`: a link inside a sentence must wrap with it. The icons sit
 * on the text's baseline at the text's size, so they scale with whatever type the link
 * is set in. The focus ring is an outline, which follows every line of a wrapped link.
 */
export function TextLink({
  href,
  children,
  tone = "brand",
  underline: underlineProp,
  external = false,
  replace,
  reloadDocument = false,
  stopPropagation = false,
  current,
  icon: Icon,
  renderLink,
  className,
  onClick,
  onKeyDown,
  ref,
  ...rest
}: TextLinkProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const kitLink = useKitLink();
  const underline = underlineProp ?? (UNDERLINED_BY_DEFAULT.has(tone) ? "always" : "hover");
  const ariaCurrent: TextLinkCurrent | undefined =
    current === true ? "page" : current === false ? undefined : current;

  const look = cn(
    "rounded-sm underline-offset-2 transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]",
    TONE[tone],
    UNDERLINE[underline],
    ariaCurrent && "font-semibold",
    className,
  );

  const body = (
    <>
      {Icon && <Icon aria-hidden className="me-1 inline size-[1em] shrink-0 align-[-0.125em]" />}
      {children}
      {external && (
        <>
          <ExternalLink aria-hidden className="ms-1 inline size-[0.85em] align-[-0.1em] rtl:-scale-x-100" />
          {" "}
          <span className="sr-only">({common.opensInNewTab})</span>
        </>
      )}
    </>
  );

  const handleClick: TextLinkRenderProps["onClick"] = stopPropagation
    ? (event) => {
        event.stopPropagation();
        onClick?.(event);
      }
    : onClick;
  const props: TextLinkRenderProps = {
    ...(rest as Partial<TextLinkRenderProps>),
    ref,
    href,
    className: look,
    "aria-current": ariaCurrent,
    onClick: handleClick,
    onKeyDown: stopPropagation
      ? (event) => {
          if (event.key === "Enter") event.stopPropagation();
          onKeyDown?.(event);
        }
      : onKeyDown,
    children: body,
  };

  const render = external || reloadDocument ? undefined : pickLinkRenderer(renderLink, kitLink, href);
  if (render) return <RenderedTextLink render={render} {...props} {...routerLinkNavigation(replace)} />;
  // A plain `<a>` never gets `replace` as an attribute; asked for, it takes the click.
  const plainClick = external ? handleClick : replacingClick(handleClick, href, replace, rest.target);
  const { children: content, ...anchor } = props;
  return (
    <a
      {...anchor}
      href={href}
      onClick={plainClick}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}
    >
      {content}
    </a>
  );
}

/** Calls the link renderer as a component, so a router link's hooks are its own. */
function RenderedTextLink({
  render,
  ...props
}: TextLinkRenderProps & { render: (props: TextLinkRenderProps) => ReactElement }) {
  return render(props);
}
