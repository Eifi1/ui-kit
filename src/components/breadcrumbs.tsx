import { Fragment, useContext, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../lib/cn";
import { FOCUS_RING } from "./focus-ring";
import { useKitLabels, useKitLink, type LabelOverride } from "../i18n/kit-labels";
import { pickLinkRenderer, RenderedKitLink } from "./text-link";
import { DEFAULT_BREADCRUMBS_LABELS } from "./breadcrumbs-labels";
import { PageHeaderTrailContext } from "./page-header-context";

export interface BreadcrumbsLabels {
  /** The `nav` landmark's name — what a screen reader lists it as. */
  label: string;
  /** The "…" button that reveals the levels collapsed away on a phone. */
  showAll: string;
}

// Defined in ./breadcrumbs-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_BREADCRUMBS_LABELS };

export interface BreadcrumbItem {
  label: ReactNode;
  /** Where the crumb leads. A crumb without one is text (a level with no page of its
   *  own). The LAST crumb is the current page and is text whether or not it has one. */
  href?: string;
  /** A stable React key, when `label` is not a string. */
  key?: string;
  /**
   * The app's home entry (0.49 KIT-9). Default: an entry whose `href` is `"/"`. No trail
   * is drawn when only home entries are left — inside a `PageHeader`, or wherever the
   * current entry is hidden (`hideCurrent`): "Home" above a page's title says nothing.
   */
  home?: boolean;
}

/** What {@link BreadcrumbsProps.renderLink} is handed. Spread it onto your router's
 *  link — `({ href, ...p }) => <Link to={href} {...p} />`. */
export interface BreadcrumbLinkProps {
  href: string;
  className: string;
  children: ReactNode;
}

export interface BreadcrumbsProps extends Omit<ComponentPropsWithRef<"nav">, "children"> {
  items: BreadcrumbItem[];
  /** Your router's link. Default: the `<UiKitProvider linkComponent>` (for an in-app
   *  `href`), then `<a>`. The API `Chip`, `StatTile` and `ListItem` share. */
  renderLink?: (props: BreadcrumbLinkProps) => ReactElement;
  /**
   * The mark between crumbs. Default a chevron, mirrored in RTL — a chevron pointing
   * right in a right-to-left trail points back toward where you came from. Supply your
   * own and it is drawn as given (a "/" needs no mirroring).
   */
  separator?: ReactNode;
  /**
   * Collapse the middle on phones (below the `md` breakpoint) into a "…" button, keeping
   * the first crumb and the last {@link keepEnd}. Default `true`. kastlan's trail
   * scrolled sideways on a phone instead, which hides the current page — the one crumb
   * that must never be off-screen.
   */
  collapse?: boolean;
  /** How many crumbs at the end stay visible when collapsed — the current page and its
   *  parent by default (2), because "up one level" is what a phone user reaches for. */
  keepEnd?: number;
  /** Overrides the {@link UiKitProvider}'s `breadcrumbs` labels. */
  labels?: LabelOverride<BreadcrumbsLabels>;
  /**
   * Leave out the last entry, the current page (0.49 KIT-9). The entry before it stays a
   * link, and no entry carries `aria-current`: the page's title names where you are.
   *
   * Default `true` inside a `PageHeader`'s `breadcrumbs` (the title is right below, so
   * the trail would repeat it), `false` elsewhere. With the current entry hidden — and
   * inside a `PageHeader` either way — the trail is drawn only when at least one entry
   * that is not home ({@link BreadcrumbItem.home}) is left, so a trail drawn by the
   * layout above the page shows no lone "Home" link either. `false` keeps the current
   * entry as text with `aria-current="page"`.
   */
  hideCurrent?: boolean;
}

/**
 * The trail from the app's root to this page.
 *
 * `nav` + `ol` + `aria-current="page"` on the last crumb: the WAI breadcrumb pattern,
 * which kastlan's (shared/components/layout/breadcrumbs.tsx) nearly was — a `nav` of
 * `span`s, so a screen reader heard no list, no count, and nothing marking where you
 * are. The collapse is CSS (`hidden md:flex`), so it costs no media-query listener and
 * the server's first paint is already right.
 */
export function Breadcrumbs({
  items: allItems,
  renderLink,
  separator,
  collapse = true,
  keepEnd = 2,
  labels: labelsProp,
  hideCurrent,
  className,
  "aria-label": ariaLabel,
  ...rest
}: BreadcrumbsProps) {
  const host = useContext(PageHeaderTrailContext);
  const labels = useKitLabels("breadcrumbs", DEFAULT_BREADCRUMBS_LABELS, labelsProp);
  const kitLink = useKitLink();
  const [expanded, setExpanded] = useState(false);
  // The "…" button vanishes when pressed; focus goes to the first crumb it revealed,
  // not back to the top of the document.
  const revealedRef = useRef<HTMLLIElement>(null);
  const focusRevealed = useRef(false);
  useEffect(() => {
    if (!expanded || !focusRevealed.current) return;
    focusRevealed.current = false;
    const li = revealedRef.current;
    (li?.querySelector<HTMLElement>("a[href]") ?? li)?.focus();
  }, [expanded]);
  const hides = hideCurrent ?? host?.titled ?? false;
  const shown = hides ? allItems.slice(0, -1) : allItems;
  if (shown.length === 0) return null;
  // A trail of home entries alone repeats nothing worth a line: in a PageHeader, and
  // wherever the current entry is hidden (a layout's trail above the page's title).
  if ((host || hides) && !shown.some((item) => !(item.home ?? item.href === "/"))) return null;
  const items = shown;

  const end = Math.max(1, keepEnd);
  // Crumbs [1, firstKept) are the collapsible middle. Collapsing a single crumb into a
  // "…" saves nothing, so it takes two.
  const firstKept = Math.max(1, items.length - end);
  const collapsible = collapse && !expanded && firstKept - 1 >= 2;
  const isHidden = (i: number) => collapsible && i >= 1 && i < firstKept;

  const sep = (
    <span aria-hidden className="flex shrink-0 items-center text-placeholder">
      {separator ?? <ChevronRight className="size-3.5 rtl:-scale-x-100" />}
    </span>
  );
  // Each crumb is capped (in rem, so the cap grows with the text) and cut with an
  // ellipsis at Normal; from Large up it wraps inside its cap instead (text size §10.17,
  // round 0.34 T1): the list already wraps between crumbs, and a crumb cut to "Inv…" at
  // 150 % names no page.
  const linkClass = cn("block max-w-[14rem] truncate-until-large rounded-sm hover:text-primary", FOCUS_RING);

  return (
    <nav {...rest} aria-label={ariaLabel ?? labels.label} className={cn("min-w-0 text-sm", className)}>
      <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0 text-muted">
        {items.map((item, i) => {
          // With the current entry hidden, the last one shown is a parent: a link.
          const last = !hides && i === items.length - 1;
          const key = item.key ?? (typeof item.label === "string" ? `${i}-${item.label}` : String(i));
          let content: ReactNode;
          if (last) {
            content = (
              <span aria-current="page" className="block max-w-[16rem] truncate-until-large font-medium text-primary">
                {item.label}
              </span>
            );
          } else if (item.href !== undefined) {
            const props: BreadcrumbLinkProps = { href: item.href, className: linkClass, children: item.label };
            const kit = pickLinkRenderer<BreadcrumbLinkProps>(undefined, kitLink, item.href);
            content = renderLink ? (
              renderLink(props)
            ) : kit ? (
              <RenderedKitLink render={kit} props={props} />
            ) : (
              <a href={props.href} className={props.className}>
                {props.children}
              </a>
            );
          } else {
            content = <span className="block max-w-[14rem] truncate-until-large">{item.label}</span>;
          }
          return (
            <Fragment key={key}>
              {collapsible && i === 1 && (
                <li className="flex items-center gap-1.5 md:hidden">
                  {sep}
                  <button
                    type="button"
                    onClick={() => {
                      focusRevealed.current = true;
                      setExpanded(true);
                    }}
                    aria-label={labels.showAll}
                    aria-expanded={false}
                    className={cn("flex items-center rounded-sm px-0.5 hover:text-primary", FOCUS_RING)}
                  >
                    <MoreHorizontal className="size-4" aria-hidden />
                  </button>
                </li>
              )}
              <li
                ref={i === 1 ? revealedRef : undefined}
                // Focusable only as the landing place for a revealed crumb with no link.
                tabIndex={i === 1 && expanded && item.href === undefined ? -1 : undefined}
                className={cn("flex min-w-0 items-center gap-1.5 outline-none", isHidden(i) && "hidden md:flex")}
              >
                {i > 0 && sep}
                {content}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
