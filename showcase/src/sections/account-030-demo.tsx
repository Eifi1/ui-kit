import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { AuthLayout, Button, ProfileSetting, SignInForm, Switch, ToggleGroup } from "@eifi1/ui-kit";
import type { SignInAnswer } from "@eifi1/ui-kit";
import { EmailChangeSetting } from "../../../src/account/email-change-setting";
import { SessionsSetting } from "../../../src/account/sessions-setting";
import type { SessionItem } from "../../../src/account/sessions-setting";
import { DeleteAccountSetting } from "../../../src/account/delete-account-setting";
import type { DeletionMode } from "../../../src/account/delete-account-setting";
import { DataExportSetting } from "../../../src/account/data-export-setting";
import { isRateLimited } from "../../../src/auth/auth-errors";
import { Example, Note } from "../lib/section";

/**
 * THE ACCOUNT'S OWN SETTINGS (0.30, docs/user-admin-harmonization.md §6): first and last
 * name, the email change with its confirmation link, "sign out everywhere" and kastlan's
 * device list, deleting the account in either mode, and the data export — plus the
 * sign-in extras from the apps' 0.29 adoption (a backup code on the 2FA step, the
 * challenge token in its slot, "too many attempts"). Every part takes callbacks; here a
 * pretend server answers, with synthetic people only. Belongs on the "Sign-in & account
 * security" page (`auth-account`).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const beat = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
const PASSWORD = "correct horse";

/** What a coded refusal looks like coming out of axios — the shape the apps' clients
 *  throw, and the one the parts read. */
const refusal = (status: number, refusalCode?: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { detail: refusalCode ?? "refused", ...(refusalCode && { code: refusalCode }) } },
  });

function useLog() {
  const [lines, setLines] = useState<string[]>([]);
  const log = useCallback((line: string) => setLines((l) => [...l.slice(-5), line]), []);
  return { lines, log, clear: () => setLines([]) };
}

function Readout({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--bg-surface-2)] p-2 font-mono text-xs text-[var(--text-secondary)]">
      {lines.length ? lines.join("\n") : "—"}
    </pre>
  );
}

/** The width of a settings column; a phone is narrower still, which the cards allow. */
function Column({ children }: { children: ReactNode }) {
  return <div className="max-w-md space-y-3">{children}</div>;
}

/* ── ProfileSetting, first and last ─────────────────────────────────────── */

export function ProfileNames030Demo() {
  const [saved, setSaved] = useState<{ first: string; last: string | null }>({ first: "Ada Example", last: null });
  const { lines, log } = useLog();
  return (
    <Example
      label="ProfileSetting — first and last name"
      hint="firstName / lastName / onSave(values); the single-name API is unchanged"
    >
      <Column>
        <ProfileSetting
          email="ada@example.com"
          memberSince="5 Oct 2026"
          firstName={saved.first}
          lastName={saved.last}
          onSave={async (values) => {
            log(`onSave(${JSON.stringify(values)})`);
            await beat();
            setSaved({ first: values.firstName, last: values.lastName });
          }}
        />
      </Column>
      <Readout lines={lines} />
      <Note>
        A migrated account: the whole old display name in {code("firstName")}, no {code("lastName")} — Save holds
        and says why until both are filled in. Once the pretend save comes back with the new names, the drafts
        follow them and Save turns off. Without {code("firstName")} / {code("lastName")} the card is the single{" "}
        {code("value")} / {code("onChange")} field it was.
      </Note>
    </Example>
  );
}

/* ── EmailChangeSetting ─────────────────────────────────────────────────── */

export function EmailChange030Demo() {
  const [current, setCurrent] = useState("ada@example.com");
  const [pending, setPending] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const { lines, log } = useLog();
  return (
    <Example label="EmailChangeSetting — request, pending, confirmed" hint="the new address confirms before it counts">
      <Column>
        <EmailChangeSetting
          currentEmail={current}
          pendingEmail={pending}
          confirmed={confirmed}
          emailTag="exampleapp"
          onRequest={async ({ newEmail, password }) => {
            log(`onRequest({ newEmail: "${newEmail}", password: "•••" })`);
            await beat();
            if (password !== PASSWORD) throw refusal(400, "password_incorrect");
            if (newEmail === "grace@example.com") throw refusal(409, "email_taken");
            if (newEmail === "slow@example.com") throw refusal(429);
            setConfirmed(false);
            setPending(newEmail);
          }}
          onResend={async () => {
            log("onResend()");
            await beat();
          }}
          onCancel={async () => {
            log("onCancel()");
            await beat();
            setPending(null);
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={pending === null}
          onClick={() => {
            if (pending === null) return;
            log(`(the person opens the link in ${pending})`);
            setCurrent(pending);
            setPending(null);
            setConfirmed(true);
          }}
        >
          Open the link (pretend)
        </Button>
      </Column>
      <Readout lines={lines} />
      <Note>
        The password is {code(`"${PASSWORD}"`)} (another is {code("400 password_incorrect")}, under the field).{" "}
        {code("grace@example.com")} is taken ({code("email_taken")} under the field); {code("slow@example.com")}{" "}
        plays a throttle (429). A request ends on &quot;Confirm the link we
        sent to …&quot;, from the app&apos;s {code("pendingEmail")}; &quot;Open the link&quot; plays the confirm
        route coming back with {code("confirmed")}, and the done state says a passkey keeps its old label.
      </Note>
    </Example>
  );
}

/* ── SessionsSetting ────────────────────────────────────────────────────── */

const NOW = Date.now();
const DEVICES: SessionItem<string>[] = [
  { id: "a", device: "Firefox on Windows", ip: "192.0.2.10", lastActiveAt: NOW - 60_000, current: true },
  { id: "b", device: "Safari on iPhone", ip: "198.51.100.7", lastActiveAt: NOW - 5 * 3_600_000 },
  { id: "c", device: "Chrome on macOS", ip: "2001:db8::42", lastActiveAt: NOW - 12 * 86_400_000 },
];

export function Sessions030Demo() {
  const [withList, setWithList] = useState(true);
  const [sessions, setSessions] = useState(DEVICES);
  const { lines, log } = useLog();
  return (
    <Example label="SessionsSetting — sign out everywhere, and kastlan's device list" hint="this device signs out too">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Switch checked={withList} onCheckedChange={setWithList} label="Sessions stored (kastlan)" />
        <Button size="sm" variant="secondary" onClick={() => setSessions(DEVICES)}>
          Reset the list
        </Button>
      </div>
      <Column>
        <SessionsSetting
          sessions={withList ? sessions : undefined}
          onRevoke={
            withList
              ? async (id) => {
                  log(`onRevoke("${id}")`);
                  await beat();
                  setSessions((rows) => rows.filter((row) => row.id !== id));
                }
              : undefined
          }
          onSignOutEverywhere={async () => {
            log("onSignOutEverywhere() — the app signs this page out next");
            await beat();
          }}
        />
      </Column>
      <Readout lines={lines} />
    </Example>
  );
}

/* ── DeleteAccountSetting ───────────────────────────────────────────────── */

export function DeleteAccount030Demo() {
  const [mode, setMode] = useState<DeletionMode>("after_days");
  const [handOver, setHandOver] = useState(false);
  const [lastAdmin, setLastAdmin] = useState(false);
  const [run, setRun] = useState(0);
  const { lines, log } = useLog();
  return (
    <Example label="DeleteAccountSetting — deactivated now, erased later" hint="typed address + password; coded refusals">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <ToggleGroup<DeletionMode>
          ariaLabel="mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "after_days", label: "after_days (30)" },
            { value: "operator", label: "operator" },
          ]}
        />
        <Switch checked={handOver} onCheckedChange={setHandOver} label="Owns shared work" />
        <Switch checked={lastAdmin} onCheckedChange={setLastAdmin} label="Last admin" />
        <Button size="sm" variant="secondary" onClick={() => setRun((n) => n + 1)}>
          Start again
        </Button>
      </div>
      <Column>
        <DeleteAccountSetting
          key={run}
          email="ada@example.com"
          mode={mode}
          handOverCount={handOver ? 3 : undefined}
          consequences={["Your 2 budgets are deleted with their shares.", "Their 3 guests are told today."]}
          onRequest={async ({ password, confirmEmail }) => {
            log(`onRequest({ password: "•••", confirmEmail: "${confirmEmail}" })`);
            await beat();
            if (password !== PASSWORD) throw refusal(400, "password_incorrect");
            if (lastAdmin && mode === "operator")
              throw Object.assign(refusal(409, "last_admin"), {
                response: { status: 409, data: { detail: "x", code: "last_admin", companies: ["Example AG"] } },
              });
            if (lastAdmin) throw refusal(409, "last_admin");
            log("accepted — the app signs the user out now");
          }}
        />
      </Column>
      <Readout lines={lines} />
      <Note>
        The password is {code(`"${PASSWORD}"`)}; the address is compared in any case. The mode&apos;s sentence sits
        under the title, read before anything is pressed. &quot;Owns shared work&quot; adds Kurvenschmiede&apos;s
        hand-over line ({code("handOverCount")}); &quot;Last admin&quot; answers {code("409 {code: \"last_admin\"}")}
        — in the operator mode with kastlan&apos;s {code("companies")}, which the sentence names. A wrong password
        is server-kit&apos;s {code("400 password_incorrect")}, said under the field.
      </Note>
    </Example>
  );
}

/* ── DataExportSetting ──────────────────────────────────────────────────── */

export function DataExport030Demo() {
  const [throttled, setThrottled] = useState(false);
  const { lines, log } = useLog();
  return (
    <Example label="DataExportSetting — a JSON download" hint="onExport resolves with a Blob; the kit saves it">
      <div className="mb-3">
        <Switch checked={throttled} onCheckedChange={setThrottled} label="Exported a moment ago (429)" />
      </div>
      <Column>
        <DataExportSetting
          description="Your account; your company’s records are your company’s, ask them."
          onExport={async () => {
            log("onExport()");
            await beat();
            if (throttled) throw refusal(429);
            const envelope = {
              format: "eifi1-account-export",
              version: 1,
              app: "exampleapp",
              exported_at: new Date().toISOString(),
              account: { email: "ada@example.com", first_name: "Ada", last_name: "Example" },
              data: {},
            };
            return new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
          }}
        />
      </Column>
      <Readout lines={lines} />
    </Example>
  );
}

/* ── SignInForm: a backup code, the token in the slot, a throttle ───────── */

export function SignInExtras030Demo() {
  const { lines, log, clear } = useLog();
  const [run, setRun] = useState(0);
  const answer = async (call: string, result: Promise<SignInAnswer>) => {
    try {
      const value = await result;
      log(`${call} → ${JSON.stringify(value)}`);
      return value;
    } catch (error) {
      log(`${call} → rejected${isRateLimited(error) ? " (429)" : ""}`);
      throw error;
    }
  };
  return (
    <Example label="SignInForm — a backup code, and 'too many attempts'" hint="recoveryCode, twoFactorContent(token), 429">
      <div className="mb-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setRun((n) => n + 1);
            clear();
          }}
        >
          Start again
        </Button>
      </div>
      <div className="h-[34rem] overflow-auto rounded-md border border-[var(--border)]">
        <AuthLayout className="min-h-full" landmark={false} headingAs="h4" logo={<KeyRound />} title="Sign in">
          <SignInForm
            key={run}
            headingAs="h5"
            recoveryCode
            twoFactorContent={(token) => <p className="text-xs text-[var(--text-muted)]">Challenge: {code(token)}</p>}
            onSubmit={({ email, password }) =>
              answer(
                `onSubmit({ email: "${email}" })`,
                beat().then((): SignInAnswer => {
                  // keksdose's shape: uncoded, with the wait in a Retry-After header.
                  if (email === "slow@example.com")
                    throw Object.assign(refusal(429), {
                      response: { status: 429, headers: { "retry-after": "30" }, data: { detail: "Too many requests" } },
                    });
                  if (email === "busy@example.com") throw refusal(429);
                  if (password !== PASSWORD) throw refusal(401, "invalid_credentials");
                  return { kind: "2fa", challengeToken: "challenge-grace" };
                }),
              )
            }
            onCode={({ challengeToken, code: typed, kind }) =>
              answer(
                `onCode({ challengeToken: "${challengeToken}", code: "${typed}"${kind ? `, kind: "${kind}"` : ""} })`,
                beat().then((): SignInAnswer => {
                  const ok = kind === "recovery" ? typed.replace(/[^a-z0-9]/gi, "").toUpperCase() === "ABCDEFGHJKLMNPQR" : typed === "123456";
                  if (!ok) throw refusal(401);
                  return { kind: "signed-in" };
                }),
              )
            }
            onSetPassword={() => answer("onSetPassword()", beat().then((): SignInAnswer => ({ kind: "signed-in" })))}
          />
        </AuthLayout>
      </div>
      <Readout lines={lines} />
      <Note>
        {code("grace@example.com")} with {code(`"${PASSWORD}"`)} reaches the second factor: {code("123456")}, or
        &quot;Use a backup code&quot; and {code("ABCD-EFGH-JKLM-NPQR")} (any case, dashes optional) — posted with{" "}
        {code('kind: "recovery"')}. The line under the intro is {code("twoFactorContent")} as a function of the
        challenge token. {code("slow@example.com")} answers 429 with {code("Retry-After: 30")}: &quot;Too many
        attempts. Try again in 30 s.&quot; ({code("retryAfterSeconds")}); {code("busy@example.com")} a bare 429:
        &quot;… Wait a moment and try again.&quot; — no {code("describeError")} needed for either.
      </Note>
    </Example>
  );
}

export function Account030Demo() {
  return (
    <>
      <ProfileNames030Demo />
      <EmailChange030Demo />
      <Sessions030Demo />
      <DeleteAccount030Demo />
      <DataExport030Demo />
      <SignInExtras030Demo />
    </>
  );
}
