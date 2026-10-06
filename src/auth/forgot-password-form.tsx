import { useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, FormEvent, ReactNode } from "react";
import { MailCheck } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { AlertBanner } from "../components/alert-banner";
import { TextLink } from "../components/text-link";
import { Button, Input } from "../components/ui";
import { FORM_HEADING_CLASS, INTRO_CLASS, OutcomeMessage, isThenable, useFocusWhen } from "./status-parts";
import type { AuthHeadingLevel } from "./status-parts";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string the form renders — the `forgotPassword` namespace. keksdose's words
 *  (`auth.forgot.*`), which kastlan took over unchanged. */
export interface ForgotPasswordLabels {
  /** The heading. */
  title: string;
  /** Under the heading, before the field. */
  intro: string;
  /** The email field's label. */
  email: string;
  submit: string;
  /** The one answer, whatever the server knows — given the address as typed. */
  sent: (email: string) => string;
  /** Under it: how long the link lives, and where else to look. */
  sentHint: string;
  /** The link back to the sign-in page, on both states. */
  backToSignIn: string;
  /** A request that did not go through: a throttle, an outage. Never "unknown
   *  address" — the endpoint does not say. */
  error: string;
}

export const DEFAULT_FORGOT_PASSWORD_LABELS: ForgotPasswordLabels = {
  title: "Forgot password",
  intro: "Enter your account’s email address. We’ll send you a link to choose a new password.",
  email: "Email",
  submit: "Send the link",
  sent: (email) => `If an account exists for ${email}, the link is on its way.`,
  sentHint: "The link is valid for one hour and works exactly once. Check your spam folder too.",
  backToSignIn: "Back to sign in",
  error: "The request failed. Please try again later.",
};

/* ── The form ────────────────────────────────────────────────────────────── */

export interface ForgotPasswordFormProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onSubmit" | "children" | "title"> {
  /**
   * The address was submitted, trimmed: send `POST /auth/password-reset/request`.
   * Resolve when the server answered — whatever it answered: it is `204` whether or not
   * an account exists. Reject only when the request did not go through (a throttle, an
   * outage); the form then stays, with the address, and says so. The form never sends a
   * request itself (§8).
   */
  onSubmit: (email: string) => Promise<unknown> | void;
  /** "Back to sign in" — the app's `/login`. Default `/login`. */
  signInHref?: string;
  /** The field's start value — the address the sign-in form already had, so someone
   *  whose password just failed need not type it twice. */
  defaultEmail?: string;
  /**
   * The app's words for a failed request (a `429`: "Too many requests — try again in
   * an hour"), or `undefined` for the kit's `error`. The same hook as `SignInForm`'s.
   */
  describeError?: (error: unknown) => ReactNode | undefined;
  /** App content under the intro — a notice, a support address. */
  formContent?: ReactNode;
  /** The heading. Default `labels.title`; `null` draws none, for a page that puts it
   *  in `AuthLayout`'s `title` instead. */
  title?: ReactNode;
  /** The heading's level. Default `h2`, under the page's `h1`. */
  headingAs?: AuthHeadingLevel;
  labels?: Partial<ForgotPasswordLabels>;
}

/**
 * "I forgot my password" for every app (docs/auth-harmonization.md §7): one field, then
 * the same sentence whatever the answer — keksdose's `ForgotPasswordPage`
 * (features/auth/forgot-password-page.tsx), kastlan's copy of it, as one component.
 *
 * **It always ends on the same message**: "If an account exists for …, the link is on
 * its way." The server answers `204` whether or not the address has an account — so the
 * page cannot be used to find out who has one — and the page must not undo that by
 * saying more than the server knows. Worded as a promise ("we sent you a link"), a typo
 * would look like a mail-delivery problem and send the person waiting instead of trying
 * their other address (keksdose #198). The address shown is the one they typed, so a
 * typo is visible.
 *
 * The only failure it can show is a request that did not go through (throttled, the
 * server down), never "unknown address". §4.5's fallback to a tagged address
 * (`you+kastlan@…` when `you@…` has no account) is the server's and changes nothing here.
 *
 * The submit is not disabled while the field is empty — a browser that autofills
 * withholds the value until the first interaction, and a disabled button would swallow
 * that first click; the field's own `required` answers an empty submit instead. After a
 * submit the confirmation takes focus, because the button that had it is gone with the
 * form.
 */
export function ForgotPasswordForm({
  onSubmit,
  signInHref = "/login",
  defaultEmail = "",
  describeError,
  formContent,
  title,
  headingAs: Heading = "h2",
  labels: labelsProp,
  className,
  ...rest
}: ForgotPasswordFormProps) {
  const labels = useKitLabels("forgotPassword", DEFAULT_FORGOT_PASSWORD_LABELS, labelsProp);
  const [email, setEmail] = useState(defaultEmail);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<ReactNode>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const headingId = useId();
  const sentRef = useRef<HTMLDivElement>(null);
  useFocusWhen(sentTo !== null, sentRef);

  const heading =
    title === null ? null : (
      <Heading id={headingId} className={FORM_HEADING_CLASS}>
        {title ?? labels.title}
      </Heading>
    );
  const back = (
    <p className="text-center text-sm">
      <TextLink href={signInHref} tone="primary">
        {labels.backToSignIn}
      </TextLink>
    </p>
  );

  if (sentTo !== null) {
    return (
      <div {...rest} data-state="sent" className={cn("space-y-3", className)}>
        {heading}
        <OutcomeMessage icon={<MailCheck className="text-[var(--success)]" />} focusRef={sentRef}>
          <p className={INTRO_CLASS}>{labels.sent(sentTo)}</p>
          <p className="text-xs text-[var(--text-muted)]">{labels.sentHint}</p>
        </OutcomeMessage>
        {back}
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (pending || address === "") return;
    setFailure(null);
    let result: unknown;
    try {
      result = onSubmit(address);
    } catch (error) {
      setFailure(describeError?.(error) ?? labels.error);
      return;
    }
    if (!isThenable(result)) {
      setSentTo(address);
      return;
    }
    setPending(true);
    result.then(
      () => {
        setPending(false);
        setSentTo(address);
      },
      (error: unknown) => {
        setPending(false);
        setFailure(describeError?.(error) ?? labels.error);
      },
    );
  };

  return (
    <div {...rest} data-state="form" className={cn("space-y-3", className)}>
      <form
        className="space-y-3"
        aria-labelledby={title === null ? undefined : headingId}
        onSubmit={submit}
      >
        {heading}
        <p className={INTRO_CLASS}>{labels.intro}</p>
        {formContent}
        <Input
          type="email"
          name="email"
          autoComplete="email"
          label={labels.email}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (failure) setFailure(null);
          }}
          readOnly={pending}
          required
        />
        {failure != null && (
          <AlertBanner tone="danger" size="sm" role="alert">
            {failure}
          </AlertBanner>
        )}
        <Button type="submit" className="w-full" pending={pending}>
          {labels.submit}
        </Button>
      </form>
      {back}
    </div>
  );
}
