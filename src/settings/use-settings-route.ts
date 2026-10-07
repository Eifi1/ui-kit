import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { useMediaQuery } from "../hooks/use-media-query";
import { PHONE_QUERY } from "../components/ui";
import { normalizeSettingsBase, visibleSettingsGroups } from "./settings-catalogue";
import type { SettingsEntry, SettingsGroup } from "./settings-catalogue";

/**
 * Which layout the settings page is in. `"auto"` follows the screen ({@link PHONE_QUERY},
 * as `Tabs` does); `"desktop"` / `"phone"` pin one — for a preview of both side by side,
 * where the window is one width.
 */
export type SettingsLayoutMode = "auto" | "desktop" | "phone";

export interface UseSettingsRouteOptions<G extends string> {
  groups: readonly SettingsGroup<G>[];
  /** The catalogue's entries. Given, a group with no visible entry is hidden (§4.1), and
   *  `/settings?focus=<anchor>` finds the anchor's group. */
  entries?: readonly SettingsEntry<G>[];
  /** `/settings` or `/admin`. */
  basePath: string;
  /** The group `/settings` opens on a desktop. Default: the first visible group (§4.1). */
  defaultGroup?: G;
  /** Retired group ids and their successors — `{ overview: "metrics" }` — applied with a
   *  replace (§3.1, keksdose's admin). */
  aliases?: Readonly<Partial<Record<string, G>>>;
  /** See {@link SettingsLayoutMode}. Default `"auto"`. */
  layout?: SettingsLayoutMode;
}

export interface SettingsRoute<G extends string> {
  /** The group on screen. `null` on a phone's list (and while there is no visible group). */
  group: G | null;
  /** The segment after the group, owned by a card; `null` without one. */
  sub: string | null;
  /** `?focus=<anchor>`, or `null`. */
  focus: string | null;
  /** Open a group: a PUSH on a phone, so the system back gesture returns to the list; a
   *  REPLACE on a desktop, so back leaves settings instead of walking every group looked
   *  at (§3.1, keksdose's rule). */
  select: (group: G) => void;
  /** See {@link SettingsLayoutContextValue.selectSub}. */
  selectSub: (sub: string | null) => void;
  /** To the list: `navigate(-1)` when the list is the previous entry, else a replace to
   *  the base path — so a deep link from a mail never sends "back" out of the app. */
  back: () => void;
  /** The visible groups, in order. */
  groups: SettingsGroup<G>[];
  /** Whether the phone layout is in force. */
  phone: boolean;
  /** Whether this location is about to be replaced (a legacy hash, an alias, an unknown
   *  group): what renders meanwhile is already the destination's, but nothing should
   *  act on the URL until it is. */
  redirecting: boolean;
  /** Whether the list is the entry before this one (the marker {@link select} and the
   *  list's links leave in `location.state`). */
  fromList: boolean;
}

/**
 * The `location.state` key that says "the list is the entry before this one". Written by
 * the phone list's links and {@link SettingsRoute.select}; carried over by every replace
 * the page makes, since a replace does not change what came before.
 */
export const SETTINGS_FROM_LIST_STATE = "eifi1.settings.fromList";

/** `location.state` with the marker set — for an app's own link to a group page that is
 *  opened FROM the list it renders. */
export function settingsFromListState(): Record<string, true> {
  return { [SETTINGS_FROM_LIST_STATE]: true };
}

function isFromList(state: unknown): boolean {
  return typeof state === "object" && state !== null && (state as Record<string, unknown>)[SETTINGS_FROM_LIST_STATE] === true;
}

export interface SettingsLocation {
  pathname: string;
  search: string;
  hash: string;
}

export interface SettingsLocationRules<G extends string> {
  basePath: string;
  /** The visible group ids. */
  groups: readonly G[];
  /** The resolved default group, `null` with no visible group. */
  defaultGroup: G | null;
  aliases?: Readonly<Partial<Record<string, G>>>;
  /** Anchor → group, for `/settings?focus=<anchor>` with no group named. */
  anchorGroup?: ReadonlyMap<string, G>;
  phone: boolean;
}

export interface SettingsLocationResult<G extends string> {
  group: G | null;
  sub: string | null;
  /** The path (with query) to replace the location with, or `null` when it is already
   *  canonical. */
  redirect: string | null;
}

/**
 * Where a location lands on the settings page — pure, so the rules of §3.1 are testable
 * without a router:
 *
 *  - `/settings` → the default group on a desktop (a replace), the list on a phone;
 *  - `/settings/<group>[/<sub>]` → that group, the rest of the path as `sub`;
 *  - an alias → its successor, with a replace, `sub`, query and hash kept;
 *  - an unknown or hidden group → the default group (desktop) or the list (phone), with
 *    a replace and the query kept — never a 404, so an old bookmark still lands;
 *  - keksdose's legacy `/settings?<query>#<group>[/<sub>]` →
 *    `/settings/<group>[/<sub>]?<query>`, the WHOLE query carried (a tour's
 *    `tour`/`tourStep` as well as `focus`), then resolved by the rules above;
 *  - `/settings?focus=<anchor>` with no group → the anchor's group, where it can ring.
 */
export function resolveSettingsLocation<G extends string>(
  location: SettingsLocation,
  rules: SettingsLocationRules<G>,
): SettingsLocationResult<G> {
  const base = normalizeSettingsBase(rules.basePath);
  const { pathname, search, hash } = location;
  const known = new Set<string>(rules.groups);
  const atBase = pathname === base || pathname === `${base}/` || (base === "" && pathname === "/");

  if (atBase) {
    const legacy = hash.replace(/^#/, "").replace(/^\/+/, "");
    if (legacy) {
      // The hash becomes the path; whatever the path then says (an alias, an unknown
      // group) is resolved in the same step, so the history sees one replace.
      const converted = `${base}/${legacy}`;
      const next = resolveSettingsLocation({ pathname: converted, search, hash: "" }, rules);
      return { ...next, redirect: next.redirect ?? `${converted}${search}` };
    }
    const anchor = new URLSearchParams(search).get("focus");
    const anchorGroup = anchor ? rules.anchorGroup?.get(anchor) : undefined;
    if (anchorGroup && known.has(anchorGroup)) {
      return { group: anchorGroup, sub: null, redirect: `${base}/${anchorGroup}${search}` };
    }
    if (rules.phone || rules.defaultGroup === null) return { group: null, sub: null, redirect: null };
    return { group: rules.defaultGroup, sub: null, redirect: `${base}/${rules.defaultGroup}${search}` };
  }

  if (!pathname.startsWith(`${base}/`)) {
    // Mounted somewhere `basePath` does not name: a misconfiguration, not a link to
    // correct. Show what the base path would, and leave the address alone.
    return { group: rules.phone ? null : rules.defaultGroup, sub: null, redirect: null };
  }
  const rest = pathname.slice(base.length + 1);
  const [segment = "", ...subParts] = rest.split("/");
  const sub = subParts.filter(Boolean).join("/") || null;
  if (known.has(segment)) return { group: segment as G, sub, redirect: null };

  const successor = rules.aliases?.[segment];
  if (successor !== undefined && known.has(successor)) {
    return {
      group: successor,
      sub,
      redirect: `${base}/${successor}${sub ? `/${sub}` : ""}${search}${hash}`,
    };
  }

  // Unknown or hidden. The hash is dropped: on the list it would read as a legacy group
  // and send the page round again.
  if (rules.phone || rules.defaultGroup === null) {
    return { group: null, sub: null, redirect: `${base || "/"}${search}` };
  }
  return { group: rules.defaultGroup, sub: null, redirect: `${base}/${rules.defaultGroup}${search}` };
}

/**
 * The settings page's route (docs/settings-harmonization.md §3.1): which group the URL
 * names, and the history rules for moving between groups.
 *
 * The URL IS the selection, as it was in keksdose (where it was the hash): there is no
 * state to keep in step with it, so a deep link, a reload, back and forward all land
 * where the address says. Everything that is not canonical — `/settings` on a desktop, a
 * legacy hash, an alias, an unknown or hidden group — is replaced by its canonical path.
 *
 * **The replace runs on every navigation**, keyed on `location.key`, not once on mount:
 * the router keeps the page mounted across links followed inside the app — keksdose's
 * inbox renders admin-typed URLs, and a push click routes an open window without a
 * reload — so a legacy `/settings#security` arriving while the page is open converts too
 * (§10.1).
 */
export function useSettingsRoute<G extends string>(options: UseSettingsRouteOptions<G>): SettingsRoute<G> {
  const { groups, entries, basePath, defaultGroup, aliases, layout = "auto" } = options;
  const location = useLocation();
  const navigate = useNavigate();
  const narrow = useMediaQuery(PHONE_QUERY, false);
  const phone = layout === "phone" || (layout === "auto" && narrow);
  const base = normalizeSettingsBase(basePath);

  const visible = useMemo(() => visibleSettingsGroups(groups, entries), [groups, entries]);
  const anchorGroup = useMemo(() => {
    const map = new Map<string, G>();
    for (const e of entries ?? []) if (e.visible !== false && !map.has(e.anchor)) map.set(e.anchor, e.group);
    return map;
  }, [entries]);
  const ids = visible.map((g) => g.id);
  const fallback =
    defaultGroup !== undefined && ids.includes(defaultGroup) ? defaultGroup : (ids[0] ?? null);

  const { group, sub, redirect } = resolveSettingsLocation(location, {
    basePath: base,
    groups: ids,
    defaultGroup: fallback,
    aliases,
    anchorGroup,
    phone,
  });

  const { key, state, search } = location;
  useEffect(() => {
    // `state` rides along: the marker describes the entry BEFORE this one, which a
    // replace does not change.
    if (redirect) navigate(redirect, { replace: true, state });
  }, [key, redirect, state, navigate]);

  const select = useCallback(
    (next: G) => {
      const to = `${base}/${next}`;
      // From the list, the push marks it, so the group page's back is a real back.
      if (phone) navigate(to, group === null ? { state: settingsFromListState() } : undefined);
      // A new group is a new page: the old one's query (a focus, a roster filter) stays
      // behind, as keksdose's `selectGroup` left it.
      else navigate(to, { replace: true, state });
    },
    [base, phone, group, state, navigate],
  );

  const selectSub = useCallback(
    (next: string | null) => {
      if (group === null) return;
      navigate(`${base}/${group}${next ? `/${next}` : ""}${search}`, { replace: true, state });
    },
    [base, group, search, state, navigate],
  );

  const fromList = isFromList(state);
  const back = useCallback(() => {
    if (fromList) navigate(-1);
    else navigate(base || "/", { replace: true });
  }, [fromList, base, navigate]);

  return {
    group,
    sub,
    focus: new URLSearchParams(search).get("focus"),
    select,
    selectSub,
    back,
    groups: visible,
    phone,
    redirecting: redirect !== null,
    fromList,
  };
}
