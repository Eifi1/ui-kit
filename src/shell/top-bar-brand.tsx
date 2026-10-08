import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { cn } from "../lib/cn";
import { FOCUS_RING } from "../components/focus-ring";
import { useKitLink } from "../i18n/kit-labels";
import { pickLinkRenderer } from "../components/text-link";
import type { KitLinkComponent, KitLinkProps } from "../i18n/kit-labels";

const routerLink: KitLinkComponent = ({ href, ...p }) => <RouterLink to={href} {...p} />;
const plainLink: KitLinkComponent = ({ children, ...p }) => <a {...p}>{children}</a>;

/** Below which width only the logo shows. The name stays in the link's accessible
 *  name at every width. */
const COLLAPSE = {
  sm: "sr-only sm:not-sr-only sm:truncate",
  md: "sr-only md:not-sr-only md:truncate",
} as const;

export interface TopBarBrandProps extends Omit<KitLinkProps, "href" | "children"> {
  /** The brand mark — an SVG, sized by the caller or `h-6 w-auto` by default. */
  logo: ReactNode;
  /** The product name beside the logo, and the link's accessible name. */
  name: ReactNode;
  /** Where the brand links to. Default `/`. */
  to?: string;
  /** Hide the name below `sm` (default) or `md`; `false` always shows it. It is
   *  visually hidden, not removed, so the link keeps its name on a phone. */
  collapseBelow?: "sm" | "md" | false;
  /** The app's router link for this one link. Default: the provider's
   *  `linkComponent`, else react-router's `Link`. */
  renderLink?: KitLinkComponent;
}

/**
 * The top bar's home link: logo + product name, collapsing to the logo on a phone.
 * Pass it as {@link TopBar}'s `brand`.
 *
 * kastlan's (top-bar.tsx:66) hid nothing and truncated the name instead — on a phone
 * with five actions that left "Ka…" beside the logo — and needed an `aria-label`
 * because the name could be cut. Here the name is `sr-only` below the breakpoint, so
 * the logo is the whole visible link there and the name is still what it is called.
 */
export function TopBarBrand({
  logo,
  name,
  to = "/",
  collapseBelow = "sm",
  renderLink,
  className,
  ...rest
}: TopBarBrandProps) {
  const kitLink = useKitLink();
  return (
    <RenderedLink
      // The kit's one link rule (`pickLinkRenderer`): an external `to` or an in-page
      // `#anchor` is a plain `<a>`, never the router's link.
      render={pickLinkRenderer(renderLink, kitLink ?? routerLink, to) ?? plainLink}
      {...rest}
      href={to}
      className={cn(
        // `relative` contains the sr-only name.
        "relative flex min-w-0 items-center gap-2 rounded-md font-semibold text-[var(--text-primary)] hover:opacity-80",
        FOCUS_RING,
        className,
      )}
    >
      <span aria-hidden className="flex shrink-0 items-center [&_svg]:h-6 [&_svg]:w-auto">
        {logo}
      </span>
      <span className={collapseBelow ? COLLAPSE[collapseBelow] : "truncate"}>{name}</span>
    </RenderedLink>
  );
}

/** Calls the link renderer as a component, so a router link's hooks are its own. */
function RenderedLink({ render, ...props }: KitLinkProps & { render: KitLinkComponent }) {
  return render(props);
}
