import { useKitLabels } from "../i18n/kit-labels";

/**
 * The kit's words on the public landing page (docs/landing-demo-harmonization.md §4.1,
 * §4.2) — the `landing` namespace of `<UiKitProvider labels>`.
 *
 * Only the GENERIC words are the kit's: the actions every app's header, hero and CTA band
 * share, the "Beta" badge, and the template of the request-access mail. The marketing
 * copy (the hero's title, the feature rows, the trust strip, the tagline) is each app's,
 * in every language it ships (§4.1 "Words").
 *
 * The demo parts and `SignInForm` read the access words from here too, so "Request
 * access" and its mail are said the same way on the landing, the sign-in page, the demo
 * start, the banner and the end page.
 */
export interface LandingLabels {
  /** The header's secondary action without a session; also the demo banner's and the
   *  end page's way to an existing account. */
  signIn: string;
  /** The access action of an invitation-only app: a mail to support (§2.2, §4.2). */
  requestAccess: string;
  /** The access action once an app opens registration (`{kind: "register"}`, §4.2). */
  getStarted: string;
  /** The hero's and the CTA band's second action without a session. */
  tryDemo: string;
  /** The one action for a real session: into the app, at the resume target. */
  openApp: string;
  /** The secondary action for a demo session: back into the live demo. */
  continueDemo: string;
  /** The hero's optional badge. */
  beta: string;
  /** The request mail's subject, given the app's name (`access.app`): "Access to
   *  Kastlan". `undefined` when the app named none. */
  accessSubject: (app?: string) => string;
  /** The request mail's body, one prompt per line; the sender writes after each. */
  accessName: string;
  /** Asked only where the app says so (`askCompany`, kastlan). */
  accessCompany: string;
  accessUse: string;
}

export const DEFAULT_LANDING_LABELS: LandingLabels = {
  signIn: "Sign in",
  requestAccess: "Request access",
  getStarted: "Get started",
  tryDemo: "Try the demo",
  openApp: "Open app",
  continueDemo: "Continue the demo",
  beta: "Beta",
  accessSubject: (app) => (app ? `Access to ${app}` : "Access request"),
  accessName: "Name:",
  accessCompany: "Company:",
  accessUse: "What would you use it for:",
};

/** The `landing` namespace, resolved: English, then the provider, then `labels`. */
export function useLandingLabels(labels?: Partial<LandingLabels>): LandingLabels {
  return useKitLabels("landing", DEFAULT_LANDING_LABELS, labels);
}
