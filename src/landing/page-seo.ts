import { useEffect } from "react";

/**
 * Search-engine helpers for the public landing page (docs/landing-demo-harmonization.md
 * §4.3): the hook that declares a page's canonical URL, title, description and JSON-LD,
 * and the two pure helpers each app's SEO test is built from.
 */

/**
 * Declares the current page's canonical URL — and optionally its title and meta
 * description — while the calling component is mounted (feedback #129).
 *
 * Client-side because there is nowhere else to put it: the SPA is served by
 * Caddy's `try_files … /index.html`, so every route shares one static head.
 * Googlebot renders JS and reads the canonical from the RENDERED DOM, which is
 * what makes this work; non-rendering scrapers (WhatsApp, Slack) only ever see
 * index.html's static tags, which is why those stay in place as the fallback.
 *
 * The href is resolved against `window.location.origin` rather than hardcoded, so
 * a preview deployment or the VPS host stays self-referential instead of pointing
 * every copy of the app at production.
 *
 * The cleanup matters for the same reason as in {@link useNoIndex}: an SPA
 * navigation from the landing page into the app must not leave the landing's
 * canonical (or title) behind on an app page.
 *
 * 0.31 (§4.3): keksdose's `usePageSeo` (shared/hooks/use-page-seo.ts), verbatim. The
 * landing calls it with `canonicalPath: "/"` on both `/` and `/welcome`, so the two URLs
 * of one page are one result; there are no per-language URLs and no hreflang.
 */
export function usePageSeo({
  canonicalPath,
  title,
  description,
  jsonLd,
}: {
  canonicalPath: string;
  title?: string;
  description?: string;
  /** Structured data for this page, as the object (not a string). Injected as an
   *  `application/ld+json` DATA BLOCK — a script element the browser never executes,
   *  which is also why it can be added here rather than in `index.html`: the CSP
   *  carries a HASH of the one inline script that file is allowed to have, and
   *  `csp-inline-script.test.ts` fails the build on a second one (live #250). */
  jsonLd?: Record<string, unknown>;
}): void {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = new URL(canonicalPath, window.location.origin).toString();
    document.head.appendChild(link);

    const previousTitle = document.title;
    if (title) document.title = title;

    // The description tag ships in index.html, so upsert rather than append —
    // two `meta[name=description]` tags would be a coin flip for the scraper.
    const meta = description
      ? document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
      : null;
    const previousDescription = meta?.content;
    if (meta && description) meta.content = description;

    let ld: HTMLScriptElement | null = null;
    if (jsonLd) {
      ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(ld);
    }

    return () => {
      link.remove();
      ld?.remove();
      if (title) document.title = previousTitle;
      if (meta && previousDescription !== undefined) meta.content = previousDescription;
    };
    // `jsonLd` is built inline by the caller, so it is a new object every render and
    // cannot be a dependency — it is derived from `title`/`description`, which are.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalPath, title, description]);
}

/* ── The SEO test's helpers ──────────────────────────────────────────────── */

/** What a search result shows of the landing, in one language. */
export interface SeoCopy {
  /** The page title (`landing.seo.title`): "Keksdose — envelope budgeting". */
  title: string;
  /** The meta description. */
  description: string;
  /** The product name the title carries, before or after its tagline. */
  brand: string;
}

/** The width budgets, as characters. */
export interface SeoCopyLimits {
  /** Default 60: a result's title is cut around 580px. */
  maxTitle?: number;
  /** Default 155: a snippet is cut around 920px. */
  maxDescription?: number;
}

export type SeoCopyProblemCode =
  | "title-empty"
  | "description-empty"
  | "title-too-long"
  | "description-too-long"
  | "title-without-brand"
  | "description-repeats-title";

/** One thing wrong with a language's copy. `message` is for the test's failure output. */
export interface SeoCopyProblem {
  code: SeoCopyProblemCode;
  message: string;
}

/** Characters as a reader counts them: code points, so an emoji or a rare CJK character
 *  is one, not two UTF-16 units. */
const length = (text: string) => Array.from(text).length;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The separators a title puts between the brand and its tagline. */
const SEPARATOR = "\\s*[—–\\-|:·•]\\s*";

/** The title without the brand and its separator, or `null` when the brand is in
 *  neither place. */
function taglineOf(title: string, brand: string): string | null {
  const name = escapeRegExp(brand.trim());
  const leading = new RegExp(`^${name}${SEPARATOR}`, "i");
  if (leading.test(title)) return title.replace(leading, "").trim();
  const trailing = new RegExp(`${SEPARATOR}${name}$`, "i");
  if (trailing.test(title)) return title.replace(trailing, "").trim();
  return null;
}

/**
 * What is wrong with one language's search-result copy (§4.3) — an empty list when
 * nothing is. keksdose's landing-seo.test.ts (live #305), made reusable:
 *
 * - the title fits `maxTitle` characters (60) and the description `maxDescription`
 *   (155) — conservative stand-ins for Google's pixel budgets; German is the language
 *   most likely to blow through them, and what gets cut is always the end;
 * - the title carries the brand, before or after its tagline ("Keksdose — …");
 * - the description does not open with the title's tagline again — a snippet that
 *   repeats the line above it spends its first forty characters saying nothing new.
 *
 * ```ts
 * for (const [locale, bundle] of Object.entries(LOCALES)) {
 *   it(`fits ${locale} into a search result`, () => {
 *     expect(seoCopyProblems({ ...bundle.landing.seo, brand: "Keksdose" })).toEqual([]);
 *   });
 * }
 * ```
 */
export function seoCopyProblems(copy: SeoCopy, limits: SeoCopyLimits = {}): SeoCopyProblem[] {
  const { maxTitle = 60, maxDescription = 155 } = limits;
  const title = copy.title.replace(/\s+/g, " ").trim();
  const description = copy.description.replace(/\s+/g, " ").trim();
  const problems: SeoCopyProblem[] = [];
  if (!title) problems.push({ code: "title-empty", message: "the title is empty" });
  if (!description) problems.push({ code: "description-empty", message: "the description is empty" });
  if (length(title) > maxTitle) {
    problems.push({
      code: "title-too-long",
      message: `the title is ${length(title)} characters, over ${maxTitle}: "${title}"`,
    });
  }
  if (length(description) > maxDescription) {
    problems.push({
      code: "description-too-long",
      message: `the description is ${length(description)} characters, over ${maxDescription}: "${description}"`,
    });
  }
  if (!title) return problems;
  const tagline = taglineOf(title, copy.brand);
  if (tagline === null) {
    problems.push({
      code: "title-without-brand",
      message: `the title does not start or end with "${copy.brand}" and a separator: "${title}"`,
    });
  }
  const repeated = (tagline ?? title).toLowerCase();
  if (repeated && description.toLowerCase().startsWith(repeated)) {
    problems.push({
      code: "description-repeats-title",
      message: `the description opens with the title's tagline "${tagline ?? title}"`,
    });
  }
  return problems;
}

/** The five named references and the numeric ones — enough for a meta tag's text. */
function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
    if (ref[0] === "#") {
      const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return named[ref.toLowerCase()] ?? whole;
  });
}

/** A tag's attributes, names lower-cased; values double-, single- or un-quoted. */
function attributesOf(tag: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const m of tag.matchAll(/([^\s=/<>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    found.set(m[1]!.toLowerCase(), m[2] ?? m[3] ?? m[4] ?? "");
  }
  return found;
}

/**
 * The `content` of the first `<meta>` in `html` that `selector` picks, whitespace
 * collapsed and entities decoded — or `undefined` when there is none. For each app's
 * parity test (§4.3): `index.html`'s static description and `og:` tags must equal the
 * default language's strings, because a scraper that runs no script (WhatsApp, Slack)
 * sees only those.
 *
 * `selector` names attributes, as in CSS — `meta[name="description"]`,
 * `[property="og:title"]` or just `property="og:description"` — and every one named must
 * match. A `RegExp` is matched against the tag's source instead (keksdose's form).
 * String parsing, not a DOM: the test runs under `@vitest-environment node`.
 *
 * ```ts
 * expect(metaContent(html, 'meta[name="description"]')).toBe(de.landing.seo.description);
 * ```
 */
export function metaContent(html: string, selector: string | RegExp): string | undefined {
  const wanted =
    typeof selector === "string"
      ? Array.from(selector.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g), (m) => [
          m[1]!.toLowerCase(),
          m[2] ?? m[3] ?? "",
        ])
      : null;
  if (wanted !== null && wanted.length === 0) {
    throw new Error(`metaContent: the selector names no attribute: ${selector as string}`);
  }
  const pattern = selector instanceof RegExp ? new RegExp(selector.source, selector.flags.replace("g", "")) : null;
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributesOf(tag);
    const matches = pattern ? pattern.test(tag) : wanted!.every(([name, value]) => attrs.get(name!) === value);
    if (!matches) continue;
    const content = attrs.get("content");
    return content === undefined ? undefined : decodeEntities(content).replace(/\s+/g, " ").trim();
  }
  return undefined;
}
