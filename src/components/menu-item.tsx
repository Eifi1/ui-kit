import { forwardRef } from "react";
import type { MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * `TOPBAR_MENU_ITEM_CLASS`'s row, spelled out rather than imported: a component does
 * not reach up into the shell (the same call `Disclosure`'s menu variant made). A test
 * holds the two to the same classes, so a menu mixing `MenuItem`s with the shell's own
 * rows (`TopBarActionMenu`, `OptionSwitcherMenu`) cannot drift into two looks.
 */
const MENU_ITEM_ROW =
  "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-start text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]";

/** HoverMenu moves focus onto items with the arrow keys; a pointer user never sees the
 *  ring, a keyboard user always does. Inset, because the panel clips its children. */
const MENU_ITEM_FOCUS =
  "focus-visible:outline-none focus-visible:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]";

export type MenuItemTone = "default" | "danger";

/** What {@link MenuItemProps.renderLink} is handed. Spread it onto your router's link,
 *  mapping `href` to what the link calls it —
 *  `renderLink={({ href, ...p }) => <Link to={href} {...p} />}`. */
export interface MenuItemLinkProps {
  href: string;
  className: string;
  children: ReactNode;
  role: "menuitem";
  ref?: Ref<HTMLAnchorElement>;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  "aria-current"?: "page";
  id?: string;
  [key: `aria-${string}`]: string | boolean | number | undefined;
  [key: `data-${string}`]: unknown;
}

interface MenuItemBaseProps {
  /** The row's text. */
  children: ReactNode;
  /** An icon before the label, drawn at the menu's 16px. */
  icon?: LucideIcon;
  /** Anything else before the label — an avatar, a flag — when a Lucide icon will not do. */
  leading?: ReactNode;
  /** After the label, at the row's end: a shortcut, a count, a badge. */
  trailing?: ReactNode;
  /** `danger` for the row that destroys or signs out. Colour is not the whole message:
   *  the label must still say what the row does. */
  tone?: MenuItemTone;
  disabled?: boolean;
  className?: string;
  id?: string;
  [key: `aria-${string}`]: string | boolean | number | undefined;
  [key: `data-${string}`]: unknown;
}

/**
 * A menu row is a button OR a link, and only the button can be CHECKED: a checked link
 * is a link to where you already are, which is `current`, not a selection.
 */
export type MenuItemProps = MenuItemBaseProps &
  (
    | {
        href?: never;
        renderLink?: never;
        current?: never;
        /** Runs the row. Close the menu from here — `HoverMenu` hands its `close` to
         *  the render prop that draws the rows. */
        onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
        /**
         * Makes the row a CHOICE and says whether it is chosen. Leave it undefined for a
         * plain command; `false` is a choice that is not chosen, which is different.
         * A check mark is drawn at the end when it is on.
         */
        checked?: boolean;
        /**
         * What kind of choice, when `checked` is given:
         *
         * - `radio` (default): one of a set — keksdose's budget switcher
         *   (budget-switcher.tsx:51), the theme and language pickers. `menuitemradio`.
         * - `checkbox`: an independent on/off — "Show archived". `menuitemcheckbox`.
         *
         * Not `aria-pressed`: that belongs to a toggle BUTTON, and inside a
         * `role="menu"` a screen reader expects the menu roles and reads "checked"
         * only from them. A button with `aria-pressed` in a menu is announced as a
         * button in a menu, which is two widgets in one.
         */
        checkable?: "radio" | "checkbox";
      }
    | {
        /** Makes the row a link — keksdose's "Manage budgets" and account-menu rows. */
        href: string;
        /** Renders the link — pass your router's `<Link>`, since a plain `<a>` reloads
         *  a single-page app. Default `<a>`. The same API as `Chip` and `StatTile`. */
        renderLink?: (props: MenuItemLinkProps) => ReactElement;
        /** Runs on the way (close the menu). */
        onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
        /** The link to the page already open: `aria-current="page"` and a check mark. */
        current?: boolean;
        checked?: never;
        checkable?: never;
      }
  );

/**
 * One row of a `HoverMenu` / `TopBarActionMenu` panel.
 *
 * keksdose's account menu and budget switcher each rebuild this row by hand — the
 * shell's class, an icon, a label, a badge, a check mark on the active budget — and the
 * check mark was the only thing saying which budget was active, so a screen reader
 * heard four identical buttons. This row says it (`menuitemradio` + `aria-checked`).
 *
 * The role is set HERE rather than left to `HoverMenu`, which promotes only role-less
 * buttons and links to `menuitem`: a checked row must be `menuitemradio` or
 * `menuitemcheckbox` from its first render, and `HoverMenu` leaves an element that
 * already has a role alone — so its roving focus (↑/↓, Home/End) picks these rows up
 * with the rest. Render it inside an `<li>` like the shell's own rows; `HoverMenu`
 * turns the list markup into `role="none"`.
 */
export const MenuItem = forwardRef<HTMLElement, MenuItemProps>(function MenuItem(
  {
    children,
    icon: Icon,
    leading,
    trailing,
    tone = "default",
    disabled = false,
    className,
    href,
    renderLink,
    onClick,
    checked,
    checkable,
    current,
    ...rest
  },
  ref,
) {
  const on = href !== undefined ? !!current : !!checked;
  const look = cn(
    MENU_ITEM_ROW,
    MENU_ITEM_FOCUS,
    tone === "danger" && "text-[var(--danger)] hover:bg-[var(--danger-bg)] focus-visible:bg-[var(--danger-bg)]",
    disabled && "cursor-default opacity-50 hover:bg-transparent",
    className,
  );
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
        {leading}
        <span className="min-w-0 truncate">{children}</span>
      </span>
      {(trailing != null || on) && (
        <span className="flex shrink-0 items-center gap-2">
          {trailing}
          {on && <Check className="size-4 text-[var(--text-secondary)]" aria-hidden />}
        </span>
      )}
    </>
  );

  if (href !== undefined && !disabled) {
    const linkProps: MenuItemLinkProps = {
      ...rest,
      ref: ref as Ref<HTMLAnchorElement>,
      href,
      role: "menuitem",
      className: look,
      onClick: onClick as MenuItemLinkProps["onClick"],
      "aria-current": current ? "page" : undefined,
      children: body,
    };
    if (renderLink) return <RenderedLink render={renderLink} {...linkProps} />;
    const { children: linkBody, ...anchorProps } = linkProps;
    return <a {...anchorProps}>{linkBody}</a>;
  }

  const role =
    href === undefined && checked !== undefined
      ? checkable === "checkbox"
        ? "menuitemcheckbox"
        : "menuitemradio"
      : "menuitem";
  return (
    <button
      {...rest}
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      role={role}
      aria-checked={role === "menuitem" ? undefined : !!checked}
      // `aria-disabled` rather than `disabled`: HoverMenu's roving focus skips either,
      // and the ARIA menu pattern keeps an unavailable item perceivable ("Delete,
      // dimmed") rather than greyed to the point some browsers stop exposing it.
      aria-disabled={disabled || undefined}
      onClick={
        disabled
          ? (e) => e.preventDefault()
          : (onClick as ((event: MouseEvent<HTMLButtonElement>) => void) | undefined)
      }
      className={look}
    >
      {body}
    </button>
  );
});

function RenderedLink({
  render,
  ...props
}: MenuItemLinkProps & { render: (props: MenuItemLinkProps) => ReactElement }) {
  return render(props);
}
