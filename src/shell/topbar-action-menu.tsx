import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "../lib/cn";
import { HoverMenu } from "../components/hover-menu";
import { TOPBAR_MENU_ITEM_CLASS, TOPBAR_TRIGGER_CLASS } from "./topbar-controls";

/**
 * One row of a {@link TopBarActionMenu}. An `action` (default) runs `onSelect`, a
 * `link` navigates via react-router, and a `divider` draws a rule. Non-divider
 * rows close the menu automatically when chosen. `kind` may be omitted for
 * actions, keeping the common case terse.
 */
export type TopBarMenuEntry =
  | { kind?: "action"; key: string; icon?: ReactNode; label: ReactNode; onSelect: () => void }
  | { kind: "link"; key: string; icon?: ReactNode; label: ReactNode; to: string }
  | { kind: "divider"; key: string };

/**
 * A top-bar icon button that opens a {@link HoverMenu} of actions and/or links,
 * with an optional uppercase heading and divider rules. Generic glue over the
 * shared top-bar chrome — e.g. the feedback launcher or the guided-tours menu —
 * so those call sites describe their rows as data instead of rebuilding the
 * trigger + list markup. For a checkmarked value-switcher use
 * {@link OptionSwitcherMenu} instead.
 */
export function TopBarActionMenu({
  icon,
  ariaLabel,
  heading,
  entries,
  panelClassName,
}: {
  icon: ReactNode;
  ariaLabel: string;
  heading?: string;
  entries: TopBarMenuEntry[];
  panelClassName?: string;
}) {
  return (
    <HoverMenu
      ariaLabel={ariaLabel}
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} aria-label={ariaLabel} className={TOPBAR_TRIGGER_CLASS}>
          {icon}
        </button>
      )}
    >
      {(close) => (
        <ul className={cn("py-1", panelClassName)}>
          {heading && (
            <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {heading}
            </li>
          )}
          {entries.map((entry) => {
            if (entry.kind === "divider") {
              return <li key={entry.key} className="my-1 border-t border-slate-100 dark:border-slate-800" />;
            }
            const content = (
              <span className="flex items-center gap-2">
                {entry.icon}
                {entry.label}
              </span>
            );
            return (
              <li key={entry.key}>
                {entry.kind === "link" ? (
                  <Link to={entry.to} onClick={close} className={TOPBAR_MENU_ITEM_CLASS}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      entry.onSelect();
                      close();
                    }}
                    className={TOPBAR_MENU_ITEM_CLASS}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </HoverMenu>
  );
}
