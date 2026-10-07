import { useEffect, useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, FormEvent, ReactNode } from "react";
import { MailCheck } from "lucide-react";

import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { AlertBanner } from "../components/alert-banner";
import { hasMessage } from "../components/choice-parts";
import { CurrentPasswordInput } from "../components/danger-confirm";
import { Button, Card, Input } from "../components/ui";
import { authErrorCode, englishRateLimited, isRateLimited, retryAfterSeconds } from "../auth/auth-errors";
import { emailParts, taggedEmail } from "../auth/email-tag";
import { CARD_DESCRIPTION_CLASS, settle, useMounted } from "./account-parts";
import { SettingsCardTitle } from "../settings/settings-heading";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string {@link EmailChangeSetting} renders — the `emailChange` namespace of
 *  `<UiKitProvider labels>`, overridable per instance through `labels`. */
export interface EmailChangeLabels {
  /** The card's title. */
  title: string;
  /** Names the address the account has now: "Current address: ada@example.com". */
  current: string;
  /** The new address's field. */
  newEmail: string;
  /** The password field. */
  password: string;
  /** Under the password field: why it is asked again. */
  passwordHint: string;
  /** The address-tag button (auth §4.5), given the exact address it would use. */
  emailTagUse: (address: string) => string;
  /** The line after the address-tag button. */
  emailTagHint: string;
  /** The submit button. */
  submit: string;
  /** Under the new address while it is the current one. */
  sameAsCurrent: string;
  /** `email_taken`, under the new address. */
  emailTaken: string;
  /** `password_incorrect`, under the password. */
  wrongPassword: string;
  /** The pending state, given the new address the link went to. */
  pending: (newEmail: string) => string;
  /** Under it, given the current address — which still signs in until the link is
   *  confirmed. */
  pendingHint: (currentEmail: string) => string;
  /** Mails the link again. */
  resend: string;
  /** Said once it went. */
  resent: string;
  /** Drops the change; the current address stays. */
  cancel: string;
  /** The done state (`confirmed`), given the address the account has now. */
  confirmed: (email: string) => string;
  /** Under it (`passkeyNote`): a passkey's label in the authenticator keeps the old
   *  address (§6.2). */
  passkeyNote: string;
  /** A request was throttled — HTTP 429 — given its `Retry-After` wait in seconds, or
   *  `undefined` without one. */
  rateLimited: (seconds?: number) => string;
  /** Any other failure, of any of the three requests. */
  failed: string;
}

export const DEFAULT_EMAIL_CHANGE_LABELS: EmailChangeLabels = {
  title: "Email address",
  current: "Current address",
  newEmail: "New email address",
  password: "Current password",
  passwordHint: "Your address is how you sign in, so changing it takes your password.",
  emailTagUse: (address) => `Use ${address}`,
  emailTagHint:
    "Many providers deliver name+tag@… to the same inbox, so mail from this app is easy to filter and trace. Check yours does before you rely on it: you would sign in with the tagged address.",
  submit: "Change email address",
  sameAsCurrent: "This is already your address.",
  emailTaken: "An account with this email address already exists.",
  wrongPassword: "The password is incorrect.",
  pending: (newEmail) => `Confirm the link we sent to ${newEmail}.`,
  pendingHint: (currentEmail) =>
    `Until you do, you keep signing in with ${currentEmail}. Check your spam folder too.`,
  resend: "Send the link again",
  resent: "We sent the link again.",
  cancel: "Cancel the change",
  confirmed: (email) => `Your email address is now ${email}.`,
  passkeyNote: "Your passkeys keep working. Your device may still list them under your old address.",
  rateLimited: englishRateLimited,
  failed: "That didn’t work. Please try again.",
};

/* ── Props ───────────────────────────────────────────────────────────────── */

/** What {@link EmailChangeSettingProps.onRequest} gets: the `POST /auth/me/email` body. */
export interface EmailChangeValues {
  /** Trimmed. A `+tag` stays (auth §4.5); lower-casing is the server's. */
  newEmail: string;
  /** As typed. */
  password: string;
}

/** Which request failed — {@link EmailChangeSettingProps.describeError}'s second
 *  argument. */
export type EmailChangeAction = "request" | "resend" | "cancel";

export interface EmailChangeSettingProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSubmit"> {
  /** The account's address now. */
  currentEmail: string;
  /**
   * The address a change waits on, from the app's server state — so a reload, or
   * another tab, shows the pending state. `null`: none, whatever the card did. Left out
   * (`undefined`), the card keeps its own: pending from a resolved `onRequest` until a
   * resolved `onCancel`.
   */
  pendingEmail?: string | null;
  /**
   * The form was submitted: send `POST /auth/me/email {new_email, password}` (§6.2).
   * Resolve once the link is mailed — refresh `pendingEmail` first if the app passes
   * it — and the card shows "Confirm the link we sent to …". Reject with the client's
   * error: `email_taken` shows under the new address, `password_incorrect` (server-kit's
   * `400` for a wrong current password; an older `invalid_credentials` too) under the
   * password, a 429 as `rateLimited`, anything else as `failed` unless `describeError`
   * has the app's words.
   */
  onRequest: (values: EmailChangeValues) => Promise<unknown> | void;
  /** Mail the link again. Left out, no button. */
  onResend?: () => Promise<unknown> | void;
  /** Drop the pending change. Left out, no button. */
  onCancel?: () => Promise<unknown> | void;
  /**
   * The change was just confirmed — the app's confirm route (`POST /auth/me/email/confirm`)
   * came back here. Says "Your email address is now …" over the form, with
   * `passkeyNote`.
   */
  confirmed?: boolean;
  /** With `confirmed`: say that a passkey's label keeps the old address (§6.2). Default
   *  `true`; `false` for an account without passkeys. */
  passkeyNote?: boolean;
  /**
   * The app's address tag (`"kastlan"`, auth §4.5): once the new address is plausible a
   * button under it offers the tagged form — the rule of `RegisterForm`, since this is
   * the person's own address. Never applied on its own. Left out, no offer.
   */
  emailTag?: string;
  /** The app's own words for a failure, or `undefined` for the kit's. Asked first, for
   *  every failure (a demo account's 403, the device offline). */
  describeError?: (error: unknown, action: EmailChangeAction) => ReactNode | undefined;
  labels?: Partial<EmailChangeLabels>;
}

interface Failure {
  action: EmailChangeAction;
  message: ReactNode;
}

/**
 * Changing the account's email address (docs/user-admin-harmonization.md §6.2, §2.5):
 * the current address, the new one, the password — then a pending state until the new
 * address confirms its link.
 *
 * **The new address must confirm before it takes effect.** The server mails a one-time
 * link to the NEW address (and a notice to the old one); until it is opened, the account
 * keeps the old address and signs in with it. So the card's answer to a request is not
 * "changed" but "Confirm the link we sent to …", with "Send the link again" and "Cancel
 * the change". The state is the server's: pass `pendingEmail` and a reload shows it too.
 *
 * **The password is asked again** because the address is the identity: whoever holds the
 * session must not move the account to a mailbox of their own. It is a
 * {@link CurrentPasswordInput}, so a password manager fills it and offers no new one.
 *
 * **The `+tag` offer** (`emailTag`) is RegisterForm's: the address is the person's own,
 * so `you+kastlan@…` is offered under the field, applied only on a click.
 *
 * **It never sends a request** (auth §8): `onRequest`, `onResend` and `onCancel` are the
 * app's, and their refusals are read by code — `email_taken` and `password_incorrect`
 * under their fields, which take the focus; a 429 as "Too many attempts". A wrong
 * password is a `400 password_incorrect`, never a 401: an app's client reads a 401 on a
 * signed-in route as an ended session, and would sign the person out for a typo.
 *
 * **Done** (`confirmed`): "Your email address is now …" and, unless `passkeyNote` is
 * off, that a passkey keeps its old label in the device's list — the authenticator
 * stored the name it was given, and only a new passkey carries the new one.
 */
export function EmailChangeSetting({
  currentEmail,
  pendingEmail,
  onRequest,
  onResend,
  onCancel,
  confirmed,
  passkeyNote = true,
  emailTag,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: EmailChangeSettingProps) {
  const labels = useKitLabels("emailChange", DEFAULT_EMAIL_CHANGE_LABELS, labelsProp);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownPending, setOwnPending] = useState<string | null>(null);
  const [busy, setBusy] = useState<EmailChangeAction | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  // `email_taken` belongs to the address it was answered for; another one clears it.
  const [taken, setTaken] = useState<string | null>(null);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [resent, setResent] = useState(false);
  const mounted = useMounted();
  const titleId = useId();
  const tagHintId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);

  const pending = pendingEmail !== undefined ? pendingEmail : ownPending;
  const isPending = pending !== null && pending !== "";

  // The state swapped under the button that was pressed (the form for the pending
  // message, or back): the focus goes to what came in, never down to <body>. Only after
  // the person's own request — a pending state that arrives with the page takes nothing.
  const focusNext = useRef<"pending" | "form" | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    if (target === "pending" && isPending) {
      focusNext.current = null;
      pendingRef.current?.focus();
    } else if (target === "form" && !isPending) {
      focusNext.current = null;
      emailRef.current?.focus();
    }
  }, [isPending]);

  const messageFor = (error: unknown, action: EmailChangeAction): ReactNode => {
    const own = describeError?.(error, action);
    if (hasMessage(own)) return own;
    return isRateLimited(error) ? labels.rateLimited(retryAfterSeconds(error)) : labels.failed;
  };

  /* ── The pending state ── */
  if (isPending) {
    const run = (action: "resend" | "cancel", call: () => unknown) => {
      if (busy) return;
      setBusy(action);
      setFailure(null);
      setResent(false);
      settle(call).then(
        () => {
          if (!mounted.current) return;
          setBusy(null);
          if (action === "resend") {
            setResent(true);
            return;
          }
          focusNext.current = "form";
          setOwnPending(null);
        },
        (error: unknown) => {
          if (!mounted.current) return;
          setBusy(null);
          setFailure({ action, message: messageFor(error, action) });
        },
      );
    };
    return (
      <Card {...rest} data-state="pending" className={cn("p-4 space-y-3", className)}>
        <div>
          <SettingsCardTitle id={titleId}>{labels.title}</SettingsCardTitle>
          <div className={cn(CARD_DESCRIPTION_CLASS, "break-all")}>{common.fieldValue(labels.current, currentEmail)}</div>
        </div>
        {/* Focusable, not a control: the request's answer is read out when it takes the
            focus from the submit that went with the form. */}
        <div ref={pendingRef} tabIndex={-1} className="flex gap-2 outline-none">
          <MailCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
          <div className="min-w-0 space-y-1">
            <p className="break-words text-sm">{labels.pending(pending)}</p>
            <p className={CARD_DESCRIPTION_CLASS}>{labels.pendingHint(currentEmail)}</p>
          </div>
        </div>
        {(onResend || onCancel) && (
          <div className="flex flex-wrap items-center gap-2">
            {onResend && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                commit
                pending={busy === "resend"}
                disabled={busy === "cancel"}
                onClick={() => run("resend", onResend)}
              >
                {labels.resend}
              </Button>
            )}
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                commit
                pending={busy === "cancel"}
                disabled={busy === "resend"}
                onClick={() => run("cancel", onCancel)}
              >
                {labels.cancel}
              </Button>
            )}
            {/* Always in the tree, so the "sent again" that appears in it is announced
                (VerifyEmailStatus's resend line). */}
            <span role="status" className="text-xs text-[var(--success)]">
              {resent ? labels.resent : null}
            </span>
          </div>
        )}
        {failure && (
          <AlertBanner tone="danger" size="sm" role="alert">
            {failure.message}
          </AlertBanner>
        )}
      </Card>
    );
  }

  /* ── The form ── */
  const typed = newEmail.trim();
  const same = typed !== "" && typed.toLowerCase() === currentEmail.trim().toLowerCase();
  const working = busy !== null;
  const canSubmit = emailParts(newEmail) !== null && !same && password !== "";
  const suggestion = emailTag ? taggedEmail(newEmail, emailTag) : null;
  const emailError = same ? labels.sameAsCurrent : taken !== null && taken === typed ? labels.emailTaken : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || working) return;
    const values: EmailChangeValues = { newEmail: typed, password };
    setBusy("request");
    setFailure(null);
    setTaken(null);
    setWrongPassword(false);
    settle(() => onRequest(values)).then(
      () => {
        if (!mounted.current) return;
        setBusy(null);
        // The password has done its work; nothing of the form stays in state.
        setNewEmail("");
        setPassword("");
        setResent(false);
        focusNext.current = "pending";
        setOwnPending(values.newEmail);
      },
      (error: unknown) => {
        if (!mounted.current) return;
        setBusy(null);
        const own = describeError?.(error, "request");
        if (hasMessage(own)) {
          setFailure({ action: "request", message: own });
          return;
        }
        if (isRateLimited(error)) {
          setFailure({ action: "request", message: labels.rateLimited(retryAfterSeconds(error)) });
          return;
        }
        const code = authErrorCode(error);
        if (code === "email_taken") {
          setTaken(values.newEmail);
          emailRef.current?.focus();
          return;
        }
        // `invalid_credentials` too, for a server that answered a wrong password so
        // before server-kit 0.4.0 named `password_incorrect`.
        if (code === "password_incorrect" || code === "invalid_credentials") {
          setWrongPassword(true);
          passwordRef.current?.focus();
          return;
        }
        setFailure({ action: "request", message: labels.failed });
      },
    );
  };

  return (
    <Card {...rest} data-state={confirmed ? "confirmed" : "form"} className={cn("p-4 space-y-3", className)}>
      <div>
        <SettingsCardTitle id={titleId}>{labels.title}</SettingsCardTitle>
        <div className={cn(CARD_DESCRIPTION_CLASS, "break-all")}>{common.fieldValue(labels.current, currentEmail)}</div>
      </div>
      {confirmed && (
        <AlertBanner tone="success" size="sm">
          <span className="block">{labels.confirmed(currentEmail)}</span>
          {passkeyNote && <span className="mt-1 block">{labels.passkeyNote}</span>}
        </AlertBanner>
      )}
      <form className="space-y-3" aria-labelledby={titleId} onSubmit={submit} noValidate>
        <div>
          <Input
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="email"
            label={labels.newEmail}
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              if (failure) setFailure(null);
            }}
            readOnly={working}
            error={emailError}
            required
          />
          {/* RegisterForm's offer (auth §4.5): one click, the exact address on the
              button, reversible by typing. */}
          {suggestion && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 align-baseline"
                disabled={working}
                aria-describedby={tagHintId}
                onClick={() => setNewEmail(suggestion)}
              >
                {labels.emailTagUse(suggestion)}
              </Button>{" "}
              <span id={tagHintId}>{labels.emailTagHint}</span>
            </p>
          )}
        </div>
        <CurrentPasswordInput
          ref={passwordRef}
          name="password"
          label={labels.password}
          value={password}
          onValueChange={(next) => {
            setPassword(next);
            setWrongPassword(false);
            if (failure) setFailure(null);
          }}
          hint={labels.passwordHint}
          error={wrongPassword ? labels.wrongPassword : undefined}
          busy={working}
          required
        />
        {failure && (
          <AlertBanner tone="danger" size="sm" role="alert">
            {failure.message}
          </AlertBanner>
        )}
        <Button type="submit" commit disabled={!working && !canSubmit} pending={working}>
          {labels.submit}
        </Button>
      </form>
    </Card>
  );
}
