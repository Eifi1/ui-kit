import type { ComponentPropsWithoutRef, KeyboardEvent, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLink } from "../i18n/kit-labels";
import type { KitLinkComponent } from "../i18n/kit-labels";

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

/** `brand` (default) for a link in running text, `muted` for footer and meta links
 *  that should not compete with the content, `danger` for a destructive one ("Leave
 *  group"), `inherit` for a link that takes its surroundings' colour. */
export type TextLinkTone = "brand" | "muted" | "danger" | "inherit";

/** `hover` (default): underlined under the pointer — the idiom all three apps draw.
 *  `always` for a link inside prose, where colour alone must not be the only mark
 *  (WCAG 1.4.1). `none` where the context already says "link" (a footer nav). */
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
  [key: `aria-${string}`]: string | boolean | number | undefined;
  [key: `data-${string}`]: unknown;
}

export interface TextLinkProps
  extends Omit<ComponentPropsWithoutRef<"a">, "href" | "children" | "aria-current" | "onClick" | "onKeyDown"> {
  href: string;
  children: ReactNode;
  /** Default `brand`. */
  tone?: TextLinkTone;
  /** Default `hover`. */
  underline?: TextLinkUnderline;
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
};

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
  underline = "hover",
  external = false,
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

  const props: TextLinkRenderProps = {
    ...(rest as Partial<TextLinkRenderProps>),
    ref,
    href,
    className: look,
    "aria-current": ariaCurrent,
    onClick: stopPropagation
      ? (event) => {
          event.stopPropagation();
          onClick?.(event);
        }
      : onClick,
    onKeyDown: stopPropagation
      ? (event) => {
          if (event.key === "Enter") event.stopPropagation();
          onKeyDown?.(event);
        }
      : onKeyDown,
    children: body,
  };

  const render = external ? undefined : pickLinkRenderer(renderLink, kitLink, href);
  if (render) return <RenderedTextLink render={render} {...props} />;
  const { children: content, ...anchor } = props;
  return (
    <a {...anchor} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}>
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
