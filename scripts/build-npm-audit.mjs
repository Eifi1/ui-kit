#!/usr/bin/env node
/**
 * The `eifi1-npm-audit` bin: `npm-audit/bin.mjs`, which runs cli.ts's main unconditionally
 * (TST-3), bundled for Node into `dist/bin/eifi1-npm-audit.mjs`, after the library's own
 * build. Standard library only, so the bundle imports nothing but `node:` modules — checked
 * below.
 */
import { chmodSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, resolve } from "node:path";
import { build } from "tsup";

const ROOT = resolve(import.meta.dirname, "..");
const BIN = join(ROOT, "dist", "bin", "eifi1-npm-audit.mjs");

await build({
  config: false,
  bundle: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  clean: false,
  minify: false,
  silent: true,
  tsconfig: join(ROOT, "tsconfig.json"),
  entry: { "eifi1-npm-audit": join(ROOT, "npm-audit", "bin.mjs") },
  outDir: dirname(BIN),
  format: ["esm"],
  platform: "node",
  target: "node20",
  outExtension: () => ({ js: ".mjs" }),
});
chmodSync(BIN, 0o755);

const imports = [...readFileSync(BIN, "utf8").matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
// tsup writes builtins without their `node:` prefix.
const foreign = imports.filter((name) => !name.startsWith("node:") && !builtinModules.includes(name));
if (foreign.length > 0) {
  console.error(`✖ eifi1-npm-audit: the bin imports ${foreign.join(", ")} — standard library only`);
  process.exit(1);
}
