import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, matchPath, useHref, useLocation } from "react-router";
import { ChevronRight, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { scrollIntoStrip, useStripFade } from "../lib/strip-fade";
import { dirOf, type Direction } from "../lib/direction";
import { readStored, writeStored } from "../lib/safe-storage";
import { Tooltip } from "../components/tooltip";
import { pickLinkRenderer } from "../components/text-link";
import { DialogFrame } from "../components/dialog-frame";
import { CompactControls } from "../components/ui";
import { useAnchoredRect } from "../hooks/use-anchored-rect";
import { useEscapeKey } from "../hooks/use-dismiss";
import { useBreakpoint } from "../hooks/use-breakpoint";
import { useTextSize } from "../theme/text-size";
import type { TextSize } from "../theme/text-size";
import { DEFAULT_APP_SHELL_LABELS, useKitLabels, useKitLink } from "../i18n/kit-labels";
import type { KitLinkComponent, KitLinkProps } from "../i18n/kit-labels";

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
  /** 0.31.0: leave this entry out of the MOBILE BOTTOM BAR; the sidebar keeps it.
   *  For an entry a phone reaches another way — the brand link to the start page —
   *  when one cell fewer is what keeps the others' labels whole (the bar divides its
   *  width evenly, see `shortLabel`). Its group's sub-row still shows while one of its
   *  pages is open. Named like `DataTable`'s column `mobileHidden`. */
  mobileHidden?: boolean;
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
 * One entry of the sidebar's bottom area ({@link AppShellProps.sidebarFooterItems}) —
 * the version link and the legal links kastlan hand-built in `sidebarFooter`.
 *
 * - `link` (default): one link. Expanded it shows `icon` + `text` (default `label`),
 *   with `hint` as a tooltip if given; collapsed it is the icon alone, named and
 *   tooltipped by `label`.
 * - `links`: a small group — the legal links. Expanded, a `<nav>` named `label` holding
 *   the links as a wrapping row of small text; collapsed, ONE icon link to `to` (default
 *   the first link's), named and tooltipped by `label`, since a column of icons for
 *   "Imprint", "Privacy" and "Terms" would say nothing an icon can.
 */
export type AppShellSidebarFooterItem =
  | {
      kind?: "link";
      key: string;
      to: string;
      icon: LucideIcon;
      /** The link's name, and the tooltip when collapsed ("What's new · v1.4.0"). */
      label: string;
      /** Visible text when expanded ("Kastlan v1.4.0"). Default `label`. */
      text?: ReactNode;
      /** A tooltip on the expanded link ("What's new"). */
      hint?: string;
      /** Leaves the app: a plain `<a target="_blank" rel="noopener noreferrer">`. */
      external?: boolean;
    }
  | {
      kind: "links";
      key: string;
      icon: LucideIcon;
      /** The group's name — its `<nav>` label, and the collapsed icon's name ("Legal"). */
      label: string;
      /** The collapsed icon's target. Default the first link's `to`. */
      to?: string;
      links: { to: string; label: string; external?: boolean }[];
    };

/**
 * The words of the phone bar's "More" cell and its sheet (0.32,
 * docs/text-size-harmonization.md §4 Navigation, §10.7) — the `appShellMore` namespace of
 * `<UiKitProvider labels>`, overridable per shell through `moreLabels`.
 */
export interface AppShellMoreLabels {
  /** The cell's visible label, under its icon — one short word. */
  more: string;
  /** The sheet's heading, and so its accessible name. */
  moreTitle: string;
}

export const DEFAULT_APP_SHELL_MORE_LABELS: AppShellMoreLabels = {
  more: "More",
  moreTitle: "More pages",
};

/**
 * The most entries the phone bar shows before the rest go under "More", per text size
 * (§10.7): every entry at Normal, four at Large, three at Extra large. A fifth of a
 * 360 px phone at 150 % is 48 px of Normal-sized room, and the cells hold a word each.
 */
export const DEFAULT_MOBILE_BAR_MAX: Readonly<Record<TextSize, number>> = {
  normal: Number.POSITIVE_INFINITY,
  large: 4,
  xlarge: 3,
};

/**
 * Split the bar's entries into the cells shown and the ones under "More", in the app's
 * order (§10.7: the app puts its four most used first, or orders by role). One hidden
 * entry is no saving — the More cell would take its place — so the bar then shows them
 * all: the cell count is the same either way, and a real entry beats a detour.
 */
export function splitMobileBar<T>(entries: readonly T[], max: number): { shown: T[]; hidden: T[] } {
  const limit = Math.max(1, Math.floor(max));
  if (entries.length <= limit + 1) return { shown: [...entries], hidden: [] };
  return { shown: entries.slice(0, limit), hidden: entries.slice(limit) };
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
  /** The sidebar's bottom area as data — a version link, the legal links — drawn full
   *  when expanded and as icon + tooltip when collapsed. Rendered above
   *  `sidebarFooter`, which stays for anything the data cannot describe. */
  sidebarFooterItems?: AppShellSidebarFooterItem[];
  /** The router link for `sidebarFooterItems`. Default: the provider's
   *  `linkComponent`, else react-router's `Link`. */
  renderLink?: KitLinkComponent;
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
  /**
   * How the phone sub-nav lays out a group with more pages than fit on one row.
   * `"wrap"`: every page in view, on as many rows as it takes — the bar grows.
   * `"scroll"`: one row that scrolls sideways, faded at a cut edge, with the current
   * page scrolled into view. A long group took four rows (~130px) of a 390px screen
   * above the bottom bar (showcase audit); scrolling gives that back at the price of
   * pages hidden past the edge, so it is the app's call, per shell.
   *
   * Unset (0.32.2, kastlan's 0.32.1 report): `"wrap"` at Normal and `"scroll"` at Large
   * and Extra large, where a wrapped group of eight pages took six or seven rows and
   * covered the page — the other half of what `mobileBarMax` does for the bar.
   */
  mobileSubNavLayout?: "wrap" | "scroll";
  /**
   * The most entries the phone bar shows; the rest move into a "More" cell that opens a
   * sheet listing them, each group with its pages (0.32, docs/text-size-harmonization.md
   * §4, §10.7). The bar takes `nav` in the app's order — after `mobileHidden` — so the
   * app puts its most used entries first (or orders by role: kastlan's manager and
   * accountant see different firsts).
   *
   * Default {@link DEFAULT_MOBILE_BAR_MAX}: unlimited at Normal, 4 at Large, 3 at Extra
   * large, because the cells' words grow with the text and the phone does not. A number
   * replaces the default at every size; `{ large: 5 }` replaces it at one size only.
   * Never fewer than one entry; and one entry over the limit shows in full rather than
   * behind a More that would take the same cell.
   */
  mobileBarMax?: number | Partial<Record<TextSize, number>>;
  /** The More cell's words over the provider's `appShellMore`. */
  moreLabels?: Partial<AppShellMoreLabels>;
  /**
   * Lay the shell out inside its PARENT'S box instead of the viewport: `h-full` rather
   * than `h-dvh`, its own scroll container at every width, a bottom bar pinned to the
   * shell rather than the window, `--app-nav-h` published on the shell alone, and no
   * persisted collapse state unless `collapseStorageKey` is passed. For an app preview,
   * a device frame, a docs example.
   *
   * Implied for a shell rendered inside another AppShell, which is the case this
   * exists for: the inner one used to publish its own nav height on `<html>`, fight
   * the outer one over it, and remove it on unmount from under the outer app.
   */
  embedded?: boolean;
}

/** True below an AppShell — how a nested shell knows it is one. */
const AppShellNesting = createContext(false);

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
function useNavHeightVar(
  ref: React.RefObject<HTMLElement | null>,
  shellRef: React.RefObject<HTMLElement | null>,
  embedded: boolean,
): void {
  // Re-run when the breakpoint flips. A ResizeObserver SKIPS an element that is not
  // being rendered, so the nav going `display:none` above `md` fires no callback and
  // would leave the last phone height published — a desktop footer would then sit 56px
  // off the bottom after a live resize. `useBreakpoint("md")` is the nav's own `md:hidden`
  // at the text size in force (0.32), so the two cannot disagree about where the
  // boundary is — at Extra large both move to 72rem.
  const isMdUp = useBreakpoint("md", false);
  useEffect(() => {
    const node = ref.current;
    const shell = shellRef.current;
    // Always on the shell's own root, so everything inside it — a nested shell's
    // content included — reads the nearest bar's height. On <html> as well only for
    // the OUTERMOST shell, for what it portals to <body> (a sheet docking on the bar).
    // The DOM check backs up the context for a shell mounted in a separate React root.
    const global = !embedded && !shell?.parentElement?.closest("[data-app-shell]");
    const targets = [shell, global ? document.documentElement : null].filter(
      (el): el is HTMLElement => el !== null,
    );
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
    const publish = () => {
      const value = `${node ? Math.floor(node.getBoundingClientRect().height) : 0}px`;
      for (const el of targets) el.style.setProperty("--app-nav-h", value);
    };
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
      for (const el of targets) el.style.removeProperty("--app-nav-h");
    };
  }, [ref, shellRef, embedded, isMdUp]);
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
  sidebarFooterItems,
  renderLink,
  collapseStorageKey: collapseStorageKeyProp,
  collapseLabel,
  expandLabel,
  subNav = "flyout",
  mobileSubNav = true,
  mobileSubNavLayout: mobileSubNavLayoutProp,
  mobileBarMax,
  moreLabels,
  toggleGroupLabel,
  embedded: embeddedProp,
  className,
  ...rest
}: AppShellProps) {
  const embedded = useContext(AppShellNesting) || !!embeddedProp;
  const { size: textSize } = useTextSize();
  const large = textSize !== "normal";
  const mobileSubNavLayout = mobileSubNavLayoutProp ?? (large ? "scroll" : "wrap");
  // The bottom bar's cells: every entry the phone does not reach another way, up to the
  // text size's limit; the rest go under More (§10.7).
  const barMax =
    typeof mobileBarMax === "number"
      ? mobileBarMax
      : (mobileBarMax?.[textSize] ?? DEFAULT_MOBILE_BAR_MAX[textSize]);
  const { shown: barNav, hidden: moreNav } = splitMobileBar(
    nav.filter((item) => !item.mobileHidden),
    barMax,
  );
  // An embedded shell sharing the default key would overwrite the outer app's sidebar
  // preference with its own — so it persists only when given a key of its own.
  const collapseStorageKey =
    collapseStorageKeyProp ?? (embedded ? null : "appLayout.sidebarCollapsed");
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
  const [collapsed, setCollapsed] = useState(
    () => collapseStorageKey !== null && readStored(collapseStorageKey) === "1",
  );
  // The inline sidebar is an ACCORDION: one group open at a time, keyed by its `to`.
  // Held here rather than per group so opening one can close the other — two lists
  // open at once pushed every entry below them off a laptop screen.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  // Publishes `--app-nav-h` for anything that has to sit on the bottom bar.
  const navRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useNavHeightVar(navRef, rootRef, embedded);
  useEffect(() => {
    if (collapseStorageKey !== null) writeStored(collapseStorageKey, collapsed ? "1" : "0");
  }, [collapsed, collapseStorageKey]);
  // §4: at Large and Extra large the sidebar never collapses to icons only — a glyph
  // with its name in a tooltip is the very thing a reader who asked for bigger type
  // cannot use. The persisted preference is left alone, so Normal gets it back, and the
  // toggle goes while it could not do anything.
  const iconOnly = collapsed && !large;

  return (
    // The caller's attributes go on the shell's own root, never on the `data-tour="nav"`
    // wrappers below — those are the kit's anchors for its own guided tour (#313/#322),
    // and a second element answering to the same selector is a tour that highlights the
    // wrong thing or nothing at all.
    <AppShellNesting.Provider value={true}>
      <div
        {...rest}
        ref={rootRef}
        data-app-shell=""
        className={cn(
          "relative flex flex-col",
          embedded
            ? // `contain: layout` makes this box the containing block for the `fixed`
              // bottom bar below, so it pins to the shell rather than to the window.
              "h-full min-h-0 overflow-hidden [contain:layout]"
            : "min-h-screen md:h-dvh md:overflow-hidden",
          className,
        )}
      >
        {/* §4: "the top bar keeps its essential icons" — its IconButtons stay icons at
            Large (their labels the names and tooltips) and a locked one keeps its reason
            in the tooltip: a bar 3rem tall has no room for words under every glyph. */}
        <CompactControls>{topBar}</CompactControls>
        <div className="flex flex-1 min-h-0">
          <aside
            className={cn(
              // `border-e`: the sidebar sits at the START, which is the right in RTL.
              "hidden md:flex md:flex-col border-e border-[var(--border)] bg-[var(--bg-surface)] transition-[width] duration-200 ease-out overflow-hidden",
              // Embedded, the row it sits in is already the shell's height; the sticky
              // offsets below are measured against the window's top bar.
              embedded ? "md:self-stretch" : "md:sticky md:top-12 md:self-start md:h-[calc(100vh-3rem)]",
              iconOnly ? "md:w-14" : "md:w-60",
            )}
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
                    collapsed={iconOnly}
                    inline={subNav === "inline"}
                    toggleGroupLabel={labels.toggleGroup}
                    openGroup={openGroup}
                    setOpenGroup={setOpenGroup}
                  />
                ))}
              </div>
            </nav>
            {!!sidebarFooterItems?.length && (
              <SidebarFooterItems items={sidebarFooterItems} collapsed={iconOnly} renderLink={renderLink} />
            )}
            {sidebarFooter?.(iconOnly)}
            {/* No toggle at Large: the sidebar cannot collapse there (see `iconOnly`). */}
            {!large && (
              <div className="border-t border-[var(--border)] p-2">
                {collapsed ? (
                  <Tooltip label={labels.expand} side="end" portal className="block">
                    <button
                      type="button"
                      onClick={() => setCollapsed(false)}
                      aria-label={labels.expand}
                      className="flex w-full items-center justify-center min-h-9 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                    >
                      <PanelLeftOpen className="size-4 shrink-0 rtl:-scale-x-100" />
                    </button>
                  </Tooltip>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    aria-label={labels.collapse}
                    className="flex w-full items-center gap-3 min-h-9 px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                  >
                    <PanelLeftClose className="size-4 shrink-0 rtl:-scale-x-100" />
                    <span className="truncate">{labels.collapse}</span>
                  </button>
                )}
              </div>
            )}
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
            <main
              className={cn(
                "relative flex-1 max-w-full overflow-x-clip pb-[calc(var(--app-nav-h,4rem)+1.5rem)] md:pb-0 md:min-h-0 md:overflow-y-auto md:[scrollbar-gutter:stable_both-edges]",
                // Embedded there is no document scroll to lean on below `md` either.
                embedded && "min-h-0 overflow-y-auto",
              )}
            >
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
          {mobileSubNav && <MobileSubNav nav={nav} layout={mobileSubNavLayout} />}
          <nav
            data-tour="nav"
            className="grid"
            style={{ gridTemplateColumns: `repeat(${barNav.length + (moreNav.length ? 1 : 0)}, minmax(0, 1fr))` }}
          >
            {barNav.map((item) => (
              <MobileNavItem key={item.to} item={item} />
            ))}
            {moreNav.length > 0 && <MobileMoreCell hidden={moreNav} labels={moreLabels} />}
          </nav>
        </div>
      </div>
    </AppShellNesting.Provider>
  );
}

const routerLink: KitLinkComponent = ({ href, ...p }) => <Link to={href} {...p} />;
const plainLink: KitLinkComponent = ({ children, ...p }) => <a {...p}>{children}</a>;

const FOOTER_ICON_LINK =
  "flex min-h-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]";

/** Calls the link renderer as a component, so a router link's hooks are its own. */
function RenderedLink({ render, ...props }: KitLinkProps & { render: KitLinkComponent }) {
  return render(props);
}

/** The sidebar's bottom area, from {@link AppShellSidebarFooterItem}s. */
function SidebarFooterItems({
  items,
  collapsed,
  renderLink,
}: {
  items: AppShellSidebarFooterItem[];
  collapsed: boolean;
  renderLink?: KitLinkComponent;
}) {
  const kitLink = useKitLink();
  const linkTo = (to: string, external: boolean | undefined, { children, ...props }: Omit<KitLinkProps, "href">) => {
    // The kit's one link rule (`pickLinkRenderer`): an external `to` or an in-page
    // `#anchor` is a plain `<a>` even without `external`; only `external` opens a tab.
    const InApp = pickLinkRenderer(renderLink, kitLink ?? routerLink, to) ?? plainLink;
    return external ? (
      <a href={to} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    ) : (
      <RenderedLink render={InApp} href={to} {...props}>
        {children}
      </RenderedLink>
    );
  };

  return (
    <div data-slot="sidebar-footer-items" className={cn("px-2 py-1", collapsed ? "space-y-1" : "space-y-1.5")}>
      {items.map((item) => {
        if (collapsed) {
          const to = item.kind === "links" ? (item.to ?? item.links[0]?.to) : item.to;
          if (!to) return null;
          const external = item.kind === "links" ? item.links.find((l) => l.to === to)?.external : item.external;
          return (
            <Tooltip key={item.key} label={item.label} side="end" portal className="block">
              {linkTo(to, external, {
                "aria-label": item.label,
                className: FOOTER_ICON_LINK,
                children: <item.icon className="size-4" aria-hidden />,
              })}
            </Tooltip>
          );
        }
        if (item.kind === "links") {
          return (
            <nav
              key={item.key}
              aria-label={item.label}
              className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-caption text-[var(--text-muted)]"
            >
              {item.links.map((l) => (
                <span key={l.to}>
                  {linkTo(l.to, l.external, {
                    className: "rounded-sm hover:text-[var(--text-secondary)] hover:underline",
                    children: l.label,
                  })}
                </span>
              ))}
            </nav>
          );
        }
        const link = linkTo(item.to, item.external, {
          className: cn(FOOTER_ICON_LINK, "gap-1.5 text-xs font-medium"),
          children: (
            <>
              <item.icon className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{item.text ?? item.label}</span>
            </>
          ),
        });
        return item.hint ? (
          <Tooltip key={item.key} label={item.hint} side="top" portal className="block">
            {link}
          </Tooltip>
        ) : (
          <div key={item.key}>{link}</div>
        );
      })}
    </div>
  );
}

/**
 * A bar cell's look, shared by the entries and the More cell. The active page needs a
 * clear marker, not just a subtle text shade (feedback #327): brand-accent icon + label,
 * bolder weight, and a top accent bar spanning the cell so it reads at a glance.
 */
const mobileCellClass = (active: boolean) =>
  cn(
    // `h-full`: the grid row stretches every cell to the tallest one's height, so a
    // label on two lines never leaves its neighbours a different shape.
    "relative flex h-full w-full flex-col items-center justify-start py-2 text-caption gap-0.5 transition-colors",
    "before:absolute before:content-[''] before:inset-x-4 before:top-0 before:h-0.5 before:rounded-full before:transition-colors",
    active
      ? "font-semibold text-[var(--brand)] before:bg-[var(--brand)]"
      : "text-[var(--text-muted)] before:bg-transparent",
  );

/**
 * A bar cell's label (0.32, §10.7): up to TWO lines, never an ellipsis on one. At Large
 * a cell is a fifth of a phone holding type a quarter bigger, and one line truncated
 * "Transactions" to "Trans…" in every app (Kurvenschmiede). Two lines and then a clamp,
 * centred, a long word broken (and hyphenated where the page's `lang` allows) rather
 * than overflowing into the next cell. `shortLabel` still wins where the app has one.
 */
function MobileCellLabel({ children }: { children: ReactNode }) {
  return (
    <span className="line-clamp-2 max-w-full break-words px-0.5 text-center leading-tight hyphens-auto">
      {children}
    </span>
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
      className={({ isActive }) => mobileCellClass(isActive || subActive)}
    >
      <span className="relative">
        <item.icon className="size-5" />
      </span>
      <MobileCellLabel>{item.shortLabel ?? item.label}</MobileCellLabel>
    </NavLink>
  );
}

/** Whether the current route is `item`'s page or one of its pages. */
function entryIsCurrent(item: AppShellNavItem, pathname: string): boolean {
  return (
    !!matchPath({ path: item.to, end: item.end ?? true }, pathname) ||
    !!item.items?.some((sub) => matchPath({ path: sub.to, end: sub.end ?? true }, pathname))
  );
}

/** A hidden entry's link, resolved as the router would write it (basename included). */
function TourAnchor({ to, dataTour }: { to: string; dataTour?: string }) {
  const href = useHref(to);
  return (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- a tour anchor, aria-hidden and inert; the More button under it is the control (see MobileMoreCell)
    <a
      href={href}
      data-tour={dataTour}
      // Not a control: no name, no tab stop, no pointer — the More button under it
      // takes the tap. It exists only to be FOUND (see MobileMoreCell).
      aria-hidden
      tabIndex={-1}
      className="pointer-events-none absolute inset-0"
    />
  );
}

/**
 * The bar's "More" cell (0.32, docs/text-size-harmonization.md §4, §10.7): the entries
 * past `mobileBarMax`, in a sheet — each entry as a link, and under a group its pages,
 * since a group the bar no longer shows has no sub-row to reach them by either. Marked
 * active while the current page is one of them, as the cell it replaced would be.
 *
 * **Tour anchors.** A guided tour finds a nav entry by `[data-tour="nav"] a[href="/x"]`
 * (keksdose's tours) or by the entry's own `dataTour`. An entry under More has no link
 * in the bar, and the sidebar's copy is `display:none` on a phone, so such a step would
 * spotlight nothing. So the More cell carries the hidden entries' links — one `<a>` per
 * entry and per page of a hidden group, with the entry's `href` and `dataTour` — laid
 * over the cell (`absolute inset-0`): both selectors resolve to a visible box, and that
 * box is the More cell, which is where the reader has to go next. They are
 * `aria-hidden`, out of the tab order and pointer-transparent, so neither a screen
 * reader nor a tap ever meets them; the button under them is the one control.
 */
function MobileMoreCell({
  hidden,
  labels: labelsProp,
}: {
  hidden: AppShellNavItem[];
  labels?: Partial<AppShellMoreLabels>;
}) {
  const labels: AppShellMoreLabels = useKitLabels("appShellMore", DEFAULT_APP_SHELL_MORE_LABELS, labelsProp);
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const active = hidden.some((item) => entryIsCurrent(item, pathname));
  const close = () => setOpen(false);
  return (
    <div data-slot="app-shell-more" className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={mobileCellClass(active)}
      >
        <span className="relative">
          <MoreHorizontal aria-hidden className="size-5" />
        </span>
        <MobileCellLabel>{labels.more}</MobileCellLabel>
      </button>
      {hidden.flatMap((item) => [
        <TourAnchor key={item.to} to={item.to} dataTour={item.dataTour} />,
        ...(item.items ?? []).map((sub) => <TourAnchor key={`${item.to} ${sub.to}`} to={sub.to} />),
      ])}
      <DialogFrame open={open} onClose={close} title={labels.moreTitle} closeButton bodyClassName="space-y-1">
        <ul className="space-y-1">
          {hidden.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? true}
                onClick={close}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                  )
                }
              >
                <item.icon aria-hidden className="size-5 shrink-0" />
                <span className="min-w-0 break-words leading-snug">{item.label}</span>
              </NavLink>
              {!!item.items?.length && (
                <ul aria-label={item.label} className="ms-[1.3rem] mt-0.5 space-y-0.5 border-s border-[var(--border)] ps-2">
                  {item.items.map((sub) => (
                    <li key={sub.to}>
                      <NavLink
                        to={sub.to}
                        end={sub.end ?? true}
                        onClick={close}
                        className={({ isActive }) =>
                          cn(
                            "flex min-h-11 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                          )
                        }
                      >
                        <sub.icon aria-hidden className="size-4 shrink-0 opacity-70" />
                        <span className="min-w-0 break-words leading-snug">{sub.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </DialogFrame>
    </div>
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
function MobileSubNav({ nav, layout }: { nav: AppShellNavItem[]; layout: "wrap" | "scroll" }) {
  const { pathname } = useLocation();
  const scroll = layout === "scroll";
  const listRef = useRef<HTMLUListElement>(null);
  const fade = useStripFade(listRef);
  // The current page into view — the row only, never the page.
  useLayoutEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (scroll && list && current) scrollIntoStrip(list, current);
  }, [scroll, pathname]);
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
        ref={listRef}
        // `wrap` (default) takes as many rows as the group needs: a sideways row hides
        // pages past the edge, and every page of the group in view is the point of the
        // row. The bar grows with it — `--app-nav-h` measures it. `scroll` is the app's
        // opt-in trade: one row, the cut edge faded (see mobileSubNavLayout).
        className={cn(
          "flex gap-1.5 px-3 py-2",
          scroll ? "overflow-x-auto overscroll-x-contain [scrollbar-width:none]" : "flex-wrap",
        )}
        data-overflow={scroll ? fade.overflow : undefined}
        style={scroll && fade.mask ? { maskImage: fade.mask, WebkitMaskImage: fade.mask } : undefined}
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
          to spare. (The phone bar clamps at two lines instead, since 0.32 §10.7.) */}
      {!collapsed && <span className="min-w-0 flex-1 break-words leading-snug">{item.label}</span>}
      {!collapsed && hasSub && <ChevronRight className="size-3.5 shrink-0 opacity-60 rtl:-scale-x-100" />}
    </NavLink>
  );

  if (hasSub) return <SidebarFlyout item={item}>{link}</SidebarFlyout>;
  return collapsed ? (
    <Tooltip label={item.label} side="end" portal className="block">
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
  // The flyout is portalled out of the subtree whose `dir` it inherited; read on open.
  const [dir, setDir] = useState<Direction>("ltr");

  // Anchor the flyout to the item's END edge — its right, or its left in RTL, where
  // the sidebar sits on the right of the window. The hook re-measures on
  // scroll/resize (the nav list can scroll).
  const rect = useAnchoredRect(wrapperRef, open);
  const pos = rect
    ? dir === "rtl"
      ? { top: rect.top, right: window.innerWidth - rect.left }
      : { top: rect.top, left: rect.right }
    : null;

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
    setDir(dirOf(wrapperRef.current));
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
    // Not a control: hover and focus-within on the nav link inside. Focus (the
    // keyboard path) opens it exactly as hover does, Escape closes it.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- hover/focus-within wrapper around a real link
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
          // Keeps the flyout open while the pointer crosses into it; keyboard users
          // reach it by focus, which the wrapper above already handles.
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- pointer-only hover bridge
          <div
            dir={dir}
            style={{ position: "fixed", ...pos }}
            className="z-40 ps-1"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div
              role="menu"
              aria-label={item.label}
              className="animate-flyout min-w-52 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg"
            >
              <div className="border-b border-[var(--border)] px-3 py-2 text-caption font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
