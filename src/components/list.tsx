import { createContext, forwardRef, useContext, useId, useState } from "react";
import type { ComponentPropsWithoutRef, HTMLAttributes, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { Spinner } from "./ui";
import { StatusDot } from "./status-dot";
import { Collapse } from "./disclosure";
import { toneTextClass } from "./signed-amount";
import type { TextTone } from "./signed-amount";
import { useKitLabels, useKitLink } from "../i18n/kit-labels";
import { pickLinkRenderer } from "./text-link";
import { mergeDescribedBy } from "./choice-parts";
import { LockedReason, useLockReason } from "./field-parts";

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

const PAD: Record<
  ListDensity,
  { target: string; actions: string; leadingActions: string; gap: string; body: string }
> = {
  compact: { target: "gap-2 px-2 py-1.5", actions: "pe-1.5", leadingActions: "ps-1.5", gap: "gap-0.5", body: "px-2 pb-1.5" },
  default: { target: "gap-3 px-3 py-2.5", actions: "pe-2", leadingActions: "ps-2", gap: "gap-1", body: "px-3 pb-2.5" },
  comfortable: { target: "gap-3 px-4 py-3", actions: "pe-3", leadingActions: "ps-3", gap: "gap-1", body: "px-4 pb-3" },
};

/** {@link ListItemBaseProps.trailingTone}: a {@link TextTone}, or `inherit` — no
 *  colour of the slot's own, so an element's colour (or the row's) stands. */
export type ListItemTrailingTone = TextTone | "inherit";

const TARGET_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]";

interface ListItemBaseProps {
  /** The row's name: one line, truncated — unless {@link titleLines} says otherwise. */
  title: ReactNode;
  /**
   * How many lines the title may take. `1` (default) truncates with an ellipsis, which
   * is right for a name the app chose — a unit number, a user, a file — where the
   * cut-off end is still recognisable and every row keeps one height.
   *
   * `2` clamps at two lines; `"all"` shows every line, breaking inside a long word
   * rather than overflowing. For rows whose only name is free text a person typed
   * (kastlan 44): a defect or a note titled by its description, where the first 30
   * characters on a phone say nothing and there is no other field to tell two rows
   * apart. Pair it with `align="start"` so the icon stays by the first line.
   */
  titleLines?: 1 | 2 | "all";
  /** The line under it: one line, truncated — or two, with `subtitleLines={2}`. */
  subtitle?: ReactNode;
  /** `2` for a line that is a body rather than a label (keksdose's notification text). */
  subtitleLines?: 1 | 2;
  /**
   * A small line ABOVE the title, in the caption type: the group a row belongs to, a
   * date heading, a category ("Groceries · weekly"). Part of the target and of its
   * name, read before the title. One line, truncated.
   */
  overline?: ReactNode;
  /** A third line in the caption type: a timestamp, "Updated …" (lenkbank's projects). */
  meta?: ReactNode;
  /**
   * Let {@link meta} wrap: it becomes a wrapping row (`flex-wrap`, a small gap)
   * instead of one truncated line — for a run of chips (keksdose's payee-backfill
   * tags), which otherwise had nowhere to go but the body, outside the target. Still
   * inside the target, so still no controls: chips that only show, not ones that
   * remove themselves.
   */
  metaWrap?: boolean;
  /**
   * Content INSIDE the main target, under the title, subtitle and meta: a progress or
   * budget bar, a sparkline, a strip of figures (keksdose's food-group bars). Unlike
   * {@link children}, which sits outside the target, a click on it is a click on the
   * row, and its hover fill covers it.
   *
   * Because it is inside the button or link it obeys the {@link trailing} rule: shown,
   * never operated — no buttons, links or inputs (invalid HTML in a button, and folded
   * into its name). Its text joins the row's accessible name, so give a bar that only
   * repeats a figure already in the row `aria-hidden`. Rendered in a block `<span>`,
   * full width of the TEXT COLUMN only — the column the title and subtitle are in, not
   * the whole row: it starts after the {@link icon} / {@link leading} and stops where
   * {@link trailing} begins, so a meter under a row with a trailing figure is as wide as
   * the title, not run on under the figure (keksdose's budget rows). For a bar across
   * the full row, put it in {@link children} (outside the target) or leave `trailing`
   * off and show the figure in `meta`. Strictly a button holds phrasing content only; the
   * kit's `ProgressBar` draws `<div>`s, which every browser lays out and reads fine
   * there but an HTML validator flags.
   */
  content?: ReactNode;
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
   * The colour of the {@link trailing} slot. Default `muted` — today's look, right for
   * a size or a count in plain text. `inherit` sets none, so an element's own colour
   * (an amount coloured by its sign) stands without a second override; any
   * {@link TextTone} colours a plain-text figure (`"danger"` for an overdue count).
   */
  trailingTone?: ListItemTrailingTone;
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
   * Controls BEFORE the main target, never inside it: a selection checkbox, a drag
   * handle that is a button. The mirror of {@link actions} at the start edge — a
   * sibling of the target, so checking the box does not activate (or expand) the row
   * and the checkbox keeps its own name. Give the control an `aria-label` naming the
   * row ("Select Groceries"), since it is not inside the row's name. Anything that only
   * shows goes in {@link leading}, inside the target.
   */
  leadingActions?: ReactNode;
  /**
   * Rich content UNDER the title row and outside its target: photos, per-row buttons,
   * form fields — kastlan's handover room inspector (room-inspector.tsx), the handover
   * detail page and the wizard's defects step (wizard/defects-step.tsx), which draw
   * each room or defect as a `Card variant="inset"` because a row could not hold a
   * photo strip with its own buttons.
   *
   * The same rule as {@link actions}, one row down: the title area stays ONE named
   * target (the button or link, with the title and subtitle as its name), and the body
   * is its sibling, never nested in it — a thumbnail's "Remove" inside the row's button
   * would be invalid HTML and unreachable by a screen reader. The body is a
   * `role="group"` named by the row's title (`aria-labelledby`), so tabbing into the
   * third photo's button of the second room is heard as "Kitchen, group" first rather
   * than as a button floating free of any row. Inside the row's box, so a `selected`
   * border and a `divider` hold both; the hover fill stays on the target alone, since
   * the body is not what a click on the row does.
   */
  children?: ReactNode;
  /** Classes on the {@link children} body. */
  bodyClassName?: string;
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
  /**
   * Wraps the visible row (the bordered box: target, actions and body) in an element
   * of your own, INSIDE the `<li>` — a `<Tooltip>` explaining why the row is disabled,
   * an app's save guard: `renderRow={(row) => <Tooltip label="Locked">{row}</Tooltip>}`.
   *
   * The wrapper otherwise had to go round the whole `ListItem`, which put a `<span>`
   * between the `<ul>` and its `<li>` (invalid; the list stops counting items), so
   * callers wrote `<li><Wrapper><ListItem as="div" /></Wrapper></li>` — and lost the
   * divider and its spacing, which sit on the row's own `<li>`. Here the `<li>` stays
   * the list's child and keeps both. The `<li>` becomes a column and the row takes the
   * full width, so an inline wrapper (the tooltip's `inline-flex` span) still stretches
   * the row across the list.
   *
   * `row` is the row BOX (a `<div>`), not the target: a wrapper that forces a prop onto
   * its child with `cloneElement` — a save guard that injects `disabled` while a form is
   * dirty (keksdose's SaveGuard) — sets it on that div, where it does nothing, and the
   * button inside stays live. Pass `disabled` (or `loading`) to the ListItem yourself,
   * from the same state the guard reads, and let the wrapper only explain it:
   * `<ListItem disabled={dirty} renderRow={(row) => <Tooltip label="Save first">{row}</Tooltip>} />`.
   */
  renderRow?: (row: ReactElement) => ReactNode;
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
    | ({
        /** Makes the row a button — select, open, mark read. */
        onClick: (event: MouseEvent<HTMLButtonElement>) => void;
        /**
         * Why the row's click is not available — {@link Button}'s `disabledReason`, for
         * a row whose click WRITES (mark read, assign, toggle a grant). keksdose K3: such
         * rows sat behind a `SaveGuard` that forced a native `disabled`, out of the tab
         * order, so the reason never reached a keyboard; `renderRow` with a Tooltip could
         * explain it but not keep the row reachable.
         *
         * With a reason the row's button is `aria-disabled` instead: still focusable, a
         * click does nothing, the reason is in the kit {@link Tooltip} over the row and on
         * its `aria-describedby`, and the row wears the disabled look. It wins over
         * `disabled`. The row's `actions` are untouched — each control there is its own.
         */
        disabledReason?: ReactNode;
        /**
         * The row's click COMMITS. Under a locked {@link WriteLockProvider} it is locked
         * the `disabledReason` way with the lock's reason (which wins over its own). No
         * provider, or an unlocked one: no effect. Button's `commit`, for keksdose K3.
         */
        commit?: boolean;
        href?: never;
        renderLink?: never;
        external?: never;
        onAuxClick?: never;
      } & NotExpandable)
    | ({
        /**
         * Makes the row a link. A real `<a href>`, so a middle click opens it in a
         * background tab (keksdose feedback #451) — which a button calling `navigate`
         * cannot do.
         */
        href: string;
        /** Your router's link for an in-app `href`. Default: the `<UiKitProvider
         *  linkComponent>`, then `<a>`. The API `Chip`, `StatTile` and `MenuItem`
         *  share. Ignored for an `external` row. */
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
        disabledReason?: never;
        commit?: never;
      } & NotExpandable)
    | ({
        onClick?: never;
        href?: never;
        renderLink?: never;
        external?: never;
        onAuxClick?: never;
        disabledReason?: never;
        commit?: never;
      } & NotExpandable)
    | {
        /**
         * Makes the row a disclosure: the target is a button with `aria-expanded` and a
         * turning chevron at its end, and this opens under the row, outside the target
         * (so it may hold controls), animated by {@link Collapse}. keksdose's collapsible
         * groups — a group row with a select-all checkbox before it
         * ({@link ListItemBaseProps.leadingActions}) and its members inside.
         *
         * The row's ONE action is the toggle, so it takes no `onClick` or `href`. The
         * content is a `role="group"` named by the title, unmounted while shut (as a
         * `Disclosure`'s body is).
         */
        expandedContent: ReactNode;
        /** Controlled open state. Leave it out for the row to keep its own. */
        expanded?: boolean;
        /** The uncontrolled row's first state. Default `false`. */
        defaultExpanded?: boolean;
        /** Runs on every toggle with the new state. */
        onExpandedChange?: (expanded: boolean) => void;
        onClick?: never;
        href?: never;
        renderLink?: never;
        external?: never;
        onAuxClick?: never;
        disabledReason?: never;
        commit?: never;
      }
  );

interface NotExpandable {
  expandedContent?: never;
  expanded?: never;
  defaultExpanded?: never;
  onExpandedChange?: never;
}

/**
 * One row of a {@link List}: leading icon or avatar, title and subtitle (both
 * truncating by default), a trailing slot, and — beside the row, not inside it — its actions.
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
    titleLines = 1,
    overline,
    subtitle,
    subtitleLines = 1,
    meta,
    metaWrap = false,
    content,
    icon: Icon,
    leading,
    trailing,
    trailingTone = "muted",
    actions,
    leadingActions,
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
    renderRow,
    children,
    bodyClassName,
    href,
    renderLink,
    external = false,
    onClick,
    onAuxClick,
    disabledReason,
    commit,
    expandedContent,
    expanded: expandedProp,
    defaultExpanded = false,
    onExpandedChange,
    ...rest
  },
  ref,
) {
  const list = useContext(ListContext);
  const labels = useKitLabels("list", DEFAULT_LIST_LABELS);
  const kitLink = useKitLink();
  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const density = densityProp ?? list.density;
  const pad = PAD[density];
  const expandable = expandedContent !== undefined;
  const expanded = expandable && (expandedProp ?? ownExpanded);
  const isLink = href !== undefined && !disabled;
  const isButton = !isLink && (onClick !== undefined || expandable) && href === undefined;
  const interactive = isLink || isButton;
  // Only an onClick row takes a reason (the types allow no other); the hook runs on
  // every row so the hook order never depends on which kind of row this is.
  const lock = useLockReason(commit, disabledReason);
  const locked = lock.locked && isButton && !expandable;
  const inert = disabled || loading || locked;
  const hasBody = children !== undefined && children !== null && children !== false;
  // Anything under the row's own line: the box turns into a column, and the target
  // takes its own corners and hover fill (see `children`).
  const stacked = hasBody || expandable;
  const titleId = useId();
  const expandedId = useId();

  const toggle = () => {
    const next = !expanded;
    if (expandedProp === undefined) setOwnExpanded(next);
    onExpandedChange?.(next);
  };

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
        {overline != null && (
          <span className="block truncate text-[11px] font-medium leading-snug text-[var(--text-muted)]">
            {overline}
          </span>
        )}
        <span
          // Names the body's and the expanded content's group; harmless without one.
          id={stacked ? titleId : undefined}
          className={cn(
            "block text-sm text-[var(--text-primary)]",
            titleLines === 1 ? "truncate" : titleLines === 2 ? "line-clamp-2 break-words" : "break-words",
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
        {meta != null && (
          <span
            className={cn(
              "mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]",
              metaWrap ? "flex flex-wrap items-center gap-1" : "block truncate",
            )}
          >
            {meta}
          </span>
        )}
        {content != null && <span className="mt-1.5 block min-w-0">{content}</span>}
      </span>
      {trailing != null && (
        <span
          className={cn(
            "flex shrink-0 items-center gap-2 text-xs",
            trailingTone !== "inherit" && toneTextClass(trailingTone),
          )}
        >
          {trailing}
        </span>
      )}
      {loading ? (
        <Spinner label={null} className="size-3.5 shrink-0" />
      ) : (
        external && href !== undefined && (
          <ExternalLink className="size-3.5 shrink-0 text-[var(--text-muted)] rtl:-scale-x-100" aria-hidden />
        )
      )}
      {mark}
      {expandable && (
        // Turned, not swapped — the Disclosure card's convention: down while shut, up
        // while open. A rotation is its own mirror, so RTL needs nothing.
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 ease-out motion-reduce:transition-none",
            align === "start" && "mt-0.5",
            expanded && "rotate-180",
          )}
        />
      )}
    </>
  );

  const target = cn(
    "flex min-w-0 flex-1 text-start",
    align === "start" ? "items-start" : "items-center",
    pad.target,
    // When stacked the target is the top of the box, not all of it, so it takes its
    // own corners and its own hover fill (see `children`).
    stacked ? "rounded-md" : "rounded-[inherit]",
    stacked && interactive && !inert && !selected && "transition-colors hover:bg-[var(--bg-hover)]",
    interactive && TARGET_RING,
    interactive && !inert && "cursor-pointer",
    loading && "cursor-progress",
    locked && !loading && "cursor-not-allowed",
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
    const render = external ? undefined : pickLinkRenderer(renderLink, kitLink, href);
    main = render ? (
      <RenderedLink render={render} {...linkProps} />
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
        // loading row is only `aria-disabled` — see `loading` — and so is a locked one:
        // a reason wins over `disabled`, so the row stays reachable to say it.
        disabled={locked ? undefined : disabled}
        aria-disabled={loading || locked || undefined}
        aria-busy={loading || undefined}
        aria-current={selected ? "true" : undefined}
        aria-expanded={expandable ? expanded : undefined}
        aria-controls={expandable ? expandedId : undefined}
        aria-describedby={
          locked
            ? mergeDescribedBy(rest["aria-describedby"] as string | undefined, lock.reasonId)
            : (rest["aria-describedby"] as string | undefined)
        }
        onClick={
          loading || locked
            ? undefined
            : expandable
              ? toggle
              : (onClick as (event: MouseEvent<HTMLButtonElement>) => void)
        }
        className={target}
      >
        {body}
      </button>
    );
    if (locked) {
      // The Tooltip takes the target's place in the row, so it takes its flex sizing
      // too; the button fills it.
      main = (
        <LockedReason lock={lock} className="flex min-w-0 flex-1">
          {main}
        </LockedReason>
      );
    }
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

  const leadingActionsEl =
    leadingActions != null ? (
      <div className={cn("flex shrink-0 items-center", pad.gap, pad.leadingActions)}>{leadingActions}</div>
    ) : null;
  const actionsEl =
    actions != null ? <div className={cn("flex shrink-0 items-center", pad.gap, pad.actions)}>{actions}</div> : null;

  const row = (
    <div
      className={cn(
        "flex min-w-0 rounded-md border transition-colors",
        stacked ? "flex-col" : "items-center",
        // See `renderRow`: the wrapper may be inline, the row is not.
        renderRow && "w-full",
        selected
          ? "border-[var(--brand)] bg-[var(--bg-surface-2)]"
          : bordered
            ? "border-[var(--border)]"
            : "border-transparent",
        !stacked && interactive && !inert && !selected && "hover:bg-[var(--bg-hover)]",
        (disabled || locked) && "opacity-50",
        className,
      )}
    >
      {stacked ? (
        <>
          <div className="flex min-w-0 items-center">
            {leadingActionsEl}
            {main}
            {actionsEl}
          </div>
          {expandable && (
            <Collapse open={expanded}>
              <div id={expandedId} role="group" aria-labelledby={titleId} className={cn("min-w-0", pad.body)}>
                {expandedContent}
              </div>
            </Collapse>
          )}
          {hasBody && (
            <div role="group" aria-labelledby={titleId} className={cn("min-w-0", pad.body, bodyClassName)}>
              {children}
            </div>
          )}
        </>
      ) : (
        <>
          {leadingActionsEl}
          {main}
          {actionsEl}
        </>
      )}
    </div>
  );

  const Tag = as;
  return (
    <Tag
      className={cn(
        list.separator === "divider" && "border-b border-[var(--border)] last:border-b-0",
        list.separator === "divider" && as === "li" && "py-0.5",
        renderRow && "flex flex-col",
      )}
    >
      {renderRow ? renderRow(row) : row}
    </Tag>
  );
});

function RenderedLink({
  render,
  ...props
}: ListItemLinkProps & { render: (props: ListItemLinkProps) => ReactElement }) {
  return render(props);
}
