import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AcceptInvitation } from "../auth/accept-invitation";
import { DEFAULT_ACCEPT_INVITATION_LABELS } from "../auth/accept-invitation-labels";
import { isAuthError } from "../auth/auth-errors";
import { ForgotPasswordForm } from "../auth/forgot-password-form";
import { RegisterForm } from "../auth/register-form";
import { DEFAULT_REGISTER_LABELS } from "../auth/register-form-labels";
import { ResetPasswordForm } from "../auth/reset-password-form";
import { SignInForm, type SignInAnswer } from "../auth/sign-in-form";
import { DEFAULT_SIGN_IN_LABELS } from "../auth/sign-in-form-labels";
import { DEFAULT_DELETE_ACCOUNT_LABELS } from "../account/delete-account-setting-labels";
import { VerifyEmailStatus } from "../auth/verify-email";
import { DEFAULT_FORGOT_PASSWORD_LABELS } from "../auth/forgot-password-form-labels";
import { DEFAULT_RESET_PASSWORD_LABELS } from "../auth/reset-password-form-labels";
import { DEFAULT_VERIFY_EMAIL_LABELS } from "../auth/verify-email-labels";
import { AlertBanner } from "../components/alert-banner";
import { LoadingState } from "../components/loading-state";
import { TextLink } from "../components/text-link";
import { DemoEnded } from "../demo/demo-ended";
import { useNoIndex } from "../hooks/use-noindex";
import { useKitLabels } from "../i18n/kit-labels";
import { NEXT_PARAM, safeNextPath } from "../landing/routing";
import { httpStatusOf } from "../lib/http-status";
import { SharedComputerChoice } from "../offline/shared-computer";
import { AuthLayout } from "../shell/auth-layout";
import type { AccountInvitationAccepted } from "./accounts-api";
import { describeAccountFailure, useFailureBeside } from "./account-failure";
import { DEFAULT_ACCOUNT_FAILURE_LABELS } from "./account-failure-labels";
import type { AccountPageFrameProps, AccountPageName, ResolvedAccountRoutes as Resolved } from "./account-pages";
import { accountQueryKeys, useAccountsClient } from "./accounts-context";
import { passkeysAvailable } from "./passkey-ceremony";

/**
 * The signed-out account pages themselves, loaded only when one is drawn (refactor audit
 * 2026-11-22, MOD-1). account-pages.tsx keeps the paths, the options and the three builders,
 * and puts this module behind `lazyWithFallback` with a literal `import()`, so an app that
 * calls `accountRouteElements` at module scope (Staunlabor's route table, in its entry chunk)
 * no longer ships the sign-in, sign-up, both password forms, the verification, the invitation
 * and the demo's end to every visitor of its public site: 70.3 kB minified, 23.1 kB gzip of
 * its eager kit code at 0.65.1. A page now appears one chunk fetch later, inside the app's
 * frame.
 *
 * Internal: nothing here is exported from `@eifi1/ui-kit/accounts`.
 */

/** What {@link AccountPageView} is given: which page, and the options as resolved. */
export interface AccountPageViewProps {
  name: AccountPageName;
  o: Resolved;
}

/** One page of `accountRoutes`, by name: the lazy module's one entry. */
export function AccountPageView({ name, o }: AccountPageViewProps) {
  switch (name) {
    case "signIn":
      return <SignInPage o={o} />;
    case "register":
      return <RegisterPage o={o} />;
    case "forgotPassword":
      return <ForgotPasswordPage o={o} />;
    case "resetPassword":
      return <ResetPasswordPage o={o} />;
    case "verifyEmail":
      return <VerifyEmailPage o={o} change={false} />;
    case "confirmEmail":
      return <VerifyEmailPage o={o} change />;
    case "demoEnded":
      return <DemoEndedPage o={o} />;
  }
}

function DefaultFrame({ title, children }: AccountPageFrameProps) {
  return <AuthLayout title={title}>{children}</AuthLayout>;
}

function Page({ o, title, children }: { o: Resolved; title: ReactNode; children: ReactNode }) {
  useNoIndex();
  const Frame = o.frame ?? DefaultFrame;
  return <Frame title={title}>{children}</Frame>;
}

function SignInPage({ o }: { o: Resolved }) {
  const client = useAccountsClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const labels = useKitLabels("signIn", DEFAULT_SIGN_IN_LABELS);
  const deletion = useKitLabels("deleteAccount", DEFAULT_DELETE_ACCOUNT_LABELS);
  // The form words a wrong password, a wrong code and a dead challenge itself.
  const describe = useFailureBeside(["invalid_credentials", "two_factor_invalid", "token_invalid"], o.appCode);
  // Where they were headed, read through the kit's open-redirect check (KS's F34).
  const destination = safeNextPath(params.get(NEXT_PARAM)) ?? o.afterSignIn;
  const done = (answer: SignInAnswer) => {
    // A sign-in handed to a fresh page (`pageMode: "per-page"`) goes on by a full load.
    if (answer.kind === "signed-in") client.afterSignIn(destination, (to) => void navigate(to, { replace: true }));
    return answer;
  };
  return (
    <Page o={o} title={labels.submit}>
      {/* A deletion request signed this tab out (`signOut({ notice })`): say it was received. */}
      {params.get("notice") === "deletion_requested" && (
        <AlertBanner tone="info" size="sm" className="mb-4">
          {deletion.requested}
        </AlertBanner>
      )}
      <SignInForm
        onSubmit={async (credentials) => done(await client.signIn(credentials))}
        onSetPassword={async (values) => done(await client.setPassword(values))}
        onCode={async (values) => done(await client.verifyCode(values))}
        // server-kit 0.32's backup codes: a switch under the code field takes one.
        recoveryCode
        onPasskey={passkeysAvailable() ? async () => done(await client.signInWithPasskey()) : undefined}
        forgotHref={o.paths.forgotPassword}
        registerHref={o.signUp === "open" ? o.paths.register : undefined}
        access={o.access}
        // The reset page ends on "Sign in" with the address filled in (§6.3).
        defaultEmail={params.get("email") ?? undefined}
        emailTag={o.emailTag}
        deactivatedContact={o.deactivatedContact}
        credentialsContent={o.signInHint}
        afterPasswordContent={o.sharedComputerChoice === false ? undefined : <SharedComputerChoice />}
        describeError={describe}
      />
    </Page>
  );
}

function RegisterPage({ o }: { o: Resolved }) {
  const client = useAccountsClient();
  const [params] = useSearchParams();
  const token = params.get("invite");
  const accept = useKitLabels("acceptInvitation", DEFAULT_ACCEPT_INVITATION_LABELS);
  const register = useKitLabels("register", DEFAULT_REGISTER_LABELS);
  const signedIn = client.useSession((state) => state.token !== null);
  // The invitation is asked about before anything is drawn: a dead link says so, an address
  // with an account is asked to sign in and accept, anybody else gets the form (§4.4).
  const check = useQuery({
    queryKey: accountQueryKeys.invitationCheck(token ?? ""),
    queryFn: () => client.api.checkInvitation(token as string),
    enabled: token !== null,
    retry: false,
  });

  if (token !== null && check.isPending) {
    return (
      <Page o={o} title={register.submit}>
        <LoadingState className="py-6" />
      </Page>
    );
  }
  if (token !== null && check.isError) {
    return (
      <Page o={o} title={accept.title}>
        <AlertBanner tone="warning">
          <p className="font-medium">
            {isAuthError(check.error, "invitation_expired") ? accept.expired : accept.invalid}
          </p>
          <p>{accept.askAgain}</p>
        </AlertBanner>
        <TextLink href={o.paths.signIn}>{accept.signIn}</TextLink>
      </Page>
    );
  }
  if (token !== null && check.data?.account_exists) {
    const back = `${o.paths.register}?invite=${encodeURIComponent(token)}`;
    return (
      <Page o={o} title={accept.title}>
        <AcceptInvitation
          title={null}
          token={token}
          signedIn={signedIn}
          onAccept={async (value) => {
            const accepted = await client.api.acceptInvitation(value);
            const name = (o.invitationName ?? groupName)(accepted);
            return name ? { name } : {};
          }}
          continueHref={o.afterSignIn}
          signInHref={`${o.paths.signIn}?${NEXT_PARAM}=${encodeURIComponent(back)}`}
        />
      </Page>
    );
  }
  return <Registration o={o} token={token} invitedEmail={check.data?.email} />;
}

function Registration({ o, token, invitedEmail }: { o: Resolved; token: string | null; invitedEmail?: string }) {
  const client = useAccountsClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const labels = useKitLabels("register", DEFAULT_REGISTER_LABELS);
  const describe = useFailureBeside(
    ["email_taken", "registration_closed", "invitation_invalid", "invitation_expired"],
    o.appCode,
  );
  const [extra, setExtra] = useState<{ fields: Record<string, unknown>; complete: boolean }>({
    fields: {},
    complete: true,
  });
  const Fields = o.registerFields;
  return (
    <Page o={o} title={labels.submit}>
      <RegisterForm
        onSubmit={async (values) => {
          await client.register(values, { ...extra.fields, ...(token !== null ? { invite_token: token } : {}) });
          client.afterSignIn(o.afterSignIn, (to) => void navigate(to, { replace: true }));
        }}
        emailTag={o.emailTag}
        invitedEmail={invitedEmail}
        defaultEmail={token === null ? (params.get("email") ?? undefined) : undefined}
        locale={o.registerLocale}
        languageField={o.registerLocale !== undefined ? null : undefined}
        signInHref={o.paths.signIn}
        termsHref={o.legal?.termsHref}
        privacyHref={o.legal?.privacyHref}
        operator={o.legal?.operator}
        appFields={Fields ? <Fields onChange={(fields, complete) => setExtra({ fields, complete })} /> : undefined}
        appFieldsComplete={extra.complete}
        describeError={describe}
        aboveForm={
          token === null && o.signUp !== "open" ? (
            <AlertBanner tone="info" size="sm">
              {labels.registrationClosed}
            </AlertBanner>
          ) : undefined
        }
      />
    </Page>
  );
}

function ForgotPasswordPage({ o }: { o: Resolved }) {
  const client = useAccountsClient();
  const [params] = useSearchParams();
  const labels = useKitLabels("forgotPassword", DEFAULT_FORGOT_PASSWORD_LABELS);
  const describe = useFailureBeside([], o.appCode);
  return (
    <Page o={o} title={labels.title}>
      <ForgotPasswordForm
        title={null}
        onSubmit={(email) => client.api.requestPasswordReset(email)}
        signInHref={o.paths.signIn}
        defaultEmail={params.get("email") ?? undefined}
        describeError={describe}
      />
    </Page>
  );
}

function ResetPasswordPage({ o }: { o: Resolved }) {
  const client = useAccountsClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const labels = useKitLabels("resetPassword", DEFAULT_RESET_PASSWORD_LABELS);
  const describe = useFailureBeside(["token_invalid", "token_expired"], o.appCode);
  return (
    <Page o={o} title={labels.title}>
      <ResetPasswordForm
        title={null}
        token={params.get("token") ?? ""}
        onCheck={(token) => client.api.checkPasswordReset(token)}
        onSubmit={({ token, password }) => client.api.confirmPasswordReset({ token, new_password: password })}
        // A reset is not a sign-in (§6.3): the page ends on "Sign in" with the address filled in.
        onSignIn={(email) => void navigate(`${o.paths.signIn}?email=${encodeURIComponent(email)}`)}
        signInHref={o.paths.signIn}
        forgotHref={o.paths.forgotPassword}
        describeError={describe}
      />
    </Page>
  );
}

function VerifyEmailPage({ o, change }: { o: Resolved; change: boolean }) {
  const client = useAccountsClient();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const signedIn = client.useSession((state) => state.token !== null);
  const labels = useKitLabels("verifyEmail", DEFAULT_VERIFY_EMAIL_LABELS);
  const failure = useKitLabels("accountFailure", DEFAULT_ACCOUNT_FAILURE_LABELS);
  return (
    <Page o={o} title={labels.title}>
      <VerifyEmailStatus
        title={null}
        token={params.get("token") ?? ""}
        onVerify={async (token) => {
          const status = change ? await client.api.confirmEmailChange(token) : await client.api.verifyEmail(token);
          if (signedIn) {
            // The address or its mark changed: the account and the address change are asked again.
            const user = client.useSession.getState().user;
            if (user) client.setUser({ ...user, email: status.email, email_verified: true });
            void queryClient.invalidateQueries({ queryKey: accountQueryKeys.me });
            void queryClient.invalidateQueries({ queryKey: accountQueryKeys.emailChange });
          }
          return status;
        }}
        signedIn={signedIn}
        onResend={signedIn && !change ? () => client.api.resendVerification() : undefined}
        continueHref={signedIn ? o.afterSignIn : undefined}
        describeError={(error) => {
          const status = httpStatusOf(error);
          return status === undefined || status >= 500 ? describeAccountFailure(error, failure) : undefined;
        }}
      />
    </Page>
  );
}

function DemoEndedPage({ o }: { o: Resolved }) {
  useNoIndex();
  if (!o.demo) return null;
  const ended = (
    <DemoEnded
      model={o.demo.model}
      access={o.demo.access}
      restartHref={o.demo.restartHref}
      signInHref={o.paths.signIn}
    />
  );
  // 0.64: in the app's frame when it gives one (DemoEnded's own heading is the page's title);
  // bare otherwise, as before.
  const Frame = o.frame;
  return Frame ? <Frame title={null}>{ended}</Frame> : ended;
}

/** The group server-kit 0.32's accept answers (`{group: {id, name}}`), by name. */
function groupName(accepted: AccountInvitationAccepted): string | undefined {
  const name = accepted.group?.name;
  return typeof name === "string" && name !== "" ? name : undefined;
}
