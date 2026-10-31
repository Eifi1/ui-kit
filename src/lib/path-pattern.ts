/**
 * Whether a pathname is one a `PathPattern` names — the rule `useLastVisitedPage`'s
 * `exclude` reads (landing/routing.tsx), here without the router: the feedback parts
 * need it too (refactor audit 2026-10-30, FLW-7), and `landing/routing` imports
 * react-router, which `/feedback` must not drag in.
 *
 * A string is that path and everything under it (`/join` is `/join` and `/join/abc`, not
 * `/joined`; `/` is only `/`); a RegExp is tested on the pathname (a `g` flag dropped, so
 * `lastIndex` never carries over between calls).
 *
 * @internal Package-private — not re-exported from the barrel.
 */
export function matchesPathPattern(pathname: string, pattern: string | RegExp): boolean {
  if (typeof pattern !== "string") return new RegExp(pattern.source, pattern.flags.replace("g", "")).test(pathname);
  if (pattern === "/") return pathname === "/";
  const base = pattern.endsWith("/") ? pattern.slice(0, -1) : pattern;
  return pathname === base || pathname.startsWith(`${base}/`);
}
