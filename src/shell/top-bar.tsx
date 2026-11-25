import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * `extends ComponentPropsWithRef<"header">` because this IS the `<header>`, and it is
 * the `sticky top-0` element itself: a consumer cannot wrap it to add an attribute
 * without the sticking moving to the wrapper. The one that matters most is `aria-label`
 * — a `<header>` is a `banner` landmark, and a landmark with no name is how two of them
 * become indistinguishable in a screen reader's landmark list. The `ref` too since 0.34
 * (API-2, refactor audit 2026-10).
 */
export interface TopBarProps extends ComponentPropsWithRef<"header"> {
  brand: ReactNode;
  /** The site's page links, between the brand and the actions — a `TopBarNav` (0.66). The
   *  slot takes the room the two leave, and the actions stay at the end. */
  nav?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * The sticky app header frame: a `brand` slot on the left and an `actions` slot
 * on the right (theme/palette/language controls, account menu, etc.), and between them,
 * for a site with pages of its own, a `nav` slot (0.66, `TopBarNav`). Domain-free
 * — each app composes its own actions from the shared controls plus its own menus.
 */
export function TopBar({ brand, nav, actions, className, ...rest }: TopBarProps) {
  return (
    <header
      {...rest}
      className={cn(
        // z-40 keeps the app header above sticky page content — notably the
        // expanded transaction editor (z-30), which on mobile shares the page
        // scroll and otherwise slid over the header while scrolling (feedback
        // #320). Modals/tour (z-50/60) still sit above it.
        "sticky top-0 z-40 flex h-12 items-center justify-between gap-2 border-b border-subtle bg-surface px-3 md:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">{brand}</div>
      {nav != null && nav !== false && <div className="flex min-w-0 flex-1 items-center">{nav}</div>}
      <div className="flex items-center gap-1">{actions}</div>
    </header>
  );
}
