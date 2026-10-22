/**
 * The window's title from its parts (0.49 KIT-9): `{page}`, `{section}` and `{app}` in a
 * format, by default "{page} · {section} · {app}" — "Invoices · Finance · Kastlan".
 *
 * A part that is missing (undefined, null, empty or blank) is dropped WITH the separator
 * before it, so "Invoices · Kastlan" never reads "Invoices ·  · Kastlan". The text between
 * two parts is the separator; text before the first part and after the last is kept as
 * written ("[{page} – {app}]" → "[KS]"). No part at all gives "".
 */
export const DEFAULT_DOCUMENT_TITLE_FORMAT = "{page} · {section} · {app}";

/** The parts {@link formatDocumentTitle} fills in. */
export interface DocumentTitleParts {
  page?: string | null;
  section?: string | null;
  app?: string | null;
}

const PLACEHOLDER = /\{(page|section|app)\}/g;

export function formatDocumentTitle(format: string, parts: DocumentTitleParts): string {
  let prefix = "";
  let out = "";
  let pending = "";
  let last = 0;
  let seen = false;
  for (const m of format.matchAll(PLACEHOLDER)) {
    const literal = format.slice(last, m.index!);
    last = m.index! + m[0].length;
    if (!seen) prefix = literal;
    else pending = out === "" ? "" : literal || pending;
    seen = true;
    const value = parts[m[1] as keyof DocumentTitleParts]?.trim();
    if (!value) continue;
    out += (out === "" ? "" : pending) + value;
    pending = "";
  }
  if (!seen) return format;
  if (out === "") return "";
  return prefix + out + format.slice(last);
}
