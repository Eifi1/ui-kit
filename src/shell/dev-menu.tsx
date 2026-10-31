import { useState } from "react";
import type { ReactNode } from "react";
import { FlaskConical, Undo2 } from "lucide-react";
import { DEFAULT_TOP_BAR_LABELS, useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { TopBarActionMenu, type TopBarMenuEntry } from "./topbar-action-menu";
import { useTopBarPartsLabels, type DevSwitchersLabels } from "./top-bar-parts-labels";
// The kit's one storage guard, which 0.51 wrote here again by hand (DUP-8, refactor audit
// 2026-10-30). Storage blocked, "Back to" lasts as long as this page.
import { readSessionStored, writeSessionStored } from "../lib/safe-storage";

/** Where the role the session started with is kept, unless the app names its own key. */
export const DEV_ORIGINAL_ROLE_KEY = "ui-kit:dev-original-role";

/**
 * One of the app's own groups in the {@link DevMenu} (docs/top-bar-harmonization.md
 * §2.7.1): keksdose's budget role, its "today" override, its resets.
 *
 * The rows are plain {@link TopBarMenuEntry}s, and there is no dev item type beside them
 * (the contract with keksdose, 0.51): a choice of one is radio rows (`checked`), a toggle
 * is a `checkable: "checkbox"` row, an action is a plain row. No form fields — a menu is
 * a `role="menu"`, where a text or date input has no place in the arrow keys; a free
 * value is a "Custom…" row that opens the app's own dialog.
 */
export interface DevMenuSection {
  /** Unique among the sections. The rows' keys need be unique only within theirs: the
   *  menu prefixes them with this. */
  key: string;
  /** The group's heading, drawn above its rows and announced as the group's name. */
  title: ReactNode;
  /** The rows, as `TopBarActionMenu` takes them. A `divider` ends the group, as there. */
  entries: readonly TopBarMenuEntry[];
}

export interface DevMenuProps<R extends string, P extends string> {
  /**
   * Draw anything at all. The app passes `import.meta.env.DEV` AND its probe of the dev
   * route (§2.7.1): the constant keeps the menu off a production build's screen, the
   * probe off a dev build whose server has the route shut (§6.1) — flasks with nothing
   * behind them. Neither takes code out of the bundle; see `sections`.
   */
  enabled: boolean;
  roles?: readonly R[];
  /** The role the server enforces now. Named `currentRole`, not `role`, because `role` on
   *  a JSX element is the ARIA role (as `RoleChip`'s `value`). */
  currentRole?: R;
  /** Apply a role — the app calls server-kit's `POST /dev/switch {role}` and re-reads
   *  `/auth/me` (§2.7, §6.2). */
  onRole?: (role: R) => void;
  plans?: readonly P[];
  /** The plan the server enforces now. Left out (not known yet — kastlan's overview is a
   *  404 while billing is off), the plan group still renders, with no row checked; a
   *  `GET /dev/switch` answers it. */
  currentPlan?: P;
  /** Apply a plan — `POST /dev/switch {plan}`, then the overview (§6.3). */
  onPlan?: (plan: P) => void;
  /**
   * The role to offer "Back to {role}" for. Left out, the kit keeps it itself: the role
   * before the first switch of this browser session, in `sessionStorage` under
   * `storageKey` — the server answers with the NEW role after a switch, so only the
   * browser still knows the old one.
   */
  originalRole?: R;
  /** The `sessionStorage` key for the kept role. Default {@link DEV_ORIGINAL_ROLE_KEY};
   *  an app with several accounts on one browser may scope it per user. */
  storageKey?: string;
  /** Billing is off locally: the plan group says plans change nothing, and stays usable
   *  (§6.3). */
  billingOff?: boolean;
  /** A role's or a plan's words in the menu. Default: the value itself. */
  roleLabel?: (role: R) => ReactNode;
  planLabel?: (plan: P) => ReactNode;
  /** Prop > `<UiKitProvider labels={{ topBarParts: { dev } }}>` > English. */
  labels?: LabelOverride<DevSwitchersLabels>;
  /** 0.51: the app's own dev groups, after the kit's role and plan, in this order. Their
   *  DEFINITIONS belong in a module only a dev build imports (§2.7.1): `enabled={false}`
   *  hides the menu, but the code of a section built inline stays in the bundle. */
  sections?: readonly DevMenuSection[];
  /**
   * 0.51: an override is on that the developer could forget — a "today" that is not
   * today, a simulated slow server. The flask wears a dot, and its name says so ("Dev
   * tools · Role: ADMIN · Plan: free Overrides on"), since a dot alone tells a screen
   * reader nothing. The app decides what counts; the kit cannot see into its sections.
   */
  active?: boolean;
}

const flask = <FlaskConical className="size-5 text-warning" />;

/** A label's text for a sentence, or the raw value when the label is not text. */
const textOf = (label: ReactNode, value: string) =>
  typeof label === "string" || typeof label === "number" ? String(label) : value;

/** A row someone can pick — what makes a menu worth drawing. */
const isRow = (entry: TopBarMenuEntry) => entry.kind !== "heading" && entry.kind !== "divider";

/**
 * The top bar's local-dev menu (docs/top-bar-harmonization.md §2.7, §2.7.1, §6.2, §6.3):
 * ONE amber flask, `RoleSwitcher`'s, over the kit's Account section and the app's own.
 *
 * 0.42's `DevSwitchers` drew a flask per switcher and had no place for anything else,
 * and an app has more dev controls than a role and a plan — keksdose's budget role, a
 * "today" override, resets (agreed with keksdose for 0.51). So the kit's part is now the
 * menu, and the app's rows go in it.
 *
 * - **The Account section** comes first: the role group, ending in "Back to {role}" once
 *   the role differs from the one the session started with (the dev route needs only a
 *   signed-in user, so a switch to a lesser role can always switch back); then the plan
 *   group, which with `billingOff` notes that plans change nothing. Each renders only
 *   with its list and handler.
 * - **The app's `sections`** follow, each a group under its own heading.
 * - **`active`** puts a dot on the flask for an override that is easy to forget.
 *
 * Nothing renders unless `enabled`, and nothing with no row to show. The panel scrolls
 * (`TopBarActionMenu`'s `scrollable`): some 25 rows ran off a 390×844 phone.
 *
 * From `md` up the groups stand side by side, one column each, in that order (0.51.4,
 * `TopBarActionMenu`'s `columns`; keksdose dev #640, Marcel: "Each group gets a column").
 * "Back to {role}" stays under the roles. A desktop too narrow for all of them wraps
 * the columns onto a second row; a phone keeps the one scrolling column.
 */
export function DevMenu<R extends string, P extends string>({
  enabled,
  roles,
  currentRole: role,
  onRole,
  plans,
  currentPlan: plan,
  onPlan,
  originalRole,
  storageKey = DEV_ORIGINAL_ROLE_KEY,
  billingOff = false,
  roleLabel = (r) => r,
  planLabel = (p) => p,
  labels: labelsProp,
  sections = [],
  active = false,
}: DevMenuProps<R, P>) {
  const bar = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS);
  const words = useTopBarPartsLabels(labelsProp ? { dev: labelsProp } : undefined).dev;
  const [kept, setKept] = useState<string | null>(() => (enabled ? readSessionStored(storageKey) : null));
  // 0.43 (keksdose): `enabled` may start false and turn true — an app's GET probe of the
  // dev route — so the kept role is read again then, or "Back to {role}" is lost after a
  // reload. Adjusted during render, React's pattern for state that follows a prop.
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled);
    if (enabled) setKept(readSessionStored(storageKey));
  }
  if (!enabled) return null;

  const original = (originalRole ?? kept ?? undefined) as R | undefined;

  const pickRole = (next: R) => {
    if (originalRole === undefined) {
      if (next === original) {
        // Back where the session began: nothing left to go back to.
        writeSessionStored(storageKey, null);
        setKept(null);
      } else if (kept === null && role !== undefined && next !== role) {
        writeSessionStored(storageKey, role);
        setKept(role);
      }
    }
    onRole?.(next);
  };

  const roleGroup: TopBarMenuEntry[] =
    roles && roles.length > 0 && role !== undefined && onRole
      ? [
          { kind: "heading", key: "head-role", label: words.roleHeading },
          ...roles.map((r): TopBarMenuEntry => ({
            key: `role-${r}`,
            label: roleLabel(r),
            checked: r === role,
            onSelect: () => pickRole(r),
          })),
          // Behind a rule, which ends the role group: "Back to" is a way out, not a role.
          ...(original !== undefined && original !== role
            ? ([
                { kind: "divider", key: "sep-back" },
                {
                  key: "back",
                  icon: <Undo2 className="size-4" />,
                  label: words.backTo(textOf(roleLabel(original), original)),
                  onSelect: () => pickRole(original),
                },
              ] satisfies TopBarMenuEntry[])
            : []),
        ]
      : [];

  const planGroup: TopBarMenuEntry[] =
    plans && plans.length > 0 && onPlan
      ? [
          {
            kind: "heading",
            key: "head-plan",
            // The billing-off note is part of the group's NAME, under the heading. In 0.42's
            // own plan menu it was a trailing `<li>`: not a row, so the arrow keys passed
            // over it and a screen reader moving through the menu never reached it. Named,
            // it is read on the way into the plans. And in one menu a trailing note would
            // sit under the app's sections, not under the plans.
            label: billingOff ? (
              <>
                {words.planHeading}{" "}
                <span
                  data-dev-billing-off=""
                  className="mt-0.5 block font-normal normal-case tracking-normal text-xs text-muted"
                >
                  {words.billingOff}
                </span>
              </>
            ) : (
              words.planHeading
            ),
          },
          ...plans.map((p): TopBarMenuEntry => ({
            key: `plan-${p}`,
            label: planLabel(p),
            checked: p === plan,
            onSelect: () => onPlan(p),
          })),
        ]
      : [];

  // The app's rows keyed under their section: two sections may well both have a "reset".
  const appGroups = sections.flatMap((section): TopBarMenuEntry[] => [
    { kind: "heading", key: `section:${section.key}`, label: section.title },
    ...section.entries.map((entry): TopBarMenuEntry => ({ ...entry, key: `${section.key}:${entry.key}` })),
  ]);

  const entries = [...roleGroup, ...planGroup, ...appGroups];
  if (!entries.some(isRow)) return null;

  // The menu, then the role and the plan, as 0.42's two triggers named them: the bar
  // shows the flask only, so its name (and tooltip) is where they are read.
  const name = [
    words.menu,
    roleGroup.length > 0 && role !== undefined ? bar.role(role) : null,
    planGroup.length > 0 && plan !== undefined ? words.plan(plan) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <TopBarActionMenu
      icon={flask}
      // The badge's words join the trigger's name, as the tours compass's NEW dot does.
      // `danger`, the badge's default: an amber dot would vanish into the amber flask.
      iconBadge={active ? { label: words.overridesOn } : null}
      aria-label={name}
      entries={entries}
      scrollable
      columns
    />
  );
}
