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

console.log(`✓ module graph preserved: ${files} modules, chart keeps its own recharts import`);
