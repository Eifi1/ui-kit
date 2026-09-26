import { createContext, forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef, HTMLAttributes, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { Spinner } from "./ui";
import { StatusDot } from "./status-dot";
import { useKitLabels } from "../i18n/kit-labels";

/* ── Labels ───────────────────────────────────────────────────────────────── */

export interface ListLabels {
  /** Read after an unread row's title — the dot alone says nothing to a screen reader. */
  unread: string;
  /** Read after an external row's title: the row leaves the app in a new tab. */
  opensInNewTab: string;
}

export const DEFAULT_LIST_LABELS: ListLabels = {
  unread: "Unread",
  opensInNewTab: "opens in a new tab",
};

/* ── List ─────────────────────────────────────────────────────────────────── */

/**
 * `compact` 36px-ish rows for a dense panel (an inbox in a menu), `default` the ~44px
 * row every site draws with `py-2.5`, `comfortable` for a list that is the page.
 */
export type ListDensity = "compact" | "default" | "comfortable";
/** `divider`: a rule between rows (kastlan's `divide-y` lists); `gap`: a small space
 *  between rows (lenkbank's `space-y-2`, kastlan's `space-y-1`); `none`: flush. */
export type ListSeparator = "divider" | "gap" | "none";

const ListContext = createContext<{ density: ListDensity; separator: ListSeparator }>({
  density: "default",
  separator: "gap",
});

export interface ListProps extends Omit<ComponentPropsWithoutRef<"ul">, "role"> {
  /** `ol` when the order means something (a ranked list, numbered segments). */
  as?: "ul" | "ol";
  /** Every row's density, unless a row says otherwise. Default `default`. */
  density?: ListDensity;
  /** Default `gap`. */
  separator?: ListSeparator;
}

/**
 * The list of {@link ListItem}s.
 *
 * A `<ul>` with an explicit `role="list"`: Safari drops a list's semantics once its
 * bullets are styled away, and "list, 7 items" is exactly what a screen-reader user
 * wants to hear before the first row.
 */
export const List = forwardRef<HTMLUListElement, ListProps>(function List(
  { as = "ul", density = "default", separator = "gap", className, children, ...rest },
  ref,
) {
  const Tag = as;
  return (
    <ListContext.Provider value={{ density, separator }}>
      <Tag
        {...rest}
        ref={ref as Ref<HTMLUListElement & HTMLOListElement>}
        role="list"
        className={cn(
          "m-0 flex list-none flex-col p-0",
          separator === "gap" && (density === "compact" ? "gap-0.5" : "gap-1"),
          className,
        )}
      >
        {children}
      </Tag>
    </ListContext.Provider>
  );
});

/* ── ListItem ─────────────────────────────────────────────────────────────── */

/** What {@link ListItemProps.renderLink} is handed. Spread it onto your router's link,
 *  mapping `href` to what it calls it — `({ href, ...p }) => <Link to={href} {...p} />`. */
export interface ListItemLinkProps {
  href: string;
  /** The row's target look — keep it, or the row's padding and focus ring go. */
  className: string;
  children: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onAuxClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  "aria-current"?: "true";
  "aria-busy"?: true;
  id?: string;
  [key: `aria-${string}`]: string | boolean | number | undefined;
  [key: `data-${string}`]: unknown;
}

const PAD: Record<ListDensity, { target: string; actions: string; gap: string }> = {
  compact: { target: "gap-2 px-2 py-1.5", actions: "pe-1.5", gap: "gap-0.5" },
  default: { target: "gap-3 px-3 py-2.5", actions: "pe-2", gap: "gap-1" },
  comfortable: { target: "gap-3 px-4 py-3", actions: "pe-3", gap: "gap-1" },
};

const TARGET_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]";

interface ListItemBaseProps {
  /** The row's name: one line, truncated. */
  title: ReactNode;
  /** The line under it: one line, truncated — or two, with `subtitleLines={2}`. */
  subtitle?: ReactNode;
  /** `2` for a line that is a body rather than a label (keksdose's notification text). */
  subtitleLines?: 1 | 2;
  /** A third line in the caption type: a timestamp, "Updated …" (lenkbank's projects). */
  meta?: ReactNode;
  /** A Lucide icon before the text, muted, at 16px. */
  icon?: LucideIcon;
  /** Anything else before the text — an avatar, a file-type badge, a drag handle. */
  leading?: ReactNode;
  /**
   * Inside the main target, at its end: a status chip, a file size, a count. It is part
   * of what the row's click does and part of its accessible name — so never a control.
   * Controls go in {@link actions}.
   */
  trailing?: ReactNode;
  /**
   * Controls BESIDE the main target, never inside it: copy, delete, "Open".
   *
   * A button inside a button (or a link) is invalid HTML, and a screen reader folds the
   * inner one into the outer one's name where it cannot be reached. lenkbank found this
   * three times (profile-bar.tsx:110, projects-page.tsx:61, segment-list.tsx:165) and
   * solved it the same way each time: the row's target and its actions are siblings in
   * one bordered box. That is this slot — and being siblings is also what stops a click
   * on "Copy" from selecting the row.
   */
  actions?: ReactNode;
  /**
   * The unread mark: a brand dot at the row's end, the title in semibold, and "Unread"
   * read after the title (keksdose notification-inbox.tsx:215). For another status,
   * pass your own mark in {@link status}.
   */
  unread?: boolean;
  /** A mark in the unread dot's place — a `StatusDot` of another tone, a count. */
  status?: ReactNode;
  /**
   * The row is the chosen one — a brand border on the raised surface (lenkbank's
   * profile bar and segment list). `aria-current="true"` on the target: the row is the
   * current one of a set, which is what those lists mean, not a pressed toggle.
   */
  selected?: boolean;
  disabled?: boolean;
  /**
   * Work under way on the row — keksdose's attachment download (support-attachments
   * .tsx:91). A spinner takes the trailing edge, the target is `aria-busy`, and a
   * second click is ignored. The row keeps focus: `aria-disabled`, not `disabled`, so
   * a keyboard user is not dropped back to the top of the page mid-download.
   */
  loading?: boolean;
  /** Overrides the {@link List}'s density for this row. */
  density?: ListDensity;
  /** `start` for rows whose text runs to two or three lines, so the icon sits by the
   *  title rather than the middle of the paragraph. Default `center`. */
  align?: "center" | "start";
  /** Classes on the visible row (the bordered box). */
  className?: string;
  /** Classes on the main target (the button, link or static block). */
  targetClassName?: string;
  /**
   * Extra attributes and handlers for the main target — e.g. HTML5 drag-and-drop
   * (`draggable`, `onDragStart`, `onDragEnd`): lenkbank's segment list drags the WHOLE
   * 44px row, and a grip inside the button cannot start a drag in Firefox. Spread first,
   * so the row's own role, name, state and click handling always win.
   */
  targetProps?: HTMLAttributes<HTMLElement>;
  /**
   * A visible border while unselected, instead of the transparent one. For rows laid out
   * as a wrapping strip (lenkbank's profile bar), where borderless rows read as loose
   * text. The selected row's brand border is unchanged.
   */
  bordered?: boolean;
  /** `div` for a single row outside a {@link List}; an `<li>` must sit in a list. */
  as?: "li" | "div";
  /** Reaches the main target — the element with the row's name and action. */
  id?: string;
  [key: `aria-${string}`]: string | boolean | number | undefined;
  [key: `data-${string}`]: unknown;
}

/**
 * The row is ONE thing to activate, so the types allow one: a button, an in-app link,
 * an external link, or nothing (a static row, like kastlan's passkey and user lists).
 */
export type ListItemProps = ListItemBaseProps &
  (
    | {
        /** Makes the row a button — select, open, mark read. */
        onClick: (event: MouseEvent<HTMLButtonElement>) => void;
        href?: never;
        renderLink?: never;
        external?: never;
        onAuxClick?: never;
      }
    | {
        /**
         * Makes the row a link. A real `<a href>`, so a middle click opens it in a
         * background tab (keksdose feedback #451) — which a button calling `navigate`
         * cannot do.
         */
        href: string;
        /** Your router's link for an in-app `href`. Default `<a>`. The API `Chip`,
         *  `StatTile` and `MenuItem` share. Ignored for an `external` row. */
        renderLink?: (props: ListItemLinkProps) => ReactElement;
        /**
         * The link leaves the app: a plain `<a target="_blank" rel="noopener
         * noreferrer">` with an external-link mark, and "opens in a new tab" read
         * after the title. keksdose's inbox rows whose URL is absolute.
         */
        external?: boolean;
        /** Runs on a click, before the navigation (mark the row read). */
        onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
        /** Runs on a middle click, which fires no `click` — keksdose marks a
         *  notification read here too, so a row opened into a background tab does not
         *  stay unread. */
        onAuxClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
      }
    | {
        onClick?: never;
        href?: never;
        renderLink?: never;
        external?: never;
        onAuxClick?: never;
      }
  );

/**
 * One row of a {@link List}: leading icon or avatar, title and subtitle (both
 * truncating), a trailing slot, and — beside the row, not inside it — its actions.
 *
 * All three apps draw this row by hand, a dozen times: kastlan's units
 * (building-detail-page.tsx:402), open tickets (group-overview-page.tsx:160), activity
 * feed (activity-feed.tsx:53), company users (platform-company-detail-page.tsx:140)
 * and passkeys (passkeys-card.tsx:75); keksdose's notification inbox and attachment
 * downloads; lenkbank's profiles, projects and segments. The copies differ in the
 * details that are easy to get wrong — which of them truncate, whether the actions
 * are nested in the button, whether a link row is a link at all.
 */
export const ListItem = forwardRef<HTMLElement, ListItemProps>(function ListItem(
  {
    title,
    subtitle,
    subtitleLines = 1,
    meta,
    icon: Icon,
    leading,
    trailing,
    actions,
    unread = false,
    status,
    selected = false,
    disabled = false,
    loading = false,
    density: densityProp,
    align = "center",
    className,
    targetClassName,
    targetProps,
    bordered = false,
    as = "li",
    href,
    renderLink,
    external = false,
    onClick,
    onAuxClick,
    ...rest
  },
  ref,
) {
  const list = useContext(ListContext);
  const labels = useKitLabels("list", DEFAULT_LIST_LABELS);
  const density = densityProp ?? list.density;
  const pad = PAD[density];
  const isLink = href !== undefined && !disabled;
  const isButton = !isLink && onClick !== undefined && href === undefined;
  const interactive = isLink || isButton;
  const inert = disabled || loading;

  const mark =
    status ??
    (unread ? <StatusDot tone="brand" size="sm" className={align === "start" ? "mt-1.5" : undefined} /> : null);

  const body = (
    <>
      {Icon && (
        <Icon
          className={cn("size-4 shrink-0 text-[var(--text-muted)]", align === "start" && "mt-0.5")}
          aria-hidden
        />
      )}
      {leading}
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "block truncate text-sm text-[var(--text-primary)]",
            unread ? "font-semibold" : "font-medium",
          )}
        >
          {title}
          {unread && <span className="sr-only"> ({labels.unread})</span>}
          {external && href !== undefined && <span className="sr-only"> ({labels.opensInNewTab})</span>}
        </span>
        {subtitle != null && (
          <span
            className={cn(
              "block text-xs text-[var(--text-muted)]",
              subtitleLines === 2 ? "line-clamp-2" : "truncate",
            )}
          >
            {subtitle}
          </span>
        )}
        {meta != null && <span className="mt-0.5 block truncate text-[11px] leading-snug text-[var(--text-muted)]">{meta}</span>}
      </span>
      {trailing != null && <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--text-muted)]">{trailing}</span>}
      {loading ? (
        <Spinner label={null} className="size-3.5 shrink-0" />
      ) : (
        external && href !== undefined && (
          <ExternalLink className="size-3.5 shrink-0 text-[var(--text-muted)] rtl:-scale-x-100" aria-hidden />
        )
      )}
      {mark}
    </>
  );

  const target = cn(
    "flex min-w-0 flex-1 text-start",
    align === "start" ? "items-start" : "items-center",
    pad.target,
    "rounded-[inherit]",
    interactive && TARGET_RING,
    interactive && !inert && "cursor-pointer",
    loading && "cursor-progress",
    targetClassName,
  );

  // `role` is the row's own (a button, a link, or nothing on a static block): a
  // targetProps role would silently turn the row into something else.
  const { role: _ignoredRole, ...targetExtras } = targetProps ?? {};

  let main: ReactNode;
  if (isLink) {
    const linkProps: ListItemLinkProps = {
      ...(targetExtras as Partial<ListItemLinkProps>),
      ...rest,
      ref: ref as Ref<HTMLAnchorElement>,
      href,
      className: target,
      "aria-current": selected ? "true" : undefined,
      "aria-busy": loading || undefined,
      onClick: loading
        ? (e) => e.preventDefault()
        : (onClick as ListItemLinkProps["onClick"]),
      onAuxClick,
      children: body,
    };
    const { children: linkBody, ...anchorProps } = linkProps;
    main = renderLink && !external ? (
      <RenderedLink render={renderLink} {...linkProps} />
    ) : (
      <a {...anchorProps} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}>
        {linkBody}
      </a>
    );
  } else if (isButton) {
    main = (
      <button
        {...(targetExtras as HTMLAttributes<HTMLButtonElement>)}
        {...rest}
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        // A disabled row is `disabled`: nothing to do there, and nothing to reach. A
        // loading row is only `aria-disabled` — see `loading`.
        disabled={disabled}
        aria-disabled={loading || undefined}
        aria-busy={loading || undefined}
        aria-current={selected ? "true" : undefined}
        onClick={loading ? undefined : (onClick as (event: MouseEvent<HTMLButtonElement>) => void)}
        className={target}
      >
        {body}
      </button>
    );
  } else {
    main = (
      <div
        {...(targetExtras as HTMLAttributes<HTMLDivElement>)}
        {...rest}
        ref={ref as Ref<HTMLDivElement>}
        aria-disabled={disabled || undefined}
        aria-busy={loading || undefined}
        className={target}
      >
        {body}
      </div>
    );
  }

  const Tag = as;
  return (
    <Tag
      className={cn(
        list.separator === "divider" && "border-b border-[var(--border)] last:border-b-0",
        list.separator === "divider" && as === "li" && "py-0.5",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center rounded-md border transition-colors",
          selected
            ? "border-[var(--brand)] bg-[var(--bg-surface-2)]"
            : bordered
              ? "border-[var(--border)]"
              : "border-transparent",
          interactive && !inert && !selected && "hover:bg-[var(--bg-hover)]",
          disabled && "opacity-50",
          className,
        )}
      >
        {main}
        {actions != null && (
          <div className={cn("flex shrink-0 items-center", pad.gap, pad.actions)}>{actions}</div>
        )}
      </div>
    </Tag>
  );
});

function RenderedLink({
  render,
  ...props
}: ListItemLinkProps & { render: (props: ListItemLinkProps) => ReactElement }) {
  return render(props);
}
