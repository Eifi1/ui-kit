import { useId, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "../lib/cn";
import { HoverMenu } from "../components/hover-menu";
import { MenuItem } from "../components/menu-item";
import type { MenuItemTone } from "../components/menu-item";
import { StatusDot } from "../components/status-dot";
import type { UserAvatarBadge } from "../components/user-avatar";
import { TOPBAR_TRIGGER_CLASS } from "./topbar-controls";

/**
 * One row of a {@link TopBarActionMenu}. An `action` (default) runs `onSelect`, a
 * `link` navigates via react-router, a `divider` draws a rule, and a `heading` names
 * the rows after it. Action and link rows close the menu automatically when chosen.
 * `kind` may be omitted for actions, keeping the common case terse.
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
  | { kind: "divider"; key: string }
  | {
      /**
       * A group heading (0.23, keksdose's guided-tours menu): the rows after it, up to
       * the next heading, the next `divider` or the end of `entries`, are ONE group
       * named by `label`. keksdose files its tours by topic and separated the blocks
       * with bare dividers — "the kit's menu has no heading row to name them with"
       * (tour-menu.tsx) — so a sighted reader had to guess what each block was and a
       * screen reader was told nothing at all.
       *
       * Not a row: it takes no focus, the arrow keys (and Home/End) pass over it, and it
       * never closes the menu. It is announced the way the kit's other grouped lists
       * announce theirs (`CommandPalette`): the group's rows sit in a `role="group"`
       * whose `aria-labelledby` is this heading, so a reader says "On this page, group"
       * when the focus enters the first row, and nothing between rows.
       *
       * A divider ENDS the group, so a closing row such as "All tours…" behind a rule
       * belongs to no topic. A heading with no rows under it is not drawn — an empty
       * group names nothing; build the list from data and it may well be empty.
       *
       * The menu-wide `heading` prop is the panel's title, drawn once above everything;
       * with group headings it is usually redundant (two stacked caps lines read as one),
       * and the trigger's `ariaLabel` already names the menu.
       */
      kind: "heading";
      key: string;
      /** The group's name, shown above its rows and announced as the group's name. Keep
       *  it short: it is set in small caps and wraps on a narrow panel. */
      label: ReactNode;
    };

type HeadingEntry = Extract<TopBarMenuEntry, { kind: "heading" }>;
type DividerEntry = Extract<TopBarMenuEntry, { kind: "divider" }>;
type RowEntry = Exclude<TopBarMenuEntry, HeadingEntry | DividerEntry>;

/** What the panel draws from `entries`: loose rows and rules, and headed groups. */
type Block = { kind: "loose"; entry: RowEntry | DividerEntry } | { kind: "group"; heading: HeadingEntry; rows: RowEntry[] };

/**
 * Cut `entries` into blocks: a heading opens a group that takes the rows after it until
 * the next heading or divider; everything else stands alone, as it always has.
 */
function toBlocks(entries: readonly TopBarMenuEntry[]): Block[] {
  const blocks: Block[] = [];
  let group: Extract<Block, { kind: "group" }> | null = null;
  for (const entry of entries) {
    if (entry.kind === "heading") {
      group = { kind: "group", heading: entry, rows: [] };
      blocks.push(group);
    } else if (entry.kind === "divider") {
      group = null;
      blocks.push({ kind: "loose", entry });
    } else if (group) {
      group.rows.push(entry);
    } else {
      blocks.push({ kind: "loose", entry });
    }
  }
  // A heading with nothing under it names nothing: not drawn (see the `heading` kind).
  return blocks.filter((block) => block.kind === "loose" || block.rows.length > 0);
}

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
  /**
   * Anything below — a role chip. A link or button here stays out of the arrow keys
   * and in the Tab order, like the footer's.
   *
   * Pass a function to get `close`, as `footer` does — keksdose F7: its admin role
   * chip links to the admin area, and a router link does not unmount the menu, so
   * without `close` the panel stayed open over the page it had just navigated to.
   */
  extra?: ReactNode | ((close: () => void) => ReactNode);
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
 *
 * A long menu is grouped by topic with `{ kind: "heading" }` entries (0.23) — see
 * {@link TopBarMenuEntry}. There is no separate phone layout: the panel is the same
 * hover panel at 390px, kept inside the viewport by `HoverMenu`, and a heading wraps
 * rather than widening it.
 */
export function TopBarActionMenu({
  icon,
  iconBadge,
  trigger,
  triggerClassName,
  href,
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
   * A status dot in the top-end corner of `icon` — keksdose's unread-support dot on the
   * feedback trigger. Like `UserAvatar`'s `badge`, its `label` joins the trigger's name
   * ("Send feedback 2 unread"), so the dot is not something only the eye is told about.
   * Ignored with `trigger`: give the face its own badge there.
   */
  iconBadge?: UserAvatarBadge | null;
  /**
   * A face of your own for the trigger — the account menu's `UserAvatar`. It is drawn
   * INSIDE the kit's button, which keeps the wiring: `aria-haspopup`, `aria-expanded`,
   * the toggle, the keyboard. `open` is there for a chevron that turns.
   *
   * The button is named by `ariaLabel` followed by any readable text in the face — a
   * `UserAvatar` `badge` label reaches a screen reader that way ("Account menu 3
   * unread"), where an `aria-label` on the button would have hidden it. A
   * `UserAvatar`'s initials are `aria-hidden`, so the person's name is only in the
   * name if `ariaLabel` carries it ("Marcel Eifert, account menu").
   */
  trigger?: (state: { open: boolean }) => ReactNode;
  /** Extra classes for the trigger button — `rounded-full` round an avatar. */
  triggerClassName?: string;
  /**
   * Make the trigger a LINK to this route (keksdose dev #585, Marcel: "clicking on the
   * guided tours icon shall lead to the tours page like the all tours element does").
   * A click or Enter follows it and shuts the panel; hover still opens the panel after
   * the usual delay, and ↓/↑ on the focused trigger still open it onto the first/last
   * row, so the rows stay reachable by keyboard. A tap on a touch screen follows the
   * link — so use it where the destination offers everything the menu does. Rendered as
   * an `<a>` (the router's `Link`) with `aria-haspopup="menu"` and `aria-expanded`,
   * named by `ariaLabel`: a link inside the kit's button would be interactive content
   * inside interactive content.
   */
  href?: string;
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
  // Names the groups' headings for `aria-labelledby`. Positional rather than from the
  // entry's `key`, which is the caller's text and may hold a space — and a space in
  // `aria-labelledby` is a list separator.
  const uid = useId();
  return (
    <HoverMenu
      ariaLabel={ariaLabel}
      align={align}
      trigger={({ open, toggle, close }) => {
        // One element for both kinds: the router's link when `href` is set, else the
        // kit's button. Same classes and face either way.
        const control = (className: string, children: ReactNode, label?: string) =>
          href ? (
            <Link to={href} onClick={close} aria-label={label} className={className}>
              {children}
            </Link>
          ) : (
            <button type="button" onClick={toggle} aria-label={label} className={className}>
              {children}
            </button>
          );
        if (trigger) {
          return control(
            cn(TOPBAR_TRIGGER_CLASS, "relative", triggerClassName),
            <>
              <span className="sr-only">{ariaLabel}</span>
              {/* The space keeps the name from running into the face's text ("Account
                  menu3 unread"); as a flex item it takes no room. */}
              {" "}
              {trigger({ open })}
            </>,
          );
        }
        if (iconBadge) {
          // Named by its content, like the custom-trigger branch, so the badge label is
          // part of the name; an `aria-label` would have hidden it.
          return control(
            cn(TOPBAR_TRIGGER_CLASS, "relative", triggerClassName),
            <>
              <span className="sr-only">{ariaLabel}</span>{" "}
              <span aria-hidden className="relative inline-flex">
                {icon}
                <StatusDot ring tone={iconBadge.tone ?? "danger"} className="absolute -end-0.5 -top-0.5" />
              </span>{" "}
              <span className="sr-only">{iconBadge.label}</span>
            </>,
          );
        }
        return control(cn(TOPBAR_TRIGGER_CLASS, triggerClassName), icon, ariaLabel);
      }}
    >
      {(close) => {
        const footerBody = typeof footer === "function" ? footer(close) : footer;
        const headerExtra = typeof header?.extra === "function" ? header.extra(close) : header?.extra;
        const footerClass =
          "flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)] [&_a:hover]:text-[var(--text-primary)] [&_a]:rounded-sm [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-[var(--brand)]";
        /** One action or link row — loose, or inside a heading's group. */
        const row = (entry: RowEntry) => (
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
        return (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a Tab bubbling up from a row or footer link, see keepTabInsidePanel
          <ul className={cn("py-1", panelClassName)} onKeyDown={keepTabInsidePanel}>
            {header && (
              <MenuSection className="mb-1 border-b border-[var(--border)] px-3 py-2">
                <div className="truncate text-sm font-medium text-[var(--text-primary)]">{header.title}</div>
                {header.subtitle != null && (
                  <div className="truncate text-xs text-[var(--text-muted)]">{header.subtitle}</div>
                )}
                {headerExtra != null && headerExtra !== false && <div className="mt-1">{headerExtra}</div>}
              </MenuSection>
            )}
            {heading && (
              <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-placeholder)]">
                {heading}
              </li>
            )}
            {toBlocks(entries).map((block, i, blocks) => {
              if (block.kind === "loose") {
                const entry = block.entry;
                if (entry.kind === "divider") {
                  return <li key={entry.key} className="my-1 border-t border-[var(--border)]" />;
                }
                return row(entry);
              }
              const headingId = `${uid}-group-${i}`;
              const before = blocks[i - 1];
              // Under a rule (or at the top of the rows) the rule's margin is the gap;
              // straight under another group's last row the heading makes its own.
              const tight = !before || (before.kind === "loose" && before.entry.kind === "divider");
              return (
                <li key={block.heading.key} role="none">
                  <div
                    id={headingId}
                    role="presentation"
                    className={cn(
                      "px-3 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] [overflow-wrap:anywhere]",
                      tight ? "pt-1" : "pt-2.5",
                    )}
                  >
                    {block.heading.label}
                  </div>
                  <ul role="group" aria-labelledby={headingId}>
                    {block.rows.map(row)}
                  </ul>
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
