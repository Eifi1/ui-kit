import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Link, useHref, useLocation } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card, EmptyState, Tabs } from "../components/ui";
import { FOCUS_RING } from "../components/focus-ring";
import { Chip } from "../components/chip";
import { List, ListItem } from "../components/list";
import type { ListItemLinkProps } from "../components/list";
import { PageHeader } from "../components/page-header";
import { SearchField } from "../components/search-field";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { createSearchIndex } from "../search/search-index";
import type { SearchEntry } from "../search/search-index";
import {
  normalizeSettingsBase,
  settingsHref,
  settingsKeywords,
  visibleSettingsEntries,
} from "./settings-catalogue";
import type { SettingsEntry, SettingsGroup } from "./settings-catalogue";
import { SettingsLayoutContext } from "./settings-context";
import type { SettingsLayoutContextValue } from "./settings-context";
import { SettingsHeadingLevel } from "./settings-heading";
import { DEFAULT_SETTINGS_LABELS } from "./settings-labels";
import type { SettingsLabels } from "./settings-labels";
import { settingsFromListState, useSettingsRoute } from "./use-settings-route";
import type { SettingsLayoutMode } from "./use-settings-route";
import { useSettingsFocus } from "./use-settings-focus";

/** The page's width cap (§3.2): `6xl` for settings, `7xl` for keksdose's admin, whose
 *  user table scrolled sideways at 6xl (dev#488). */
export type SettingsLayoutWidth = "6xl" | "7xl";

/** More entries than this and the search field shows by itself (§3.4): Kurvenschmiede has
 *  about twelve, keksdose 26; a page of six needs none. */
export const SETTINGS_SEARCH_THRESHOLD = 8;

export interface SettingsLayoutProps<G extends string> {
  /** The page's `h1`: "Settings", "Administration". Default: `labels.title`. */
  title?: ReactNode;
  /** The groups, in order (§4.2). */
  groups: readonly SettingsGroup<G>[];
  /** One entry per setting (§4.1). Hidden entries leave search; a group left without a
   *  visible one is hidden. */
  entries: readonly SettingsEntry<G>[];
  /** `/settings` or `/admin`. The layout owns every path below it. */
  basePath: string;
  /** The group `/settings` opens on a desktop. Default: the first visible one. */
  defaultGroup?: G;
  /** Retired group ids and their successors, replaced in the address (§3.1). */
  aliases?: Readonly<Partial<Record<string, G>>>;
  /**
   * The search field. Left out, it shows once more than {@link SETTINGS_SEARCH_THRESHOLD}
   * entries are visible; `true` or `false` wins over the count — keksdose's admin keeps
   * none (§3.4, §10.3). ⌘K gets the entries either way ({@link settingsSearchEntries}).
   */
  search?: boolean;
  /** See {@link SettingsLayoutWidth}. Default `"6xl"`. */
  width?: SettingsLayoutWidth;
  /** The group's cards, in one column. `sub` is the path segment after the group, which
   *  a card owns (`useSettingsLayout().selectSub`). */
  renderGroup: (group: G, sub: string | null) => ReactNode;
  /**
   * Rows under the phone's group list that LEAVE settings — kastlan's "Administration",
   * its import page (§3.3, §5). `ListItem`s with an `href`; the layout puts them in a list
   * of their own, so they never read as a group. Not shown on a desktop, where the app's
   * own navigation carries them.
   */
  phoneFooter?: ReactNode;
  /** Prop > `<UiKitProvider labels={{ settings }}>` > English. */
  labels?: Partial<SettingsLabels>;
  /** See {@link SettingsLayoutMode}. Default `"auto"`: the screen decides. */
  layout?: SettingsLayoutMode;
  className?: string;
}

interface Searchable<G extends string> extends SearchEntry {
  anchor: string;
  settingsGroup: G;
}

/**
 * The settings page (docs/settings-harmonization.md §3), and the admin page built the
 * same way (§5). keksdose's page is the reference for the desktop; the phone pattern and
 * the path segments are new for all three apps.
 *
 * **Desktop** (§3.2): the page's `PageHeader`, the search field, then a 14rem sidebar —
 * the kit's vertical `Tabs`, a link per group, sticky so a long group keeps the list in
 * view — beside the open group: its heading (`h2`), its help line and its cards in ONE
 * column, never a masonry (keksdose dev#490/#493).
 *
 * **Phone** (§3.3, below `md`): a drill-down. `/settings` is a list of the groups (icon,
 * name, help line, chevron) with `phoneFooter` under it; a group is a page of its own with
 * a back link, its name as the `h1` and the cards under it. It replaces keksdose's chip
 * strip.
 *
 * **Routes, history and `?focus=`** are {@link useSettingsRoute}'s and
 * {@link useSettingsFocus}'s. **Search** (§3.4) runs the kit's matcher over the catalogue:
 * accents folded, ranked, over the title, the group's name and the keywords. On a desktop
 * the sidebar dims the groups without hits and counts the others' while the hits replace
 * the group; on a phone they replace the list. A hit is a link to its card.
 *
 * The cards inside read {@link useSettingsLayout} for `selectSub`, and their titles are
 * headings under the group's ({@link SettingsHeadingLevel}).
 */
export function SettingsLayout<G extends string>({
  title,
  groups,
  entries,
  basePath,
  defaultGroup,
  aliases,
  search,
  width = "6xl",
  renderGroup,
  phoneFooter,
  labels: labelsProp,
  layout = "auto",
  className,
}: SettingsLayoutProps<G>): ReactElement {
  const labels = useKitLabels("settings", DEFAULT_SETTINGS_LABELS, labelsProp);
  const base = normalizeSettingsBase(basePath);
  const route = useSettingsRoute({ groups, entries, basePath: base, defaultGroup, aliases, layout });
  const location = useLocation();
  // The browser URL of an app path, for the sidebar's real links (a middle click opens a
  // tab): `#/settings/…` under a hash router, the basename in front under a browser one.
  const root = useHref("/").replace(/\/$/, "");
  const panelId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const visibleEntries = useMemo(() => visibleSettingsEntries(groups, entries), [groups, entries]);
  const showSearch = search ?? visibleEntries.length > SETTINGS_SEARCH_THRESHOLD;
  const trimmed = query.trim();
  const searching = showSearch && trimmed !== "";

  const groupById = useMemo(() => new Map(route.groups.map((g) => [g.id, g])), [route.groups]);
  const index = useMemo(
    () =>
      createSearchIndex<Searchable<G>>(
        visibleEntries.map((e) => ({
          id: e.id,
          title: e.title,
          keywords: [groupById.get(e.group)?.title ?? e.group, ...settingsKeywords(e.keywords)],
          group: e.group,
          anchor: e.anchor,
          settingsGroup: e.group,
        })),
        // Every hit: the list is the page's whole answer, not a palette's top few.
        { groupLimit: Infinity },
      ),
    [visibleEntries, groupById],
  );
  const hits = useMemo(() => (searching ? index.search(trimmed).map((h) => h.entry) : []), [searching, index, trimmed]);
  const hitsByGroup = useMemo(() => {
    const counts = new Map<G, number>();
    for (const hit of hits) counts.set(hit.settingsGroup, (counts.get(hit.settingsGroup) ?? 0) + 1);
    return counts;
  }, [hits]);

  const anchors = useMemo(() => new Set(entries.map((e) => e.anchor)), [entries]);
  const { phone, group, sub, selectSub, select } = route;
  const headingLevel = phone ? "h2" : "h3";
  const context = useMemo<SettingsLayoutContextValue>(
    () => ({
      basePath: base,
      group,
      sub,
      selectSub,
      headingLevel,
      hasAnchor: (anchor) => anchors.has(anchor),
    }),
    [base, group, sub, selectSub, headingLevel, anchors],
  );

  // Not while the address is about to be replaced (its removal of `focus` would undo the
  // replace), not on the list, and not while the hits stand where the cards would be (a
  // phone's group page has no search: a query left from its list does not count there).
  const hitsShown = searching && (!phone || group === null);
  useSettingsFocus(route.redirecting || group === null || hitsShown ? null : route.focus);

  // A link inside the page. On a phone it opens a page of its own — a push that marks the
  // list as the entry before it, so the group page's back is a real back. On a desktop
  // it switches the group in place — a replace.
  const { state } = location;
  const renderLink = useCallback(
    ({ href, ...props }: ListItemLinkProps) => (
      <Link to={href} replace={!phone} state={phone ? settingsFromListState() : state} {...props} />
    ),
    [phone, state],
  );

  const clearSearch = () => {
    setQuery("");
    // The button that was pressed goes with the empty state; the field is where the
    // next query is typed.
    searchRef.current?.focus();
  };

  const pageTitle = title ?? labels.title;
  const pageClass = cn("mx-auto w-full space-y-4 p-4 md:p-6", width === "7xl" ? "max-w-7xl" : "max-w-6xl", className);

  const searchField = showSearch ? (
    <SearchField
      ref={searchRef}
      className="max-w-md"
      value={query}
      onChange={setQuery}
      aria-label={labels.search}
      placeholder={labels.searchPlaceholder}
    />
  ) : null;

  const results =
    hits.length === 0 ? (
      <EmptyState
        title={labels.noMatches(trimmed)}
        action={
          <Button variant="secondary" size="sm" onClick={clearSearch}>
            {labels.clearSearch}
          </Button>
        }
      />
    ) : (
      <Card className="p-1">
        <List separator="divider" density="comfortable" aria-label={labels.results}>
          {hits.map((hit) => (
            <ListItem
              key={hit.id}
              title={hit.title}
              trailing={groupById.get(hit.settingsGroup)?.title}
              href={settingsHref(base, hit.settingsGroup, hit.anchor)}
              renderLink={renderLink}
              // Leave search on the way: the hit's card is what the user asked for.
              onClick={() => setQuery("")}
            />
          ))}
        </List>
      </Card>
    );

  const cards = (open: G) => (
    <SettingsHeadingLevel level={headingLevel}>
      <div className="space-y-4">{renderGroup(open, sub)}</div>
    </SettingsHeadingLevel>
  );

  let body: ReactNode;
  if (phone) {
    const open = group === null ? undefined : groupById.get(group);
    body = open ? (
      <div className={pageClass} data-settings-view="group">
        <PageHeader
          size="compact"
          title={open.title}
          description={open.help}
          breadcrumbs={
            <Link
              to={base || "/"}
              aria-label={labels.back}
              onClick={(e) => {
                // A real link for a middle click; a plain click is the page's own back,
                // which is `navigate(-1)` when the list is the entry before this one.
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                route.back();
              }}
              className={cn("-ms-1 inline-flex items-center gap-0.5 self-start rounded-md pe-1 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]", FOCUS_RING)}
            >
              <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
              {pageTitle}
            </Link>
          }
        />
        {cards(open.id)}
      </div>
    ) : (
      <div className={pageClass} data-settings-view="list">
        <PageHeader size="compact" title={pageTitle} />
        {searchField}
        {searching ? (
          results
        ) : (
          <Card className="p-1">
            <List separator="divider" density="comfortable" aria-label={labels.sections}>
              {route.groups.map((g) => (
                <ListItem
                  key={g.id}
                  href={settingsHref(base, g.id)}
                  renderLink={renderLink}
                  leading={
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--bg-surface-2)] text-[var(--text-secondary)] [&_svg]:size-4"
                    >
                      {g.icon}
                    </span>
                  }
                  title={g.title}
                  subtitle={g.help}
                  trailing={<ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" />}
                />
              ))}
            </List>
          </Card>
        )}
        {!searching && phoneFooter != null && (
          <Card className="p-1">
            <List separator="divider" density="comfortable">
              {phoneFooter}
            </List>
          </Card>
        )}
      </div>
    );
  } else {
    const open = group === null ? undefined : groupById.get(group);
    body = (
      <div className={pageClass} data-settings-view="desktop">
        <PageHeader size="compact" title={pageTitle} />
        {searchField}
        <div className="md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <Tabs<G>
            orientation="vertical"
            aria-label={labels.sections}
            // Sticky (new in the harmonisation, §3.2): keksdose's notifications group
            // scrolls for screens, and the list should stay in view beside it.
            className="mb-4 md:sticky md:top-6 md:mb-0 md:self-start"
            panelId={open && !searching ? panelId : undefined}
            tabs={route.groups.map((g) => {
              const count = hitsByGroup.get(g.id) ?? 0;
              // While searching, the groups with nothing to show step back (keksdose).
              const dim = searching && count === 0;
              return {
                id: g.id,
                href: `${root}${settingsHref(base, g.id)}`,
                name: g.title,
                label: <span className={cn(dim && "opacity-40")}>{g.title}</span>,
                icon: <span className={cn("inline-flex [&_svg]:size-4", dim && "opacity-40")}>{g.icon}</span>,
                badge:
                  searching && count > 0 ? (
                    <Chip size="sm" tone="brand">
                      <span aria-hidden>{count}</span>
                      <span className="sr-only-fixed">{labels.matchCount(count)}</span>
                    </Chip>
                  ) : undefined,
              };
            })}
            active={(open?.id ?? route.groups[0]?.id) as G}
            onChange={(id) => {
              // While searching the hits stand where the group would; a click on a group
              // means "go there", so the search makes way (keksdose).
              setQuery("");
              select(id);
            }}
          />
          <div className="min-w-0 space-y-4">
            {searching ? (
              results
            ) : open ? (
              <div
                id={panelId}
                role="tabpanel"
                aria-labelledby={`${panelId}-tab`}
                className="space-y-4"
              >
                <PageHeader as="h2" size="sm" title={open.title} description={open.help} />
                {cards(open.id)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return <SettingsLayoutContext.Provider value={context}>{body}</SettingsLayoutContext.Provider>;
}
