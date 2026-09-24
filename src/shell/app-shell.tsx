import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { NavLink, matchPath, useLocation } from "react-router";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { readStored, writeStored } from "../lib/safe-storage";
import { Tooltip } from "../components/tooltip";
import { useAnchoredRect } from "../hooks/use-anchored-rect";
import { useEscapeKey } from "../hooks/use-dismiss";
import { useMediaQuery } from "../hooks/use-media-query";
import { DEFAULT_APP_SHELL_LABELS, useKitLabels } from "../i18n/kit-labels";

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

/**
 * Exported and `<div>`-shaped. This is the outermost element of every consuming app, so
 * there is nothing above it to hang an id, a landmark label or a `data-tour` anchor on —
 * and nothing a consumer can wrap it in either, since the root owns the `h-dvh` and
 * `overflow-hidden` the whole layout is built on (audit §api-design).
 */
export interface AppShellProps extends ComponentPropsWithoutRef<"div"> {
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
  /** Default: `appShell.collapse` from the {@link UiKitProvider}, else English. */
  collapseLabel?: string;
  /** Default: `appShell.expand` from the {@link UiKitProvider}, else English. */
  expandLabel?: string;
  /** How an entry's `items` are revealed in the EXPANDED desktop sidebar.
   *
   *  - `"flyout"` (default) — a panel beside the sidebar on hover/focus. Compact: the
   *    sidebar stays one row per group however many pages a group holds.
   *  - `"inline"` — a disclosure under the entry, the pattern of MUI's nested List and
   *    most documentation sites. Every page is visible at once, and the group holding
   *    the current page opens on its own, so the reader can see where they are without
   *    hovering anything.
   *
   *  The icon-only (collapsed) sidebar always uses the flyout: an indented list has no
   *  room there. The mobile bottom bar ignores `items` in both modes. */
  subNav?: "flyout" | "inline";
  /** Accessible name of the inline disclosure button, given the group's label.
   *  Only used with `subNav="inline"`. Its expanded state is carried by
   *  `aria-expanded`, so one wording serves both directions. Default:
   *  `appShell.toggleGroup` from the {@link UiKitProvider}, else English. */
  toggleGroupLabel?: (groupLabel: string) => string;
  /** Below `md`: show the current group's `items` as a scrollable row above the
   *  bottom bar — the phone's counterpart of the sidebar's second level. Default true;
   *  `false` keeps the single bar, where a group entry only links to its own `to`. */
  mobileSubNav?: boolean;
}

/**
 * The bottom nav's own height, published as `--app-nav-h` so anything that has to sit
 * ON it can stop guessing.
 *
 * Keksdose live #314 is what this is for. Its rework — *"Stick it to the bottom
 * touching the bottom icon bar with budget, accounts, … Currently there is a small gap
 * which confuses"* — was a receipt footer pinned at `bottom-20`, because `<main>`
 * reserves `pb-20` for this nav and 20 looked like the nav's height. It is not: the
 * padding is generous CLEARANCE, and the nav is content-sized (icon + label + `py-2`,
 * about 56px), so the footer floated ~24px above the bar.
 *
 * Measured rather than named, because the height is not a constant anyone owns: it is
 * an icon, a translated label that can wrap or truncate, and whatever the platform does
 * with the safe-area inset. A hard-coded `bottom-14` would be the same guess one number
 * lower, and it would be wrong again the first time a label needed two lines.
 *
 * `0px` when the nav is not rendered — above `md` it is `display:none`, which observes
 * as a zero box — so a consumer can write `bottom-[var(--app-nav-h,0px)]` once and get
 * the right answer at both widths without a breakpoint of its own.
 */
function useNavHeightVar(ref: React.RefObject<HTMLElement | null>): void {
  // Re-run when the breakpoint flips. A ResizeObserver SKIPS an element that is not
  // being rendered, so the nav going `display:none` above `md` fires no callback and
  // would leave the last phone height published — a desktop footer would then sit 56px
  // off the bottom after a live resize. The query is the one the nav's own `md:hidden`
  // compiles to, so the two cannot disagree about where the boundary is.
  const isMdUp = useMediaQuery("(min-width: 768px)", false);
  useEffect(() => {
    const node = ref.current;
    const root = document.documentElement;
    // `getBoundingClientRect().height`, rounded DOWN — not `offsetHeight`, and not
    // ceil. Measured on the running app at 406x816: the bar is **55.5px** tall, and
    // both `offsetHeight` and `Math.ceil` answer 56. That is why live #314 round four
    // was *"No change. Still a pixel inbetween"* — the previous fix was arithmetically
    // a no-op on the very value it was meant to correct.
    //
    // 56 is the wrong side. A sticky element with `bottom: X` puts its bottom edge X
    // above the viewport bottom, and the bar's TOP edge is at its own height: so
    // X = 56 lands the footer at y=760.0 against a bar starting at y=760.5, i.e. half
    // a CSS pixel of page showing through — about 1.4 device pixels on his phone,
    // which is exactly the hairline in the screenshot.
    //
    // The two errors are not symmetric, and I had them backwards the first time.
    // Too SMALL tucks the sticky element under a bar that is opaque and painted above
    // it (`z-30` against `z-10`): invisible. Too LARGE opens the seam. So floor, and
    // consumers subtract a further pixel (see `invoice-line-totals.tsx`) for the case
    // where the height lands on a whole pixel and floor leaves no overlap at all.
    const publish = () =>
      root.style.setProperty(
        "--app-nav-h",
        `${node ? Math.floor(node.getBoundingClientRect().height) : 0}px`,
      );
    publish();
    // The observer is the refinement, not the mechanism: `publish()` above is already
    // right for a static nav, and jsdom has no ResizeObserver unless a test stubs one.
    // ONE cleanup for every branch, though — an early `return` on the no-observer path
    // left the variable behind on unmount, which a stale `bottom:` offset on whatever
    // rendered next would have inherited.
    const ro = node && typeof ResizeObserver !== "undefined" ? new ResizeObserver(publish) : null;
    if (ro && node) ro.observe(node);
    return () => {
      ro?.disconnect();
      root.style.removeProperty("--app-nav-h");
    };
  }, [ref, isMdUp]);
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
  collapseLabel,
  expandLabel,
  subNav = "flyout",
  mobileSubNav = true,
  toggleGroupLabel,
  className,
  ...rest
}: AppShellProps) {
  // The three props are per-shell overrides of the provider's `appShell`; one left
  // undefined falls through to the provider rather than to English.
  const labels = useKitLabels("appShell", DEFAULT_APP_SHELL_LABELS, {
    collapse: collapseLabel,
    expand: expandLabel,
    toggleGroup: toggleGroupLabel,
  });
  // Through the guarded helpers, not `window.localStorage` directly. The read runs
  // inside a `useState` initialiser — i.e. during render of the top-level shell — and
  // `localStorage` THROWS where site data is blocked (Safari private browsing, a
  // partitioned webview). Unguarded, that was not a lost sidebar preference: nothing
  // in the application mounted at all.
  const [collapsed, setCollapsed] = useState(() => readStored(collapseStorageKey) === "1");
  // The inline sidebar is an ACCORDION: one group open at a time, keyed by its `to`.
  // Held here rather than per group so opening one can close the other — two lists
  // open at once pushed every entry below them off a laptop screen.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  // Publishes `--app-nav-h` for anything that has to sit on the bottom bar.
  const navRef = useRef<HTMLDivElement>(null);
  useNavHeightVar(navRef);
  useEffect(() => {
    writeStored(collapseStorageKey, collapsed ? "1" : "0");
  }, [collapsed, collapseStorageKey]);

  return (
    // The caller's attributes go on the shell's own root, never on the `data-tour="nav"`
    // wrappers below — those are the kit's anchors for its own guided tour (#313/#322),
    // and a second element answering to the same selector is a tour that highlights the
    // wrong thing or nothing at all.
    <div {...rest} className={cn("relative flex flex-col min-h-screen md:h-dvh md:overflow-hidden", className)}>
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
                <SidebarNavItem
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  inline={subNav === "inline"}
                  toggleGroupLabel={labels.toggleGroup}
                  openGroup={openGroup}
                  setOpenGroup={setOpenGroup}
                />
              ))}
            </div>
          </nav>
          {sidebarFooter?.(collapsed)}
          <div className="border-t border-[var(--border)] p-2">
            {collapsed ? (
              <Tooltip label={labels.expand} side="right" portal className="block">
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  aria-label={labels.expand}
                  className="flex w-full items-center justify-center min-h-9 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                >
                  <PanelLeftOpen className="size-4 shrink-0" />
                </button>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label={labels.collapse}
                className="flex w-full items-center gap-3 min-h-9 px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              >
                <PanelLeftClose className="size-4 shrink-0" />
                <span className="truncate">{labels.collapse}</span>
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
          {/* `relative` makes <main> the containing block for everything absolutely
              positioned inside it. Tailwind's `sr-only` is `position:absolute`; with no
              positioned ancestor it resolves against the INITIAL containing block, is
              laid out at its offset from the top of the DOCUMENT, and grows
              `<html>`'s scroll height past the viewport — a second scrollbar beside this
              one that scrolls into empty space. Guarding it per component (see
              sr-only-containment.test) could never be complete: any page's own
              `sr-only` span re-opened it. Here it is closed for every child at once. */}
          <main className="relative flex-1 max-w-full overflow-x-clip pb-[calc(var(--app-nav-h,4rem)+1.5rem)] md:pb-0 md:min-h-0 md:overflow-y-auto md:[scrollbar-gutter:stable_both-edges]">
            {children}
          </main>
          {footer}
        </div>
      </div>

      {/* The phone navigation: the group bar, and above it — when the current page
          belongs to a group with pages of its own — the row of those pages. The pair
          is the phone's version of the sidebar's two levels; without the upper row a
          group's `items` were simply unreachable below `md`. ONE measured box, so
          `--app-nav-h` covers both rows and whatever docks on the bar sits on the
          whole of it. */}
      <div
        ref={navRef}
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--bg-surface)]"
      >
        {mobileSubNav && <MobileSubNav nav={nav} />}
        <nav
          data-tour="nav"
          className="grid"
          style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
        >
          {nav.map((item) => (
            <MobileNavItem key={item.to} item={item} />
          ))}
        </nav>
      </div>
    </div>
  );
}

/** One cell of the phone's group bar. Marked while the group's own page OR any of its
 *  pages is current — NavLink alone only knows its own `to`, which left the bar with
 *  nothing marked on every sub-page (the same defect the sidebar had). */
function MobileNavItem({ item }: { item: AppShellNavItem }) {
  const subActive = useSubItemActive(item);
  return (
    <NavLink
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
          isActive || subActive
            ? "font-semibold text-[var(--brand)] before:bg-[var(--brand)]"
            : "text-[var(--text-muted)] before:bg-transparent",
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
      <span className="max-w-full truncate px-0.5">{item.shortLabel ?? item.label}</span>
    </NavLink>
  );
}

/**
 * The upper row of the phone navigation: the pages of the group the reader is in, as
 * a sideways-scrolling row of pills. Rendered only while such a group is current —
 * on a page outside every group the bar stays one row, rather than showing an empty
 * shelf or guessing a group.
 *
 * It slides in over 200ms (fade only under reduced motion) and wraps onto more rows
 * rather than scrolling, so every page of the group is in view at once.
 */
function MobileSubNav({ nav }: { nav: AppShellNavItem[] }) {
  const { pathname } = useLocation();
  const group = nav.find(
    (item) =>
      !!item.items?.length &&
      (matchPath({ path: item.to, end: item.end ?? true }, pathname) ||
        item.items.some((sub) => matchPath({ path: sub.to, end: sub.end ?? true }, pathname))),
  );

  if (!group) return null;
  return (
    <nav
      aria-label={group.label}
      // Keyed by group so switching groups replays the entrance.
      key={group.to}
      className="animate-subnav border-b border-[var(--border)]"
    >
      <ul
        // Wraps onto as many rows as the group needs rather than scrolling sideways: a
        // sideways row hides pages past the edge, and every page of the group in view
        // is the point of the row. The bar grows with it — `--app-nav-h` measures it.
        className="flex flex-wrap gap-1.5 px-3 py-2"
      >
        {group.items!.map((sub) => (
          <li key={sub.to} className="shrink-0">
            <NavLink
              to={sub.to}
              end={sub.end ?? true}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                  isActive
                    ? "border-[var(--brand)] bg-[var(--brand)] font-medium text-[var(--brand-contrast)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                )
              }
            >
              <sub.icon className="size-3.5 shrink-0" aria-hidden />
              {sub.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** `strong` is the current page; `trail` is the group that CONTAINS the current page
 *  while the page itself is shown elsewhere (the inline list below it). */
const navLinkClass = (collapsed: boolean, forceActive: boolean, trail = false) =>
  ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 min-h-9 ${collapsed ? "justify-center px-2" : "px-3"} py-2 rounded-md text-sm transition-colors duration-150 ${
      isActive || (forceActive && !trail)
        ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
        : forceActive
          ? "font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
    }`;

/** Whether any of an entry's sub-items is the current route. NavLink only knows about
 *  its OWN `to`, so without this a group whose pages live at sibling paths
 *  (`/fields`, `/numbers`, …) lost its highlight the moment the reader left the one
 *  page the group linked to — the sidebar then marked nothing at all, and the only
 *  "you are here" left was inside a flyout that is closed unless hovered. */
function useSubItemActive(item: AppShellNavItem): boolean {
  const { pathname } = useLocation();
  return !!item.items?.some((sub) => matchPath({ path: sub.to, end: sub.end ?? true }, pathname));
}

/** A single desktop sidebar entry. Plain link (with a tooltip when collapsed) —
 *  unless it has sub-items, in which case hovering/focusing opens a flyout, or (with
 *  `inline`) a disclosure lists them underneath. */
function SidebarNavItem({
  item,
  collapsed,
  inline,
  toggleGroupLabel,
  openGroup,
  setOpenGroup,
}: {
  item: AppShellNavItem;
  collapsed: boolean;
  inline: boolean;
  toggleGroupLabel: (groupLabel: string) => string;
  openGroup: string | null;
  setOpenGroup: (to: string | null) => void;
}) {
  const hasSub = !!item.items?.length;
  const subActive = useSubItemActive(item);

  // In the EXPANDED sidebar a group is one component in both styles, so switching
  // between them is a transition of the same element (the page list folding away or
  // unfolding) rather than one tree replaced by another. The icon-only sidebar keeps
  // the plain flyout below: an indented list has no room there.
  if (hasSub && !collapsed) {
    return (
      <SidebarGroup
        item={item}
        subActive={subActive}
        inline={inline}
        toggleGroupLabel={toggleGroupLabel}
        open={openGroup === item.to}
        setOpenGroup={setOpenGroup}
      />
    );
  }

  const link = (
    <NavLink
      to={item.to}
      end={item.end ?? true}
      data-tour={item.dataTour}
      className={navLinkClass(collapsed, subActive)}
      aria-haspopup={hasSub ? "menu" : undefined}
    >
      <span className="relative shrink-0">
        <item.icon className="size-4" />
      </span>
      {/* Wraps rather than truncates: in the sidebar a label cut to "Checkbox, switch
          & sl…" hides the one word that tells two pages apart, and there is height
          to spare. (The phone bar keeps `truncate` — its cells must stay one row.) */}
      {!collapsed && <span className="min-w-0 flex-1 break-words leading-snug">{item.label}</span>}
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

/**
 * An entry with sub-items in the expanded sidebar.
 *
 * - `inline`: the entry's own link (its overview page) plus a chevron button that
 *   shows or hides the sub-items indented beneath it. Two controls rather than one
 *   because they do two different things — a row that both navigated AND toggled
 *   would make "open the overview" and "peek at the pages" the same click.
 * - flyout: the link alone, with the sub-items in a panel beside the sidebar on
 *   hover/focus. The inline list is still rendered, folded shut, so that switching
 *   styles animates it rather than swapping it.
 *
 * THE FOLD is a `grid-template-rows` transition from `0fr` to `1fr` — the one way to
 * animate to a content-sized height without measuring it, so a translated label that
 * wraps to two lines unfolds exactly as far as it needs. `visibility` rides the same
 * transition so a shut list drops out of the accessibility tree only once it has
 * finished closing, and `inert` takes its links out of the tab order immediately.
 */
function SidebarGroup({
  item,
  subActive,
  inline,
  toggleGroupLabel,
  open,
  setOpenGroup,
}: {
  item: AppShellNavItem;
  subActive: boolean;
  inline: boolean;
  toggleGroupLabel: (groupLabel: string) => string;
  /** Whether this is the sidebar's one open group (see AppShell's `openGroup`). */
  open: boolean;
  setOpenGroup: (to: string | null) => void;
}) {
  const listId = useId();
  const { pathname } = useLocation();
  const onOwnPage = !!matchPath({ path: item.to, end: item.end ?? true }, pathname);
  // Opening follows the reader: arriving on this group's overview or one of its pages
  // (by link, by the pager, by Back) opens it — and, the sidebar holding ONE open
  // group, closes whichever was open before. Both folds run at once, so the eye sees
  // one list hand over to the other. Run in an effect after mount, so the current
  // group UNFOLDS into view on load rather than appearing already open.
  const here = subActive || onOwnPage;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the route, see above
    if (here) setOpenGroup(item.to);
  }, [here, item.to, setOpenGroup]);
  const expanded = inline && open;

  const link = (
    <NavLink
      to={item.to}
      end={item.end ?? true}
      data-tour={item.dataTour}
      aria-haspopup={inline ? undefined : "menu"}
      // `trail` (inline only): while a page of the group is current, the group row is
      // the breadcrumb, not the destination — the page's own row below carries the
      // strong marker, and two inverse rows would say "you are here" twice. In the
      // flyout style the pages are out of sight, so the group row IS the marker.
      className={(state) => cn(navLinkClass(false, subActive, inline)(state), "min-w-0 flex-1")}
    >
      <span className="relative shrink-0">
        <item.icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 break-words leading-snug">{item.label}</span>
      {!inline && <ChevronRight className="size-3.5 shrink-0 opacity-60 rtl:-scale-x-100" />}
    </NavLink>
  );

  return (
    <div>
      {inline ? (
        <div className="flex items-center gap-0.5">
          {link}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={toggleGroupLabel(item.label)}
            onClick={() => setOpenGroup(open ? null : item.to)}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none rtl:-scale-x-100",
                // Under dir="rtl" the chevron is MIRRORED first (scale applies before rotate), so
                // it starts pointing left and a +90° turn would point it UP — hence −90° there.
                open && "rotate-90 rtl:-rotate-90",
              )}
            />
          </button>
        </div>
      ) : (
        <SidebarFlyout item={item}>{link}</SidebarFlyout>
      )}
      <div
        id={listId}
        inert={!expanded}
        className="grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          visibility: expanded ? "visible" : "hidden",
        }}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-opacity duration-200 ease-out motion-reduce:transition-none",
            expanded ? "opacity-100" : "opacity-0",
          )}
        >
          {/* The rule and indent live on the list INSIDE the clipping box: margin or
              padding on the element whose row is collapsing to 0fr would hold it open
              by that much. */}
          <ul className="ms-[1.3rem] mt-0.5 space-y-0.5 border-s border-[var(--border)] ps-2">
            {item.items!.map((sub) => (
              <li key={sub.to}>
                <NavLink
                  to={sub.to}
                  end={sub.end ?? true}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-8 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                    )
                  }
                >
                  <sub.icon className="size-4 shrink-0 opacity-70" aria-hidden />
                  <span className="min-w-0 break-words leading-snug">{sub.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
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
              className="animate-flyout min-w-52 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg"
            >
              <div className="border-b border-[var(--border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
                            ? "bg-[var(--bg-active)] font-medium text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                        )
                      }
                    >
                      <sub.icon className="size-4 shrink-0 text-[var(--text-placeholder)]" />
                      <span className="min-w-0 break-words leading-snug">{sub.label}</span>
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
