#!/usr/bin/env node
/**
 * The build is only correct if it preserves the module graph. A bundling build would
 * fuse the modules into one chunk and `sideEffects` could no longer let a consumer
 * drop what it does not use — the regression that dragged all ~433KB of recharts into
 * Keksdose's entry chunk. Assert the graph, not a string.
 *
 * Run after `npm run build`. Part of `npm run check`, which CI calls as it is.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

const chart = "dist/components/chart.js";
if (!existsSync(chart)) fail(`${chart} is missing — run \`npm run build\` first`);
if (!readFileSync(chart, "utf8").includes('from "recharts"')) {
  fail(`${chart} no longer imports recharts itself — the build bundled it`);
}

// One file per source module, not a bundle: a bundling build collapses these.
const count = (dir) =>
  readdirSync(dir).reduce((n, name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? n + count(path) : n + (name.endsWith(".js") ? 1 : 0);
  }, 0);
const files = count("dist");
if (files <= 50) fail(`dist has ${files} .js files — expected one per source module`);

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

console.log(
  `✓ module graph preserved: ${files} modules, chart keeps its own recharts import, ` +
    `${catalogues.length} catalogues reach nothing outside i18n/`,
);
