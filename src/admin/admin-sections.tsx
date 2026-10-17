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

export interface AdminSectionsOptions {
  /**
   * Shared sections this app does not have — keksdose and Kurvenschmiede have no billing
   * view (`["billing"]`). Left out, every shared section is in the catalogue.
   */
  leaveOut?: readonly AdminSharedSection[];
  /**
   * A shared section that is in the catalogue but hidden for now, as
   * {@link SettingsGroup.visible}: kastlan's `{ billing: billingEnabled }` (settings §5),
   * whose path then acts as an unknown one.
   */
  visible?: Partial<Record<AdminSharedSection, boolean>>;
}

/** The shared section after which the app's sections go when they name no place. */
const OWN_DEFAULT_AFTER: AdminSharedSection = "invitations";

/**
 * An app's admin catalogue groups, in the template's order (§2.3 decision 10, §6.8): the
 * shared sections with the kit's icons and words, and the app's own at the places they
 * name. The result is `SettingsLayout`'s `groups`; the entries stay the app's (a group
 * with no visible entry is hidden, as on any settings page).
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
export function adminSections<G extends string = never>(
  labels: AdminAreaLabels | undefined,
  own: readonly AdminOwnSection<G>[] = [],
  options: AdminSectionsOptions = {},
): SettingsGroup<AdminSharedSection | G>[] {
  const words = labels ?? DEFAULT_ADMIN_AREA_LABELS;
  const leaveOut = new Set<string>(options.leaveOut ?? []);
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
  const followers = new Map<string, AdminOwnSection<G>[]>();
  for (const section of own) {
    const after = section.after ?? OWN_DEFAULT_AFTER;
    followers.set(after, [...(followers.get(after) ?? []), section]);
  }

  const out: SettingsGroup<AdminSharedSection | G>[] = [];
  const placeAfter = (id: string) => {
    for (const section of followers.get(id) ?? []) {
      const { after: _after, ...group } = section;
      out.push(group);
      placeAfter(section.id);
    }
  };
  for (const { id, icon } of ADMIN_SECTIONS) {
    if (!leaveOut.has(id)) {
      const visible = options.visible?.[id];
      out.push({
        id,
        icon: createElement(icon, { "aria-hidden": true }) as ReactNode,
        title: words.sections[id].title,
        help: words.sections[id].help,
        ...(visible === undefined ? null : { visible }),
      });
    }
    // A left-out section's followers keep its place.
    placeAfter(id);
  }
  const placed = new Set<string>(out.map((g) => g.id));
  const stuck = own.filter((s) => !placed.has(s.id)).map((s) => s.id);
  if (stuck.length) throw new Error(`adminSections: ${stuck.join(", ")} follow each other in a circle`);
  return out;
}
