#!/usr/bin/env node
/**
 * The build is only correct if it preserves the module graph. A bundling build would
 * fuse the modules into one chunk and `sideEffects` could no longer let a consumer
 * drop what it does not use — the regression that dragged all ~433KB of recharts into
 * Keksdose's entry chunk. Assert the graph, not a string.
 *
 * Since 0.34 (MOD-6, refactor audit 2026-10) it also guards what that regression costs,
 * rather than only its shape:
 *   - every source module has its own dist/ module (the floor was "more than 50" against
 *     ~400, so a partial bundling would have passed);
 *   - no runtime import cycle among the dist/ modules (there are none; a cycle is where
 *     load order starts to matter, and where a bundler stops splitting cleanly);
 *   - an import-cost budget: Rollup bundles `{ Button }`, `{ Spinner }`, `{ cn }` and the
 *     shell set from dist/, the way an app's build does, and fails above the ceiling.
 * Which modules may import recharts at all is packaging-contract.test.ts's rule.
 *
 * Run after `npm run build`. Part of `npm run check`, which CI calls as it is.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
// Both come with tsup (Rollup was its declaration bundler; esbuild its compiler).
import { transform } from "esbuild";
import { rollup } from "rollup";

const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

const chart = "dist/components/chart.js";
if (!existsSync(chart)) fail(`${chart} is missing — run \`npm run build\` first`);
if (!readFileSync(chart, "utf8").includes('from "recharts"')) {
  fail(`${chart} no longer imports recharts itself — the build bundled it`);
}

// One file per source module, not a bundle: a bundling build collapses these. The floor
// is the source tree itself (tests, the test harness and ambient .d.ts excepted).
const sourceModules = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__" && path !== join("src", "test")) sourceModules(path, out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") && !/\.test\./.test(entry.name)) {
      out.push(
        relative("src", path)
          .replace(/\\/g, "/")
          .replace(/\.tsx?$/, ""),
      );
    }
  }
  return out;
};
const sources = sourceModules("src");
const unbuilt = sources.filter((id) => !existsSync(join("dist", `${id}.js`)));
if (unbuilt.length) {
  fail(
    `${unbuilt.length} of ${sources.length} source modules have no dist/ module of their own: ${unbuilt.slice(0, 5).join(", ")}`,
  );
}
const files = sources.length;

// A catalogue is words. An app fetches the reader's language lazily (`loadUiKitLabels`),
// and whatever a catalogue imports comes along in that wave: the English one imported
// 79 components in 0.33 and arrived as ~40 chunks, 99 kB gzip, where the others are one
// (0.34, KS U8). So no catalogue may reach a module outside dist/i18n/ — en.js reaches
// only kit-labels.js, since scripts/flatten-en.mjs makes it one file.
const LOCALES = "dist/i18n/locales";
const staticImports = (file) =>
  [...readFileSync(file, "utf8").matchAll(/(?:\bfrom\s*|\bimport\s+)"(\.{1,2}\/[^"]+)"/g)].map((m) =>
    join(file, "..", m[1]),
  );
const catalogues = readdirSync(LOCALES).filter((name) => name.endsWith(".js"));
if (catalogues.length < 7) fail(`${LOCALES} has ${catalogues.length} catalogues — expected the seven languages`);
for (const name of catalogues) {
  const seen = new Set();
  const walk = (file, chain) => {
    if (seen.has(file)) return;
    seen.add(file);
    if (!file.startsWith("dist/i18n/")) {
      fail(
        `${LOCALES}/${name} reaches ${file} (${chain.join(" → ")}) — a catalogue imports nothing ` +
          "outside i18n/ (`npm run build` flattens en.js; see scripts/flatten-en.mjs)",
      );
    }
    for (const next of staticImports(file)) walk(next, [...chain, next]);
  };
  walk(join(LOCALES, name), [join(LOCALES, name)]);
}

// A service worker bundles `@eifi1/ui-kit/push-worker` (0.46, notifications §10.6 rule 5): its
// closure imports no package (React, a component's dependency) and no component module —
// only the handler's own module, which is dependency-free.
{
  const PUSH_WORKER = "dist/push-worker.js";
  const reached = new Set();
  const walk = (file) => {
    if (reached.has(file)) return;
    reached.add(file);
    const bare = [...readFileSync(file, "utf8").matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)"([^".][^"]*)"/g)].map(
      (m) => m[1],
    );
    if (bare.length)
      fail(`${PUSH_WORKER} reaches ${file}, which imports ${bare.join(", ")} — a worker entry imports no package`);
    for (const next of staticImports(file)) walk(next);
  };
  walk(PUSH_WORKER);
  const allowed = new Set([PUSH_WORKER, join("dist", "notifications", "push-worker.js")]);
  const extra = [...reached].filter((file) => !allowed.has(file));
  if (extra.length)
    fail(`${PUSH_WORKER} reaches ${extra.join(", ")} — only notifications/push-worker.js may come with it`);
}

// No runtime import cycle among the modules: static imports only, since a type import is
// gone from the .js and a dynamic `import()` runs after its importer has loaded. The pay
// page and the bin are bundles of their own.
const jsModules = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path !== join("dist", "pay") && path !== join("dist", "bin")) jsModules(path, out);
    } else if (entry.name.endsWith(".js")) out.push(path);
  }
  return out;
};
const graph = new Map(jsModules("dist").map((file) => [file, staticImports(file)]));
const visiting = new Set();
const done = new Set();
const cycleFrom = (file, chain) => {
  if (visiting.has(file)) return [...chain.slice(chain.indexOf(file)), file];
  if (done.has(file)) return null;
  visiting.add(file);
  for (const next of graph.get(file) ?? []) {
    const cycle = cycleFrom(next, [...chain, file]);
    if (cycle) return cycle;
  }
  visiting.delete(file);
  done.add(file);
  return null;
};
for (const file of graph.keys()) {
  const cycle = cycleFrom(file, []);
  if (cycle) fail(`runtime import cycle: ${cycle.join(" → ")}`);
}

// What an import costs, measured as an app's build sees the package: Rollup over dist/,
// every module free of side effects (package.json `sideEffects`), packages external, so
// the number is the kit's own code, minified. The shell set is what the three apps' layout
// and top bar import (2026-10). Each ceiling is the size last measured plus ~10 %. The cost
// is what an app's first load carries: chunks a dynamic `import()` splits off (the feedback
// dialog, MOD-1) load when first used and are not counted.
const SHELL_SET = [
  "AppShell",
  "TopBar",
  "TopBarBrand",
  "TopBarActionMenu",
  "ThemeToggle",
  "LanguageMenu",
  "CompanySwitcher",
  "RoleSwitcher",
  "FeedbackMenu",
  "useFeedbackSubmit",
  "LegalLinks",
  "UiKitProvider",
];
// Measured 2026-10-12, minified (gzip), after MOD-4 (round 0.34 Wave 3: the 25 module-scope
// `forwardRef(...)` calls and 23 `X.displayName = …` lines became ref-as-prop function
// components): Button 20,308 (7,364), Spinner 4,363 (1,688), cn 171 (151), the shell set
// 121,184 (40,045). Before it: Button 32,536 (11,340), Spinner 28,387 (10,051) — Spinner
// kept Input, Select, Textarea, IconButton and Tooltip alive through ui.tsx's two side
// effects — and the shell set 125,393 (41,602). A forwardRef or a displayName line at
// module scope brings that back: it is a call Rollup must keep, with all it references.
//
// Re-measured 2026-10-12 after MOD-2 (ui.tsx split into one module per control, ui.tsx a
// re-export shim): Button 18,010 (6,821), Spinner 1,562 (864), cn 171 (151), the shell set
// 121,177 (39,961). Spinner and Button fell because ui.tsx's module-scope `cn(…)` class
// constants (BUTTON_BASE, ICON_BUTTON_BASE, FIELD_TRIGGER, the floating label's, the
// textarea strip's) are calls Rollup keeps whenever their module is in at all; now each
// rides only with its own control. The shell set barely moved: it does use Button,
// IconButton, Input, Select and Textarea (the feedback dialog), and Tabs had already
// stopped riding in with Button at MOD-4.
//
// Re-measured 2026-10-12 after MOD-1 (useFeedbackSubmit's dialog loaded by a literal
// `import()` of feedback/feedback-submit-dialog.js on its first open; the menu's one
// constant from a vocabulary module instead of the inbox; the attachment defaults in
// feedback-record): the shell set 73,888 (26,020) at once, from 121,177 (39,961) — 47 kB
// minified, 14 kB gzip off every app's entry chunk. The dialog's own chunk is ~49 kB
// (16 kB gzip). Anything the top bar imports that USES the dialog, the attachment field
// or the context box statically puts it back over this ceiling.
const BUDGETS = [
  { label: "{ Button }", names: ["Button"], max: 19_800 },
  // 1,721 B in 0.48: the common labels Spinner reads gained showMore / showLess (AlertBanner
  // clampMobile, keksdose dev #611) — meant growth.
  { label: "{ Spinner }", names: ["Spinner"], max: 1_760 },
  // 247 B since 0.34 (DOC-7): cn registers `ring-focus` / `outline-focus` as widths with
  // tailwind-merge (the merger itself is a dependency, outside this count).
  { label: "{ cn }", names: ["cn"], max: 272 },
  // 81,343 B in 0.48: the top-bar menu triggers name themselves in the kit's Tooltip
  // (keksdose dev #610) — meant growth. 84,949 B in 0.49: AppShell's phone tab bar
  // (KIT-6: mobileMaxItems, mobilePriority, the parent sheet), hideWhenOverlay (KIT-11),
  // LanguageMenu's flag+code trigger (KIT-10) and the status tones (KIT-8) — meant growth.
  // 86,317 B in 0.51.4: TopBarActionMenu's `columns` (DevMenu, keksdose dev #640) and
  // LegalLinks' optional Security / Accessibility links — meant growth. 86,942 B in
  // 0.51.7: Modal's `busy` and useOverlayHistory's `held` put-back (refactor audit
  // 2026-10-30, DUP-3) — meant growth.
  { label: "the shell set", names: SHELL_SET, max: 87_400 },
];
const ENTRY = "\0import-cost";
async function importCost(names) {
  const source = `export { ${names.join(", ")} } from ${JSON.stringify(resolve("dist/index.js"))};`;
  const bundle = await rollup({
    input: ENTRY,
    plugins: [
      {
        name: "import-cost",
        resolveId: (id) => (id === ENTRY ? id : null),
        load: (id) => (id === ENTRY ? source : null),
      },
    ],
    external: (id) => id !== ENTRY && !id.startsWith(".") && !isAbsolute(id),
    treeshake: { moduleSideEffects: false },
    // The per-module "use client" banners, which Rollup reports as it drops them.
    onwarn: () => {},
  });
  const { output } = await bundle.generate({ format: "es" });
  await bundle.close();
  // What loads at once: the entry chunk and every chunk it imports statically. A literal
  // `import()` (the feedback dialog since MOD-1) is a chunk of its own, loaded on first
  // use, and not counted. Once there is one, Rollup also moves the entry's code into a
  // shared chunk and leaves the entry a facade of re-exports, so the entry alone would
  // measure a few hundred bytes. Each chunk is minified and gzipped on its own, as served.
  const chunks = new Map(output.filter((file) => file.type === "chunk").map((chunk) => [chunk.fileName, chunk]));
  const eager = new Set();
  const load = (name) => {
    if (eager.has(name)) return;
    eager.add(name);
    for (const next of chunks.get(name).imports) if (chunks.has(next)) load(next);
  };
  load(output.find((file) => file.type === "chunk" && file.isEntry).fileName);
  let min = 0;
  let gzip = 0;
  const packages = new Set();
  for (const name of eager) {
    const chunk = chunks.get(name);
    const code = (await transform(chunk.code, { minify: true, loader: "js" })).code;
    min += Buffer.byteLength(code);
    gzip += gzipSync(code).length;
    for (const id of chunk.imports) if (!chunks.has(id)) packages.add(id);
  }
  return { min, gzip, packages: [...packages] };
}
const size = (bytes) => (bytes < 1000 ? `${bytes} B` : `${(bytes / 1000).toFixed(1)} kB`);
const costs = [];
for (const { label, names, max } of BUDGETS) {
  const { min, gzip, packages } = await importCost(names);
  if (packages.includes("recharts"))
    fail(`${label} reaches recharts — only the chart kit may (packaging-contract.test.ts)`);
  if (min > max) {
    fail(
      `${label} costs ${min} B minified (${gzip} B gzip), over its ceiling of ${max} B. Something it ` +
        "imports now drags in more of the kit; if the growth is meant, raise the ceiling in scripts/check-module-graph.mjs.",
    );
  }
  costs.push(`${label} ${size(min)} (gzip ${size(gzip)}; ceiling ${size(max)})`);
}

console.log(
  `✓ module graph preserved: ${files} modules, no import cycle, chart keeps its own recharts import, ` +
    `${catalogues.length} catalogues reach nothing outside i18n/\n  import cost, minified: ${costs.join(" · ")}`,
);
