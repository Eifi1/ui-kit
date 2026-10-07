import type { ReactNode } from "react";
import type { SearchEntry } from "../search/search-index";

/**
 * The settings catalogue (docs/settings-harmonization.md §4.1), lifted from keksdose's
 * `settings-index.ts`: the groups a settings page is split into, and one entry per
 * SETTING — not per card — so a search for "quiet hours" finds the field inside the
 * notifications card. One list feeds the sidebar, the phone list, the in-page search and
 * ⌘K ({@link settingsSearchEntries}); keksdose's page and its palette drifted when they
 * had one each.
 *
 * The kit resolves no words: `title`, `help` and `keywords` arrive translated (an app's
 * own, or the core groups' from `DEFAULT_SETTINGS_LABELS.groups`).
 */

/** One group of the page: a sidebar row on a desktop, a list row on a phone (§3.2, §3.3). */
export interface SettingsGroup<G extends string = string> {
  /** The path segment, `/settings/<id>`: lowercase, a–z and "-". */
  id: G;
  /** The row's icon — a lucide icon at the row's size is sized by the row. */
  icon: ReactNode;
  /** The group's name: the sidebar row, the heading over its cards, the phone list. */
  title: string;
  /** One line under the heading and in the phone list, where it is cut to one line. */
  help: string;
  /**
   * `false` hides the group: no row, no hits, and its path acts as an unknown one — it
   * lands on the default group (desktop) or the list (phone), never on a 404 (§3.1).
   * kastlan's `/admin/billing` while billing is off. Default: visible.
   */
  visible?: boolean;
}

/** One setting, and the card that holds it (§4.1). */
export interface SettingsEntry<G extends string = string> {
  /** Unique within the catalogue. */
  id: string;
  /** The group whose page shows the card. */
  group: G;
  /** The card's DOM id, unique on the page — the `?focus=` target. Several entries may
   *  share one: a card that holds four settings has four entries. */
  anchor: string;
  /** What a search hit says. */
  title: string;
  /** Localized, space-separated words people type that the title does not contain
   *  ("dark night" for the theme, "2fa totp" for two-factor). Never shown. */
  keywords?: string;
  /**
   * `false` drops the entry from the page's search and ⌘K. A group whose entries are
   * ALL hidden is hidden with them (§4.1): a demo session marks every card it is refused
   * (passkeys, 2FA, export, deletion …) and so never sees a page of cards that each
   * answer 403. Default: visible.
   */
  visible?: boolean;
}

/**
 * The groups that show, in their order: not `visible: false`, and — when `entries` is
 * given — holding at least one visible entry (§4.1: Kurvenschmiede's notifications group
 * stays hidden until it has a card). Without `entries` only the groups' own flag counts.
 */
export function visibleSettingsGroups<G extends string>(
  groups: readonly SettingsGroup<G>[],
  entries?: readonly SettingsEntry<G>[],
): SettingsGroup<G>[] {
  if (!entries) return groups.filter((g) => g.visible !== false);
  const filled = new Set<G>();
  for (const e of entries) if (e.visible !== false) filled.add(e.group);
  return groups.filter((g) => g.visible !== false && filled.has(g.id));
}

/** The visible entries of the visible groups — what search may find. */
export function visibleSettingsEntries<G extends string>(
  groups: readonly SettingsGroup<G>[],
  entries: readonly SettingsEntry<G>[],
): SettingsEntry<G>[] {
  const shown = new Set(visibleSettingsGroups(groups, entries).map((g) => g.id));
  return entries.filter((e) => e.visible !== false && shown.has(e.group));
}

/** `basePath` without a trailing slash: "/settings/" and "/settings" are one page. */
export function normalizeSettingsBase(basePath: string): string {
  const trimmed = basePath.replace(/\/+$/, "");
  return trimmed.startsWith("/") || trimmed === "" ? trimmed : `/${trimmed}`;
}

/** `/settings/<group>`, and `?focus=<anchor>` when a card is named (§3.4). */
export function settingsHref(basePath: string, group: string, anchor?: string): string {
  const path = `${normalizeSettingsBase(basePath)}/${group}`;
  return anchor ? `${path}?focus=${encodeURIComponent(anchor)}` : path;
}

/** "dark  night" → ["dark", "night"]. */
export function settingsKeywords(keywords: string | undefined): string[] {
  return keywords ? keywords.split(/\s+/).filter(Boolean) : [];
}

export interface SettingsSearchEntriesOptions {
  /** `/settings` or `/admin` — the hits link to `<basePath>/<group>?focus=<anchor>`. */
  basePath: string;
}

/**
 * The catalogue as {@link GlobalSearch} entries (§3.4): each visible setting, under its
 * group's name as the palette's section, linking to `/settings/<group>?focus=<anchor>` —
 * the same link the page's own search hit is, so ⌘K, a tour and a mail all land the
 * same way (§3.5). The group's name is a keyword too, as on the page: "security" lists
 * the security group's settings.
 *
 * Ids are prefixed with the base path ("settings:theme", "admin:users") so a palette
 * that also holds pages and actions keeps them unique.
 */
export function settingsSearchEntries<G extends string>(
  groups: readonly SettingsGroup<G>[],
  entries: readonly SettingsEntry<G>[],
  options: SettingsSearchEntriesOptions,
): SearchEntry[] {
  const base = normalizeSettingsBase(options.basePath);
  const prefix = base.replace(/^\//, "").replace(/\//g, ":") || "settings";
  const byId = new Map(visibleSettingsGroups(groups, entries).map((g) => [g.id, g]));
  return visibleSettingsEntries(groups, entries).map((e) => {
    const group = byId.get(e.group)!;
    return {
      id: `${prefix}:${e.id}`,
      title: e.title,
      keywords: [group.title, ...settingsKeywords(e.keywords)],
      group: group.title,
      icon: group.icon,
      href: settingsHref(base, e.group, e.anchor),
    };
  });
}
