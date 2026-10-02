import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Checkbox, DangerConfirm, FormActions, Switch } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

/**
 * 0.23: FormActions' Cancel variant and button size (keksdose G3), and DangerConfirm's
 * held confirm — which says which guard is still open (G4a) — and the guards' answers
 * handed to `onConfirm` (G4b). Synthetic data only.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/** The raw value under a specimen, so what the component emits is visible. */
function StateLine({ children }: { children: string }) {
  return <p className="mt-2 font-mono text-xs break-all text-[var(--text-muted)]">{children}</p>;
}

/* ── Forms page (slug "forms") ──────────────────────────────────────────── */

/** A dense inline confirm under a table row, as keksdose's admin plan row draws it. */
export function FormActions023Demo() {
  const [small, setSmall] = useState(true);
  const [ticked, setTicked] = useState(false);
  const [log, setLog] = useState("—");
  return (
    <Example
      label="FormActions — size and cancelVariant"
      hint="a dense row: small buttons, a ghost Cancel, under a table row"
    >
      <Stage>
        <div data-stage="wide" className="flex flex-col items-center gap-4">
          <Switch checked={small} onCheckedChange={setSmall} label={'size="sm" and cancelVariant="ghost"'} />
          <div className="w-full max-w-md space-y-2 rounded-lg bg-[var(--bg-surface-2)] p-2">
            <div className="flex gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>Move user@example.com onto the PRO plan</span>
            </div>
            <Checkbox
              label="I have read what this does and want to continue."
              checked={ticked}
              onCheckedChange={setTicked}
            />
            <FormActions
              className="pt-0"
              align="start"
              size={small ? "sm" : undefined}
              cancelVariant={small ? "ghost" : undefined}
              onCancel={() => {
                setTicked(false);
                setLog("cancelled");
              }}
              onSubmit={() => setLog("plan set to PRO")}
              submitLabel="Set plan"
              submitVariant="primary"
              submitDisabled={!ticked}
              submitDisabledReason={ticked ? undefined : "Tick the box first"}
            />
          </div>
        </div>
      </Stage>
      <StateLine>{`last = ${log}`}</StateLine>
      <Note>
        {code('size="sm"')} sizes every button the row draws — Save, Cancel and a {code("{ label, onClick }")}{" "}
        {code("destructive")} — with the spinner and {code("submitIcon")} shrinking along. {code("children")} and an
        element you pass are yours to size. {code("cancelVariant")} defaults to {code("secondary")}, the outline it
        always had; {code("ghost")} steps Cancel back in a row that should read as one quiet line. Both default to
        what they were, so no row changes on the bump.
      </Note>
    </Example>
  );
}

/* ── Signature, password & confirmation page (slug "signature-password") ── */

export function DangerConfirm023Demo() {
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
