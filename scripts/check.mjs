#!/usr/bin/env node
/**
 * `npm run check`: the three independent groups of checks, at the same time.
 *
 *   check:static  typecheck · lint · check:tokens · check:security · check:commits
 *   check:test    test:coverage
 *   check:build   build · check:graph · check:package · build:showcase · check:tailwind
 *
 * One after another they took ~4.5 minutes; side by side the run is as long as the
 * slowest group. CI runs the same three scripts as three jobs, so the local gate and CI
 * still cannot drift: both compose these package.json scripts and nothing else.
 *
 * `CHECK_SERIAL=1` runs them one after another instead (0.29, 2026-10-06): side by side
 * the three peak together — the test group alone reaches ~5 GB — and on a 15 GB machine
 * that also hosts three apps' sessions and editors, with its swap full, the parallel run
 * froze in swap for 11 minutes and every test that was running timed out. Serial costs
 * about a minute and a half and cannot do that. `CHECK_SERIAL=1 git push` hands it to
 * the pre-push hook. CI runs the groups as separate jobs either way.
 *
 * Output stays quiet: each group's output is held back and printed only if it FAILS;
 * a passing group is one line with its time. Interleaving three live streams would be
 * unreadable, and a green run has nothing to say.
 */
import { spawn } from "node:child_process";

const GROUPS = ["check:static", "check:test", "check:build"];
const started = Date.now();
const children = new Set();

const seconds = (ms) => `${Math.round(ms / 1000)}s`;

function run(script) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn("npm", ["run", "-s", script], {
      env: { ...process.env, FORCE_COLOR: process.stdout.isTTY ? "1" : "0" },
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

// Ctrl-C stops all three, not just the terminal's foreground one.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    for (const child of children) child.kill(signal);
    process.exit(130);
  });
}

const serial = Boolean(process.env.CHECK_SERIAL) && process.env.CHECK_SERIAL !== "0";
const results = [];
if (serial) for (const group of GROUPS) results.push(await run(group));
else results.push(...(await Promise.all(GROUPS.map(run))));
const failed = results.filter((ok) => !ok).length;
console.log(
  failed
    ? `✗ check failed: ${failed} of ${GROUPS.length} groups (${seconds(Date.now() - started)})`
    : `✓ check passed (${seconds(Date.now() - started)})`,
);
process.exit(failed ? 1 : 0);
