import { createElement } from "react";
import type { ReactNode } from "react";
import { History, LayoutDashboard, Mail, Receipt, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SettingsGroup } from "../settings/settings-catalogue";
import { DEFAULT_ADMIN_AREA_LABELS } from "./admin-area-labels";
import type { AdminAreaLabels, AdminSharedSection } from "./admin-area-labels";

/**
 * The admin area's sections (0.42.0, docs/admin-harmonization.md §2.3, §6.8): the five
 * every app shares, in the template's order, and the helper that builds an app's
 * `SettingsLayout` catalogue groups from them and the app's own.
 */

/** One shared section: its path segment and its icon. The words are `adminArea.sections`. */
export interface AdminSectionDefinition {
  id: AdminSharedSection;
  icon: LucideIcon;
}

/**
 * The shared sections in the template's order (§2.3 decision 10, §6.13): Overview, Users,
 * Invitations, Billing, Activity. An app's own sections go between them
 * ({@link adminSections}).
 */
export const ADMIN_SECTIONS: readonly AdminSectionDefinition[] = Object.freeze([
  { id: "overview", icon: LayoutDashboard },
  { id: "users", icon: Users },
  { id: "invitations", icon: Mail },
  { id: "billing", icon: Receipt },
  { id: "activity", icon: History },
]);

/**
 * One of the app's own sections: a catalogue group with its words, plus where it goes.
 * `after` names the section it follows — a shared one or another of the app's own. Left
 * out, it goes where the template puts an app's sections, after Invitations and before
 * Billing, in the order given.
 */
export interface AdminOwnSection<G extends string = string> extends SettingsGroup<G> {
  after?: AdminSharedSection | G;
}

/** Where one section goes, without its words — what {@link adminSectionOrder} takes. An
 *  {@link AdminOwnSection} is one. */
export interface AdminSectionPlace<G extends string = string> {
  id: G;
  after?: AdminSharedSection | G;
}

/** The order's options: the shared sections an app does not have. */
export interface AdminSectionOrderOptions<L extends AdminSharedSection = AdminSharedSection> {
  /**
   * Shared sections this app does not have — keksdose and Kurvenschmiede have no billing
   * view (`["billing"]`). Left out, every shared section is in the catalogue. Since 0.43
   * the result's type leaves them out too, so no cast is needed to drop `"billing"` —
   * when TypeScript infers the type arguments. With them written out, name the left-out
   * ones as the second (`adminSections<Own, "billing">(…)`); `adminSections<Own>(…)`
   * keeps every shared id in the type, as before.
   */
  leaveOut?: readonly L[];
}

export interface AdminSectionsOptions<
  L extends AdminSharedSection = AdminSharedSection,
> extends AdminSectionOrderOptions<L> {
  /**
   * A shared section that is in the catalogue but hidden for now, as
   * {@link SettingsGroup.visible}: kastlan's `{ billing: billingEnabled }` (settings §5),
   * whose path then acts as an unknown one.
   */
  visible?: Partial<Record<AdminSharedSection, boolean>>;
  /**
   * 0.48 (keksdose live #450): a shared section's {@link SettingsGroup.badge} — the
   * waiting work the account menu's badge counts, on the row of the section that holds
   * it: `{ overview: <AdminWaitingBadge count={waiting} /> }`. An app's own section
   * carries its `badge` itself.
   */
  badges?: Partial<Record<AdminSharedSection, ReactNode>>;
}

/** The shared sections an app keeps when it leaves out `L`. A `leaveOut` typed as the
 *  whole union (a variable of `AdminSharedSection[]`) says nothing about which, so it
 *  narrows nothing. */
export type AdminKeptSection<L extends AdminSharedSection = AdminSharedSection> = [AdminSharedSection] extends [L]
  ? AdminSharedSection
  : Exclude<AdminSharedSection, L>;

/** The shared section after which the app's sections go when they name no place. */
const OWN_DEFAULT_AFTER: AdminSharedSection = "invitations";

/** The shared and own sections in their order — a shared one as its definition, an own
 *  one as given. Throws as {@link adminSections} documents. */
function orderSections<S extends AdminSectionPlace<string>>(
  own: readonly S[],
  leaveOutIds: readonly AdminSharedSection[] | undefined,
): ({ shared: AdminSectionDefinition } | { own: S })[] {
  const leaveOut = new Set<string>(leaveOutIds ?? []);
  const shared = new Set<string>(ADMIN_SECTIONS.map((s) => s.id));
  const ownIds = new Set<string>();
  for (const section of own) {
    if (shared.has(section.id)) throw new Error(`adminSections: "${section.id}" is a shared section's id`);
    if (ownIds.has(section.id)) throw new Error(`adminSections: "${section.id}" is given twice`);
    ownIds.add(section.id);
  }
  for (const section of own) {
    const after = section.after;
    if (after !== undefined && !shared.has(after) && !ownIds.has(after)) {
      throw new Error(`adminSections: "${section.id}" goes after "${after}", which is no section`);
    }
  }

  // Each section's followers, in the order given: the shared ones, then the own ones
  // under their `after`, recursively, so an own section may follow another own one.
  const followers = new Map<string, S[]>();
  for (const section of own) {
    const after = section.after ?? OWN_DEFAULT_AFTER;
    followers.set(after, [...(followers.get(after) ?? []), section]);
  }

  const out: ({ shared: AdminSectionDefinition } | { own: S })[] = [];
  const placed = new Set<string>();
  const placeAfter = (id: string) => {
    for (const section of followers.get(id) ?? []) {
      out.push({ own: section });
      placed.add(section.id);
      placeAfter(section.id);
    }
  };
  for (const definition of ADMIN_SECTIONS) {
    if (!leaveOut.has(definition.id)) out.push({ shared: definition });
    // A left-out section's followers keep its place.
    placeAfter(definition.id);
  }
  const stuck = own.filter((s) => !placed.has(s.id)).map((s) => s.id);
  if (stuck.length) throw new Error(`adminSections: ${stuck.join(", ")} follow each other in a circle`);
  return out;
}

/**
 * The admin area's section ids in the template's order (0.43, keksdose) — what
 * {@link adminSections} builds its groups in, without the words: for an app that needs the
 * ORDER only (a router's list of paths, a test), outside a component, with no labels.
 *
 *     adminSectionOrder([{ id: "metrics", after: "overview" }], { leaveOut: ["billing"] })
 *     // ["overview", "metrics", "users", "invitations", "activity"]
 *
 * Throws as {@link adminSections} does.
 */
export function adminSectionOrder<G extends string = never, L extends AdminSharedSection = AdminSharedSection>(
  own: readonly AdminSectionPlace<G>[] = [],
  options: AdminSectionOrderOptions<L> = {},
): (AdminKeptSection<L> | G)[] {
  return orderSections(own, options.leaveOut).map((s) =>
    "shared" in s ? (s.shared.id as AdminKeptSection<L>) : s.own.id,
  );
}

/**
 * An app's admin catalogue groups, in the template's order (§2.3 decision 10, §6.8): the
 * shared sections with the kit's icons and words, and the app's own at the places they
 * name. The result is `SettingsLayout`'s `groups`; the entries stay the app's (a group
 * with no visible entry is hidden, as on any settings page — except, since 0.43, the
 * Overview, a page of tiles that needs no entry: it is `standalone`). Since 0.43 the
 * result's type leaves out the `leaveOut` sections, and {@link adminSectionOrder} gives
 * the same order as ids, without words.
 *
 *     const groups = adminSections(useAdminAreaLabels(), [
 *       { id: "metrics", icon: <BarChart3 />, title: t("…"), help: t("…"), after: "overview" },
 *       { id: "messaging", icon: <MessageSquare />, title: t("…"), help: t("…") },
 *       { id: "health", icon: <HeartPulse />, title: t("…"), help: t("…"), after: "billing" },
 *     ], { leaveOut: ["billing"] });
 *
 * gives keksdose's overview, metrics, users, invitations, messaging, health, activity.
 * An `after` that names a left-out section takes that section's place. Kurvenschmiede's
 * Teams needs no `after`: between Invitations and Activity is the default.
 *
 * `labels` is the `adminArea` namespace, resolved — {@link useAdminAreaLabels} inside a
 * component, or the app's catalogue for the language; `undefined` is English. Throws for
 * an own section whose id is a shared one, an id given twice, or an `after` that names no
 * section: the catalogue is built once, and a section quietly missing from it is worse.
 */
export function adminSections<G extends string = never, L extends AdminSharedSection = AdminSharedSection>(
  labels: AdminAreaLabels | undefined,
  own: readonly AdminOwnSection<G>[] = [],
  options: AdminSectionsOptions<L> = {},
): SettingsGroup<AdminKeptSection<L> | G>[] {
  const words = labels ?? DEFAULT_ADMIN_AREA_LABELS;
  return orderSections(own, options.leaveOut).map((s): SettingsGroup<AdminKeptSection<L> | G> => {
    if ("own" in s) {
      const { after: _after, ...group } = s.own;
      return group;
    }
    const { id, icon } = s.shared;
    const visible = options.visible?.[id];
    return {
      id: id as AdminKeptSection<L>,
      icon: createElement(icon, { "aria-hidden": true }) as ReactNode,
      title: words.sections[id].title,
      help: words.sections[id].help,
      // 0.43 (kastlan): the overview is a page of tiles, not of setting cards — it shows
      // with no entry of its own.
      ...(id === "overview" ? { standalone: true } : null),
      ...(visible === undefined ? null : { visible }),
      ...(options.badges?.[id] == null ? null : { badge: options.badges[id] }),
    };
  });
}
