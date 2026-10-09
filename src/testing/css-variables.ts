import { KIT_NAMES, TAILWIND_THEME_NAMES } from "./css-variables.generated";

/**
 * The guard against an undeclared CSS custom property (0.33,
 * docs/colour-roles-harmonization.md §8, §12.5).
 *
 * A `var(--name)` with no fallback, where nothing declares `--name`, makes the whole
 * declaration invalid at computed-value time: `fill` inherits, `color` inherits, a
 * background goes transparent. Kurvenschmiede's control diagram painted
 * `fill-[var(--surface)]` — a token that never existed (the kit's is `--bg-surface`) —
 * and drew black boxes on a public page. The class compiled, the build passed, the type
 * checker had no opinion, and nothing in any suite noticed. This is the check that
 * notices, run from an app's own test over the source texts the app collects.
 *
 * Browser-safe on purpose, like the rest of the kit: it takes TEXTS, not paths, so an app
 * reads its files however its setup allows (`import.meta.glob` with `?raw`, or `node:fs`)
 * and the kit carries no `node:fs`.
 */

/** Every custom property the installed kit declares or publishes to apps.
 *
 *  Generated from `tokens.css` when the kit is built (scripts/gen-kit-css-variables.mjs),
 *  so it is always the installed version's, and an app never searches `node_modules`.
 *  It leaves out two kinds of name on purpose:
 *  - a name declared only in an `@theme inline` block (`--text-color-muted`,
 *    `--background-color-surface`): Tailwind emits no variable for it, so
 *    `var(--text-color-muted)` would pass a guard that counted it and paint nothing;
 *  - AppShell's measured `--app-nav-h`, which exists only while an AppShell is mounted —
 *    on a landing, legal, sign-in or pay page it is undefined. Read it with a fallback,
 *    `var(--app-nav-h,0px)`, as every kit read does.
 *  Everything `applyTokenSet` and More contrast write on `<html>` is in, through the
 *  stylesheet's `:root` / `.dark` mirror. Component internals (`--slider-fill`, `--fp-*`,
 *  `--icon-button-tone`, `--label-strip-edge`) are not: an app that reads one depends on
 *  the kit's internals, and the guard says so. */
export const KIT_CSS_VARIABLES: ReadonlySet<string> = new Set(KIT_NAMES.split(" "));

/** Tailwind's own theme variables (`--color-rose-500`, `--spacing`, `--text-sm` …), from
 *  the `tailwindcss/theme.css` the kit builds with. Tailwind emits one when a scanned file
 *  names it, so a `var()` of it resolves. */
const TAILWIND_THEME: ReadonlySet<string> = new Set(TAILWIND_THEME_NAMES.split(" "));

/** A Tailwind PALETTE colour: a hue with a shade, black or white. `refusePalette` reports
 *  these although they resolve — an app that has no palette lint asks this test to be
 *  its refusal. */
const PALETTE_VARIABLE = /^--color-(?:[a-z]+-\d{2,3}|black|white)$/;

/** Read only where it is set: the guard accepts it in a fallback use, never bare. */
const APP_NAV_H = "--app-nav-h";

export interface UndeclaredCssVariablesOptions {
  /** Variables a library writes at runtime, as names or patterns:
   *  `["--radix-collapsible-content-height"]`. An app's own writes are found in its
   *  source and need no listing. */
  runtime?: readonly (string | RegExp)[];
  /** Also check `var(--x, …)`. Off by default: a fallback says what happens when the
   *  name is missing. `--app-nav-h` counts as declared only here. */
  checkFallbacks?: boolean;
  /** Report Tailwind palette variables (`--color-red-500`, `--color-white`) although
   *  they resolve. Default false. */
  refusePalette?: boolean;
}

/** Comments are not CSS. `/* *\/` in both; `//` in TS only (not after a `:`, so a URL in a
 *  string survives). Replaced by spaces of the same shape, so line numbers hold. */
function stripComments(text: string, isCss: boolean): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  const noBlocks = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  return isCss ? noBlocks : noBlocks.replace(/(^|[^:])(\/\/[^\n]*)/g, (_, pre: string, c: string) => pre + blank(c));
}

/** The text with every `@theme … inline … { … }` block blanked out, braces and all. */
function withoutInlineTheme(css: string): string {
  let out = css;
  for (const m of css.matchAll(/@theme\b[^{;]*\binline\b[^{;]*\{/g)) {
    let depth = 0;
    let end = m.index + m[0].length - 1;
    for (; end < css.length; end++) {
      if (css[end] === "{") depth++;
      else if (css[end] === "}" && --depth === 0) break;
    }
    out = out.slice(0, m.index) + css.slice(m.index, end + 1).replace(/[^\n]/g, " ") + out.slice(end + 1);
  }
  return out;
}

/**
 * Every custom property a stylesheet declares (`--name:`), in any block — except a name
 * declared only inside `@theme inline`, which Tailwind never emits as a variable. Comments
 * are skipped. The same rule builds {@link KIT_CSS_VARIABLES} from `tokens.css`.
 */
export function declaredCustomProperties(css: string): Set<string> {
  const code = withoutInlineTheme(stripComments(css, true));
  return new Set([...code.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((m) => m[1]));
}

/** What an app's source writes at runtime: `setProperty("--name"`, a React style key
 *  `"--name":`, a Tailwind arbitrary property `[--name:…]`. */
function runtimeWrites(code: string): string[] {
  return [
    ...code.matchAll(/setProperty\(\s*["'`](--[a-zA-Z0-9_-]+)["'`]/g),
    ...code.matchAll(/["'](--[a-zA-Z0-9_-]+)["']\s*:/g),
    ...code.matchAll(/\[(--[a-zA-Z0-9_-]+):/g),
  ].map((m) => m[1]);
}

/** A chart series' colour (`var(--color-total)`) is declared in a file with a `total: {`
 *  config entry: the kit's ChartContainer writes `--color-<key>` for each key. */
function chartKeys(code: string): Set<string> {
  return new Set([...code.matchAll(/(?:^|[\s{,])["']?([A-Za-z_][\w-]*)["']?\s*:\s*\{/g)].map((m) => m[1]));
}

const isCssPath = (path: string) => /\.css(?:\?|$)/.test(path);

/**
 * Every `var(--name)` without a fallback that nothing declares, as `"path:line --name"`.
 *
 * `sources` maps a path to its text: the app's `.ts`, `.tsx` and `.css` source, tests
 * left out. A name counts as declared when it is:
 * 1. the kit's ({@link KIT_CSS_VARIABLES});
 * 2. declared in any `.css` entry of `sources` (outside `@theme inline`);
 * 3. written by the source at runtime (`setProperty`, a style key, `[--name:…]`);
 * 4. one of Tailwind's theme variables — unless `refusePalette` and it is a palette colour;
 * 5. a chart series' `--color-<key>`, in a file with a `<key>: {` entry;
 * 6. listed in `options.runtime`.
 *
 * Not counted: comments; a use with a fallback, unless `checkFallbacks`; a name built at
 * runtime (`` `var(--chart-${n})` `` — a name must be followed by `)` or `,`).
 *
 * It REFUSES A VACUOUS RUN: it throws when `sources` holds fewer than ten files, or when
 * a `.css` entry is empty. Vitest stubs every stylesheet with an empty string by default,
 * `?raw` included, so an app that reads its CSS that way without opting it out of the stub
 * (`test.css.include`) would otherwise lose every declaration and every use in it, and
 * this would pass or fail for the wrong reason.
 */
export function undeclaredCssVariables(
  sources: Record<string, string>,
  options: UndeclaredCssVariablesOptions = {},
): string[] {
  const { runtime = [], checkFallbacks = false, refusePalette = false } = options;
  const entries = Object.entries(sources);
  if (entries.length < 10) {
    throw new Error(
      `undeclaredCssVariables: only ${entries.length} source file(s) — the glob or the file list found ` +
        `(almost) nothing, and a check over nothing passes. Pass the app's .ts/.tsx/.css source.`,
    );
  }
  const emptyCss = entries.filter(([path, text]) => isCssPath(path) && text.trim() === "").map(([path]) => path);
  if (emptyCss.length) {
    throw new Error(
      `undeclaredCssVariables: ${emptyCss.join(", ")} read as empty. Vitest stubs stylesheets with "" ` +
        `(\`?raw\` too) unless the file is listed in \`test.css.include\`.`,
    );
  }

  const code = entries.map(([path, text]) => [path, stripComments(text, isCssPath(path))] as const);
  const declared = new Set<string>();
  for (const [path, text] of code) {
    if (isCssPath(path)) for (const name of declaredCustomProperties(text)) declared.add(name);
    for (const name of runtimeWrites(text)) declared.add(name);
  }
  const listed = (name: string) =>
    runtime.some((r) => (typeof r === "string" ? r === name : r.test(name)));

  const out: string[] = [];
  for (const [path, text] of code) {
    let keys: Set<string> | null = null;
    for (const m of text.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*([,)])/g)) {
      const [, name, next] = m;
      const fallback = next === ",";
      if (fallback && !checkFallbacks) continue;
      if (KIT_CSS_VARIABLES.has(name) || declared.has(name) || listed(name)) continue;
      if (fallback && name === APP_NAV_H) continue;
      if (TAILWIND_THEME.has(name)) {
        if (refusePalette && PALETTE_VARIABLE.test(name)) {
          out.push(`${path}:${lineOf(text, m.index)} ${name} (a Tailwind palette colour; refusePalette is on)`);
        }
        continue;
      }
      const chart = /^--color-([A-Za-z_][\w-]*)$/.exec(name);
      if (chart && (keys ??= chartKeys(text)).has(chart[1])) continue;
      out.push(`${path}:${lineOf(text, m.index)} ${name}`);
    }
  }
  return out;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}
