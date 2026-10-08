#!/usr/bin/env node
/**
 * `tsup`, minus its inventory.
 *
 * With `bundle: false` tsup emits one file per source module, and it lists them: a
 * "Building entry:" line naming every source file, then a size line per emitted .js,
 * .js.map and .d.ts — ~590 lines per build, in which a warning is one line somewhere in
 * the middle. That inventory is all this drops. Everything else passes through
 * untouched: the "Build success" lines, esbuild's and the declaration build's warnings,
 * every error (tsup writes those to stderr, which is not filtered at all), and the exit
 * code.
 *
 * tsup has no log level to ask for this instead: its `silent` also swallows the
 * declaration build's warnings, and it has nothing between that and everything.
 *
 * `npx tsup` still prints the full listing when you want to see what was emitted.
 * Arguments are passed on: `node scripts/tsup-quiet.mjs --watch`.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve("tsup/package.json")), "dist/cli-default.js");

/** tsup's informational lines: the entry list, the config echo, one line per file. */
const INVENTORY = [
  /^CLI (Building entry|Using tsconfig|Using tsup config|Target): /,
  /^CLI tsup v\d/,
  /^CLI Cleaning output folder$/,
  /^(ESM|DTS) Build start$/,
  /^(ESM|DTS) \S+\s+[\d.]+ [KMG]?B$/,
];
// eslint-disable-next-line no-control-regex -- matching the colour codes is the point
const ANSI = /\x1b\[[0-9;]*m/g;

// The declaration build (tsup's DTS worker, rollup-plugin-dts over ~400 unbundled
// entries) outgrew Node's default heap in 0.32: it died with ERR_WORKER_OUT_OF_MEMORY on
// this machine and would on a 16 GB CI runner too. It peaks at about 5.2 GB resident with
// this ceiling. A caller's own --max-old-space-size wins: it comes later in NODE_OPTIONS.
const HEAP = "--max-old-space-size=6144";
const env = { ...process.env, NODE_OPTIONS: [HEAP, process.env.NODE_OPTIONS].filter(Boolean).join(" ") };

const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: ["inherit", "pipe", "inherit"],
  // Piped, tsup would drop its colours; keep them when the caller is a terminal.
  env: process.stdout.isTTY ? { FORCE_COLOR: "1", ...env } : env,
});

createInterface({ input: child.stdout }).on("line", (line) => {
  const plain = line.replace(ANSI, "").trim();
  if (!INVENTORY.some((re) => re.test(plain))) process.stdout.write(`${line}\n`);
});

child.on("close", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
