import { Suspense } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { Route } from "react-router";
import type { RouteObject } from "react-router";

import { buttonClasses } from "../components/button-look";
import { DEFAULT_ERROR_BOUNDARY_LABELS } from "../components/error-boundary-labels";
import type { LegalOperator } from "../components/legal";
import { LoadingState } from "../components/loading-state";
import type { DemoModel } from "../demo/demo-session";
import { useNoIndex } from "../hooks/use-noindex";
import { useKitLabels } from "../i18n/kit-labels";
import type { AccessChoice } from "../landing/access";
import { lazyWithFallback, type LazyFallbackProps } from "../lib/lazy-with-fallback";
import type { AccountInvitationAccepted } from "./accounts-api";
import type { DescribeAccountFailureOptions } from "./account-failure";
import type { AccountPageViewProps } from "./account-page-views";

/**
 * The signed-out pages of the account layer (docs/auth-harmonization.md §7, §12.9 "The
 * pages"), as plain route objects: `accountRoutes(options)` → sign-in, sign-up (with the
 * invitation's check, a dead link's banner and `AcceptInvitation` for an address that has an
 * account), forgotten and new password, the verification and the address change's
 * confirmation, and the demo's end. Kurvenschmiede's `features/auth` pages, about 550 lines,
 * with what was its own made an option: the frame, the address tag, the sign-in hint and
 * contact, the legal links (a terms link may be left out), the sign-up's extra fields.
 *
 * Off unless the app turns it on: the demo's page, an open sign-up. The second factor is asked
 * for when the account has one (server-kit 0.32: the code step, or a backup code).
 *
 * The pages themselves are in ./account-page-views, loaded when the first one is drawn
 * (refactor audit 2026-11-22, MOD-1). This module is what an app's route table imports at
 * once, so it holds the paths, the options and the three builders, and no form.
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
  /**
   * 0.64: what an accepted invitation joined, by name, for the confirmation ("You’ve joined
   * Rig 4"). Default: the `group` server-kit 0.32 answers (`invitation_group`); an app whose
   * server answers the name in its own field (Kurvenschmiede's `team_name`) reads it here.
   */
  invitationName?: (accepted: AccountInvitationAccepted) => string | undefined;
}

/** @internal The options as the pages read them: every path filled in, `afterSignIn` set. */
export interface ResolvedAccountRoutes extends Omit<AccountRoutesOptions, "paths"> {
  paths: AccountPaths;
  afterSignIn: string;
}

function resolve(options: AccountRoutesOptions): ResolvedAccountRoutes {
  return { ...options, paths: { ...DEFAULT_PATHS, ...options.paths }, afterSignIn: options.afterSignIn ?? "/" };
}

/**
 * The pages' module, fetched when the first page is drawn. A LITERAL relative `import()`, as
 * tour.tsx's and feedback-submit's, so the library build keeps the module its own and the
 * app's bundler splits it off. Staunlabor builds its route table at module scope, in its entry
 * chunk; with the pages imported statically, every visitor of its public site downloaded them
 * (70.3 kB minified, 23.1 kB gzip, 30 % of its eager kit code at 0.65.1).
 */
const LazyAccountPage = lazyWithFallback(
  () => import("./account-page-views").then((module) => module.AccountPageView),
  AccountPageUnavailable,
);

/** The app's frame round what stands in for a page, with no title yet. Without a frame the
 *  stand-in is bare, so the kit's AuthLayout stays in the pages' chunk. */
function PendingFrame({ o, children }: { o: ResolvedAccountRoutes; children: ReactNode }) {
  useNoIndex();
  const Frame = o.frame;
  return Frame ? <Frame title={null}>{children}</Frame> : <>{children}</>;
}

/**
 * The pages' chunk did not come: a tab left open across a deploy, or offline. Said in the
 * error boundary's words for exactly that, with a "Try again" that fetches it again, never on
 * its own (offline, that would loop). Light on purpose, a native button in the kit's look
 * rather than `Button` and its tooltip: this module is in the first load of a public site.
 */
function AccountPageUnavailable({ o, retry }: AccountPageViewProps & LazyFallbackProps) {
  const text = useKitLabels("errorBoundary", DEFAULT_ERROR_BOUNDARY_LABELS);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <PendingFrame o={o}>
      <div role="alert" className="py-6 text-center">
        <p className="font-medium text-primary">{offline ? text.offlineTitle : text.updateTitle}</p>
        <p className="mt-1 text-sm text-secondary">{offline ? text.offlineMessage : text.updateMessage}</p>
      </div>
      <div className="flex justify-center">
        <button type="button" className={buttonClasses("secondary")} onClick={retry}>
          {text.retry}
        </button>
      </div>
    </PendingFrame>
  );
}

/** The element at one page's path: the app's frame with a LoadingState until the chunk is in. */
function pageElement(name: AccountPageName, o: ResolvedAccountRoutes): ReactElement {
  return (
    <Suspense
      fallback={
        <PendingFrame o={o}>
          <LoadingState className="py-6" />
        </PendingFrame>
      }
    >
      <LazyAccountPage name={name} o={o} />
    </Suspense>
  );
}

/** The pages {@link accountRoutes} draws, in its order; `demoEnded` only with `demo`. */
const PAGES: readonly AccountPageName[] = [
  "signIn",
  "register",
  "forgotPassword",
  "resetPassword",
  "verifyEmail",
  "confirmEmail",
  "demoEnded",
];

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
 *
 * Since 0.66 the pages load when the first one is drawn; until then the route shows the
 * app's `frame` with a LoadingState.
 */
export function accountRoutes(options: AccountRoutesOptions = {}): RouteObject[] {
  const o = resolve(options);
  return PAGES.filter((name) => name !== "demoEnded" || o.demo).map((name) => ({
    path: o.paths[name],
    element: pageElement(name, o),
  }));
}

/** The names {@link accountPage} answers, one per page of {@link accountRoutes}. */
export type AccountPageName = keyof AccountPaths;

/**
 * One account page alone (0.64, Kurvenschmiede), for an app whose route table loads each
 * page lazily or wraps some of them: the element {@link accountRoutes} would put at that
 * page's path, the same options read the same way. Since 0.66 the page loads lazily either
 * way, so a route table may also call this at once.
 *
 * ```tsx
 * { path: "/login", lazy: async () => {
 *     const { accountPage } = await import("@eifi1/ui-kit/accounts");
 *     return { element: <Shell>{accountPage("signIn", options)}</Shell> };
 * } }
 * ```
 *
 * `demoEnded` answers `null` without `demo`.
 */
export function accountPage(name: AccountPageName, options: AccountRoutesOptions = {}): ReactElement | null {
  const o = resolve(options);
  return name === "demoEnded" && !o.demo ? null : pageElement(name, o);
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
 *
 * Called at module scope, in the entry chunk, it costs the paths and the builders: the pages
 * load when the first one is drawn.
 */
export function accountRouteElements(options: AccountRoutesOptions = {}): ReactElement[] {
  return accountRoutes(options).map((route) => <Route key={route.path} path={route.path} element={route.element} />);
}
