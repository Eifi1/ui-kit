import { cn } from "../lib/cn";
import { NavPills } from "./nav-pills";
import type { NavPillItem, NavPillLinkProps } from "./nav-pills";
import type { ReactElement, Ref } from "react";

/** @deprecated 0.52 — `NavPillsProps` with `layout="scroll"`, what SectionNav wraps; removed in
 *  0.53 (no app renders SectionNav: refactor audit 2026-10-30, MOD-5). */
export interface SectionNavProps<T extends string> {
  /** The section's pages, each with its `href` (a pill without one is a button that
   *  calls `onSelect`). Labels short: the row is one line. */
  items: NavPillItem<T>[];
  /** The page that is open. `null`: none of them. */
  current: T | null;
  /** The section's name — the landmark's accessible name ("Accounting"). */
  label: string;
  /** Called with a pill's value on a click, before the router follows its link. */
  onSelect?: (value: T) => void;
  /** Your router's link. Default: the `<UiKitProvider linkComponent>`, then `<a>`. */
  renderLink?: (props: NavPillLinkProps) => ReactElement;
  /** Default `true`: only below `md`, where the sidebar that lists the same pages is
   *  gone. `false` shows it at every width. */
  phoneOnly?: boolean;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/**
 * The pages of a section on a phone, as one row of pills under the page title (0.49
 * KIT-6) — kastlan's section pills, which each section page drew by hand.
 *
 * On a desktop the sidebar lists a group's pages; on a phone the AppShell's bar holds
 * the groups, and a group's pages are a sheet away. This row puts them on the page
 * itself: {@link NavPills} with `layout="scroll"` — one line that scrolls sideways, faded
 * where it is cut, the open page scrolled into view (the row only, never the page). At
 * most 48 px high: 44 px pills, the touch target a finger needs, and 2 px above and
 * below. Each pill is a link (`aria-current="page"` on the open one) and its own tab
 * stop; the row is a `<nav>` named by `label`.
 *
 * Place it right under the page's title (`PageHeader`); the AppShell's own row of a
 * group's pages above the bar (`mobileSubNav`) is the shell-wide alternative — use one,
 * not both, for the same pages.
 *
 * @deprecated 0.52 — `<NavPills layout="scroll" itemClassName="min-h-11 focus-visible:ring-inset"
 * className="md:hidden">`, the same row; removed in 0.53. kastlan, whose section pills it
 * was made for (0.49 KIT-6), never adopted it: no app renders it (refactor audit
 * 2026-10-30, MOD-5).
 */
export function SectionNav<T extends string>({
  items,
  current,
  label,
  onSelect,
  renderLink,
  phoneOnly = true,
  className,
  ref,
}: SectionNavProps<T>) {
  return (
    <NavPills
      ref={ref}
      aria-label={label}
      items={items}
      current={current}
      onSelect={onSelect}
      renderLink={renderLink}
      layout="scroll"
      // The ring inside the pill: the row scrolls, so it clips what leaves its box.
      itemClassName="min-h-11 focus-visible:ring-inset"
      className={cn("py-0.5 large:py-0", phoneOnly && "md:hidden", className)}
    />
  );
}
