import type { PathPattern } from "../landing/routing";
import { matchesPathPattern, routerPathname } from "../lib/path-pattern";
import { reduceQuery } from "./feedback-page";
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
 * **…and the params the app lists** (0.61, Kurvenschmiede production feedback #7: a report
 * on `/curves/2?profile=5` opened `/curves/2`, another view than the one reported). An
 * ALLOW-list, as the denial above needs: the app's `pageLinkParams`, the list its crash
 * reporter and `useFeedbackSubmit` already keep as `allowParams` (0.60, G-10), reduced by the
 * same function (`reduceQuery`, feedback-page.ts). A param nobody listed is text, as before,
 * so `/login?next=…` is still a bare `/login` — unless an app lists `next`, which it must
 * never: a listed param is one the app vouches does nothing but locate a view (paging, sort,
 * a tab, a range), never a forward target or a token.
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
  /** The path: what the URL column shows, and the part always linked (with the app's
   *  `pageLinkParams`, 0.61). */
  path: string;
  /** Path + query + hash: the page as the reporter had it (keksdose `localHref`: the query
   *  and hash carry the state, `?tab=import`, a drill-down) — shown, never followed whole. */
  href: string;
  /** `href`'s query, `""` or `?…` — kept, so the link's reduction (0.61) needs no second
   *  parse. */
  search: string;
  /** `href`'s hash, `""` or `#…` — never linked. */
  hash: string;
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
  return { path, href: `${path}${url.search}${url.hash}`, search: url.search, hash: url.hash, url: raw };
}

const NO_PARAMS: ReadonlySet<string> = new Set();

/** Where a click on the page goes: its path with the `params` the app lists (0.61), or
 *  `null` — show it as text — when that path is one-shot, whatever the params. */
export function feedbackPageLinkTarget(
  page: FeedbackPage,
  exclude: readonly PathPattern[] = [],
  params: ReadonlySet<string> = NO_PARAMS,
): string | null {
  if (isOneShotPage(page.path, exclude)) return null;
  // The path the guard just read, the kept query after it — never a path read back out of
  // a reduced address, so what is linked is what was checked.
  return params.size === 0 ? page.path : `${page.path}${reduceQuery(new URLSearchParams(page.search), params)}`;
}

/** The text drawn after the page's link (or after its path, unlinked): what `target` does
 *  not carry. A target without a query leaves the query and hash as the reporter's browser
 *  wrote them, as since 0.52; one that kept params leaves the others and the hash, the
 *  query reading on from the link's `?`. */
export function feedbackPageUnlinked(
  page: FeedbackPage,
  target: string | null,
  params: ReadonlySet<string> = NO_PARAMS,
): string {
  if (target === null || target === page.path) return page.href.slice(page.path.length);
  const rest = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(page.search)) {
    if (!params.has(key)) rest.append(key, value);
  }
  const query = rest.toString();
  return `${query ? `&${query}` : ""}${page.hash}`;
}
