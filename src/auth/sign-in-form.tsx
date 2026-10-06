import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, FormEvent, ReactNode } from "react";
import { KeyRound } from "lucide-react";

import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { AlertBanner } from "../components/alert-banner";
import { hasMessage } from "../components/choice-parts";
import { CurrentPasswordInput } from "../components/danger-confirm";
import { OneTimeCodeInput } from "../components/one-time-code-input";
import { TextLink } from "../components/text-link";
import { Button, Input } from "../components/ui";
import { authErrorCode } from "./auth-errors";
import type { AuthErrorCode } from "./auth-errors";
import { taggedEmail } from "./email-tag";
import { newPasswordProblem } from "./form-rules";
import { NewPasswordFields } from "./new-password-fields";

/* ── The answers (§5.1) ──────────────────────────────────────────────────── */

/**
 * What a sign-in call answers, in the kit's words — docs/auth-harmonization.md §5.1,
 * keksdose's three shapes. The app maps its own HTTP answer to one of these and resolves
 * with it; a refusal REJECTS (with whatever its client throws — {@link authErrorCode}
 * reads the code out of it).
 *
 * | the server answers (keksdose) | resolve with |
 * |---|---|
 * | `TokenResponse` `{access_token, refresh_token, token_type, user}` | `{ kind: "signed-in" }`, after the app has stored the session |
 * | `{requires_2fa: true, challenge_token}` | `{ kind: "2fa", challengeToken: challenge_token }` |
 * | `{requires_password_change: true, challenge_token, encrypted}` | `{ kind: "password-change", challengeToken: challenge_token, extra: { encrypted } }` |
 * | `401 {code: "invalid_credentials"}` | reject — let the client's error through |
 *
 * ```ts
 * async function toAnswer(res: TokenResponse | TwoFactorChallenge | PasswordChangeChallenge): Promise<SignInAnswer> {
 *   if ("requires_2fa" in res) return { kind: "2fa", challengeToken: res.challenge_token };
 *   if ("requires_password_change" in res)
 *     return { kind: "password-change", challengeToken: res.challenge_token, extra: { encrypted: res.encrypted } };
 *   await onLoginSuccess(res); // store tokens, load /auth/me, switch language
 *   return { kind: "signed-in" };
 * }
 * <SignInForm onSubmit={async (v) => toAnswer(await authApi.login(v))} … />
 * ```
 *
 * The same mapping serves `/auth/login/2fa`, `/auth/login/set-password` and the passkey
 * finish, which answer the same union.
 */
export type SignInAnswer =
  | { kind: "signed-in" }
  | { kind: "2fa"; challengeToken: string }
  | {
      kind: "password-change";
      challengeToken: string;
      /** The challenge's app fields, passed through untouched — keksdose's `encrypted`,
       *  which its note on this step reads (`passwordChangeContent`). */
      extra?: Readonly<Record<string, unknown>>;
    };

/** The step on screen: the credentials, the second factor, or a new password. */
export type SignInStep = "credentials" | "2fa" | "password-change";

/** What the person did when a call failed — {@link SignInFormProps.describeError}'s
 *  second argument. */
export type SignInAction = "password" | "passkey" | "code" | "set-password";

export interface SignInCredentials {
  /** Trimmed. Lower-casing is the server's (§3.1). */
  email: string;
  /** As typed, never trimmed. */
  password: string;
}

export interface SignInCodeValues {
  challengeToken: string;
  /** Digits only — {@link OneTimeCodeInput} drops the spaces of "123 456". */
  code: string;
}

export interface SignInNewPasswordValues {
  challengeToken: string;
  password: string;
}

/* ── Labels ──────────────────────────────────────────────────────────────── */

/**
 * Every string `SignInForm` renders — the `signIn` namespace of `<UiKitProvider
 * labels>`, overridable per instance through `labels`. keksdose's words where it has
 * them (`auth.*` in its catalogue).
 */
export interface SignInLabels {
  email: string;
  password: string;
  /** The submit button. */
  submit: string;
  /** The passkey button (`onPasskey`). */
  passkey: string;
  /** The link to `forgotHref`. */
  forgotPassword: string;
  /** Before the link to `registerHref`. */
  noAccount: string;
  /** The link to `registerHref`. */
  register: string;
  /** The ONE answer to an unknown address, a wrong password and a deactivated account
   *  (`invalid_credentials`, §5.2). */
  invalidCredentials: string;
  /** Any other failed sign-in (the network, a 500). */
  failed: string;
  /** A failed or refused passkey sign-in. */
  passkeyFailed: string;
  /**
   * The hint under `invalidCredentials` (§2.10), shown when `deactivatedContact` is
   * given. A TEMPLATE: `{contact}` is replaced by the contact — a `mailto:` link for an
   * address — so a language puts it where its grammar needs it.
   */
  deactivatedHint: string;
  /** The hint under `invalidCredentials` when `emailTag` is given (§4.5), given the
   *  typed address with the app's tag: "Signed up with ada+kastlan@example.com?". */
  tagHint: (taggedAddress: string) => string;
  /** The second-factor step's heading. */
  twoFactorTitle: string;
  twoFactorIntro: string;
  /** The code field's label. */
  code: string;
  /** The code step's submit button. */
  verify: string;
  /** The code was refused. */
  codeInvalid: string;
  /** The set-a-new-password step's heading. */
  setPasswordTitle: string;
  setPasswordIntro: string;
  newPassword: string;
  confirmPassword: string;
  passwordMismatch: string;
  /** The set-a-new-password step's submit button. */
  setPasswordSubmit: string;
  setPasswordFailed: string;
  /** A challenge was refused as `token_invalid` — it expired between the steps; the
   *  form is back on the credentials. */
  expired: string;
  /** From the second and third step back to the credentials. */
  backToSignIn: string;
}

export const DEFAULT_SIGN_IN_LABELS: SignInLabels = {
  email: "Email",
  password: "Password",
  submit: "Sign in",
  passkey: "Sign in with a passkey",
  forgotPassword: "Forgot your password?",
  noAccount: "No account yet?",
  register: "Create account",
  invalidCredentials: "The email or password is incorrect.",
  failed: "Sign-in failed. Please try again.",
  passkeyFailed: "Passkey sign-in failed.",
  deactivatedHint: "Account deactivated? Write to {contact}.",
  tagHint: (taggedAddress) => `Signed up with ${taggedAddress}? Use that address.`,
  twoFactorTitle: "Two-factor authentication",
  twoFactorIntro: "Enter the code your authenticator app shows.",
  code: "2FA code",
  verify: "Verify",
  codeInvalid: "Invalid 2FA code.",
  setPasswordTitle: "Choose a new password",
  setPasswordIntro: "A new password was requested for this account. Choose one and you are straight back in.",
  newPassword: "New password",
  confirmPassword: "Repeat new password",
  passwordMismatch: "The passwords don't match.",
  setPasswordSubmit: "Set password and sign in",
  setPasswordFailed: "The password could not be set.",
  expired: "This sign-in has expired. Please sign in again.",
  backToSignIn: "Back to sign in",
};

/* ── Props ───────────────────────────────────────────────────────────────── */

export interface SignInFormProps extends Omit<ComponentPropsWithoutRef<"div">, "onSubmit" | "children"> {
  /**
   * The credentials step was submitted. Send them, and resolve with the answer
   * ({@link SignInAnswer}) or reject with the client's error. The form never sends a
   * request itself (§8): keksdose must see the password on its way, to refuse the same
   * string as an encryption passphrase later.
   *
   * On `signed-in` the form's job is over — it stays busy while the app navigates.
   */
  onSubmit: (credentials: SignInCredentials) => Promise<SignInAnswer>;
  /** The second factor was submitted (`/auth/login/2fa`). Resolves with the next answer
   *  — keksdose may still require a new password after the code. */
  onCode: (values: SignInCodeValues) => Promise<SignInAnswer>;
  /** The new password was submitted (`/auth/login/set-password`). Resolves with the
   *  answer, `signed-in` in practice; keksdose's `key_wrap_unchanged` note is the app's
   *  to show from here. */
  onSetPassword: (values: SignInNewPasswordValues) => Promise<SignInAnswer>;
  /**
   * The passkey button was pressed: run the ceremony (`/auth/passkey/login/begin|finish`)
   * and resolve with its answer. It asks for NO email — a passkey is bound to the site,
   * and the browser offers every one it holds (keksdose #126). Left out, no button: pass
   * it only where `PublicKeyCredential` exists.
   */
  onPasskey?: () => Promise<SignInAnswer>;
  /**
   * Passkey autofill (conditional mediation). The email field is
   * `autoComplete="username webauthn"`, so a pending `navigator.credentials.get({
   * mediation: "conditional" })` lists the site's passkeys in its dropdown. The form
   * calls this ONCE on mount; arm the request there and resolve with its answer when the
   * person picks a passkey, or with `null` when nothing happens. The signal aborts on
   * unmount — cancel the pending request then (keksdose: `armPasskeyAutofill(onDone,
   * signal)` + `cancelPasskeyAutofill()`). A rejection is silent: the button stays the
   * reliable path.
   */
  passkeyAutofill?: (signal: AbortSignal) => Promise<SignInAnswer | null | undefined>;
  /** "Forgot your password?" goes here — the app's `/forgot-password`. Left out, no
   *  link. */
  forgotHref?: string;
  /** "No account yet? Create account" goes here — `/register`. Left out, no line. */
  registerHref?: string;
  /** The email field's start value — the reset page ends on "Sign in" with the address
   *  filled in (§6.3). */
  defaultEmail?: string;
  /**
   * The app's address tag (`"kastlan"`, §4.5). After `invalid_credentials` the form also
   * says "Signed up with you+kastlan@example.com? Use that address." — sign-in stays
   * exact, and the server looks nothing up.
   */
  emailTag?: string;
  /**
   * Who a deactivated user writes to (§2.10): an address (drawn as a `mailto:` link) or
   * the app's own node. Shown after `invalid_credentials` as "Account deactivated? Write
   * to …". Left out, no hint.
   */
  deactivatedContact?: ReactNode;
  /** Digits of the second factor. Default 6 (TOTP). */
  codeLength?: number;
  /** App content at the top of the credentials step — a notice, a demo button. */
  credentialsContent?: ReactNode;
  /** App content on the second-factor step, under its intro. */
  twoFactorContent?: ReactNode;
  /**
   * App content on the set-a-new-password step, under its intro — keksdose's
   * private-mode note ("Your encrypted data is untouched …"), which depends on the
   * challenge: pass a function and it gets the challenge's `extra`.
   */
  passwordChangeContent?: ReactNode | ((extra: Readonly<Record<string, unknown>> | undefined) => ReactNode);
  /**
   * The app's own words for a failure, or `undefined` for the kit's: a throttled
   * attempt (`429`), the device being offline. Asked first, for every failure; what it
   * returns replaces the message, and the `invalid_credentials` hints still follow.
   */
  describeError?: (error: unknown, action: SignInAction) => ReactNode | undefined;
  /** The step changed — retitle the page (`AuthLayout`'s `title`) if the app wants. */
  onStepChange?: (step: SignInStep) => void;
  /** The level of the second and third step's heading. Default `h2`, under the page's
   *  `h1`; one level under `AuthLayout`'s `headingAs` where that is embedded lower. */
  headingAs?: "h2" | "h3" | "h4" | "h5" | "h6";
  labels?: Partial<SignInLabels>;
}

/* ── Parts ───────────────────────────────────────────────────────────────── */

interface Failure {
  action: SignInAction;
  code: AuthErrorCode | undefined;
  message: ReactNode;
  /** The address the failed credentials carried — the tag hint names its tagged form. */
  email?: string;
}

/** `{contact}` in the template, replaced by the contact (a `mailto:` link for an
 *  address). Split, not interpolated, so the link is an element. A template that lost
 *  its placeholder still shows the contact, after it. */
function withContact(template: string, contact: ReactNode): ReactNode[] {
  const node =
    typeof contact === "string" && contact.includes("@") ? (
      <TextLink key="contact" href={`mailto:${contact}`} tone="secondary">
        {contact}
      </TextLink>
    ) : (
      <span key="contact">{contact}</span>
    );
  if (!template.includes("{contact}")) return [template, " ", node];
  return template
    .split(/(\{contact\})/)
    .filter((part) => part !== "")
    .map((part) => (part === "{contact}" ? node : part));
}

const HINT_CLASS = "text-xs text-[var(--text-secondary)]";
const INTRO_CLASS = "text-sm text-[var(--text-secondary)]";

/* ── The form ────────────────────────────────────────────────────────────── */

/**
 * Sign-in for every app (docs/auth-harmonization.md §5, §8): email and password, or a
 * passkey; then the second factor when it is on; then a new password when an admin
 * required one. keksdose's `LoginPage` and `ForcedPasswordChangeStep`
 * (features/auth/login-page.tsx, forced-password-change.tsx), as one component.
 *
 * **It never sends a request.** Each step hands its input to a callback and renders the
 * {@link SignInAnswer} it resolves with; a rejection is shown in the step it came from.
 * The challenge token lives in this component's state only, as in keksdose, so a reload
 * costs a fresh sign-in — no route, no storage.
 *
 * **One error for every wrong credential** (§2.10, §5.2): `invalid_credentials` shows one
 * sentence, whatever was wrong, plus two hints UNDER it — "Account deactivated? Write to
 * …" (`deactivatedContact`) and "Signed up with you+kastlan@…? Use that address."
 * (`emailTag`). Any other failure says "Sign-in failed" and no hint: the hints answer a
 * refused credential, not a network that is down. `describeError` puts the app's words
 * on a failure the kit cannot know (a throttled attempt).
 *
 * **The steps.**
 *  - Credentials: the email field is `username webauthn` (passkey autofill, see
 *    `passkeyAutofill`), the password a `CurrentPasswordInput` (a password manager fills
 *    it and never offers a new one). The submit is not disabled while the fields are
 *    empty: a browser that autofills on load withholds the values until the first
 *    interaction, and a disabled button would swallow that first click. The fields'
 *    own `required` answers an empty submit instead. "Forgot your password?" sits under
 *    the buttons, where someone whose password just failed is already looking
 *    (keksdose #198).
 *  - Second factor: {@link OneTimeCodeInput}, focused on arrival. "Verify" waits for the
 *    whole code. A refused code stays here with its error; `token_invalid` (the
 *    challenge expired) goes back to the credentials and says why. Kurvenschmiede has
 *    no 2FA yet, and the step is here from the start, so adding it is backend work only
 *    (§10.5).
 *  - New password: new + confirm with the strength meter, the 8-character / 72-byte
 *    rules and nothing else (§8). It reads as explained, not blocked (keksdose): the
 *    person did nothing wrong.
 *
 * The password is dropped from state once the credentials are answered; "Back to sign in"
 * returns to an empty password field.
 */
export function SignInForm({
  onSubmit,
  onCode,
  onSetPassword,
  onPasskey,
  passkeyAutofill,
  forgotHref,
  registerHref,
  defaultEmail = "",
  emailTag,
  deactivatedContact,
  codeLength = 6,
  credentialsContent,
  twoFactorContent,
  passwordChangeContent,
  describeError,
  onStepChange,
  headingAs: Heading = "h2",
  labels: labelsProp,
  className,
  ...rest
}: SignInFormProps) {
  const labels = useKitLabels("signIn", DEFAULT_SIGN_IN_LABELS, labelsProp);
  const [step, setStep] = useState<SignInStep>("credentials");
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [challenge, setChallenge] = useState<{ token: string; extra?: Readonly<Record<string, unknown>> } | null>(
    null,
  );
  // What is running: one call at a time. "done" after `signed-in` — the app has the
  // session and is leaving; the buttons stay busy so nothing is sent twice meanwhile.
  const [busy, setBusy] = useState<SignInAction | "done" | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const headingId = useId();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  // A late answer after unmount (the app navigated away) must not set state.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const goTo = (next: SignInStep) => {
    setStep(next);
    onStepChange?.(next);
  };

  const present = (answer: SignInAnswer) => {
    setFailure(null);
    if (answer.kind === "signed-in") {
      setBusy("done");
      return;
    }
    setBusy(null);
    // The password has done its work; it does not stay in state for the next steps.
    setPassword("");
    setCode("");
    setNewPassword("");
    setConfirm("");
    if (answer.kind === "2fa") {
      setChallenge({ token: answer.challengeToken });
      goTo("2fa");
    } else if (answer.kind === "password-change") {
      setChallenge({ token: answer.challengeToken, extra: answer.extra });
      goTo("password-change");
    }
  };

  const messageFor = (error: unknown, action: SignInAction, code: AuthErrorCode | undefined): ReactNode => {
    const own = describeError?.(error, action);
    if (hasMessage(own)) return own;
    if (action === "password") return code === "invalid_credentials" ? labels.invalidCredentials : labels.failed;
    if (action === "passkey") return labels.passkeyFailed;
    if (action === "code") return code === "token_invalid" ? labels.expired : labels.codeInvalid;
    return code === "token_invalid" ? labels.expired : labels.setPasswordFailed;
  };

  const fail = (error: unknown, action: SignInAction, sentEmail?: string) => {
    setBusy(null);
    // Our own abort (a passkey ceremony cancelled by the unmount) is no failure.
    if ((error as { name?: unknown } | null)?.name === "AbortError") return;
    const code = authErrorCode(error);
    const message = messageFor(error, action, code);
    // The challenge expired between the steps: only a fresh sign-in helps.
    if ((action === "code" || action === "set-password") && code === "token_invalid") {
      setChallenge(null);
      setCode("");
      setNewPassword("");
      setConfirm("");
      goTo("credentials");
    }
    setFailure({ action, code, message, email: sentEmail });
  };

  const attempt = (action: SignInAction, call: () => Promise<SignInAnswer>, sentEmail?: string) => {
    if (busy) return;
    setBusy(action);
    setFailure(null);
    let result: Promise<SignInAnswer>;
    try {
      result = Promise.resolve(call());
    } catch (error) {
      result = Promise.reject(error);
    }
    result.then(
      (answer) => {
        if (mounted.current) present(answer);
      },
      (error: unknown) => {
        if (mounted.current) fail(error, action, sentEmail);
      },
    );
  };

  // Passkey autofill: armed once, on mount; the signal aborts on unmount. Its answer
  // arrives whenever the person picks a passkey from the email field's dropdown — and
  // is dropped if they have meanwhile started a sign-in of their own.
  const armAutofill = useEffectEvent((signal: AbortSignal) => passkeyAutofill?.(signal));
  const autofillAnswered = useEffectEvent((answer: SignInAnswer) => {
    if (busy === null) present(answer);
  });
  useEffect(() => {
    const controller = new AbortController();
    let pending: Promise<SignInAnswer | null | undefined>;
    try {
      pending = Promise.resolve(armAutofill(controller.signal));
    } catch (error) {
      pending = Promise.reject(error);
    }
    pending.then(
      (answer) => {
        if (answer && !controller.signal.aborted && mounted.current) autofillAnswered(answer);
      },
      () => {
        /* silent — unsupported, declined or aborted; the button stays the way in */
      },
    );
    return () => controller.abort();
  }, []);

  // Focus follows the step — not on mount (where it would pop a phone's keyboard over
  // the page), only once the person moved to another step.
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    if (step === "2fa") codeRef.current?.focus();
    else if (step === "password-change") newPasswordRef.current?.focus();
    else if (emailRef.current?.value) passwordRef.current?.focus();
    else emailRef.current?.focus();
  }, [step]);

  const backToCredentials = () => {
    if (busy) return;
    setChallenge(null);
    setFailure(null);
    setCode("");
    setNewPassword("");
    setConfirm("");
    goTo("credentials");
  };

  const working = busy !== null;
  const rootClass = cn("space-y-3", className);

  /* ── Step 2: the second factor ── */
  if (step === "2fa" && challenge) {
    const submitCode = (e: FormEvent) => {
      e.preventDefault();
      if (code.length !== codeLength) return;
      attempt("code", () => onCode({ challengeToken: challenge.token, code }));
    };
    const codeError = failure?.action === "code" ? failure.message : undefined;
    return (
      <div {...rest} data-step="2fa" className={rootClass}>
        <form className="space-y-3" aria-labelledby={headingId} onSubmit={submitCode}>
          <Heading id={headingId} className="text-base font-semibold text-[var(--text-primary)]">
            {labels.twoFactorTitle}
          </Heading>
          <p className={INTRO_CLASS}>{labels.twoFactorIntro}</p>
          {twoFactorContent}
          <OneTimeCodeInput
            ref={codeRef}
            label={labels.code}
            name="code"
            value={code}
            length={codeLength}
            onChange={(next) => {
              setCode(next);
              if (failure) setFailure(null);
            }}
            readOnly={working}
            error={codeError}
            required
          />
          <Button type="submit" className="w-full" disabled={!working && code.length !== codeLength} pending={working}>
            {labels.verify}
          </Button>
        </form>
        <BackLink label={labels.backToSignIn} onClick={backToCredentials} disabled={working} />
      </div>
    );
  }

  /* ── Step 3: a new password ── */
  if (step === "password-change" && challenge) {
    const problem = newPasswordProblem(newPassword, confirm);
    const submitPassword = (e: FormEvent) => {
      e.preventDefault();
      if (problem) return;
      attempt("set-password", () => onSetPassword({ challengeToken: challenge.token, password: newPassword }));
    };
    const content =
      typeof passwordChangeContent === "function" ? passwordChangeContent(challenge.extra) : passwordChangeContent;
    return (
      <div {...rest} data-step="password-change" className={rootClass}>
        <form className="space-y-3" aria-labelledby={headingId} onSubmit={submitPassword}>
          <Heading id={headingId} className="text-base font-semibold text-[var(--text-primary)]">
            {labels.setPasswordTitle}
          </Heading>
          <p className={INTRO_CLASS}>{labels.setPasswordIntro}</p>
          {content}
          {/* Which account the new password is for, for the password manager: it files
              the new password under this username instead of guessing. */}
          {email !== "" && (
            <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          )}
          <NewPasswordFields
            password={newPassword}
            confirm={confirm}
            onPasswordChange={setNewPassword}
            onConfirmChange={setConfirm}
            busy={working}
            passwordRef={newPasswordRef}
            text={{ password: labels.newPassword, confirm: labels.confirmPassword, mismatch: labels.passwordMismatch }}
          />
          {failure?.action === "set-password" && (
            <AlertBanner tone="danger" size="sm" role="alert">
              {failure.message}
            </AlertBanner>
          )}
          <Button type="submit" className="w-full" disabled={!working && problem !== null} pending={working}>
            {labels.setPasswordSubmit}
          </Button>
        </form>
        <BackLink label={labels.backToSignIn} onClick={backToCredentials} disabled={working} />
      </div>
    );
  }

  /* ── Step 1: the credentials ── */
  const submitCredentials = (e: FormEvent) => {
    e.preventDefault();
    const sent = email.trim();
    if (sent === "" || password === "") return;
    attempt("password", () => onSubmit({ email: sent, password }), sent);
  };

  const refused = failure?.code === "invalid_credentials";
  const tagged =
    refused && failure?.action === "password" && emailTag && failure.email ? taggedEmail(failure.email, emailTag) : null;
  const showDeactivated = refused && hasMessage(deactivatedContact);

  return (
    <div {...rest} data-step="credentials" className={rootClass}>
      <form className="space-y-3" onSubmit={submitCredentials}>
        {credentialsContent}
        <Input
          ref={emailRef}
          type="email"
          name="email"
          // "webauthn" lets the browser list passkeys in this field's dropdown, paired
          // with the conditional request `passkeyAutofill` arms.
          autoComplete="username webauthn"
          label={labels.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={working}
          required
        />
        <CurrentPasswordInput
          ref={passwordRef}
          name="password"
          label={labels.password}
          value={password}
          onValueChange={setPassword}
          busy={working}
          required
        />
        {failure && (
          // One live region for the sentence and its hints: they are one answer.
          <div role="alert" className="space-y-1.5">
            <AlertBanner tone="danger" size="sm">
              {failure.message}
            </AlertBanner>
            {showDeactivated && (
              <p className={HINT_CLASS}>{withContact(labels.deactivatedHint, deactivatedContact)}</p>
            )}
            {tagged && <p className={HINT_CLASS}>{labels.tagHint(tagged)}</p>}
          </div>
        )}
        <Button type="submit" className="w-full" pending={busy === "password" || busy === "done"} disabled={busy === "passkey"}>
          {labels.submit}
        </Button>
        {onPasskey && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            pending={busy === "passkey"}
            disabled={busy === "password" || busy === "done"}
            onClick={() => attempt("passkey", onPasskey)}
          >
            <KeyRound aria-hidden className="size-4" />
            {labels.passkey}
          </Button>
        )}
      </form>
      {forgotHref !== undefined && (
        <p className="text-center text-sm">
          <TextLink href={forgotHref} tone="secondary">
            {labels.forgotPassword}
          </TextLink>
        </p>
      )}
      {registerHref !== undefined && (
        <p className="text-center text-sm text-[var(--text-secondary)]">
          {labels.noAccount}{" "}
          <TextLink href={registerHref} tone="primary">
            {labels.register}
          </TextLink>
        </p>
      )}
    </div>
  );
}

/** "Back to sign in" under the second and third step: a button, since it changes the
 *  step in place rather than going anywhere. */
function BackLink({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <p className="text-center text-sm">
      <Button type="button" variant="link" tone="muted" size="sm" disabled={disabled} onClick={onClick}>
        {label}
      </Button>
    </p>
  );
}
