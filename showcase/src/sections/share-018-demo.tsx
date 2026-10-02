import { useRef, useState } from "react";
import { Button } from "@eifi1/ui-kit";
import {
  ShareCard,
  ShareDialog,
  type ShareAddRequest,
  type ShareCandidate,
  type ShareGrantee,
  type SharePendingGrant,
  type ShareRole,
} from "../../../src/components/share-card";
import { WriteLockProvider } from "../../../src/components/write-lock";
import { Example, Note, OutTable } from "../lib/section";

/**
 * 0.18.0 — `ShareCard` / `ShareDialog`: Kurvenschmiede's share dialog and keksdose's
 * budget share card on one presentational component. The "server" here is a timeout;
 * any address starting with `fail` is refused, so the error box can be seen.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

const ROLES: ShareRole[] = [
  { key: "viewer", label: "Viewer", tone: "neutral", description: "Can open and read it." },
  { key: "editor", label: "Editor", tone: "info", description: "Can change it, but not share it." },
  { key: "guest", label: "Guest", tone: "warning", description: "Reads everything, adds only their own entries." },
];

// Addresses that "have an account" — anything else becomes a pending grant.
const ACCOUNTS: Record<string, string> = {
  "jonas@example.com": "Jonas Weber",
  "lena@example.com": "Lena Fischer",
};

const CANDIDATES: ShareCandidate[] = [
  { id: "t1", name: "Chassis team", kind: "team" },
  { id: "t2", name: "Test drivers", kind: "team" },
  { id: "u3", name: "Jonas Weber", email: "jonas@example.com" },
  { id: "u4", name: "Lena Fischer", email: "lena@example.com" },
];

const wait = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

/** The app's side: every rule the kit leaves out lives here. */
function useFakeShares(initialGrantees: ShareGrantee[], initialPending: SharePendingGrant[]) {
  const [grantees, setGrantees] = useState(initialGrantees);
  const [pending, setPending] = useState(initialPending);
  const [last, setLast] = useState("—");
  const next = useRef(100);

  const onAdd = async (request: ShareAddRequest) => {
    setLast(JSON.stringify({ ...request, candidate: request.candidate?.name ?? null }));
    await wait();
    if (request.email?.startsWith("fail")) throw new Error("The server refused that address.");
    if (request.candidate) {
      const c = request.candidate;
      setGrantees((all) => [
        ...all.filter((g) => g.id !== c.id),
        { id: c.id, name: c.name, kind: c.kind, email: c.email, role: request.role },
      ]);
    } else if (request.email && ACCOUNTS[request.email]) {
      const email = request.email;
      setGrantees((all) => [
        ...all.filter((g) => g.email !== email),
        { id: email, name: ACCOUNTS[email], email, role: request.role },
      ]);
    } else {
      setPending((all) => [
        ...all,
        { id: ++next.current, email: request.email, role: request.role, link: `https://example.com/invite/${next.current}` },
      ]);
    }
  };
  const onRoleChange = async (grantee: ShareGrantee, role: string) => {
    setLast(`role ${grantee.name} → ${role}`);
    await wait(400);
    setGrantees((all) => all.map((g) => (g.id === grantee.id ? { ...g, role } : g)));
  };
  const onRemove = async (grantee: ShareGrantee) => {
    setLast(`remove ${grantee.name}`);
    await wait(400);
    setGrantees((all) => all.filter((g) => g.id !== grantee.id));
  };
  const onRevokePending = async (grant: SharePendingGrant) => {
    setLast(`withdraw ${grant.email ?? "open link"}`);
    await wait(400);
    setPending((all) => all.filter((p) => p.id !== grant.id));
  };
  return { grantees, pending, last, onAdd, onRoleChange, onRemove, onRevokePending };
}

function CardExample() {
  const shares = useFakeShares(
    [
      { id: 1, name: "Marcel Eifert", email: "marcel@example.com", role: "editor", locked: true },
      { id: 2, name: "Anna Müller-Lüdenscheidt", email: "anna.mueller-luedenscheidt@example.com", role: "viewer" },
      { id: "t9", name: "Aero group", kind: "team", role: "viewer" },
    ],
    [{ id: 7, email: "new.colleague@example.com", role: "editor" }],
  );
  return (
    <Example
      label="ShareCard — roles, teams and pending grants"
      hint="type “team”, “jonas”, an unknown address, or one starting with “fail”"
    >
      <div className="space-y-3">
        <ShareCard
          title="Share “Rear suspension, rev. C”"
          roles={ROLES}
          candidates={CANDIDATES}
          {...shares}
          caption="An address without an account becomes a pending grant; it turns into access when they register."
        />
        <OutTable rows={[["last callback", <span className={READOUT}>{shares.last}</span>]]} />
      </div>
    </Example>
  );
}

function GuestExample() {
  const shares = useFakeShares(
    [{ id: 3, name: "Jonas Weber", email: "jonas@example.com", role: "guest", extra: <KeyLine /> }],
    [
      { id: 11, email: "oma@example.com", link: "https://example.com/invite/11" },
      { id: 12, email: null, link: "https://example.com/invite/12" },
    ],
  );
  return (
    <Example label="ShareCard — one role, open invite links" hint="addWithoutEmail; the row's extra slot">
      <ShareCard
        roles={[ROLES[2]]}
        {...shares}
        addWithoutEmail
        intro="A guest reads the whole budget but adds only their own transactions."
        caption="Leave the address empty to create a link anybody holding it can redeem."
      />
    </Example>
  );
}

function KeyLine() {
  return <p className="text-xs text-[var(--text-muted)]">Key delivered on 12 Sep — the app's own slot.</p>;
}

function DialogExample() {
  const [open, setOpen] = useState(false);
  const shares = useFakeShares([{ id: 4, name: "Lena Fischer", email: "lena@example.com", role: "editor" }], []);
  return (
    <Example label="ShareDialog — the same panel in a dialog" hint="Kurvenschmiede's form; commits as it goes">
      <Button onClick={() => setOpen(true)}>Share…</Button>
      <ShareDialog
        open={open}
        onClose={() => setOpen(false)}
        description="Front wing, rev. A"
        roles={ROLES.slice(0, 2)}
        candidates={CANDIDATES}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- a dialog that exists to add somebody, as Kurvenschmiede's does.
        autoFocus
        {...shares}
        caption={(c) => (c ? null : "Only an admin's grant also lets the address register.")}
      />
    </Example>
  );
}

function ReadOnlyExample() {
  return (
    <Example label="ShareCard — read-only" hint="readOnly: chips, no form, links still copy">
      <ShareCard
        readOnly
        roles={ROLES}
        grantees={[
          { id: 1, name: "Marcel Eifert", email: "marcel@example.com", role: "editor" },
          { id: 2, name: "Chassis team", kind: "team", role: "viewer" },
        ]}
        pending={[{ id: 3, email: "new.colleague@example.com", role: "viewer", link: "https://example.com/i/3" }]}
      />
    </Example>
  );
}

function LockedExample() {
  const shares = useFakeShares(
    [{ id: 5, name: "Anna Müller", email: "anna@example.com", role: "viewer" }],
    [{ id: 6, email: "new.colleague@example.com", role: "editor", link: "https://example.com/i/6" }],
  );
  return (
    <Example label="ShareCard — under a write lock" hint="WriteLockProvider locked: commits off with the reason, fields live">
      <WriteLockProvider locked reason="Shared with you to read — only the owner can share it.">
        <ShareCard roles={ROLES.slice(0, 2)} candidates={CANDIDATES} {...shares} />
      </WriteLockProvider>
    </Example>
  );
}

export function Share018Demo() {
  return (
    <>
      <CardExample />
      <GuestExample />
      <DialogExample />
      <ReadOnlyExample />
      <LockedExample />
      <Note>
        The kit checks only that an address is shaped like one. Whether it has an account (which makes a grant
        pending), who may share, and every request belong to the app — each callback may return a promise; while
        it runs the panel is busy, and a rejection keeps the field and shows the error box.
      </Note>
    </>
  );
}
