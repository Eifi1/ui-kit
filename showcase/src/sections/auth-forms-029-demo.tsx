import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { AlertBanner, AuthLayout, Button, Input, Switch, UiKitProvider } from "@eifi1/ui-kit";
import type { KitLanguageCode, KitLinkComponent } from "@eifi1/ui-kit";
import { SignInForm } from "../../../src/auth/sign-in-form";
import type { SignInAnswer } from "../../../src/auth/sign-in-form";
import { RegisterForm } from "../../../src/auth/register-form";
import type { RegisterValues } from "../../../src/auth/register-form";
import { CompleteNameDialog } from "../../../src/auth/complete-name-dialog";
import { authErrorCode, isAuthError } from "../../../src/auth/auth-errors";
import { taggedEmail } from "../../../src/auth/email-tag";
import { Example, Note, OutTable } from "../lib/section";

/**
 * SIGN-IN AND SIGN-UP (0.29, docs/auth-harmonization.md §4–§5, §8): the forms every app
 * puts on `/login` and `/register`, and the dialog that completes a migrated name. The
 * forms never send a request — here a pretend server answers, with synthetic people
 * only. Belongs on the "Sign-in & account security" page (`auth-account`).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const beat = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
const masked = (password: string) => "•".repeat(Math.min(password.length, 12));

/** What a coded refusal looks like coming out of axios — the shape the apps' clients
 *  throw, and the one `isAuthError` reads. */
const refusal = (status: number, code: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { detail: code, code } },
  });

/** The links of the forms, played by this page: a click is logged instead of leaving
 *  the showcase. An app passes its router link once, on its own provider. */
function usePreviewLink(log: (line: string) => void): KitLinkComponent {
  return useMemo<KitLinkComponent>(
    () =>
      function PreviewLink({ href, onClick, children, replace: _replace, ...rest }) {
        return (
          <a
            href={href}
            {...rest}
            onClick={(event) => {
              onClick?.(event);
              if (href.startsWith("mailto:")) return;
              event.preventDefault();
              log(`link → ${href}`);
            }}
          >
            {children}
          </a>
        );
      },
    [log],
  );
}

function Readout({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--bg-surface-2)] p-2 font-mono text-xs text-[var(--text-secondary)]">
      {lines.length ? lines.join("\n") : "—"}
    </pre>
  );
}

/** A fixed-height box with its own scroll; `min-h-full` replaces the layout's
 *  `min-h-dvh`, so the frame fills the box rather than the window. */
function Frame({ height, children }: { height: string; children: ReactNode }) {
  return <div className={`${height} overflow-auto rounded-md border border-[var(--border)]`}>{children}</div>;
}

/* ── SignInForm ──────────────────────────────────────────────────────────── */

const PASSWORD = "correct horse";

/** Pretend `/auth/login`: keksdose's three answers, mapped to the kit's. */
async function pretendLogin(email: string, password: string): Promise<SignInAnswer> {
  await beat();
  // A deactivated account answers exactly like a wrong password (§2.10).
  if (password !== PASSWORD || email === "lin@example.com") throw refusal(401, "invalid_credentials");
  if (email === "ada@example.com") return { kind: "signed-in" };
  if (email === "grace@example.com") return { kind: "2fa", challengeToken: "challenge-grace" };
  if (email === "alan@example.com")
    return { kind: "password-change", challengeToken: "challenge-alan", extra: { encrypted: true } };
  throw refusal(401, "invalid_credentials");
}

export function SignInForm029Demo() {
  const [lines, setLines] = useState<string[]>([]);
  const [run, setRun] = useState(0);
  const [title, setTitle] = useState("Sign in");
  const log = useCallback((line: string) => setLines((l) => [...l.slice(-7), line]), []);
  const link = usePreviewLink(log);

  const answered = async (call: string, answer: Promise<SignInAnswer>) => {
    try {
      const value = await answer;
      log(`${call} → ${JSON.stringify(value)}`);
      if (value.kind === "signed-in") log("signed in — the app navigates now");
      return value;
    } catch (error) {
      log(`${call} → rejected (${authErrorCode(error) ?? "no code"})`);
      throw error;
    }
  };

  return (
    <Example
      label="SignInForm — credentials, passkey, second factor, a new password"
      hint="callbacks only; the pretend server answers with keksdose's shapes"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setRun((n) => n + 1);
            setTitle("Sign in");
            setLines([]);
          }}
        >
          Start again
        </Button>
      </div>
      <Frame height="h-[36rem]">
        <UiKitProvider linkComponent={link}>
          <AuthLayout
            className="min-h-full"
            landmark={false}
            headingAs="h4"
            logo={<KeyRound />}
            title={title}
            description="Example App"
          >
            <SignInForm
              key={run}
              headingAs="h5"
              emailTag="exampleapp"
              deactivatedContact="support@example.com"
              forgotHref="/forgot-password"
              registerHref="/register"
              onStepChange={(step) => setTitle(step === "credentials" ? "Sign in" : "Almost there")}
              onSubmit={({ email, password }) =>
                answered(`onSubmit({ email: "${email}", password: "${masked(password)}" })`, pretendLogin(email, password))
              }
              onCode={({ challengeToken, code: digits }) =>
                answered(
                  `onCode({ challengeToken: "${challengeToken}", code: "${digits}" })`,
                  beat().then((): SignInAnswer => {
                    if (digits === "000000") throw refusal(401, "token_invalid");
                    if (digits !== "123456") throw refusal(401, "x");
                    return { kind: "signed-in" };
                  }),
                )
              }
              onSetPassword={({ challengeToken, password }) =>
                answered(
                  `onSetPassword({ challengeToken: "${challengeToken}", password: "${masked(password)}" })`,
                  beat().then((): SignInAnswer => ({ kind: "signed-in" })),
                )
              }
              onPasskey={() =>
                answered("onPasskey()", beat().then((): SignInAnswer => ({ kind: "2fa", challengeToken: "challenge-passkey" })))
              }
              passwordChangeContent={(extra) =>
                extra?.encrypted ? (
                  <AlertBanner tone="warning" size="sm">
                    Your encrypted data is untouched: it still opens with your encryption passphrase.
                  </AlertBanner>
                ) : null
              }
            />
          </AuthLayout>
        </UiKitProvider>
      </Frame>
      <Readout lines={lines} />
      <Note>
        Every password is {code(`"${PASSWORD}"`)}. {code("ada@example.com")} signs in; {code("grace@example.com")} gets
        the second factor (code {code("123456")}; {code("000000")} plays an expired challenge, which goes back to the
        credentials); {code("alan@example.com")} must choose a new password, and the challenge&apos;s{" "}
        {code("extra.encrypted")} shows keksdose&apos;s note through {code("passwordChangeContent")};{" "}
        {code("lin@example.com")} is deactivated and gets the same {code("invalid_credentials")} as a wrong password,
        with the two hints under it — {code("deactivatedContact")} and the {code("emailTag")} one. The passkey button
        asks for no email. In an app, {code("onSubmit")} maps {code("{requires_2fa, challenge_token}")} to{" "}
        {code('{ kind: "2fa", challengeToken }')} and {code("{requires_password_change, challenge_token, encrypted}")}{" "}
        to {code('{ kind: "password-change", challengeToken, extra: { encrypted } }')}, stores the tokens before
        resolving {code('{ kind: "signed-in" }')}, and lets a refusal reject.
      </Note>
    </Example>
  );
}

/* ── RegisterForm ────────────────────────────────────────────────────────── */

export function RegisterForm029Demo() {
  const [lines, setLines] = useState<string[]>([]);
  const [invited, setInvited] = useState(false);
  const [company, setCompany] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [language, setLanguage] = useState<string>("en");
  const [run, setRun] = useState(0);
  const log = useCallback((line: string) => setLines((l) => [...l.slice(-5), line]), []);
  const link = usePreviewLink(log);

  // kastlan: Company is required unless an invitation names the company (§2.11).
  const companyRequired = company && !invited;

  const submit = async (values: RegisterValues) => {
    log(`onSubmit(${JSON.stringify({ ...values, password: masked(values.password) })})`);
    await beat();
    if (values.email === "taken@example.com") throw refusal(409, "email_taken");
    if (values.email === "closed@example.com") throw refusal(403, "registration_closed");
    log("201 — signed in, the app navigates now");
  };

  return (
    <Example
      label="RegisterForm — names, the address tag, the app's fields, the terms"
      hint="the submit waits for a complete form; the tag is offered, never applied"
    >
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <Switch
          label="From an invitation"
          description="invitedEmail: the address is fixed"
          checked={invited}
          onCheckedChange={(on) => {
            setInvited(on);
            setRun((n) => n + 1);
          }}
        />
        <Switch
          label="kastlan's Company field"
          description="appFields + appFieldsComplete"
          checked={company}
          onCheckedChange={setCompany}
        />
      </div>
      <Frame height="h-[44rem]">
        <UiKitProvider linkComponent={link}>
          <AuthLayout
            className="min-h-full"
            landmark={false}
            headingAs="h4"
            logo={<KeyRound />}
            title="Create account"
            description="Example App"
          >
            <RegisterForm
              key={run}
              emailTag="exampleapp"
              invitedEmail={invited ? "lin@example.com" : undefined}
              locale={language}
              onLocaleChange={(next: KitLanguageCode) => setLanguage(next)}
              signInHref="/login"
              onSubmit={submit}
              aboveForm={
                invited ? undefined : (
                  <AlertBanner tone="warning" size="sm">
                    Example App is in closed beta. New accounts are by invitation only.
                  </AlertBanner>
                )
              }
              appFields={
                company && !invited ? (
                  <Input
                    label="Company"
                    autoComplete="organization"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                ) : undefined
              }
              appFieldsComplete={!companyRequired || companyName.trim() !== ""}
              afterFields={
                <p className="text-xs text-[var(--text-muted)]">
                  Your data is stored unencrypted by default; you can switch on end-to-end encryption later in Settings.
                </p>
              }
            />
          </AuthLayout>
        </UiKitProvider>
      </Frame>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        The app&apos;s language (bound to the field, no copy in the form): {code(language)}
      </p>
      <Readout lines={lines} />
      <Note>
        Type an address and the form offers {code("you+exampleapp@…")} as one click — never applied on its own (§4.5).
        {code("taken@example.com")} answers {code("email_taken")} under the field; {code("closed@example.com")} answers{" "}
        {code("registration_closed")} above the button. With an invitation the address is fixed, the invitee may still
        take its tagged form and go back, and kastlan&apos;s Company disappears: the invitation names the company. The
        language field is controlled by the app ({code("locale")} + {code("onLocaleChange")}), so it can be the
        app&apos;s own language switch; {code("languageField")} replaces it with the app&apos;s control.
      </Note>
    </Example>
  );
}

/* ── CompleteNameDialog ──────────────────────────────────────────────────── */

export function CompleteName029Demo() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const log = (line: string) => setLines((l) => [...l.slice(-5), line]);
  return (
    <Example
      label="CompleteNameDialog — a migrated name, asked once after sign-in"
      hint="“Later” only defers it to the next sign-in"
    >
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Sign in as a migrated user
      </Button>
      {open && (
        <CompleteNameDialog
          firstName="Ada Example"
          lastName=""
          onSave={async (values) => {
            log(`onSave(${JSON.stringify(values)})`);
            await beat();
            if (values.lastName === "Fail") throw new Error("500");
          }}
          onClose={(saved) => {
            setOpen(false);
            log(`onClose(${saved})${saved ? "" : " — asked again at the next sign-in"}`);
          }}
        />
      )}
      <Readout lines={lines} />
      <Note>
        A keksdose or Kurvenschmiede account&apos;s old display name moved whole into the first name (§3.3); the app
        shows this while {code("/auth/me")} answers {code("name_incomplete: true")}, never for a demo user. A last name
        of {code("Fail")} plays a failed save: the dialog stays open with the names.
      </Note>
    </Example>
  );
}

/* ── The helpers ─────────────────────────────────────────────────────────── */

export function AuthHelpers029Demo() {
  const unauthorised = refusal(401, "invalid_credentials");
  const network = Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });
  return (
    <Example label="taggedEmail and isAuthError" hint="for an app's own fields and its own error handling">
      <OutTable
        rows={[
          ['taggedEmail("ada@example.com", "kastlan")', String(taggedEmail("ada@example.com", "kastlan"))],
          ['taggedEmail("ada+bank@example.com", "kastlan")', String(taggedEmail("ada+bank@example.com", "kastlan"))],
          ['taggedEmail("ada@example", "kastlan")', String(taggedEmail("ada@example", "kastlan"))],
          ['isAuthError(axios 401 {code: "invalid_credentials"})', String(isAuthError(unauthorised))],
          ['isAuthError(axios 401 …, "email_taken")', String(isAuthError(unauthorised, "email_taken"))],
          ['authErrorCode(axios "ERR_NETWORK")', String(authErrorCode(network))],
        ]}
      />
      <Note>
        {code("taggedEmail")} is what {code("RegisterForm")}&apos;s offer uses — for a later email change in the
        profile, never for a field holding someone else&apos;s address. {code("isAuthError")} reads {code("code")} from{" "}
        {code("err.response.data")} (axios), {code("err.data")}, {code("err.body")} or the error itself, FastAPI&apos;s{" "}
        {code("detail.code")} included, and never takes axios&apos; own {code("err.code")} for a refusal.
      </Note>
    </Example>
  );
}

/** The four, in page order. */
export function AuthForms029Demo() {
  return (
    <>
      <SignInForm029Demo />
      <RegisterForm029Demo />
      <CompleteName029Demo />
      <AuthHelpers029Demo />
    </>
  );
}
