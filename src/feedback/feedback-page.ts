/**
 * The page a report names, reduced to structure — never to content (0.60, keksdose legal
 * audit 2026-11-11, G-10).
 *
 * A query string carries what the person typed: keksdose's register keeps its search in
 * `?q=` and its column filters, which hold payee names, in `f.<col>`. The crash reporter
 * has reduced its page to an allow-list since 0.27; the submit dialog sent
 * `location.href` whole, into a column every admin reads. Both now go through this one
 * function, so the two channels cannot drift apart. Its own module, because the dialog's
 * hook sits in the top bar and must not pull the crash reporter in with it.
 *
 * An ALLOW-list, so a param added later is dropped until somebody decides otherwise. The
 * hash goes too.
 */

/** The page as `pathname?allowed=params` — never anything else. A page that will not
 *  parse still has a pathname worth having (kk `crash-report.ts:163-167`). */
export function reducePage(page: unknown, allow: ReadonlySet<string>): string {
  const raw = typeof page === "string" ? page : "";
  try {
    // The base only lets a path parse; it never leaves this function.
    const url = new URL(raw, "http://localhost");
    const kept = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (allow.has(key)) kept.append(key, value);
    }
    const query = kept.toString();
    return `${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return raw.split(/[?#]/)[0];
  }
}

/** A full address with its page reduced ({@link reducePage}): `origin` + the pathname +
 *  the allowed params. `""` stays `""`. */
export function reduceAddress(href: string, allow: ReadonlySet<string>): string {
  if (!href) return "";
  let origin = "";
  try {
    origin = new URL(href).origin;
  } catch {
    // A path-only address keeps no origin it never had.
  }
  return `${origin}${reducePage(href, allow)}`;
}
