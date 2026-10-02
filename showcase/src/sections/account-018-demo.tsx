import { useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, DataTable, DialogFrame, Input } from "@eifi1/ui-kit";
import type { DataTableColumn } from "@eifi1/ui-kit";
import { PasskeysSetting } from "../../../src/components/passkeys-setting";
import type { PasskeyItem } from "../../../src/components/passkeys-setting";
import { AccountStateChip, RoleChip, dateColumn } from "../../../src/components/account-chips";
import type { RoleVocabulary } from "../../../src/components/account-chips";
import { Example, Note } from "../lib/section";

/**
 * ACCOUNT 0.18 — Kurvenschmiede 5 and 6: `PasskeysSetting`'s `mode` and `beforeAdd`,
 * and the chips and date column an admin roster repeats.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const READOUT = "mt-3 rounded-md bg-[var(--bg-surface-2)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)]";

const day = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();

export function Passkeys018Demo() {
  const [items, setItems] = useState<PasskeyItem<number>[]>([
    { id: 1, name: "Laptop", createdAt: ago(120), lastUsedAt: ago(2) },
  ]);
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState("");
  const [log, setLog] = useState("—");
  // The step's answer, and what it produced for onAdd — Kurvenschmiede's server mints
  // the registration options only once the password is right.
  const answer = useRef<(go: boolean) => void>(() => {});
  const options = useRef<string | null>(null);

  const close = (go: boolean) => {
    setAsking(false);
    setPassword("");
    answer.current(go);
  };

  return (
    <Example label="PasskeysSetting — beside the password, confirmed first" hint={'mode="alongside"; beforeAdd'}>
      <div className="max-w-md">
        <PasskeysSetting
          passkeys={items}
          mode="alongside"
          beforeAdd={(name) => {
            setLog(`beforeAdd("${name}") — asking for the password…`);
            return new Promise<boolean>((resolve) => {
              answer.current = (go) => {
                setLog(go ? `beforeAdd → true, options ${options.current}` : "beforeAdd → false (stopped quietly)");
                resolve(go);
              };
              setAsking(true);
            });
          }}
          onAdd={(name) => {
            setLog(`onAdd("${name}") with ${options.current}`);
            setItems((list) => [...list, { id: Date.now(), name: name || "Passkey", createdAt: new Date(), lastUsedAt: null }]);
          }}
          onDelete={(id) => setItems((list) => list.filter((k) => k.id !== id))}
        />
      </div>
      <div className={READOUT}>{log}</div>
      {asking && (
        <DialogFrame
          onClose={() => close(false)}
          title="Confirm your password"
          description="A passkey is added only after the current password is entered."
          actions={(dismiss) => (
            <>
              <Button variant="secondary" onClick={dismiss}>
                Cancel
              </Button>
              <Button variant="brand" type="submit" form="demo-passkey-password" disabled={!password}>
                Continue
              </Button>
            </>
          )}
        >
          <form
            id="demo-passkey-password"
            onSubmit={(event) => {
              event.preventDefault();
              options.current = `challenge-${Math.floor(Math.random() * 1000)}`;
              close(true);
            }}
          >
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </form>
        </DialogFrame>
      )}
      <Note>
        {code('mode="alongside"')} swaps the line under the title for{" "}
        {code("labels.descriptionAlongside")} — the password keeps working; the default{" "}
        {code('"instead"')} keeps "instead of a password". {code("beforeAdd")} runs first: resolve{" "}
        {code("true")} to go on to {code("onAdd")}, {code("false")} to stop with the typed name kept.
        What the step produced reaches {code("onAdd")} through a ref.
      </Note>
    </Example>
  );
}

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
        <div className="truncate text-xs text-[var(--text-muted)]">{r.email}</div>
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
      <ul className="mt-4 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]" aria-label="Allowlist">
        {INVITES.map((entry) => (
          <li key={entry.email} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {entry.email}
              {entry.note && <span className="ms-2 text-xs text-[var(--text-muted)]">{entry.note}</span>}
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
