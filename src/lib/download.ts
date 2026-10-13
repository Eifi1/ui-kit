/**
 * Saving a file the page fetched itself, and reading the name the server gave it
 * (round 0.34 C6, KS U5).
 *
 * Every app behind a token downloads this way: an `<a href>` to an API route carries no
 * `Authorization` header, so the app fetches the bytes and hands them to the browser
 * through an object URL and a link with a `download` name. The kit had written that
 * three times (the translation corrections export, a feedback attachment, the account
 * data export) in three spellings, and Kurvenschmiede had a fourth beside them, each
 * with its own answer to the two questions that matter — whether the link is in the
 * document when it is clicked, and when the URL is revoked. One answer, here:
 *
 * - **The link is attached** (hidden, `rel="noopener"`), clicked once and taken out
 *   again. A detached link downloads in today's Chromium, but Firefox long ignored a
 *   click on a link outside the document, and attaching it costs nothing.
 * - **The URL is revoked a minute later**, not at once. The click only STARTS the
 *   download; the browser reads the URL after this function has returned, and a URL
 *   revoked before that is a download that fails without a word. A minute holds one
 *   reference to a blob the page already had; Kastlan's `openAuthenticatedFile` waits
 *   the same minute for the tab it opens.
 *
 * And the name: server-kit's `content_disposition` writes the ORIGINAL name only in the
 * RFC 6266 / RFC 8187 `filename*=UTF-8''…`, and an ASCII stand-in in the plain
 * `filename=` (accents folded from 0.8). A reader that takes `filename=` alone saves
 * "Grun.pdf" for "Grün.pdf" and "____.pdf" for a name in Chinese, so
 * {@link filenameFromDisposition} reads `filename*` first.
 */

/** How long an object URL handed to a download stays valid. See the module note. */
export const SAVE_BLOB_REVOKE_MS = 60_000;

/**
 * Hand `href` to the browser as a download named `filename`: a hidden link with a
 * `download` name, attached, clicked once and taken out again. The one way a page saves
 * a file without opening a tab that shows it instead.
 *
 * For a URL the caller keeps alive itself — `DataExportSetting` keeps its object URL for
 * the "Didn't start? Save the file" link under the button. Everything else wants
 * {@link saveBlob}.
 */
export function clickDownload(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Save `blob` as a file named `filename` — the browser's own download, as if the person
 * had clicked a link to it.
 *
 * Call it from the handler of the click that asked for the file. After an `await` (the
 * fetch) most browsers still count the click as the person's; a browser that does not
 * holds the download back, and a page that must not lose it keeps a link of its own
 * under the button, as `DataExportSetting` does.
 *
 * ```ts
 * const res = await api.get(path, { responseType: "blob" });
 * saveBlob(res.data, filenameFromDisposition(res.headers["content-disposition"], "report.pdf"));
 * ```
 */
export function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  clickDownload(href, filename);
  setTimeout(() => URL.revokeObjectURL(href), SAVE_BLOB_REVOKE_MS);
}

/* ── Content-Disposition ─────────────────────────────────────────────────── */

/**
 * The parameters of a `Content-Disposition` value, names lower-cased. `;` separates
 * them except inside a quoted string, whose backslash escapes are undone; a bare token
 * (the disposition type, `attachment`) is skipped. The first of a repeated name wins.
 */
function dispositionParams(header: string): Map<string, string> {
  const params = new Map<string, string>();
  const n = header.length;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && header[j] !== "=" && header[j] !== ";") j++;
    const name = header.slice(i, j).trim().toLowerCase();
    if (j >= n || header[j] === ";") {
      i = j + 1;
      continue;
    }
    j++; // past "="
    while (j < n && (header[j] === " " || header[j] === "\t")) j++;
    let value = "";
    if (header[j] === '"') {
      j++;
      while (j < n && header[j] !== '"') {
        if (header[j] === "\\" && j + 1 < n) j++;
        value += header[j];
        j++;
      }
      // Past the closing quote and whatever stray text follows it up to the next ";".
      while (j < n && header[j] !== ";") j++;
    } else {
      const end = header.indexOf(";", j);
      value = header.slice(j, end === -1 ? n : end).trim();
      j = end === -1 ? n : end;
    }
    if (name && !params.has(name)) params.set(name, value);
    i = j + 1;
  }
  return params;
}

/** An RFC 8187 ext-value — `charset'language'percent-encoded` — decoded, or undefined
 *  for a charset it cannot read or an encoding that is broken. */
function decodeExtValue(value: string): string | undefined {
  const match = /^([^']*)'[^']*'(.*)$/.exec(value);
  if (!match) return undefined;
  const charset = match[1].trim().toLowerCase();
  const encoded = match[2];
  if (charset === "utf-8" || charset === "utf8") {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return undefined; // a stray "%" or a cut-off sequence
    }
  }
  if (charset === "iso-8859-1") {
    return encoded.replace(/%([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  }
  return undefined;
}

/** A name safe to put in a `download` attribute or on screen: the last path segment
 *  (RFC 6266 §4.3 — a recipient strips directory information), without control
 *  characters, trimmed; undefined when nothing is left. */
function cleanFilename(name: string | undefined): string | undefined {
  if (name === undefined) return undefined;
  const base = name.slice(Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\")) + 1);
  const clean = Array.from(base)
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join("")
    .trim();
  return clean && !/^\.+$/.test(clean) ? clean : undefined;
}

/**
 * The file name a `Content-Disposition` header asks for: the RFC 8187 `filename*`
 * (`UTF-8''Gr%C3%BCn.pdf`, the one that carries a name in any script) first, then the
 * plain `filename=`, quoted or not. Directory parts are dropped. Never throws: a missing
 * header, a header with no name, a broken encoding all come back as `fallback` —
 * `undefined` when none is given.
 *
 * Reads exactly what server-kit's `content_disposition` writes. With axios the header is
 * `res.headers["content-disposition"]`, with `fetch` `res.headers.get("Content-Disposition")`
 * — and across origins only when the server lists it in `Access-Control-Expose-Headers`.
 */
export function filenameFromDisposition(header: string | null | undefined): string | undefined;
export function filenameFromDisposition(header: string | null | undefined, fallback: string): string;
export function filenameFromDisposition(header: string | null | undefined, fallback?: string): string | undefined {
  if (typeof header !== "string" || header === "") return fallback;
  const params = dispositionParams(header);
  const extended = params.get("filename*");
  return (
    cleanFilename(extended === undefined ? undefined : decodeExtValue(extended)) ??
    cleanFilename(params.get("filename")) ??
    fallback
  );
}
