import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { readStored, writeStored } from "../lib/safe-storage";
import { Tooltip } from "../components/tooltip";
import { useAnchoredRect } from "../hooks/use-anchored-rect";
import { useEscapeKey } from "../hooks/use-dismiss";

export interface AppShellSubItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Passed to NavLink's `end` (exact match). Defaults to true. */
  end?: boolean;
}

export interface AppShellNavItem {
  to: string;
  label: string;
  /** Optional shorter label for the MOBILE BOTTOM BAR only (the sidebar, its
   *  tooltips and any palette built on this list keep `label`).
   *
   *  The bar divides the viewport into `nav.length` equal cells, so a label's room
   *  shrinks with every entry added — at six entries on a 406 px phone that is ~67 px,
   *  and "Import & Export" wrapped to two lines and pushed the row taller than its
   *  neighbours (keksdose feedback live #210). A per-item override is better than
   *  shortening the real label, which the sidebar has ample room for and which is the
   *  name the rest of the product uses. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Passed to NavLink's `end` (exact match). Defaults to true. */
  end?: boolean;
  /** Optional `data-tour` value rendered on this item's link (both the desktop
   *  sidebar and the mobile bottom bar), so a guided tour can spotlight ONE nav
   *  entry precisely instead of matching by href (feedback #338). */
  dataTour?: string;
  /** Optional sub-items. When present, hovering (or focusing) the item opens a
   *  flyout to the right of the sidebar with a header (this item's label) and the
   *  sub-items as icon + title links. Works collapsed or expanded; the mobile
   *  bottom bar ignores sub-items and links to `to`. */
  items?: AppShellSubItem[];
}

interface AppShellProps {
  /** Navigation entries — shared by the desktop sidebar and mobile bottom bar. */
  nav: AppShellNavItem[];
  /** The composed top bar (e.g. the shared TopBar with app-owned actions). */
  topBar: ReactNode;
  /** Main content — typically the router `<Outlet />`. */
  children: ReactNode;
  /** Desktop-only footer rendered below the content (hidden on mobile). */
  footer?: ReactNode;
  /** Extra sidebar content above the collapse toggle (e.g. a version link).
   *  Receives the collapsed state so it can render compact vs. full. */
  sidebarFooter?: (collapsed: boolean) => ReactNode;
  /** localStorage key for the persisted collapse state. */
  collapseStorageKey?: string;
  collapseLabel?: string;
  expandLabel?: string;
}

/**
 * The responsive application shell: a top bar, a collapsible desktop sidebar
 * (icon-only when collapsed, with tooltips), a mobile bottom nav bar, the main
 * content area, and an optional desktop footer. Router-aware via react-router
 * `NavLink`; domain-free — nav items, brand, footer and the top bar's actions
 * are all supplied by the app.
 */
export function AppShell({
  nav,
  topBar,
  children,
  footer,
  sidebarFooter,
  collapseStorageKey = "appLayout.sidebarCollapsed",
  collapseLabel = "Collapse sidebar",
  expandLabel = "Expand sidebar",
}: AppShellProps) {
  // Through the guarded helpers, not `window.localStorage` directly. The read runs
  // inside a `useState` initialiser — i.e. during render of the top-level shell — and
  // `localStorage` THROWS where site data is blocked (Safari private browsing, a
  // partitioned webview). Unguarded, that was not a lost sidebar preference: nothing
  // in the application mounted at all.
  const [collapsed, setCollapsed] = useState(() => readStored(collapseStorageKey) === "1");
  useEffect(() => {
    writeStored(collapseStorageKey, collapsed ? "1" : "0");
  }, [collapsed, collapseStorageKey]);

  return (
    <div className="flex flex-col min-h-screen md:h-dvh md:overflow-hidden">
      {topBar}
      <div className="flex flex-1 min-h-0">
        <aside
          className={`hidden md:flex md:flex-col md:sticky md:top-12 md:self-start md:h-[calc(100vh-3rem)] border-r border-[var(--border)] bg-[var(--bg-surface)] transition-[width] duration-200 ease-out overflow-hidden ${
            collapsed ? "md:w-14" : "md:w-60"
          }`}
        >
          {/* The `<nav>` is flex-1 so it fills the sidebar's height (with empty
              space below the items); the data-tour marker goes on the INNER,
              fit-content wrapper so the guided-tour spotlight hugs the actual nav
              items instead of the whole tall column (feedback #322). The marker
              also tags the mobile bottom bar below; the tour targets
              `[data-tour="nav"]` and resolves to whichever is visible (#313). */}
          <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden">
            <div data-tour="nav" className="space-y-1">
              {nav.map((item) => (
                <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </nav>
          {sidebarFooter?.(collapsed)}
          <div className="border-t border-[var(--border)] p-2">
            {collapsed ? (
              <Tooltip label={expandLabel} side="right" portal className="block">
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  aria-label={expandLabel}
                  className="flex w-full items-center justify-center min-h-9 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <PanelLeftOpen className="size-4 shrink-0" />
                </button>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label={collapseLabel}
                className="flex w-full items-center gap-3 min-h-9 px-3 py-2 rounded-md text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <PanelLeftClose className="size-4 shrink-0" />
                <span className="truncate">{collapseLabel}</span>
              </button>
            )}
          </div>
        </aside>

        {/* Content column beside the sidebar. main grows to fill so the footer
            sits at the bottom — at the viewport edge when content is short,
            beside the sidebar rather than under it. */}
        <div className="flex flex-1 flex-col min-w-0 md:min-h-0">
          {/* `scrollbar-gutter: stable` reserves the scrollbar's track whether or
              not it is currently needed. Without it this element — the app's only
              scroll container from md up — narrows its own client box by the
              scrollbar width the moment a page's content outgrows it, and widens
              it again when the next page fits. Every centred `mx-auto` container
              inside then jumps sideways by half a scrollbar, and any fluid-width
              content changes width outright. Keksdose feedback #403 caught it as
              "slight width increase/decrease" when switching to the notifications
              settings section and back: that section is the only one tall enough
              to scroll. Platform-dependent, which is why it is easy to miss —
              overlay scrollbars (macOS, most Linux builds) take no layout space,
              classic ones (Windows) take ~15px.

              `both-edges`, not the bare `stable`: a one-sided reservation keeps the
              width stable but moves the middle. On a page short enough not to
              scroll, nothing is painted into the reserved track, so every centred
              `mx-auto` container sits half a scrollbar left of the optical centre
              and every full-bleed child stops ~15px short on the right. Keksdose
              feedback #491 (/settings#data) and #498 (/budgets) both reported it as
              "the left boundary looks smaller / cut off compared to the right" on
              the one element per page whose frame is a saturated colour — the rose
              destructive-action cards. Reserving the track on both edges keeps the
              content centred whether or not the scrollbar is showing. */}
          <main className="flex-1 max-w-full overflow-x-clip pb-20 md:pb-0 md:min-h-0 md:overflow-y-auto md:[scrollbar-gutter:stable_both-edges]">
            {children}
          </main>
          {footer}
        </div>
      </div>

      <nav
        data-tour="nav"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border)] grid"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? true}
            data-tour={item.dataTour}
            className={({ isActive }) =>
              // The active page needs a clear marker, not just a subtle text
              // shade (feedback #327): brand-accent icon + label, bolder weight,
              // and a top accent bar spanning the cell so it reads at a glance.
              cn(
                "relative flex flex-col items-center justify-center py-2 text-[11px] gap-0.5 transition-colors",
                "before:absolute before:content-[''] before:inset-x-4 before:top-0 before:h-0.5 before:rounded-full before:transition-colors",
                isActive
                  ? "font-semibold text-[var(--brand)] before:bg-[var(--brand)]"
                  : "text-slate-500 dark:text-slate-400 before:bg-transparent",
              )
            }
          >
            <span className="relative">
              <item.icon className="size-5" />
            </span>
            {/* One line, always. `truncate` is the backstop for the case a
                `shortLabel` was not supplied (or a translation is longer than its
                author expected): an ellipsis in one cell is a far smaller problem
                than a bar whose rows are different heights. */}
            <span className="max-w-full truncate px-0.5">
              {item.shortLabel ?? item.label}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

const navLinkClass = (collapsed: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 min-h-9 ${collapsed ? "justify-center px-2" : "px-3"} py-2 rounded-md text-sm ${
      isActive
        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

/** A single desktop sidebar entry. Plain link (with a tooltip when collapsed) —
 *  unless it has sub-items, in which case hovering/focusing opens a flyout. */
function SidebarNavItem({ item, collapsed }: { item: AppShellNavItem; collapsed: boolean }) {
  const hasSub = !!item.items?.length;

  const link = (
    <NavLink
      to={item.to}
      end={item.end ?? true}
      data-tour={item.dataTour}
      className={navLinkClass(collapsed)}
      aria-haspopup={hasSub ? "menu" : undefined}
    >
      <span className="relative shrink-0">
        <item.icon className="size-4" />
      </span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && hasSub && <ChevronRight className="size-3.5 shrink-0 opacity-60" />}
    </NavLink>
  );

  if (hasSub) return <SidebarFlyout item={item}>{link}</SidebarFlyout>;
  return collapsed ? (
    <Tooltip label={item.label} side="right" portal className="block">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

// Only ONE sidebar flyout should be on screen at a time. Each open flyout parks its
// "close now" here so the next item to open can dismiss it immediately, instead of
// leaving the previous panel up for the 140ms travel delay while the cursor moves
// down the nav list — which showed two panels at once.
let activeFlyoutClose: (() => void) | null = null;

/**
 * Wraps a nav item that has sub-items: on hover or keyboard focus it opens a
 * portalled flyout to the right of the sidebar (portalled so the sidebar's
 * `overflow-hidden` can't clip it) with the item's label as a header and each
 * sub-item as an icon + title link. A short close delay lets the cursor travel
 * from the item onto the panel; Escape / outside-move close it.
 */
function SidebarFlyout({ item, children }: { item: AppShellNavItem; children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  // Anchor the flyout to the item's right edge; the hook re-measures on
  // scroll/resize (the nav list can scroll).
  const rect = useAnchoredRect(wrapperRef, open);
  const pos = rect ? { top: rect.top, left: rect.right } : null;

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  // Stable identity: the coordinator above holds this so a sibling item can close
  // THIS flyout without waiting out its travel delay.
  const closeNow = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);
  const openMenu = useCallback(() => {
    cancelClose();
    if (activeFlyoutClose && activeFlyoutClose !== closeNow) activeFlyoutClose();
    activeFlyoutClose = closeNow;
    setOpen(true);
  }, [cancelClose, closeNow]);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      if (activeFlyoutClose === closeNow) activeFlyoutClose = null;
    }, 140);
  }, [cancelClose, closeNow]);

  // Close on Escape while open.
  useEscapeKey(() => setOpen(false), open);

  useEffect(
    () => () => {
      cancelClose();
      if (activeFlyoutClose === closeNow) activeFlyoutClose = null;
    },
    [cancelClose, closeNow],
  );

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={openMenu}
      onBlur={scheduleClose}
    >
      {children}
      {open &&
        pos &&
        createPortal(
          <div
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-40 pl-1"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div
              role="menu"
              aria-label={item.label}
              className="min-w-52 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {item.label}
              </div>
              <ul className="py-1">
                {item.items!.map((sub) => (
                  <li key={sub.to}>
                    <NavLink
                      to={sub.to}
                      end={sub.end ?? true}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 px-3 py-2 text-sm",
                          isActive
                            ? "bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                        )
                      }
                    >
                      <sub.icon className="size-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{sub.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
