import { useEffect, useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, FormEvent, ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { AlertBanner } from "../components/alert-banner";
import { LoadingState } from "../components/loading-state";
import { Button, EmptyState } from "../components/ui";
import { authErrorCode, englishRateLimited, isRateLimited, retryAfterSeconds } from "./auth-errors";
import { newPasswordProblem } from "./form-rules";
import { NewPasswordFields } from "./new-password-fields";
import {
  FORM_HEADING_CLASS,
  INTRO_CLASS,
  OUTCOME_CLASS,
  OutcomeMessage,
  useFocusWhen,
  useOncePerKey,
  withQuery,
} from "./status-parts";
import type { AuthHeadingLevel } from "./status-parts";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string the form renders — the `resetPassword` namespace. keksdose's words
 *  (`auth.reset.*`), which kastlan took over. */
export interface ResetPasswordLabels {
  /** The heading, on every state. */
  title: string;
  /** While the link is checked. */
  checking: string;
  /** Over the fields, given the account's address (when the check returned one). */
  intro: (email: string) => string;
  newPassword: string;
  confirmPassword: string;
  /** Under the confirmation while it differs. */
  mismatch: string;
  submit: string;
  /** The new password was not saved, for a reason that is not the link. */
  failed: string;
  /** The page was opened without a `token`. */
  noToken: string;
  /** The link is unknown, spent or expired — one sentence, as the server gives one
   *  code (`token_invalid`). */
  invalid: string;
  /** Under it. */
  invalidHint: string;
  /** The way forward from an invalid link: back to "Forgot password". */
  requestNew: string;
  /** Done. */
  success: string;
  /** Under it: a reset ends every session (§6.3). */
  sessionsEnded: string;
  /** The button out — to sign-in, with the address filled in. */
  signIn: string;
  /** 0.30.0: the save was throttled — HTTP 429 ({@link isRateLimited}) — given the
   *  `Retry-After` wait in seconds, or `undefined` without one. OPTIONAL, like every key
   *  added to a shipped interface; the provider's `resetPassword`, then English, fill
   *  it. */
  rateLimited?: (seconds?: number) => string;
}

/** `Required`: every key, the 0.30 one included, has its English here. */
export const DEFAULT_RESET_PASSWORD_LABELS: Required<ResetPasswordLabels> = {
  title: "Choose a new password",
  checking: "Checking the link…",
  intro: (email) => `You’re setting a new password for ${email}.`,
  newPassword: "New password",
  confirmPassword: "Repeat new password",
  mismatch: "The passwords don’t match.",
  submit: "Save password",
  failed: "The password could not be changed.",
  noToken: "This link is incomplete.",
  invalid: "This link is invalid or has expired.",
  invalidHint: "Links are valid for one hour and work only once. Just request a new one.",
  requestNew: "Request a new link",
  success: "Your password has been changed. You can sign in with it now.",
  sessionsEnded: "Signed-in devices were signed out — you’ll need to sign in again there.",
  signIn: "Go to sign in",
  rateLimited: englishRateLimited,
};

/* ── Types ───────────────────────────────────────────────────────────────── */

/** What `onCheck` may resolve with — keksdose's `/password-reset/check` answer. */
export interface ResetPasswordCheck {
  /** The account's address: named over the fields ("You're setting a new password for
   *  …") and handed to the password manager, which files the new password under it. */
  email?: string;
  /** The app's notices over the fields, shown BEFORE the password is typed — keksdose's
   *  "your account is end-to-end encrypted: this restores your sign-in, not your data". */
  notices?: ReactNode;
}

/** What `onSubmit` hands over. */
export interface ResetPasswordValues {
  token: string;
  password: string;
}

/** What `onSubmit` resolves with — keksdose's `/password-reset/confirm` answer, which
 *  carries no tokens (§6.3). */
export interface ResetPasswordResult {
  /** The account's address — the sign-in it leads to is filled in with it. */
  email: string;
  /** The app's outcomes, shown on the done state: keksdose's recovery-code notice for an
   *  encrypted account, "Your 2 personal access tokens were revoked". */
  notices?: ReactNode;
}

type Phase =
  | { kind: "form"; check: ResetPasswordCheck }
  | { kind: "invalid" }
  | { kind: "done"; result: ResetPasswordResult };

export interface ResetPasswordFormProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onSubmit" | "children" | "title"> {
  /** The link's token — the app's `?token=` (keksdose, kastlan: `/reset-password?token=…`).
   *  Empty: the link was cut short, and the page says so without asking anyone. */
  token: string;
  /**
   * Check the link before the form shows (`/auth/password-reset/check`) — once per
   * token, on mount. Checking does not use it up, so a reload is free. Resolve (with
   * the address and any notices) for a live link; reject for a dead one, and the page
   * says "This link is invalid or has expired" with the way to a new one.
   */
  onCheck: (token: string) => Promise<ResetPasswordCheck | void | undefined>;
  /**
   * The new password was submitted: send `/auth/password-reset/confirm`. Resolve with
   * the account's address (and the app's notices) — no tokens: a reset is not a sign-in
   * (§6.3). Reject with the client's error: `token_invalid` (the link expired or was
   * used in another tab while the form was open) goes to the invalid state; anything
   * else stays on the form with the password kept.
   */
  onSubmit: (values: ResetPasswordValues) => Promise<ResetPasswordResult>;
  /** "Go to sign in" calls this with the address, for an app that routes in code.
   *  Without it, the button is a link to `signInHref`. */
  onSignIn?: (email: string) => void;
  /** Where "Go to sign in" leads, with `?email=` added — read it into `SignInForm`'s
   *  `defaultEmail`. Default `/login`. */
  signInHref?: string;
  /** "Request a new link" — the app's "Forgot password" page. Default
   *  `/forgot-password`. */
  forgotHref?: string;
  /** The app's words for a failed save (the device offline), or `undefined` for the
   *  kit's: `rateLimited` for a bare `429` (0.30.0), else `failed`. Not asked for
   *  `token_invalid` or `token_expired`, which are a state. */
  describeError?: (error: unknown) => ReactNode | undefined;
  /** The heading. Default `labels.title`; `null` draws none, for a page that puts it
   *  in `AuthLayout`'s `title` instead. */
  title?: ReactNode;
  /** The heading's level. Default `h2`, under the page's `h1`. */
  headingAs?: AuthHeadingLevel;
  labels?: Partial<ResetPasswordLabels>;
}

/**
 * Redeem a password-reset link (`/reset-password?token=…`, docs/auth-harmonization.md
 * §6.3, §7) — keksdose's `ResetPasswordPage` (features/auth/reset-password-page.tsx),
 * which kastlan built its own on.
 *
 * **The link is checked first** (`onCheck`), and only then does the form appear: an
 * expired link should say so before someone types a new password twice, not after.
 *
 * **A reset is not a sign-in** (§6.3, §10.11). The confirm answers without tokens, so a
 * 2FA account cannot skip its second factor by way of its inbox, and the page ends on
 * "Go to sign in" with the address filled in — the person has just typed the new
 * password twice; signing in is one step. What else the reset did is said there:
 * every other session ended (the kit's line, true in all three apps), and the app's own
 * outcomes in `notices` — keksdose's recovery-code notice and its revoked API tokens.
 *
 * **The password** is chosen with the same fields as `RegisterForm` and `SignInForm`'s
 * set-password step ({@link NewPasswordFields}): the strength meter and its checklist as
 * advice, and only the two hard rules — at least 8 characters, at most 72 bytes (§8).
 * The submit waits for both and a matching confirmation.
 *
 * The form never sends a request itself (§8): the token and the password go to the
 * callbacks, and the page renders what they resolve with.
 */
export function ResetPasswordForm({
  token,
  onCheck,
  onSubmit,
  onSignIn,
  signInHref = "/login",
  forgotHref = "/forgot-password",
  describeError,
  title,
  headingAs: Heading = "h2",
  labels: labelsProp,
  className,
  ...rest
}: ResetPasswordFormProps) {
  const labels = useKitLabels("resetPassword", DEFAULT_RESET_PASSWORD_LABELS, labelsProp);
  // The phase belongs to the token it was reached with: a new token starts over at the
  // check without a reset effect.
  const [phase, setPhase] = useState<{ token: string; phase: Phase } | null>(null);
  const current: Phase | "checking" =
    token === "" ? { kind: "invalid" } : phase?.token === token ? phase.phase : "checking";

  useOncePerKey(token === "" ? null : token, onCheck, (key, result) =>
    setPhase({
      token: key,
      phase: result.ok ? { kind: "form", check: result.value ?? {} } : { kind: "invalid" },
    }),
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<ReactNode>(null);
  const headingId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const kind = current === "checking" ? "checking" : current.kind;

  // The form arrives after the check: the field is where the person is going.
  useEffect(() => {
    if (kind === "form") passwordRef.current?.focus();
  }, [kind]);
  useFocusWhen(kind === "done", doneRef);

  const heading =
    title === null ? null : (
      <Heading id={headingId} className={FORM_HEADING_CLASS}>
        {title ?? labels.title}
      </Heading>
    );
  const rootClass = cn("space-y-3", className);

  if (current === "checking") {
    return (
      <div {...rest} data-state="checking" aria-busy className={rootClass}>
        {heading}
        <LoadingState size="sm" label={labels.checking} />
      </div>
    );
  }

  if (current.kind === "invalid") {
    return (
      <div {...rest} data-state="invalid" className={rootClass}>
        {heading}
        <EmptyState
          tone="danger"
          icon={<XCircle />}
          title={token === "" ? labels.noToken : labels.invalid}
          hint={labels.invalidHint}
          action={
            <Button href={forgotHref} variant="brand">
              {labels.requestNew}
            </Button>
          }
          className={OUTCOME_CLASS}
        />
      </div>
    );
  }

  if (current.kind === "done") {
    const { email, notices } = current.result;
    return (
      <div {...rest} data-state="done" className={rootClass}>
        {heading}
        <OutcomeMessage icon={<CheckCircle2 className="text-[var(--success)]" />} focusRef={doneRef}>
          <p className={INTRO_CLASS}>{labels.success}</p>
        </OutcomeMessage>
        {notices}
        <p className="text-xs text-[var(--text-muted)]">{labels.sessionsEnded}</p>
        {onSignIn ? (
          <Button type="button" variant="brand" className="w-full" onClick={() => onSignIn(email)}>
            {labels.signIn}
          </Button>
        ) : (
          <Button href={email ? withQuery(signInHref, "email", email) : signInHref} variant="brand" className="w-full">
            {labels.signIn}
          </Button>
        )}
      </div>
    );
  }

  const { email, notices } = current.check;
  const problem = newPasswordProblem(password, confirm);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending || problem !== null) return;
    setFailure(null);
    setPending(true);
    Promise.resolve()
      .then(() => onSubmit({ token, password }))
      .then(
        (result) => {
          setPending(false);
          setPassword("");
          setConfirm("");
          setPhase({ token, phase: { kind: "done", result } });
        },
        (error: unknown) => {
          setPending(false);
          // A link that died between the check and the save — used, or run out — is the
          // dead-link state, under either code (0.31.1: keksdose mapped `token_expired`
          // to it itself, `asDeadLink`).
          const code = authErrorCode(error);
          if (code === "token_invalid" || code === "token_expired") {
            setPassword("");
            setConfirm("");
            setPhase({ token, phase: { kind: "invalid" } });
            return;
          }
          // The app's words first, then the throttle's, then the kit's catch-all.
          setFailure(
            describeError?.(error) ??
              (isRateLimited(error)
                ? (labels.rateLimited ?? DEFAULT_RESET_PASSWORD_LABELS.rateLimited)(retryAfterSeconds(error))
                : labels.failed),
          );
        },
      );
  };

  return (
    <div {...rest} data-state="form" className={rootClass}>
      <form className="space-y-3" aria-labelledby={title === null ? undefined : headingId} onSubmit={submit}>
        {heading}
        {email ? <p className={INTRO_CLASS}>{labels.intro(email)}</p> : null}
        {notices}
        {/* Which account the new password is for, for the password manager: it files
            the new password under this username instead of guessing (kastlan). */}
        {email ? <input type="email" name="username" autoComplete="username" value={email} readOnly hidden /> : null}
        <NewPasswordFields
          password={password}
          confirm={confirm}
          onPasswordChange={(next) => {
            setPassword(next);
            if (failure) setFailure(null);
          }}
          onConfirmChange={setConfirm}
          busy={pending}
          passwordRef={passwordRef}
          text={{ password: labels.newPassword, confirm: labels.confirmPassword, mismatch: labels.mismatch }}
        />
        {failure != null && (
          <AlertBanner tone="danger" size="sm" role="alert">
            {failure}
          </AlertBanner>
        )}
        <Button type="submit" className="w-full" disabled={!pending && problem !== null} pending={pending}>
          {labels.submit}
        </Button>
      </form>
    </div>
  );
}
