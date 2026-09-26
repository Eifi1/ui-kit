import { useLayoutEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "../lib/cn";
import { HoverMenu } from "../components/hover-menu";
import { MenuItem } from "../components/menu-item";
import type { MenuItemTone } from "../components/menu-item";
import { TOPBAR_TRIGGER_CLASS } from "./topbar-controls";

/**
 * One row of a {@link TopBarActionMenu}. An `action` (default) runs `onSelect`, a
 * `link` navigates via react-router, and a `divider` draws a rule. Non-divider
 * rows close the menu automatically when chosen. `kind` may be omitted for
 * actions, keeping the common case terse.
 *
 * The rows are {@link MenuItem}s, so they take its options: `tone: "danger"` for the
 * log-out row, `checked` (+ `checkable`) for a choice, `current` for the link to the
 * page already open, `disabled`.
 */
export type TopBarMenuEntry =
  | {
      kind?: "action";
      key: string;
      icon?: ReactNode;
      label: ReactNode;
      trailing?: ReactNode;
      onSelect: () => void;
      tone?: MenuItemTone;
      /** Makes the row a choice (`menuitemradio`, or `menuitemcheckbox` with
       *  `checkable: "checkbox"`) and says whether it is chosen. */
      checked?: boolean;
      checkable?: "radio" | "checkbox";
      disabled?: boolean;
    }
  | {
      kind: "link";
      key: string;
      icon?: ReactNode;
      label: ReactNode;
      trailing?: ReactNode;
      to: string;
      tone?: MenuItemTone;
      /** The link to the page already open: `aria-current="page"` and a check mark. */
      current?: boolean;
      disabled?: boolean;
    }
  | { kind: "divider"; key: string };

/**
 * The non-interactive identity block at the top of an account menu — kastlan's name +
 * role, keksdose's display name + email + role chip. It is text, not a `menuitem`: the
 * arrow keys pass over it.
 */
export interface TopBarMenuHeader {
  /** The first line — the user's name. */
  title: ReactNode;
  /** The muted second line — an email, a role. */
  subtitle?: ReactNode;
  /** Anything below — a role chip. A link or button here stays out of the arrow keys
   *  and in the Tab order, like the footer's. */
  extra?: ReactNode;
}

/** What a control is, as far as `HoverMenu` is concerned, when it lives in the header
 *  or the footer: not a menu row. */
const SECTION_CONTROLS = "a[href]:not([role]),button:not([role])";
const TABBABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]';

/**
 * A header or footer inside the menu panel.
 *
 * `HoverMenu` promotes EVERY role-less button and link in its panel to a `menuitem` out
 * of the Tab order, and turns every list into `role="none"` — right for the rows, wrong
 * for a footer of legal links, which would join the arrow-key cycle and drop out of Tab.
 * So before it looks (a child's layout effect runs before its parent's), the controls
 * in here get their own role spelled out, which `HoverMenu` leaves alone, and any list
 * keeps its list semantics.
 */
function MenuSection({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    for (const c of el.querySelectorAll<HTMLElement>(SECTION_CONTROLS)) {
      c.setAttribute("role", c.tagName === "A" ? "link" : "button");
    }
    for (const l of el.querySelectorAll<HTMLElement>("ul:not([role]),ol:not([role])")) l.setAttribute("role", "list");
    for (const l of el.querySelectorAll<HTMLElement>("li:not([role])")) l.setAttribute("role", "listitem");
  });
  return (
    <li ref={ref} role="none" className={className}>
      {children}
    </li>
  );
}

/**
 * `HoverMenu` closes on any Tab inside the panel — right when Tab leaves it, wrong when
 * Tab is on its way from a row to a footer link, or from one footer link to the next:
 * the panel would unmount under the focus. So a Tab whose next stop is still inside the
 * panel stops here and the browser moves focus; one that leaves reaches `HoverMenu`,
 * which closes.
 */
function keepTabInsidePanel(e: ReactKeyboardEvent<HTMLUListElement>) {
  if (e.key !== "Tab") return;
  const from = e.target as HTMLElement;
  const stops = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el.getAttribute("tabindex") !== "-1",
  );
  const way = e.shiftKey ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING;
  if (stops.some((el) => el !== from && from.compareDocumentPosition(el) & way)) e.stopPropagation();
}

/**
 * A top-bar icon button that opens a {@link HoverMenu} of actions and/or links,
 * with an optional uppercase heading and divider rules. Generic glue over the
 * shared top-bar chrome — e.g. the feedback launcher or the guided-tours menu —
 * so those call sites describe their rows as data instead of rebuilding the
 * trigger + list markup. For a checkmarked value-switcher use
 * {@link OptionSwitcherMenu} instead.
 *
 * It is also the ACCOUNT menu kastlan and keksdose each hand-build on `HoverMenu`: a
 * custom `trigger` (the avatar), a `header` (name + role / email), the rows, and a
 * free-content `footer` (the legal links).
 */
export function TopBarActionMenu({
  icon,
  trigger,
  triggerClassName,
  ariaLabel,
  heading,
  header,
  entries,
  children,
  footer,
  footerLabel,
  align,
  panelClassName,
}: {
  /** The trigger's face for the usual icon button. Ignored when `trigger` is given. */
  icon?: ReactNode;
  /**
   * A face of your own for the trigger — the account menu's `UserAvatar`. It is drawn
   * INSIDE the kit's button, which keeps the wiring: `aria-haspopup`, `aria-expanded`,
   * the toggle, the keyboard. `open` is there for a chevron that turns.
   *
   * The button is named by `ariaLabel` followed by any readable text in the face — a
   * `UserAvatar` `badge` label ("3 unread") reaches a screen reader that way, where an
   * `aria-label` on the button would have hidden it.
   */
  trigger?: (state: { open: boolean }) => ReactNode;
  /** Extra classes for the trigger button — `rounded-full` round an avatar. */
  triggerClassName?: string;
  /** Names the trigger and the menu. */
  ariaLabel: string;
  heading?: string;
  /** A non-interactive identity block above the rows. */
  header?: TopBarMenuHeader;
  entries: TopBarMenuEntry[];
  /**
   * Rows the entry data cannot describe (a `Disclosure` sub-list, an app's own
   * section), after `entries`. Render `<li>`s holding `MenuItem`s or plain controls;
   * `close` shuts the menu.
   */
  children?: (close: () => void) => ReactNode;
  /**
   * Free content below the rows, behind a rule — the legal links. Its links and
   * buttons are NOT menu rows: the arrow keys skip them and Tab reaches them. Pass a
   * function to get `close` for the links' `onClick`.
   */
  footer?: ReactNode | ((close: () => void) => ReactNode);
  /** Wraps the footer in a `<nav>` with this name ("Legal"). Without it, a plain block. */
  footerLabel?: string;
  /** Which edge of the trigger the panel lines up with (see `HoverMenu`). Default `end`. */
  align?: "start" | "end" | "left" | "right";
  panelClassName?: string;
}) {
  return (
    <HoverMenu
      ariaLabel={ariaLabel}
      align={align}
      trigger={({ open, toggle }) =>
        trigger ? (
          <button type="button" onClick={toggle} className={cn(TOPBAR_TRIGGER_CLASS, "relative", triggerClassName)}>
            <span className="sr-only">{ariaLabel}</span>
            {/* The space keeps the name from running into the face's text ("Marcel
                Eifert3 unread"); as a flex item it takes no room. */}
            {" "}
            {trigger({ open })}
          </button>
        ) : (
          <button
            type="button"
            onClick={toggle}
            aria-label={ariaLabel}
            className={cn(TOPBAR_TRIGGER_CLASS, triggerClassName)}
          >
            {icon}
          </button>
        )
      }
    >
      {(close) => {
        const footerBody = typeof footer === "function" ? footer(close) : footer;
        const footerClass =
          "flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)] [&_a:hover]:text-[var(--text-primary)] [&_a]:rounded-sm [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-[var(--brand)]";
        return (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a Tab bubbling up from a row or footer link, see keepTabInsidePanel
          <ul className={cn("py-1", panelClassName)} onKeyDown={keepTabInsidePanel}>
            {header && (
              <MenuSection className="mb-1 border-b border-[var(--border)] px-3 py-2">
                <div className="truncate text-sm font-medium text-[var(--text-primary)]">{header.title}</div>
                {header.subtitle != null && (
                  <div className="truncate text-xs text-[var(--text-muted)]">{header.subtitle}</div>
                )}
                {header.extra != null && <div className="mt-1">{header.extra}</div>}
              </MenuSection>
            )}
            {heading && (
              <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-placeholder)]">
                {heading}
              </li>
            )}
            {entries.map((entry) => {
              if (entry.kind === "divider") {
                return <li key={entry.key} className="my-1 border-t border-[var(--border)]" />;
              }
              return (
                <li key={entry.key}>
                  {entry.kind === "link" ? (
                    <MenuItem
                      href={entry.to}
                      renderLink={({ href, ...p }) => <Link to={href} {...p} />}
                      onClick={close}
                      leading={entry.icon}
                      trailing={entry.trailing}
                      tone={entry.tone}
                      current={entry.current}
                      disabled={entry.disabled}
                    >
                      {entry.label}
                    </MenuItem>
                  ) : (
                    <MenuItem
                      onClick={() => {
                        entry.onSelect();
                        close();
                      }}
                      leading={entry.icon}
                      trailing={entry.trailing}
                      tone={entry.tone}
                      checked={entry.checked}
                      checkable={entry.checkable}
                      disabled={entry.disabled}
                    >
                      {entry.label}
                    </MenuItem>
                  )}
                </li>
              );
            })}
            {children?.(close)}
            {footerBody != null && footerBody !== false && (
              <MenuSection className="mt-1 border-t border-[var(--border)] px-3 py-2">
                {footerLabel ? (
                  <nav aria-label={footerLabel} className={footerClass}>
                    {footerBody}
                  </nav>
                ) : (
                  <div className={footerClass}>{footerBody}</div>
                )}
              </MenuSection>
            )}
          </ul>
        );
      }}
    </HoverMenu>
  );
}
