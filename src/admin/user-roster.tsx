import { useMemo } from "react";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import type { DateInput } from "../lib/format";
import type { PersonName } from "../lib/person-name";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { AccountStateChip, RoleChip, dateColumn } from "../components/account-chips";
import type { AccountState, RoleVocabulary } from "../components/account-chips";
import type { ChipTone } from "../components/chip";
import type { DataTableColumn } from "../components/data-table";
import { encodeSorts } from "../components/data-table-sort";
import type { SortState } from "../components/data-table-sort";
import { Popover } from "../components/popover";
import { Button, IconButton } from "../components/ui";
import { UserAvatar } from "../components/user-avatar";
import { personLabel } from "./admin-parts";
import { RoleSelect } from "./role-select";
import type { RoleLock } from "./role-select";

/**
 * The admin's user list (docs/user-admin-harmonization.md §3): a column preset for the
 * kit's `DataTable`, not a table of its own.
 *
 * keksdose built its roster by hand (1150 lines, its own Badge), Kurvenschmiede on the
 * kit `DataTable` with the 0.18 chips, kastlan as a settings page. What the three share
 * is the row — name over address, a role, the account's states, created, last login, the
 * app's own columns, and a handful of actions — so that is what the kit draws, and the
 * table, its paging, its sort and its filters stay the app's `DataTable` wiring:
 *
 * ```tsx
 * const columns = useUserRosterColumns<AdminUserRow, Role>({ roles: ROLES, actions, extra });
 * <DataTable rows={page.users} columns={columns} rowKey={(r) => r.id}
 *   serverPagination={{ page, pageSize, total: page.total, onPageChange }}
 *   sorts={sorts} onSortsChange={setSorts} />
 * // GET /admin/users?sort=${userRosterSort(sorts)}&…
 * ```
 *
 * The column keys ARE the server's sort keys (§3.1): `name`, `email`, `role`, `created`,
 * `last_login` — so {@link userRosterSort} turns the table's sort state into the query
 * as it is. Phone cards come from the same columns: the identity is the card's headline,
 * the role, states, last login and the actions are its fields, created is left off.
 */

/* ── Rows and states ────────────────────────────────────────────────────────── */

/**
 * The fields of the contract's `AdminUserRow` the preset reads (§3.2, the auth
 * contract's `UserResponse` core). An app's row has more — its `extra` — and the
 * preset passes the whole row to every callback.
 */
export interface UserRosterRow extends AdminUserStateFields {
  id: string | number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  /** The derived whole name — only the fallback when both parts are blank. */
  display_name?: string | null;
  /** keksdose, Kurvenschmiede: one role. */
  role?: string | null;
  /** kastlan: the account's roles in the current company. Wins over `role`. */
  roles?: readonly string[] | null;
  created_at?: DateInput;
  /** Account-wide; kastlan's comes from its session rows (§3.2). */
  last_login_at?: DateInput;
}

/** The state fields of the contract's row that {@link adminUserStates} maps (§3.2). */
export interface AdminUserStateFields {
  is_active?: boolean;
  email_verified?: boolean;
  password_change_required_at?: string | null;
  /** `after_days` mode: the day the account is erased (§6.4). */
  deletion_scheduled_at?: string | null;
  /** When the user asked. The only deletion field in kastlan's `operator` mode, where
   *  nothing is scheduled. */
  deletion_requested_at?: string | null;
}

/** One state chip of a row: an {@link AccountState}, or one with its `date` (the
 *  `deletion` day), a `tone` or the app's own words. */
export type RosterState =
  | AccountState
  | { state: AccountState; date?: DateInput; tone?: ChipTone; label?: ReactNode };

/**
 * The contract's row as state chips (§3.2: "map 1:1 to the kit's AccountStateChip"):
 *
 * - marked for deletion → `deletion` with the scheduled day (none in `operator` mode),
 *   IN PLACE of `inactive` — such an account is always deactivated (§2.1);
 * - else `active` / `inactive` from `is_active`;
 * - `unverified` when `email_verified` is `false` (not when it is missing);
 * - `passwordChange` while `password_change_required_at` is set.
 */
export function adminUserStates(row: AdminUserStateFields): RosterState[] {
  const out: RosterState[] = [];
  if (row.deletion_scheduled_at || row.deletion_requested_at) {
    out.push({ state: "deletion", date: row.deletion_scheduled_at ?? null });
  } else if (row.is_active !== undefined) {
    out.push(row.is_active ? "active" : "inactive");
  }
  if (row.email_verified === false) out.push("unverified");
  if (row.password_change_required_at) out.push("passwordChange");
  return out;
}

/** The server's sort keys, which are the preset's column keys (§3.1). */
export const USER_ROSTER_SORT_KEYS = ["name", "email", "role", "created", "last_login"] as const;
export type UserRosterSortKey = (typeof USER_ROSTER_SORT_KEYS)[number];

/**
 * The table's sort state as the `sort` query parameter of `GET /admin/users` (§3.1), in
 * the DataTable's own encoding ({@link encodeSorts}: `"last_login.desc"`), which
 * server-kit 0.4 reads beside the `-key` form. Only the first criterion on one of the
 * server's keys: an app's own column (`owned`) is the client's to sort, and the query
 * takes one key — a shift-clicked second criterion is not sent. `undefined` when nothing
 * the server knows is sorted, so its default order applies.
 */
export function userRosterSort(sorts: readonly SortState[]): string | undefined {
  const first = sorts.find((s) => (USER_ROSTER_SORT_KEYS as readonly string[]).includes(s.key));
  return first ? (encodeSorts([first]) ?? undefined) : undefined;
}

/* ── Labels ─────────────────────────────────────────────────────────────────── */

/** The `userRoster` namespace: the preset's headers and the action menu's words. */
export interface UserRosterLabels {
  /** The identity column — the name with the address under it. */
  name: string;
  /** The separate address column (`emailColumn`). */
  email: string;
  role: string;
  state: string;
  created: string;
  lastLogin: string;
  /** A last login that never happened. */
  never: string;
  /** The actions column's (hidden) header. */
  actions: string;
  /** The action menu's button and panel — "Actions for Ada Example". */
  actionsFor: (name: string) => string;
}

export const DEFAULT_USER_ROSTER_LABELS: UserRosterLabels = {
  name: "Name",
  email: "Email",
  role: "Role",
  state: "State",
  created: "Created",
  lastLogin: "Last login",
  never: "Never",
  actions: "Actions",
  actionsFor: (name) => `Actions for ${name}`,
};

/* ── UserIdentityCell ───────────────────────────────────────────────────────── */

export interface UserIdentityCellProps {
  /** First and last name (auth §3.2), shown in the READER's order. */
  person?: PersonName | null;
  /** A whole name, for an API that still sends `display_name` only. */
  name?: string | null;
  email?: string | null;
  /** The initials avatar before the name. Default true. */
  avatar?: boolean;
  /** After the name, on its line — a "You" chip, a demo mark. */
  badge?: ReactNode;
  /** Over the provider's locale. */
  locale?: string;
  className?: string;
}

/**
 * Who an account is, in one cell (§3.3): the initials avatar, the name in the reader's
 * order ({@link formatPersonName} — "Example Ada" in Hungarian) and the address under it
 * — the cell both rosters drew by hand. An account with no name yet (a migrated row
 * before `CompleteNameDialog`, an invitee) shows its address once, as the name.
 *
 * Both lines carry `data-private`, so keksdose's demo blur reaches them.
 */
export function UserIdentityCell({
  person,
  name,
  email,
  avatar = true,
  badge,
  locale: localeProp,
  className,
}: UserIdentityCellProps) {
  const locale = useKitLocale(localeProp);
  const named = personLabel({ first: person?.first, last: person?.last, name }, locale);
  const address = (email ?? "").trim();
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {avatar && <UserAvatar person={person} name={name} email={email} size="sm" />}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span data-private className="truncate font-medium text-[var(--text-primary)]">
            {named || address}
          </span>
          {badge}
        </div>
        {named && address && (
          <div data-private className="truncate text-xs text-[var(--text-muted)]">
            {address}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── The row's actions ──────────────────────────────────────────────────────── */

/** One entry of a row's action menu (§4). */
export interface UserRowAction {
  /** React key. Default: the label. */
  key?: string;
  label: string;
  /** Runs it — usually opens `AdminActionConfirm` with the level the server states. */
  onSelect: () => void;
  icon?: LucideIcon;
  /** `danger` for deactivate, transfer, erase. */
  tone?: "default" | "danger";
  /** Why it is not available for this row ("You can’t deactivate yourself"). The entry
   *  stays in the menu, focusable, and says so — an action that silently vanished
   *  would leave the admin looking for it. */
  disabledReason?: ReactNode;
  /** Leave it out for this row. */
  hidden?: boolean;
}

/** What `actions(row)` may return: entries, and `false` / `null` for the ones a
 *  condition left out (`row.is_active && {…}`). */
export type UserRowActionList = readonly (UserRowAction | false | null | undefined)[];

export interface UserRowActionsProps {
  actions: UserRowActionList;
  /** The account's name, for the menu's name — "Actions for Ada Example". */
  name: string;
  labels?: Partial<UserRosterLabels>;
}

/**
 * A row's actions as one "…" button and a menu of them: keksdose had a strip of icon
 * buttons in the expanded row, Kurvenschmiede five text buttons in a cell — neither fits
 * a phone card, and both grow with every action §2.4 adds. The menu is portalled, so a
 * table's scroller cannot clip it; Escape and an outside press close it, and focus goes
 * back to the button, which is where a confirmation dialog then returns it.
 */
export function UserRowActions({ actions, name, labels: labelsProp }: UserRowActionsProps) {
  const labels = useKitLabels("userRoster", DEFAULT_USER_ROSTER_LABELS, labelsProp);
  const entries = actions.filter((a): a is UserRowAction => Boolean(a) && !(a as UserRowAction).hidden);
  if (entries.length === 0) return null;
  const title = labels.actionsFor(name);
  return (
    <Popover
      width={240}
      aria-label={title}
      className="p-1"
      trigger={({ open, toggle, ref }) => (
        <IconButton
          ref={ref}
          size="xs"
          label={title}
          aria-haspopup="dialog"
          aria-expanded={open}
          stopPropagation
          onClick={toggle}
        >
          <MoreHorizontal />
        </IconButton>
      )}
    >
      {(close) => (
        <ul className="space-y-0.5">
          {entries.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.key ?? action.label}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  stretch
                  tone={action.tone === "danger" ? "danger" : undefined}
                  disabledReason={action.disabledReason}
                  className="justify-start"
                  onClick={() => {
                    close();
                    action.onSelect();
                  }}
                >
                  {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
                  {action.label}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Popover>
  );
}

/* ── The preset ─────────────────────────────────────────────────────────────── */

/** How a row's role may be changed inline: `true`, or with reasons. */
export interface RoleEditing<R extends string> {
  /** Why the whole select is locked for this row — `"self"`, `"last_admin"`, or words. */
  disabledReason?: RoleLock;
  /** Why one role cannot be chosen for this row (a string: it goes inside an option). */
  optionDisabledReason?: (role: R) => string | undefined;
  /** The roles that may be chosen. Default: the whole vocabulary. */
  offered?: readonly R[];
}

export interface UserRosterColumnsOptions<T extends UserRosterRow, R extends string = string> {
  /** The app's roles, as `RoleChip` reads them. */
  roles: RoleVocabulary<R>;
  /** The row's state chips. Default {@link adminUserStates}, which reads the contract's
   *  fields (`is_active`, `email_verified`, `password_change_required_at`,
   *  `deletion_scheduled_at`, `deletion_requested_at`). */
  stateOf?: (row: T) => readonly RosterState[];
  /** The app's own columns — keksdose's plan and key custody, Kurvenschmiede's owned
   *  counts — after the dates, before the actions. */
  extra?: readonly DataTableColumn<T>[];
  /** The row's action menu (§4). Left out: no actions column. */
  actions?: (row: T) => UserRowActionList;
  /**
   * Whether this row's role is a select rather than a chip, and with which reasons.
   * Left out, or `false`: a chip. kastlan's several roles are never a select here — they
   * are a "Manage roles" action that opens `RolesEditor`.
   */
  editableRole?: (row: T) => boolean | RoleEditing<R>;
  /** A role was picked in a row's select. The app confirms (`acknowledge`) and sends it. */
  onRoleChange?: (row: T, role: R) => void;
  /** The row's role(s). Default `row.roles ?? row.role`. */
  roleOf?: (row: T) => R | readonly R[] | null | undefined;
  /** A separate, sortable "Email" column (the server's `email` sort key) beside the
   *  identity. Default false: the address is under the name already. */
  emailColumn?: boolean;
  /** The words, already resolved. Default English; {@link useUserRosterColumns} reads
   *  the provider's `userRoster` namespace. */
  labels?: Partial<UserRosterLabels>;
}

function rolesOf<T extends UserRosterRow, R extends string>(
  row: T,
  roleOf: UserRosterColumnsOptions<T, R>["roleOf"],
): R[] {
  const raw = roleOf ? roleOf(row) : ((row.roles ?? row.role) as R | readonly R[] | null | undefined);
  if (raw === null || raw === undefined || raw === "") return [];
  return typeof raw === "string" ? [raw as R] : [...(raw as readonly R[])];
}

/** The row's name in the reader's order — a component, because the order is the
 *  READER's and the locale comes from the provider. */
function RowName<T extends UserRosterRow>({ row, children }: { row: T; children: (name: string) => ReactNode }) {
  const locale = useKitLocale();
  const name = personLabel(
    { first: row.first_name, last: row.last_name, name: row.display_name, email: row.email },
    locale,
  );
  return <>{children(name)}</>;
}

function StateChips({ states }: { states: readonly RosterState[] }) {
  if (states.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {states.map((entry) => {
        const spec = typeof entry === "string" ? { state: entry } : entry;
        return (
          <AccountStateChip key={spec.state} state={spec.state} date={spec.date} tone={spec.tone} size="xs">
            {spec.label}
          </AccountStateChip>
        );
      })}
    </div>
  );
}

/**
 * The roster's columns, in the contract's order (§3.3):
 *
 * | key | cell | sort | phone |
 * |---|---|---|---|
 * | `name` | {@link UserIdentityCell} | last, first | the card's headline |
 * | `email` | the address (`emailColumn` only) | address | hidden |
 * | `role` | `RoleChip`(s), or {@link RoleSelect} where `editableRole` | role | field |
 * | `state` | `AccountStateChip`s from `stateOf` | — | field |
 * | `created` | `dateColumn` | instant | hidden |
 * | `last_login` | `dateColumn`, relative, "Never" | instant | field |
 * | …`extra` | the app's | the app's | the app's |
 * | `actions` | {@link UserRowActions} | — | field |
 *
 * Pure: hand it resolved words, or use {@link useUserRosterColumns}. The keys are stable,
 * so an app may drop or move a column (`columns.filter((c) => c.key !== "created")`).
 * Under `serverPagination` the `sortBy`s only make the headers clickable; the app sends
 * the sort ({@link userRosterSort}).
 */
export function userRosterColumns<T extends UserRosterRow, R extends string = string>({
  roles,
  stateOf = adminUserStates,
  extra = [],
  actions,
  editableRole,
  onRoleChange,
  roleOf,
  emailColumn = false,
  labels: labelsProp,
}: UserRosterColumnsOptions<T, R>): DataTableColumn<T>[] {
  const labels: UserRosterLabels = { ...DEFAULT_USER_ROSTER_LABELS, ...labelsProp };
  const roleWords = (row: T) =>
    rolesOf(row, roleOf)
      .map((role) => roles[role]?.label ?? role)
      .join(", ");
  const columns: DataTableColumn<T>[] = [
    {
      key: "name",
      header: labels.name,
      cell: (row) => (
        <UserIdentityCell
          person={{ first: row.first_name, last: row.last_name }}
          name={row.display_name}
          email={row.email}
        />
      ),
      // By last name, then first (auth §3.2), as the server sorts `name`.
      sortBy: (row) => `${row.last_name ?? ""} ${row.first_name ?? ""}`.trim().toLocaleLowerCase() || row.email,
      // Either part, in either order, or the address (auth §10.6).
      filterBy: (row) =>
        [row.first_name, row.last_name, row.last_name, row.first_name, row.display_name, row.email]
          .filter(Boolean)
          .join(" "),
      mobilePrimary: true,
    },
  ];
  if (emailColumn) {
    columns.push({
      key: "email",
      header: labels.email,
      className: "whitespace-nowrap",
      cell: (row) => (
        <span data-private className="text-[var(--text-secondary)]">
          {row.email}
        </span>
      ),
      sortBy: (row) => row.email.toLowerCase(),
      filterBy: (row) => row.email,
      mobileHidden: true,
    });
  }
  columns.push(
    {
      key: "role",
      header: labels.role,
      cell: (row) => {
        const held = rolesOf(row, roleOf);
        const editing = held.length <= 1 ? editableRole?.(row) : false;
        if (editing && onRoleChange) {
          const rules: RoleEditing<R> = editing === true ? {} : editing;
          return (
            <RowName row={row}>
              {(name) => (
                <RoleSelect<R>
                  size="sm"
                  name={name}
                  value={held[0] ?? null}
                  roles={roles}
                  offered={rules.offered}
                  disabledReason={rules.disabledReason}
                  optionDisabledReason={rules.optionDisabledReason}
                  onChange={(role) => onRoleChange(row, role)}
                />
              )}
            </RowName>
          );
        }
        if (held.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1">
            {held.map((role) => (
              <RoleChip<R> key={role} value={role} roles={roles} size="xs" />
            ))}
          </div>
        );
      },
      sortBy: roleWords,
      filter: {
        type: "select",
        getValue: (row) => rolesOf(row, roleOf)[0] ?? "",
        options: (Object.keys(roles) as R[]).map((value) => ({ value, label: roles[value].label })),
      },
    },
    {
      key: "state",
      header: labels.state,
      cell: (row) => <StateChips states={stateOf(row)} />,
    },
    dateColumn<T>({
      key: "created",
      header: labels.created,
      value: (row) => row.created_at ?? null,
      column: { mobileHidden: true },
    }),
    // How long ago rather than a date — the question is "recently?" — with the exact
    // time in a tooltip (keksdose's last-seen column, Kurvenschmiede's).
    dateColumn<T>({
      key: "last_login",
      header: labels.lastLogin,
      value: (row) => row.last_login_at ?? null,
      display: "relative",
      empty: labels.never,
    }),
    ...extra,
  );
  if (actions) {
    columns.push({
      key: "actions",
      header: <span className="sr-only">{labels.actions}</span>,
      headerText: labels.actions,
      // The caller's own words only: the menu reads the provider's itself, and the
      // English defaults merged in above must not shadow them.
      cell: (row) => (
        <RowName row={row}>
          {(name) => <UserRowActions actions={actions(row)} name={name} labels={labelsProp} />}
        </RowName>
      ),
      className: "w-px whitespace-nowrap text-end",
      headClassName: "w-px",
      // The menu button keeps its own click: a row link must not wrap it.
      noRowLink: true,
    });
  }
  return columns;
}

/**
 * {@link userRosterColumns} with the `userRoster` words from the provider, memoised on
 * the options — pass stable callbacks (`useCallback`) and a module-level vocabulary, or
 * the columns are rebuilt on every render.
 */
export function useUserRosterColumns<T extends UserRosterRow, R extends string = string>({
  roles,
  stateOf,
  extra,
  actions,
  editableRole,
  onRoleChange,
  roleOf,
  emailColumn,
  labels: labelsProp,
}: UserRosterColumnsOptions<T, R>): DataTableColumn<T>[] {
  const labels = useKitLabels("userRoster", DEFAULT_USER_ROSTER_LABELS, labelsProp);
  return useMemo(
    () =>
      userRosterColumns<T, R>({
        roles,
        stateOf,
        extra,
        actions,
        editableRole,
        onRoleChange,
        roleOf,
        emailColumn,
        labels,
      }),
    [roles, stateOf, extra, actions, editableRole, onRoleChange, roleOf, emailColumn, labels],
  );
}
