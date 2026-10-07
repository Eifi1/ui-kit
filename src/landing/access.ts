import { useMemo } from "react";

import { DEFAULT_LANDING_LABELS, useLandingLabels } from "./landing-labels";
import type { LandingLabels } from "./landing-labels";

/**
 * How a visitor gets an account (docs/landing-demo-harmonization.md §2.2, §4.2).
 *
 * - `request` — every app today: registration is invitation-only, so the primary action
 *   is a mail to `support@<domain>`, answered with an invitation. There is no request
 *   form and no table. `app` names the product in the mail's subject ("Access to
 *   Kastlan"); `askCompany` adds kastlan's "Company:" line to the body.
 * - `register` — the day an app opens registration, the SAME slot becomes "Get started"
 *   → its `/register`. Nothing else on the page changes.
 *
 * One value per app, passed to every part that offers access — `PublicHeader`, `Hero`,
 * `CtaBand`, `LandingActions`, `SignInForm`, `DemoStart`, `DemoBanner`, `DemoEnded` — so
 * the switch is one line when it comes.
 */
export type AccessChoice =
  | { kind: "request"; email: string; app?: string; askCompany?: boolean }
  | { kind: "register"; href: string };

/** What {@link accessAction} answers: where the access action goes and what it says. */
export interface AccessLink {
  kind: AccessChoice["kind"];
  /** A `mailto:` for `request`, the app's register page for `register`. */
  href: string;
  /** "Request access" or "Get started". */
  label: string;
}

/** The words {@link accessAction} reads. */
export type AccessLabels = Pick<
  LandingLabels,
  "requestAccess" | "getStarted" | "accessSubject" | "accessName" | "accessCompany" | "accessUse"
>;

/**
 * RFC 3986 percent-encoding, stricter than `encodeURIComponent`: `!'()*` too. RFC 6068
 * would allow them in a header value, but a mail client that splits on `'` or `(` is
 * the one that breaks a subject like "Access to Ada's Garden Planner", and an encoded
 * one reads the same everywhere.
 */
function encodeStrict(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * The `mailto:` of a request (§4.2): the subject in the visitor's language ("Access to
 * <App>") and a short body to fill in — "Name:", kastlan's "Company:", "What would you
 * use it for:" — one prompt per line.
 *
 * RFC 6068: the lines are separated by CRLF (`%0D%0A`), spaces are `%20` (a `+` would be
 * read as a plus), and the address keeps its `@` but nothing else unencoded.
 */
function mailtoHref(access: Extract<AccessChoice, { kind: "request" }>, labels: AccessLabels): string {
  const body = [labels.accessName, ...(access.askCompany ? [labels.accessCompany] : []), labels.accessUse].join("\r\n");
  const to = encodeStrict(access.email).replace(/%40/g, "@");
  return `mailto:${to}?subject=${encodeStrict(labels.accessSubject(access.app))}&body=${encodeStrict(body)}`;
}

/**
 * The access action for `access`, in the language of `labels` (§4.2): "Request access"
 * as a mail to support, or "Get started" → the register page.
 *
 * Pure, so a test or an app's own button can use it; the kit's parts call
 * {@link useAccessAction}, which takes the words from the provider. The labels already
 * carry the language — there is no separate locale argument.
 */
export function accessAction(access: AccessChoice, labels: Partial<AccessLabels> = {}): AccessLink {
  // A key given as `undefined` keeps the English, as in every kit namespace.
  const words: AccessLabels = { ...DEFAULT_LANDING_LABELS };
  for (const [key, value] of Object.entries(labels)) {
    if (value !== undefined) (words as unknown as Record<string, unknown>)[key] = value;
  }
  if (access.kind === "register") return { kind: "register", href: access.href, label: words.getStarted };
  return { kind: "request", href: mailtoHref(access, words), label: words.requestAccess };
}

/** {@link accessAction} with the `landing` words of the nearest provider (then `labels`). */
export function useAccessAction(access: AccessChoice, labels?: Partial<LandingLabels>): AccessLink {
  const words = useLandingLabels(labels);
  // `access` is usually an inline object; its fields are what the link depends on.
  const kind = access.kind;
  const target = access.kind === "register" ? access.href : access.email;
  const app = access.kind === "request" ? access.app : undefined;
  const askCompany = access.kind === "request" ? access.askCompany === true : false;
  return useMemo(
    () =>
      accessAction(
        kind === "register" ? { kind, href: target } : { kind, email: target, app, askCompany },
        words,
      ),
    [kind, target, app, askCompany, words],
  );
}
