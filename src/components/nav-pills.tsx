import type { ComponentPropsWithoutRef, ComponentType, MouseEvent, ReactElement, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface NavPillItem<T extends string> {
  value: T;
  label: ReactNode;
  /** Where the pill leads. With one it is a link (see `renderLink`); without, a button
   *  that calls `onSelect`. */
  href?: string;
  /** A Lucide icon (or any component taking a `className`), before the label. */
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Buttons only — a link cannot be disabled. */
  disabled?: boolean;
}

/** What {@link NavPillsProps.renderLink} is handed. Spread it onto your router's link
 *  — `({ href, ...p }) => <Link to={href} {...p} />`. */
export interface NavPillLinkProps {
  href: string;
  className: string;
  children: ReactNode;
  "aria-current": NavPillsCurrent | undefined;
  onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/** The `aria-current` token the current pill carries. */
export type NavPillsCurrent = "page" | "step" | "location" | "true";

export interface NavPillsProps<T extends string> extends Omit<ComponentPropsWithoutRef<"nav">, "children" | "onSelect"> {
  items: NavPillItem<T>[];
  /** The pill that is current. `null` or a value not in `items`: none is. */
  current: T | null;
  /** Called with the pill's value on a click — of a button, and of a link too (before
   *  the router follows it), for a caller that keeps the choice in state as well. */
  onSelect?: (value: T) => void;
  /** Your router's link. Default `<a>`. The API `Breadcrumbs`, `Chip` and `ListItem` share. */
  renderLink?: (props: NavPillLinkProps) => ReactElement;
  /** What `aria-current` says on the current pill. Default `page` where the items
   *  are links and `true` where they are buttons (keksdose's swipe-surface picker
   *  switches a panel on the same page, which is not a page). */
  currentType?: NavPillsCurrent;
  /** `sm`: 12px pills — the compact size of a {@link ToggleGroup}. Default `md`. */
  size?: "sm" | "md";
  /** Render a `<nav>` landmark (default) or a plain `<div role="group">` for a picker
   *  that is not the page's navigation. Name either with `aria-label`. */
  landmark?: boolean;
  /** Classes for every pill. */
  itemClassName?: string;
}

// The pill is a ToggleGroup segment's (`rounded`, `px-3 py-1.5`, the inverse fill for
// the current one), so a strip of these beside a segmented control reads as the same
// family. Unlike the segments, a pill never truncates: the strip WRAPS instead.
const PILL =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] [&_svg]:size-4 [&_svg]:shrink-0";
const PILL_SM = "gap-1 px-2 py-1 text-xs [&_svg]:size-3.5";
const PILL_CURRENT = "bg-[var(--bg-inverse)] text-[var(--text-inverse)]";
const PILL_IDLE = "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]";
const PILL_DISABLED = "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-[var(--text-secondary)]";

/**
 * A set of links or buttons that WRAPS onto as many rows as it needs, the current one
 * filled and marked `aria-current`.
 *
 * keksdose's swipe-settings card (swipe-settings-card:152) hand-rolled this: four
 * surface names that do not fit a 406px phone, and a sideways scroll would hide the
 * ones that do not fit behind a gesture nothing announces (live #332: *"Have the tabs
 * in more rows, rather than scrolling sideways"*). It is not {@link Tabs} with `wrap`
 * because its items are not tabs: a `role="tab"` promises a tabpanel, a roving tab
 * stop and arrow keys, and a set of links to pages (or of buttons that switch the rest
 * of a card) promises none of that. So every pill is its own tab stop, the set is a
 * list (a screen reader hears "list, 4 items"), and "current" is `aria-current` — the
 * attribute a link to where you already are carries.
 */
export function NavPills<T extends string>({
  items,
  current,
  onSelect,
  renderLink,
  currentType,
  size = "md",
  landmark = true,
  itemClassName,
  className,
  ...rest
}: NavPillsProps<T>) {
  const Root = landmark ? "nav" : "div";
  return (
    <Root {...rest} role={landmark ? undefined : "group"} className={cn("min-w-0", className)}>
      <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
        {items.map((item) => {
          const isCurrent = item.value === current;
          const Icon = item.icon;
          const pillClass = cn(
            PILL,
            size === "sm" && PILL_SM,
            isCurrent ? PILL_CURRENT : PILL_IDLE,
            item.disabled && item.href === undefined && PILL_DISABLED,
            itemClassName,
          );
          const children = (
            <>
              {Icon && <Icon aria-hidden />}
              {item.label}
            </>
          );
          let pill: ReactNode;
          if (item.href !== undefined) {
            const props: NavPillLinkProps = {
              href: item.href,
              className: pillClass,
              children,
              "aria-current": isCurrent ? (currentType ?? "page") : undefined,
              onClick: () => onSelect?.(item.value),
            };
            pill = renderLink ? (
              renderLink(props)
            ) : (
              <a href={props.href} className={props.className} aria-current={props["aria-current"]} onClick={props.onClick}>
                {props.children}
              </a>
            );
          } else {
            pill = (
              <button
                type="button"
                disabled={item.disabled}
                aria-current={isCurrent ? (currentType ?? "true") : undefined}
                onClick={() => onSelect?.(item.value)}
                className={pillClass}
              >
                {children}
              </button>
            );
          }
          return (
            <li key={item.value} className="flex">
              {pill}
            </li>
          );
        })}
      </ul>
    </Root>
  );
}
