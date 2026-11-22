import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ComponentType, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { useInRouterContext, useLocation } from "react-router";
import { Menu } from "lucide-react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/refs";
import { useBreakpoint } from "../hooks/use-breakpoint";
import { useKitLabels, useKitLink, type LabelOverride } from "../i18n/kit-labels";
import { FOCUS_RING } from "../components/focus-ring";
import { HoverMenu } from "../components/hover-menu";
import { MenuItem, type MenuItemLinkProps } from "../components/menu-item";
import type { NavPillLinkProps } from "../components/nav-pills";
import { pickLinkRenderer, RenderedKitLink } from "../components/text-link";
import { Tooltip } from "../components/tooltip";
import { TOPBAR_TRIGGER_CLASS } from "./topbar-controls";
import { DEFAULT_TOP_BAR_NAV_LABELS, type TopBarNavLabels } from "./top-bar-nav-labels";

// Defined in ./top-bar-nav-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_TOP_BAR_NAV_LABELS };
export type { TopBarNavLabels };

/** One link of a {@link TopBarNav}. */
export interface TopBarNavItem {
  /** Where it leads — an in-app path, or an external URL (a plain `<a>` then). */
  href: string;
  /** The link's words. Keep it short: the row folds into the menu when one does not fit. */
  label: ReactNode;
  /** A Lucide icon (or any component taking a `className`), before the label in the MENU
   *  only. The row beside the brand is words. */
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

export interface TopBarNavProps extends Omit<ComponentPropsWithoutRef<"nav">, "children"> {
  items: readonly TopBarNavItem[];
  /**
   * Which link is the page that is open. Default: by path prefix — the link whose `href`
   * is the current path or the start of it (`/experiments` for `/experiments/42`), the
   * longest such when several are; `/` only on `/` itself. The path is the router's
   * (react-router's `useLocation`), else the window's, else {@link currentPath}.
   */
  isActive?: (href: string) => boolean;
  /** The path the prefix rule compares against, when it is not the router's or the
   *  window's — a server render, a test. */
  currentPath?: string;
  /** Your router's link, the API `NavPills` takes — `({ href, ...p }) => <Link to={href}
   *  {...p} />`. Default: the `<UiKitProvider linkComponent>` (for an in-app `href`), then
   *  `<a>`. Used for the links in the row and in the menu alike. */
  renderLink?: (props: NavPillLinkProps) => ReactElement;
  /** Called with the link's `href` on a click, before the router follows it. */
  onNavigate?: (href: string) => void;
  labels?: LabelOverride<TopBarNavLabels>;
  /** The `<nav>`. */
  ref?: Ref<HTMLElement>;
}

/**
 * The words beside the brand: one plain link per page in the body text colour, wide gaps,
 * no pills; the open page in `--brand`, underlined 2 px below the text. The same classes
 * draw the hidden measuring copy, so what is measured is what would be shown.
 */
const ROW = "flex items-center gap-x-6 ps-4";
const LINK = `whitespace-nowrap rounded-sm py-1.5 text-sm font-medium text-primary decoration-2 underline-offset-[6px] hover:text-brand ${FOCUS_RING}`;
const LINK_ACTIVE = "text-brand underline";

/** "/a/b/" → "/a/b"; the query and the hash do not take part in "which page is open". */
function pathOf(href: string): string {
  const path = href.split(/[?#]/)[0] ?? "";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** The index of the link the prefix rule marks, or -1. */
function activeByPrefix(items: readonly TopBarNavItem[], current: string): number {
  const here = pathOf(current);
  let best = -1;
  let bestLength = -1;
  items.forEach((item, i) => {
    if (!item.href.startsWith("/")) return;
    const href = pathOf(item.href);
    const match = href === "/" ? here === "/" : here === href || here.startsWith(`${href}/`);
    if (match && href.length > bestLength) {
      best = i;
      bestLength = href.length;
    }
  });
  return best;
}

function useRouterPath(): string {
  return useLocation().pathname;
}

function useWindowPath(): string {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

/**
 * The page links of a site's top bar, for `TopBar`'s `nav` slot — Staunlabor's public
 * site, after anyplot.ai: plain words right after the brand, the open page in the brand
 * colour and underlined, no pills and no icons.
 *
 * When the links do not fit beside the actions — below `md` always, and above it whenever
 * the row is wider than the room between the brand and the actions (a fourth link, a long
 * Hungarian or French label, Large text) — ALL of them move into a menu button with a
 * dropdown under it. Never a split: half the pages in the bar and half behind a button
 * hides which ones are where. The room is MEASURED: a hidden copy of the row is compared
 * with the `<nav>`'s width, which is the bar's free space and does not change with the
 * choice, so the row cannot flip back and forth. Brand mark, menu, language and theme fit
 * a 360 px phone.
 *
 * The dropdown is the top bar's `HoverMenu`: arrow keys, Escape as a layer of the kit's
 * Escape stack (inside a dialog it closes the menu, not the dialog), focus back on the
 * button. Its rows are links with the open page `aria-current="page"` and ticked.
 *
 * Inside a `<nav>` landmark named by `labels.navigation` ("Pages") or an `aria-label`.
 */
export function TopBarNav({
  items,
  isActive,
  currentPath,
  renderLink,
  onNavigate,
  labels: labelsProp,
  className,
  ref,
  "aria-label": ariaLabel,
  ...rest
}: TopBarNavProps) {
  const labels = useKitLabels("topBarNav", DEFAULT_TOP_BAR_NAV_LABELS, labelsProp);
  const kitLink = useKitLink();
  // Whether a Router is around does not change during the bar's life, so which hook runs
  // is stable from render to render (use-table-state's rule).
  const usePath = useInRouterContext() ? useRouterPath : useWindowPath;
  const path = usePath();
  const here = currentPath ?? path;
  const active = isActive
    ? items.map((item) => isActive(item.href))
    : items.map((_, i, all) => i === activeByPrefix(all, here));

  const phone = useBreakpoint("max-md");
  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const setNav = useMemo(() => mergeRefs(navRef, ref), [ref]);
  const [fits, setFits] = useState(true);
  useLayoutEffect(() => {
    const nav = navRef.current;
    const row = measureRef.current;
    if (!nav || !row || typeof ResizeObserver === "undefined") return;
    const widths = new Map<Element, number>();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        widths.set(entry.target, entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
      }
      const room = widths.get(nav);
      const need = widths.get(row);
      // Unmeasured (display: none, no layout yet): keep the last answer.
      if (room === undefined || need === undefined || room <= 0) return;
      setFits(need <= room);
    });
    observer.observe(nav);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);
  const folded = phone || !fits;

  /** One link of the row: the caller's `renderLink`, else the provider's, else `<a>`. */
  const link = (item: TopBarNavItem, isCurrent: boolean) => {
    const props: NavPillLinkProps = {
      href: item.href,
      className: cn(LINK, isCurrent && LINK_ACTIVE),
      children: item.label,
      "aria-current": isCurrent ? "page" : undefined,
      onClick: () => onNavigate?.(item.href),
    };
    const kit = pickLinkRenderer<NavPillLinkProps>(undefined, kitLink, item.href);
    if (renderLink) return renderLink(props);
    if (kit) return <RenderedKitLink render={kit} props={props} />;
    return (
      <a href={props.href} className={props.className} aria-current={props["aria-current"]} onClick={props.onClick}>
        {props.children}
      </a>
    );
  };

  return (
    <nav
      {...rest}
      ref={setNav}
      aria-label={ariaLabel ?? labels.navigation}
      data-folded={folded ? "" : undefined}
      className={cn("relative flex min-w-0 flex-1 items-center", className)}
    >
      {/* The row as it would be drawn, never seen: its width against the nav's is the whole
          decision. Clipped to nothing, so it widens no scroll area. */}
      <div aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
        <div ref={measureRef} data-top-bar-nav-measure="" className={cn(ROW, "w-max")}>
          {items.map((item) => (
            <span key={item.href} className={LINK}>
              {item.label}
            </span>
          ))}
        </div>
      </div>
      {folded ? (
        <HoverMenu
          aria-label={labels.menu}
          align="start"
          panelClassName="w-max"
          trigger={({ toggle }) => (
            // The name in the kit's Tooltip, as TopBarActionMenu's icon triggers: in a
            // fragment, so the bubble is not a description repeating the name.
            <Tooltip label={labels.menu} portal>
              <>
                <button type="button" onClick={toggle} aria-label={labels.menu} className={TOPBAR_TRIGGER_CLASS}>
                  <Menu className="size-5" aria-hidden />
                </button>
              </>
            </Tooltip>
          )}
        >
          {(close) => (
            <ul className="py-1">
              {items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <MenuItem
                      href={item.href}
                      current={active[i]}
                      leading={Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : undefined}
                      onClick={() => {
                        onNavigate?.(item.href);
                        close();
                      }}
                      renderLink={
                        renderLink
                          ? (p: MenuItemLinkProps) =>
                              renderLink({
                                href: p.href,
                                className: p.className,
                                children: p.children,
                                "aria-current": p["aria-current"],
                                onClick: (e: MouseEvent<HTMLAnchorElement>) => p.onClick?.(e),
                              })
                          : undefined
                      }
                    >
                      {item.label}
                    </MenuItem>
                  </li>
                );
              })}
            </ul>
          )}
        </HoverMenu>
      ) : (
        <ul className={cn("m-0 list-none p-0", ROW)}>
          {items.map((item, i) => (
            <li key={item.href} className="flex">
              {link(item, active[i])}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
