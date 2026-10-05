import { useEffect } from "react";

/**
 * Marks the current page as not for search engines: a `<meta name="robots"
 * content="noindex">` in the document head while the calling component is mounted.
 *
 * keksdose's hook (shared/hooks/use-noindex.ts, feedback #97 and #129), for every app:
 * the contract puts it on the three legal pages and on every auth page
 * (docs/legal-harmonization.md §3.2). {@link LegalPage} calls it itself.
 *
 * It is the best-effort, client-side half. The authoritative half is the web server's
 * `X-Robots-Tag: noindex` on those routes (keksdose's Caddy `@noindex`), which a crawler
 * reads without running any script; this covers the dev server and any setup without
 * that header.
 *
 * The cleanup is the point of a hook rather than a tag in `index.html`: in a single-page
 * app the head outlives the page, so without it a visitor's navigation from a legal page
 * into the app would carry the marker onto pages that should be indexed. Each call adds
 * its OWN element and removes exactly that one, so two mounted callers (a page and a
 * dialog on it) never take each other's marker away.
 *
 * `active = false` adds nothing — for a page component that is also rendered as a
 * preview inside another page (the showcase), where the host page's indexing is not its
 * business. Hooks cannot be called conditionally, so the switch is an argument.
 */
export function useNoIndex(active: boolean = true): void {
  useEffect(() => {
    if (!active) return;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, [active]);
}
