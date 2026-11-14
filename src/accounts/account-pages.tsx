import { useState } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { Navigate, Route, useLocation, useNavigate, useSearchParams } from "react-router";
import type { RouteObject } from "react-router";
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
import { VerifyEmailStatus } from "../auth/verify-email";
import { DEFAULT_FORGOT_PASSWORD_LABELS } from "../auth/forgot-password-form-labels";
import { DEFAULT_RESET_PASSWORD_LABELS } from "../auth/reset-password-form-labels";
import { DEFAULT_VERIFY_EMAIL_LABELS } from "../auth/verify-email-labels";
import { AlertBanner } from "../components/alert-banner";
import { LoadingState } from "../components/loading-state";
import { TextLink } from "../components/text-link";
import type { LegalOperator } from "../components/legal";
import { DemoEnded } from "../demo/demo-ended";
import type { DemoModel } from "../demo/demo-session";
import { useNoIndex } from "../hooks/use-noindex";
import { useKitLabels } from "../i18n/kit-labels";
import type { AccessChoice } from "../landing/access";
import { NEXT_PARAM, safeNextPath } from "../landing/routing";
import { httpStatusOf } from "../lib/http-status";
import { SharedComputerChoice } from "../offline/shared-computer";
import { AuthLayout } from "../shell/auth-layout";
import { describeAccountFailure, useFailureBeside, type DescribeAccountFailureOptions } from "./account-failure";
import { DEFAULT_ACCOUNT_FAILURE_LABELS } from "./account-failure-labels";
import { accountQueryKeys, useAccountsClient } from "./accounts-context";
import { passkeysAvailable } from "./passkey-ceremony";

/**
 * The signed-out pages of the account layer (docs/auth-harmonization.md §7, §12.9 "The
 * pages"), as plain route objects: `accountRoutes(options)` → sign-in, sign-up (with the
 * invitation's check, a dead link's banner and `AcceptInvitation` for an address that has an
 * account), forgotten and new password, the verification and the address change's
 * confirmation, and the demo's end. Kurvenschmiede's `features/auth` pages, about 550 lines,
 * with what was its own made an option: the frame, the address tag, the sign-in hint and
 * contact, the legal links (a terms link may be left out), the sign-up's extra fields.
 *
 * Off unless the app turns it on: the demo's page, an open sign-up. The second factor is not
 * offered: server-kit 0.29's `auth_router` has no 2FA routes, and the form's code step answers
 * that it is not.
 */

/** Where the pages are. Defaults are the contract's (§7). */
export interface AccountPaths {
  signIn: string;
  register: string;
  forgotPassword: string;
  resetPassword: string;
  verifyEmail: string;
  confirmEmail: string;
  demoEnded: string;
}

const DEFAULT_PATHS: AccountPaths = {
  signIn: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  confirmEmail: "/confirm-email",
  demoEnded: "/demo/ended",
};

/** What a page frame gets: the page's title and its body. */
export interface AccountPageFrameProps {
  title: ReactNode;
  children: ReactNode;
}

/** What the sign-up's extra fields get (kastlan's company, keksdose's currency): tell the
 *  page what they hold, as the body's fields, and whether the form may be sent. */
export interface AccountRegisterFieldsProps {
  onChange: (fields: Record<string, unknown>, complete: boolean) => void;
}

/** What {@link accountRoutes} takes. Every key is optional. */
export interface AccountRoutesOptions {
  /** Where each page is; the rest keep the contract's (`/login`, `/register`, …). */
  paths?: Partial<AccountPaths>;
  /** Where a sign-in or sign-up lands without a `?next=`. Default `"/"`. */
  afterSignIn?: string;
  /** The app's frame round each page — its logo, language menu, legal links. Default the
   *  kit's `AuthLayout` with the page's title. */
  frame?: ComponentType<AccountPageFrameProps>;
  /** `"invitation"` (the default, every app today): the sign-up says so above the form to a
   *  visitor without an invitation, and the sign-in links to no sign-up (pass `access` for
   *  "Request access"). `"open"`: the sign-in links to the sign-up. The server's gate decides
   *  either way (§4.3). */
  signUp?: "invitation" | "open";
  /** How a visitor gets an account, as the landing says it (`SignInForm`'s `access`). */
  access?: AccessChoice;
  /** The app's address tag (`"staunlabor"`, §4.5): offered at sign-up, hinted at sign-in. */
  emailTag?: string;
  /** Who a deactivated user writes to (§2.10), under `invalid_credentials`. */
  deactivatedContact?: ReactNode;
  /** The app's line under the sign-in's credentials. */
  signInHint?: ReactNode;
  /** "This is a shared computer" under the password (§2.14). Default `true`. */
  sharedComputerChoice?: boolean;
  /** The sign-up's legal box: the privacy policy and, where the app has terms, its terms. */
  legal?: { privacyHref?: string; termsHref?: string; operator?: LegalOperator };
  /** The language a new account is made in — the one on screen, so the form's own language
   *  field is left out (Kurvenschmiede's F100). Left out, the form asks. */
  registerLocale?: string;
  /** The sign-up's extra fields, rendered in `RegisterForm`'s slot and sent in the body. */
  registerFields?: ComponentType<AccountRegisterFieldsProps>;
  /** The app's own coded refusals, as `describeAccountFailure` takes them. */
  appCode?: DescribeAccountFailureOptions["appCode"];
  /** The demo's end page (landing-demo §5.5), off unless given. */
  demo?: { model: DemoModel; access: AccessChoice; restartHref?: string };
}

interface Resolved extends Omit<AccountRoutesOptions, "paths"> {
  paths: AccountPaths;
  afterSignIn: string;
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
  const describe = useFailureBeside(["invalid_credentials", "token_invalid"], o.appCode);
  // Where they were headed, read through the kit's open-redirect check (KS's F34).
  const destination = safeNextPath(params.get(NEXT_PARAM)) ?? o.afterSignIn;
  const done = (answer: SignInAnswer) => {
    if (answer.kind === "signed-in") void navigate(destination, { replace: true });
    return answer;
  };
  return (
    <Page o={o} title={labels.submit}>
      <SignInForm
        onSubmit={async (credentials) => done(await client.signIn(credentials))}
        onSetPassword={async (values) => done(await client.setPassword(values))}
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
            await client.api.acceptInvitation(value);
            return {};
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
          void navigate(o.afterSignIn, { replace: true });
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
  return (
    <DemoEnded
      model={o.demo.model}
      access={o.demo.access}
      restartHref={o.demo.restartHref}
      signInHref={o.paths.signIn}
    />
  );
}

/**
 * The account layer's signed-out pages as plain route objects, for the app's router:
 *
 * ```tsx
 * const router = createBrowserRouter([
 *   ...accountRoutes({ emailTag: "staunlabor", legal: { privacyHref: "/privacy" }, frame: SiteFrame }),
 *   { path: "/settings/*", element: <RequireSession><Settings /></RequireSession> },
 * ]);
 * ```
 *
 * Each page reads the client from `<AccountsProvider>` and its words from the kit's
 * catalogues; a refusal is said by the form or by `describeAccountFailure`, never in the
 * server's English. The demo's end page is a route only with `demo`.
 */
export function accountRoutes(options: AccountRoutesOptions = {}): RouteObject[] {
  const o: Resolved = {
    ...options,
    paths: { ...DEFAULT_PATHS, ...options.paths },
    afterSignIn: options.afterSignIn ?? "/",
  };
  const routes: RouteObject[] = [
    { path: o.paths.signIn, element: <SignInPage o={o} /> },
    { path: o.paths.register, element: <RegisterPage o={o} /> },
    { path: o.paths.forgotPassword, element: <ForgotPasswordPage o={o} /> },
    { path: o.paths.resetPassword, element: <ResetPasswordPage o={o} /> },
    { path: o.paths.verifyEmail, element: <VerifyEmailPage o={o} change={false} /> },
    { path: o.paths.confirmEmail, element: <VerifyEmailPage o={o} change /> },
  ];
  if (o.demo) routes.push({ path: o.paths.demoEnded, element: <DemoEndedPage o={o} /> });
  return routes;
}

/**
 * {@link accountRoutes} as `<Route>` elements (0.64, Staunlabor), for an app that writes its
 * routes as JSX — React Router takes only `<Route>` children in `<Routes>`, so a component of
 * the kit's could not stand there; an array spread into it can:
 *
 * ```tsx
 * <Routes>
 *   {accountRouteElements({ frame: SiteFrame, legal: { privacyHref: "/privacy" } })}
 *   <Route path="/" element={<Home />} />
 * </Routes>
 * ```
 */
export function accountRouteElements(options: AccountRoutesOptions = {}): ReactElement[] {
  return accountRoutes(options).map((route) => <Route key={route.path} path={route.path} element={route.element} />);
}

/** What {@link RequireSession} takes. */
export interface RequireSessionProps {
  children?: ReactNode;
  /** The sign-in page. Default `"/login"`. */
  signInPath?: string;
}

/**
 * The gate for the pages that need an account (Kurvenschmiede's `ProtectedRoute`): without a
 * session it goes to the sign-in, carrying where the reader was — the query and the fragment
 * too, which are often the point (`/settings?focus=…`) — so signing in lands back there
 * (KS's F34). In the URL rather than in router state, so it survives a reload of the sign-in.
 */
export function RequireSession({ children, signInPath = "/login" }: RequireSessionProps) {
  const client = useAccountsClient();
  const signedIn = client.useSession((state) => state.token !== null);
  const { pathname, search, hash } = useLocation();
  if (!signedIn) {
    const next = encodeURIComponent(`${pathname}${search}${hash}`);
    return <Navigate to={`${signInPath}${signInPath.includes("?") ? "&" : "?"}${NEXT_PARAM}=${next}`} replace />;
  }
  return <>{children}</>;
}
