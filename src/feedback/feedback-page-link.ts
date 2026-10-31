import type { PathPattern } from "../landing/routing";
import { matchesPathPattern, routerPathname } from "../lib/path-pattern";

/**
 * Which filed-on pages the feedback parts show as text rather than a link (refactor audit
 * 2026-10-30, FLW-7).
 *
 * The page a report was filed on comes from the REPORTER's client context: its origin is
 * always this app's (`feedbackPageHref` keeps the path only), but its path and query are
 * whatever the row says. A signed-in user could file a report whose link takes the admin
 * to a route that acts on load — keksdose's `/join?token=` accepts an invitation through
 * `AcceptInvitation`, kastlan's and Kurvenschmiede's `/register?invite=` likewise. Such a
 * page is shown as its path with Copy: whoever wants to open it copies it, knowingly.
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

/** Whether `href` (a path with its query, as `feedbackPageHref` answers) names a one-shot
 *  route — the kit's, or one of the app's `exclude` on top. Read as the ROUTER reads it,
 *  decoded and case-insensitive: `/Join?token=` and `/j%6Fin?token=` render `/join` too
 *  (0.52 code review, this file). The detail and the table's URL cell both ask here. */
export function isOneShotPage(href: string, exclude: readonly PathPattern[] = []): boolean {
  const pathname = routerPathname(href);
  return [...FEEDBACK_ONE_SHOT_PAGES, ...exclude].some((pattern) => matchesPathPattern(pathname, pattern));
}
