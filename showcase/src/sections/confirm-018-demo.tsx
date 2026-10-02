import { useState } from "react";
import { Button } from "@eifi1/ui-kit";
import { useConfirm } from "../../../src/components/confirm-dialog";
import { DangerConfirm } from "../../../src/components/danger-confirm";
import { ReauthDialog } from "../../../src/components/reauth-dialog";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.18.0 — the two confirmations both Kurvenschmiede and keksdose had built beside the
 * kit: typing the TARGET's address before an admin action (`requireTyped`, and
 * `phraseMatch="caseless"` for the inline tile), and the current-password step-up
 * before adding a passkey (`ReauthDialog`).
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

function useLog() {
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => setLog((l) => [line, ...l].slice(0, 6));
  return [log, add] as const;
}

export function TypedConfirm018Demo() {
  const confirm = useConfirm();
  const [log, add] = useLog();
  const [rowOpen, setRowOpen] = useState(false);
  return (
    <>
      <Example
        label="useConfirm — requireTyped"
        hint="confirm stays disabled until the address is typed; spaces and case ignored by default"
      >
        <Row>
          <Button
            variant="danger"
            onClick={async () => {
              const ok = await confirm({
                tone: "danger",
                title: "Deactivate anna.mueller@example.org?",
                body: "She is signed out everywhere and can no longer sign in. Her data stays.",
                confirmLabel: "Deactivate",
                requireTyped: "anna.mueller@example.org",
              });
              add(`deactivate → ${ok}`);
            }}
          >
            Deactivate user…
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const ok = await confirm({
                tone: "danger",
                title: "Wipe every transaction?",
                confirmLabel: "Wipe",
                requireTyped: "DELETE",
                typedMatch: "exact",
                typedLabel: "Type DELETE to confirm",
              });
              add(`wipe (exact) → ${ok}`);
            }}
          >
            Wipe (exact phrase)…
          </Button>
        </Row>
        <p className={`mt-3 ${READOUT}`}>{log.length ? log.join(" · ") : "answers appear here"}</p>
        <Note>
          For the action whose risk is the wrong ROW, not the wrong intent: the admin has already proven who they
          are; typing the address proves which account they are on. The field takes focus (a reflexive Enter cannot
          confirm a field that does not match), and Enter confirms once it does. <code>typedMatch</code>:{" "}
          <code>&quot;caseless&quot;</code> (default) · <code>&quot;trim&quot;</code> · <code>&quot;exact&quot;</code>.
        </Note>
      </Example>
      <Example
        label="DangerConfirm — caseless phrase, inline under a row"
        hint="keksdose keeps the question under the row, so the row being acted on stays in view"
      >
        <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span>ben@example.org</span>
            {!rowOpen && (
              <Button size="sm" variant="secondary" onClick={() => setRowOpen(true)}>
                Reset password…
              </Button>
            )}
          </div>
          {rowOpen && (
            <DangerConfirm
              armed
              onArmedChange={(armed) => setRowOpen(armed)}
              phrase="ben@example.org"
              phraseMatch="caseless"
              tone="warning"
              prompt="Ben’s sessions end when he sets a new password. His encrypted data stays sealed."
              confirmLabel="Send reset link"
              onConfirm={() => {
                add("reset sent");
                setRowOpen(false);
              }}
            />
          )}
        </div>
      </Example>
    </>
  );
}

export function Reauth018Demo() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [log, add] = useLog();
  return (
    <Example
      label="ReauthDialog — current password first"
      hint="the app verifies; a rejection stays open with the app's message. Try anything, then “hunter2”"
    >
      <Row>
        <Button
          onClick={() => {
            setError(undefined);
            setOpen(true);
          }}
        >
          Add passkey…
        </Button>
      </Row>
      <p className={`mt-3 ${READOUT}`}>{log.length ? log.join(" · ") : "answers appear here"}</p>
      <Note>
        <code>onSubmit(password)</code> returns the app&apos;s verify call: busy while it runs (field read-only,
        Cancel and Escape held), <code>onClose(true)</code> when it resolves, open with the password selected when
        it rejects. <code>error</code> is the app&apos;s wording (a 400 is a wrong password, a 500 is not); the field
        turns invalid and the message goes as soon as the user edits.
      </Note>
      <ReauthDialog
        open={open}
        title="Add a passkey"
        description="Confirm your current password before a new sign-in method is added."
        error={error}
        onSubmit={(password) =>
          new Promise<void>((resolve, reject) => {
            setTimeout(() => {
              if (password === "hunter2") {
                setError(undefined);
                resolve();
              } else {
                setError("That password is not right.");
                reject(new Error("400"));
              }
            }, 700);
          })
        }
        onClose={(confirmed) => {
          setOpen(false);
          add(`closed → ${confirmed}`);
        }}
      />
    </Example>
  );
}
