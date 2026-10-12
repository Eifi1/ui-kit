#!/usr/bin/env node
/**
 * The package's declarations: one `.d.ts` per source module, from `tsc`, beside the `.js`
 * tsup emits (TST-3, refactor audit 2026-10).
 *
 * They used to come from tsup's DTS worker: rollup-plugin-dts over ~400 unbundled entries,
 * which hoisted shared declarations into content-hashed chunks, needed a 6 GB heap and
 * peaked at 5.2 GB resident. That was the process the OOM killer took on 2026-10-12, and
 * `npm run dev` could not run it at Node's default heap. With `bundle: false` the roll-up
 * bought nothing: the JS graph is one file per module anyway. `tsc --emitDeclarationOnly`
 * gives the declaration graph the same shape, at ~0.8 GB.
 *
 * Incremental, with a catch this script exists for: `tsc --incremental` trusts its
 * tsbuildinfo, and an output deleted since the last run is not written again. tsup cleans
 * `dist/` on every build, so tsc emitting straight into `dist/` would ship no declarations
 * on the second build. Instead tsc writes into its own directory in
 * `node_modules/.cache/dts/`, which nothing else deletes, and this copies one `.d.ts` per
 * CURRENT source module into `dist/` (so a deleted module's leftover never ships). If an
 * expected file is missing from the cache anyway, the tsbuildinfo is dropped and tsc runs
 * once more from scratch.
 *
 * The cache directory is per checkout (a hash of the path): `node_modules` can be a
 * symlink shared by several worktrees, and two trees must not share one tsbuildinfo.
 *
 * It type-checks as it emits, as the DTS worker did, so `check:build` still fails on a
 * type error in `src/`. Run after tsup, before scripts/fix-esm-extensions.mjs (which
 * rewrites the `.d.ts` specifiers too); `npm run build` does, and `npm run dev` runs it
 * after every rebuild.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const key = createHash("sha1").update(realpathSync(ROOT)).digest("hex").slice(0, 12);
const CACHE = join(ROOT, "node_modules", ".cache", "dts", key);
const OUT = join(CACHE, "out");
const BUILD_INFO = join(CACHE, "dts.tsbuildinfo");
const tsc = join(dirname(createRequire(import.meta.url).resolve("typescript/package.json")), "bin", "tsc");

/** The modules tsconfig.build.json compiles: src/, minus tests, the harness and ambient .d.ts. */
function sourceModules(dir = SRC, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__" && path !== join(SRC, "test")) sourceModules(path, out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") && !/\.test\./.test(entry.name)) {
      out.push(relative(SRC, path).replace(/\.tsx?$/, ""));
    }
  }
  return out;
}

function emit() {
  const args = [tsc, "-p", "tsconfig.build.json", "--outDir", OUT, "--tsBuildInfoFile", BUILD_INFO];
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    console.error("✖ declarations: tsc failed (tsconfig.build.json)");
    process.exit(result.status ?? 1);
  }
}

const t0 = Date.now();
const modules = sourceModules();
emit();
let missing = modules.filter((id) => !existsSync(join(OUT, `${id}.d.ts`)));
if (missing.length) {
  // Someone deleted part of the cache: start that tsbuildinfo over rather than trust it.
  rmSync(BUILD_INFO, { force: true });
  emit();
  missing = modules.filter((id) => !existsSync(join(OUT, `${id}.d.ts`)));
  if (missing.length) {
    console.error(`✖ declarations: tsc wrote no .d.ts for ${missing.length} module(s):\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }
}
for (const id of modules) {
  const target = join(DIST, `${id}.d.ts`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(OUT, `${id}.d.ts`), target);
}
console.log(`DTS ${modules.length} declaration files (tsc) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
