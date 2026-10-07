import { useCallback, useMemo, useState } from "react";
import { KeyRound, Languages, MailCheck, ShieldCheck, Truck, UserCheck, UserX } from "lucide-react";
import { DataTable, DialogFrame, Switch } from "@eifi1/ui-kit";
import type { DataTableColumn } from "@eifi1/ui-kit";
import { AccountStateChip } from "../../../src/components/account-chips";
import type { RoleVocabulary } from "../../../src/components/account-chips";
import { useUserRosterColumns } from "../../../src/admin/user-roster";
import type { UserRosterRow, UserRowActionList } from "../../../src/admin/user-roster";
import { RolesEditor } from "../../../src/admin/role-select";
import { ReviewerScopeEditor } from "../../../src/admin/reviewer-scope-editor";
import { AdminActionConfirm } from "../../../src/admin/admin-action-confirm";
import type { AdminActionConfirmProps, AdminConfirmLevel } from "../../../src/admin/admin-action-confirm";
import { AdminActionLog } from "../../../src/admin/admin-action-log";
import type { AdminActionKind, AdminActionLogEntry, AdminActionLogProps } from "../../../src/admin/admin-action-log";
import { TransferOwnershipDialog } from "../../../src/admin/transfer-ownership-dialog";
import { InvitationsPanel } from "../../../src/admin/invitations-panel";
import type { InvitationDraft, InvitationRow } from "../../../src/admin/invitations-panel";
import { Example, Note } from "../lib/section";

/**
 * USER ADMINISTRATION (0.30, docs/user-admin-harmonization.md §3–§5): the roster preset,
 * the role select and editor, the reviewer scope, the confirmation at the server's level,
 * the transfer, the audit log and the invitations. Nothing sends a request: a pretend
 * server answers, with synthetic people only. Belongs on a new "User administration"
 * page (`user-admin`) in the App chrome group, after "Sign-in & account security".
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const beat = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));
const day = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * day).toISOString();

/** What axios throws for `409 {code}` — the shape the kit's refusal reader takes. */
const refusal = (code: string) =>
  Object.assign(new Error("Request failed with status code 409"), { response: { status: 409, data: { code } } });

type Role = "ADMIN" | "MEMBER" | "CUSTOMER" | "REVIEWER";

const ROLES: RoleVocabulary<Role> = {
  ADMIN: { label: "Admin", tone: "brand", icon: ShieldCheck },
  MEMBER: { label: "Member" },
  CUSTOMER: { label: "Customer", tone: "warning" },
  REVIEWER: { label: "Reviewer", tone: "info" },
};

interface Person extends UserRosterRow {
  id: number;
  role: Role;
  owned: number;
  translation_review_locales: string[];
  translation_review_areas: string[] | null;
  /** kastlan's case: the account also belongs to other companies. */
  otherCompanies?: boolean;
}

const ME = 1;

const PEOPLE: Person[] = [
  {
    id: 1,
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Example",
    role: "ADMIN",
    is_active: true,
    email_verified: true,
    created_at: ago(400),
    last_login_at: ago(0.02),
    owned: 12,
    translation_review_locales: [],
    translation_review_areas: null,
  },
  {
    id: 2,
    email: "ben@example.com",
    first_name: "Ben",
    last_name: "Sample",
    role: "MEMBER",
    is_active: true,
    email_verified: false,
    created_at: ago(30),
    last_login_at: null,
    owned: 3,
    translation_review_locales: [],
    translation_review_areas: null,
  },
  {
    id: 3,
    email: "cleo@example.com",
    first_name: "Cleo",
    last_name: "Muster",
    role: "REVIEWER",
    is_active: true,
    email_verified: true,
    created_at: ago(90),
    last_login_at: ago(3),
    owned: 0,
    translation_review_locales: ["fr", "it"],
    translation_review_areas: ["legal"],
  },
  {
    id: 4,
    email: "dan@example.com",
    first_name: "Dan",
    last_name: "Beispiel",
    role: "MEMBER",
    is_active: false,
    email_verified: true,
    deletion_requested_at: ago(2),
    deletion_scheduled_at: ahead(28),
    created_at: ago(200),
    last_login_at: ago(2),
    owned: 5,
    translation_review_locales: [],
    translation_review_areas: null,
  },
  {
    id: 5,
    email: "eva@example.com",
    first_name: "Eva",
    last_name: "Exemple",
    role: "CUSTOMER",
    is_active: true,
    email_verified: true,
    password_change_required_at: ago(1),
    created_at: ago(10),
    last_login_at: ago(9),
    owned: 0,
    translation_review_locales: [],
    translation_review_areas: null,
    otherCompanies: true,
  },
];

/** The pretend server's `confirmation_level(action)` (§4.2). */
const LEVEL: Partial<Record<AdminActionKind, AdminConfirmLevel>> = {
  deactivate: "type_email",
  reactivate: "none",
  role: "acknowledge",
  password_change_require: "acknowledge",
  password_change_withdraw: "none",
  mail_verification: "none",
  mail_reset: "none",
};

const nameOf = (p: Person) => `${p.first_name} ${p.last_name}`;
const asPerson = (p: Person) => ({ id: p.id, first: p.first_name, last: p.last_name, email: p.email });

/** A confirmation waiting to be answered. */
interface Pending extends Pick<AdminActionConfirmProps, "level" | "title" | "confirmLabel" | "consequence" | "tone"> {
  person: Person;
  action: AdminActionKind;
  run: () => Promise<unknown>;
}

export function UserRoster030Demo() {
  const [people, setPeople] = useState<Person[]>(PEOPLE);
  const [log, setLog] = useState<AdminActionLogEntry[]>([
    { id: 2, at: ago(2), actor: asPerson(PEOPLE[3]), action: "deletion_request", target: asPerson(PEOPLE[3]) },
    { id: 1, at: ago(40), actor: null, action: "erase", target: null },
  ]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [transferFrom, setTransferFrom] = useState<Person | null>(null);
  const [reviewerOf, setReviewerOf] = useState<Person | null>(null);
  const [filter, setFilter] = useState<AdminActionLogProps["target"]>(null);

  const me = people.find((p) => p.id === ME)!;
  const activeAdmins = people.filter((p) => p.role === "ADMIN" && p.is_active).length;

  const record = useCallback((action: string, person: Person | null, detail?: string) => {
    setLog((rows) => [
      { id: rows.length + 1, at: new Date().toISOString(), actor: asPerson(me), action, target: person && asPerson(person), detail },
      ...rows,
    ]);
  }, [me]);
  const patch = (id: number, change: Partial<Person>) =>
    setPeople((rows) => rows.map((row) => (row.id === id ? { ...row, ...change } : row)));

  const ask = useCallback(
    (person: Person, action: AdminActionKind, words: Omit<Pending, "person" | "action" | "level" | "run">, run: () => void) =>
      setPending({
        person,
        action,
        level: LEVEL[action] ?? "none",
        ...words,
        run: async () => {
          await beat();
          // The server's own guards, which a hand-written request meets too.
          if (action === "deactivate" && person.otherCompanies) throw refusal("other_companies");
          run();
        },
      }),
    [],
  );

  const actions = useCallback(
    (row: Person): UserRowActionList => [
      !row.email_verified && {
        label: "Resend verification",
        icon: MailCheck,
        onSelect: () => ask(row, "mail_verification", { confirmLabel: "Send" }, () => record("mail_verification", row)),
      },
      row.is_active && {
        label: "Send password reset",
        icon: KeyRound,
        onSelect: () => ask(row, "mail_reset", { confirmLabel: "Send" }, () => record("mail_reset", row)),
      },
      row.is_active &&
        (row.password_change_required_at
          ? {
              label: "Withdraw the new-password requirement",
              onSelect: () =>
                ask(row, "password_change_withdraw", { confirmLabel: "Withdraw" }, () => {
                  patch(row.id, { password_change_required_at: null });
                  record("password_change_withdraw", row);
                }),
            }
          : {
              label: "Require a new password",
              onSelect: () =>
                ask(
                  row,
                  "password_change_require",
                  {
                    title: `Require a new password for ${nameOf(row)}?`,
                    confirmLabel: "Require",
                    consequence: ["Every session ends now.", "The next sign-in asks for a new password."],
                  },
                  () => {
                    patch(row.id, { password_change_required_at: new Date().toISOString() });
                    record("password_change_require", row);
                  },
                ),
            }),
      row.role !== "ADMIN" &&
        row.role !== "CUSTOMER" && {
          label: "Reviewer scope…",
          icon: Languages,
          onSelect: () => setReviewerOf(row),
        },
      row.owned > 0 && { label: "Hand on work…", icon: Truck, onSelect: () => setTransferFrom(row) },
      row.is_active
        ? {
            label: "Deactivate",
            icon: UserX,
            tone: "danger",
            disabledReason:
              row.id === ME
                ? "You can’t deactivate yourself."
                : row.role === "ADMIN" && activeAdmins <= 1
                  ? "The last active administrator stays."
                  : undefined,
            onSelect: () =>
              ask(
                row,
                "deactivate",
                {
                  title: `Deactivate ${nameOf(row)}?`,
                  confirmLabel: "Deactivate",
                  consequence: "They are signed out everywhere at once and can’t sign in until reactivated.",
                },
                () => {
                  patch(row.id, { is_active: false });
                  record("deactivate", row);
                },
              ),
          }
        : {
            label: row.deletion_scheduled_at ? "Reactivate (cancels the deletion)" : "Reactivate",
            icon: UserCheck,
            onSelect: () =>
              ask(row, "reactivate", { confirmLabel: "Reactivate" }, () => {
                patch(row.id, { is_active: true, deletion_requested_at: null, deletion_scheduled_at: null });
                record(row.deletion_scheduled_at ? "deletion_cancel" : "reactivate", row);
              }),
          },
    ],
    [ask, record, activeAdmins],
  );

  const editableRole = useCallback(
    (row: Person) =>
      row.id === ME
        ? { disabledReason: "self" as const }
        : {
            offered: ["ADMIN", "MEMBER", "CUSTOMER"] as Role[],
            optionDisabledReason: (role: Role) => (role === "CUSTOMER" && row.owned > 0 ? "owns work" : undefined),
          },
    [],
  );
  const onRoleChange = useCallback(
    (row: Person, role: Role) =>
      ask(
        row,
        "role",
        {
          title: `Make ${nameOf(row)} ${ROLES[role].label.toLowerCase()}?`,
          confirmLabel: "Change role",
          consequence: role === "ADMIN" ? "Admins see and change every account." : "The new role applies at once.",
        },
        () => {
          patch(row.id, { role });
          record("role", row, `${ROLES[row.role].label} → ${ROLES[role].label}`);
        },
      ),
    [ask, record],
  );
  const extra = useMemo<DataTableColumn<Person>[]>(
    () => [{ key: "owned", header: "Owned", cell: (row) => String(row.owned), className: "text-end tabular-nums" }],
    [],
  );
  const columns = useUserRosterColumns<Person, Role>({ roles: ROLES, extra, actions, editableRole, onRoleChange });

  const shownLog = filter ? log.filter((entry) => entry.target && entry.target.id === filter.id) : log;

  return (
    <>
      <Example label="User roster — useUserRosterColumns, RoleSelect, AdminActionConfirm" hint="Ada is you">
        <DataTable rows={people} columns={columns} rowKey={(row) => row.id} paginated={false} />
        <Note>
          The column preset in the app&apos;s own {code("DataTable")}: {code("UserIdentityCell")} (name in the
          reader&apos;s order, address under it), {code("RoleSelect")} where {code("editableRole")} says so — locked on
          your own row, CUSTOMER unavailable for an account that owns work — the state chips from{" "}
          {code("adminUserStates")} (deletion with its day), the two dates, the app&apos;s {code("Owned")} column and the
          row&apos;s menu. Every action asks at the level the pretend server states: resend and reactivate at{" "}
          {code("none")}, the role and the password requirement at {code("acknowledge")}, deactivation at{" "}
          {code("type_email")}. Deactivating Eva answers kastlan&apos;s {code("other_companies")}.
        </Note>
      </Example>

      <Example label="Admin action log — AdminActionLog" hint="the actions above land here">
        <AdminActionLog
          entries={shownLog}
          target={filter}
          onTargetFilter={(target) => setFilter(target)}
          labels={{ actions: { plan: "Plan changed" } }}
        />
      </Example>

      {pending && (
        <AdminActionConfirm
          level={pending.level}
          target={asPerson(pending.person)}
          title={pending.title}
          confirmLabel={pending.confirmLabel}
          consequence={pending.consequence}
          onConfirm={pending.run}
          onRemoveFromCompany={async () => {
            await beat();
            record("membership_remove", pending.person);
            setPeople((rows) => rows.filter((row) => row.id !== pending.person.id));
          }}
          onClose={() => setPending(null)}
        />
      )}
      {transferFrom && (
        <TransferOwnershipDialog
          from={asPerson(transferFrom)}
          summary={`${transferFrom.owned} items others can see`}
          candidates={people.map((row) => ({
            ...asPerson(row),
            unavailable: row.role === "CUSTOMER" ? "customer" : !row.is_active ? "deactivated" : undefined,
          }))}
          onTransfer={async ({ toUserId }) => {
            await beat();
            const to = people.find((row) => row.id === toUserId)!;
            patch(to.id, { owned: to.owned + transferFrom.owned });
            patch(transferFrom.id, { owned: 0 });
            record("transfer", transferFrom, `${transferFrom.owned} items to ${nameOf(to)}`);
          }}
          onClose={() => setTransferFrom(null)}
        />
      )}
      {reviewerOf && (
        <DialogFrame
          title={`Translations ${nameOf(reviewerOf)} reviews`}
          onClose={() => setReviewerOf(null)}
          closeButton
        >
          <ReviewerScopeEditor
            key={reviewerOf.id}
            value={{ locales: reviewerOf.translation_review_locales, areas: reviewerOf.translation_review_areas }}
            languages={["de-CH", "en", "es", "fr", "it", "hu", "zh"]}
            onCancel={() => setReviewerOf(null)}
            onSave={async (scope) => {
              await beat();
              patch(reviewerOf.id, {
                role: scope.locales.length ? "REVIEWER" : "MEMBER",
                translation_review_locales: scope.locales,
                translation_review_areas: scope.areas,
              });
              record("reviewer", reviewerOf, scope.locales.join(", ") || "none");
              setReviewerOf(null);
            }}
          />
        </DialogFrame>
      )}
    </>
  );
}

/* ── RolesEditor ─────────────────────────────────────────────────────────── */

type CompanyRole = "ADMIN" | "MANAGER" | "ACCOUNTANT" | "TENANT";
const COMPANY_ROLES: RoleVocabulary<CompanyRole> = {
  ADMIN: { label: "Admin", tone: "brand" },
  MANAGER: { label: "Manager" },
  ACCOUNTANT: { label: "Accountant" },
  TENANT: { label: "Tenant" },
};

export function RolesEditor030Demo() {
  const [lastAdmin, setLastAdmin] = useState(true);
  const [roles, setRoles] = useState<CompanyRole[]>(["ADMIN", "ACCOUNTANT"]);
  return (
    <Example label="Several roles — RolesEditor" hint="kastlan: the roles in the current company">
      <div className="space-y-3">
        <Switch label="Ben is the company’s last admin" checked={lastAdmin} onCheckedChange={setLastAdmin} />
        <RolesEditor<CompanyRole>
          legend="Ben Sample’s roles in Example Ltd"
          value={roles}
          roles={COMPANY_ROLES}
          offered={["ADMIN", "MANAGER", "ACCOUNTANT"]}
          optionDisabledReason={(role) => (role === "ADMIN" && lastAdmin ? "last_admin" : undefined)}
          required
          columns={3}
          onChange={setRoles}
        />
        <p className="font-mono text-xs text-[var(--text-secondary)]">roles: {JSON.stringify(roles)}</p>
      </div>
      <Note>
        TENANT is not offered (no tenant portal yet, §4.1); a reason in {code("optionDisabledReason")} keeps the box as
        it is and says why under it. In a dialog, pass it as {code("AdminActionConfirm")}&apos;s children so the roles
        and the tick are one step.
      </Note>
    </Example>
  );
}

/* ── InvitationsPanel ────────────────────────────────────────────────────── */

type InviteRole = "MEMBER" | "CUSTOMER";
const INVITE_ROLES: RoleVocabulary<InviteRole> = {
  MEMBER: { label: "Member" },
  CUSTOMER: { label: "Customer", tone: "warning" },
};
const TEAMS = [
  { value: "workshop", label: "Workshop" },
  { value: "office", label: "Office" },
];

export function Invitations030Demo() {
  const [consoleMail, setConsoleMail] = useState(true);
  const [rows, setRows] = useState<InvitationRow<InviteRole>[]>([
    {
      id: 3,
      email: "nina@example.com",
      role: "CUSTOMER",
      scope: "workshop",
      note: "Supplier contact",
      invited_by: { first: "Ada", last: "Example" },
      created_at: ago(2),
      expires_at: ahead(12),
      status: "open",
    },
    { id: 2, email: "tim@example.com", role: "MEMBER", created_at: ago(20), status: "accepted" },
    { id: 1, email: "old@example.com", role: "MEMBER", created_at: ago(30), expires_at: ago(16), status: "expired" },
  ]);
  const link = (id: number) => `https://app.example.com/register?invite=demo-${id}-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <Example label="Invitations — InvitationsPanel" hint="the link is shown once, while mail goes to the console">
      <Switch label="Mail goes to the server console" checked={consoleMail} onCheckedChange={setConsoleMail} />
      <div className="mt-3">
        <InvitationsPanel<InviteRole>
          invitations={rows}
          roles={INVITE_ROLES}
          scopes={TEAMS}
          labels={{ scope: "Team", scopeNone: "No team" }}
          languages={["de-CH", "en", "fr", "it"]}
          mailBackend={consoleMail ? "console" : "resend"}
          onInvite={async (draft: InvitationDraft<InviteRole>) => {
            await beat();
            const id = Math.max(0, ...rows.map((row) => Number(row.id))) + 1;
            setRows((list) => [
              { id, ...draft, created_at: new Date().toISOString(), expires_at: ahead(14), status: "open" },
              ...list,
            ]);
            return { id, link: consoleMail ? link(id) : null, sent: true };
          }}
          onResend={async (invitation) => {
            await beat();
            setRows((list) =>
              list.map((row) =>
                row.id === invitation.id
                  ? { ...row, status: "open", created_at: new Date().toISOString(), expires_at: ahead(14) }
                  : row,
              ),
            );
            return { link: consoleMail ? link(Number(invitation.id)) : null, sent: true };
          }}
          onRevoke={async (invitation) => {
            await beat();
            setRows((list) => list.map((row) => (row.id === invitation.id ? { ...row, status: "revoked" } : row)));
          }}
        />
      </div>
      <Note>
        No word in it says &ldquo;admin&rdquo;: keksdose&apos;s budget owners invite from their sharing too. The address
        field offers no {code("+app")} tag — it is someone else&apos;s address. With the console backend the answer
        carries the one-time link, and the row offers to copy it until the page is left.
      </Note>
    </Example>
  );
}

/* ── AccountStateChip deletion ───────────────────────────────────────────── */

export function AccountDeletionChip030Demo() {
  return (
    <Example label="AccountStateChip — deletion" hint="§6.4: the day, or “requested” in operator mode">
      <div className="flex flex-wrap gap-2">
        <AccountStateChip state="deletion" date={ahead(30)} />
        <AccountStateChip state="deletion" />
        <AccountStateChip state="deletion" date={ahead(30)} variant="dot" caps={false} />
      </div>
      <Note>
        In place of {code("inactive")} — an account marked for deletion is always deactivated. The date goes through
        the provider&apos;s {code("formatDate")} when the app set one.
      </Note>
    </Example>
  );
}

/** All of the above, in the page's order — the routes may take the parts one by one. */
export function Admin030Demo() {
  return (
    <>
      <UserRoster030Demo />
      <RolesEditor030Demo />
      <Invitations030Demo />
      <AccountDeletionChip030Demo />
    </>
  );
}
