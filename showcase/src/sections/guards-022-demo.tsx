import { useState } from "react";
import { Upload } from "lucide-react";
import { Button, DangerConfirm, DataTable, FileButton, FileDropzone, Input, NumberInput, Switch, formatMoney } from "@eifi1/ui-kit";
import { CurrentPasswordInput, TypedConfirmField } from "../../../src/components/danger-confirm";
import { InlineEditField } from "../../../src/components/inline-edit-field";
import { WriteLockProvider } from "../../../src/components/write-lock";
import { Example, Note, Stage } from "../lib/section";

/**
 * 0.22: the guards (keksdose K7 — the acknowledgement tick, the consequences, the typed
 * field on its own; kastlan 1 — the current-password field, public), the write lock on
 * the pickers that commit (keksdose K3), and the value that edits in place (K9).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/** The raw value under a specimen, so what the component emits is visible. */
function StateLine({ children }: { children: string }) {
  return <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">{children}</p>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ── Signature, password & confirmation ─────────────────────────────────── */

function AcknowledgeAndConsequences() {
  const [log, setLog] = useState("—");
  return (
    <Example
      label="DangerConfirm — requireAcknowledge, consequences"
      hint="keksdose's admin password reset: what will happen, then a tick or the typed address"
    >
      <Stage>
        <DangerConfirm
          tone="warning"
          armLabel="Reset password…"
          confirmLabel="Send reset link"
          prompt="Anna’s password is reset by e-mail."
          consequences={[
            "Her sessions end when she sets the new password.",
            "Her 2 personal API tokens keep working.",
          ]}
          requireAcknowledge
          onConfirm={() => wait(600).then(() => setLog("reset sent (ticked)"))}
        />
        <DangerConfirm
          armLabel="Require a new password…"
          confirmLabel="Require it now"
          prompt="Anna must choose a new password at her next sign-in."
          consequences={[
            "Every session ends now.",
            { key: "only_door", text: "Her password is the only way into her encrypted data.", severe: true },
          ]}
          phrase="anna@example.org"
          phraseMatch="caseless"
          onConfirm={() => setLog("required (typed address, any case)")}
        />
      </Stage>
      <StateLine>{`last = ${log}`}</StateLine>
      <Note>
        {code("consequences")} is a list under the prompt, shown once armed — strings, or{" "}
        {code("{ key, text, severe }")} for the one line that loses something for good. {code("requireAcknowledge")}{" "}
        adds an &ldquo;I have read what this does&rdquo; tick ({code("true")} for the namespace&rsquo;s words, or a
        node of your own); with {code("phrase")} and {code("requirePassword")}, every guard given must be met.
      </Note>
    </Example>
  );
}

function LockedTile() {
  const [locked, setLocked] = useState(true);
  return (
    <Example label="DangerConfirm — commit" hint="the write lock's reason, taken from the provider">
      <Stage>
        <div data-stage="wide" className="flex flex-col items-center gap-4">
          <Switch checked={locked} onCheckedChange={setLocked} label="Viewing a budget shared to read" />
          <WriteLockProvider locked={locked} reason="Shared with you to read — nothing here can be deleted.">
            <div className="w-80 max-w-full">
              <DangerConfirm commit armLabel="Reset budget…" requireAcknowledge onConfirm={() => {}} />
            </div>
          </WriteLockProvider>
        </div>
      </Stage>
      <Note>
        {code("commit")} reads the nearest {code("WriteLockProvider")}: no more{" "}
        {code("lockedReason={lock.locked ? lock.reason : undefined}")} per tile. Arm it, then switch the lock on:
        the tile keeps what was ticked, and its confirm says why it is off instead of confirming.
      </Note>
    </Example>
  );
}

function TypedField() {
  const [matched, setMatched] = useState(false);
  const [password, setPassword] = useState("");
  return (
    <Example label="TypedConfirmField" hint="the typed confirmation on its own — the next step appears once it matches">
      <Stage>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            End-to-end encryption cannot be undone by turning it off again.
          </p>
          <TypedConfirmField target="ENCRYPT" match="caseless" onMatchedChange={setMatched} />
          {matched && (
            <>
              <CurrentPasswordInput value={password} onValueChange={setPassword} />
              <Button disabled={password === ""}>Turn on encryption</Button>
            </>
          )}
        </div>
      </Stage>
      <StateLine>{`matched = ${String(matched)}`}</StateLine>
      <Note>
        The field DangerConfirm&rsquo;s {code("phrase")} and {code("useConfirm({ requireTyped })")} use, for a guard
        that is not a tile or a modal: {code("typedMatches")}&rsquo; rule ({code('match="caseless"')} here), the label
        worded from {code("target")} by {code("dangerConfirm.phrase")}, and a phone keyboard told to leave the text
        alone. What a match unlocks is yours — {code("onMatchedChange")}, or {code("data-matched")} to style.
      </Note>
    </Example>
  );
}

function SignIn() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <Example label="CurrentPasswordInput" hint="a sign-in or re-auth field the password manager fills — never offers a new one for">
      <Stage>
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError(undefined);
            void wait(700).then(() => {
              setBusy(false);
              if (password !== "letmein") setError("That password is not right. (Try “letmein”.)");
            });
          }}
        >
          <Input type="email" label="E-mail" autoComplete="username" defaultValue="anna@example.org" />
          <CurrentPasswordInput
            name="password"
            value={password}
            onValueChange={(v) => {
              setPassword(v);
              setError(undefined);
            }}
            busy={busy}
            error={error}
          />
          <Button type="submit" variant="brand" pending={busy}>
            Sign in
          </Button>
        </form>
      </Stage>
      <Note>
        {code('type="password"')} and {code('autoComplete="current-password"')} are fixed; everything else is{" "}
        {code("Input")} — {code("error")}, {code("name")}, the reveal toggle, a forwarded ref for{" "}
        {code("@eifi1/ui-kit/rhf")}. {code("busy")} makes it read-only, not disabled, so the focus Enter left in it
        is still there when the answer comes. Not for a NEW password: that is {code("new-password")}.
      </Note>
    </Example>
  );
}

/** Signature, password & confirmation (`signature-password`). */
export function Guards022Demo() {
  return (
    <>
      <AcknowledgeAndConsequences />
      <LockedTile />
      <TypedField />
      <SignIn />
    </>
  );
}

/* ── Files ──────────────────────────────────────────────────────────────── */

/** Files (`files`): the pickers that commit take the write lock. */
export function FileLock022Demo() {
  const [locked, setLocked] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [log, setLog] = useState("—");
  return (
    <Example label="FileButton, FileDropzone — commit" hint="an upload that starts on pick is a commit; under a lock it says why">
      <Stage>
        <div data-stage="wide" className="flex flex-col items-center gap-4">
          <Switch checked={locked} onCheckedChange={setLocked} label="Viewing a budget shared to read" />
          <WriteLockProvider locked={locked} reason="Shared with you to read — uploads are off.">
            <div className="flex w-80 max-w-full flex-col gap-3">
              <FileButton commit droppable variant="secondary" accept="image/*,application/pdf" onFiles={([f]) => setLog(`uploaded ${f.name}`)}>
                <Upload aria-hidden className="size-4" />
                Attach receipt
              </FileButton>
              <FileDropzone
                commit
                accept=".pdf"
                file={file}
                onFileSelected={(f) => {
                  setFile(f);
                  setLog(`dropped ${f.name}`);
                }}
                onClear={() => setFile(null)}
                onReject={() => {}}
                rejectionFeedback="inline"
              />
            </div>
          </WriteLockProvider>
        </div>
      </Stage>
      <StateLine>{`last = ${log}`}</StateLine>
      <Note>
        {code("commit")} (or a {code("disabledReason")} of the picker&rsquo;s own) is Button&rsquo;s path plus the
        picker&rsquo;s half: focusable and {code("aria-disabled")}, the reason in the tooltip and the description, no
        picker opens, no drop is taken (the drag is still cancelled, so the browser does not open the file). The zone
        shows the reason where its hint was, and a chosen file stays readable. A picker that only fills a form saved
        later is not a commit — leave {code("commit")} off and let the form&rsquo;s Save carry the lock.
      </Note>
    </Example>
  );
}

/* ── Table entry ────────────────────────────────────────────────────────── */

interface Envelope {
  id: number;
  name: string;
  assigned: string;
}

const START: Envelope[] = [
  { id: 1, name: "Rent", assigned: "1100.0000" },
  { id: 2, name: "Groceries", assigned: "450.0000" },
  { id: 3, name: "Holidays", assigned: "0.0000" },
];

function EnvelopeTable() {
  const [rows, setRows] = useState(START);
  const [locked, setLocked] = useState(false);
  const [log, setLog] = useState("—");
  const update = (id: number, patch: Partial<Envelope>) =>
    setRows((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <Example label="InlineEditField in a DataTable" hint="click a value — Enter or leaving saves, Escape cancels">
      <div className="flex flex-col gap-3">
        <Switch checked={locked} onCheckedChange={setLocked} label="Read-only demo budget" />
        <WriteLockProvider locked={locked} reason="Read-only demo — saving is disabled.">
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              {
                key: "name",
                header: "Envelope",
                cell: (r) => (
                  <InlineEditField
                    commit
                    label="Envelope name"
                    value={r.name}
                    inputProps={{ maxLength: 40 }}
                    onCommit={(name) => {
                      if (name.trim() === "") throw new Error("A name is needed.");
                      update(r.id, { name: name.trim() });
                      setLog(`renamed to ${name.trim()}`);
                    }}
                    formatError={(e) => (e as Error).message}
                  />
                ),
              },
              {
                key: "assigned",
                header: "Assigned",
                headClassName: "text-end",
                cell: (r) => (
                  <InlineEditField
                    commit
                    redact
                    align="end"
                    label="Assigned"
                    value={r.assigned}
                    display={(v) => formatMoney(Number(v), "CHF")}
                    // The column is Numeric(18,4): "1100" is the server's "1100.0000".
                    isEqual={(a, b) => Number(a) === Number(b)}
                    onCommit={(v) =>
                      wait(500).then(() => {
                        update(r.id, { assigned: Number(v).toFixed(4) });
                        setLog(`assigned ${v}`);
                      })
                    }
                    editor={(p) => (
                      <NumberInput
                        calculator={false}
                        ariaLabel={p.label}
                        value={p.value}
                        onChange={p.onChange}
                        onCommit={p.commit}
                        aria-invalid={p.invalid || undefined}
                        aria-describedby={p.describedBy}
                        inputClassName="px-2 py-1 text-end"
                      />
                    )}
                  />
                ),
              },
            ]}
          />
        </WriteLockProvider>
        <StateLine>{`last = ${log}`}</StateLine>
      </div>
      <Note>
        The value is a quiet button named by the value — the action (&ldquo;Edit Assigned&rdquo;) is its description,
        so a screen reader does not hear a column of &ldquo;edit, edit, edit&rdquo;. A text value needs no editor; any
        other takes one through {code("editor")} (here {code("NumberInput calculator={false}")}, whose own{" "}
        {code("onCommit")} hands over the evaluated &ldquo;1100-50&rdquo;). Unchanged by {code("isEqual")} is not a
        write. A returned promise keeps the editor read-only with a spinner; a rejection (or a throw — empty the name)
        keeps it open with the failure under it. With {code("commit")} under a lock, the value stays a button,{" "}
        {code("aria-disabled")}, with the reason — never a field that takes keys it cannot save.
      </Note>
    </Example>
  );
}

function Rename() {
  const [name, setName] = useState("Household");
  return (
    <Example label="InlineEditField — a rename that can fail" hint="the save rejects for “Taken”; the typed name stays for a retry">
      <Stage>
        <div className="flex items-center gap-2 text-sm font-medium">
          <InlineEditField
            label="Budget name"
            value={name}
            className="flex-1"
            formatError={(e) => (e as Error).message}
            onCommit={(next) =>
              wait(600).then(() => {
                if (next.trim().toLowerCase() === "taken") throw new Error("You already have a budget called that.");
                setName(next.trim());
              })
            }
          />
        </div>
      </Stage>
      <Note>
        keksdose&rsquo;s budgets rename was an {code("Input")} with Save and Cancel and no Escape. The failure is shown
        under the field, described and spoken; the next keystroke clears it. Focus returns to the value after Enter or
        Escape, and stays where you went after a save that came from leaving the field.
      </Note>
    </Example>
  );
}

/** Table entry (`measured-grid`): the value that edits in place. */
export function InlineEdit022Demo() {
  return (
    <>
      <EnvelopeTable />
      <Rename />
    </>
  );
}
