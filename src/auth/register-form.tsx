import { useEffect, useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, FormEvent, ReactNode } from "react";

import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { KIT_LANGUAGES, resolveLanguage } from "../i18n/languages";
import type { KitLanguageCode } from "../i18n/languages";
import { cn } from "../lib/cn";
import { AlertBanner } from "../components/alert-banner";
import { hasMessage } from "../components/choice-parts";
import { LanguageSelect } from "../components/language-select";
import { LegalAcceptCheckbox } from "../components/legal-page";
import { TextLink } from "../components/text-link";
import { Button, Input } from "../components/ui";
import { authErrorCode, englishRateLimited, isRateLimited, retryAfterSeconds } from "./auth-errors";
import { emailParts, taggedEmail } from "./email-tag";
import { newPasswordProblem, personNameOk, PERSON_NAME_MAX_LENGTH } from "./form-rules";
import { NewPasswordFields } from "./new-password-fields";

/** What `RegisterForm` hands `onSubmit` — the core of `POST /auth/register` (§4.2). The
 *  app adds its own fields (kastlan's company, keksdose's currency) and the
 *  `invite_token` it read from the URL. */
export interface RegisterValues {
  /** Trimmed, 1–120 characters. */
  firstName: string;
  /** Trimmed, 1–120 characters. */
  lastName: string;
  /** Trimmed. Lower-casing is the server's (§3.1); a tag is never stripped (§4.5). */
  email: string;
  /** As typed: at least 8 characters, at most 72 bytes. */
  password: string;
  /** The language picked — one of `languages` — for every mail to the user (§3.1). */
  locale: KitLanguageCode;
}

/**
 * Every string `RegisterForm` renders — the `register` namespace of `<UiKitProvider
 * labels>`, overridable per instance through `labels`. keksdose's words where it has
 * them. The terms checkbox speaks `legal.accept`, the strength meter `passwordStrength`.
 */
export interface RegisterLabels {
  firstName: string;
  lastName: string;
  email: string;
  /** The address-tag button (§4.5), given the exact address it would use — and, with an
   *  invitation, the button back to the invited address. */
  emailTagUse: (address: string) => string;
  /** The line after the address-tag button. */
  emailTagHint: string;
  /** Under an invited (read-only) email field. */
  invitedEmailHint: string;
  /** Once the invitee took the tagged address: it is not the invited one, so it is
   *  confirmed by a mail of its own (§4.3). */
  invitedTagNote: string;
  password: string;
  confirmPassword: string;
  passwordMismatch: string;
  language: string;
  /** The submit button. */
  submit: string;
  /** Before the link to `signInHref`. */
  haveAccount: string;
  /** The link to `signInHref`. */
  signIn: string;
  /** `email_taken`, under the email field. */
  emailTaken: string;
  /** `registration_closed` — the gate refused the address (§4.3). */
  registrationClosed: string;
  /** `invitation_invalid` — the invitation link is unknown or spent. */
  invitationInvalid: string;
  /** `invitation_expired`. */
  invitationExpired: string;
  /** Any other failure. */
  failed: string;
  /** 0.30.0: the request was throttled — HTTP 429 ({@link isRateLimited}) — given the
   *  `Retry-After` wait in seconds, or `undefined` without one. OPTIONAL, like every key
   *  added to a shipped interface (an annotated call site must keep compiling); the
   *  provider's `register`, then English, fill it. */
  rateLimited?: (seconds?: number) => string;
}

/** `Required`: every key, the 0.30 one included, has its English here. */
export const DEFAULT_REGISTER_LABELS: Required<RegisterLabels> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  emailTagUse: (address) => `Use ${address}`,
  emailTagHint:
    "Many providers deliver name+tag@… to the same inbox, so mail from this app is easy to filter and trace. Check yours does before you rely on it: you would sign in with the tagged address.",
  invitedEmailHint: "The address your invitation was sent to.",
  invitedTagNote: "The tagged address gets a confirmation mail of its own.",
  password: "Password",
  confirmPassword: "Repeat password",
  passwordMismatch: "The passwords don't match.",
  language: "Language",
  submit: "Create account",
  haveAccount: "Already have an account?",
  signIn: "Sign in",
  emailTaken: "An account with this email address already exists.",
  registrationClosed: "New accounts are by invitation only. Ask the operator to invite your email address.",
  invitationInvalid: "This invitation link is not valid.",
  invitationExpired: "This invitation has expired. Ask for a new one.",
  failed: "Registration failed. Please try again.",
  rateLimited: englishRateLimited,
};

export interface RegisterFormProps extends Omit<ComponentPropsWithoutRef<"div">, "onSubmit" | "children"> {
  /**
   * The form was submitted with everything filled in. Send it (`POST /auth/register`,
   * §4.2) and resolve once the user is signed in, or reject with the client's error:
   * `email_taken` shows under the email field, `registration_closed` and the
   * invitation codes above the button, anything else as "Registration failed". The form
   * never sends a request itself (§8): keksdose must see the password on its way.
   *
   * On resolve the form stays busy while the app navigates.
   */
  onSubmit: (values: RegisterValues) => Promise<unknown>;
  /**
   * The app's address tag (`"kastlan"`, §4.5). Once the email is plausible, a button
   * under it offers the tagged address — "Use ada+kastlan@example.com" — with a line on
   * why; one click puts it in the field. Never applied on its own. Left out, no offer.
   */
  emailTag?: string;
  /**
   * The address of the invitation this sign-up comes from (§4.4): the field starts with
   * it and is read-only. With `emailTag`, the invitee may still take the tagged form of
   * it — the server accepts exactly that variant — and go back.
   */
  invitedEmail?: string;
  /**
   * 0.29.1: an address to start with that stays EDITABLE, with the `+tag` suggestion still
   * offered — for a link anyone can build (keksdose's token-free `/register?email=…`
   * beta link, kept while an app moves to invitations). Unlike `invitedEmail` it proves
   * nothing, so it locks nothing. `invitedEmail` wins when both are given.
   */
  defaultEmail?: string;
  /**
   * The language field's value — controlled. Pass the app's UI language
   * (`i18n.resolvedLanguage`) with `onLocaleChange` switching it, and the field IS the
   * app's language switch, with no copy of its own to drift from a second switcher on
   * the page (keksdose's register page has one in its header). Any tag; it shows (and
   * submits) the offered code it resolves to. Left out, the form keeps its own, starting
   * from `defaultLocale`, else the provider's language, else the browser's.
   */
  locale?: string;
  /** The uncontrolled language field's start value. */
  defaultLocale?: string;
  /** A language was picked. */
  onLocaleChange?: (code: KitLanguageCode) => void;
  /** The languages to offer, in order. Default all seven. */
  languages?: readonly KitLanguageCode[];
  /**
   * The app's own language field in place of the kit's select — keksdose's
   * `LanguageSetting` bound to its i18n. `null` draws none (an app with one language);
   * the submitted `locale` is then `locale`'s.
   */
  languageField?: ReactNode;
  /** Above the form — keksdose's closed-beta banner. */
  aboveForm?: ReactNode;
  /** Under the email field and its tag offer — an app's own hint. */
  underEmail?: ReactNode;
  /** The app's sign-up fields (§4.1 item 7): kastlan's Company, keksdose's reporting
   *  currency. Their values are the app's; say whether they are complete with
   *  `appFieldsComplete`. */
  appFields?: ReactNode;
  /** After the app fields, before the terms — keksdose's privacy-mode note. */
  afterFields?: ReactNode;
  /** Whether the app fields are filled in as required — kastlan's Company without an
   *  invitation. The submit waits for it. Default `true`. */
  appFieldsComplete?: boolean;
  /** The terms checkbox's links. Default `/terms` and `/privacy`. */
  termsHref?: string;
  privacyHref?: string;
  /** "Already have an account? Sign in" goes here — `/login`. Left out, no line. */
  signInHref?: string;
  /** The app's own words for a failure the kit cannot know (the device offline, a
   *  throttle with its wait), or `undefined` for the kit's. Asked first, for every
   *  failure; a bare `429` needs none since 0.30.0 — the kit says `rateLimited`. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: Partial<RegisterLabels>;
}

const ALL_CODES: readonly KitLanguageCode[] = KIT_LANGUAGES.map((language) => language.code);

/** The browser's languages, in its order — absent outside a browser. */
function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

type Busy = "sending" | "done" | null;

/**
 * Sign-up for every app (docs/auth-harmonization.md §4.1, §8): first and last name,
 * email with the address-tag offer, password with the strength meter and its
 * confirmation, language, the app's own fields in a slot, and the terms. keksdose's
 * `RegisterPage` (features/auth/register-page.tsx) with its slots made props.
 *
 * **It never sends a request.** `onSubmit` gets the values; what the request carries
 * besides them (kastlan's company, keksdose's currency, the `invite_token`) is the
 * app's, as are the role and the associations, which never come from the form (§4.3).
 *
 * **The submit waits for a complete form**: both names (1–120 characters after
 * trimming), a plausible address, a password of at least 8 characters and at most 72
 * bytes, the same password again, the terms ticked, and `appFieldsComplete`. Nothing
 * else is a rule — the strength checklist is advice (keksdose #124), and the kit adds
 * none of its own (§8). So there is never a failed attempt for a missing field, and no
 * field error to show for one.
 *
 * **The address tag** (§4.5) is offered under the email field as one click with the
 * exact result on the button, never applied: sub-addressing is a convention the
 * receiving server may or may not implement, and a silent rewrite would send the
 * verification mail down a path nobody checked. With an invitation the field is fixed
 * to the invited address; the invitee may still take its tagged form, and is told it
 * will be confirmed by a mail of its own (§4.3).
 *
 * **Refusals** are read by code ({@link authErrorCode}): `email_taken` under the email
 * field, which takes the focus; `registration_closed`, `invitation_invalid` and
 * `invitation_expired` above the button; anything else as "Registration failed", unless
 * `describeError` has the app's words.
 *
 * Laid out for a 390 px phone: the names sit side by side only where the form is at
 * least 20rem wide (a container query), which the narrow `AuthLayout` card is on a
 * desktop and a phone is not.
 */
export function RegisterForm({
  onSubmit,
  emailTag,
  invitedEmail,
  defaultEmail,
  locale: localeProp,
  defaultLocale,
  onLocaleChange,
  languages = ALL_CODES,
  languageField,
  aboveForm,
  underEmail,
  appFields,
  afterFields,
  appFieldsComplete = true,
  termsHref,
  privacyHref,
  signInHref,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: RegisterFormProps) {
  const labels = useKitLabels("register", DEFAULT_REGISTER_LABELS, labelsProp);
  const kitLocale = useKitLocale();
  const invited = invitedEmail !== undefined;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(invitedEmail ?? defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ownLocale, setOwnLocale] = useState<string>(
    () => defaultLocale ?? resolveLanguage([kitLocale, ...browserLanguages()], languages),
  );
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  // `email_taken` belongs to the address it was answered for; another one clears it.
  const [taken, setTaken] = useState<string | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const tagHintId = useId();

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // What the field shows is what is submitted: the offered code the value resolves to.
  const locale = resolveLanguage([localeProp ?? ownLocale], languages);
  const changeLocale = (code: KitLanguageCode) => {
    if (localeProp === undefined) setOwnLocale(code);
    onLocaleChange?.(code);
  };

  const working = busy !== null;
  const suggestion = emailTag ? taggedEmail(email, emailTag) : null;
  // The invitee took the tagged address: offer the way back to the invited one.
  const backToInvited =
    invitedEmail !== undefined && email.trim() !== invitedEmail.trim() ? invitedEmail.trim() : null;
  const canSubmit =
    personNameOk(firstName) &&
    personNameOk(lastName) &&
    emailParts(email) !== null &&
    newPasswordProblem(password, confirm) === null &&
    accepted &&
    appFieldsComplete;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || working) return;
    const values: RegisterValues = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      locale,
    };
    setBusy("sending");
    setFailure(null);
    setTaken(null);
    let result: Promise<unknown>;
    try {
      result = Promise.resolve(onSubmit(values));
    } catch (error) {
      result = Promise.reject(error);
    }
    result.then(
      () => {
        if (mounted.current) setBusy("done");
      },
      (error: unknown) => {
        if (!mounted.current) return;
        setBusy(null);
        const own = describeError?.(error);
        const code = authErrorCode(error);
        if (code === "email_taken" && !hasMessage(own)) {
          setTaken(values.email);
          emailRef.current?.focus();
          return;
        }
        setFailure(
          hasMessage(own)
            ? own
            : isRateLimited(error)
              ? (labels.rateLimited ?? DEFAULT_REGISTER_LABELS.rateLimited)(retryAfterSeconds(error))
              : code === "registration_closed"
              ? labels.registrationClosed
              : code === "invitation_invalid"
                ? labels.invitationInvalid
                : code === "invitation_expired"
                  ? labels.invitationExpired
                  : labels.failed,
        );
      },
    );
  };

  return (
    <div {...rest} className={cn("@container space-y-4", className)}>
      {aboveForm}
      <form className="space-y-3" noValidate onSubmit={submit}>
        <div className="grid gap-3 @xs:grid-cols-2">
          <Input
            name="given-name"
            autoComplete="given-name"
            label={labels.firstName}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={PERSON_NAME_MAX_LENGTH}
            readOnly={working}
            required
          />
          <Input
            name="family-name"
            autoComplete="family-name"
            label={labels.lastName}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={PERSON_NAME_MAX_LENGTH}
            readOnly={working}
            required
          />
        </div>

        <div>
          <Input
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="email"
            label={labels.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={invited || working}
            hint={invited ? labels.invitedEmailHint : undefined}
            error={taken !== null && taken === email.trim() ? labels.emailTaken : undefined}
            required
          />
          {/* The tag, offered rather than applied (§4.5): one click, the exact address
              on the button, reversible by typing — or, invited, by the button back. */}
          {suggestion && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 align-baseline"
                disabled={working}
                aria-describedby={tagHintId}
                onClick={() => setEmail(suggestion)}
              >
                {labels.emailTagUse(suggestion)}
              </Button>{" "}
              <span id={tagHintId}>{labels.emailTagHint}</span>
            </p>
          )}
          {backToInvited !== null && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              <span>{labels.invitedTagNote}</span>{" "}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 align-baseline"
                disabled={working}
                onClick={() => setEmail(backToInvited)}
              >
                {labels.emailTagUse(backToInvited)}
              </Button>
            </p>
          )}
          {underEmail}
        </div>

        <NewPasswordFields
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
          busy={working}
          text={{ password: labels.password, confirm: labels.confirmPassword, mismatch: labels.passwordMismatch }}
        />

        {languageField === undefined ? (
          <LanguageSelect
            name="locale"
            label={labels.language}
            value={locale}
            codes={languages}
            onChange={changeLocale}
            disabled={working}
          />
        ) : (
          languageField
        )}

        {appFields}
        {afterFields}

        {/* The kit's terms checkbox (legal contract §3.4). Never an error: an unticked
            box keeps the submit disabled, so there is no failed attempt to explain. */}
        <LegalAcceptCheckbox
          checked={accepted}
          onCheckedChange={setAccepted}
          termsHref={termsHref}
          privacyHref={privacyHref}
          disabled={working}
        />

        {hasMessage(failure) && (
          <AlertBanner tone="danger" size="sm" role="alert">
            {failure}
          </AlertBanner>
        )}

        <Button type="submit" className="w-full" disabled={!working && !canSubmit} pending={working}>
          {labels.submit}
        </Button>
      </form>
      {signInHref !== undefined && (
        <p className="text-center text-sm text-[var(--text-secondary)]">
          {labels.haveAccount}{" "}
          <TextLink href={signInHref} tone="primary">
            {labels.signIn}
          </TextLink>
        </p>
      )}
    </div>
  );
}
