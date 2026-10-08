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

/**
 * 0.32 (docs/text-size-harmonization.md §10.5): the text-size and contrast CSS has to
 * SURVIVE the build, not just be written. Tailwind v4 has stripped a block holding only
 * custom properties before, and `--focus-ring-width` lives in exactly such a block; the
 * breakpoint variants are redefinitions whose whole point is that Tailwind's own query
 * for `md:` is no longer emitted. Checked on the minified output, as an app gets it.
 */
const TEXT_SIZE_CSS = [
  ["the Large root size", /html\[data-text-size="?large"?\]\{font-size:125%\}/],
  ["the Extra large root size", /html\[data-text-size="?xlarge"?\]\{font-size:150%\}/],
  ["the focus frame's width", /:root\{--focus-ring-width:2px\}/],
  ["the focus frame under More contrast", /:root\[data-contrast="?more"?\]\{--focus-ring-width:3px\}/],
  ["md: at Normal, scoped", /@media \(width>=48rem\)\{\.md\\:[^{]*:where\(:not\(\[data-text-size\$=large\] \*\)\)\{/],
  ["md: at Large", /@media \(width>=60rem\)\{\.md\\:[^{]*:where\(\[data-text-size=large\] \*\)\{/],
  ["md: at Extra large", /@media \(width>=72rem\)\{\.md\\:[^{]*:where\(\[data-text-size=xlarge\] \*\)\{/],
];
for (const [what, re] of TEXT_SIZE_CSS) {
  if (!re.test(text)) {
    console.error(`✖ the showcase CSS lost ${what} (tokens.css, §3.3/§5)`);
    process.exit(1);
  }
}
// Tailwind's own, unscaled `md:` must not fire beside the scaled one.
if (/@media \(width>=48rem\)\{\.md\\:[a-z0-9-]+\{/.test(text)) {
  console.error("✖ the showcase CSS still carries Tailwind's unscaled md: query beside the scaled one");
  process.exit(1);
}
console.log("✓ the showcase CSS carries the text-size and contrast mechanism");
