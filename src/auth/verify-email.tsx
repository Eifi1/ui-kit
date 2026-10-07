import { useEffect, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { CheckCircle2, MailWarning, TimerOff, XCircle } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { useAnnounce } from "../hooks/use-announce";
import { AlertBanner } from "../components/alert-banner";
import { LoadingState } from "../components/loading-state";
import { Button, EmptyState } from "../components/ui";
import { OUTCOME_CLASS, STATUS_HEADING_CLASS, isThenable, useOncePerKey } from "./status-parts";
import { authErrorCode } from "./auth-errors";
import type { AuthHeadingLevel } from "./status-parts";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string the verification page and banner render — the `verifyEmail` namespace.
 *  keksdose's words (`verify_email.*`, and its server's "has expired"). */
export interface VerifyEmailLabels {
  /** The page's heading. */
  title: string;
  /** While the link is redeemed. */
  verifying: string;
  verified: string;
  /** The way on from the page — into the app, or to sign-in. */
  continue: string;
  invalid: string;
  expired: string;
  /** The page was opened without a `token`. */
  noToken: string;
  /** Under `invalid`: why a link stops working. */
  invalidHint: string;
  /** Under a dead link, signed out: where a new one comes from. */
  requestInApp: string;
  /** Under a dead link, signed in, beside "Send again". */
  requestHere: string;
  /** The resend button, on the page and in the banner. */
  resend: string;
  /** The resend button while a just-sent mail cools down, given the seconds left. */
  resendIn: (seconds: number) => string;
  /** Said (and shown) after a resend went out. */
  resent: string;
  /** Said (and shown) after a resend failed. */
  resendError: string;
  /** The banner's message. */
  banner: string;
  /** The banner's ×: it defers, it does not close anything. */
  dismiss: string;
}

export const DEFAULT_VERIFY_EMAIL_LABELS: VerifyEmailLabels = {
  title: "Confirm your email address",
  verifying: "Confirming…",
  verified: "Your email address is confirmed.",
  continue: "Continue",
  invalid: "This confirmation link is not valid",
  expired: "This confirmation link has expired",
  noToken: "This link is missing its confirmation token.",
  invalidHint: "The link may have expired or already been used.",
  requestInApp: "You can request a new one from inside the app.",
  requestHere: "You can request a new one here.",
  resend: "Send again",
  resendIn: (seconds) => `Send again in ${seconds} s`,
  resent: "Confirmation email sent",
  resendError: "Could not send the confirmation email",
  banner: "Please confirm your email address.",
  dismiss: "Not now",
};

/** A minute: long enough that an impatient second click does not mail twice, short
 *  enough that a mail lost to a spam filter can be re-sent without leaving the page. The
 *  server's own limit is the real one (kastlan: 3 an hour per address). */
const DEFAULT_COOLDOWN = 60;

/* ── Resend ──────────────────────────────────────────────────────────────── */

type ResendPhase = "idle" | "sending" | "sent" | "failed";

/**
 * "Send again" with its own memory: busy while the request runs, then — after a mail
 * went out — held for `cooldown` seconds with the countdown on the button, so a second
 * click cannot mail twice and a throttled server is not asked to refuse. A failure frees
 * it at once. The outcome is a polite live region that is always rendered (a region that
 * mounts with its message is often not read), and visible.
 */
function useResend(onResend: (() => Promise<unknown> | void) | undefined, cooldown: number) {
  const [phase, setPhase] = useState<ResendPhase>("idle");
  // The refusal itself, for `describeError` (0.29.1): the server's own sentence — keksdose's
  // per-address throttle, "try again in N minutes" — beats a fixed "could not send".
  const [error, setError] = useState<unknown>(undefined);
  const [remaining, setRemaining] = useState(0);
  const counting = remaining > 0;
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [counting]);

  const sent = () => {
    setPhase("sent");
    setRemaining(Math.max(0, Math.round(cooldown)));
  };
  const send = () => {
    if (!onResend || phase === "sending" || counting) return;
    let result: unknown;
    try {
      result = onResend();
    } catch (e) {
      setError(e);
      setPhase("failed");
      return;
    }
    if (!isThenable(result)) {
      sent();
      return;
    }
    setPhase("sending");
    result.then(sent, (e: unknown) => {
      setError(e);
      setPhase("failed");
    });
  };
  return { phase, remaining, send, error };
}

function ResendButton({
  state,
  labels,
  variant,
}: {
  state: ReturnType<typeof useResend>;
  labels: VerifyEmailLabels;
  variant: "secondary" | "brand";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={variant === "secondary" ? "sm" : undefined}
      onClick={state.send}
      pending={state.phase === "sending"}
      // `disabledReason`, not `disabled`: the button just pressed has the focus, and a
      // native `disabled` would drop it to <body>. The reason is what just happened.
      disabledReason={state.remaining > 0 ? labels.resent : undefined}
    >
      {state.remaining > 0 ? labels.resendIn(state.remaining) : labels.resend}
    </Button>
  );
}

function ResendStatus({
  phase,
  error,
  describeError,
  labels,
  className,
}: {
  phase: ResendPhase;
  error?: unknown;
  describeError?: (error: unknown) => string | undefined;
  labels: VerifyEmailLabels;
  className?: string;
}) {
  const failed = phase === "failed" ? (describeError?.(error) ?? labels.resendError) : "";
  return (
    <span
      role="status"
      className={cn(phase === "failed" ? "text-[var(--danger)]" : "text-[var(--success)]", className)}
    >
      {phase === "sent" ? labels.resent : failed}
    </span>
  );
}

/* ── The page ────────────────────────────────────────────────────────────── */

/** What became of a confirmation link that did not verify. */
export type VerifyEmailFailure = "invalid" | "expired";

/** The default when the app gives no `classifyError`: the coded refusal decides. */
function defaultVerifyFailure(error: unknown): VerifyEmailFailure {
  return authErrorCode(error) === "token_expired" ? "expired" : "invalid";
}

export interface VerifyEmailStatusProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  /** The link's token — the app's `?token=`. Empty: the link was cut short, and the
   *  page says so without asking anyone. */
  token: string;
  /**
   * Redeem it — `POST /auth/verify-email {token}`, once per token, on mount. A POST and
   * not the link's own GET (§10.10): a mail scanner that opens every link must not
   * confirm an address nobody read. Resolve when it verified (an address that already
   * was counts: keksdose's redeem is idempotent); reject with the client's error.
   */
  onVerify: (token: string) => Promise<unknown>;
  /** Which dead end a rejection is. Default: `invalid` for everything — §5.2's servers
   *  answer one `token_invalid`; an app whose server tells expiry apart maps it here. */
  classifyError?: (error: unknown) => VerifyEmailFailure;
  /** 0.29.1: the words for a refused resend — the server's own sentence (a throttle's
   *  "try again in N minutes"), else the kit's `resendError`. */
  describeError?: (error: unknown) => string | undefined;
  /** Someone is signed in on this device: "Continue" goes into the app, and a dead link
   *  offers "Send again" (with `onResend`). */
  signedIn?: boolean;
  /** Send a new confirmation mail (`POST /auth/verify-email/resend`) — offered on a dead
   *  link while signed in. */
  onResend?: () => Promise<unknown> | void;
  /** Seconds "Send again" waits after a mail went out. Default 60; `0` never waits. */
  cooldown?: number;
  /** Where "Continue" goes. Default `/` signed in, `/login` signed out. */
  continueHref?: string;
  /** App content under "confirmed" — keksdose's "Others can now share a budget with you
   *  directly." */
  verifiedContent?: ReactNode;
  /** The heading. Default `labels.title`; `null` draws none, for a page that puts it in
   *  `AuthLayout`'s `title` instead. */
  title?: ReactNode;
  /** The heading's level. Default `h2`, under the page's `h1`. */
  headingAs?: AuthHeadingLevel;
  labels?: Partial<VerifyEmailLabels>;
}

type VerifyOutcome = "verified" | VerifyEmailFailure;

/**
 * Redeem an email-confirmation link (`/verify-email?token=…`, docs/auth-harmonization.md
 * §7) — keksdose's `VerifyEmailPage` (features/auth/verify-email-page.tsx), with
 * kastlan's outcome blocks and its separate "expired".
 *
 * Opened from an inbox, often in a browser with no session, so the token is the only
 * credential and the page renders signed-out. It redeems once per token on mount
 * (StrictMode's double effect included — the token is single-use) and shows one of:
 * confirmed; not valid; expired; or the link had no token at all. Verification gates
 * nothing (§2.8), so every outcome ends on "Continue". Signed in, a dead link also
 * offers "Send again", which waits `cooldown` seconds after a mail went out.
 *
 * The outcome replaces the spinner, which says nothing to a screen reader on its own,
 * so it is also announced.
 */
export function VerifyEmailStatus({
  token,
  onVerify,
  classifyError,
  describeError,
  signedIn = false,
  onResend,
  cooldown = DEFAULT_COOLDOWN,
  continueHref,
  verifiedContent,
  title,
  headingAs: Heading = "h2",
  labels: labelsProp,
  className,
  ...rest
}: VerifyEmailStatusProps) {
  const labels = useKitLabels("verifyEmail", DEFAULT_VERIFY_EMAIL_LABELS, labelsProp);
  const [settled, setSettled] = useState<{ token: string; outcome: VerifyOutcome } | null>(null);
  const outcome: VerifyOutcome | "verifying" =
    token === "" ? "invalid" : settled?.token === token ? settled.outcome : "verifying";
  const { announce, regionProps } = useAnnounce();
  const resend = useResend(onResend, cooldown);

  useOncePerKey(token === "" ? null : token, onVerify, (key, result) => {
    // Without a classifier, the coded refusal decides (0.29.1): `token_expired` is
    // "expired", anything else "invalid".
    const next: VerifyOutcome = result.ok
      ? "verified"
      : (classifyError ?? defaultVerifyFailure)(result.error);
    setSettled({ token: key, outcome: next });
    announce(labels[next]);
  });

  const href = continueHref ?? (signedIn ? "/" : "/login");
  // `replace`: the token is spent, so Back must not land on this page again (keksdose F1).
  const continueButton = (
    <Button href={href} replace variant={outcome === "verified" ? "brand" : "secondary"}>
      {labels.continue}
    </Button>
  );
  const canResend = signedIn && onResend !== undefined;

  let body: ReactNode;
  if (outcome === "verifying") {
    body = <LoadingState size="sm" label={labels.verifying} />;
  } else if (outcome === "verified") {
    body = (
      <EmptyState
        tone="success"
        icon={<CheckCircle2 />}
        title={labels.verified}
        hint={verifiedContent}
        action={continueButton}
        className={OUTCOME_CLASS}
      />
    );
  } else {
    const hint = (
      <>
        {outcome === "invalid" && token !== "" ? `${labels.invalidHint} ` : ""}
        {canResend ? labels.requestHere : labels.requestInApp}
      </>
    );
    body = (
      <EmptyState
        tone="danger"
        icon={outcome === "expired" ? <TimerOff /> : <XCircle />}
        title={token === "" ? labels.noToken : labels[outcome]}
        hint={hint}
        action={
          <>
            {canResend && <ResendButton state={resend} labels={labels} variant="brand" />}
            {continueButton}
          </>
        }
        className={OUTCOME_CLASS}
      />
    );
  }

  return (
    <div
      {...rest}
      data-state={outcome}
      aria-busy={outcome === "verifying" || undefined}
      className={cn("space-y-3", className)}
    >
      {title === null ? null : <Heading className={STATUS_HEADING_CLASS}>{title ?? labels.title}</Heading>}
      {body}
      {canResend && (
        <ResendStatus
          phase={resend.phase}
          error={resend.error}
          describeError={describeError}
          labels={labels}
          className="block text-center text-xs"
        />
      )}
      {/* Rendered from the start, so the outcome is read when it arrives. */}
      <div {...regionProps} />
    </div>
  );
}

/* ── The banner ──────────────────────────────────────────────────────────── */

export interface EmailVerificationBannerProps {
  /** Send a new confirmation mail (`POST /auth/verify-email/resend`). Resolve when it
   *  went out; reject and the banner says it could not. */
  onResend: () => Promise<unknown> | void;
  /** 0.29.1: the words for a refused resend — the server's own sentence, else the kit's. */
  describeError?: (error: unknown) => string | undefined;
  /** Seconds "Send again" waits after a mail went out. Default 60; `0` never waits. */
  cooldown?: number;
  /** The ×, "Not now". The banner does not hide itself: the app stops rendering it —
   *  keksdose for the rest of the session. Left out, no ×. */
  onDismiss?: () => void;
  /** `strip` (default): keksdose's band across the top of the shell. `box`: kastlan's
   *  callout inside the page. */
  variant?: "strip" | "box";
  /** The app's sentence after the kit's — keksdose's "Until you do, nobody can share a
   *  budget with you directly." */
  children?: ReactNode;
  className?: string;
  labels?: Partial<VerifyEmailLabels>;
}

/**
 * The nudge for a signed-in account whose address is not confirmed — keksdose's
 * `VerifyEmailBanner` (features/auth/verify-email-banner.tsx), kastlan's copy of it.
 *
 * A prompt, not a wall: verification gates nothing (§2.8). The app renders it while
 * `/auth/me` says `email_verified: false`, and stops when the user dismisses it or the
 * page above confirms the address. "Send again" waits `cooldown` seconds after a mail
 * went out (the button says how long), and its outcome is written into the banner and
 * read out — no toast needed.
 */
export function EmailVerificationBanner({
  onResend,
  describeError,
  cooldown = DEFAULT_COOLDOWN,
  onDismiss,
  variant = "strip",
  children,
  className,
  labels: labelsProp,
}: EmailVerificationBannerProps) {
  const labels = useKitLabels("verifyEmail", DEFAULT_VERIFY_EMAIL_LABELS, labelsProp);
  const resend = useResend(onResend, cooldown);
  return (
    <AlertBanner
      tone="warning"
      variant={variant}
      icon={<MailWarning />}
      action={<ResendButton state={resend} labels={labels} variant="secondary" />}
      onDismiss={onDismiss}
      dismissLabel={onDismiss ? labels.dismiss : undefined}
      className={className}
    >
      {labels.banner}
      {children != null && children !== false && <> {children}</>}{" "}
      <ResendStatus
        phase={resend.phase}
        error={resend.error}
        describeError={describeError}
        labels={labels}
        className="font-medium"
      />
    </AlertBanner>
  );
}
