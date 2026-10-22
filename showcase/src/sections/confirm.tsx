import { useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { DangerConfirm, Button, Switch, Select, ToggleGroup } from "@eifi1/ui-kit";
import { useConfirm } from "../../../src/components/confirm-dialog";
import { ReauthDialog } from "../../../src/components/reauth-dialog";
import { CurrentPasswordInput, TypedConfirmField } from "../../../src/components/danger-confirm";
import { WriteLockProvider } from "../../../src/components/write-lock";
import { Example, Note, Stage, StateLine, Row, READOUT, code, beat } from "../lib/section";

/**
 * The confirmations — DangerConfirm's arm-then-confirm tile, TypedConfirmField, useConfirm's
 * typed phrase and ReauthDialog — in one module. The DangerConfirm specimens render as one
 * section of the "Signature, password & confirmation" page; the dialog ones as one section
 * of "Confirm dialog & floating panel". They were filed by the release that added them
 * (numbers-more, confirm-018, guards-022, confirm-023, confirm-024); each keeps its label,
 * so its anchor and its search entry hold, and says since which release in a Note
 * (refactor audit 2026-10, DOC-8).
 */

/* ── since 0.6 ─────────────────────────────────────────────────────────── */

function DangerSpecimens() {
  const [log, setLog] = useState("—");
  return (
    <Example label="DangerConfirm" hint="arm → guards → confirm">
      <Stage>
        <DangerConfirm
          armLabel="Wipe all data…"
          confirmLabel="Wipe everything"
          prompt="Deletes every budget and transaction. This cannot be undone."
          phrase="wipe"
          requirePassword
          onConfirm={(password) =>
            new Promise<void>((resolve) =>
              setTimeout(() => {
                setLog(`confirmed with a ${password?.length ?? 0}-character password`);
                resolve();
              }, 800),
            )
          }
        />
        <DangerConfirm
          tone="warning"
          armLabel="Load demo data…"
          confirmLabel="Replace with demo data"
          prompt="Your own entries are replaced by the demo's."
          onConfirm={() => setLog("demo data loaded")}
        />
        <DangerConfirm
          armLabel="Delete account…"
          confirmLabel="Delete my account"
          prompt="Your account and every budget in it are removed for good."
          phrase="DELETE"
          phraseMatch="exact"
          // A finished label from the app's own catalogue, and a placeholder: the label
          // then sits above the field, which the placeholder has to itself.
          labels={{ phrase: "Type DELETE, in capitals, to confirm", phrasePlaceholder: (p) => p }}
          onConfirm={() => setLog("account deleted (exact match, spaces count)")}
        />
        <DangerConfirm
          armLabel="Reset budget…"
          lockedReason="The demo is read-only — nothing here can be deleted."
          onConfirm={() => {}}
        />
      </Stage>
      <StateLine>{`last = ${log}`}</StateLine>
      <Note>
        A promise from <code>onConfirm</code> keeps the tile busy, collapses it when it resolves and
        leaves it armed (fields kept) when it rejects. <code>lockedReason</code> replaces an
        app&rsquo;s write-lock hook: the arm button stays focusable and says why it is off — in
        the line under it and in a tooltip on the button itself (hover or focus
        &ldquo;Reset budget…&rdquo;), where the pointer that tried it is. The bubble is visual
        only: the button is already described by the line, so a screen reader hears the reason
        once.
        The phrase ignores surrounding spaces unless <code>phraseMatch=&quot;exact&quot;</code>;{" "}
        <code>labels.phrase</code> takes a function of the phrase or a finished string, and{" "}
        <code>labels.phrasePlaceholder</code> moves the label above the field.
      </Note>
    </Example>
  );
}

function DangerStates() {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [log, setLog] = useState("—");
  return (
    <Example label="DangerConfirm — controlled, busy, disabled, rejected" hint="the parent owns the armed state">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-secondary">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={armed} onChange={(e) => setArmed(e.target.checked)} />
          armed (controlled)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={busy} onChange={(e) => setBusy(e.target.checked)} />
          busy
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
          disabled (third tile)
        </label>
      </div>
      <Stage>
        <DangerConfirm
          armLabel="Archive project…"
          confirmLabel="Archive"
          prompt="Controlled: the checkbox above arms and disarms this tile."
          armed={armed}
          onArmedChange={(next) => {
            setArmed(next);
            setLog(`onArmedChange(${next})`);
          }}
          busy={busy}
          onConfirm={() => setLog("archived")}
        />
        <DangerConfirm
          armLabel="Revoke keys…"
          confirmLabel="Revoke (fails)"
          prompt="The server refuses: the promise rejects, the tile stays armed and keeps the phrase."
          phrase="revoke"
          onConfirm={() =>
            new Promise<void>((_, reject) =>
              setTimeout(() => {
                setLog("onConfirm rejected — still armed");
                reject(new Error("refused"));
              }, 800),
            )
          }
        />
        <DangerConfirm
          disabled={disabled}
          labels={{
            arm: "Übertragen…",
            confirm: "Endgültig übertragen",
            cancel: "Abbrechen",
            prompt: "Diese Aktion kann nicht rückgängig gemacht werden.",
            password: "Passwort",
            phrase: (p) => `Zur Bestätigung „${p}“ eingeben`,
          }}
          phrase="übertragen"
          requirePassword
          onConfirm={() => setLog("übertragen")}
        />
      </Stage>
      <StateLine>{`armed = ${armed} · busy = ${busy} · last = ${log}`}</StateLine>
      <Note>
        <code>busy</code> from the parent shows the same state a pending promise does, for a
        mutation the app tracks itself. <code>disabled</code> turns the arm button off without a
        reason — prefer <code>lockedReason</code> when the user can do something about it. The
        third tile takes every word from <code>labels</code>; <code>armLabel</code> and{" "}
        <code>confirmLabel</code> would win over them.
      </Note>
    </Example>
  );
}

/* ── since 0.18 ─────────────────────────────────────────────────────────── */

/**
 * 0.18.0 — the two confirmations apps had built beside the
 * kit: typing the TARGET's address before an admin action (`requireTyped`, and
 * `phraseMatch="caseless"` for the inline tile), and the current-password step-up
 * before adding a passkey (`ReauthDialog`).
 */

function useLog() {
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => setLog((l) => [line, ...l].slice(0, 6));
  return [log, add] as const;
}

function TypedConfirm018Demo() {
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
        hint="the question under the row, so the row being acted on stays in view"
      >
        <div className="space-y-2 rounded-lg border border-subtle p-3">
          {/* Wraps: at Extra large the address and "Reset password…" ran past a 360 px phone. */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 [overflow-wrap:anywhere]">ben@example.org</span>
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

function Reauth018Demo() {
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

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

function AcknowledgeAndConsequences() {
  const [log, setLog] = useState("—");
  return (
    <Example
      label="DangerConfirm — requireAcknowledge, consequences"
      hint="an admin password reset: what will happen, then a tick or the typed address"
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
          onConfirm={() => beat(600).then(() => setLog("reset sent (ticked)"))}
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
          <p className="text-sm text-secondary">
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

/* ── since 0.23 ─────────────────────────────────────────────────────────── */

/**
 * 0.23: FormActions' Cancel variant and button size, and DangerConfirm's
 * held confirm — which says which guard is still open — and the guards' answers
 * handed to `onConfirm`. Synthetic data only.
 */

/* ── Signature, password & confirmation page (slug "signature-password") ── */

function DangerConfirm023Demo() {
  const [log, setLog] = useState("—");
  const [typeEmail, setTypeEmail] = useState(true);
  return (
    <>
      <Example
        label="DangerConfirm — the held confirm says why"
        hint="tick, phrase, password: the first one still open is named on the confirm"
      >
        <Stage>
          <DangerConfirm
            armLabel="Wipe everything…"
            confirmLabel="Wipe now"
            requireAcknowledge
            phrase="DELETE"
            phraseMatch="exact"
            requirePassword
            onConfirm={(_password, values) =>
              setLog(`wiped — ${JSON.stringify({ ...values, password: values.password ? "•••" : undefined })}`)
            }
          />
        </Stage>
        <StateLine>{`last = ${log}`}</StateLine>
        <Note>
          Arm it and hover or Tab to {code("Wipe now")}: while a guard is open the confirm is{" "}
          {code("aria-disabled")}, not {code("disabled")} — still focusable, with the first open guard named in its
          tooltip and description: the tick, then the phrase, then the password ({code("labels.needsAcknowledge")},{" "}
          {code("needsPhrase")}, {code("needsPassword")}). Pressing it, or Enter in a field, does nothing. A write
          lock&rsquo;s reason wins over a guard&rsquo;s; while the action runs it is plainly disabled.
        </Note>
      </Example>
      <Example
        label="DangerConfirm — onConfirm hears the typed text"
        hint="the second argument: { typed, password, acknowledged }, each only when asked"
      >
        <Stage>
          <div data-stage="wide" className="flex flex-col items-center gap-4">
            <Switch
              checked={typeEmail}
              onCheckedChange={setTypeEmail}
              label="The account holds a password-derived key (type the address)"
            />
            <div className="w-80 max-w-full">
              <DangerConfirm
                key={String(typeEmail)}
                tone="warning"
                armLabel="Reset password…"
                confirmLabel="Send reset link"
                prompt="The password of user@example.com is reset by e-mail."
                phrase={typeEmail ? "user@example.com" : undefined}
                phraseMatch="caseless"
                requireAcknowledge={!typeEmail}
                onConfirm={(_password, { typed }) =>
                  setLog(`POST ${JSON.stringify({ acknowledged: true, confirm_email: typed ?? null })}`)
                }
              />
            </div>
          </div>
        </Stage>
        <StateLine>{`last = ${log}`}</StateLine>
        <Note>
          {code("onConfirm(password, values)")}: the first argument is the password as before, so every{" "}
          {code("(password) => …")} handler keeps working; the second is what each guard was answered with.{" "}
          {code("typed")} is the text as the match rule compared it — trimmed under {code("trim")} and{" "}
          {code("caseless")}, the user&rsquo;s case kept — for a server that re-checks the address itself (try{" "}
          {code(" User@Example.com ")}).
        </Note>
      </Example>
    </>
  );
}

/* ── since 0.24 ─────────────────────────────────────────────────────────── */

/**
 * 0.24: the confirm's variant apart from `tone`, a guard of the caller's own that holds
 * the confirm without the lock's printed line, fields of the caller's inside the tile,
 * and why Cancel waits while the action runs. Synthetic data only.
 */

const PLANS = ["FREE", "PRO", "UNLIMITED"] as const;

function DangerConfirm024Demo() {
  return (
    <>
      <PlanEditorExample />
      <ConfirmVariantExample />
    </>
  );
}

/** A plan editor: the picker inside the tile, held until a different plan. */
function PlanEditorExample() {
  // The account's plan, and the one picked in the tile — seeded from it on every arm.
  const [current, setCurrent] = useState<string>("FREE");
  const [plan, setPlan] = useState(current);
  const [fail, setFail] = useState(false);
  const [log, setLog] = useState("—");
  return (
    <Example
      label="DangerConfirm — a field of the caller's and a guard of its own"
      hint="children inside the armed tile; confirmDisabledReason holds the confirm"
    >
      <Stage>
        <div data-stage="wide" className="flex flex-col items-center gap-4">
          <Switch checked={fail} onCheckedChange={setFail} label="The request fails" />
          <div className="w-96 max-w-full rounded-lg bg-surface-2 p-2">
            <DangerConfirm
              tone="warning"
              armLabel="Change plan…"
              confirmLabel="Set plan"
              prompt={
                <span className="flex gap-2">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Set the plan of user@example.com</span>
                </span>
              }
              requireAcknowledge
              confirmDisabledReason={plan === current ? "Pick a different plan" : undefined}
              onArmedChange={(armed) => {
                if (armed) setPlan(current);
              }}
              onConfirm={async () => {
                setLog(`PATCH { plan: "${plan}" } …`);
                await beat(1200);
                if (fail) {
                  setLog(`PATCH { plan: "${plan}" } → 503, still armed`);
                  throw new Error("unavailable");
                }
                setCurrent(plan);
                setLog(`PATCH { plan: "${plan}" } → 200`);
              }}
            >
              <p className="text-xs text-muted">
                {current} today — 2 budgets owned.
              </p>
              <Select
                label="Plan"
                hint="A smaller plan only stops new budgets; none are removed."
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                {PLANS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </DangerConfirm>
          </div>
        </div>
      </Stage>
      <StateLine>{`account = ${current} · picked = ${plan} · last = ${log}`}</StateLine>
      <Note>
        {code("children")} are drawn inside the armed tile, after the prompt and the consequences and before the
        tick, the phrase and the password — so the prompt is the panel&rsquo;s title again, not a line under a picker
        that sat outside. Arming focuses their first form field; Tab goes on to the tick, Cancel and the confirm.
        Without children the tile is laid out as before.
      </Note>
      <Note>
        {code("confirmDisabledReason")} holds the armed confirm like the built-in guards — {code("aria-disabled")},
        focusable, the reason in its tooltip, a press or Enter swallowed — without {code("lockedReason")}&rsquo;s line
        under the buttons, and without holding the arm button. The confirm names a write lock first, then this
        reason, then the first open built-in guard: the caller&rsquo;s field is drawn above them, and which plan has to be
        settled before ticking that you mean it.
      </Note>
      <Note>
        While {code("Set plan")} runs, Cancel is disabled on purpose: the request has left, and a Cancel that only
        collapsed the tile would say the change was called off while it lands. Turn on &ldquo;The request
        fails&rdquo; and confirm with the pointer or Space: the tile stays armed, the fields as they were, and the focus
        comes back to {code("Set plan")} for the retry.
      </Note>
    </Example>
  );
}

/** An admin password reset: the amber question, the red Go. */
function ConfirmVariantExample() {
  const [variant, setVariant] = useState<"tone" | "danger">("danger");
  const [log, setLog] = useState("—");
  return (
    <Example
      label="DangerConfirm — confirmVariant"
      hint={'tone="warning" colours the question; the confirm can stay red'}
    >
      <Stage>
        <div data-stage="wide" className="flex flex-col items-center gap-4">
          <ToggleGroup
            aria-label="Confirm variant"
            value={variant}
            onChange={(v) => setVariant(v as "tone" | "danger")}
            options={[
              { value: "tone", label: "From tone" },
              { value: "danger", label: 'confirmVariant="danger"' },
            ]}
          />
          <div className="w-96 max-w-full rounded-lg bg-surface-2 p-2">
            <DangerConfirm
              key={variant}
              tone="warning"
              confirmVariant={variant === "danger" ? "danger" : undefined}
              armLabel="Reset password…"
              confirmLabel="Send reset link"
              prompt={
                <span className="flex gap-2">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Reset the password of user@example.com?</span>
                </span>
              }
              consequences={[
                "Every session ends when the link is used.",
                "The account's two personal API tokens keep working.",
              ]}
              requireAcknowledge
              onConfirm={() => setLog("POST { acknowledged: true, confirm_email: null }")}
            />
          </div>
        </div>
      </Stage>
      <StateLine>{`last = ${log}`}</StateLine>
      <Note>
        {code("tone")} says how bad the outcome is, {code("confirmVariant")} how loud the last press is. An admin
        resetting somebody else&rsquo;s password is guarded against picking the wrong row, not against losing data — an
        amber question — and still ends in a red button. Left out, the variant follows {code("tone")} as before:{" "}
        {code("danger")} for {code('"danger"')}, {code("default")} for {code('"warning"')}.
      </Note>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** Signature, password & confirmation */
export function ConfirmDemo() {
  return (
    <>
      <DangerSpecimens />
      <DangerStates />
      <AcknowledgeAndConsequences />
      <LockedTile />
      <TypedField />
      <DangerConfirm023Demo />
      <DangerConfirm024Demo />
    </>
  );
}

/** Confirm dialog & floating panel */
export function TypedConfirmReauthDemo() {
  return (
    <>
      <TypedConfirm018Demo />
      <Reauth018Demo />
    </>
  );
}
