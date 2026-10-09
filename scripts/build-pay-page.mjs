#!/usr/bin/env node
/**
 * The pay page (docs/billing-harmonization.md §14.4): `dist/pay/` and the
 * `eifi1-pay-page` bin, after the library's own build.
 *
 * The library is built one file per module (tsup.config.ts, `bundle: false`); the pay
 * page is the opposite — one script for a static page on its own origin, with no React,
 * no module graph and nothing to install. So it is a second build, from `pay-page/`:
 *
 *   - `dist/pay/pay.js`: `pay-page/main.ts` bundled into one classic script, its words
 *     built in. They come from the kit's seven catalogues as `npm run build` just emitted
 *     them (`dist/i18n/locales/*.js`, read through `payPageStrings`), so the page says
 *     exactly what `billing.pay*` says and a translation is made once;
 *   - `dist/pay/index.html`, `pay.css` and Paddle's Apple Pay file under `.well-known/`,
 *     copied as they are;
 *   - `dist/bin/eifi1-pay-page.mjs`: `pay-page/bin.ts` bundled for Node, the package's
 *     bin, which copies `dist/pay/` into an app's build and writes its configuration.
 *
 * Run after `tsup` (it reads `dist/`); `npm run build` does. Fails loudly when the page's
 * script would load anything at all — it is served beside Paddle.js and nothing else.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "tsup";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const SOURCE = join(ROOT, "pay-page");
const OUT = join(DIST, "pay");
const BIN = join(DIST, "bin", "eifi1-pay-page.mjs");

/** The kit's seven languages, as `src/i18n/languages.ts` names them. */
const LANGUAGES = ["de-CH", "en", "es", "fr", "it", "hu", "zh"];
/** Copied as they are. */
const STATIC = ["index.html", "pay.css", ".well-known/apple-developer-merchantid-domain-association"];

const fail = (message) => {
  console.error(`✖ pay page: ${message}`);
  process.exit(1);
};

const built = (path) => {
  const file = join(DIST, path);
  if (!existsSync(file)) fail(`${file} is missing — run tsup first (npm run build)`);
  return pathToFileURL(file).href;
};

// 1. The words, from the built catalogues: each locale's factory (`uiKitLabelsFr`, …).
const { payPageStrings } = await import(built("billing/pay-page.js"));
const strings = {};
for (const code of LANGUAGES) {
  const catalogue = await import(built(`i18n/locales/${code}.js`));
  const factory = Object.entries(catalogue).find(
    ([name, value]) => name.startsWith("uiKitLabels") && typeof value === "function",
  )?.[1];
  if (!factory) fail(`dist/i18n/locales/${code}.js has no uiKitLabels… factory`);
  strings[code] = payPageStrings(factory());
  for (const [key, text] of Object.entries(strings[code])) {
    if (typeof text !== "string" || text === "") fail(`${code} has no word for ${key}`);
  }
}

// tsup's own options only: `config: false` keeps tsup.config.ts (the library's build) out.
const common = {
  config: false,
  bundle: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  clean: false,
  minify: false,
  silent: true,
  tsconfig: join(ROOT, "tsconfig.json"),
};

// 2. The page's one script.
await build({
  ...common,
  entry: { pay: join(SOURCE, "main.ts") },
  outDir: OUT,
  format: ["iife"],
  platform: "browser",
  target: "es2020",
  noExternal: [/./],
  define: { __PAY_STRINGS__: JSON.stringify(strings) },
  outExtension: () => ({ js: ".js" }),
});

// 3. The bin, for Node; the hashbang is the entry's own.
await build({
  ...common,
  entry: { "eifi1-pay-page": join(SOURCE, "bin.ts") },
  outDir: dirname(BIN),
  format: ["esm"],
  platform: "node",
  target: "node20",
  outExtension: () => ({ js: ".mjs" }),
});
chmodSync(BIN, 0o755);

// 4. The static files.
for (const file of STATIC) {
  const target = join(OUT, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(SOURCE, file), target);
}

// The page's script loads nothing: no import, no require, no React.
const script = readFileSync(join(OUT, "pay.js"), "utf8");
for (const [what, pattern] of [
  ["an import", /^\s*import\s|\bimport\(/m],
  ["a require", /\brequire\(/],
  ["React", /["']react(-dom)?(\/[^"']*)?["']/],
]) {
  if (pattern.test(script)) fail(`dist/pay/pay.js contains ${what}`);
}
if (!readFileSync(BIN, "utf8").startsWith("#!/usr/bin/env node")) fail(`${BIN} lost its hashbang`);

console.log(`✓ pay page: dist/pay (${STATIC.length + 1} files, ${LANGUAGES.length} languages), dist/bin/eifi1-pay-page.mjs`);
