#!/usr/bin/env node
/**
 * `npm run check`: the three groups of checks, one after another, stopping at the first
 * that fails.
 *
 *   check:static  format:check · typecheck · lint · check:tokens · check:security · check:commit-rules · check:commits · check:meta
 *   check:build   build · check:graph · check:package · export inventory · styling inventory · build:showcase · check:tailwind
 *   check:test    test:coverage
 *
 * CI runs the same three scripts as three jobs, so the local gate and CI cannot drift:
 * both compose these package.json scripts and nothing else.
 *
 * SERIAL by default (TST-1, refactor audit 2026-10). Side by side was the default until
 * 0.34, and it was the one mode that failed: the three peak together (the test group
 * alone ~5 GB, the declaration build then 5.2 GB), and on a 15 GB machine that also hosts
 * three apps' sessions, with its swap full, the 0.33.1 push ran 30 minutes, lost its
 * build to the OOM killer and timed out 25 tests. The serial runs that day all passed, in
 * 6 to 10 minutes. `CHECK_PARALLEL=1` still runs the three side by side, on a machine
 * with the memory for it. `CHECK_SERIAL`, the old opt-in, is accepted and changes nothing.
 *
 * Serial runs the quickest to fail first — static (~1 min), build (~1–1½ min), test
 * (~8–9 min; 0.51.3: 66 s, 91 s, 455 s; 0.51.7: 49 s, 45 s, 524 s) — and stops at the
 * first failure, naming the groups it did not run: a type error should not cost eight
 * minutes of tests before it is reported. For the same reason static ends with
 * `check:meta`, the repository's bookkeeping tests (META_TESTS), which vitest's
 * longest-first order ran last of all.
 *
 * The test group runs on at most 6 workers here (VITEST_MAX_WORKERS, unless you set it):
 * measured on this suite, 6 workers took 169 s at a 4.7 GB peak against 160 s at 5.1 GB
 * with vitest's default of 7 (vitest.config.ts): 9 s for 0.4 GB, on the machine where
 * memory is what runs out. CI runs vitest itself and is not affected.
 *
 * A green run on a clean tree (nothing modified, nothing untracked) leaves a stamp,
 * `node_modules/.cache/check/<tree id>`, which the pre-push hook reads: pushing a tree
 * that already passed (a reworded commit, a re-push) checks only the commit messages
 * (TST-2).
 *
 * Output stays quiet: each group's output is held back and printed only if it FAILS;
 * a passing group is one line with its time. Interleaving three live streams would be
 * unreadable, and a green run has nothing to say.
 */
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** In the order serial mode runs them: the quickest to fail first. */
export const GROUPS = ["check:static", "check:build", "check:test"];

/**
 * The tests a release commit can turn red, and so the ones the pre-push hook still runs
 * for it (TST-1, refactor audit 2026-10-30): the readers of package.json's `version` and of
 * CHANGELOG.md, the files `npm run release` writes. A MINOR bump can make a deprecation due
 * (deprecations.test.ts), and the generated entry can hold an item changelog.test.ts rejects.
 * The list once named only the first; changelog.test.ts began reading CHANGELOG.md four days
 * after the shortcut landed, so a release entry it rejects passed the push and went red only
 * in CI (refactor audit 2026-11-22, TST-1). gate-lists.test.ts finds every such reader and
 * fails on one this list misses.
 */
export const RELEASE_TESTS = ["src/__tests__/deprecations.test.ts", "src/lib/__tests__/changelog.test.ts"];

/**
 * `check:meta`, the last step of check:static: the tests of the repository's own bookkeeping
 * — the docs index and contracts, the showcase's component index, the gate lists,
 * deprecations and the changelog. Each takes well under 2 s, but in the test group vitest
 * schedules the longest files first, so they failed after a 7–10 minute run: the 0.54 adopt
 * link (8921b88) and the 0.56 gate lists (aaffb5b5). Here they fail in the first minute, and
 * run again, cheaply, in the test group (refactor audit 2026-11-22, TST-6).
 */
export const META_TESTS = [
  ...RELEASE_TESTS,
  "src/__tests__/contracts.test.ts",
  "src/__tests__/gate-lists.test.ts",
  "showcase/src/__tests__/component-index.test.ts",
];
const ROOT = resolve(import.meta.dirname, "..");
export const STAMPS = join(ROOT, "node_modules", ".cache", "check");
const STAMPS_KEPT = 20;
const TEST_WORKERS = 6;

const seconds = (ms) => `${Math.round(ms / 1000)}s`;

/** Side by side only when asked for; `CHECK_SERIAL`, the old opt-in, changes nothing. */
export const isParallel = (env) => Boolean(env.CHECK_PARALLEL) && env.CHECK_PARALLEL !== "0";

/**
 * Run `groups` through `run(group) → Promise<boolean>`. Serial stops at the first
 * failure and reports the groups it skipped; parallel runs them all.
 */
export async function runGroups(groups, run, { parallel }) {
  if (parallel) {
    const oks = await Promise.all(groups.map(run));
    return { results: groups.map((group, i) => ({ group, ok: oks[i] })), skipped: [] };
  }
  const results = [];
  for (const [i, group] of groups.entries()) {
    const ok = await run(group);
    results.push({ group, ok });
    if (!ok) return { results, skipped: groups.slice(i + 1) };
  }
  return { results, skipped: [] };
}

/** vitest's default is one worker per core but one; this caps it and never raises it. */
export function testWorkers(env, cores = availableParallelism()) {
  return env.VITEST_MAX_WORKERS || String(Math.max(1, Math.min(TEST_WORKERS, cores - 1)));
}

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

/** The checked-out tree's id when nothing is modified or untracked, else null. */
export function cleanTree() {
  try {
    return git("status", "--porcelain") === "" ? git("rev-parse", "HEAD^{tree}") : null;
  } catch {
    return null;
  }
}

/** Mark `tree` as checked green, keeping only the newest few stamps. */
export function writeStamp(tree, dir = STAMPS) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, tree), `${new Date().toISOString()} npm run check passed\n`);
  const old = readdirSync(dir)
    .map((name) => ({ name, at: statSync(join(dir, name)).mtimeMs }))
    .sort((a, b) => b.at - a.at)
    .slice(STAMPS_KEPT);
  for (const { name } of old) rmSync(join(dir, name), { force: true });
}

const children = new Set();

function run(script, env) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn("npm", ["run", "-s", script], {
      env: { ...env, FORCE_COLOR: process.stdout.isTTY ? "1" : "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.add(child);
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    child.on("close", (code) => {
      children.delete(child);
      const ok = code === 0;
      console.log(`${ok ? "✓" : "✗"} ${script} ${seconds(Date.now() - t0)}`);
      if (!ok) process.stdout.write(`\n── ${script} output ──\n${output}\n`);
      resolve(ok);
    });
  });
}

/** `npm exec vitest run` over `files`, with this terminal; its exit code. */
function runTests(files) {
  const result = spawnSync("npm", ["exec", "--no", "--", "vitest", "run", ...files], { cwd: ROOT, stdio: "inherit" });
  return result.status ?? 1;
}

/** `--release`: the pre-push hook's release commit runs RELEASE_TESTS; `--meta` is check:meta. */
const ONLY = { "--release": RELEASE_TESTS, "--meta": META_TESTS };

async function main() {
  const only = process.argv.slice(2).find((arg) => Object.hasOwn(ONLY, arg));
  if (only) process.exit(runTests(ONLY[only]));

  const started = Date.now();
  // Ctrl-C stops every running group, not just the terminal's foreground one.
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      for (const child of children) child.kill(signal);
      process.exit(130);
    });
  }

  const parallel = isParallel(process.env);
  const env = { ...process.env, VITEST_MAX_WORKERS: testWorkers(process.env) };
  const tree = cleanTree();
  const { results, skipped } = await runGroups(GROUPS, (group) => run(group, env), { parallel });
  const failed = results.filter((r) => !r.ok).map((r) => r.group);
  const took = seconds(Date.now() - started);

  if (failed.length === 0) {
    // Stamp only what was checked: the same clean tree before and after the run.
    if (tree && cleanTree() === tree) writeStamp(tree);
    console.log(`✓ check passed (${took})`);
    process.exit(0);
  }
  console.log(`✗ check failed: ${failed.join(", ")} (${took})`);
  if (skipped.length) {
    console.log(
      `  Stopped there: ${skipped.join(", ")} did not run. Serial mode stops at the first ` +
        "failing group; CHECK_PARALLEL=1 runs all three side by side.",
    );
  }
  process.exit(1);
}

// Run as a script; imported (by its test), it only offers the pieces above.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
