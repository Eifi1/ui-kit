import { useEffect } from "react";
import { useKitDocumentTitle } from "../i18n/kit-labels";
import { DEFAULT_DOCUMENT_TITLE_FORMAT, formatDocumentTitle } from "../lib/document-title";

/**
 * Writes the window's title (`document.title`) while the calling component is mounted,
 * and puts back the title it found when it unmounts (0.49 KIT-9).
 *
 * `parts` are positional: `[page, section, app]`. The app falls back to the provider's
 * `appName`, the format to the provider's `documentTitleFormat` (default
 * "{page} · {section} · {app}"); a missing part drops with its separator
 * ({@link formatDocumentTitle}). Parts that are ALL empty write nothing — the provider's
 * app alone is not a page's title.
 *
 * `PageHeader` calls it for its `h1` (`documentTitle`); call it yourself for a page
 * without one.
 */
export function useDocumentTitle(parts: ReadonlyArray<string | null | undefined | false>): void {
  const { format, appName } = useKitDocumentTitle();
  const [page, section, app] = parts.map((p) => (typeof p === "string" && p.trim() !== "" ? p : undefined));
  const any = parts.some((p) => typeof p === "string" && p.trim() !== "");
  const title = any ? formatDocumentTitle(format ?? DEFAULT_DOCUMENT_TITLE_FORMAT, { page, section, app: app ?? appName }) : null;
  useEffect(() => {
    if (title === null || title === "") return;
    const before = document.title;
    document.title = title;
    return () => {
      document.title = before;
    };
  }, [title]);
}
