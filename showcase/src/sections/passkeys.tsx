import { useState, useRef } from "react";
import { PasskeysSetting, Button, DialogFrame, Input } from "@eifi1/ui-kit";
import type { PasskeyItem } from "@eifi1/ui-kit";
import { Example, Note, code, READOUT } from "../lib/section";

/**
 * PasskeysSetting in one module, rendered as one section of the Sign-in & account page.
 * Filed by release until the refactor audit of 2026-10 (DOC-8): feedback-016,
 * account-018. Each specimen keeps its label, so its anchor and its search entry hold,
 * and says since which release in a Note.
 */

/* ── since 0.16 ─────────────────────────────────────────────────────────── */

const NOW = Date.now();

const DAY = 86_400_000;

const KEYS: PasskeyItem<number>[] = [
  { id: 101, name: "MacBook Touch ID", createdAt: NOW - 90 * DAY, lastUsedAt: NOW - DAY },
  { id: 102, name: "Pixel 8", createdAt: NOW - 12 * DAY, lastUsedAt: null },
];

function Passkeys016Demo() {
  const [items, setItems] = useState(KEYS);
  const [log, setLog] = useState("—");
  return (
    <Example label="PasskeysSetting — numeric ids, id, data-* and rowProps" hint="PasskeyItem<number>; rowProps">
      <div className="max-w-md">
        <PasskeysSetting
          id="passkeys"
          data-section="security"
          passkeys={items}
          onAdd={() => {}}
          // `id` is a number here — inferred from `passkeys`, no cast.
          onRename={(id, name) => {
            setLog(`onRename(${id} /* ${typeof id} */, "${name}")`);
            setItems((list) => list.map((k) => (k.id === id ? { ...k, name } : k)));
          }}
          onDelete={(id) => {
            setLog(`onDelete(${id} /* ${typeof id} */)`);
            setItems((list) => list.filter((k) => k.id !== id));
          }}
          rowProps={(item) => ({ id: `passkey-${item.id}` })}
        />
      </div>
      <div className={READOUT}>{log}</div>
      <Note>
        {code("PasskeysSetting")} infers its id type from {code("passkeys")}: numeric ids come
        back to {code("onRename")} / {code("onDelete")} as numbers. {code("id")} and{" "}
        {code("data-*")} land on the card; {code("rowProps")} gives each row's {code("<li>")}{" "}
        an id (here {code("#passkey-101")}), and every row carries {code("data-passkey-id")}.
      </Note>
      <Note>Since 0.16.</Note>
    </Example>
  );
}

/* ── since 0.18 ─────────────────────────────────────────────────────────── */

const READOUT_BOX = "mt-3 rounded-md bg-surface-2 px-3 py-2 font-mono text-xs text-secondary";

const day = 86_400_000;

const ago = (days: number) => new Date(Date.now() - days * day).toISOString();

function Passkeys018Demo() {
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
      <div className={READOUT_BOX}>{log}</div>
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
              <Button variant="accent" type="submit" form="demo-passkey-password" disabled={!password}>
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
      <Note>Since 0.18.</Note>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** Every PasskeysSetting specimen, in the order the releases added them. */
export function PasskeysDemo() {
  return (
    <>
      <Passkeys016Demo />
      <Passkeys018Demo />
    </>
  );
}
