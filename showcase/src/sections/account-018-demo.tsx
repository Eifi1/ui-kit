import { ShieldCheck } from "lucide-react";
import { DataTable } from "@eifi1/ui-kit";
import type { DataTableColumn } from "@eifi1/ui-kit";
import { AccountStateChip, RoleChip, dateColumn } from "../../../src/components/account-chips";
import type { RoleVocabulary } from "../../../src/components/account-chips";
import { Example, Note, code } from "../lib/section";

/**
 * ACCOUNT 0.18 — `PasskeysSetting`'s `mode` and `beforeAdd`,
 * and the chips and date column an admin roster repeats.
 */

const day = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();

type Role = "ADMIN" | "MEMBER" | "CUSTOMER";
const ROLES: RoleVocabulary<Role> = {
  ADMIN: { label: "Admin", tone: "brand", icon: ShieldCheck },
  MEMBER: { label: "Member" },
  CUSTOMER: { label: "Customer", tone: "warning" },
};

interface Account {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  verified: boolean;
  mustChange: boolean;
  created: string;
  lastLogin: string | null;
}

const ACCOUNTS: Account[] = [
  { id: 1, name: "Marta Keller", email: "marta@example.com", role: "ADMIN", active: true, verified: true, mustChange: false, created: ago(400), lastLogin: ago(0.1) },
  { id: 2, name: "Jonas Brandt", email: "jonas@example.com", role: "MEMBER", active: true, verified: false, mustChange: false, created: ago(30), lastLogin: ago(3) },
  { id: 3, name: "Lea Vogt", email: "lea@example.com", role: "CUSTOMER", active: true, verified: true, mustChange: true, created: ago(12), lastLogin: null },
  { id: 4, name: "Tim Roth", email: "tim@example.com", role: "MEMBER", active: false, verified: true, mustChange: false, created: ago(700), lastLogin: ago(210) },
];

const COLUMNS: DataTableColumn<Account>[] = [
  {
    key: "name",
    header: "User",
    cell: (r) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{r.name}</div>
        <div className="truncate text-xs text-muted">{r.email}</div>
      </div>
    ),
    sortBy: (r) => r.name,
    mobilePrimary: true,
  },
  { key: "role", header: "Role", cell: (r) => <RoleChip value={r.role} roles={ROLES} />, sortBy: (r) => r.role },
  {
    key: "state",
    header: "State",
    cell: (r) => (
      <div className="flex flex-wrap gap-1">
        <AccountStateChip state={r.active ? "active" : "inactive"} variant={r.active ? "dot" : undefined} />
        {!r.verified && <AccountStateChip state="unverified" />}
        {r.mustChange && <AccountStateChip state="passwordChange" />}
      </div>
    ),
  },
  dateColumn<Account>({ key: "created", header: "Created", value: (r) => r.created, column: { mobileHidden: true } }),
  dateColumn<Account>({
    key: "last_login",
    header: "Last login",
    value: (r) => r.lastLogin,
    display: "relative",
    empty: "Never",
    relative: { absoluteAfterDays: 60 },
    filter: true,
  }),
];

const INVITES = [
  { email: "nina@example.com", note: "Workshop lead", registered: false, role: "CUSTOMER" as Role },
  { email: "tim@example.com", note: "", registered: true, role: "MEMBER" as Role },
];

export function AccountRoster018Demo() {
  return (
    <Example label="Admin roster parts — RoleChip, AccountStateChip, dateColumn" hint="the roster stays the app's DataTable">
      <DataTable rows={ACCOUNTS} columns={COLUMNS} rowKey={(r) => r.id} />
      <ul className="mt-4 divide-y divide-subtle rounded-md border border-subtle" aria-label="Allowlist">
        {INVITES.map((entry) => (
          <li key={entry.email} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
            {/* An email: cut at Normal, wrapped from Large up, never marked (§10.17). */}
            <span className="min-w-0 flex-1 truncate-until-large">
              {entry.email}
              {entry.note && <span className="ms-2 text-xs text-muted">{entry.note}</span>}
            </span>
            {entry.role !== "MEMBER" && <RoleChip value={entry.role} roles={ROLES} size="xs" />}
            <AccountStateChip state={entry.registered ? "registered" : "invited"} size="xs" />
          </li>
        ))}
      </ul>
      <Note>
        Only the vocabulary is the kit's: {code("RoleChip")} looks the API's role key up in the app's{" "}
        {code("RoleVocabulary")} (label, tone, icon); {code("AccountStateChip")} says active, inactive,
        invited, registered, unverified or "must change password" in the kit's words and tones;{" "}
        {code("dateColumn")} is a sortable date column — {code('display: "relative"')} with the exact
        time in a tooltip and {code("empty")} for "Never". Columns, actions and who may do what stay
        the app's.
      </Note>
    </Example>
  );
}
