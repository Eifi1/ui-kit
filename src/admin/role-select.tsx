import type { ReactNode } from "react";
import { useKitLabels } from "../i18n/kit-labels";
import type { RoleVocabulary } from "../components/account-chips";
import { CheckboxGroup } from "../components/checkbox-group";
import type { CheckboxGroupOption } from "../components/checkbox-group";
import { Select } from "../components/ui";
import type { SelectProps } from "../components/ui";

/**
 * The role of an account, chosen by an admin (docs/user-admin-harmonization.md §3.3,
 * §4.1, §7): {@link RoleSelect} for the apps where an account has ONE role (keksdose,
 * Kurvenschmiede) and {@link RolesEditor} for kastlan, where an account has several per
 * company.
 *
 * Both take the app's {@link RoleVocabulary} — the one `RoleChip` reads — so a role is
 * called the same in the chip, the select and the editor. Neither sends a request: a role
 * change is an `acknowledge` action (§4.2), so the app opens `AdminActionConfirm` from
 * `onChange` and the value stays where the server has it until the server says otherwise.
 *
 * WHY THE REASONS. The server refuses the last active admin's demotion (`last_admin`),
 * your own admin role (`self`), Kurvenschmiede's CUSTOMER for an account that owns work,
 * kastlan's TENANT until a tenant portal exists (§4.1, §9.6). A choice the server will
 * refuse is shown as unavailable, with why, rather than offered and answered with an
 * error after a confirmation dialog — the 0.18 write-lock rule: a control that cannot
 * act says so where it is. `"last_admin"` and `"self"` are the kit's words in every
 * language; anything else is the app's own sentence.
 */

/** A reason the kit words itself. `self_action` is the server's code for `self` (the
 *  account error codes), so a refusal's code can be handed on as it came. */
export type RoleLockCode = "last_admin" | "self" | "self_action";

/**
 * Why a role (or the whole control) cannot be changed: one of the kit's
 * {@link RoleLockCode}s, or the app's own words.
 */
export type RoleLock = RoleLockCode | (string & {}) | ReactNode;

/** The `roleSelect` namespace — RoleSelect's and RolesEditor's words. */
export interface RoleSelectLabels {
  /** The select's name where no `label` is drawn, and RolesEditor's legend. "Role". */
  label: string;
  /** RolesEditor's legend. "Roles". */
  rolesLegend: string;
  /** The select's accessible name in a roster row — "Role of Ada Example". */
  roleOf: (name: string) => string;
  /** The whole control is locked: the account is the last active administrator. */
  lockedLastAdmin: string;
  /** The whole control is locked: it is the admin's own account. */
  lockedSelf: string;
  /** One option is unavailable for the last active administrator — said after the
   *  role's name, inside the option. */
  notForLastAdmin: string;
  /** One option is unavailable on the admin's own account. */
  notForSelf: string;
  /** An unavailable option's text: the role's name and why. */
  unavailable: (role: string, reason: string) => string;
}

export const DEFAULT_ROLE_SELECT_LABELS: RoleSelectLabels = {
  label: "Role",
  rolesLegend: "Roles",
  roleOf: (name) => `Role of ${name}`,
  lockedLastAdmin: "The last active administrator keeps this role.",
  lockedSelf: "You can’t change your own role.",
  notForLastAdmin: "not for the last administrator",
  notForSelf: "not for your own account",
  unavailable: (role, reason) => `${role} (${reason})`,
};

/** The whole-control reason, the kit's codes in the kit's words. */
function lockText(reason: RoleLock, labels: RoleSelectLabels): ReactNode {
  if (reason === "last_admin") return labels.lockedLastAdmin;
  if (reason === "self" || reason === "self_action") return labels.lockedSelf;
  return reason;
}

/** An option's reason as the text a native `<option>` can hold. */
function optionReasonText(reason: string, labels: RoleSelectLabels): string {
  if (reason === "last_admin") return labels.notForLastAdmin;
  if (reason === "self" || reason === "self_action") return labels.notForSelf;
  return reason;
}

function present(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

/** The vocabulary's keys, in its own order. */
function keysOf<R extends string>(roles: RoleVocabulary<R>): R[] {
  return Object.keys(roles) as R[];
}

/* ── RoleSelect ─────────────────────────────────────────────────────────────── */

export interface RoleSelectProps<R extends string = string>
  extends Omit<SelectProps, "value" | "defaultValue" | "onChange" | "children" | "multiple" | "disabledReason"> {
  /** The role the server has. Controlled: a pick does not move the select until the
   *  app's request lands and the row comes back with the new role. */
  value: R | null | undefined;
  /** The app's roles — what `RoleChip` reads. Their order is the list's. */
  roles: RoleVocabulary<R>;
  /** A role other than `value` was picked. The app asks `AdminActionConfirm` (an
   *  `acknowledge` action, §4.2) and sends the change. */
  onChange: (role: R) => void;
  /**
   * The roles that may be CHOSEN here, in the vocabulary's order whatever order this is
   * in. Default: all of them. A role the account holds that is not offered (Kurvenschmiede's
   * REVIEWER, given only through the reviewer scope, §9.6) is still shown, unavailable:
   * a select that dropped it would show the account as something it is not.
   */
  offered?: readonly R[];
  /**
   * Why the whole choice is locked for this account: `"last_admin"`, `"self"`, or the
   * app's own words. The select stays focusable and says so (Select's `disabledReason`).
   */
  disabledReason?: RoleLock;
  /**
   * Why ONE role cannot be chosen for this account: `"last_admin"`, `"self"`, or the
   * app's own words (Kurvenschmiede: "owns work", for CUSTOMER) — a STRING, because a
   * native option holds text only. The option is disabled and reads "Member (not for the
   * last administrator)". `undefined` for an available role.
   */
  optionDisabledReason?: (role: R) => string | undefined;
  /** The account's name, for the select's accessible name in a roster row ("Role of
   *  Ada Example") where no `label` is drawn. */
  name?: string;
  labels?: Partial<RoleSelectLabels>;
}

/**
 * One role, picked from the app's vocabulary — Kurvenschmiede's roster `Select`
 * (users-panel.tsx), with the reasons it left to the server's toast drawn in place.
 *
 * Unlabelled by default, for a table cell: named "Role of Ada Example" (`name`) or
 * "Role". Pass `label` for a form field. Every {@link Select} prop passes through
 * (`size`, `commit`, `hint`, `error`, `data-*`).
 */
export function RoleSelect<R extends string = string>({
  value,
  roles,
  onChange,
  offered,
  disabledReason,
  optionDisabledReason,
  name,
  labels: labelsProp,
  label,
  ...rest
}: RoleSelectProps<R>) {
  const labels = useKitLabels("roleSelect", DEFAULT_ROLE_SELECT_LABELS, labelsProp);
  const all = keysOf(roles);
  const choosable = new Set<R>(offered ?? all);
  const held = value ?? null;
  // A cell has no room for a visible label: the select is named for the account it
  // belongs to, so fifty of them in a roster are not fifty "Role"s.
  const ariaLabel =
    label === undefined ? (rest["aria-label"] ?? (name ? labels.roleOf(name) : labels.label)) : rest["aria-label"];
  return (
    <Select
      {...rest}
      label={label}
      aria-label={ariaLabel}
      value={held ?? ""}
      disabledReason={present(disabledReason) ? lockText(disabledReason, labels) : undefined}
      onChange={(event) => {
        const next = event.target.value as R;
        if (next && next !== held) onChange(next);
      }}
    >
      {held === null && <option value="" disabled />}
      {all
        .filter((role) => choosable.has(role) || role === held)
        .map((role) => {
          const word = roles[role].label;
          const reason = role === held ? undefined : optionDisabledReason?.(role);
          const unavailable = !choosable.has(role) || present(reason);
          return (
            <option key={role} value={role} disabled={unavailable && role !== held}>
              {reason ? labels.unavailable(word, optionReasonText(reason, labels)) : word}
            </option>
          );
        })}
      {/* A role the vocabulary does not know (an older client against a newer API) is
          still the account's role: shown as its key, as RoleChip shows it. */}
      {held !== null && !all.includes(held) && (
        <option value={held} disabled>
          {held}
        </option>
      )}
    </Select>
  );
}

/* ── RolesEditor ────────────────────────────────────────────────────────────── */

export interface RolesEditorProps<R extends string = string> {
  /** The roles ticked — the draft the app holds while its dialog is open. */
  value: readonly R[];
  roles: RoleVocabulary<R>;
  /** The new set, in the vocabulary's order (a role the editor does not offer, but the
   *  account holds, is kept after the rest — CheckboxGroup's rule). */
  onChange: (roles: R[]) => void;
  /** The roles that may be ticked or unticked here. Default: all. kastlan leaves TENANT
   *  out until a tenant portal exists (§4.1). */
  offered?: readonly R[];
  /** Why nothing can be changed: `"last_admin"`, `"self"` or the app's words. */
  disabledReason?: RoleLock;
  /** Why one role cannot be changed — shown under it, and the box keeps its state:
   *  `"last_admin"` on the last administrator's ADMIN, say. */
  optionDisabledReason?: (role: R) => RoleLock | undefined;
  /** Default `roleSelect.rolesLegend` — "Roles". kastlan names the company: "Roles in
   *  Example Ltd". */
  legend?: ReactNode;
  legendVisibility?: "visible" | "sr-only";
  /** At least one role (kastlan's dialog saves none). Draws the required star. */
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  /** The editor SAVES on change — the write lock's opt-in (CheckboxGroup's `commit`). */
  commit?: boolean;
  className?: string;
  labels?: Partial<RoleSelectLabels>;
}

/**
 * Several roles at once — kastlan's manage-roles dialog (`ChoiceCardGroup multiple`),
 * which holds an account's roles in the CURRENT company (§4.1: `PUT /admin/users/{id}/roles`).
 * A kit {@link CheckboxGroup} of the vocabulary, with the reasons of {@link RoleSelect}:
 * a role that cannot change keeps its box as it is and says why under it.
 *
 * A field, not a form: the app's dialog holds the draft, and its Save goes through
 * `AdminActionConfirm` (`acknowledge`, §4.2) — which can draw this editor as its
 * `children`, so the roles and the tick are one dialog.
 */
export function RolesEditor<R extends string = string>({
  value,
  roles,
  onChange,
  offered,
  disabledReason,
  optionDisabledReason,
  legend,
  legendVisibility,
  required,
  hint,
  error,
  columns,
  commit,
  className,
  labels: labelsProp,
}: RolesEditorProps<R>) {
  const labels = useKitLabels("roleSelect", DEFAULT_ROLE_SELECT_LABELS, labelsProp);
  const all = keysOf(roles);
  const choosable = new Set<R>(offered ?? all);
  const held = new Set<R>(value);
  const options: CheckboxGroupOption<R>[] = all
    .filter((role) => choosable.has(role) || held.has(role))
    .map((role) => {
      const reason = optionDisabledReason?.(role);
      const locked = present(reason);
      return {
        value: role,
        label: roles[role].label,
        hint: locked ? lockText(reason, labels) : undefined,
        disabled: locked || !choosable.has(role),
      };
    });
  return (
    <CheckboxGroup<R>
      legend={legend ?? labels.rolesLegend}
      legendVisibility={legendVisibility}
      options={options}
      value={[...value]}
      onChange={onChange}
      required={required}
      hint={hint}
      error={error}
      columns={columns}
      commit={commit}
      disabledReason={present(disabledReason) ? lockText(disabledReason, labels) : undefined}
      className={className}
    />
  );
}
