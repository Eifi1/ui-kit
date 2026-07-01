import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tooltip } from "../components/tooltip";

export interface AppShellNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Passed to NavLink's `end` (exact match). Defaults to true. */
  end?: boolean;
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
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(collapseStorageKey) === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(collapseStorageKey, collapsed ? "1" : "0");
    }
  }, [collapsed, collapseStorageKey]);

  return (
    <div className="flex flex-col min-h-screen md:h-dvh md:overflow-hidden">
      {topBar}
      <div className="flex flex-1 min-h-0">
        <aside
          className={`hidden md:flex md:flex-col md:sticky md:top-12 md:self-start md:h-[calc(100vh-3rem)] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-[width] duration-200 ease-out overflow-hidden ${
            collapsed ? "md:w-14" : "md:w-60"
          }`}
        >
          <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
            {nav.map((item) => {
              const link = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 min-h-9 ${
                      collapsed ? "justify-center px-2" : "px-3"
                    } py-2 rounded-md text-sm ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`
                  }
                  end={item.end ?? true}
                >
                  <span className="relative shrink-0">
                    <item.icon className="size-4" />
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
              return collapsed ? (
                <Tooltip key={item.to} label={item.label} side="right" portal className="block">
                  {link}
                </Tooltip>
              ) : (
                link
              );
            })}
          </nav>
          {sidebarFooter?.(collapsed)}
          <div className="border-t border-slate-200 dark:border-slate-800 p-2">
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
          <main className="flex-1 max-w-full overflow-x-clip pb-20 md:pb-0 md:min-h-0 md:overflow-y-auto">
            {children}
          </main>
          {footer}
        </div>
      </div>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800 grid"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? true}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 text-[11px] gap-0.5 ${
                isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
              }`
            }
          >
            <span className="relative">
              <item.icon className="size-5" />
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
