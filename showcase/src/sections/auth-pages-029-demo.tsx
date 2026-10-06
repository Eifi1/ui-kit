import { useState } from "react";
import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import {
  AcceptInvitation,
  AlertBanner,
  AuthLayout,
  CompanySwitcher,
  EmailVerificationBanner,
  ForgotPasswordForm,
  NotFoundPage,
  ResetPasswordForm,
  ToggleGroup,
  UiKitProvider,
  UserAvatar,
  VerifyEmailStatus,
  formatPersonName,
} from "@eifi1/ui-kit";
import type { PersonName } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.29.0 (docs/auth-harmonization.md §3.2, §5.3, §7): the signed-out pages besides
 * sign-in and sign-up, the name helpers, and the company switcher.
 *
 * Every callback here is the APP's part, played by a timer: the kit sends no request.
 * People and companies are SYNTHETIC.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const beat = (ms = 900) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** A coded refusal (§5.2) as an axios-style error, after a beat. */
const refuse = (errorCode: string, ms = 900) =>
  beat(ms).then(() => Promise.reject({ response: { data: { code: errorCode } } }));

/** The links lead back to this page: the showcase has no /login. */
const HERE = "/auth-account";

/* ── The signed-out pages ────────────────────────────────────────────────── */

type PageKey = "forgot" | "reset" | "verify" | "invite" | "notFound";

const PAGES: { value: PageKey; label: string }[] = [
  { value: "forgot", label: "Forgot password" },
  { value: "reset", label: "Reset password" },
  { value: "verify", label: "Verify email" },
  { value: "invite", label: "Invitation" },
  { value: "notFound", label: "404" },
];

/** What the app's server answers, per page — picked here to see each state. */
const ANSWERS: Record<PageKey, { value: string; label: string }[]> = {
  forgot: [
    { value: "sent", label: "Answers 204" },
    { value: "throttled", label: "Throttled" },
  ],
  reset: [
    { value: "live", label: "Live link" },
    { value: "dead", label: "Dead link" },
    { value: "stale", label: "Goes stale" },
    { value: "none", label: "No token" },
  ],
  verify: [
    { value: "ok", label: "Verifies" },
    { value: "invalid", label: "Not valid" },
    { value: "expired", label: "Expired, signed in" },
  ],
  invite: [
    { value: "signedOut", label: "Signed out" },
    { value: "ok", label: "Accepts" },
    { value: "expired", label: "Expired" },
  ],
  notFound: [
    { value: "signedOut", label: "Signed out" },
    { value: "signedIn", label: "Signed in" },
  ],
};

function PageBody({ page, answer, onRestart }: { page: PageKey; answer: string; onRestart: () => void }) {
  // Embedded in the showcase page: the layout's title is an h4 under the example's h3,
  // so the page's own heading is an h5. In an app: AuthLayout h1, the page h2 (default).
  const level = "h5" as const;
  switch (page) {
    case "forgot":
      return (
        <ForgotPasswordForm
          headingAs={level}
          signInHref={HERE}
          defaultEmail="ada@example.com"
          onSubmit={() => (answer === "throttled" ? beat().then(() => Promise.reject({ status: 429 })) : beat())}
          describeError={() => "Too many requests from this address. Try again in an hour."}
        />
      );
    case "reset":
      return (
        <ResetPasswordForm
          headingAs={level}
          token={answer === "none" ? "" : `demo-${answer}`}
          forgotHref={HERE}
          onCheck={() =>
            answer === "dead"
              ? refuse("token_invalid")
              : beat().then(() => ({
                  email: "ada@example.com",
                  notices: (
                    <AlertBanner tone="warning" size="sm">
                      The app&apos;s notice before the password is typed (keksdose: an encrypted account).
                    </AlertBanner>
                  ),
                }))
          }
          onSubmit={() =>
            answer === "stale"
              ? refuse("token_invalid")
              : beat().then(() => ({
                  email: "ada@example.com",
                  notices: <p className="text-xs text-[var(--text-muted)]">Your 2 personal access tokens were revoked.</p>,
                }))
          }
          onSignIn={onRestart}
        />
      );
    case "verify":
      return (
        <VerifyEmailStatus
          headingAs={level}
          token="demo-token"
          signedIn={answer === "expired"}
          onVerify={() => (answer === "ok" ? beat() : refuse("token_invalid"))}
          classifyError={() => (answer === "expired" ? "expired" : "invalid")}
          onResend={() => beat(600)}
          cooldown={10}
          continueHref={HERE}
          verifiedContent="The app's line: others can now share with you directly."
        />
      );
    case "invite":
      return (
        <AcceptInvitation
          headingAs={level}
          token="demo-invite"
          signedIn={answer !== "signedOut"}
          onAccept={() =>
            answer === "expired" ? refuse("invitation_expired") : beat().then(() => ({ name: "Example Property Ltd" }))
          }
          continueHref={HERE}
          signInHref={HERE}
          registerHref={HERE}
        />
      );
    case "notFound":
      return (
        <NotFoundPage
          headingAs={level}
          noIndex={false}
          homeHref={HERE}
          appHref={answer === "signedIn" ? HERE : undefined}
        />
      );
  }
}

export function AuthPages029Demo() {
  const [page, setPage] = useState<PageKey>("reset");
  const [answers, setAnswers] = useState<Record<PageKey, string>>({
    forgot: "sent",
    reset: "live",
    verify: "ok",
    invite: "ok",
    notFound: "signedOut",
  });
  // A new run of the page for every pick: the token pages ask once per mount.
  const [run, setRun] = useState(0);
  const answer = answers[page];
  return (
    <Example
      label="The signed-out pages — forgot, reset, verify, invitation, 404"
      hint="each on AuthLayout; pick what the app's server answers"
    >
      <div className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="Page"
          value={page}
          onChange={(v) => {
            setPage(v as PageKey);
            setRun((r) => r + 1);
          }}
          options={PAGES}
        />
        <ToggleGroup
          aria-label="The server answers"
          value={answer}
          onChange={(v) => {
            setAnswers((a) => ({ ...a, [page]: v }));
            setRun((r) => r + 1);
          }}
          options={ANSWERS[page]}
        />
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <AuthLayout
            key={`${page}-${answer}-${run}`}
            className="min-h-0"
            landmark={false}
            headingAs="h4"
            logo={<KeyRound />}
            title="Example App"
          >
            <PageBody page={page} answer={answer} onRestart={() => setRun((r) => r + 1)} />
          </AuthLayout>
        </div>
        <Note>
          Each page is CONTENT for {code("AuthLayout")} (the app&apos;s name as its {code("h1")}, the page&apos;s
          heading an {code("h2")}) and hands everything to callbacks: {code("onSubmit(email)")},{" "}
          {code("onCheck(token)")} then {code("onSubmit({ token, password })")}, {code("onVerify(token)")},{" "}
          {code("onAccept(token)")}. Forgot-password ends on one sentence whatever the server knows. A reset is not a
          sign-in: it ends on &ldquo;Go to sign in&rdquo; with {code("?email=")} (or {code("onSignIn(email)")}), the
          app&apos;s outcomes in {code("notices")}. The token pages ask once per token, StrictMode included, and read
          §5.2&apos;s codes ({code("token_invalid")}, {code("invitation_expired")}); {code("classifyError")} maps the
          rest. The 404 calls {code("useNoIndex()")}; this preview passes {code("noIndex={false}")}.
        </Note>
      </div>
    </Example>
  );
}

/* ── The banner ──────────────────────────────────────────────────────────── */

export function EmailVerificationBanner029Demo() {
  const [shown, setShown] = useState(true);
  const [fail, setFail] = useState(false);
  return (
    <Example label="EmailVerificationBanner — confirm your address" hint="a prompt, not a wall (§2.8)">
      <div className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="Resend answers"
          value={fail ? "fail" : "ok"}
          onChange={(v) => setFail(v === "fail")}
          options={[
            { value: "ok", label: "Resend works" },
            { value: "fail", label: "Resend fails" },
          ]}
        />
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          {shown ? (
            <EmailVerificationBanner
              onResend={() => (fail ? beat(600).then(() => Promise.reject(new Error("500"))) : beat(600))}
              cooldown={10}
              onDismiss={() => setShown(false)}
            >
              The app&apos;s sentence: until you do, nobody can share with you directly.
            </EmailVerificationBanner>
          ) : (
            <Row className="p-3">
              <button
                type="button"
                className="text-sm text-[var(--brand)] underline"
                onClick={() => setShown(true)}
              >
                Show the banner again
              </button>
            </Row>
          )}
        </div>
        <Note>
          The app renders it while {code("/auth/me")} says {code("email_verified: false")}. &ldquo;Send again&rdquo;
          waits {code("cooldown")} seconds after a mail went out (60 by default; 10 here), and says what came of it in
          the banner itself — no toast. &ldquo;Not now&rdquo; calls {code("onDismiss")}; the app stops rendering it.
        </Note>
      </div>
    </Example>
  );
}

/* ── Names ───────────────────────────────────────────────────────────────── */

const PEOPLE: { label: string; person: PersonName }[] = [
  { label: "Ada Example", person: { first: "Ada", last: "Example" } },
  { label: "李 + 小龙", person: { first: "小龙", last: "李" } },
  { label: "migrated, no last name", person: { first: "Bea Sample", last: "" } },
];

const LOCALES = ["en", "de-CH", "hu", "zh"];

export function PersonNames029Demo() {
  return (
    <Example label="formatPersonName and UserAvatar person — the reader's order" hint="§3.2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs text-[var(--text-muted)]">
              <th className="py-1 pe-3 text-start font-medium">first / last</th>
              {LOCALES.map((l) => (
                <th key={l} className="py-1 pe-3 text-start font-medium">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PEOPLE.map(({ label, person }) => (
              <tr key={label} className="border-t border-[var(--border)]">
                <td className="py-2 pe-3 text-[var(--text-muted)]">{label}</td>
                {LOCALES.map((locale) => (
                  <td key={locale} className="py-2 pe-3">
                    <UiKitProvider locale={locale}>
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <UserAvatar person={person} size="sm" />
                        {formatPersonName(person, locale)}
                      </span>
                    </UiKitProvider>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        &ldquo;First Last&rdquo; in de-CH, en, fr, it and es; &ldquo;Last First&rdquo; in hu; in zh a name in CJK
        characters runs together family-first (&ldquo;李小龙&rdquo;, initial &ldquo;李&rdquo;) and a Latin name stays
        as written. The order is the READER&apos;s — the UI locale. A migrated user (the whole old display name as the
        first name) keeps their name and initials. {code("<UserAvatar person={{ first, last }} />")} prefers the
        person over {code("name")}.
      </Note>
    </Example>
  );
}

/* ── The company switcher ────────────────────────────────────────────────── */

const COMPANIES = [
  { id: 1, name: "Example Property Ltd" },
  { id: 2, name: "Sample Estates AG" },
  { id: 3, name: "Demo Housing Co" },
];

function TopBarStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1">
      {children}
    </div>
  );
}

export function CompanySwitcher029Demo() {
  const [current, setCurrent] = useState(1);
  return (
    <Example label="CompanySwitcher — several companies, one session" hint="kastlan §5.3; on OptionSwitcherMenu">
      <div className="flex flex-col gap-3">
        <TopBarStrip>
          <CompanySwitcher
            companies={COMPANIES}
            currentId={current}
            onSwitch={(id) => beat(1200).then(() => setCurrent(id))}
          />
        </TopBarStrip>
        <p className="text-xs text-[var(--text-muted)]">
          current: {COMPANIES.find((c) => c.id === current)?.name}
        </p>
        <p className="text-xs text-[var(--text-muted)]">One company — the switcher renders nothing:</p>
        <TopBarStrip>
          <CompanySwitcher companies={[COMPANIES[0]!]} currentId={1} onSwitch={() => {}} />
          <span className="text-xs text-[var(--text-muted)]">(nothing before this)</span>
        </TopBarStrip>
        <Note>
          {code("onSwitch(id)")} is the app&apos;s {code("POST /auth/switch-company")}: while its promise runs the
          trigger is disabled with a spinner and &ldquo;Switching company…&rdquo; is said. The labels rename it for
          another context (keksdose&apos;s budgets), and {code("icon")} replaces the building.
        </Note>
      </div>
    </Example>
  );
}
