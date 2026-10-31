/**
 * Whether a pathname is one a `PathPattern` names — the rule `useLastVisitedPage`'s
 * `exclude` reads (landing/routing.tsx) and the feedback guard's one-shot routes
 * (refactor audit 2026-10-30, FLW-7), here without the router: `landing/routing` imports
 * react-router, which `/feedback` must not drag in. The one copy: routing kept a private
 * one, and the two had drifted within the round (0.52 code review, this file).
 *
 * A string is that path and everything under it (`/join` is `/join` and `/join/abc`, not
 * `/joined`; `/` is only `/`); a RegExp is tested on the pathname (a `g` flag dropped, so
 * `lastIndex` never carries over between calls).
 *
 * Case-INSENSITIVE, as React Router matches a route unless it sets `caseSensitive` (0.52
 * code review, feedback/feedback-page-link.ts): the FLW-7 guard compared case-sensitively,
 * and `/Join?token=` went out as a link the router still rendered as `/join`. A RegExp
 * gets the `i` flag for the same reason. Matching more than a case-sensitive route would
 * only turns a link into text, or leaves a page unrecorded as a resume target: both
 * callers' safe side.
 *
 * @internal Package-private — not re-exported from the barrel.
 */
export function matchesPathPattern(pathname: string, pattern: string | RegExp): boolean {
  if (typeof pattern !== "string") {
    return new RegExp(pattern.source, `${pattern.flags.replace(/[gi]/g, "")}i`).test(pathname);
  }
  const path = pathname.toLowerCase();
  if (pattern === "/") return path === "/";
  const base = (pattern.endsWith("/") ? pattern.slice(0, -1) : pattern).toLowerCase();
  return path === base || path.startsWith(`${base}/`);
}

/**
 * The pathname of `href` (a path with its query and hash) as React Router matches it:
 * each segment percent-decoded, an encoded `/` kept as `%2F` so it never splits a segment
 * (react-router 8, `decodePath` in `matchRoutesImpl`). The 0.52 code review
 * (feedback/feedback-page-link.ts) found `/j%6Fin?token=` passing the FLW-7 guard as a
 * link that the router decoded to `/join`.
 *
 * A malformed escape leaves its own segment as written, where the router gives up on the
 * whole path: the rest still decodes, so the answer is never less than the router's.
 *
 * @internal Package-private — not re-exported from the barrel.
 */
export function routerPathname(href: string): string {
  return href
    .replace(/[?#].*$/, "")
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment).replace(/\//g, "%2F");
      } catch {
        return segment;
      }
    })
    .join("/");
}
