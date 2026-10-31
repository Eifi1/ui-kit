#!/usr/bin/env node
/**
 * `dist/i18n/locales/en.js` as ONE module, like the other six catalogues (0.34, KS U8).
 *
 * Every other catalogue is written out word for word and imports nothing but the kit's
 * `formatFileSize`, so an app that fetches it lazily (`loadUiKitLabels`) fetches one
 * chunk. English is the defaults: `locales/en.ts` spreads `DEFAULT_UI_KIT_LABELS`, which
 * imports the words of ~90 components from their `*-labels.ts` modules. Those modules
 * hold no component code (since 0.34; before, the defaults lived in the components and
 * Kurvenschmiede measured 99 kB gzip across 40 chunks for an English reader). But the
 * same modules are imported by the components too, so in an app that splits its routes
 * the bundler still files each one into a chunk shared with the route that uses it, and
 * `en` arrived as one chunk plus one small chunk per such route — 17 in a build shaped
 * like Kurvenschmiede's.
 *
 * So the build inlines them: this bundles `src/i18n/locales/en.ts` with everything it
 * reaches EXCEPT `kit-labels` — the provider module, which holds the React context and
 * must stay one instance — over the per-module `en.js` tsup emitted. The words are the
 * same source, copied at build time, never by hand; the `.d.ts` is tsc's
 * (scripts/build-dts.mjs, since 0.34), unchanged.
 *
 * Fails loudly when the catalogue would reach anything but words: a module that is not a
 * label module (`*-labels.ts`, the registry, `auth-errors`' two English helpers,
 * `wizard/types`) would put component code into every English reader's first wave, which
 * is the regression this exists to prevent. `src/i18n/__tests__/english-catalogue-graph`
 * says the same of the source, earlier.
 *
 * Run after `tsup` and `fix-esm-extensions` (it replaces their en.js); `npm run build`
 * does. `npm run check:graph` checks the result with the other catalogues.
 */
import { relative, resolve, dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { build } from "esbuild";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const ENTRY = join(SRC, "i18n/locales/en.ts");
const OUT = join(ROOT, "dist/i18n/locales/en.js");
/** Shared with the rest of the kit, never copied: the React context lives here. */
const SHARED = join(SRC, "i18n/kit-labels.tsx");
/** What may be copied into the catalogue: modules of words. Keep in step with
 *  `WORDS` in src/i18n/__tests__/english-catalogue-graph.test.ts. */
const WORDS = [
  /\/src\/i18n\/locales\/en\.ts$/,
  /\/src\/i18n\/defaults\.ts$/,
  /-labels\.ts$/,
  /\/src\/auth\/auth-errors\.ts$/,
  /\/src\/wizard\/types\.ts$/,
];

const fail = (message) => {
  console.error(`✖ flatten-en: ${message}`);
  process.exit(1);
};
if (!existsSync(OUT)) fail(`${relative(ROOT, OUT)} is missing — run tsup first (npm run build)`);

const sourceOf = (base) => [".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext).find(existsSync);

const result = await build({
  entryPoints: [ENTRY],
  outfile: OUT,
  allowOverwrite: true,
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  metafile: true,
  logLevel: "warning",
  // As tsup's banner on every other module (tsup.config.ts says why).
  banner: { js: '"use client";' },
  plugins: [
    {
      name: "words-only",
      setup(b) {
        // A package (react, through a label module's hook) stays a package import.
        b.onResolve({ filter: /^[^./]/ }, (args) => ({ path: args.path, external: true, sideEffects: false }));
        b.onResolve({ filter: /^\./ }, (args) => {
          const file = sourceOf(resolve(args.resolveDir, args.path));
          if (!file) return undefined;
          if (file !== SHARED) return { path: file };
          // The emitted sibling, as fix-esm-extensions writes every other specifier.
          const target = join(ROOT, "dist", relative(SRC, file)).replace(/\.tsx?$/, ".js");
          let spec = relative(dirname(OUT), target).replaceAll("\\", "/");
          if (!spec.startsWith(".")) spec = `./${spec}`;
          return { path: spec, external: true, sideEffects: false };
        });
      },
    },
  ],
});

const copied = Object.keys(result.metafile.inputs).map((p) => resolve(ROOT, p));
const strays = copied.filter((p) => !WORDS.some((re) => re.test(p.replaceAll("\\", "/"))));
if (strays.length) {
  fail(
    `the English catalogue reaches modules that are not words:\n  ${strays
      .map((p) => relative(ROOT, p))
      .join("\n  ")}\nmove the defaults it needs into a *-labels.ts module (see src/i18n/defaults.ts)`,
  );
}
const imports = [
  ...readFileSync(OUT, "utf8").matchAll(
    /(?:^|[;\s])(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g,
  ),
].map((m) => m[1] ?? m[2]);
const unexpected = imports.filter((s) => s !== "../kit-labels.js");
if (unexpected.length) fail(`en.js imports ${unexpected.join(", ")} — only ../kit-labels.js is expected`);

console.log(`English catalogue: one module, ${copied.length} sources of words inlined`);
