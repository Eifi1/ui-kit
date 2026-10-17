import { useState } from "react";
import type { ReactNode } from "react";
import { FlaskConical, Undo2 } from "lucide-react";
import { DEFAULT_TOP_BAR_LABELS, useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { TopBarActionMenu, type TopBarMenuEntry } from "./topbar-action-menu";
import { useTopBarPartsLabels, type DevSwitchersLabels } from "./top-bar-parts-labels";

/** Where the role the session started with is kept, unless the app names its own key. */
export const DEV_ORIGINAL_ROLE_KEY = "ui-kit:dev-original-role";

function readKey(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* storage blocked: "Back to" lasts as long as this page */
  }
}

export interface DevSwitchersProps<R extends string, P extends string> {
  /** Draw anything at all: the app passes `import.meta.env.DEV`, so a production build
   *  tree-shakes the switchers with the constant. */
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
   *  404 while billing is off), the plan menu still renders, with no row checked; a
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
  /** Billing is off locally: the plan menu says plans change nothing, and stays usable
   *  (§6.3). */
  billingOff?: boolean;
  /** A role's or a plan's words in the menu. Default: the value itself. */
  roleLabel?: (role: R) => ReactNode;
  planLabel?: (plan: P) => ReactNode;
  /** Prop > `<UiKitProvider labels={{ topBarParts: { dev } }}>` > English. */
  labels?: LabelOverride<DevSwitchersLabels>;
}

const flask = <FlaskConical className="size-5 text-warning" />;

/** A label's text for a sentence, or the raw value when the label is not text. */
const textOf = (label: ReactNode, value: string) =>
  typeof label === "string" || typeof label === "number" ? String(label) : value;

/**
 * The top bar's local-dev switchers (docs/top-bar-harmonization.md §2.7, §6.2, §6.3): the
 * role, then the plan, each a menu behind `RoleSwitcher`'s amber flask. Nothing renders
 * unless `enabled`; either menu renders only with its list and handler.
 *
 * The role menu ends in "Back to {role}" once the role differs from the one the session
 * started with: the dev route needs only a signed-in user, so a switch to a lesser role
 * can always switch back. With `billingOff` the plan menu notes that plans change nothing
 * while billing is off.
 */
export function DevSwitchers<R extends string, P extends string>({
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
}: DevSwitchersProps<R, P>) {
  const bar = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS);
  const words = useTopBarPartsLabels(labelsProp ? { dev: labelsProp } : undefined).dev;
  const [kept, setKept] = useState<string | null>(() => (enabled ? readKey(storageKey) : null));
  if (!enabled) return null;

  const original = (originalRole ?? kept ?? undefined) as R | undefined;

  const pickRole = (next: R) => {
    if (originalRole === undefined) {
      if (next === original) {
        // Back where the session began: nothing left to go back to.
        writeKey(storageKey, null);
        setKept(null);
      } else if (kept === null && role !== undefined && next !== role) {
        writeKey(storageKey, role);
        setKept(role);
      }
    }
    onRole?.(next);
  };

  const roleMenu =
    roles && roles.length > 0 && role !== undefined && onRole ? (
      <TopBarActionMenu
        icon={flask}
        aria-label={`${bar.switchRole} · ${bar.role(role)}`}
        entries={[
          { kind: "heading", key: "head-role", label: words.roleHeading },
          ...roles.map(
            (r): TopBarMenuEntry => ({ key: `role-${r}`, label: roleLabel(r), checked: r === role, onSelect: () => pickRole(r) }),
          ),
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
        ]}
      />
    ) : null;

  const planMenu =
    plans && plans.length > 0 && onPlan ? (
      <TopBarActionMenu
        icon={flask}
        aria-label={plan !== undefined ? `${words.switchPlan} · ${words.plan(plan)}` : words.switchPlan}
        entries={[
          { kind: "heading", key: "head-plan", label: words.planHeading },
          ...plans.map(
            (p): TopBarMenuEntry => ({ key: `plan-${p}`, label: planLabel(p), checked: p === plan, onSelect: () => onPlan(p) }),
          ),
        ]}
      >
        {billingOff
          ? () => (
              <li data-dev-billing-off="" className="mt-1 max-w-64 border-t border-subtle px-3 py-2 text-xs text-muted">
                {words.billingOff}
              </li>
            )
          : undefined}
      </TopBarActionMenu>
    ) : null;

  return (
    <>
      {roleMenu}
      {planMenu}
    </>
  );
}
