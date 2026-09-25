#!/usr/bin/env node
/**
 * The documented adoption step is a Tailwind @source path, and a wrong one is SILENT:
 * the app builds, runs, and renders unstyled. The showcase follows the same
 * instruction against this repo's own source, so its emitted CSS proves that the scan
 * reaches the package. `pointer-events-auto` comes from the kit's overlays and from
 * almost nothing else.
 *
 * Run after `npm run build:showcase`. Part of `npm run check`, which CI calls as it is.
 */
import { readFileSync, readdirSync } from "node:fs";

const dir = "showcase/dist/assets";
let css;
try {
  css = readdirSync(dir).filter((f) => f.endsWith(".css"));
} catch {
  console.error(`✖ ${dir} is missing — run \`npm run build:showcase\` first`);
  process.exit(1);
}
if (css.length === 0) {
  console.error(`✖ no stylesheet in ${dir}`);
  process.exit(1);
}
const text = css.map((f) => readFileSync(`${dir}/${f}`, "utf8")).join("\n");
for (const cls of ["pointer-events-auto", "sr-only"]) {
  if (!text.includes(cls)) {
    console.error(`✖ ${cls} is missing from the showcase CSS — the @source scan is not reaching src/`);
    process.exit(1);
  }
}
console.log("✓ the showcase CSS carries the kit utilities");
