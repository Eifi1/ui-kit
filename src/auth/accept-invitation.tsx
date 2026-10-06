import { useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { CheckCircle2, LogIn, TimerOff, XCircle } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { useAnnounce } from "../hooks/use-announce";
import { LoadingState } from "../components/loading-state";
import { Button, EmptyState } from "../components/ui";
import { authErrorCode } from "./auth-errors";
import { OUTCOME_CLASS, STATUS_HEADING_CLASS, useOncePerKey } from "./status-parts";
import type { AuthHeadingLevel } from "./status-parts";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string the page renders — the `acceptInvitation` namespace. keksdose's words
 *  where its `/join` page has them (`budget_share.join*`). */
export interface AcceptInvitationLabels {
  /** The heading. */
  title: string;
  /** While the invitation is accepted. */
  accepting: string;
  /** Accepted, when the app did not say into what. */
  accepted: string;
  /** Accepted, given what it attached the account to — a company, a team, a budget. */
  joined: (name: string) => string;
  /** Into the app, from every outcome but "sign in first". */
  continue: string;
  /** The token is unknown, spent, or for another address. */
  invalid: string;
  expired: string;
  /** The page was opened without a `token`. */
  noToken: string;
  /** Under `invalid` and `expired`: an invitation is re-sent as a new one (§4.4). */
  askAgain: string;
  /** Nobody is signed in: an existing account accepts after sign-in (§4.4). */
  signInFirst: string;
  /** Under it. */
  signInHint: string;
  signIn: string;
  /** Beside "Sign in", with `registerHref`. */
  register: string;
}

export const DEFAULT_ACCEPT_INVITATION_LABELS: AcceptInvitationLabels = {
  title: "Accept invitation",
  accepting: "Joining…",
  accepted: "Invitation accepted.",
  joined: (name) => `You’ve joined ${name}.`,
  continue: "Continue",
  invalid: "Could not join with this link",
  expired: "This invitation has expired",
  noToken: "This link is missing its invite token.",
  askAgain: "Ask the person who invited you to send a new invitation.",
  signInFirst: "Sign in to accept this invitation",
  signInHint: "Use the account the invitation was sent to.",
  signIn: "Sign in",
  register: "Create account",
};

/* ── Types ───────────────────────────────────────────────────────────────── */

/** What `onAccept` may resolve with. */
export interface AcceptInvitationResult {
  /** What the invitation attached the account to, by name — "Example Property Ltd",
   *  "Team North", a budget. Said in the confirmation. */
  name?: string;
}

/** What became of an invitation that was not accepted. `signIn`: the server wants a
 *  session first (a `401`), which `signedIn` did not know about. */
export type AcceptInvitationFailure = "invalid" | "expired" | "signIn";

type Outcome = "accepted" | AcceptInvitationFailure;

export interface AcceptInvitationProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  /** The invitation's token — the app's `?invite=` / `?token=`. Empty: the link was cut
   *  short, and the page says so without asking anyone. */
  token: string;
  /** Someone is signed in on this device. Until then the page asks for a sign-in and
   *  sends nothing: accepting attaches the invitation to the SIGNED-IN account. */
  signedIn: boolean;
  /**
   * Accept it — `POST /auth/invitations/accept {token}`, once per token, as soon as
   * someone is signed in. Resolve (with what it attached the account to, if the app
   * knows); reject with the client's error.
   */
  onAccept: (token: string) => Promise<AcceptInvitationResult | void | undefined>;
  /** Which dead end a rejection is. Default: `invitation_expired` is `expired`,
   *  anything else `invalid` (§5.2's codes). Map a `401` to `signIn` here. */
  classifyError?: (error: unknown) => AcceptInvitationFailure;
  /** "Continue" — into the app. Default `/`. */
  continueHref?: string;
  /** "Sign in" — the app's `/login`, with a way back here (`?next=…`). Default
   *  `/login`. */
  signInHref?: string;
  /** "Create account" beside "Sign in", for an invitation that may lead to a new
   *  account — the app's `/register?invite=…`. Left out, none. */
  registerHref?: string;
  /** The heading. Default `labels.title`; `null` draws none, for a page that puts it in
   *  `AuthLayout`'s `title` instead. */
  title?: ReactNode;
  /** The heading's level. Default `h2`, under the page's `h1`. */
  headingAs?: AuthHeadingLevel;
  labels?: Partial<AcceptInvitationLabels>;
}

/**
 * Accept an invitation with an EXISTING account (docs/auth-harmonization.md §4.4): the
 * link leads here, the person signs in if they are not, and the app attaches the
 * invitation — a kastlan user joining a second company, a Kurvenschmiede member a team,
 * a keksdose user a shared budget. A new address never needs this page: its link opens
 * the sign-up form, which spends the invitation itself.
 *
 * keksdose's `JoinSharePage` (features/budgets/join-page.tsx) is the model: it accepts
 * on load, once (the token is single-use, and StrictMode's double effect would send it
 * twice), and shows the outcome where its spinner was. The outcomes: accepted, with the
 * way into the app; not valid; expired (both say to ask for a new invitation, since
 * "resend" mints a new token); or "sign in first", with nothing sent. "Continue" REPLACES
 * this page in the history: the token is spent, so Back must not land here again.
 */
export function AcceptInvitation({
  token,
  signedIn,
  onAccept,
  classifyError,
  continueHref = "/",
  signInHref = "/login",
  registerHref,
  title,
  headingAs: Heading = "h2",
  labels: labelsProp,
  className,
  ...rest
}: AcceptInvitationProps) {
  const labels = useKitLabels("acceptInvitation", DEFAULT_ACCEPT_INVITATION_LABELS, labelsProp);
  const [settled, setSettled] = useState<{ token: string; outcome: Outcome; name?: string } | null>(null);
  const { announce, regionProps } = useAnnounce();

  useOncePerKey(token !== "" && signedIn ? token : null, onAccept, (key, result) => {
    if (result.ok) {
      const name = result.value?.name?.trim() || undefined;
      setSettled({ token: key, outcome: "accepted", name });
      announce(name ? labels.joined(name) : labels.accepted);
      return;
    }
    const failure: AcceptInvitationFailure =
      classifyError?.(result.error) ?? (authErrorCode(result.error) === "invitation_expired" ? "expired" : "invalid");
    setSettled({ token: key, outcome: failure });
    announce(failure === "signIn" ? labels.signInFirst : labels[failure]);
  });

  const outcome: Outcome | "accepting" =
    token === ""
      ? "invalid"
      : settled?.token === token
        ? settled.outcome
        : signedIn
          ? "accepting"
          : "signIn";

  const continueButton = (variant: "brand" | "secondary") => (
    <Button href={continueHref} replace variant={variant}>
      {labels.continue}
    </Button>
  );

  let body: ReactNode;
  if (outcome === "accepting") {
    body = <LoadingState size="sm" label={labels.accepting} />;
  } else if (outcome === "accepted") {
    body = (
      <EmptyState
        tone="success"
        icon={<CheckCircle2 />}
        title={settled?.name ? labels.joined(settled.name) : labels.accepted}
        action={continueButton("brand")}
        className={OUTCOME_CLASS}
      />
    );
  } else if (outcome === "signIn") {
    body = (
      <EmptyState
        icon={<LogIn />}
        title={labels.signInFirst}
        hint={labels.signInHint}
        action={
          <>
            <Button href={signInHref} variant="brand">
              {labels.signIn}
            </Button>
            {registerHref !== undefined && (
              <Button href={registerHref} variant="secondary">
                {labels.register}
              </Button>
            )}
          </>
        }
        className={OUTCOME_CLASS}
      />
    );
  } else {
    body = (
      <EmptyState
        tone="danger"
        icon={outcome === "expired" ? <TimerOff /> : <XCircle />}
        title={token === "" ? labels.noToken : labels[outcome]}
        hint={labels.askAgain}
        action={signedIn ? continueButton("secondary") : undefined}
        className={OUTCOME_CLASS}
      />
    );
  }

  return (
    <div
      {...rest}
      data-state={outcome}
      aria-busy={outcome === "accepting" || undefined}
      className={cn("space-y-3", className)}
    >
      {title === null ? null : <Heading className={STATUS_HEADING_CLASS}>{title ?? labels.title}</Heading>}
      {body}
      {/* Rendered from the start, so the outcome is read when it arrives. */}
      <div {...regionProps} />
    </div>
  );
}
