import type { PathPattern } from "../landing/routing";
import { matchesPathPattern, routerPathname } from "../lib/path-pattern";
import type { FeedbackContext } from "./feedback-record";

/**
 * The page a report was filed on, and which of it the feedback parts link (refactor audit
 * 2026-10-30, FLW-7).
 *
 * The page comes from the REPORTER's client context: its origin is always this app's
 * (only the path is ever linked), but its path and query are whatever the row says. A
 * signed-in user could file a report whose link takes the admin to a route that acts on
 * load — keksdose's `/join?token=` accepts an invitation through `AcceptInvitation`,
 * kastlan's and Kurvenschmiede's `/register?invite=` likewise.
 *
 * **Only the PATH is linked** (0.52 code review, this file). The tokens and the forward
 * targets travel in the query: a guard on the path alone let `/login?next=%2Fjoin%3Ftoken%3D…`
 * through as a link, and `RedirectIfAuthed` sent the signed-in admin on to the invitation —
 * as `/forgot-password`, `/demo` and `/welcome` would, and whatever forwarder an app adds
 * next (`?returnTo=`, a share target). No list of forwarders can know them all; a link
 * without a query reaches none. The query and hash are shown as text beside it, and "Copy
 * URL" copies the whole address, for whoever wants that exact state and opens it knowingly.
 *
 * **A one-shot PATH is not linked at all** — the kit's `/join`, `/register`,
 * `/verify-email`, `/reset-password` (`/reset-password/<token>` carries it in the path),
 * and the app's `pageLinkExclude` on top: shown as text with Copy.
 *
 * @internal Not part of `/feedback` or the barrel.
 */

/** The kit's one-shot routes: the invitation accepts and the two token pages. */
export const FEEDBACK_ONE_SHOT_PAGES: readonly PathPattern[] = Object.freeze([
  "/join",
  "/register",
  "/verify-email",
  "/reset-password",
]);

/** Whether `href` (a path, with or without its query) names a one-shot route — the kit's,
 *  or one of the app's `exclude` on top. Read as the ROUTER reads it, decoded and
 *  case-insensitive: `/Join?token=` and `/j%6Fin?token=` render `/join` too (0.52 code
 *  review, this file). */
export function isOneShotPage(href: string, exclude: readonly PathPattern[] = []): boolean {
  const pathname = routerPathname(href);
  const named = (pattern: PathPattern) => matchesPathPattern(pathname, pattern);
  return FEEDBACK_ONE_SHOT_PAGES.some(named) || exclude.some(named);
}

/** The page a report was filed on, read once — the URL cell and the detail each parsed it
 *  three times, once per part (0.52 code review, feedback-table.tsx: 810 `URL`s per render
 *  of a 270-row inbox, for one column). */
export interface FeedbackPage {
  /** The path: what the URL column shows, and the only part ever linked. */
  path: string;
  /** Path + query + hash: the page as the reporter had it (keksdose `localHref`: the query
   *  and hash carry the state, `?tab=import`, a drill-down) — shown, never followed. */
  href: string;
  /** What "Copy URL" copies: the FULL `context.url` as the reporter's browser had it —
   *  origin included, the one part that says which copy of the app it was (feedback
   *  #278) — else `context.route`. */
  url: string;
}

/** Collapses a leading `//` run: `/\/\/evil.example/` as a path would be a
 *  protocol-relative link off the app. */
const localPath = (pathname: string) => pathname.replace(/^\/{2,}/, "/");

/** `context.url`, else `context.route`, parsed — or null when neither is set or the value
 *  is no http(s) address or path (a `javascript:` value is not a page). */
export function feedbackPage(context: FeedbackContext | null | undefined): FeedbackPage | null {
  const raw = (context?.url || context?.route || "").trim();
  if (!raw) return null;
  let url: URL;
  try {
    // A base, so a PATH-ONLY value parses too: Kurvenschmiede backfills its old rows
    // with `url = page_path + search` (§3.2), and keksdose's `new URL(raw)` threw on
    // those and dropped the section.
    url = new URL(raw, "http://localhost");
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const path = localPath(url.pathname);
  return { path, href: `${path}${url.search}${url.hash}`, url: raw };
}

/** Where a click on the page goes: its path, or `null` — show it as text — when that path
 *  is one-shot. */
export function feedbackPageLinkTarget(page: FeedbackPage, exclude: readonly PathPattern[] = []): string | null {
  return isOneShotPage(page.path, exclude) ? null : page.path;
}
